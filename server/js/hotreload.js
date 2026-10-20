const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {POLICIES, describe} = require('./hotreloadpolicy');
const {hash, MANIFEST, createManifest} = require('./hotreloadmanifest');
const {ClientReleases, validate: validateClient} = require('./clientreleases');

let active;
function validatePath(relative) {
    if (typeof relative !== 'string' || !relative || relative.includes('\0') || relative.includes('\\') ||
        path.posix.isAbsolute(relative) || path.posix.normalize(relative) !== relative ||
        relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid runtime path');
}

class RestartRequired extends Error {
    constructor(files) {
        super('Update requires a planned restart: ' + files.join(', '));
        this.files = files;
    }
}

class HotReload {
    constructor(root, manifest, policies = POLICIES) {
        this.root = fs.realpathSync(root);
        this.manifest = manifest;
        this.policies = policies;
        this.modules = new Map();
        this.configs = new Map();
        this.clients = manifest.client ? new ClientReleases(this.root, manifest.client) : null;
    }

    filename(relative) {
        validatePath(relative);
        let current = this.root;
        for (const part of relative.split('/')) {
            current = path.join(current, part);
            if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Runtime symlink is unsupported');
        }
        return current;
    }

    capture(module, evaluate) {
        const relative = path.relative(this.root, fs.realpathSync(module.filename)).split(path.sep).join('/');
        const policy = this.policies[relative];
        if (!policy) return;
        const source = fs.readFileSync(module.filename, 'utf8');
        if (hash(source) !== this.manifest.files[relative]) throw new Error('Source does not match release: ' + relative);
        const description = describe(source, policy);
        const target = policy.kind === 'object' ? module.exports : module.exports.prototype;
        const slots = new Map();
        for (const key of description.methods.keys()) {
            if (typeof target[key] !== 'function') throw new Error('Hot method unavailable: ' + relative + ':' + key);
            const slot = {current: target[key]};
            // Bound callbacks and destructured imports retain this identity.
            const stable = function(...args) { return slot.current.apply(this, args); };
            Object.defineProperty(stable, 'name', {value: key});
            Object.defineProperty(stable, 'length', {value: target[key].length});
            target[key] = stable;
            slots.set(key, slot);
        }
        this.modules.set(relative, {source, description, target, slots, evaluate});
    }

    config(relative, target, key, parse) { this.configs.set(relative, {target, key, parse}); }

    status() {
        return {protocol: 1, revision: this.manifest.revision, pid: process.pid,
            modules: [...this.modules.keys()], rollbackAvailable: !!this.previous,
            automaticDeployment: 1, clientReload: !!this.clients, ready: this.clients?.ready() ?? true};
    }

    prepare(bundle, expectedRevision, checkAssets = true) {
        if (expectedRevision !== this.manifest.revision) throw new Error('Running release changed; prepare the update again');
        const next = bundle?.manifest;
        if (next?.protocol !== 1 || !/^[a-f0-9]{40}$/.test(next.revision || '') || !next.files || typeof next.files !== 'object' || Array.isArray(next.files)) throw new Error('Invalid release manifest');
        for (const [relative, digest] of Object.entries(next.files)) {
            validatePath(relative);
            if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid source digest');
        }
        if (next.client) {
            validateClient(next.client);
            if (next.client.revision !== next.revision) throw new Error('Client revision does not match the server release');
        } else if (this.clients) throw new Error('Client release manifest is missing');
        const changed = [...new Set([...Object.keys(this.manifest.files), ...Object.keys(next.files)])]
            .filter(relative => this.manifest.files[relative] !== next.files[relative]);
        const clientChanged = JSON.stringify(next.client?.files) !== JSON.stringify(this.manifest.client?.files);
        if (next.revision === this.manifest.revision && (changed.length || clientChanged)) throw new Error('An immutable release cannot change its contents');
        for (const relative of changed) {
            if (next.files[relative] && (this.policies[relative] || this.configs.has(relative))) {
                if (typeof bundle.sources?.[relative] !== 'string' || hash(bundle.sources[relative]) !== next.files[relative]) throw new Error('Missing or corrupt source: ' + relative);
                if (this.manifest.files[relative] && hash(fs.readFileSync(this.filename(relative))) !== this.manifest.files[relative]) throw new Error('Running source was edited outside HMR: ' + relative);
            }
        }
        const unsupported = changed.filter(relative => !next.files[relative] || !this.manifest.files[relative] ||
            !this.policies[relative] && !this.configs.has(relative));
        if (unsupported.length) throw new RestartRequired(unsupported);
        if (next.client && !this.clients) throw new RestartRequired(['client-update runtime']);
        const client = next.client ? this.clients.prepare(next.client, checkAssets) : null;
        const prepared = [];
        for (const relative of changed) {
            const source = bundle.sources?.[relative];
            if (typeof source !== 'string' || hash(source) !== next.files[relative]) throw new Error('Missing or corrupt source: ' + relative);
            const before = fs.readFileSync(this.filename(relative), 'utf8');
            if (hash(before) !== this.manifest.files[relative]) throw new Error('Running source was edited outside HMR: ' + relative);
            const config = this.configs.get(relative);
            if (config) {
                prepared.push({relative, before, source, config, value: config.parse(source)});
                continue;
            }
            const policy = this.policies[relative];
            const original = describe(before, policy), candidate = describe(source, policy);
            if (original.shape !== candidate.shape) throw new RestartRequired([relative]);
            const module = this.modules.get(relative);
            const replacements = [];
            if (module) for (const [key, method] of candidate.methods) {
                let implementation = module.evaluate(method.expression);
                if (policy.kind === 'class') {
                    Object.setPrototypeOf(implementation, Object.getPrototypeOf(module.target));
                    implementation = implementation[key];
                } else if (policy.kind === 'legacy') {
                    const fn = implementation, parent = Object.getPrototypeOf(module.target);
                    implementation = function(...args) {
                        const previous = this._super;
                        this._super = parent[key];
                        try { return fn.apply(this, args); }
                        finally { this._super = previous; }
                    };
                }
                replacements.push({slot: module.slots.get(key), implementation});
            }
            prepared.push({relative, before, source, module, replacements});
        }
        return {manifest: next, prepared, expectedRevision, client};
    }

    plan(bundle, expectedRevision) {
        try {
            const update = this.prepare(bundle, expectedRevision, false);
            return {...this.status(), method: 'hmr', changed: update.prepared.map(item => item.relative),
                clientMode: update.client ? 'automatic' : 'none'};
        } catch (error) {
            if (!(error instanceof RestartRequired)) throw error;
            return {...this.status(), method: 'reboot', files: error.files};
        }
    }

    apply(bundle, expectedRevision) {
        const update = this.prepare(bundle, expectedRevision);
        if (update.manifest.revision === this.manifest.revision) return {...this.status(), changed: []};
        // All validation and compilation finish before files or dispatch slots change.
        const previous = {manifest: this.manifest, sources: {}};
        for (const item of update.prepared) previous.sources[item.relative] = item.before;
        const written = [];
        const journal = this.filename('.live-update/transaction.json');
        fs.mkdirSync(path.dirname(journal), {recursive: true, mode: 0o700});
        this.write(journal, JSON.stringify(previous));
        try {
            if (update.client) this.clients.persist(update.client);
            for (const item of update.prepared) {
                written.push(item);
                this.write(this.filename(item.relative), item.source);
            }
            this.write(this.filename(MANIFEST), JSON.stringify(update.manifest));
        } catch (error) {
            for (const item of written.reverse()) this.write(this.filename(item.relative), item.before);
            this.write(this.filename(MANIFEST), JSON.stringify(previous.manifest));
            fs.unlinkSync(journal);
            throw error;
        }
        // Synchronous commit: the event loop cannot observe a partial method batch.
        for (const item of update.prepared) {
            if (item.config) item.config.target[item.config.key] = item.value;
            else for (const replacement of item.replacements) replacement.slot.current = replacement.implementation;
            if (item.module) item.module.source = item.source;
        }
        this.manifest = update.manifest;
        this.previous = previous;
        fs.unlinkSync(journal);
        if (update.client) this.clients.activate(update.client);
        return {...this.status(), changed: update.prepared.map(item => item.relative)};
    }

    write(filename, source) {
        const temporary = filename + '.live-' + crypto.randomBytes(8).toString('hex');
        let descriptor;
        try {
            descriptor = fs.openSync(temporary, 'wx', 0o600);
            fs.writeFileSync(descriptor, source);
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor); descriptor = undefined;
            fs.renameSync(temporary, filename);
            descriptor = fs.openSync(path.dirname(filename), 'r');
            fs.fsyncSync(descriptor);
            fs.closeSync(descriptor); descriptor = undefined;
        } finally {
            if (descriptor !== undefined) fs.closeSync(descriptor);
            if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
        }
    }

    attach(app, apiKey) {
        const express = require('express');
        app.use('/_live-update', (req, res, next) => {
            const remote = req.socket.remoteAddress;
            const expected = Buffer.from(apiKey || ''), supplied = Buffer.from(req.headers['x-api-key'] || '');
            if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote) || !expected.length || expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return res.sendStatus(403);
            res.set('Cache-Control', 'no-store');
            next();
        }, express.json({limit: '8mb'}));
        app.get('/_live-update', (req, res) => res.json(this.status()));
        app.get('/_live-update/manifest', (req, res) => res.json({...this.status(), manifest: this.manifest}));
        app.post('/_live-update/:action', async (req, res) => {
            try {
                const {expectedRevision, bundle} = req.body;
                if (req.params.action === 'plan') return res.json(this.plan(bundle, expectedRevision));
                if (req.params.action === 'prepare') {
                    const update = this.prepare(bundle, expectedRevision);
                    return res.json({...this.status(), changed: update.prepared.map(item => item.relative)});
                }
                if (req.params.action === 'apply') return res.json(this.apply(bundle, expectedRevision));
                if (req.params.action === 'rollback' && this.previous) return res.json(this.apply(this.previous, expectedRevision));
                if (req.params.action === 'reboot-handoffs' && this.rebootHandoffs) {
                    if (expectedRevision !== this.manifest.revision || !/^[a-f0-9]{40}$/.test(req.body.revision || '')) throw new Error('Invalid reboot handoff');
                    const handoffs = await this.rebootHandoffs(req.body.revision);
                    return res.json({...this.status(), handoffs});
                }
                if (req.params.action === 'cancel-reboot' && this.cancelReboot) {
                    if (expectedRevision !== this.manifest.revision) throw new Error('Running release changed');
                    this.cancelReboot(); return res.json(this.status());
                }
                return res.sendStatus(404);
            } catch (error) {
                return res.status(409).json({error: error.message, restartRequired: error instanceof RestartRequired, files: error.files || []});
            }
        });
    }
}

function install(root = path.resolve(__dirname, '../..')) {
    if (active || process.env.LIVE_UPDATES_ENABLED !== '1') return active;
    const journal = path.join(root, '.live-update/transaction.json');
    if (fs.existsSync(journal)) {
        const previous = JSON.parse(fs.readFileSync(journal, 'utf8'));
        const recovery = new HotReload(root, previous.manifest);
        for (const [relative, source] of Object.entries(previous.sources)) {
            if (hash(source) !== previous.manifest.files[relative]) throw new Error('Invalid HMR recovery journal');
            recovery.write(recovery.filename(relative), source);
        }
        recovery.write(recovery.filename(MANIFEST), JSON.stringify(previous.manifest));
        fs.unlinkSync(journal);
    }
    const filename = path.join(root, MANIFEST);
    const manifest = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8'))
        : createManifest(root, process.env.GAME_RELEASE_ID || '0'.repeat(40));
    active = new HotReload(root, manifest);
    return active;
}

module.exports = {HotReload, RestartRequired, install, capture: (module, evaluate) => active?.capture(module, evaluate), current: () => active};

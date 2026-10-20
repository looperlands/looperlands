const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const revisionValid = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
function validFile(value) {
    return typeof value === 'string' && value.length > 0 && !value.includes('\0') && !value.includes('\\') &&
        !path.posix.isAbsolute(value) && path.posix.normalize(value) === value &&
        !value.split('/').some(part => !part || part === '.' || part === '..');
}
function validate(manifest) {
    if (!revisionValid(manifest?.revision) || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files) ||
        !manifest.files['index.html']) throw new Error('Invalid client release');
    for (const [file, hash] of Object.entries(manifest.files)) {
        if (!validFile(file) || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid client asset');
    }
}

function write(filename, data) {
    fs.mkdirSync(path.dirname(filename), {recursive: true, mode: 0o700});
    const temporary = filename + '.tmp-' + crypto.randomBytes(6).toString('hex');
    let descriptor;
    try {
        descriptor = fs.openSync(temporary, 'wx', 0o600);
        fs.writeFileSync(descriptor, data); fs.fsyncSync(descriptor);
        fs.closeSync(descriptor); descriptor = undefined;
        fs.renameSync(temporary, filename);
        descriptor = fs.openSync(path.dirname(filename), 'r'); fs.fsyncSync(descriptor);
        fs.closeSync(descriptor); descriptor = undefined;
    } finally {
        if (descriptor !== undefined) fs.closeSync(descriptor);
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
}

class ClientReleases {
    constructor(root, manifest, options = {}) {
        validate(manifest);
        this.root = root;
        this.base = manifest;
        this.current = manifest;
        this.clientRoot = options.clientRoot || path.join(root, fs.existsSync(path.join(root, 'client-build')) ? 'client-build' : 'client');
        this.directory = path.join(root, '.live-update');
        this.blobs = path.join(this.directory, 'client-blobs');
        this.records = path.join(this.directory, 'client-releases');
        this.notify = () => {};
        this.ready = () => true;
        this.plans = new Map();
        const baseline = path.join(this.directory, 'client-base.json');
        if (fs.existsSync(baseline)) {this.base = JSON.parse(fs.readFileSync(baseline, 'utf8')); validate(this.base);}
        else this.save(baseline, manifest);
    }

    save(filename, value) {
        write(filename, JSON.stringify(value));
    }

    record(revision) {
        if (revision === this.current.revision) return this.current;
        if (revision === this.base.revision) return this.base;
        if (!revisionValid(revision)) return null;
        const file = path.join(this.records, revision + '.json');
        if (!fs.existsSync(file)) return null;
        const record = JSON.parse(fs.readFileSync(file, 'utf8'));
        validate(record);
        return record;
    }

    filename(record, file) {
        if (!validFile(file) || !Object.hasOwn(record.files, file)) return null;
        return this.base.files[file] === record.files[file] ? path.join(this.clientRoot, file)
            : path.join(this.blobs, record.files[file]);
    }

    prepare(next, checkAssets = true) {
        validate(next);
        // Every new/changed asset must have been staged and content-verified.
        for (const [file, hash] of Object.entries(next.files)) {
            if (!checkAssets) continue;
            if (this.current.files[file] === hash || this.base.files[file] === hash) continue;
            const blob = path.join(this.blobs, hash);
            if (!fs.existsSync(blob) || digest(fs.readFileSync(blob)) !== hash) throw new Error('Client asset is not staged: ' + file);
        }
        return next;
    }

    persist(next) {
        this.save(path.join(this.records, this.current.revision + '.json'), this.current);
        this.save(path.join(this.records, next.revision + '.json'), next);
    }

    activate(next) { this.current = next; this.plans.clear(); this.notify({revision: next.revision}); }

    update(from) {
        if (this.plans.has(from)) return {...this.plans.get(from), ready: this.ready()};
        const previous = this.record(from);
        const files = previous ? [...new Set([...Object.keys(previous.files), ...Object.keys(this.current.files)])]
            .filter(file => previous.files[file] !== this.current.files[file]) : ['index.html'];
        const plan = {revision: this.current.revision, mode: !files.length ? 'none' : files.every(file => file.endsWith('.css')) ? 'css' : 'reload', files};
        if (this.plans.size >= 128) this.plans.delete(this.plans.keys().next().value);
        this.plans.set(from, plan);
        return {...plan, ready: this.ready()};
    }

    attach(app, serverRevision) {
        app.get('/client-update', (req, res) => {
            if (req.query.from && !revisionValid(req.query.from)) return res.sendStatus(400);
            res.set('Cache-Control', 'no-store').json({...this.update(req.query.from), serverRevision: serverRevision()});
        });
        app.get(['/', '/index.html'], (req, res) => {
            const revision = req.query.clientRevision || this.current.revision;
            const record = this.record(revision) || this.current;
            const filename = this.filename(record, 'index.html');
            const html = fs.readFileSync(filename, 'utf8');
            const base = '/_client/' + record.revision + '/';
            const injection = '<base href="' + base + '"><meta name="looperlands-client-revision" content="' + record.revision + '">';
            res.set('Cache-Control', 'no-store').type('html').send(html.replace(/<head(?:\s[^>]*)?>/i, match => match + injection));
        });
        app.get('/_client/:revision/*', (req, res) => {
            const record = this.record(req.params.revision);
            const relative = req.params[0];
            const filename = record && this.filename(record, relative);
            if (!filename) return res.sendStatus(404);
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            // Content-addressed blobs live under .live-update; only manifest-listed files reach here.
            res.type(path.extname(relative)).sendFile(path.resolve(filename), {dotfiles: 'allow'});
        });
    }
}

async function stage(root, input) {
    const readline = require('readline');
    const directory = path.join(root, '.live-update/client-blobs');
    fs.mkdirSync(directory, {recursive: true, mode: 0o700});
    let header, count = 0;
    for await (const line of readline.createInterface({input, crlfDelay: Infinity})) {
        if (line.length > 64 * 1024 * 1024) throw new Error('Client asset exceeds staging limit');
        const record = JSON.parse(line);
        if (!header) { validate(record); header = record; continue; }
        if (!validFile(record.file) || header.files[record.file] !== record.hash || typeof record.data !== 'string') throw new Error('Invalid staged client asset');
        const data = Buffer.from(record.data, 'base64');
        if (digest(data) !== record.hash) throw new Error('Corrupt staged client asset');
        const filename = path.join(directory, record.hash);
        if (!fs.existsSync(filename) || digest(fs.readFileSync(filename)) !== record.hash) write(filename, data);
        count++;
    }
    if (!header) throw new Error('Empty client release stream');
    return {revision: header.revision, staged: count};
}

module.exports = {ClientReleases, stage, validate, validFile};

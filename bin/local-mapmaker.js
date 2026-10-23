#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');
const express = require('express');

function validateMap(root, mapId) {
    const maps = JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !maps.includes(mapId)) {
        throw Object.assign(new Error('Choose a configured map before building.'), {status: 400});
    }
    const source = path.join(root, 'tools/maps/tmx', mapId + '.tmx');
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
        throw Object.assign(new Error('The Tiled source ' + mapId + '.tmx is missing from tools/maps/tmx.'), {status: 400});
    }
    return source;
}

function rewriteSession(data, gameUrl) {
    if (typeof data?.url !== 'string') return data;
    const target = new URL(data.url, gameUrl), game = new URL(gameUrl);
    target.protocol = game.protocol; target.host = game.host;
    target.username = ''; target.password = '';
    return {...data, url: target.href};
}

function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        if (options.signal?.aborted) return reject(new Error('Build cancelled.'));
        const child = (options.spawn || spawn)(command, args, {cwd: options.cwd, env: process.env, shell: false,
            stdio: ['ignore', 'pipe', 'pipe']});
        let failure, killTimer;
        const stop = message => {
            if (!failure) failure = new Error(message);
            child.kill('SIGTERM');
            if (!killTimer) killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
        };
        const abort = () => stop('Build cancelled.');
        options.signal?.addEventListener('abort', abort, {once: true});
        const log = chunk => options.onLog?.(String(chunk));
        child.stdout.on('data', log); child.stderr.on('data', log);
        const timeout = setTimeout(() => stop(path.basename(command) + ' timed out. Check the build log.'), options.timeout || 600000);
        child.once('error', error => {failure ||= error;});
        child.once('close', (code, signal) => {
            clearTimeout(timeout); clearTimeout(killTimer);
            options.signal?.removeEventListener('abort', abort);
            if (failure) reject(failure);
            else if (code === 0) resolve();
            else reject(new Error(path.basename(command) + ' failed (' + (signal || 'exit ' + code) + '). Check the build log.'));
        });
    });
}

class MapmakerToolbox {
    constructor(options = {}) {
        this.root = options.root || path.resolve(__dirname, '..');
        this.gameUrl = options.gameUrl || process.env.APP_URL || 'http://127.0.0.1:8000';
        const toolboxUrl = new URL('/local/', this.gameUrl);
        toolboxUrl.port = String(process.env.MAPMAKER_PORT || 8010);
        this.toolboxUrl = toolboxUrl.href;
        this.fetch = options.fetch || global.fetch;
        this.run = options.run || runCommand;
        this.spawn = options.spawn || spawn;
        this.job = null; this.child = null; this.closed = false; this.gameReady = false;
    }
    log(message) {
        if (!this.job || this.job.status !== 'running') return;
        this.job.logs.push(...String(message).split(/\r?\n/).filter(Boolean).map(line => line.slice(0, 1000)));
        this.job.logs = this.job.logs.slice(-200);
    }
    async waitForGame(timeout = 120000, requiredMap) {
        const deadline = Date.now() + timeout;
        const expectedMaps = JSON.parse(fs.readFileSync(path.join(this.root, 'server/config.json'), 'utf8')).maps;
        let missing = expectedMaps;
        while (Date.now() < deadline && !this.closed) {
            if (!this.child) throw new Error('The game server exited. Check the Docker game logs, then start the toolbox again.');
            try {
                const response = await this.fetch(new URL('/local/api/catalog', this.gameUrl), {signal: AbortSignal.timeout(10000)});
                if (response.ok) {
                    const catalog = await response.json();
                    const ready = (catalog.maps || []).filter(map => map.id !== requiredMap || map.checkpoints?.length).map(map => map.id);
                    missing = expectedMaps.filter(map => !ready.includes(map));
                    if (!missing.length) return;
                }
            } catch (_) {}
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error('The game server did not become ready. Maps still loading: ' + missing.join(', ') + '. Check the build log and that port 8000 is available.');
    }
    async startGame(requiredMap) {
        if (this.closed || this.child) return;
        this.starting = true;
        const child = this.spawn(process.execPath, [path.join(this.root, 'server/js/main.js')], {
            cwd: this.root, env: {...process.env, LOOPERLANDS_TOOLBOX_URL: this.toolboxUrl}, shell: false, stdio: ['ignore', 'pipe', 'pipe']
        });
        this.child = child;
        const output = chunk => {process.stdout.write(chunk); this.log(String(chunk));};
        child.stdout.on('data', output); child.stderr.on('data', output);
        child.once('error', error => {this.log(error.message); console.error('Could not start the game server:', error.message);});
        child.once('close', (code, signal) => {
            if (this.child === child) {this.child = null; this.gameReady = false;}
            if (!this.stopping && !this.starting && !this.closed && this.job?.status !== 'running') {
                this.onFatal?.(new Error('The game server stopped (' + (signal || 'exit ' + code) + '). Restart the local toolbox and check the Docker logs.'));
            }
        });
        try {await this.waitForGame(120000, requiredMap); this.gameReady = true;}
        finally {this.starting = false;}
    }
    async stopGame() {
        this.gameReady = false;
        const child = this.child;
        if (!child) return;
        this.stopping = true;
        await new Promise(resolve => {
            const timeout = setTimeout(() => child.kill('SIGKILL'), 15000);
            child.once('close', () => {clearTimeout(timeout); resolve();});
            child.kill('SIGTERM');
        });
        this.stopping = false;
    }
    startBuild(mapId) {
        if (this.closed) throw Object.assign(new Error('The toolbox is shutting down.'), {status: 503});
        if (this.job?.status === 'running') throw Object.assign(new Error('A build is already running.'), {status: 409});
        validateMap(this.root, mapId);
        this.job = {id: require('crypto').randomUUID(), status: 'running', step: 'Stop game', logs: []};
        this.buildAbort = new AbortController();
        this.buildPromise = this.buildMap(mapId).catch(error => {
            this.log(error.message); this.job.error = error.message;
            this.job.status = 'failed'; this.job.step = 'Build failed';
        });
        return {job: this.job};
    }
    async checks() {
        const checks = [];
        const add = (id, label, status, detail, fix) => checks.push({id, label, status, detail, ...(fix ? {fix} : {})});
        const expected = fs.existsSync(path.join(this.root, '.nvmrc')) ? fs.readFileSync(path.join(this.root, '.nvmrc'), 'utf8').trim().replace(/^v/, '') : null;
        add('node', 'Node.js', !expected || process.versions.node === expected ? 'pass' : 'warn',
            'Running ' + process.version + (expected ? '; this checkout uses ' + expected + '.' : '.'),
            expected && process.versions.node !== expected ? 'Use start-local.command or start-local.bat to run the bundled Docker runtime.' : null);
        const local = require('../server/js/localplaytest').isLocalPlaytest();
        add('local-mode', 'Local playtest mode', local ? 'pass' : 'fail', local ? 'Ownership checks and player data use the local provider.' : 'The development-only local playtest configuration is missing.',
            local ? null : 'Start the toolbox with start-local.command or start-local.bat.');
        try {
            const folder = path.join(this.root, 'tools/maps/tmx');
            const sources = fs.readdirSync(folder).filter(name => name.endsWith('.tmx') && fs.statSync(path.join(folder, name)).isFile());
            if (!sources.length || ['tmx2json.py', 'exportmap.js'].some(file => !fs.statSync(path.join(this.root, 'tools/maps', file)).isFile())) throw new Error('Missing Tiled source files or exporter.');
            add('map-sources', 'Tiled maps and exporter', 'pass', sources.length + ' map source files are available.');
        } catch (_) {add('map-sources', 'Tiled maps and exporter', 'fail', 'Tiled source files or the map exporter are missing.', 'Keep tools/maps in the checkout and restart the local launcher.');}
        add('client-build', 'Built game client', fs.existsSync(path.join(this.root, 'client-build/index.html')) ? 'pass' : 'fail',
            fs.existsSync(path.join(this.root, 'client-build/index.html')) ? 'The built game client is available.' : 'The built game client is missing.', 'Run Build map in Build tools, or restart the launcher to rebuild the Docker image.');
        try {
            for (const directory of ['client/maps', 'server/maps']) fs.accessSync(path.join(this.root, directory), fs.constants.W_OK);
            add('map-output', 'Map output folders', 'pass', 'Client and server map folders are writable.');
        } catch (_) {add('map-output', 'Map output folders', 'fail', 'A map output folder is missing or read-only.', 'Allow Docker Desktop access to the repository folder and check its file permissions.');}
        const [python, game] = await Promise.allSettled([
            this.run('python3', ['-c', 'import sys; from lxml import etree; print(sys.version.split()[0])'], {cwd: this.root, timeout: 5000}),
            this.fetch(new URL('/local/api/catalog', this.gameUrl), {signal: AbortSignal.timeout(5000)})
        ]);
        add('python', 'Python and lxml', python.status === 'fulfilled' ? 'pass' : 'fail', python.status === 'fulfilled' ? 'Python 3 and the lxml map-export dependency are available.' : 'Python 3 or lxml could not run.',
            python.status === 'fulfilled' ? null : 'Restart the launcher to rebuild its Docker image, which includes Python 3 and lxml.');
        add('game', 'Local game server', game.status === 'fulfilled' && game.value.ok ? 'pass' : 'fail',
            game.status === 'fulfilled' && game.value.ok ? 'The game catalog responds on port 8000.' : 'The game server is not ready on port 8000.',
            game.status === 'fulfilled' && game.value.ok ? null : 'Wait for any current map build to finish. If it has failed, inspect the Build tools log and restart the launcher.');
        add('docker-runtime', 'Docker environment', fs.existsSync('/.dockerenv') ? 'pass' : 'warn',
            fs.existsSync('/.dockerenv') ? 'The toolbox is running inside a Docker container. Docker Desktop was checked by the launcher.' : 'This toolbox is running outside Docker; Docker Desktop is checked by the desktop launchers.',
            fs.existsSync('/.dockerenv') ? null : 'Use the desktop launcher for the bundled environment.');
        return {checks, checkedAt: new Date().toISOString()};
    }
    async buildMap(mapId) {
        const backup = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-mapmaker-'));
        const outputs = ['server/maps/world_server_' + mapId + '.json', 'client/maps/world_client_' + mapId + '.json',
            'client/maps/world_client_' + mapId + '.js'];
        let filesPrepared = false, clientPrepared = false, buildSucceeded = false;
        const run = async (step, command, args, cwd) => {
            this.job.step = step; this.log(step);
            await this.run(command, args, {cwd, signal: this.buildAbort.signal, onLog: line => this.log(line)});
        };
        try {
            await this.stopGame();
            for (const [index, relative] of outputs.entries()) {
                const file = path.join(this.root, relative);
                if (fs.existsSync(file)) fs.copyFileSync(file, path.join(backup, String(index)));
            }
            filesPrepared = true;
            // Run each exporter directly: no shell wrapper can hide an error or outlive cancellation.
            for (const relative of outputs) fs.rmSync(path.join(this.root, relative), {force: true});
            const cwd = path.join(this.root, 'tools/maps');
            const converted = path.join(backup, 'map.json');
            await run('Export server map', 'python3', ['tmx2json.py', path.join('tmx', mapId + '.tmx'), converted], cwd);
            await run('Export server map', process.execPath, ['exportmap.js', converted, path.join(this.root, outputs[0]), 'server'], cwd);
            this.validateOutput(outputs[0]);
            await run('Export client map', process.execPath, ['exportmap.js', converted, path.join(this.root, 'client/maps/world_client_' + mapId), 'client'], cwd);
            this.validateOutput(outputs[1]);
            const worker = fs.readFileSync(path.join(this.root, outputs[2]), 'utf8');
            JSON.parse(worker.replace(/^var mapData\s*=\s*/, '').replace(/;\s*$/, ''));
            const client = path.join(this.root, 'client-build');
            if (fs.existsSync(client)) fs.cpSync(client, path.join(backup, 'client-build'), {recursive: true});
            clientPrepared = true;
            await run('Build game client', process.execPath, [path.join(this.root, 'bin/build-client.js')], this.root);
            buildSucceeded = true;
        } catch (error) {
            this.job.error = error.message;
            this.log(error.message);
            if (filesPrepared) for (const [index, relative] of outputs.entries()) {
                const file = path.join(this.root, relative), saved = path.join(backup, String(index));
                if (fs.existsSync(saved)) fs.copyFileSync(saved, file);
                else fs.rmSync(file, {force: true});
            }
            if (clientPrepared) {
                fs.rmSync(path.join(this.root, 'client-build'), {recursive: true, force: true});
                if (fs.existsSync(path.join(backup, 'client-build'))) fs.cpSync(path.join(backup, 'client-build'), path.join(this.root, 'client-build'), {recursive: true});
            }
        } finally {
            this.job.step = 'Restart game';
            if (!this.closed) {
                try {await this.startGame(mapId);}
                catch (error) {this.job.error = (this.job.error ? this.job.error + ' ' : '') + error.message; this.log(error.message);}
            }
            this.job.status = buildSucceeded && !this.job.error && !this.closed ? 'succeeded' : 'failed';
            this.job.step = this.job.status === 'succeeded' ? 'Ready to play' : 'Build failed';
            fs.rmSync(backup, {recursive: true, force: true});
        }
    }
    validateOutput(relative) {
        const data = JSON.parse(fs.readFileSync(path.join(this.root, relative), 'utf8'));
        if (!data || typeof data !== 'object' || !Number.isFinite(data.width) || !Number.isFinite(data.height)) {
            throw new Error('The map exporter did not produce a valid ' + relative + '.');
        }
    }
    async close() {
        this.closed = true;
        this.buildAbort?.abort();
        if (this.buildPromise) await this.buildPromise;
        await this.stopGame();
    }
}

function createToolboxApp(toolbox) {
    const app = express();
    app.use((req, res, next) => {
        const host = req.headers.host || '';
        if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host)) return res.status(403).json({error: 'Open the toolbox using localhost.'});
        if (req.method === 'POST') {
            if (req.headers.origin !== 'http://' + host) return res.status(403).json({error: 'Open the toolbox from its local browser page.'});
            if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return res.status(415).json({error: 'Send application/json.'});
        }
        res.setHeader('Cache-Control', 'no-store');
        next();
    });
    app.use(express.json({limit: '256kb'}));
    app.get('/local/api/quests', (req, res) => {
        try {res.json(require('../server/js/localquestbuilder').readQuests(toolbox.root, req.query.mapId));}
        catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    app.post('/local/api/quests', (req, res) => {
        try {
            if (toolbox.closed) return res.status(503).json({error: 'The toolbox is shutting down.'});
            if (toolbox.job?.status === 'running') return res.status(409).json({error: 'Wait for the map build to finish before saving quests.'});
            res.json(require('../server/js/localquestbuilder').saveQuests(toolbox.root, req.body));
        } catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    const guides = new Set(['mapmaker-toolbox', 'mapmaker-sessions', 'mapmaker-building', 'mapmaker-quest-builder']);
    app.get('/local/guides/:slug.md', (req, res) => {
        if (!guides.has(req.params.slug)) return res.status(404).type('text/plain').send('Guide not found.');
        res.type('text/plain').sendFile(path.join(toolbox.root, 'docs', req.params.slug + '.md'));
    });
    app.get('/local/api/build', (req, res) => res.json({job: toolbox.job}));
    app.get('/local/api/checks', async (req, res) => {
        try {res.json(await toolbox.checks());}
        catch (error) {res.status(500).json({error: error.message});}
    });
    app.get('/local/api/updates', async (req, res) => {
        try {
            const {checkMainUpdates} = require('../server/js/localmainupdates');
            res.json(await checkMainUpdates({root: process.env.MAPMAKER_CHECKOUT_DIR || toolbox.root}));
        } catch (_) {res.status(503).json({status: 'unknown', message: 'The main update check is unavailable. Try again shortly.'});}
    });
    app.post('/local/api/build', (req, res) => {
        try {res.status(202).json(toolbox.startBuild(req.body?.mapId));}
        catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    const proxy = async (req, res) => {
        try {
            if (toolbox.job?.status === 'running' && req.method === 'POST') return res.status(409).json({error: 'Wait for the map build to finish before playing.'});
            if (!toolbox.gameReady) return res.status(503).json({error: 'The game maps are still loading. Wait a moment, then try again.'});
            const response = await toolbox.fetch(new URL(req.originalUrl, toolbox.gameUrl), {
                method: req.method, headers: {'Content-Type': 'application/json', Host: new URL(toolbox.gameUrl).host},
                ...(req.method === 'POST' ? {body: JSON.stringify(req.body)} : {}), signal: AbortSignal.timeout(10000)
            });
            const data = await response.json();
            res.status(response.status).json(req.method === 'POST' ? rewriteSession(data, toolbox.gameUrl) : data);
        } catch (_) {res.status(503).json({error: 'The game is starting or rebuilding. Wait a moment, then try again.'});}
    };
    app.get('/local/api/catalog', proxy);
    app.post('/local/api/session', proxy);
    app.use('/fonts', express.static(path.join(toolbox.root, 'client/fonts')));
    for (const prefix of ['/img']) app.use(prefix, async (req, res) => {
        try {
            const response = await toolbox.fetch(new URL(req.originalUrl, toolbox.gameUrl), {signal: AbortSignal.timeout(10000)});
            res.status(response.status);
            res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
            res.send(Buffer.from(await response.arrayBuffer()));
        } catch (_) {res.sendStatus(503);}
    });
    app.use('/local', express.static(path.join(toolbox.root, 'server/local-launcher')));
    app.get('/', (req, res) => res.redirect('/local/'));
    app.use((error, req, res, next) => res.status(error.status || 500).json({error: error.type === 'entity.too.large' ?
        'This request exceeds the 256 KB toolbox limit. Shorten dialogue or remove quests before saving.' : 'The toolbox could not read the request.'}));
    return app;
}

async function start() {
    if (!require('../server/js/localplaytest').isLocalPlaytest()) throw new Error('The Mapmaker Toolbox requires the local development configuration.');
    const toolbox = new MapmakerToolbox();
    const server = createToolboxApp(toolbox).listen(Number(process.env.MAPMAKER_PORT || 8010), process.env.LOOPERLANDS_BIND_ADDRESS || '0.0.0.0');
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', error => reject(new Error('Could not start the Mapmaker Toolbox: ' + error.message)));
    });
    let closing;
    const close = () => closing || (closing = (async () => {
        await toolbox.close();
        await new Promise(resolve => server.close(resolve));
    })());
    toolbox.onFatal = async error => {console.error(error.message); await close(); process.exitCode = 1;};
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {close().catch(error => {console.error(error.message); process.exitCode = 1;});});
    try {await toolbox.startGame(); console.log('Mapmaker Toolbox: ' + toolbox.toolboxUrl);}
    catch (error) {await close(); throw error;}
    return {toolbox, server, close};
}

if (require.main === module) start().catch(error => {console.error(error.message); process.exitCode = 1;});
module.exports = {MapmakerToolbox, createToolboxApp, validateMap, rewriteSession, runCommand, start};

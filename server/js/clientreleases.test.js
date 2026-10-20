const fs = require('fs'), os = require('os'), path = require('path');
const {Readable} = require('stream');
const {once} = require('events');
const express = require('express');
const {ClientReleases, stage, validate, validFile} = require('./clientreleases');
const {HotReload} = require('./hotreload');
const {hash, MANIFEST} = require('./hotreloadmanifest');
const OLD = 'a'.repeat(40), NEW = 'b'.repeat(40);
let root, files, initial, releases, server;
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-client-release-'));
    files = {'index.html': '<html><head></head><body><script src="js/main.js"></script></body></html>',
        'js/main.js': 'old game', 'css/main.css': 'old styles', 'img/icon.png': Buffer.from([0, 128, 255])};
    for (const [file, data] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(root, 'client-build', file)), {recursive: true});
        fs.writeFileSync(path.join(root, 'client-build', file), data);
    }
    initial = {revision: OLD, files: Object.fromEntries(Object.entries(files).map(([file, data]) => [file, hash(data)]))};
    releases = new ClientReleases(root, initial);
});
afterEach(async () => {
    if (server) {server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); server = null;}
    fs.rmSync(root, {recursive: true, force: true});
});
async function candidate(changes = {'css/main.css': 'new styles'}) {
    const next = {revision: NEW, files: {...initial.files}};
    for (const [file, data] of Object.entries(changes)) {
        if (data === null) delete next.files[file];
        else next.files[file] = hash(data);
    }
    const lines = [JSON.stringify(next), ...Object.entries(changes).filter(([, data]) => data !== null)
        .map(([file, data]) => JSON.stringify({file, hash: next.files[file], data: Buffer.from(data).toString('base64')}))];
    await stage(root, Readable.from(lines.join('\n') + '\n'));
    return next;
}
async function http() {
    const app = express(); releases.attach(app, () => releases.current.revision);
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    return route => fetch('http://127.0.0.1:' + server.address().port + route);
}

test('CSS-only changes apply atomically and previous tabs retain their original assets', async () => {
    const next = await candidate();
    expect(releases.current).toEqual(initial);
    releases.prepare(next); releases.persist(next); releases.activate(next);
    expect(releases.update(OLD)).toMatchObject({revision: NEW, mode: 'css', files: ['css/main.css']});
    const get = await http();
    expect(await (await get('/_client/' + OLD + '/css/main.css')).text()).toBe('old styles');
    const response = await get('/_client/' + NEW + '/css/main.css');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('new styles');
    expect(response.headers.get('cache-control')).toContain('immutable');
    expect(response.headers.get('content-type')).toContain('text/css');
});

test('scripts and binary changes require reload; server-only updates require no client reload', async () => {
    const same = {revision: NEW, files: {...initial.files}};
    releases.prepare(same); releases.persist(same); releases.activate(same);
    expect(releases.update(OLD).mode).toBe('none');
    const next = await candidate({'js/main.js': 'new game', 'img/icon.png': Buffer.from([255, 0, 2])});
    releases.persist(next); releases.activate(next);
    expect(releases.update(OLD).mode).toBe('reload');
    expect(releases.update('c'.repeat(40)).mode).toBe('reload');
    expect(releases.update(NEW).mode).toBe('none');
});

test('index pins relative scripts, styles and workers to one release and stale bookmarks recover after recreation', async () => {
    const get = await http();
    const response = await get('/?sessionId=ignored');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('<base href="/_client/' + OLD + '/"><meta name="looperlands-client-revision" content="' + OLD + '">');
    expect(await (await get('/?clientRevision=' + NEW)).text()).toContain('content="' + OLD + '"');
    expect(await (await get('/_client/' + OLD + '/js/main.js')).text()).toBe('old game');
    expect((await get('/_client/' + OLD + '/unlisted.js')).status).toBe(404);
    expect((await get('/_client/' + NEW + '/js/main.js')).status).toBe(404);
});

test('polling reports current readiness without caching an earlier readiness result', async () => {
    let ready = false; releases.ready = () => ready;
    const get = await http();
    let response = await get('/client-update?from=' + OLD);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ready: false, serverRevision: OLD});
    ready = true;
    expect(await (await get('/client-update?from=' + OLD)).json()).toMatchObject({ready: true});
    expect((await get('/client-update?from=invalid')).status).toBe(400);
});

test('missing, corrupt or truncated staged data cannot activate a release', async () => {
    const next = {revision: NEW, files: {...initial.files, 'js/main.js': hash('new game')}};
    expect(() => releases.prepare(next)).toThrow('not staged');
    expect(() => releases.prepare(next, false)).not.toThrow();
    const corrupt = {file: 'js/main.js', hash: next.files['js/main.js'], data: Buffer.from('corrupt').toString('base64')};
    await expect(stage(root, Readable.from(JSON.stringify(next) + '\n' + JSON.stringify(corrupt)))).rejects.toThrow('Corrupt');
    await expect(stage(root, Readable.from(''))).rejects.toThrow('Empty');
    await expect(stage(root, Readable.from(JSON.stringify(next) + '\n{"file":'))).rejects.toThrow();
    expect(releases.current).toEqual(initial);
});

test.each(['../escape', '/absolute', 'js/../escape', 'js\\escape', 'js//escape', '', 'js/\0file'])('rejects unsafe client path %s', file => {
    expect(validFile(file)).toBe(false);
    expect(() => validate({revision: NEW, files: {'index.html': hash('index'), [file]: hash('data')}})).toThrow();
});

test('corrupt persisted blobs can be repaired by verified staging; unrelated stream entries are rejected', async () => {
    const next = await candidate();
    fs.writeFileSync(path.join(root, '.live-update/client-blobs', next.files['css/main.css']), 'corrupt');
    expect(() => releases.prepare(next)).toThrow('not staged');
    await candidate(); expect(() => releases.prepare(next)).not.toThrow();
    await expect(stage(root, Readable.from(JSON.stringify(next) + '\n' + JSON.stringify({file: 'unknown', hash: hash('data'), data: 'ZGF0YQ=='})))).rejects.toThrow('Invalid staged');
});

test('client changes participate in server commit, rollback, restart and immutable-release validation', async () => {
    const manifest = {protocol: 1, revision: OLD, files: {}, client: initial};
    fs.writeFileSync(path.join(root, MANIFEST), JSON.stringify(manifest));
    const manager = new HotReload(root, manifest, {});
    const next = await candidate({'js/main.js': 'new game'});
    const bundle = {manifest: {...manifest, revision: NEW, client: next}, sources: {}};
    expect(manager.plan(bundle, OLD).method).toBe('hmr');
    const notify = jest.fn(); manager.clients.notify = notify;
    manager.apply(bundle, OLD);
    expect(notify).toHaveBeenCalledWith({revision: NEW});
    const restarted = new HotReload(root, JSON.parse(fs.readFileSync(path.join(root, MANIFEST))), {});
    expect(restarted.clients.current.revision).toBe(NEW);
    expect(fs.readFileSync(restarted.clients.filename(restarted.clients.record(OLD), 'js/main.js'), 'utf8')).toBe('old game');
    manager.apply(manager.previous, NEW);
    expect(manager.clients.current.revision).toBe(OLD);
    expect(() => manager.apply({manifest: {...bundle.manifest, revision: OLD, client: {...next, revision: OLD}}}, OLD)).toThrow('immutable');
});

test('a failed server file transaction cannot announce or activate staged client assets', async () => {
    const manifest = {protocol: 1, revision: OLD, files: {}, client: initial};
    fs.writeFileSync(path.join(root, MANIFEST), JSON.stringify(manifest));
    const manager = new HotReload(root, manifest, {}), next = await candidate();
    const notify = jest.fn(); manager.clients.notify = notify;
    const write = manager.write.bind(manager);
    manager.write = (file, data) => {if (file.endsWith(MANIFEST) && JSON.parse(data).revision === NEW) throw new Error('disk full'); return write(file, data);};
    expect(() => manager.apply({manifest: {...manifest, revision: NEW, client: next}}, OLD)).toThrow('disk full');
    expect(manager.clients.current).toEqual(initial);
    expect(notify).not.toHaveBeenCalled();
    expect(JSON.parse(fs.readFileSync(path.join(root, MANIFEST))).revision).toBe(OLD);
});

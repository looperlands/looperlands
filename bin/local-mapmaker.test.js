const fs = require('fs');
const os = require('os');
const path = require('path');
const {EventEmitter} = require('events');
global.Types = {};
const {MapmakerToolbox, createToolboxApp, validateMap, rewriteSession, runCommand} = require('./local-mapmaker');

let root, toolbox, server;
const output = {width: 10, height: 10, collisions: []};
function write(relative, content) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, content);
}
function generated(mode) {
    if (mode === 'server') write('server/maps/world_server_testmap.json', JSON.stringify(output));
    else {
        write('client/maps/world_client_testmap.json', JSON.stringify(output));
        write('client/maps/world_client_testmap.js', 'var mapData = ' + JSON.stringify(output));
    }
}
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands toolbox '));
    write('server/config.json', JSON.stringify({maps: ['testmap', 'missing']}));
    write('tools/maps/tmx/testmap.tmx', '<map/>');
    write('tools/maps/tmx2json.py', '# test converter');
    write('tools/maps/exportmap.js', '// test exporter');
    write('.nvmrc', process.versions.node);
    write('client-build/index.html', 'old client');
    generated('server'); generated('client');
    toolbox = new MapmakerToolbox({root, gameUrl: 'http://127.0.0.1:8000', fetch: jest.fn().mockResolvedValue({ok: true}),
        run: jest.fn(async (command, args, options) => {
            options.onLog?.('building\n');
            if (command === process.execPath && args[0] === 'exportmap.js') generated(args[3]);
            else if (command === process.execPath) write('client-build/index.html', 'new client');
        })});
    toolbox.stopGame = jest.fn().mockResolvedValue(undefined);
    toolbox.startGame = jest.fn().mockResolvedValue(undefined);
    toolbox.gameReady = true;
});
afterEach(async () => {
    if (server) {await new Promise(resolve => server.close(resolve)); server = null;}
    fs.rmSync(root, {recursive: true, force: true});
});

test('map validation rejects traversal, Windows paths and unconfigured or missing source files', () => {
    expect(validateMap(root, 'testmap')).toBe(path.join(root, 'tools/maps/tmx/testmap.tmx'));
    for (const invalid of ['../testmap', '..\\testmap', 'C:\\testmap', 'testmap;echo bad', 'unknown', 'missing', null]) {
        expect(() => validateMap(root, invalid)).toThrow();
    }
});

test('a build runs exports and client compilation in order, restarts the game, and excludes concurrent jobs', async () => {
    expect(toolbox.startBuild('testmap').job.status).toBe('running');
    expect(() => toolbox.startBuild('testmap')).toThrow('already running');
    await toolbox.buildPromise;
    const calls = toolbox.run.mock.calls;
    expect(calls[0][0]).toBe('python3');
    expect(calls[0][1].slice(0, 2)).toEqual(['tmx2json.py', path.join('tmx', 'testmap.tmx')]);
    expect(calls[1].slice(0, 2)).toEqual([process.execPath, ['exportmap.js', calls[0][1][2], path.join(root, 'server/maps/world_server_testmap.json'), 'server']]);
    expect(calls[2].slice(0, 2)).toEqual([process.execPath, ['exportmap.js', calls[0][1][2], path.join(root, 'client/maps/world_client_testmap'), 'client']]);
    expect(calls[3].slice(0, 2)).toEqual([process.execPath, [path.join(root, 'bin/build-client.js')]]);
    expect(toolbox.run.mock.calls[0][2].cwd).toBe(path.join(root, 'tools/maps'));
    expect(toolbox.run.mock.calls[3][2].cwd).toBe(root);
    expect(toolbox.stopGame).toHaveBeenCalledTimes(1);
    expect(toolbox.startGame).toHaveBeenCalledTimes(1);
    expect(toolbox.job).toMatchObject({status: 'succeeded', step: 'Ready to play'});
});

test('an exporter that exits zero without output fails and restores the previous generated maps', async () => {
    const before = fs.readFileSync(path.join(root, 'server/maps/world_server_testmap.json'), 'utf8');
    toolbox.run.mockResolvedValue(undefined);
    toolbox.startBuild('testmap'); await toolbox.buildPromise;
    expect(toolbox.job.status).toBe('failed');
    expect(fs.readFileSync(path.join(root, 'server/maps/world_server_testmap.json'), 'utf8')).toBe(before);
    expect(toolbox.run).toHaveBeenCalledTimes(2);
    expect(toolbox.startGame).toHaveBeenCalledTimes(1);
});

test('failed client compilation restores the previous build and keeps the toolbox available', async () => {
    toolbox.run.mockImplementation(async (command, args) => {
        if (command === 'python3') return;
        if (args[0] === 'exportmap.js') generated(args[3]);
        else {write('client-build/index.html', 'broken client'); throw new Error('compiler failed');}
    });
    toolbox.startBuild('testmap'); await toolbox.buildPromise;
    expect(toolbox.job).toMatchObject({status: 'failed', error: 'compiler failed'});
    expect(fs.readFileSync(path.join(root, 'client-build/index.html'), 'utf8')).toBe('old client');
    expect(toolbox.startGame).toHaveBeenCalledTimes(1);
    expect(toolbox.closed).toBe(false);
});

test('game startup failure is reported and job logs have bounded size', async () => {
    toolbox.startGame.mockRejectedValue(new Error('game could not start'));
    toolbox.startBuild('testmap'); await toolbox.buildPromise;
    expect(toolbox.job).toMatchObject({status: 'failed', error: 'game could not start'});
    toolbox.job.status = 'running';
    toolbox.log(Array.from({length: 250}, (_, index) => String(index) + 'x'.repeat(2000)).join('\n'));
    expect(toolbox.job.logs).toHaveLength(200);
    expect(toolbox.job.logs.every(line => line.length <= 1000)).toBe(true);
});

test('game child receives the toolbox URL without shell interpolation', async () => {
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    toolbox.spawn = jest.fn().mockReturnValue(child);
    toolbox.waitForGame = jest.fn().mockResolvedValue(undefined);
    await MapmakerToolbox.prototype.startGame.call(toolbox);
    expect(toolbox.spawn).toHaveBeenCalledWith(process.execPath, [path.join(root, 'server/js/main.js')], expect.objectContaining({
        cwd: root, shell: false, env: expect.objectContaining({LOOPERLANDS_TOOLBOX_URL: 'http://127.0.0.1:8010/local/'})
    }));
});

test('game readiness waits for every configured map rather than the first successful catalog', async () => {
    toolbox.child = {};
    toolbox.fetch.mockResolvedValueOnce({ok: true, json: async () => ({maps: [{id: 'testmap'}]})})
        .mockResolvedValue({ok: true, json: async () => ({maps: [{id: 'testmap'}, {id: 'missing'}]})});
    await toolbox.waitForGame(2000);
    expect(toolbox.fetch).toHaveBeenCalledTimes(2);
});

test('build readiness requires checkpoints on its selected map', async () => {
    toolbox.child = {};
    toolbox.fetch.mockResolvedValueOnce({ok: true, json: async () => ({maps: [{id: 'testmap', checkpoints: []}, {id: 'missing', checkpoints: []}]})})
        .mockResolvedValue({ok: true, json: async () => ({maps: [{id: 'testmap', checkpoints: [{id: 1}]}, {id: 'missing', checkpoints: []}]})});
    await toolbox.waitForGame(2000, 'testmap');
    expect(toolbox.fetch).toHaveBeenCalledTimes(2);
});

test('build readiness waits for other configured maps after the rebuilt map is ready', async () => {
    toolbox.child = {};
    toolbox.fetch.mockResolvedValueOnce({ok: true, json: async () => ({maps: [{id: 'testmap', checkpoints: [{id: 1}]}]})})
        .mockResolvedValue({ok: true, json: async () => ({maps: [{id: 'testmap', checkpoints: [{id: 1}]}, {id: 'missing', checkpoints: []}]})});
    await toolbox.waitForGame(2000, 'testmap');
    expect(toolbox.fetch).toHaveBeenCalledTimes(2);
});

test('session links always return to the game port', () => {
    expect(rewriteSession({url: '/?sessionId=abc', sessionId: 'abc'}, 'http://127.0.0.1:8128')).toEqual({url: 'http://127.0.0.1:8128/?sessionId=abc', sessionId: 'abc'});
    expect(rewriteSession({url: 'http://127.0.0.1:8010/?sessionId=abc'}, 'http://127.0.0.1:8000').url).toBe('http://127.0.0.1:8000/?sessionId=abc');
});

async function listen() {
    server = createToolboxApp(toolbox).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    return 'http://127.0.0.1:' + server.address().port;
}
test('proxy rejects cross-origin and non-JSON writes and drops browser headers when forwarding', async () => {
    const base = await listen();
    toolbox.fetch.mockResolvedValue({status: 200, json: async () => ({url: '/?sessionId=abc'})});
    expect((await fetch(base + '/local/api/session', {method: 'POST', headers: {origin: 'https://untrusted.example', 'content-type': 'application/json'}, body: '{}'})).status).toBe(403);
    expect((await fetch(base + '/local/api/session', {method: 'POST', headers: {origin: base, 'content-type': 'text/plain'}, body: '{}'})).status).toBe(415);
    const response = await fetch(base + '/local/api/session', {method: 'POST', headers: {origin: base, 'content-type': 'application/json', 'x-api-key': 'never-forward'}, body: JSON.stringify({mapId: 'testmap'})});
    expect(await response.json()).toEqual({url: 'http://127.0.0.1:8000/?sessionId=abc'});
    const forwarded = toolbox.fetch.mock.calls[0];
    expect(forwarded[0].href).toBe('http://127.0.0.1:8000/local/api/session');
    expect(forwarded[1].headers).toEqual({'Content-Type': 'application/json', Host: '127.0.0.1:8000'});
});

test('build API reports 400 for missing sources, 202 on start and 409 while busy', async () => {
    const base = await listen(), headers = {origin: base, 'content-type': 'application/json'};
    expect((await fetch(base + '/local/api/build', {method: 'POST', headers, body: '{"mapId":"missing"}'})).status).toBe(400);
    let release;
    toolbox.stopGame.mockImplementationOnce(() => new Promise(resolve => {release = resolve;}));
    const started = await fetch(base + '/local/api/build', {method: 'POST', headers, body: '{"mapId":"testmap"}'});
    expect(started.status).toBe(202);
    expect((await started.json()).job.status).toBe('running');
    expect((await fetch(base + '/local/api/build', {method: 'POST', headers, body: '{"mapId":"testmap"}'})).status).toBe(409);
    release(); await toolbox.buildPromise;
    expect((await (await fetch(base + '/local/api/build')).json()).job.status).toBe('succeeded');
});

test('the toolbox catalog stays unavailable until complete startup readiness', async () => {
    const base = await listen();
    toolbox.gameReady = false;
    expect((await fetch(base + '/local/api/catalog')).status).toBe(503);
    expect(toolbox.fetch).not.toHaveBeenCalled();
    toolbox.gameReady = true;
    toolbox.fetch.mockResolvedValue({status: 200, json: async () => ({maps: [{id: 'testmap'}]})});
    expect((await fetch(base + '/local/api/catalog')).status).toBe(200);
});

test('environment checks report missing Python and a stopped game with actionable fixes', async () => {
    toolbox.run.mockRejectedValue(new Error('python3 missing'));
    toolbox.fetch.mockRejectedValue(new Error('connection refused'));
    const result = await toolbox.checks();
    expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.checks).toEqual(expect.arrayContaining([
        expect.objectContaining({id: 'python', status: 'fail', fix: expect.any(String)}),
        expect.objectContaining({id: 'game', status: 'fail', fix: expect.any(String)}),
        expect.objectContaining({id: 'map-sources', status: 'pass'}),
        expect.objectContaining({id: 'map-output', status: 'pass'})
    ]));
    expect(toolbox.run).toHaveBeenCalledWith('python3', expect.arrayContaining(['-c']), expect.objectContaining({timeout: 5000}));
});

test('checks identify missing sources and client output, and expose results over HTTP', async () => {
    fs.rmSync(path.join(root, 'tools/maps/tmx'), {recursive: true});
    fs.rmSync(path.join(root, 'client-build'), {recursive: true});
    const base = await listen();
    const response = await fetch(base + '/local/api/checks');
    expect(response.status).toBe(200);
    expect((await response.json()).checks).toEqual(expect.arrayContaining([
        expect.objectContaining({id: 'map-sources', status: 'fail'}), expect.objectContaining({id: 'client-build', status: 'fail'}),
        expect.objectContaining({id: 'game', status: 'pass'})
    ]));
});

test('command cancellation waits until its tracked process closes before rollback can begin', async () => {
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = jest.fn();
    const controller = new AbortController();
    let settled = false;
    const command = runCommand('python3', ['tmx2json.py'], {spawn: () => child, signal: controller.signal}).finally(() => {settled = true;});
    const rejected = expect(command).rejects.toThrow('Build cancelled');
    controller.abort();
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    await Promise.resolve();
    expect(settled).toBe(false);
    child.emit('close', null, 'SIGTERM');
    await rejected;
    expect(settled).toBe(true);
});

test('spawn errors settle only after close and do not start subsequent build steps', async () => {
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    let settled = false;
    const command = runCommand('missing-python', [], {spawn: () => child}).finally(() => {settled = true;});
    const rejected = expect(command).rejects.toThrow('not found');
    child.emit('error', new Error('not found'));
    await Promise.resolve(); expect(settled).toBe(false);
    child.emit('close', -2);
    await rejected; expect(settled).toBe(true);
});

// The first quest request loads the bundled quest registry and catalog under coverage.
// Allow for cold module instrumentation on shared CI runners.
test('quest API persists a validated map file, enforces origin and revision checks, and blocks writes during builds', async () => {
    const Types = require('../shared/js/gametypes');
    write('server/maps/world_server_testmap.json', JSON.stringify({...output, staticEntities: {1: 'guard', 2: 'rat'}}));
    const base = await listen(), headers = {origin: base, 'content-type': 'application/json'};
    const initial = await (await fetch(base + '/local/api/quests?mapId=testmap')).json();
    expect(initial.quests).toEqual([]);
    expect(initial.catalog.npcs).toContainEqual({id: Types.Entities.GUARD, name: 'guard'});
    const quest = {id: 'TOOLBOX_PATROL', name: 'Gate patrol', npc: Types.Entities.GUARD, startText: 'Defeat a rat.', endText: 'Thank you.',
        objectives: [{id: 'rat', eventType: 'KILL_MOB', target: Types.Entities.RAT}]};
    const body = JSON.stringify({mapId: 'testmap', revision: initial.revision, quests: [quest]});
    expect((await fetch(base + '/local/api/quests', {method: 'POST', headers: {...headers, origin: 'https://untrusted.example'}, body})).status).toBe(403);
    expect(fs.existsSync(path.join(root, 'tools/quests/testmap.json'))).toBe(false);
    const saved = await fetch(base + '/local/api/quests', {method: 'POST', headers, body});
    expect(saved.status).toBe(200);
    expect((await saved.json()).quests).toEqual([quest]);
    expect(JSON.parse(fs.readFileSync(path.join(root, 'tools/quests/testmap.json'), 'utf8'))).toEqual({version: 1, quests: [quest]});
    expect((await fetch(base + '/local/api/quests', {method: 'POST', headers, body})).status).toBe(409);
    toolbox.job = {status: 'running'};
    expect((await fetch(base + '/local/api/quests', {method: 'POST', headers, body})).status).toBe(409);
}, 30000);

test('only the four mapmaker documentation sources can be opened through the toolbox', async () => {
    write('docs/mapmaker-toolbox.md', '# Mapmaker Toolbox\n');
    write('docs/private-note.md', 'Do not serve this file');
    const base = await listen();
    const response = await fetch(base + '/local/guides/mapmaker-toolbox.md');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(await response.text()).toBe('# Mapmaker Toolbox\n');
    expect((await fetch(base + '/local/guides/private-note.md')).status).toBe(404);
});

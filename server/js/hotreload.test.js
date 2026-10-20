const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const http = require('http');
const {execFileSync, spawn} = require('child_process');
const {once} = require('events');
const express = require('express');
const WebSocket = require('ws');
const {Server} = require('socket.io');
const {HotReload, RestartRequired} = require('./hotreload');
const {POLICIES, describe} = require('./hotreloadpolicy');
const {hash, MANIFEST} = require('./hotreloadmanifest');

const oldRevision = 'a'.repeat(40), newRevision = 'b'.repeat(40);
const relative = 'server/js/unit.js';
const original = `
globalThis.starts = (globalThis.starts || 0) + 1;
let bonus = 3;
class Unit {
    constructor() { this.x = 4; this.hp = 80; this.inventory = ['sword']; }
    move(dx) { this.x += dx; return this.x + bonus; }
    read() { return this.x; }
}
module.exports = Unit;
`;
const policy = {kind: 'class', name: 'Unit', protected: ['constructor']};
const temporary = [];
function fixture(source = original, selectedPolicy = policy) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-hmr-'));
    temporary.push(root);
    fs.mkdirSync(path.join(root, 'server/js'), {recursive: true});
    const filename = path.join(root, relative);
    fs.writeFileSync(filename, source);
    const manifest = {protocol: 1, revision: oldRevision, files: {[relative]: hash(source)}};
    fs.writeFileSync(path.join(root, MANIFEST), JSON.stringify(manifest));
    const reload = new HotReload(root, manifest, {[relative]: selectedPolicy});
    const module = {exports: {}, filename};
    const context = {module, capture: (module, evaluate) => reload.capture(module, evaluate)};
    vm.runInNewContext(source + '\ncapture(module, expression => eval(expression));', context);
    return {root, filename, reload, Unit: module.exports, context,
        bundle: source => ({manifest: {protocol: 1, revision: newRevision, files: {[relative]: hash(source)}}, sources: {[relative]: source}})};
}

afterEach(() => { for (const root of temporary.splice(0)) fs.rmSync(root, {recursive: true, force: true}); });

test('existing instances and bound callbacks update without rerunning initialization or losing state', () => {
    const f = fixture(), player = new f.Unit(), move = player.move.bind(player), inventory = player.inventory;
    expect(move(1)).toBe(8);
    f.reload.apply(f.bundle(original.replace('this.x += dx;', 'this.x += dx * 2;')), oldRevision);
    expect(move(1)).toBe(10);
    expect(player.x).toBe(7);
    expect(player.hp).toBe(80);
    expect(player.inventory).toBe(inventory);
    expect(f.context.starts).toBe(1);
    expect(f.reload.status().revision).toBe(newRevision);
});

test('rollback restores code and keeps accumulated player state and callback identities', () => {
    const f = fixture(), player = new f.Unit(), move = player.move;
    f.reload.apply(f.bundle(original.replace('this.x += dx;', 'this.x += dx * 2;')), oldRevision);
    player.move(1);
    f.reload.apply(f.reload.previous, newRevision);
    expect(player.move).toBe(move);
    expect(player.move(1)).toBe(10);
    expect(player.x).toBe(7);
    expect(f.reload.status().revision).toBe(oldRevision);
    expect(fs.readFileSync(f.filename, 'utf8')).toBe(original);
});

test.each([
    ['constructor', source => source.replace('this.hp = 80', 'this.hp = 100')],
    ['module state', source => source.replace('bonus = 3', 'bonus = 5')],
    ['method signature', source => source.replace('move(dx)', 'move(dx, dy)')],
    ['new method', source => source.replace('read() {', 'other() {} read() {')],
])('rejects changes to %s before changing methods or files', (label, modify) => {
    const f = fixture(), player = new f.Unit();
    expect(() => f.reload.apply(f.bundle(modify(original)), oldRevision)).toThrow(RestartRequired);
    expect(player.move(1)).toBe(8);
    expect(fs.readFileSync(f.filename, 'utf8')).toBe(original);
});

test('syntax errors, corrupt bundles, stale releases and out-of-band edits leave the runtime intact', () => {
    const f = fixture(), player = new f.Unit();
    expect(() => f.reload.apply(f.bundle(original.replace('this.x += dx;', 'this.x += ;')), oldRevision)).toThrow();
    const corrupt = f.bundle(original); corrupt.manifest.files[relative] = '0'.repeat(64);
    expect(() => f.reload.apply(corrupt, oldRevision)).toThrow('corrupt source');
    expect(() => f.reload.apply(f.bundle(original), 'c'.repeat(40))).toThrow('Running release changed');
    fs.appendFileSync(f.filename, '\n// unexpected host edit');
    expect(() => f.reload.apply(f.bundle(original.replace('this.x += dx;', 'this.x += dx * 2;')), oldRevision)).toThrow('outside HMR');
    expect(player.move(1)).toBe(8);
});

test('automatic planning selects reboot only for a confirmed incompatibility and never for a broken update', () => {
    const f = fixture();
    expect(f.reload.plan(f.bundle(original.replace('this.x += dx;', 'this.x += dx * 2;')), oldRevision).method).toBe('hmr');
    expect(f.reload.plan(f.bundle(original.replace('bonus = 3', 'bonus = 4')), oldRevision)).toMatchObject({method: 'reboot', files: [relative]});
    const corrupt = f.bundle(original.replace('this.x += dx;', 'this.x += dx * 2;'));
    corrupt.sources[relative] = 'corrupt';
    corrupt.manifest.files['shared/js/protocol.js'] = hash('also requires reboot');
    expect(() => f.reload.plan(corrupt, oldRevision)).toThrow('corrupt source');
    expect(() => f.reload.plan(f.bundle(original.replace('this.x += dx;', 'this.x += ;')), oldRevision)).toThrow();
    expect(() => f.reload.plan(f.bundle(original), 'c'.repeat(40))).toThrow('Running release changed');
    expect(f.reload.status().revision).toBe(oldRevision);
});

test('rejects unsupported runtime files, removal and path traversal', () => {
    const f = fixture();
    const bundle = f.bundle(original);
    bundle.manifest.files['shared/js/gametypes.js'] = hash('new protocol');
    expect(() => f.reload.prepare(bundle, oldRevision)).toThrow(RestartRequired);
    delete bundle.manifest.files['shared/js/gametypes.js'];
    delete bundle.manifest.files[relative];
    expect(() => f.reload.prepare(bundle, oldRevision)).toThrow(RestartRequired);
    bundle.manifest.files['../outside.js'] = hash('escape');
    expect(() => f.reload.prepare(bundle, oldRevision)).toThrow('Invalid runtime path');
});

test('destructured function exports retain their original module state', () => {
    const source = 'let bonus = 7; var Rules = {}; Rules.read = function() { return bonus; }; Rules.set = function(value) { bonus = value; }; module.exports = Rules;';
    const f = fixture(source, {kind: 'object', name: 'Rules', protected: []});
    const {read} = f.Unit;
    f.Unit.set(9);
    f.reload.apply(f.bundle(source.replace('return bonus;', 'return bonus * 2;')), oldRevision);
    expect(read()).toBe(18);
    expect(f.Unit.read).toBe(read);
});

test('legacy class methods can still use their parent through _super', () => {
    const source = `const Base = {extend(spec) { function Unit() { this.init(); } Unit.prototype = Object.assign(Object.create({read() { return 2; }}), spec); return Unit; }};
module.exports = Base.extend({init: function() { this.x = 3; }, read: function() { return this.x; }});`;
    const f = fixture(source, {kind: 'legacy', protected: ['init']}), player = new f.Unit();
    f.reload.apply(f.bundle(source.replace('return this.x;', 'return this._super() + this.x;')), oldRevision);
    expect(player.read()).toBe(5);
    expect(player._super).toBeUndefined();
});

test('validates a whole batch, including combat configuration, before applying any methods', () => {
    const f = fixture(), player = new f.Unit(), configPath = 'server/mob-combat/main.json';
    fs.mkdirSync(path.join(f.root, 'server/mob-combat'));
    fs.writeFileSync(path.join(f.root, configPath), '{"chance":0.5}');
    f.reload.manifest.files[configPath] = hash('{"chance":0.5}');
    const target = {config: {chance: 0.5}};
    f.reload.config(configPath, target, 'config', source => {
        const value = JSON.parse(source);
        if (value.chance > 1) throw new Error('Invalid chance');
        return value;
    });
    const bundle = f.bundle(original.replace('this.x += dx;', 'this.x += dx * 2;'));
    bundle.sources[configPath] = '{"chance":2}'; bundle.manifest.files[configPath] = hash(bundle.sources[configPath]);
    expect(() => f.reload.apply(bundle, oldRevision)).toThrow('Invalid chance');
    expect(player.move(1)).toBe(8);
    expect(target.config.chance).toBe(0.5);
    bundle.sources[configPath] = '{"chance":0.8}'; bundle.manifest.files[configPath] = hash(bundle.sources[configPath]);
    f.reload.apply(bundle, oldRevision);
    expect(target.config.chance).toBe(0.8);
    expect(player.move(1)).toBe(10);
});

test('a failed source write restores source files before any dispatch slots change', () => {
    const f = fixture(), player = new f.Unit(), write = f.reload.write.bind(f.reload);
    jest.spyOn(f.reload, 'write').mockImplementation((filename, source) => {
        if (filename.endsWith(MANIFEST) && source.includes(newRevision)) throw new Error('Disk full');
        return write(filename, source);
    });
    expect(() => f.reload.apply(f.bundle(original.replace('this.x += dx;', 'this.x += dx * 2;')), oldRevision)).toThrow('Disk full');
    expect(player.move(1)).toBe(8);
    expect(fs.readFileSync(f.filename, 'utf8')).toBe(original);
    expect(JSON.parse(fs.readFileSync(path.join(f.root, MANIFEST))).revision).toBe(oldRevision);
});

test('startup repairs an interrupted file transaction before loading gameplay modules', () => {
    const f = fixture();
    fs.mkdirSync(path.join(f.root, '.live-update'));
    fs.writeFileSync(path.join(f.root, '.live-update/transaction.json'), JSON.stringify({manifest: f.reload.manifest, sources: {[relative]: original}}));
    fs.writeFileSync(f.filename, original.replace('this.x += dx;', 'this.x += dx * 2;'));
    execFileSync(process.execPath, ['-e', 'require(process.argv[1]).install(process.argv[2]);', require.resolve('./hotreload'), f.root], {env: {...process.env, LIVE_UPDATES_ENABLED: '1'}});
    expect(fs.readFileSync(f.filename, 'utf8')).toBe(original);
    expect(fs.existsSync(path.join(f.root, '.live-update/transaction.json'))).toBe(false);
});

test('all production hot-module policies parse the real gameplay sources', () => {
    for (const [relative, selected] of Object.entries(POLICIES)) {
        expect(describe(fs.readFileSync(path.resolve(__dirname, '../..', relative), 'utf8'), selected).methods.size).toBeGreaterThan(0);
    }
});

test('a connected Socket.IO client receives new behavior and rollback without disconnecting', async () => {
    const f = fixture(), player = new f.Unit(), app = express(), server = http.createServer(app), io = new Server(server);
    f.reload.attach(app, 'local-fixture-key');
    io.on('connection', socket => socket.on('move', value => socket.emit('state', player.move(value))));
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const address = 'http://127.0.0.1:' + server.address().port;
    const socket = new WebSocket(address.replace('http:', 'ws:') + '/socket.io/?EIO=4&transport=websocket');
    let disconnected = false;
    socket.on('close', () => {disconnected = true;});
    const waitPacket = prefix => new Promise(resolve => {
        const handler = buffer => {
            const data = buffer.toString();
            if (data === '2') socket.send('3');
            if (data.startsWith(prefix)) {socket.off('message', handler); resolve(data);}
        };
        socket.on('message', handler);
    });
    const post = async (action, body, key = 'local-fixture-key') => fetch(address + '/_live-update/' + action, {
        method: 'POST', headers: {'Content-Type': 'application/json', 'x-api-key': key}, body: JSON.stringify(body),
    });
    try {
        await waitPacket('0');
        const connected = waitPacket('40'); socket.send('40'); await connected;
        const move = async () => {const result = waitPacket('42'); socket.send('42["move",1]'); return JSON.parse((await result).slice(2))[1];};
        expect(await move()).toBe(8);
        const body = {expectedRevision: oldRevision, bundle: f.bundle(original.replace('this.x += dx;', 'this.x += dx * 2;'))};
        expect((await post('apply', body, 'wrong')).status).toBe(403);
        expect((await post('prepare', body)).status).toBe(200);
        expect(await move()).toBe(9); // Preparation has no effect on live behavior.
        const child = spawn(process.execPath, [path.resolve(__dirname, '../../bin/live-update-request.js')], {
            env: {...process.env, APP_URL: address.replace('http:', 'https:'), LIVE_UPDATE_ACTION: 'apply', LIVE_UPDATE_KEY: 'local-fixture-key'},
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        let output = '', errors = '';
        child.stdout.on('data', data => {output += data;});
        child.stderr.on('data', data => {errors += data;});
        child.stdin.end(JSON.stringify(body));
        const [exitCode] = await once(child, 'close');
        expect(errors).toBe('');
        expect(exitCode).toBe(0);
        expect(JSON.parse(output).pid).toBe(process.pid);
        expect(await move()).toBe(11);
        expect((await post('rollback', {expectedRevision: newRevision})).status).toBe(200);
        expect(await move()).toBe(12);
        expect(disconnected).toBe(false);
        expect(player.hp).toBe(80);
        expect(player.inventory).toEqual(['sword']);
    } finally {
        socket.terminate();
        await new Promise(resolve => io.close(resolve));
    }
}, 15000);

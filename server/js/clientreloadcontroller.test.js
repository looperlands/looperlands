const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const {once} = require('events');
const express = require('express');
const NodeCache = require('node-cache');
const {ClientReloadController} = require('./clientreloadcontroller');
const REVISION = 'b'.repeat(40), SESSION = 'a'.repeat(40);
let root, fixtures, httpServer;
beforeEach(() => {root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-client-resume-')); fixtures = [];});
afterEach(async () => {
    if (httpServer) {httpServer.closeAllConnections(); await new Promise(resolve => httpServer.close(resolve)); httpServer = null;}
    for (const fixture of fixtures) {fixture.controller.unfreeze(fixture.player); fixture.server.cache.close();}
    jest.useRealTimers(); fs.rmSync(root, {recursive: true, force: true});
});
function fixture() {
    let now = Date.now();
    const cache = new NodeCache({checkperiod: 0});
    const world = {players: {}, consumeCooldowns: {avatar: {potion: now + 30000}}, combat: {fieldAttacks: {attacks: new Map()}}};
    world.getPlayerById = id => world.players[id];
    const server = {cache, worldsMap: {main: world}};
    const emit = jest.fn();
    const equipment = {syncExperience: jest.fn().mockResolvedValue(), accumulatedExperience: 0};
    const player = {id: 7, sessionId: SESSION, hasEnteredGame: true, walletId: 'wallet', nftId: 'avatar', mapId: 'main',
        x: 12, y: 23, hitPoints: 41, isDead: false, invincible: false, orientation: 2, attackers: {},
        lastCheckpoint: {id: 8}, accumulatedExperience: 0, syncExperience: jest.fn().mockResolvedValue(),
        getNFTWeapon: () => equipment, server: world, isBot: () => false, connection: {_connection: {emit}}};
    world.players[player.id] = player;
    const gameData = {items: {potion: 3}, quests: {quest: {status: 'active'}}, consumables: {}};
    cache.set(SESSION, {entityId: 7, mapId: 'main', walletId: 'wallet', nftId: 'avatar', xp: 150, checkpointId: 1, isDirty: true, gameData});
    const flush = jest.fn().mockResolvedValue();
    const options = {file: path.join(root, 'reloads-' + fixtures.length + '.json'), now: () => now};
    const controller = new ClientReloadController(server, flush, options);
    const result = {player, equipment, server, world, controller, emit, flush, options, advance: ms => {now += ms;}};
    fixtures.push(result); return result;
}

test('tickets contain server-authored position, health, quests and absolute buff/cooldown expiries', async () => {
    const f = fixture();
    f.player.consumableBuff = {buff: {stat: 'atk', percent: 15}, expireTime: Date.now() + 60000,
        buffTimeout: setTimeout(() => {}, 60000)};
    // Real Node timers are circular objects and must never enter the snapshot.
    try {
        const id = await f.controller.ticket(f.player, REVISION);
        expect(id).toMatch(/^[a-f0-9]{40}$/);
        const session = f.server.cache.get(id);
        expect(session).toMatchObject({x: 12, y: 23, checkpointId: 8, isDirty: false, xp: 150,
            gameData: {items: {potion: 3}}, resumeState: {revision: REVISION, hp: 41, dead: false, orientation: 2,
                consumableBuff: {buff: {stat: 'atk', percent: 15}, expireTime: f.player.consumableBuff.expireTime},
                cooldowns: f.world.consumeCooldowns.avatar}});
        expect(session.entityId).toBeUndefined();
        expect(session.resumeState.consumableBuff.buffTimeout).toBeUndefined();
        expect(f.player.invincible).toBe(true);
        expect(f.player.syncExperience).toHaveBeenCalled(); expect(f.equipment.syncExperience).toHaveBeenCalled();
        expect(f.flush).toHaveBeenCalled();
        expect(fs.statSync(f.options.file).mode & 0o777).toBe(0o600);
    } finally {clearTimeout(f.player.consumableBuff.buffTimeout);}
});

test('reload tickets carry loot tables and fixed loot overrides without timer objects',async()=>{
    const f=fixture();
    f.player.dropTableOverride={mob:2,drops:{wood:25,ore:50},expiresAt:Date.now()+30000};
    f.player.dropOverride=333;f.player.dropOverrideExpiresAt=Date.now()+10000;
    const id=await f.controller.ticket(f.player,REVISION),state=f.server.cache.get(id).resumeState;
    expect(state.dropTableOverride).toEqual(f.player.dropTableOverride);
    expect(state.dropOverride).toEqual({item:333,expiresAt:f.player.dropOverrideExpiresAt});
    expect(state.dropTableOverrideTimeout).toBeUndefined();
});

test('only one socket can claim a ticket; consumption is durable before the player can act', async () => {
    const f = fixture(), id = await f.controller.ticket(f.player, REVISION);
    expect(f.controller.claim(id, 10).hp).toBe(41);
    expect(() => f.controller.claim(id, 11)).toThrow('no longer valid');
    f.controller.complete({sessionId: id, id: 10});
    expect(f.server.cache.get(id).resumeState).toBeUndefined();
    expect(JSON.parse(fs.readFileSync(f.options.file))).toEqual([]);
    const recovered = new ClientReloadController({cache: new NodeCache({checkperiod: 0})}, f.flush, f.options);
    expect(recovered.records.size).toBe(0); recovered.server.cache.close();
});

test('a failed pre-entry connection can retry but expired tickets cannot be reused', async () => {
    const f = fixture(), id = await f.controller.ticket(f.player, REVISION);
    f.controller.claim(id, 10);
    f.controller.disconnected({sessionId: id, id: 10, hasEnteredGame: false});
    expect(f.controller.claim(id, 11)).toMatchObject({hp: 41});
    f.advance(180001);
    expect(() => f.controller.claim(id, 11)).toThrow('no longer valid');
    expect(f.controller.data(f.server.cache.get(id))).toBeNull();
});

test('a transport connection closing before HELLO has no session and cannot crash the server', () => {
    const f = fixture();
    expect(() => f.controller.disconnected({hasEnteredGame: false})).not.toThrow();
    expect(f.controller.player(undefined)).toBeNull();
    expect(f.controller.player('')).toBeNull();
});

test('a fresh wallet login revokes older reload tickets durably so they cannot return after reboot', async () => {
    const f = fixture(), id = await f.controller.ticket(f.player, REVISION);
    f.controller.revokeWallet('another-wallet'); expect(f.controller.records.has(id)).toBe(true);
    const persist = f.controller.persist.bind(f.controller);
    f.controller.persist = () => {throw new Error('disk full');};
    expect(() => f.controller.revokeWallet('WALLET')).toThrow('disk full');
    expect(f.server.cache.get(id)).toBeDefined(); expect(f.controller.records.has(id)).toBe(true);
    f.controller.persist = persist; f.controller.revokeWallet('WALLET');
    expect(f.server.cache.get(id)).toBeUndefined();
    const cache = new NodeCache({checkperiod: 0});
    const recovered = new ClientReloadController({cache}, f.flush, f.options);
    expect(recovered.records.has(id)).toBe(false); cache.close();
});

test('reboot handoffs survive a fresh server/cache and use current backend data for paid avatars', async () => {
    const f = fixture();
    expect(await f.controller.reboot(REVISION)).toBe(1);
    const [event, packet] = f.emit.mock.calls[0];
    expect(event).toBe('server-reboot'); expect(packet.revision).toBe(REVISION);
    const cache = new NodeCache({checkperiod: 0});
    const recovered = new ClientReloadController({cache}, f.flush, f.options);
    expect(cache.get(packet.sessionId)).toMatchObject({x: 12, y: 23, resumeState: {hp: 41, reboot: true}});
    expect(recovered.data(cache.get(packet.sessionId))).toBeNull();
    expect(recovered.data({...cache.get(packet.sessionId), f2p: true})).toEqual(f.server.cache.get(SESSION).gameData);
    recovered.claim(packet.sessionId, 9); recovered.complete({sessionId: packet.sessionId, id: 9});
    expect(JSON.parse(fs.readFileSync(f.options.file))).toEqual([]); cache.close();
});

test('client-only reloads retain the live inventory and quest state', async () => {
    const f = fixture(), id = await f.controller.ticket(f.player, REVISION);
    expect(f.controller.data(f.server.cache.get(id))).toEqual(f.server.cache.get(SESSION).gameData);
    expect(f.controller.data({})).toBeNull();
});

test.each(['avatar XP', 'equipment XP', 'inventory save', 'disk save', 'session disappeared', 'in-flight request', 'in-flight message'])('failed %s leaves no ticket and restores normal play', async reason => {
    const f = fixture();
    if (reason === 'avatar XP') f.player.accumulatedExperience = 12;
    if (reason === 'equipment XP') f.equipment.accumulatedExperience = 12;
    if (reason === 'inventory save') f.flush.mockRejectedValue(new Error('offline'));
    if (reason === 'disk save') f.controller.persist = () => {throw new Error('disk full');};
    if (reason === 'session disappeared') f.flush.mockImplementation(async () => f.server.cache.del(SESSION));
    if (reason === 'in-flight request') f.controller.requests.set(SESSION, 1);
    if (reason === 'in-flight message') f.player.pendingMessages = 1;
    await expect(f.controller.ticket(f.player, REVISION)).rejects.toThrow();
    expect(f.player.invincible).toBe(false); expect(f.player.clientReloadPending).toBeFalsy();
    expect(f.controller.records.size).toBe(0);
});

test('freezing is bounded even if a backend write hangs and a late response cannot publish a ticket', async () => {
    jest.useFakeTimers(); const f = fixture(); let finish;
    f.flush.mockReturnValue(new Promise(resolve => {finish = resolve;}));
    const ticket = f.controller.ticket(f.player, REVISION);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    jest.advanceTimersByTime(10001);
    expect(f.player.invincible).toBe(false);
    finish(); await expect(ticket).rejects.toThrow('timed out');
    expect(f.controller.records.size).toBe(0);
});

test('a client that never navigates loses its ticket and temporary invincibility after five seconds', async () => {
    jest.useFakeTimers(); const f = fixture();
    const id = await f.controller.ticket(f.player, REVISION);
    await expect(f.controller.ticket(f.player, REVISION)).rejects.toThrow('already pending');
    jest.advanceTimersByTime(5001);
    expect(f.player.invincible).toBe(false); expect(f.server.cache.get(id)).toBeUndefined();
    await expect(f.controller.ticket(f.player, REVISION)).rejects.toThrow('cooling down');
    f.advance(30001);
    await expect(f.controller.ticket(f.player, REVISION)).resolves.toMatch(/^[a-f0-9]{40}$/);
});

test('a failed reload cannot restore invincibility whose original deadline passed during the freeze', async () => {
    const f = fixture();
    f.player.invincible = true; f.player.invincibilityExpiresAt = Date.now() + 1000;
    const id = await f.controller.ticket(f.player, REVISION);
    f.advance(2000); f.controller.unfreeze(f.player);
    expect(f.player.invincible).toBe(false);
    expect(f.server.cache.get(id).resumeState.invincibilityExpiresAt).toBe(f.player.invincibilityExpiresAt);
});

test('failure to commit ticket consumption keeps it available for retry', async () => {
    const f = fixture(), id = await f.controller.ticket(f.player, REVISION);
    f.controller.claim(id, 10); const persist = f.controller.persist.bind(f.controller);
    f.controller.persist = () => {throw new Error('disk full');};
    expect(() => f.controller.complete({sessionId: id, id: 10})).toThrow('disk full');
    expect(f.controller.records.has(id)).toBe(true);
    expect(f.server.cache.get(id).resumeState.claim).toBe(10);
    f.controller.persist = persist; f.controller.complete({sessionId: id, id: 10});
    expect(f.controller.records.size).toBe(0);
});

test('combat delays a client reload without blocking updates for players elsewhere in the world', () => {
    const f = fixture();
    expect(f.controller.busy(f.player)).toBeFalsy();
    f.world.combat.fieldAttacks.attacks.set(1, {encounter: {player: {}}, lane: [{x: 90, y: 90}]});
    expect(f.controller.busy(f.player)).toBeFalsy();
    f.world.combat.fieldAttacks.attacks.get(1).lane.push({x: f.player.x, y: f.player.y});
    expect(f.controller.busy(f.player)).toBe(true);
    f.world.combat.fieldAttacks.attacks.clear(); f.player.target = 12;
    expect(f.controller.busy(f.player)).toBe(true);
    f.player.target = null; f.player.attackers.mob = {};
    expect(f.controller.busy(f.player)).toBe(true);
});

test('a failed reboot preparation releases every issued ticket and flushes writes even without online humans', async () => {
    const f = fixture();
    f.flush.mockResolvedValueOnce().mockRejectedValueOnce(new Error('offline'));
    await expect(f.controller.reboot(REVISION)).rejects.toThrow('offline');
    expect(f.controller.rebooting).toBe(false); expect(f.player.invincible).toBe(false);
    expect(f.emit).not.toHaveBeenCalled(); expect(f.controller.records.size).toBe(0);
    delete f.world.players[7]; f.flush.mockResolvedValue();
    expect(await f.controller.reboot(REVISION)).toBe(0); expect(f.flush).toHaveBeenCalledTimes(3);
    f.controller.cancelReboot();
});

test('cancelling a reboot during a slow save cannot later freeze clients or emit handoffs', async () => {
    const f = fixture(); let finish;
    f.flush.mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
    const reboot = f.controller.reboot(REVISION);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    f.controller.cancelReboot(); finish();
    await expect(reboot).rejects.toThrow('cancelled');
    expect(f.player.invincible).toBe(false); expect(f.controller.records.size).toBe(0);
    expect(f.emit).not.toHaveBeenCalled();
});

test('HTTP reloads require an active human session, the current client revision and a quiet player', async () => {
    const f = fixture(), app = express(); app.use(express.json());
    f.controller.attach(app, {current: {revision: REVISION}});
    app.get('/session/:sessionId/poll', (req, res) => res.json({ok: true}));
    httpServer = app.listen(0, '127.0.0.1'); await once(httpServer, 'listening');
    const base = 'http://127.0.0.1:' + httpServer.address().port;
    const post = (id, revision) => fetch(base + '/session/' + id + '/client-reload', {method: 'POST',
        headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision})});
    expect((await post('missing', REVISION)).status).toBe(401);
    expect((await post(SESSION, 'c'.repeat(40))).status).toBe(409);
    f.player.isDead = true; expect((await post(SESSION, REVISION)).status).toBe(409); f.player.isDead = false;
    expect((await fetch(base + '/session/' + SESSION + '/poll')).status).toBe(200);
    expect(f.controller.requests.size).toBe(0);
    const response = await post(SESSION, REVISION); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({revision: REVISION, sessionId: expect.stringMatching(/^[a-f0-9]{40}$/)});
    expect((await fetch(base + '/session/' + SESSION + '/poll')).status).toBe(409);
    f.controller.rebooting = true;
    expect((await fetch(base + '/session/' + SESSION + '/poll')).status).toBe(503);
    expect((await post(SESSION, REVISION)).status).toBe(503);
});

test('restoring a player preserves HP and the remaining durations instead of refilling or extending them', () => {
    jest.useFakeTimers(); let methods; global.Types = {};
    const Types = require('../../shared/js/gametypes');
    const Messages = {Buffinfo: function(...args) {this.serialize = () => args;}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./player'), 'utf8'), {
        module: {exports: {}}, process: {env: {}}, console, Date, setTimeout, clearTimeout,
        Character: {extend: value => {methods = value; return function() {}; }},
        require: name => name === './message' ? Messages : name === '../../shared/js/gametypes' ? Types :
            name === './looperlandsplatformclient.js' ? {LooperLandsPlatformClient: function() {}} : {},
    });
    const player = {hitPoints: 100, maxHitPoints: 100, nftId: 'avatar', armor: 1,
        server: {consumeCooldowns: {avatar: {potion: Date.now() + 90000}}},
        applyConsumableBuff: jest.fn(), removeConsumableBuff: jest.fn(), send: jest.fn(), broadcast: jest.fn(), equip: value => value};
    methods.restoreClientState.call(player, {orientation: 2, hp: 41,
        consumableBuff: {buff: {stat: 'atk', percent: 15}, expireTime: Date.now() + 10000},
        invincibilityExpiresAt: Date.now() + 5000, cooldowns: {potion: Date.now() + 10000, food: Date.now() + 20000, old: Date.now() - 1}});
    expect(player.hitPoints).toBe(41); expect(player.invincible).toBe(true);
    expect(player.server.consumeCooldowns.avatar).toEqual({potion: Date.now() + 90000, food: Date.now() + 20000});
    jest.advanceTimersByTime(5000); expect(player.invincible).toBe(false);
    expect(player.removeConsumableBuff).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000); expect(player.removeConsumableBuff).toHaveBeenCalledTimes(1);
    expect(player.consumableBuff).toEqual({});
});

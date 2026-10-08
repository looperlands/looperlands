const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');

function createServer() {
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./worldserver'), 'utf8'), {
        module,
        require: name => {
            if (name === './lib/class') return {Class: {extend: methods => methods}};
            if (name === 'underscore') return _;
            if (name === './flows/worldeventbroker.js') return {WorldEventBroker: function () {}};
            if (name === './message') return {Population: function (mapCount, totalCount) {
                this.mapCount = mapCount;
                this.totalCount = totalCount;
            }};
            return {};
        },
    });
    const sessions = new Map();
    const server = {worldsMap: {}, cache: {del: id => sessions.delete(id)}};
    for (const map of ['main', 'dungeon']) {
        const world = Object.create(module.exports);
        world.init('world_' + map, 100, server);
        world.addEntity = jest.fn();
        world.removeEntity = jest.fn();
        world.pushBroadcast = jest.fn();
        server.worldsMap[map] = world;
    }
    let nextId = 0;
    function join(map, walletId, bot = false) {
        const world = server.worldsMap[map];
        const player = {
            id: ++nextId, sessionId: 'session-' + nextId, walletId,
            isBot: () => bot, broadcast: jest.fn(), despawn: () => [],
            playerEventBroker: {destroy: jest.fn()}, connection: {},
        };
        player.connection.close = jest.fn(() => {
            world.removePlayer(player);
            if (!bot) world.decrementPlayerCount();
            world.updatePopulation();
        });
        sessions.set(player.sessionId, {mapId: map, entityId: player.id});
        world.addPlayer(player);
        if (!bot) world.incrementPlayerCount();
        world.updatePopulation();
        return player;
    }
    return {server, sessions, join};
}

test('map switching retires the old player, session, queue and population before joining', () => {
    const {server, sessions, join} = createServer();
    const oldPlayer = join('main', '0xABC');
    const newPlayer = join('dungeon', '0xabc');
    expect(oldPlayer.connection.close).toHaveBeenCalledTimes(1);
    expect(oldPlayer.playerEventBroker.destroy).toHaveBeenCalledTimes(1);
    expect(sessions.has(oldPlayer.sessionId)).toBe(false);
    expect(sessions.has(newPlayer.sessionId)).toBe(true);
    expect(server.worldsMap.main.players).toEqual({});
    expect(server.worldsMap.main.outgoingQueues).toEqual({});
    expect(server.worldsMap.dungeon.players[newPlayer.id]).toBe(newPlayer);
    expect(server.worldsMap.main.pushBroadcast).toHaveBeenLastCalledWith({mapCount: 0, totalCount: 1});
    expect(server.worldsMap.dungeon.pushBroadcast).toHaveBeenLastCalledWith({mapCount: 1, totalCount: 1});
});

test('the active players endpoint reports only the destination map after a switch', async () => {
    const {server, sessions, join} = createServer();
    join('main', 'wallet');
    const latest = join('dungeon', 'wallet');
    for (const session of sessions.values()) Object.assign(session, {isDirty: true, nftId: 'avatar', xp: 100});
    server.socialChat = {identity: () => ({id: 'public-id', label: 'Player', walletShort: 'wallet'})};
    const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
    const start = source.indexOf('        app.get("/players",');
    const end = source.indexOf('        app.get("/session/:sessionId/requestTeleport', start);
    let handler;
    vm.runInNewContext(source.slice(start, end), {
        app: {get: (route, middleware, callback) => {handler = callback;}},
        cors: () => {}, corsOptions: {}, self: server,
        cache: {keys: () => [...sessions.keys()], get: id => sessions.get(id)},
    });
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    await handler({}, res);
    expect(res.json).toHaveBeenCalledWith([{
        id: 'public-id', name: 'Player', wallet: 'wallet', avatar: 'avatar', mapId: 'dungeon', xp: 100,
    }]);
    expect(server.worldsMap.dungeon.players[latest.id]).toBe(latest);
});

test('repeated switches and same-map reconnects leave one active session', () => {
    const {server, sessions, join} = createServer();
    join('main', 'wallet');
    join('dungeon', 'wallet');
    join('main', 'wallet');
    const latest = join('main', 'wallet');
    expect([...sessions.keys()]).toEqual([latest.sessionId]);
    expect(Object.keys(server.worldsMap.main.players)).toEqual([String(latest.id)]);
    expect(server.worldsMap.dungeon.players).toEqual({});
    expect(server.worldsMap.main.playerCount).toBe(1);
    expect(server.worldsMap.dungeon.playerCount).toBe(0);
});

test('other wallets and bots keep their connections during the handoff', () => {
    const {join, sessions} = createServer();
    const other = join('main', 'other-wallet');
    const bot = join('main', 'wallet', true);
    join('dungeon', 'wallet');
    expect(other.connection.close).not.toHaveBeenCalled();
    expect(bot.connection.close).not.toHaveBeenCalled();
    expect(sessions.size).toBe(3);
});

test('a bot joining does not retire the wallet owner', () => {
    const {join} = createServer();
    const player = join('main', 'wallet');
    join('dungeon', 'wallet', true);
    expect(player.connection.close).not.toHaveBeenCalled();
});

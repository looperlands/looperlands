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
    const server = {worldsMap: {}, cache: {get: id => sessions.get(id), del: id => sessions.delete(id)}};
    for (const map of ['main', 'dungeon']) {
        const world = Object.create(module.exports);
        world.init('world_' + map, 100, server);
        world.addEntity = jest.fn(player => {world.entities[player.id] = player;});
        world.removeEntity = jest.fn(world.removeEntity.bind(world));
        world.removeFromGroups = jest.fn();
        world.pushBroadcast = jest.fn();
        server.worldsMap[map] = world;
    }
    let nextId = 0;
    function join(map, walletId, bot = false, owner) {
        const world = server.worldsMap[map];
        const player = {
            id: ++nextId, sessionId: 'session-' + nextId, walletId, type: 'player',
            hasEnteredGame: false, destroy: jest.fn(),
            isBot: () => bot, broadcast: jest.fn(), despawn: () => [],
            playerEventBroker: {destroy: jest.fn()}, connection: {},
        };
        player.connection.close = jest.fn(() => {
            if (!world.players[player.id]) return;
            world.removePlayer(player);
            if (!bot) world.decrementPlayerCount();
            world.updatePopulation();
        });
        sessions.set(player.sessionId, {mapId: map, entityId: player.id, owner: owner?.id});
        if (world.addPlayer(player) === false) return player;
        player.hasEnteredGame = true;
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

test('another wallet and its companion keep their connections during the handoff', () => {
    const {join, sessions} = createServer();
    const other = join('main', 'other-wallet');
    const bot = join('main', 'other-wallet', true, other);
    join('dungeon', 'wallet');
    expect(other.connection.close).not.toHaveBeenCalled();
    expect(bot.connection.close).not.toHaveBeenCalled();
    expect(sessions.size).toBe(3);
});

test('a bot joining does not retire the wallet owner', () => {
    const {join} = createServer();
    const player = join('main', 'wallet');
    const bot = join('main', 'wallet', true, player);
    expect(player.connection.close).not.toHaveBeenCalled();
    expect(bot.connection.close).not.toHaveBeenCalled();
});

test.each(['disconnect', 'map switch', 'reconnect', 'death'])(
    'owner %s removes its companion without relying on despawn delivery', reason => {
        const {join, server, sessions} = createServer();
        const owner = join('main', 'wallet');
        const bot = join('main', 'WALLET', true, owner);
        const world = server.worldsMap.main;
        // No network messages are delivered by this harness. Ownership survives
        // session eviction too, as can happen before a reconnect closes the socket.
        sessions.delete(owner.sessionId);
        if (reason === 'disconnect') owner.connection.close();
        if (reason === 'map switch') join('dungeon', 'wallet');
        if (reason === 'reconnect') join('main', 'wallet');
        if (reason === 'death') world.removeEntity(owner);
        expect(bot.connection.close).toHaveBeenCalledTimes(1);
        expect(world.players[bot.id]).toBeUndefined();
        expect(world.entities[bot.id]).toBeUndefined();
        expect(world.outgoingQueues[bot.id]).toBeUndefined();
        expect(sessions.has(bot.sessionId)).toBe(false);
        expect(bot.destroy).toHaveBeenCalledTimes(1);
        expect(world.playerCount).toBe(reason === 'disconnect' || reason === 'map switch' ? 0 : 1);
    }
);

test('disconnecting a companion keeps its owner and another companion connected', () => {
    const {join, server} = createServer();
    const owner = join('main', 'wallet');
    const other = join('main', 'other-wallet');
    const bot = join('main', 'wallet', true, owner);
    const otherBot = join('main', 'other-wallet', true, other);
    bot.connection.close();
    expect(owner.connection.close).not.toHaveBeenCalled();
    expect(otherBot.connection.close).not.toHaveBeenCalled();
    expect(server.worldsMap.main.playerCount).toBe(2);
});

test.each(['left', 'changed map', 'reconnected', 'dead', 'not entered', 'different wallet', 'bot', 'missing owner'])(
    'a companion finishing its join is rejected when its owner is %s', reason => {
        const {join, server, sessions} = createServer();
        const owner = join('main', 'wallet');
        if (reason === 'left') owner.connection.close();
        if (reason === 'changed map') join('dungeon', 'wallet');
        if (reason === 'reconnected') join('main', 'wallet');
        if (reason === 'dead') owner.isDead = true;
        if (reason === 'not entered') owner.hasEnteredGame = false;
        if (reason === 'different wallet') owner.walletId = 'other-wallet';
        if (reason === 'bot') owner.isBot = () => true;
        const bot = join('main', 'wallet', true, reason === 'missing owner' ? undefined : owner);
        expect(bot.connection.close).toHaveBeenCalledWith('Companion owner is no longer in this world');
        expect(bot.hasEnteredGame).toBe(false);
        expect(server.worldsMap.main.players[bot.id]).toBeUndefined();
        expect(sessions.has(bot.sessionId)).toBe(false);
    }
);

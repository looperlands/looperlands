const fs = require('fs');
const vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');

const [companionId, companionKind] = Object.entries(Types.Entities)
    .find(([id, kind]) => id.startsWith('NFT_') && Types.isBot(kind));

function setup() {
    const sessions = new Map();
    const cache = {
        get: id => sessions.get(id),
        set: (id, data) => sessions.set(id, structuredClone(data)),
        del: id => sessions.delete(id),
        keys: () => [...sessions.keys()]
    };
    const gameData = {items: {gold: 42}, quests: {}, mobKills: {}, choices: {}};
    const dao = {
        walletHasNFT: jest.fn().mockResolvedValue(true),
        loadAvatarGameData: jest.fn().mockResolvedValue(gameData),
        saveAvatarMapAndCheckpoint: jest.fn()
    };
    const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
    let createSession;
    vm.runInNewContext(source.slice(
        source.indexOf('        async function newSession('),
        source.indexOf("        app.post('/session/:sessionId/teleport'")
    ), {
        app: {post: (path, handler) => {createSession = handler;}},
        cache, dao, Types, crypto: require('crypto'),
        process: {env: {LOOPWORMS_API_KEY: 'test-key'}}, console: {error: jest.fn()}
    });

    const body = {
        nftId: companionId.replace('NFT_', '0x'), mapId: 'main', xp: 10,
        walletId: 'wallet', owner: 'owner', x: 12, y: 20, name: 'Companion', bot: true
    };
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn()};
    const create = () => createSession({body, headers: {'x-api-key': 'test-key'}}, res);
    return {sessions, cache, dao, gameData, body, res, create};
}

function connectCompanion(cache, sessionId) {
    const worldModule = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./worldserver'), 'utf8'), {
        module: worldModule,
        require: name => {
            if (name === './lib/class') return {Class: {extend: methods => methods}};
            return {};
        }
    });
    const owner = {id: 'owner', walletId: 'wallet', hasEnteredGame: true, isBot: () => false};
    const world = Object.assign(Object.create(worldModule.exports), {
        id: 'world_main', players: {owner}, entities: {owner}, outgoingQueues: {},
        server: {cache}, addEntity: jest.fn(), enter_callback: jest.fn()
    });
    world.server.worldsMap = {main: world};

    const playerModule = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./player'), 'utf8'), {
        module: playerModule, process: {env: {}}, performance: {now: () => 1000},
        Character: {extend: methods => methods}, FormatChecker: function () {},
        require: name => {
            switch (name) {
                case '../../shared/js/gametypes': return Types;
                case './format': return {check: () => true};
                case './utils': return {randomOrientation: () => 1};
                case './formulas': return {level: () => 1};
                case './socialchat': return {gameplayNameFromSession: data => data.name};
                case './dao.js': return {saveAvatarMapAndCheckpoint: jest.fn()};
                case './looperlandsplatformclient.js': return {LooperLandsPlatformClient: function () {}};
                case './playerclassmodifiers.js': return {PlayerClassModifiers: function () {}};
                case './quests/playereventbroker.js': return {PlayerEventBroker: function () {
                    this.setPlayer = jest.fn(); this.spawnEvent = jest.fn();
                }};
                default: return {};
            }
        }
    });
    const player = playerModule.exports;
    const connection = {id: 'companion', listen: jest.fn(), onClose: jest.fn(), close: jest.fn(), sendUTF8: jest.fn()};
    player._super = () => {player.id = connection.id;};
    player.init(connection, world);
    Object.assign(player, {
        resetTimeout: jest.fn(), equipArmor: jest.fn(), equipWeapon: jest.fn(),
        setPosition: (x, y) => Object.assign(player, {x, y}),
        updateHitPoints: jest.fn(), send: jest.fn(), startFlowPolling: jest.fn().mockResolvedValue()
    });
    return {
        player, connection, world,
        hello: () => connection.listen.mock.calls[0][0]([
            Types.Messages.HELLO, 'Companion', companionKind, Types.Entities.TRANSPARENT_WEAPON, sessionId
        ])
    };
}

test('a companion can join directly after POST /session without the browser session-loading request', async () => {
    const {create, res, cache, dao, gameData, body} = setup();
    await create();
    const {sessionId} = res.send.mock.calls[0][0];
    const companion = connectCompanion(cache, sessionId);
    await companion.hello();
    expect(companion.connection.close).not.toHaveBeenCalled();
    expect(companion.player.hasEnteredGame).toBe(true);
    expect(companion.player.companionOwnerId).toBe('owner');
    expect(companion.player.send).toHaveBeenCalledWith(expect.arrayContaining([Types.Messages.WELCOME, 'companion']));
    expect(dao.loadAvatarGameData).toHaveBeenCalledWith(body.nftId);
    expect(cache.get(sessionId).gameData).toEqual(gameData);
});

test('companion sessions load platform data even if a caller supplies its own game data', async () => {
    const {create, res, cache, gameData, body} = setup();
    body.gameData = {items: {gold: 999}};
    await create();
    const {sessionId} = res.send.mock.calls[0][0];
    expect(cache.get(sessionId).gameData).toEqual(gameData);
});

test.each(['reject', 'undefined'])('companion data failure %s returns 503 without creating a session and can be retried', async failure => {
    const {create, res, sessions, dao} = setup();
    if (failure === 'reject') dao.loadAvatarGameData.mockRejectedValueOnce(new Error('platform unavailable'));
    else dao.loadAvatarGameData.mockResolvedValueOnce(undefined);
    await create();
    expect(res.status).toHaveBeenLastCalledWith(503);
    expect(res.send).not.toHaveBeenCalled();
    expect(sessions.size).toBe(0);
    await create();
    expect(res.status).toHaveBeenLastCalledWith(200);
    expect(sessions.size).toBe(1);
});

test('an ordinary avatar still loads data through the browser login flow', async () => {
    const {create, res, body, dao, cache} = setup();
    body.nftId = '0xavatar';
    // The bot flag alone must not change how an avatar session is initialized.
    await create();
    expect(dao.loadAvatarGameData).not.toHaveBeenCalled();
    const {sessionId} = res.send.mock.calls[0][0];
    expect(cache.get(sessionId).gameData).toBeUndefined();
});

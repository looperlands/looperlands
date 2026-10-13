const fs = require('fs'), vm = require('vm'), _ = require('underscore');
global.Types = {};
const Types = require('../../shared/js/gametypes');
const Collectables = require('./collectables');
const Properties = require('./properties');
const {PlayerClassModifiers} = require('./playerclassmodifiers');
const {getConsumableEffects} = require('./consumableeffects');
const source = fs.readFileSync(require.resolve('./ws'), 'utf8');

function routes(consumed = true) {
    const handlers = new Map();
    const data = {mapId: 'main', entityId: 1, nftId: 'avatar', walletId: 'local',
        gameData: {items: {[Types.Entities.M88NTACO]: 2}}};
    const player = {nftId: 'avatar', hasEnteredGame: true, getBot: () => undefined,
        playerClassModifiers: new PlayerClassModifiers({getLooperModifierData: async () => ({xp: 1})}, 'avatar', 'fighter'),
        consumeItem(item) {if (consumed) Collectables.consume(item, this); return consumed;}};
    const world = {getPlayerById: () => player, getConsumeGroupCooldown: () => 121000,
        consumeCooldowns: {avatar: {xpPotions: 121000}}};
    const worlds = {main: world};
    const inventoryStart = source.indexOf('        app.get("/session/:sessionId/inventory"');
    const inventoryEnd = source.indexOf('        app.get("/session/:sessionId/quests"', inventoryStart);
    const consumeStart = source.indexOf('        app.get("/session/:sessionId/consumeItem/');
    const consumeEnd = source.indexOf('        // MINIGAME CONTROLLER', consumeStart);
    vm.runInNewContext(source.slice(inventoryStart, inventoryEnd) + source.slice(consumeStart, consumeEnd), {
        app: {get: (url, handler) => handlers.set(url, handler)},
        self: {worldsMap: worlds}, cache: {get: () => structuredClone(data)},
        dao: {getInventory: async () => ({})}, _, Types, Collectables, Properties, getConsumableEffects
    });
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn()};
    return {player, world, worlds, res, consume: () => handlers.get('/session/:sessionId/consumeItem/:item')({
        params: {sessionId: 'local', item: String(Types.Entities.M88NTACO)}}, res),
    inventory: () => handlers.get('/session/:sessionId/inventory')({params: {sessionId: 'local'}}, res)};
}
beforeEach(() => {jest.useFakeTimers(); jest.setSystemTime(1000);});
afterEach(() => jest.useRealTimers());

test('the consumption API returns the actual taco effect independently of the shared cooldown', async () => {
    const s = routes();
    await s.consume();
    expect(s.res.send).toHaveBeenCalledWith(expect.objectContaining({consumed: true, cooldown: 121000,
        effectsUpdatedAt: 1000, effects: [{id: 'xp', label: '2x XP', expiresAt: 61000}]}));
    await s.inventory();
    expect(s.res.json).toHaveBeenCalledWith(expect.objectContaining({effectsUpdatedAt: 1000,
        effects: [{id: 'xp', label: '2x XP', expiresAt: 61000}]}));
    jest.advanceTimersByTime(60000);
    await s.inventory();
    expect(s.res.json).toHaveBeenLastCalledWith(expect.objectContaining({effects: [], effectsUpdatedAt: 61000}));
});

test('a refused consumption does not invent an effect', async () => {
    const s = routes(false);
    await s.consume();
    expect(s.res.send).toHaveBeenCalledWith(expect.objectContaining({consumed: false, effects: []}));
});

test('an inventory request before a player joins returns an empty effect snapshot', async () => {
    const s = routes();
    s.world.getPlayerById = () => undefined;
    await s.inventory();
    expect(s.res.json).toHaveBeenCalledWith(expect.objectContaining({effects: [], effectsUpdatedAt: 1000}));
});

test.each(['missing player', 'handshake pending', 'missing world'])('%s refuses consumption without throwing', async reason => {
    const s = routes();
    const consume = jest.spyOn(s.player, 'consumeItem');
    if (reason === 'handshake pending') s.player.hasEnteredGame = false;
    else if (reason === 'missing player') s.world.getPlayerById = () => undefined;
    else delete s.worlds.main;
    await expect(s.consume()).resolves.toBeUndefined();
    expect(s.res.status).toHaveBeenCalledWith(409);
    expect(s.res.json).toHaveBeenCalledWith({consumed: false, error: 'Player is not connected'});
    expect(consume).not.toHaveBeenCalled();
});

global.Types = {};
const HalloweenShopController = require('./halloweenshopcontroller');
const definition = require('../world-definitions/halloween-shop');
const Types = require('../../shared/js/gametypes');
const Properties = require('./properties');
const InventoryExchanges = require('./inventoryexchanges');

function fixture() {
    const items = {[Types.Entities.GOLD]: 20, [Types.Entities.M88NPUMPKIN]: 3};
    const data = {mapId: 'main', entityId: 1, nftId: 'avatar', gameData: {items: {...items}}};
    const player = {x: 10, y: 10, hasEnteredGame: true, isDead: false, level: 1};
    const npc = {x: 12, y: 10, behaviorState: {key: 'halloween:witch'}};
    const sessions = new Map([['session', data], ['second-session', {...data, gameData: {items: {...items}}}]]);
    const cache = {get: id => sessions.get(id), set: (id, value) => sessions.set(id, value), keys: () => [...sessions.keys()]};
    const dao = {exchangeInventory: jest.fn(async () => ({quantities: {[Types.Entities.BOTTLED_MIDNIGHT]: 1}}))};
    const fieldGuide = {observe: jest.fn()};
    const inventoryExchanges = new InventoryExchanges(dao, cache);
    const controller = new HalloweenShopController(definition, {inventoryExchanges, cache, worlds: () => ({main: {getPlayerById: () => player, npcs: {1: npc}}}), fieldGuide});
    const req = {params: {sessionId: 'session', itemId: '1'}, query: {}};
    const response = () => ({status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn()});
    const res = response();
    return {controller, req, res, response, data, player, npc, dao, sessions, fieldGuide, buy: () => controller.buy(req, res)};
}

beforeEach(() => {jest.useFakeTimers().setSystemTime(new Date('2026-10-31T22:00:00Z'));});
afterEach(() => jest.useRealTimers());

test('the cauldron exposes exactly three registered recipes in season', () => {
    const f = fixture();
    expect(f.controller.inventory()).toHaveLength(3);
    for (const item of f.controller.inventory()) {
        expect(Types.isItem(item.item)).toBe(true);
        expect(Properties.isCollectable(item.item)).toBe(true);
    }
    expect(Properties.isConsumable(Types.Entities.BOTTLED_MIDNIGHT)).toBe(false);
    expect(Properties.graveyard_stew.consumeEffects).toEqual([{type: 'heal', amount: 75}]);
    expect(Properties.borrowed_courage.consumeEffects).toEqual([{type: 'modifier', stat: 'meleeDamageTaken', multiplier: 0.8, duration: 30000}]);
});

test('quantity multiplies every ingredient and output and syncs all sessions after confirmation', async () => {
    const f = fixture(); f.req.query.quantity = '3';
    await f.buy();
    expect(f.res.status).toHaveBeenCalledWith(200);
    expect(f.dao.exchangeInventory).toHaveBeenCalledWith({nftId: 'avatar', costs: [
        {item: String(Types.Entities.M88NPUMPKIN), amount: 3}, {item: String(Types.Entities.GOLD), amount: 15}],
    rewards: [{item: String(Types.Entities.BOTTLED_MIDNIGHT), amount: 3}]});
    expect(f.sessions.get('second-session').gameData.items[Types.Entities.BOTTLED_MIDNIGHT]).toBe(1);
    expect(f.fieldGuide.observe).toHaveBeenCalledWith(f.player, 'obtain', Types.Entities.BOTTLED_MIDNIGHT, 3);
});

test('an already-open shop cannot buy after the exclusive closing boundary', async () => {
    const f = fixture();
    jest.setSystemTime(new Date('2026-11-09T00:00:00Z'));
    expect(f.controller.inventory()).toEqual([]);
    await f.buy();
    expect(f.res.status).toHaveBeenCalledWith(410);
    expect(f.dao.exchangeInventory).not.toHaveBeenCalled();
});

test.each(['far', 'dead', 'other-map', 'unentered', 'wrong-npc'])('requires a living player beside the seasonal witch: %s', async mode => {
    const f = fixture();
    if (mode === 'far') f.player.x = 100;
    if (mode === 'dead') f.player.isDead = true;
    if (mode === 'other-map') f.data.mapId = 'm88n';
    if (mode === 'unentered') f.player.hasEnteredGame = false;
    if (mode === 'wrong-npc') f.npc.behaviorState.key = 'another-witch';
    await f.buy();
    expect(f.res.status).toHaveBeenCalledWith(403);
    expect(f.dao.exchangeInventory).not.toHaveBeenCalled();
});

test.each(['0', '-1', '100', '1.5', 'x', ['1', '2']])('rejects invalid quantity %j without side effects', async quantity => {
    const f = fixture(); f.req.query.quantity = quantity;
    await f.buy();
    expect(f.res.status).toHaveBeenCalledWith(400);
    expect(f.dao.exchangeInventory).not.toHaveBeenCalled();
});

test('concurrent purchases are rejected while a brew is awaiting persistence', async () => {
    const f = fixture(); let finish;
    f.dao.exchangeInventory.mockReturnValue(new Promise(resolve => {finish = resolve;}));
    const first = f.buy();
    const other = f.response(); await f.controller.buy(f.req, other);
    expect(other.status).toHaveBeenCalledWith(409);
    expect(f.dao.exchangeInventory).toHaveBeenCalledTimes(1);
    expect(f.data.gameData.items).toEqual({[Types.Entities.GOLD]: 15, [Types.Entities.M88NPUMPKIN]: 2});
    expect(f.sessions.get('second-session').gameData.items).toEqual(f.data.gameData.items);
    finish({quantities: {[Types.Entities.BOTTLED_MIDNIGHT]: 1}}); await first;
    expect(f.res.status).toHaveBeenCalledWith(200);
});

test('an uncertain result blocks later purchases for the avatar, including another session', async () => {
    const f = fixture();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    f.dao.exchangeInventory.mockRejectedValue(Object.assign(new Error('pending'), {exchangeUncertain: true}));
    await f.buy(); f.req.params.sessionId = 'second-session'; await f.buy();
    expect(f.dao.exchangeInventory).toHaveBeenCalledTimes(1);
    expect(f.data.gameData.items).toEqual({[Types.Entities.GOLD]: 15, [Types.Entities.M88NPUMPKIN]: 2});
    expect(f.fieldGuide.observe).not.toHaveBeenCalled();
    expect(f.res.status).toHaveBeenCalledWith(409);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
});

test('an insufficient ingredient result does not prevent another attempt', async () => {
    const f = fixture();
    f.dao.exchangeInventory.mockRejectedValueOnce(Object.assign(new Error('short'), {code: 'insufficient_items'}));
    await f.buy(); await f.buy();
    expect(f.res.status.mock.calls).toEqual([[400], [200]]);
});

test('a failed exchange releases its reservation without losing concurrent loot', async () => {
    const f = fixture(); let reject;
    f.dao.exchangeInventory.mockReturnValue(new Promise((resolve, failed) => {reject = failed;}));
    const buying = f.buy();
    f.data.gameData.items[Types.Entities.GOLD] += 7;
    reject(new Error('inventory offline')); await buying;
    expect(f.res.status).toHaveBeenCalledWith(503);
    expect(f.data.gameData.items).toEqual({[Types.Entities.GOLD]: 27, [Types.Entities.M88NPUMPKIN]: 3});
});

test('already reserved ingredients cannot be spent by another cauldron attempt', async () => {
    const f = fixture(); f.data.gameData.items[Types.Entities.GOLD] = 4;
    await f.buy();
    expect(f.res.status).toHaveBeenCalledWith(400);
    expect(f.dao.exchangeInventory).not.toHaveBeenCalled();
});

test('a failed field guide update cannot turn a confirmed purchase into a retry prompt', async () => {
    const f = fixture(), log = jest.spyOn(console, 'error').mockImplementation(() => {});
    f.fieldGuide.observe.mockImplementation(() => {throw new Error('telemetry offline');});
    await f.buy();
    expect(f.res.status).toHaveBeenCalledWith(200);
    expect(f.data.gameData.items[Types.Entities.BOTTLED_MIDNIGHT]).toBe(1);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
});

test('a failed exchange does not refund a reconnect that never had a reservation', async () => {
    const f = fixture(); let reject;
    f.dao.exchangeInventory.mockReturnValue(new Promise((resolve, failed) => {reject = failed;}));
    const buying = f.buy();
    f.sessions.delete('session');
    const reconnect = {...f.data, gameData: {items: {[Types.Entities.GOLD]: 20, [Types.Entities.M88NPUMPKIN]: 3}}};
    f.sessions.set('reconnect', reconnect);
    reject(new Error('inventory offline')); await buying;
    expect(f.res.status).toHaveBeenCalledWith(503);
    expect(reconnect.gameData.items).toEqual({[Types.Entities.GOLD]: 20, [Types.Entities.M88NPUMPKIN]: 3});
    expect(f.sessions.get('second-session').gameData.items).toEqual(reconnect.gameData.items);
});

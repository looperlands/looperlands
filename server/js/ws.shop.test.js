const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');
const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
const start = source.indexOf('        app.get("/session/:sessionId/shop/');
const end = source.indexOf('        app.get("/session/:sessionId/consumeItem', start);

function shop({balance = 100, quantity, level = 10, session = true, itemFound = true} = {}) {
    let handler;
    const data = {mapId: 'main', entityId: 1, nftId: 'avatar', gameData: {items: {gold: balance}}};
    const item = {id: 1, item: 'potion', price: {gold: 5}, amount: 2, minPlayerLevel: 3};
    const dao = {getShopInventory: jest.fn().mockResolvedValue(itemFound ? [item] : []), saveConsumable: jest.fn()};
    const cache = {get: () => session ? data : undefined, set: jest.fn()};
    vm.runInNewContext(source.slice(start, end), {
        app: {get: (url, callback) => { handler = callback; }}, cache, dao, _,
        self: {worldsMap: {main: {getPlayerById: () => ({level})}}},
        Types: {getKindFromString: key => key},
        Collectables: {getCollectItem: () => 'health', getCollectAmount: () => 10}
    });
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn()};
    return {data, dao, res, run: () => handler({params: {sessionId: 'session', shopId: 'potionshop', itemId: '1'}, query: {quantity}}, res)};
}

test('bulk purchase charges each resource and multiplies the supplied bundle', async () => {
    const s = shop({quantity: '3'}); await s.run();
    expect(s.res.status).toHaveBeenCalledWith(200);
    expect(s.data.gameData.items).toEqual({gold: 85, health: 60});
    expect(s.dao.saveConsumable.mock.calls).toEqual([['avatar', 'gold', -15], ['avatar', 'health', 60]]);
});
test('legacy purchases default to one bundle', async () => {
    const s = shop(); await s.run();
    expect(s.data.gameData.items).toEqual({gold: 95, health: 20});
});
test.each(['0', '-1', '1.5', '100', 'abc', '', ['2', '3']])('invalid quantity %j cannot change inventory', async quantity => {
    const s = shop({quantity}); await s.run();
    expect(s.res.status).toHaveBeenCalledWith(400);
    expect(s.dao.saveConsumable).not.toHaveBeenCalled();
});
test.each([{balance: 10, quantity: '3'}, {level: 1, quantity: '2'}])('unaffordable or level-locked purchases cannot change inventory: %j', async options => {
    const s = shop(options); await s.run();
    expect(s.res.status).toHaveBeenCalledWith(400);
    expect(s.dao.saveConsumable).not.toHaveBeenCalled();
});
test.each([{session: false}, {itemFound: false}])('missing session or item returns 404: %j', async options => {
    const s = shop(options); await s.run();
    expect(s.res.status).toHaveBeenCalledWith(404);
    expect(s.dao.saveConsumable).not.toHaveBeenCalled();
});

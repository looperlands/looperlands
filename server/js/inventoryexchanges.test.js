const InventoryExchanges = require('./inventoryexchanges');

function fixture() {
    const session = {nftId: 'avatar', gameData: {items: {wood: 10}}};
    const cache = {get: id => id === 'session' ? session : undefined, set: jest.fn(), keys: () => ['session']};
    const dao = {exchangeInventory: jest.fn()};
    const exchanges = new InventoryExchanges(dao, cache);
    const request = {sessionId: 'session', costs: [{item: 'wood', amount: 2}], rewards: [{item: 'souvenir', amount: 1}]};
    return {session, dao, exchanges, request};
}

test('duplicate costs reserve their combined quantity and release that quantity on a definite failure', async () => {
    const f = fixture(); let fail;
    f.request.costs = [{item: 'wood', amount: 3}, {item: 'wood', amount: 4}];
    f.dao.exchangeInventory.mockReturnValue(new Promise((resolve, reject) => {fail = reject;}));
    const buying = f.exchanges.exchange(f.request);
    expect(f.session.gameData.items.wood).toBe(3);
    expect(f.exchanges.isPending('avatar')).toBe(true);
    expect(f.dao.exchangeInventory).toHaveBeenCalledWith({nftId: 'avatar', costs: [{item: 'wood', amount: 7}], rewards: f.request.rewards});
    fail(new Error('inventory_unavailable'));
    await expect(buying).rejects.toThrow('inventory_unavailable');
    expect(f.session.gameData.items.wood).toBe(10);
    expect(f.exchanges.isPending('avatar')).toBe(false);
});

test('duplicate costs cannot reserve more inventory than the session owns', async () => {
    const f = fixture(); f.request.costs = [{item: 'wood', amount: 6}, {item: 'wood', amount: 6}];
    await expect(f.exchanges.exchange(f.request)).rejects.toMatchObject({code: 'insufficient_items'});
    expect(f.session.gameData.items.wood).toBe(10);
    expect(f.dao.exchangeInventory).not.toHaveBeenCalled();
});

test.each([undefined, [], [null], [{item: '', amount: 1}], [{item: 'wood', amount: -2}],
    [{item: 'wood', amount: Number.MAX_SAFE_INTEGER}, {item: 'wood', amount: 1}]])('invalid exchange rows never change cached inventory: %j', async costs => {
    const f = fixture(); f.request.costs = costs;
    await expect(f.exchanges.exchange(f.request)).rejects.toMatchObject({code: 'invalid_exchange'});
    expect(f.session.gameData.items.wood).toBe(10);
    expect(f.exchanges.isPending('avatar')).toBe(false);
    expect(f.dao.exchangeInventory).not.toHaveBeenCalled();
});

test('invalid rewards and expired sessions fail before reserving any inputs', async () => {
    const f = fixture();
    await expect(f.exchanges.exchange({...f.request, rewards: []})).rejects.toMatchObject({code: 'invalid_exchange'});
    await expect(f.exchanges.exchange({...f.request, sessionId: 'expired'})).rejects.toMatchObject({code: 'session_unavailable'});
    expect(f.session.gameData.items.wood).toBe(10);
    expect(f.dao.exchangeInventory).not.toHaveBeenCalled();
});

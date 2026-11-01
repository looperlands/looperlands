const {exchange} = require('./inventoryexchange');
const request = {nftId: 'avatar', costs: [{item: 'wood', amount: 2}, {item: 'gold', amount: 3}], rewards: [{item: 'stew', amount: 1}]};

function fixture({fail, partial = false, unreadable = false} = {}) {
    const balances = {wood: 8, gold: 12, stew: 0};
    let submitted = false;
    const platform = {
        getInventoryItem: jest.fn(async (nftId, item) => {
            if (submitted && unreadable) throw new Error('offline');
            return {amount: balances[item]};
        }),
        storeInventoryTransaction: jest.fn(async batch => {
            submitted = true;
            if (fail === 'before') throw new Error('offline');
            for (const row of partial ? batch.slice(0, 1) : batch) balances[row.item] += row.amount;
            if (fail === 'after') throw new Error('response lost');
        })
    };
    return {balances, platform, run: () => exchange(platform, request)};
}

test('confirms all debits and output through independent inventory readback', async () => {
    const f = fixture();
    await expect(f.run()).resolves.toEqual({quantities: {wood: 6, gold: 9, stew: 1}});
    expect(f.platform.storeInventoryTransaction.mock.calls).toEqual([[['wood', 'gold', 'stew'].map((item, index) => ({nftId: 'avatar', item, amount: [-2, -3, 1][index]}))]]);
    expect(f.platform.getInventoryItem).toHaveBeenCalledTimes(6);
});

test('a lost response reconciles a confirmed result without resubmitting the batch', async () => {
    const f = fixture({fail: 'after'});
    await expect(f.run()).resolves.toMatchObject({quantities: {stew: 1}});
    expect(f.platform.storeInventoryTransaction).toHaveBeenCalledTimes(1);
});

test.each([{fail: 'before'}, {partial: true}, {unreadable: true}])('unconfirmed writes are never retried or rolled back: %j', async options => {
    const f = fixture(options);
    await expect(f.run()).rejects.toMatchObject({code: 'exchange_pending', exchangeUncertain: true});
    expect(f.platform.storeInventoryTransaction).toHaveBeenCalledTimes(1);
});

test('authoritative insufficient balances prevent any exchange', async () => {
    const f = fixture(); f.balances.gold = 2;
    await expect(f.run()).rejects.toMatchObject({code: 'insufficient_items', exchangeUncertain: false});
    expect(f.platform.storeInventoryTransaction).not.toHaveBeenCalled();
});

test('costs for the same inventory item are validated together', async () => {
    const f = fixture();
    await expect(exchange(f.platform, {...request, costs: [{item: 'wood', amount: 5}, {item: 'wood', amount: 5}]})).rejects.toMatchObject({code: 'insufficient_items'});
    expect(f.platform.storeInventoryTransaction).not.toHaveBeenCalled();
});

test('invalid balances and invalid exchanges fail before persistence', async () => {
    const f = fixture(); f.balances.wood = NaN;
    await expect(f.run()).rejects.toMatchObject({code: 'inventory_unavailable'});
    await expect(exchange(f.platform, {...request, rewards: [{item: 'stew', amount: 0}]})).rejects.toMatchObject({code: 'invalid_exchange'});
    expect(f.platform.storeInventoryTransaction).not.toHaveBeenCalled();
});

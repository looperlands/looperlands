const {LooperLandsPlatformClient} = require('./looperlandsplatformclient');
const request = {requestId: 'a'.repeat(64), expectedRevision: 5, mapId: 'test', x: 1, y: 2};
const receipt = {requestId: request.requestId, revision: 6, plot: null, xp: 100, quantities: {'123': 4}};
function client(post) {const p = Object.create(LooperLandsPlatformClient.prototype); p.client = {post}; return p;}
test('timeouts retry the exact same atomic payload and receipt', async () => {
    const post = jest.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({data: receipt});
    expect(await client(post).commitFarmTransaction(request)).toEqual(receipt);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);
});
test('definite conflicts do not retry or become a legacy inventory write', async () => {
    const post = jest.fn().mockRejectedValue({response: {status: 409, data: {code: 'plot_changed'}}});
    await expect(client(post).commitFarmTransaction(request)).rejects.toMatchObject({code: 'plot_changed'});
    expect(post).toHaveBeenCalledTimes(1);
});
test.each([{requestId: 'wrong'}, {revision: 5}, {quantities: {'123': -1}}, {plot: {mapId: 'other'}}])('malformed receipts remain unconfirmed (%s)', async invalid => {
    const post = jest.fn().mockResolvedValue({data: {...receipt, ...invalid}});
    await expect(client(post).commitFarmTransaction(request)).rejects.toMatchObject({code: 'farm_transaction_pending'});
    expect(post).toHaveBeenCalledTimes(2);
});

test('a committed reply missing an item balance is not treated as a complete payout', async () => {
    const post = jest.fn().mockResolvedValue({data: receipt});
    await expect(client(post).commitFarmTransaction({...request, action: 'harvest', items: [{item: '456', amount: 2}]}))
        .rejects.toMatchObject({code: 'farm_transaction_pending'});
});

test('a non-harvest reply cannot silently delete the plot', async () => {
    const post = jest.fn().mockResolvedValue({data: receipt});
    await expect(client(post).commitFarmTransaction({...request, action: 'water', items: []}))
        .rejects.toMatchObject({code: 'farm_transaction_pending'});
});

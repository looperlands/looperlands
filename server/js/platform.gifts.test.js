const {LooperLandsPlatformClient} = require('./looperlandsplatformclient');
const transfer = {requestId: 'fixed-transfer', item: '333009', quantity: 2};
const receipt = {transferId: transfer.requestId, item: transfer.item, quantity: transfer.quantity};
function platform(post) {
    const client = Object.create(LooperLandsPlatformClient.prototype);
    client.client = {post};
    return client;
}

test('a transfer timeout retries the same idempotent payload and validates its receipt', async () => {
    const post = jest.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({data: receipt});
    expect(await platform(post).transferInventory(transfer)).toEqual(receipt);
    expect(post.mock.calls).toEqual([
        ['/api/game/inventory/transfer', transfer, {timeout: 15000}],
        ['/api/game/inventory/transfer', transfer, {timeout: 15000}]
    ]);
});

test('a definite rejection is not retried and retains the platform error code', async () => {
    const post = jest.fn().mockRejectedValue({response: {status: 409, data: {code: 'insufficient_items'}}});
    await expect(platform(post).transferInventory(transfer)).rejects.toMatchObject({code: 'insufficient_items', transferUncertain: false});
    expect(post).toHaveBeenCalledTimes(1);
});

test.each([
    {response: {status: 503}},
    new Error('timeout'),
])('unconfirmed transfers remain pending after both attempts', async error => {
    const post = jest.fn().mockRejectedValue(error);
    await expect(platform(post).transferInventory(transfer)).rejects.toMatchObject({code: 'gift_pending', transferUncertain: true});
    expect(post).toHaveBeenCalledTimes(2);
});

test('a mismatched receipt is never acknowledged as delivery', async () => {
    const post = jest.fn().mockResolvedValue({data: {...receipt, quantity: 100}});
    await expect(platform(post).transferInventory(transfer)).rejects.toMatchObject({code: 'gift_pending', transferUncertain: true});
});

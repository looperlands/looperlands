const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadDao(client) {
    const sandbox = {
        console: {error: jest.fn(), log: jest.fn()}, module: {exports: {}}, process: {env: {}}, setInterval: jest.fn(),
        require: id => {
            if (id === 'node-cache') return class {};
            if (id === './looperlandsplatformclient.js') return {LooperLandsPlatformClient: class {constructor() {Object.assign(this, client);}}};
            return {};
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'dao.js'), 'utf8'), sandbox);
    return sandbox.module.exports;
}

const transfer = {requestId: 'gift', fromNftId: 'sender', toNftId: 'recipient', item: '333009', quantity: 2};

test('gifts wait for earlier inventory writes, hold later writes, and include pending consumption in the receipt', async () => {
    let flush, complete, started;
    const earlier = new Promise(resolve => {flush = resolve;});
    const gift = new Promise(resolve => {complete = resolve;});
    const transferring = new Promise(resolve => {started = resolve;});
    const client = {storeInventoryTransaction: jest.fn().mockReturnValueOnce(earlier).mockResolvedValue(true), transferInventory: jest.fn(() => {started(); return gift;}), getInventoryItem: jest.fn(nft => Promise.resolve({amount: nft === 'sender' ? 8 : 2}))};
    const dao = loadDao(client);
    await dao.saveLootEvent('sender', '333009', 1);
    const sending = dao.transferItems(transfer);
    expect(client.transferInventory).not.toHaveBeenCalled();
    flush(); await transferring;
    expect(client.transferInventory).toHaveBeenCalledWith(transfer);
    await dao.saveLootEvent('sender', '333009', -1);
    const waiting = dao.processLootEventQueue();
    expect(client.storeInventoryTransaction).toHaveBeenCalledTimes(1);
    complete({transferId: 'gift', item: '333009', quantity: 2});
    expect(await sending).toMatchObject({fromQuantity: 7, toQuantity: 2});
    await waiting; await dao.processLootEventQueue();
    expect(client.storeInventoryTransaction.mock.calls[1][0]).toEqual([{nftId: 'sender', item: '333009', amount: -1}]);
});

test('failed earlier inventory writes prevent a gift and remain queued for retry', async () => {
    const client = {storeInventoryTransaction: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(true), transferInventory: jest.fn()};
    const dao = loadDao(client);
    await dao.saveLootEvent('sender', '333009', -1);
    await expect(dao.transferItems(transfer)).rejects.toMatchObject({code: 'inventory_unavailable'});
    expect(client.transferInventory).not.toHaveBeenCalled();
    await dao.processLootEventQueue();
    expect(client.storeInventoryTransaction.mock.calls[1][0]).toEqual([{nftId: 'sender', item: '333009', amount: -1}]);
});

test('a committed transfer with unavailable balance confirmation stays uncertain and releases the writer', async () => {
    const client = {storeInventoryTransaction: jest.fn().mockResolvedValue(true), transferInventory: jest.fn().mockResolvedValue({transferId: 'gift'}), getInventoryItem: jest.fn().mockRejectedValue(new Error('offline'))};
    const dao = loadDao(client);
    await expect(dao.transferItems(transfer)).rejects.toMatchObject({code: 'gift_pending', transferUncertain: true});
    await dao.saveLootEvent('recipient', '333009', -1); await dao.processLootEventQueue();
    expect(client.storeInventoryTransaction).toHaveBeenCalledTimes(1);
});

test('atomic farming shares the writer, holds later consumption and returns current quantities', async () => {
    let finish, started;
    const pending = new Promise(resolve => {finish = resolve;});
    const running = new Promise(resolve => {started = resolve;});
    const client = {storeInventoryTransaction: jest.fn().mockResolvedValue(true),
        commitFarmTransaction: jest.fn(() => {started(); return pending;})};
    const dao = loadDao(client);
    await dao.saveLootEvent('avatar', '123', 1);
    const transaction = {nftId: 'avatar', requestId: 'farm'};
    const farm = dao.commitFarmTransaction(transaction);
    await running;
    await dao.saveLootEvent('avatar', '123', -1);
    finish({requestId: 'farm', quantities: {'123': 2}});
    expect((await farm).quantities).toEqual({'123': 1});
    await dao.processLootEventQueue();
    expect(client.commitFarmTransaction).toHaveBeenCalledWith(transaction);
    expect(client.storeInventoryTransaction.mock.calls.flat().flat().map(event => event.amount)).toEqual([1, -1]);
});

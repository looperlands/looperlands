const fs = require('fs');
const os = require('os');
const path = require('path');
global.Types = {};
const {LocalPlatformClient} = require('./localplatformclient');

const wallet = '0x1e8ab2cc09be581530bb9f3ac94353f6f7412239';
const avatar = '0xb69e3e44f58d5399faad29b94108a88dbed79e6a14c676fb202e817ac5697560';
const weapon = '0x82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741';
let dataDir, client;
beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-local-platform-'));
    client = new LocalPlatformClient({dataDir});
    client.prepareSession({walletId: wallet, nftId: avatar, xp: 1000000, mapId: 'm88n2', checkpointId: '1', trait: 'rogue'});
});
afterEach(() => {fs.rmSync(dataDir, {recursive: true, force: true});});

test('the exact mapmaker identity loads local game data and bundled avatar art', async () => {
    await expect(client.checkOwnership(avatar, wallet)).resolves.toBe(true);
    await expect(client.checkOwnershipOfCollection('any collection', wallet)).resolves.toBe(true);
    await expect(client.getNFT(avatar)).resolves.toMatchObject({assetType: 'looper', xp: 1000000, trait: 'rogue', token: {tokenHash: avatar}});
    await expect(client.getEquipped(avatar)).resolves.toEqual({weapon: 'sword1'});
    await expect(client.getGameData(avatar)).resolves.toEqual({kills: {}, items: [], quests: [], choices: []});
    await expect(client.getNFT('0xunknown')).rejects.toMatchObject({code: 'local_asset_sprite_unavailable'});
});

test('progress, inventory, quests, choices and equipment survive an adapter restart', async () => {
    await client.increaseExperience(avatar, 20);
    await client.storeInventoryTransaction([{nftId: avatar, item: '100', amount: 3}]);
    await client.storeKills([{nftId: avatar, mob: 'rat', amount: 2}]);
    await client.setQuestsStatus(avatar, 'farm-intro', 'STARTED');
    await client.setQuestsStatus(avatar, 'farm-intro', 'COMPLETED');
    await client.registerChoice(avatar, 'help'); await client.registerChoice(avatar, 'help');
    await client.equip(wallet, avatar, weapon);
    await client.updateAssetPosition(avatar, 'duckville', 2);
    const restarted = new LocalPlatformClient({dataDir});
    await expect(restarted.getAssetInfo(avatar)).resolves.toMatchObject({xp: 1000020});
    await expect(restarted.getGameData(avatar)).resolves.toEqual({kills: {rat: 2}, items: [{item: '100', quantity: 3}],
        quests: [{questKey: 'farm-intro', status: 'COMPLETED'}], choices: ['help']});
    await expect(restarted.getEquipped(avatar)).resolves.toEqual({weapon});
    await expect(restarted.getInventory(wallet)).resolves.toMatchObject({weapons: [{nftId: weapon, xp: 0}]});
    expect(restarted.readAsset(avatar)).toMatchObject({map: 'duckville', checkpoint: 2});
    const independent = new LocalPlatformClient({dataDir: path.join(dataDir, 'other')});
    await expect(independent.getGameData(avatar)).resolves.toEqual({kills: {}, items: [], quests: [], choices: []});
});

test('starting progress sets selected amounts and finished quests without erasing other progress or granting rewards', async () => {
    await client.storeInventoryTransaction([{nftId: avatar, item: '100', amount: 5}, {nftId: avatar, item: '101', amount: 7}]);
    await client.setQuestsStatus(avatar, 'other-quest', 'IN_PROGRESS');
    const settings = {walletId: wallet, nftId: avatar, startingInventory: [{item: '100', amount: 12}], finishedQuests: ['test-quest']};
    client.prepareSession(settings); client.prepareSession(settings);
    const restarted = new LocalPlatformClient({dataDir});
    expect(await restarted.getGameData(avatar)).toMatchObject({items: [{item: '100', quantity: 12}, {item: '101', quantity: 7}],
        quests: [{questKey: 'other-quest', status: 'IN_PROGRESS'}, {questKey: 'test-quest', status: 'FINISHED'}]});
    expect(restarted.readAsset(avatar).xp).toBe(1000000);
});

test('ownership bypass leaves item quantities and normal quest state intact', async () => {
    await client.storeInventoryTransaction([{nftId: avatar, item: '100', amount: 2}]);
    await expect(client.storeInventoryTransaction([{nftId: avatar, item: '100', amount: 1},
        {nftId: avatar, item: '200', amount: -1}])).rejects.toMatchObject({code: 'insufficient_items'});
    await expect(client.getInventoryItem(avatar, '100')).resolves.toEqual({amount: 2});
    await expect(client.getInventoryItem(avatar, '200')).resolves.toEqual({amount: 0});
    const data = await client.getGameData(avatar);
    data.quests.push({questKey: 'tampered', status: 'COMPLETED'});
    data.items[0].quantity = 99;
    await expect(client.getGameData(avatar)).resolves.toMatchObject({quests: [], items: [{item: '100', quantity: 2}]});
});

test('gift receipts are idempotent across restarts and cannot overspend or change payload', async () => {
    await client.storeInventoryTransaction([{nftId: avatar, item: '100', amount: 4}]);
    const transfer = {requestId: 'gift-1', fromNftId: avatar, toNftId: 'recipient', item: '100', quantity: 3};
    const receipt = await client.transferInventory(transfer);
    expect(receipt).toEqual({transferId: 'gift-1', item: '100', quantity: 3, fromQuantity: 1, toQuantity: 3});
    const restarted = new LocalPlatformClient({dataDir});
    await expect(restarted.transferInventory(transfer)).resolves.toEqual(receipt);
    await expect(restarted.getInventoryItem('recipient', '100')).resolves.toEqual({amount: 3});
    await expect(restarted.transferInventory({...transfer, quantity: 1})).rejects.toMatchObject({code: 'transfer_conflict'});
    await expect(restarted.transferInventory({...transfer, requestId: 'gift-2', quantity: 2})).rejects.toMatchObject({code: 'insufficient_items'});
    await expect(restarted.getInventoryItem(avatar, '100')).resolves.toEqual({amount: 1});
});

test('farming atomically commits plot, items and XP and retains revisions after harvest', async () => {
    await client.storeInventoryTransaction([{nftId: avatar, item: '100', amount: 2}, {nftId: avatar, item: '200', amount: 1}]);
    const transaction = {requestId: 'farm-1', nftId: avatar, mapId: 'm88n2', x: 10, y: 20, expectedRevision: 0,
        action: 'plant', plot: {mapId: 'm88n2', x: 10, y: 20, state: 'planted', ownerNftId: avatar},
        items: [{item: '100', amount: -1}], requiredItems: [{item: '200', quantity: 1}], xp: 10};
    await expect(client.getFarmState('m88n2', 10, 20)).resolves.toEqual({revision: 0, plot: null});
    const receipt = await client.commitFarmTransaction(transaction);
    expect(receipt).toMatchObject({requestId: 'farm-1', revision: 1, plot: {revision: 1}, xp: 1000010, quantities: {'100': 1}});
    const restarted = new LocalPlatformClient({dataDir});
    await expect(restarted.commitFarmTransaction(transaction)).resolves.toEqual(receipt);
    await expect(restarted.getFarmPlots('m88n2')).resolves.toHaveLength(1);
    await restarted.commitFarmTransaction({...transaction, requestId: 'farm-2', action: 'harvest', expectedRevision: 1,
        plot: null, items: [{item: '300', amount: 2}], xp: 30});
    await expect(restarted.getFarmState('m88n2', 10, 20)).resolves.toEqual({revision: 2, plot: null});
    await expect(restarted.getAssetInfo(avatar)).resolves.toMatchObject({xp: 1000040});
    await expect(restarted.commitFarmTransaction({...transaction, requestId: 'stale'})).rejects.toMatchObject({code: 'plot_changed'});
});

test('rejected farming receipts never change inventory, XP or plot state', async () => {
    const transaction = {requestId: 'farm-1', nftId: avatar, mapId: 'm88n2', x: 1, y: 2, expectedRevision: 0,
        action: 'plant', plot: {mapId: 'm88n2', x: 1, y: 2}, items: [{item: '100', amount: -1}], xp: 10};
    await expect(client.commitFarmTransaction(transaction)).rejects.toMatchObject({code: 'insufficient_items'});
    await expect(client.getFarmState('m88n2', 1, 2)).resolves.toEqual({revision: 0, plot: null});
    await expect(client.getAssetInfo(avatar)).resolves.toMatchObject({xp: 1000000});
    await expect(client.commitFarmTransaction({...transaction, plot: {mapId: 'other', x: 1, y: 2}})).rejects.toMatchObject({code: 'invalid_farm_transaction'});
    await expect(client.commitFarmTransaction({...transaction, items: [], requiredItems: [{item: '200', quantity: 1}]})).rejects.toMatchObject({code: 'insufficient_items'});
});

test('field guide, activity and title writes acknowledge only locally saved data', async () => {
    await expect(client.recordFieldGuide(avatar, ['field-guide:rat'])).resolves.toEqual({accepted: ['field-guide:rat']});
    await client.recordFieldGuide(avatar, ['field-guide:rat']);
    await expect(client.getFieldGuide(avatar)).resolves.toEqual(['field-guide:rat']);
    await expect(client.storeActivity([{id: 'activity-1', nftId: avatar}])).resolves.toEqual({accepted: ['activity-1']});
    await expect(client.claimPlayerTitlePrompt(wallet)).resolves.toEqual({showPrompt: true});
    await expect(client.claimPlayerTitlePrompt(wallet.toUpperCase())).resolves.toEqual({showPrompt: false});
    await expect(client.setPlayerTitle(wallet, 'Mapmaker')).resolves.toEqual({title: 'Mapmaker', displayName: 'Mapmaker'});
    const restarted = new LocalPlatformClient({dataDir});
    await expect(restarted.getFieldGuide(avatar)).resolves.toEqual(['field-guide:rat']);
    await expect(restarted.claimPlayerTitlePrompt(wallet)).resolves.toEqual({showPrompt: false});
    expect(restarted.state.activities['activity-1']).toEqual({id: 'activity-1', nftId: avatar});
});

test('failed disk writes retain the last committed state and corrupt data is preserved', async () => {
    const rename = jest.spyOn(fs, 'renameSync').mockImplementationOnce(() => {throw new Error('disk unavailable');});
    try {await expect(client.increaseExperience(avatar, 10)).rejects.toThrow('disk unavailable');}
    finally {rename.mockRestore();}
    await expect(client.getAssetInfo(avatar)).resolves.toMatchObject({xp: 1000000});
    const restarted = new LocalPlatformClient({dataDir});
    await expect(restarted.getAssetInfo(avatar)).resolves.toMatchObject({xp: 1000000});
    fs.writeFileSync(client.file, '{broken');
    expect(() => new LocalPlatformClient({dataDir})).toThrow();
    expect(fs.readFileSync(client.file, 'utf8')).toBe('{broken');
});

test('legacy partner tasks roundtrip locally and unavailable external operations are explicit', async () => {
    await expect(client.getPartnerTask(wallet, 'test')).resolves.toEqual({taskStatus: 'false'});
    await client.completePartnerTask(wallet, 'test');
    await expect(client.getPartnerTask(wallet, 'test')).resolves.toEqual({taskStatus: 'true'});
    await expect(client.getEventBoard()).resolves.toEqual({events: []});
    await expect(client.getEventEquipment()).resolves.toEqual({grants: []});
    await expect(client.getShopInventory()).resolves.toEqual([]);
    await expect(client.getCompanions()).resolves.toEqual([]);
    await expect(client.registerEvent()).rejects.toMatchObject({code: 'local_events_unavailable'});
    await expect(client.getFreeRental()).resolves.toEqual({success: false, error: 'local_rentals_unavailable'});
});

test('the offline adapter implements every platform client operation', () => {
    const {LooperLandsPlatformClient} = require('./looperlandsplatformclient');
    const methods = Object.getOwnPropertyNames(LooperLandsPlatformClient.prototype).filter(name => name !== 'constructor');
    for (const method of methods) expect(typeof client[method]).toBe('function');
});

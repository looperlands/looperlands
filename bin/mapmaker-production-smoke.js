// Run against tests/Farming/PreviewRouter.php and a disposable local PostgreSQL
// database. The production provider and tile controller run without local mode.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const axios = require('axios');
process.env.GAMESERVER_NAME = 'mapmaker-production-smoke';
process.env.DISCORD_TOKEN = '';
delete process.env.LOOPERLANDS_PLATFORM_API_KEY;
delete process.env.LOOPERLANDS_PLATFORM_BASE_URL;
// The transaction path uses the real provider; unrelated Discord transport is
// excluded so this isolated production-mode test cannot contact it.
require.cache[require.resolve('../server/js/discord')] = {exports: {}};
const {LooperLandsPlatformClient} = require('../server/js/looperlandsplatformclient');
const TileActionsController = require('../server/js/tileactionscontroller');
const Types = require('../shared/js/gametypes');

async function main() {
    const url = new URL(process.env.MAPMAKER_TEST_PLATFORM_URL);
    assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Use the isolated loopback Platform fixture');
    assert.equal(process.env.NODE_ENV, 'production');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mapmaker-production-'));
    const write = (file, value) => {const target = path.join(root, file); fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, JSON.stringify(value));};
    try {
        const nftId = 'mapmaker-' + Date.now(), mapId = 'smoke_' + Date.now();
        const platform = Object.create(LooperLandsPlatformClient.prototype);
        platform.client = axios.create({baseURL: url.href});
        assert.equal(platform.localPlaytest, undefined);
        await platform.client.post('/__fixture/init', {players: [{nftId, xp: 10}], items: {[Types.Entities.GOLD]: 10}});
        write('server/config.json', {maps: [mapId]});
        write('tools/tiles/' + mapId + '.json', {version: 1, placements: [{x: 3, y: 4, width: 1, height: 1, action: 'repair'}], actions: {repair: {
            type: 'sequence', name: 'Repair', start: 'work', stages: [{id: 'work', name: 'Work', duration: 0, waitSeconds: 0, level: 1,
                costs: [{item: String(Types.Entities.GOLD), amount: 2}], rewards: [{item: String(Types.Entities.FLASK), amount: 1}], xp: 3, tile: 1,
                successChance: 1, next: '', failureNext: '', message: 'Repaired', trigger: ''}]}}});
        const player = {id: 1, nftId, sessionId: 'smoke', hasEnteredGame: true, x: 2, y: 4, getLevel: () => 1,
            applyPersistedExperience: async xp => {player.xp = xp;}, playerEventBroker: {tileAction: async () => {player.events = (player.events || 0) + 1;}}};
        const cache = new Map([['smoke', {nftId, mapId, gameData: {items: {[Types.Entities.GOLD]: 10}}}]]);
        const world = {players: {1: player}, map: {tileStages: {}}, sendNotifications() {}, pushBroadcast() {},
            placeStagedTile(x, y, tile) {this.map.tileStages[x + '.' + y] = {tile};}, clearStagedTile() {}};
        const controller = new TileActionsController(cache, platform, {root, duckvilleController: {stageDefinitions: {}},
            dao: {commitTileSequence: transaction => platform.commitTileSequence(transaction)}, random: () => 0});
        const tile = {gridX: 3, gridY: 4};
        assert.equal((await controller.findCurrentStage(nftId, mapId, tile, world)).key, 'work');
        await platform.client.post('/__fixture/drop-next-response');
        const result = await controller.executeStage(nftId, mapId, tile, null, world, 'work', 0);
        assert.equal(result.success, true); assert.equal(player.xp, 13); assert.equal(player.events, 1);
        assert.equal(cache.get('smoke').gameData.items[Types.Entities.GOLD], 8);
        assert.equal(cache.get('smoke').gameData.items[Types.Entities.FLASK], 1);
        assert.equal((await controller.findCurrentStage(nftId, mapId, tile, world)).key, 'done');
        const duplicate = await controller.executeStage(nftId, mapId, tile, null, world, 'work', 0);
        assert.equal(duplicate.success, false);
        const restarted = Object.create(LooperLandsPlatformClient.prototype); restarted.client = platform.client;
        const signature = require('../server/js/localtilebuilder').hash(controller.localSequences.definitions[mapId].repair);
        assert.equal((await restarted.getTileSequenceState(mapId, 3, 4, signature)).stage, null);
        const personalSignature = 'c'.repeat(64), effects = {'0': true, gate: false};
        const transaction = {requestId: require('crypto').createHash('sha256').update(nftId + ':personal').digest('hex'),
            nftId, owner: nftId, mapId, x: 6, y: 4, signature: personalSignature, expectedRevision: 0, stage: null,
            readyAt: Date.now() - 1, tile: 2, items: [{item: String(Types.Entities.FLASK), amount: 1}],
            requiredItems: [], xp: 2, success: true, effects};
        await platform.commitTileSequence(transaction);
        assert.deepEqual((await restarted.getTileSequenceState(mapId, 6, 4, personalSignature, nftId)).effects, effects);
        assert.equal((await restarted.getTileSequenceState(mapId, 6, 4, personalSignature, 'another-avatar')).revision, 0);
        const restored = await restarted.resetTileSequence({...transaction, expectedRevision: 1, now: Date.now(), stage: 'use', tile: 1});
        assert.equal(restored.revision, 2); assert.equal(restored.stage, 'use'); assert.deepEqual(restored.effects, effects);
        const inventory = await platform.client.get('/api/game/asset/inventory/' + encodeURIComponent(nftId) + '/' + Types.Entities.FLASK);
        assert.equal(inventory.data.amount, 2);
        console.log('PASS: personal progress isolation, numeric trigger IDs and cooldown reset without another reward.');
        console.log('PASS: production provider + real Platform transaction service + PostgreSQL; lost-response retry, one payout, durable stage and stale-request rejection.');
    } finally {fs.rmSync(root, {recursive: true, force: true});}
}
main().then(() => process.exit(0), error => {console.error(error.message); process.exit(1);});

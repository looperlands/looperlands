const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
global.Types = {};
const {LocalPlatformClient} = require('./localplatformclient');
const syncExperience = require('./experiencesync');
const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
const helper = source.slice(source.indexOf('WS.flushLocalGameplay ='), source.indexOf('\nfunction extractDetails'));

function shutdownHelper(dao) {
    const WS = {};
    vm.runInNewContext(helper, {WS, dao, clearTimeout, clearInterval, setTimeout, Date, Promise, Set});
    return WS.flushLocalGameplay;
}

function localDao(client) {
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./dao'), 'utf8'), {
        module, exports: module.exports, console, process: {env: {}}, setInterval: () => 0, clearInterval,
        require: id => {
            if (id === './looperlandsplatformclient.js') return {LooperLandsPlatformClient: class {constructor() {return client;}}};
            if (id === 'node-cache') return class {get() {} set() {}};
            return {};
        }
    });
    return module.exports;
}

test('local shutdown persists sub-batch avatar/weapon XP, queued kills and inventory before restart', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-local-shutdown-'));
    try {
        const platform = new LocalPlatformClient({dataDir}), dao = localDao(platform);
        platform.prepareSession({nftId: 'avatar', walletId: 'wallet', xp: 100});
        platform.prepareSession({nftId: 'weapon', walletId: 'wallet', xp: 10});
        const equipment = {accumulatedExperience: 9};
        equipment.syncExperience = () => syncExperience(equipment, 500, xp => dao.saveNFTWeaponExperience('wallet', 'weapon', xp), () => {});
        const player = {nftId: 'avatar', accumulatedExperience: 17, getNFTWeapon: () => equipment};
        player.syncExperience = () => syncExperience(player, 1000, xp => dao.updateExperience('avatar', xp), () => {});
        const world = {players: {one: player}, combat: {disable: jest.fn()}};
        await dao.saveLootEvent('avatar', '100', 2);
        await dao.saveMobKillEvent('avatar', 'rat');
        const flush = shutdownHelper(dao);
        const server = {worldsMap: {map: world}};
        await flush(server);
        const restarted = new LocalPlatformClient({dataDir});
        expect(restarted.readAsset('avatar').xp).toBe(117);
        expect(restarted.readAsset('weapon').xp).toBe(19);
        await expect(restarted.getGameData('avatar')).resolves.toEqual({kills: {rat: 1}, items: [{item: '100', quantity: 2}], quests: [], choices: []});
        expect(player.clientReloadPending.localShutdown).toBe(true);
        expect(player.invincible).toBe(true);
        expect(world.combat.disable).toHaveBeenCalledWith(player);
        await flush(server);
        expect(new LocalPlatformClient({dataDir}).readAsset('avatar').xp).toBe(117);
    } finally {fs.rmSync(dataDir, {recursive: true, force: true});}
});

test('shutdown freezes new input and waits for an in-flight reward before draining queues', async () => {
    const events = [];
    const player = {pendingMessages: 1, accumulatedExperience: 0,
        syncExperience: jest.fn(async () => {events.push('xp'); player.accumulatedExperience = 0;})};
    const dao = {flushPendingWrites: jest.fn(async () => events.push('queues'))};
    const flushing = shutdownHelper(dao)({worldsMap: {map: {players: {one: player}}}});
    expect(player.clientReloadPending.localShutdown).toBe(true);
    expect(player.syncExperience).not.toHaveBeenCalled();
    player.accumulatedExperience = 12;
    player.pendingMessages = 0;
    await flushing;
    expect(events).toEqual(['xp', 'queues']);
});

test.each(['avatar', 'equipment'])('failed %s XP persistence cannot report a successful drain', async kind => {
    const equipment = {accumulatedExperience: kind === 'equipment' ? 9 : 0, syncExperience: jest.fn()};
    const player = {accumulatedExperience: kind === 'avatar' ? 17 : 0, syncExperience: jest.fn(), getNFTWeapon: () => equipment};
    const dao = {flushPendingWrites: jest.fn()};
    await expect(shutdownHelper(dao)({worldsMap: {map: {players: {one: player}}}})).rejects.toThrow('experience is not saved yet');
    expect(dao.flushPendingWrites).not.toHaveBeenCalled();
});

test.each([true, false])('only a local provider drains gameplay before the existing signal shutdown: %s', async localPlaytest => {
    const handlers = {}, events = [], server = {activity: {close: jest.fn(async () => events.push('activity'))}};
    const WS = {flushLocalGameplay: jest.fn(async () => events.push('gameplay'))};
    const processStub = {pid: 123, once: (signal, handler) => {handlers[signal] = handler;}, kill: jest.fn(() => events.push('exit'))};
    const offset = source.indexOf('        if (!platformClient.platformDefined) for (const signal');
    const end = source.indexOf('        this.npcMemory', offset);
    vm.runInNewContext('(function () {' + source.slice(offset, end) + '}).call(server);', {
        WS, server, process: processStub, platformClient: {platformDefined: false, localPlaytest},
        closeFieldGuide: async () => events.push('guide')
    });
    await handlers.SIGTERM();
    expect(events).toEqual(localPlaytest ? ['gameplay', 'activity', 'guide', 'exit'] : ['activity', 'guide', 'exit']);
    expect(WS.flushLocalGameplay).toHaveBeenCalledTimes(localPlaytest ? 1 : 0);
    expect(processStub.kill).toHaveBeenCalledWith(123, 'SIGTERM');
});

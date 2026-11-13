const fs = require('fs'), vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');
const rodKind = Object.values(Types.Entities).find(kind => typeof kind === 'number' && Types.isFishingRod(kind));
function setup() {
    let methods;
    const load = jest.fn().mockResolvedValue(), construct = jest.fn(), increment = jest.fn(), sync = jest.fn().mockResolvedValue();
    class Rod {
        constructor(wallet, id) {construct(wallet, id);}
        loadItemData() {return load();}
        incrementExperience(xp) {increment(xp);}
        syncExperience() {return sync();}
    }
    vm.runInNewContext(fs.readFileSync(require.resolve('./player'), 'utf8'), {
        module: {exports: {}}, process: {env: {}}, console, clearTimeout,
        Character: {extend: value => {methods = value; return function () {}; }},
        require: name => {
            if (name === '../../shared/js/gametypes') return Types;
            if (name === './fishingequipment') return require('./fishingequipment');
            if (name === './fishingresult') return require('./fishingresult');
            if (name === './format') return {check: () => true};
            if (name === './nftspecialitem.js') return {NFTSpecialItem: Rod};
            if (name === './message') return {Kill: function () {}};
            if (name === './discord.js') return {sendMessage: jest.fn()};
            if (name === './lakes.js') return {pond: {fish: {guppy: 'common'}}};
            if (name === '../../shared/js/altnames') return {getName: name => name};
            if (name === './looperlandsplatformclient.js') return {LooperLandsPlatformClient: function () {}};
            return {};
        }
    });
    const player = {...methods, walletId: 'local-wallet', hasEnteredGame: true, hitPoints: 10, resetTimeout: jest.fn(),
        connection: {close: jest.fn()}, broadcast: jest.fn(), equip: kind => ({kind}),
        server: {server: {}, id: 'world', announceDespawnFloat: jest.fn(), pushToPlayer: jest.fn()},
        playerEventBroker: {lootEvent: jest.fn().mockResolvedValue()}, handleExperience: jest.fn()};
    return {player, Rod, load, construct, increment, sync};
}
test('logging in with a rod loads the special-item level and trait model', () => {
    const {player, Rod, construct, load} = setup();
    player.equipWeapon(rodKind);
    expect(player.weapon).toBe(rodKind); expect(player.getNFTWeapon()).toBeInstanceOf(Rod);
    expect(construct).toHaveBeenCalledWith('local-wallet', Types.getKindAsString(rodKind));
    expect(load).toHaveBeenCalledTimes(1);
});
function startCast(player) {
    const sword = {syncExperience: jest.fn()};
    Object.assign(player, {weapon: Types.Entities.SWORD1, nftWeapon: sword, weaponLevel: 7});
    player.equipSpecialItem(rodKind);
    player.pendingFish = {name: 'guppy', lakeName: 'pond', mapId: 'world', expiresAt: Date.now() + 60000, exp: 10};
    return sword;
}
test.each([true, false])('a result restores the weapon immediately, before any catch award finishes (success=%s)', async success => {
    const {player, increment, sync} = setup();
    const sword = startCast(player);
    let finish;
    player.playerEventBroker.lootEvent.mockReturnValue(new Promise(resolve => {finish = resolve;}));
    const pending = player.handleMessage([Types.Messages.FISHINGRESULT, success, false]);
    expect(player.weapon).toBe(Types.Entities.SWORD1); expect(player.nftWeapon).toBe(sword);
    expect(player.pendingFish).toBeNull(); expect(player.server.announceDespawnFloat).toHaveBeenCalledTimes(1);
    if (success) finish();
    await pending;
    expect(increment).toHaveBeenCalledTimes(success ? 1 : 0);
    if (success) expect(increment).toHaveBeenCalledWith(10);
    expect(sync).toHaveBeenCalled();
});
test('a duplicate result cannot override a subsequent manual rod selection', async () => {
    const {player} = setup();
    startCast(player);
    await player.handleMessage([Types.Messages.FISHINGRESULT, false, false]);
    player.equipSpecialItem(rodKind);
    await player.handleMessage([Types.Messages.FISHINGRESULT, false, false]);
    expect(player.weapon).toBe(rodKind);
});
test('disconnect cancels a pending cast and restores the weapon', () => {
    const {player} = setup(); const sword = startCast(player);
    player.fishingRequest = {};
    player.handleDisconnect();
    expect(player.pendingFish).toBeNull(); expect(player.fishingRequest).toBeNull(); expect(player.nftWeapon).toBe(sword);
});

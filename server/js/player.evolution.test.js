const fs = require('fs');
const vm = require('vm');
global.Types = {};
jest.mock('./lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('./lib/class'), 'utf8'), {exports});
    return exports;
});
const Types = require('../../shared/js/gametypes');
const Messages = require('./message');
const appearance = require('./avatarappearance');

function setup() {
    const module = {exports: {}};
    const session = {xp: 0};
    const save = jest.fn().mockResolvedValue(2100);
    vm.runInNewContext(fs.readFileSync(require.resolve('./player'), 'utf8'), {
        module, process: {env: {}}, console, performance: {now: () => 1000},
        Character: {extend: methods => methods},
        require: name => {
            if (name === '../../shared/js/gametypes') return Types;
            if (name === './message') return Messages;
            if (name === './avatarappearance') return appearance;
            if (name === './formulas') return {level: xp => 1 + Math.floor(xp / 100), MAX_LEVEL: 9999};
            if (name === './discord.js') return {sendMessage: jest.fn()};
            if (name === './experiencesync.js') return require('./experiencesync');
            if (name === './dao.js') return {updateExperience: save, saveAvatarMapAndCheckpoint: jest.fn()};
            if (name === './format') return {check: () => true};
            if (name === './socialchat') return {gameplayNameFromSession: () => 'Player'};
            if (name === './utils') return {randomOrientation: () => 1};
            if (name === './playerclassmodifiers.js') return {PlayerClassModifiers: function () {}};
            if (name === './worldclock') return {syncPlayer: jest.fn()};
            if (name === './hotreload') return {};
            if (name === './eventequipment') return {effectiveLevel: () => 999};
            if (name === './looperlandsplatformclient.js') return {LooperLandsPlatformClient: function () {}};
            return {};
        }
    });
    const definition = {nftId: '0xavatar', assetType: 'looper', tokenHash: 'original', options: {evolutions: [
        {level: 5, sprite: 'first', canHoldWeapon: false}, {level: 20, sprite: 'final', canHoldWeapon: true}
    ]}};
    const player = Object.assign(module.exports, {
        id: 42, nftId: '0xavatar', name: 'Player', sessionId: 'session', level: 1, accumulatedExperience: 0,
        armor: 21, weapon: 60, avatarDefinition: definition, hasEnteredGame: true,
        avatarAppearance: appearance.resolveAvatarAppearance(definition, 1),
        updateHitPoints: jest.fn(), broadcast: jest.fn(), connection: {send: jest.fn()},
        server: {server: {cache: {get: () => session, set: jest.fn()}}},
        _getBaseState: () => [42, Types.Entities.WARRIOR, 10, 20]
    });
    return {player, session, save};
}

test('an event level boost does not evolve; reaching an earned threshold broadcasts to owner and neighbours once', async () => {
    const {player} = setup();
    expect(player.getLevel()).toBe(999);
    await player.handleExperience(399);
    expect(player.avatarAppearance.evolutionLevel).toBe(1);
    await player.handleExperience(1);
    expect(player.broadcast).toHaveBeenCalledTimes(1);
    const [message, ignoreSelf] = player.broadcast.mock.calls[0];
    expect(ignoreSelf).toBe(false);
    expect(message.serialize()).toEqual([Types.Messages.AVATAR_APPEARANCE, 42,
        expect.objectContaining({tokenHash: 'first', evolutionLevel: 5, canHoldWeapon: false}), true]);
    await player.handleExperience(1);
    expect(player.broadcast).toHaveBeenCalledTimes(1);
    expect(player.weapon).toBe(60);
    expect(player.armor).toBe(21);
});

test('a persisted farming award skips straight to the highest form without adding weapon or avatar XP writes', async () => {
    const {player, save, session} = setup();
    await player.applyPersistedExperience(2100);
    expect(player.avatarAppearance).toMatchObject({evolutionLevel: 20, tokenHash: 'final'});
    expect(player.broadcast).toHaveBeenCalledTimes(1);
    await player.applyPersistedExperience(2100);
    expect(player.broadcast).toHaveBeenCalledTimes(1);
    expect(player.accumulatedExperience).toBe(0);
    expect(save).not.toHaveBeenCalled();
    expect(session.xp).toBe(2100);
});

test('a larger persisted XP response also updates the appearance', async () => {
    const {player, save} = setup();
    await player.handleExperience(1);
    await player.syncExperience();
    expect(save).toHaveBeenCalledWith('0xavatar', 1);
    expect(player.avatarAppearance.evolutionLevel).toBe(20);
    expect(player.broadcast).toHaveBeenCalledTimes(1);
});

test('spawn and welcome carry the current form for late joiners and reconnects without replaying celebration', () => {
    const {player} = setup();
    player.hasEnteredGame = false;
    player.level = 22;
    player.updateAvatarAppearance();
    expect(player.broadcast).not.toHaveBeenCalled();
    expect(new Messages.Spawn(player).serialize()[13]).toEqual(player.avatarAppearance);
    player.send([Types.Messages.WELCOME, 42, 'Player', 10, 20, 100, '', 1000]);
    expect(player.connection.send.mock.calls[0][0].slice(8)).toEqual([null, player.avatarAppearance]);
});

test('queued appearance messages preserve the form at the time of each transition', () => {
    const {player} = setup();
    player.level = 5;
    player.updateAvatarAppearance();
    player.level = 20;
    player.updateAvatarAppearance();
    expect(player.broadcast.mock.calls.map(([message]) => message.serialize()[2].evolutionLevel)).toEqual([5, 20]);
});

test('legacy sessions and unchanged forms do not send redundant updates', () => {
    const {player} = setup();
    player.updateAvatarAppearance();
    player.avatarDefinition = null;
    player.updateAvatarAppearance();
    expect(player.broadcast).not.toHaveBeenCalled();
});

test('login resolves the trusted form before world entry and sends it without a celebration', async () => {
    const {player, session} = setup();
    Object.assign(session, {nftId: player.nftId, walletId: 'wallet', avatar: player.avatarDefinition,
        xp: 2000, mapId: 'main', x: 10, y: 20, gameData: {}});
    const entered = jest.fn(p => expect(p.avatarAppearance.evolutionLevel).toBe(20));
    Object.assign(player.server, {id: 'world_main', addPlayer: jest.fn(), enter_callback: entered});
    Object.assign(player, {hasEnteredGame: false, resetTimeout: jest.fn(),
        equipArmor: jest.fn(), equipWeapon: jest.fn(), setPosition: jest.fn(), isBot: () => false,
        startFlowPolling: jest.fn().mockResolvedValue(),
        playerEventBroker: {setPlayer: jest.fn(), spawnEvent: jest.fn()}});
    await player.handleMessage([Types.Messages.HELLO, 'Player', 999, 60, 'session', {tokenHash: 'forged'}]);
    expect(entered).toHaveBeenCalledTimes(1);
    expect(player.avatarAppearance).toMatchObject({nftId: '0xavatar', tokenHash: 'final', evolutionLevel: 20});
    expect(player.connection.send.mock.calls[0][0][9]).toEqual(player.avatarAppearance);
    expect(player.broadcast).not.toHaveBeenCalled();
});

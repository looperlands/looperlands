const fs = require('fs'), vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');
function setup() {
    let methods;
    function PlayerClass() {}
    vm.runInNewContext(fs.readFileSync(require.resolve('./player'), 'utf8'), {
        module: {exports: {}}, process: {env: {}}, console, FormatChecker: function () {}, performance: {now: () => 1000},
        Character: {extend: value => {methods = value; return PlayerClass;}},
        require: name => {
            if (name === '../../shared/js/gametypes') return Types;
            if (name === './format') return {check: () => true};
            if (name === './quests/playereventbroker.js') return {PlayerEventBroker: function () {this.spawnEvent = jest.fn();}};
            if (name === './looperlandsplatformclient.js') return {LooperLandsPlatformClient: function () {}};
            return {};
        }
    });
    const player = Object.assign(new PlayerClass(), methods, {_super: () => {}});
    const connection = {id: 42, listen: jest.fn(), onClose: jest.fn(), close: jest.fn(), sendUTF8: jest.fn()};
    const world = Object.fromEntries(['addEntity', 'addPlayer', 'enter_callback', 'pushRelevantEntityListTo', 'pushToggledLayersTo', 'pushTileStagesTo'].map(key => [key, jest.fn()]));
    player.init(connection, world);
    Object.assign(player, {hasEnteredGame: true, isDead: true, sessionId: 'same-session', lastCheckpoint: {id: 3},
        id: 42, level: 9, weapon: 'same-weapon', resetTimeout: jest.fn(), clearTarget: jest.fn(),
        updatePosition: jest.fn(() => {player.x = 12; player.y = 20;}),
        updateHitPoints: jest.fn(() => {player.hitPoints = 200;}), send: jest.fn(), startFlowPolling: jest.fn().mockResolvedValue()});
    return {player, world, receive: connection.listen.mock.calls[0][0], connection};
}

test('dead HELLO revives in the same authenticated session at the server checkpoint exactly once', async () => {
    const {player, world, receive, connection} = setup();
    await receive([Types.Messages.HELLO, 'ignored', 'ignored', 'ignored', 'same-session']);
    expect(player).toMatchObject({isDead: false, id: 42, level: 9, weapon: 'same-weapon', x: 12, y: 20});
    expect(player.send).toHaveBeenCalledWith([Types.Messages.WELCOME, 42, undefined, 12, 20, 200, undefined, 1000]);
    expect(world.addEntity).toHaveBeenCalledWith(player);
    expect(world.addPlayer).not.toHaveBeenCalled();
    expect(world.enter_callback).not.toHaveBeenCalled();
    expect(player.playerEventBroker.spawnEvent).toHaveBeenCalledWith(player, 3);
    expect(player.revive()).toBe(false);
    expect(world.addEntity).toHaveBeenCalledTimes(1);
    expect(connection.close).not.toHaveBeenCalled();
});

test('dead players cannot move or replace the authenticated session', async () => {
    const {player, world, receive} = setup();
    await receive([Types.Messages.MOVE, 99, 99]);
    await receive([Types.Messages.HELLO, '', '', '', 'other-session']);
    expect(player.isDead).toBe(true);
    expect(world.addEntity).not.toHaveBeenCalled();
    expect(player.updatePosition).not.toHaveBeenCalled();
});

test('spawn flows wait for their handlers and are skipped if another death intervenes', async () => {
    const {player} = setup();
    let resolve;
    player.startFlowPolling = () => new Promise(done => {resolve = done;});
    expect(player.revive()).toBe(true);
    expect(player.playerEventBroker.spawnEvent).not.toHaveBeenCalled();
    player.isDead = true;
    resolve(); await Promise.resolve();
    expect(player.playerEventBroker.spawnEvent).not.toHaveBeenCalled();
});

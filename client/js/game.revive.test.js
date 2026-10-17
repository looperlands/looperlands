const fs = require('fs'), vm = require('vm');
const source = fs.readFileSync(require.resolve('./game'), 'utf8');
let methods;
const sandbox = {console, setTimeout, clearTimeout, Class: {extend: value => value},
    define: (dependencies, factory) => { methods = factory(...dependencies.map(() => function () {})); }};
vm.runInNewContext(source, sandbox);

function setup(reduced = false) {
    const player = {id: 42, isDead: true, level: 9, weaponName: 'NFT_equipped',
        movement: {stop: jest.fn()}, stopBlinking: jest.fn(), disengage: jest.fn(), idle: jest.fn(),
        forEachAttacker: callback => callback({disengage: jest.fn(), idle: jest.fn()}), setVisible: jest.fn()};
    const game = Object.assign(Object.create(methods), {player, currentTime: 100,
        client: {connection: {connected: true}}, entities: {42: player}, floats: {},
        conversationHold: {stop: jest.fn()}, app: {settings: {getReducedMotion: () => reduced},
            closeChoicesPopup: jest.fn(), setReviving: jest.fn(), hideDeath: jest.fn()},
        combatFeedback: {clear: jest.fn()}, toolImpactFeedback: {clear: jest.fn()},
        audioManager: {fadeOutCurrentMusic: jest.fn(), playSound: jest.fn()},
        removeEntity: jest.fn(), updateBuffInfo: jest.fn(), playerdeath_callback: jest.fn(), sendHello: jest.fn()});
    return {game, player};
}

afterEach(() => jest.useRealTimers());

test.each([[false, 1000], [true, 120]])('death dissolves promptly and retains the avatar and socket (reduced motion=%s)', (reduced, duration) => {
    jest.useFakeTimers();
    // The production methods use the same host timers as the browser.
    sandbox.setTimeout = setTimeout; sandbox.clearTimeout = clearTimeout;
    const {game, player} = setup(reduced);
    game.beginPlayerDeath();
    expect(player.movement.stop).toHaveBeenCalledTimes(1);
    expect(player.pixelDissolve).toMatchObject({duration, incoming: false});
    expect(game.restart()).toBe(false);
    jest.advanceTimersByTime(duration - 1);
    expect(game.playerdeath_callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(game.removeEntity).toHaveBeenCalledWith(player);
    expect(game.player).toBe(player);
    expect(game.playerdeath_callback).toHaveBeenCalledTimes(1);
    expect(game.restart()).toBe(true);
    expect(game.restart()).toBe(false);
    expect(game.sendHello).toHaveBeenCalledTimes(1);
    expect(game.app.setReviving).toHaveBeenCalledTimes(1);
});

test('disconnect during dissolution cannot replace the reconnect prompt', () => {
    jest.useFakeTimers(); sandbox.setTimeout = setTimeout; sandbox.clearTimeout = clearTimeout;
    const {game} = setup();
    game.beginPlayerDeath(); game.disconnected = true;
    jest.advanceTimersByTime(1100);
    expect(game.playerdeath_callback).not.toHaveBeenCalled();
    expect(game.restart()).toBe(false);
});

test('revive refreshes stale entity grids but keeps equipment, level, avatar and listeners', () => {
    const {game, player} = setup();
    const callback = jest.fn(); player.move_callback = callback;
    game.floats = {42: {despawnTimeout: 1}};
    game.removeFloat = jest.fn();
    for (const name of ['initEntityGrid', 'initItemGrid', 'initPathingGrid', 'applyToggledLayers', 'initRenderingGrid']) game[name] = jest.fn();
    game.prepareRevivedPlayer();
    expect(game.entities).toEqual({});
    expect(game.player).toBe(player);
    expect(player).toMatchObject({isDead: false, isRooted: false, level: 9, weaponName: 'NFT_equipped', move_callback: callback});
    expect(game.removeFloat).toHaveBeenCalledWith('42');
    expect(game.initItemGrid).toHaveBeenCalledTimes(1);
    expect(game.initRenderingGrid).toHaveBeenCalledTimes(1);
});

test('revive WELCOME restores health and position once without recreating game inputs', () => {
    const {game, player} = setup();
    let welcome;
    game.client.onWelcome = callback => { welcome = callback; };
    Object.assign(game, {reviving: true, storage: {incrementRevives: jest.fn()},
        renderer: {getEntityBoundingRect: () => ({})},
        app: {...game.app, initEquipmentIcons: jest.fn()}});
    for (const name of ['prepareRevivedPlayer', 'updateBars', 'resetCamera', 'updatePlateauMode', 'syncWorldTime', 'addEntity', 'startScenePolling', 'handleScene', 'renderStatistics', 'gamestart_callback']) game[name] = jest.fn();
    player.setGridPosition = jest.fn(); player.setMaxHitPoints = jest.fn();
    game.audioManager.updateMusic = jest.fn();
    const start = source.indexOf('this.client.onWelcome(');
    const end = source.indexOf('                    if (!self.storage.hasAlreadyPlayed()) {', start);
    vm.runInNewContext(source.slice(start, end).replace('this.client.onWelcome', 'self.client.onWelcome') + '});', {self: game, setTimeout: jest.fn(), console});
    welcome(42, 'Looper', 12, 20, 200, 'Explorer', 1234);
    expect(player.setGridPosition).toHaveBeenCalledWith(12, 20);
    expect(player.setMaxHitPoints).toHaveBeenCalledWith(200);
    expect(player.pixelDissolve).toMatchObject({incoming: true, duration: 1000});
    expect(game.reviving).toBe(false);
    expect(game.storage.incrementRevives).toHaveBeenCalledTimes(1);
    expect(game.app.hideDeath).toHaveBeenCalledTimes(1);
    expect(game.gamestart_callback).not.toHaveBeenCalled();
});

test('death invalidates an outstanding movement worker reply before retaining the avatar for revive', async () => {
    jest.useFakeTimers(); sandbox.setTimeout = setTimeout; sandbox.clearTimeout = clearTimeout;
    const modules = {};
    const context = {Types: {Orientations: {DOWN: 2}},
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => modules[name]));
        }};
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), context);
    for (const name of ['entity', 'transition', 'timer', 'character']) {
        vm.runInContext(fs.readFileSync(require.resolve('./' + name), 'utf8'), context);
        modules[name] = modules.current;
    }
    const {game, player: stubs} = setup();
    const player = Object.assign(new modules.character(42, 1), stubs);
    game.player = player;
    let finish;
    player.onRequestPath(() => new Promise(resolve => {finish = resolve;}));
    player.followPath = jest.fn();
    player.moveTo_(4, 5);
    game.beginPlayerDeath();
    finish([[2, 2], [3, 2], [4, 5]]);
    await Promise.resolve();
    expect(player.followPath).not.toHaveBeenCalled();
    expect(player.path).toBeNull();
});

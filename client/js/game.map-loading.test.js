const fs = require('fs'), vm = require('vm');
beforeEach(() => jest.useFakeTimers());
afterEach(() => {jest.clearAllTimers(); jest.useRealTimers();});

function gameFixture(recovering = false) {
    let methods;
    function Mapx() {this.ready = (_ready, failed) => {this.failed = failed;};}
    vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), {
        console: {log: jest.fn()}, setInterval, clearInterval,
        Class: {extend: value => value},
        define: (dependencies, factory) => {methods = factory(...dependencies.map(name => name === 'map' ? Mapx : function () {}));},
    });
    const game = Object.assign(Object.create(methods), {
        combatFeedback: {clear: jest.fn()}, toolImpactFeedback: {clear: jest.fn()}, infoManager: {clear: jest.fn()},
        storage: {setMapId: jest.fn()}, renderer: {upscaledRendering: true, camera: {}},
        app: {clientUpdates: {recovering, failRecovery: jest.fn()}, showDeath: jest.fn()},
        loadSprites: jest.fn(), setUpdater: jest.fn(), setSpriteScale: jest.fn(), connect: jest.fn(), spritesLoaded: jest.fn(),
    });
    return game;
}

test.each([false, true])('map failures expose reconnect controls during startup (update recovery=%s)', recovering => {
    const game = gameFixture(recovering); game.loadMap('duckville'); game.map.failed();
    if (recovering) {
        expect(game.app.clientUpdates.failRecovery).toHaveBeenCalledTimes(1);
        expect(game.app.showDeath).not.toHaveBeenCalled();
    } else {
        expect(game.app.showDeath).toHaveBeenCalledWith(expect.stringContaining('map could not be loaded'));
        expect(game.app.clientUpdates.failRecovery).not.toHaveBeenCalled();
    }
});

test('a stale map failure cannot replace the current game with an error prompt', () => {
    const game = gameFixture(); game.loadMap('duckville');
    const failed = game.map.failed; game.map = {}; failed();
    expect(game.app.showDeath).not.toHaveBeenCalled();
});

test('startup stops polling failed maps without opening a server connection', () => {
    const game = gameFixture(); game.map = {loadError: new Error('Map failed')};
    game.run(); jest.advanceTimersByTime(1000);
    expect(jest.getTimerCount()).toBe(0);
    expect(game.connect).not.toHaveBeenCalled();
    expect(game.spritesLoaded).not.toHaveBeenCalled();
});

test.each([false, true])('a failed sprite stops startup and exposes recovery controls (update recovery=%s)', recovering => {
    const game = gameFixture(recovering);
    game.map = {isLoaded: true};
    game.sprites = {missing: {id: 'missing-sprite', filepath: 'img/1/missing-sprite.png', loadError: new Error('404')}};
    game.run(); jest.advanceTimersByTime(1000);
    expect(jest.getTimerCount()).toBe(0);
    expect(game.connect).not.toHaveBeenCalled();
    if (recovering) {
        expect(game.app.clientUpdates.failRecovery).toHaveBeenCalledTimes(1);
    } else {
        expect(game.app.showDeath).toHaveBeenCalledWith(expect.stringContaining('img/1/missing-sprite.png'));
    }
});

test('the play-button poll also stops and removes its spinner after a map failure', () => {
    let methods;
    vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
        console: {debug: jest.fn()}, setInterval, clearInterval, setTimeout,
        Class: {extend: value => value}, define: (_dependencies, factory) => {methods = factory();},
    });
    const play = {addClass: jest.fn(), removeClass: jest.fn()};
    const app = Object.assign(Object.create(methods), {isDesktop: true, ready: true,
        $playButton: play, $playDiv: {unbind: jest.fn()}, game: {map: {isLoaded: false}}, startGame: jest.fn()});
    app.tryStartingGame('Looper', 'duckville');
    expect(play.addClass).toHaveBeenCalledWith('loading');
    app.game.map.loadError = new Error('Map failed');
    jest.advanceTimersByTime(1000);
    expect(play.removeClass).toHaveBeenCalledWith('loading');
    expect(jest.getTimerCount()).toBe(0);
    expect(app.startGame).not.toHaveBeenCalled();
});

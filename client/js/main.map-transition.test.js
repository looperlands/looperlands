const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function setup() {
    let started;
    const game = {
        renderer: {tablet: false}, client: {connection: {map: 'first'}},
        setup: jest.fn(), setStorage: jest.fn(),
        onGameStart(callback) {started = callback;},
    };
    const gameEvents = ['Disconnect', 'PlayerDeath', 'PlayerEquipmentChange', 'PlayerInvincible', 'NbPlayersChange',
        'AchievementUnlock', 'QuestHandout', 'PlayerChoice', 'Notification'];
    gameEvents.forEach(name => {game['on' + name] = jest.fn();});
    const app = new Proxy({
        isDesktop: false,
        storage: {data: {player: {name: 'Player'}, mapId: 'first'}},
        settings: {getFullscreen: () => false},
        initEquipmentIcons: jest.fn(),
    }, {
        get(target, key) {
            if (!(key in target)) target[key] = jest.fn();
            return target[key];
        },
    });
    const chain = new Proxy({}, {get: () => () => chain});
    const resizeBindings = new Map();
    const $ = selector => selector === document ? {ready: callback => callback(),
        mousemove: () => chain, keydown: () => chain, bind: () => chain}
        : selector === '#resize-check' ? {bind(type, callback) {resizeBindings.set(type, callback);}} : chain;
    const document = {getElementById: jest.fn(), addEventListener: jest.fn()};
    const window = {addEventListener: jest.fn(), location: {search: ''},
        visualViewport: {addEventListener: jest.fn()}};
    const startUpdates = jest.fn();
    const KeyBoardHandler = jest.fn();
    const TouchListener = jest.fn();
    const GamePadListener = jest.fn();
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8'), {
        document, window, URLSearchParams, console: {log: jest.fn()},
        KeyBoardHandler, TouchListener, GamePadListener, TRANSITIONEND: 'transitionend',
        Detect: {isWindows: () => false, isOpera: () => false}, Types: {MAX_CHAT_LENGTH: 300, emotions: {}},
        require: (names, callback) => callback(function Game() {return game;}),
        define: (names, factory) => factory($, function App() {return app;}, function ClientUpdates() {
            return {loadSession: () => Promise.resolve(), start: startUpdates};
        }),
    });
    await Promise.resolve();
    return {started, game, app, window, resizeBindings, KeyBoardHandler, TouchListener, GamePadListener, startUpdates};
}

test('another map welcome updates the socket and icons without duplicating input listeners', async () => {
    const {started, game, app, KeyBoardHandler, TouchListener, GamePadListener, startUpdates} = await setup();
    expect(typeof started).toBe('function');
    started();
    const keyboard = game.keyboardHandler;
    const touch = game.touchListener;
    const gamepad = game.gamepadListener;
    const nextSocket = {map: 'next'};
    game.client.connection = nextSocket;
    started();

    expect(KeyBoardHandler).toHaveBeenCalledTimes(1);
    expect(TouchListener).toHaveBeenCalledTimes(1);
    expect(GamePadListener).toHaveBeenCalledTimes(1);
    expect(game.keyboardHandler).toBe(keyboard);
    expect(game.touchListener).toBe(touch);
    expect(game.gamepadListener).toBe(gamepad);
    expect(startUpdates).toHaveBeenCalledTimes(2);
    expect(startUpdates).toHaveBeenLastCalledWith(nextSocket);
    expect(app.initEquipmentIcons).toHaveBeenCalledTimes(2);
});


test('startup, rotation, Safari viewport changes, and CSS breakpoints share the scheduled resize', async () => {
    const {app, window, resizeBindings, started} = await setup();
    expect(app.resizeUi).toHaveBeenCalledTimes(1);
    app.scheduleResize.mockClear();

    for (const [target, type] of [
        [window, 'resize'], [window, 'orientationchange'],
        [window.visualViewport, 'resize'], [window.visualViewport, 'scroll'],
    ]) {
        const binding = target.addEventListener.mock.calls.find(([event]) => event === type);
        expect(binding).toBeDefined();
        binding[1]();
    }
    for (const type of ['transitionend', 'webkitTransitionEnd', 'oTransitionEnd']) {
        expect(resizeBindings.has(type)).toBe(true);
        resizeBindings.get(type)();
    }
    expect(app.scheduleResize).toHaveBeenCalledTimes(7);

    app.scheduleResize.mockClear();
    started();
    expect(app.scheduleResize).toHaveBeenCalledTimes(1);
});

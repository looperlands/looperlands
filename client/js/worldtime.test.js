const fs = require('fs'), path = require('path'), vm = require('vm');
const WorldTime = require('./worldtime-worker');
const minute = 60000;

test.each([[0, 1], [20, 1], [40, 1], [42.5, 0.5], [45, 0], [50, 0], [55, 0], [57.5, 0.5], [60, 1], [102.5, 0.5], [-2.5, 0.5]])(
    'the established one-hour world curve has daylight %s minutes into the cycle', (minutes, daylight) => {
        expect(WorldTime.mainDaylight(minutes * minute)).toBeCloseTo(daylight);
    });

function gameClock(clock) {
    let definition;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), {
        performance: {now: () => clock.now}, Class: {extend: value => {definition = value; return value;}},
        define: (dependencies, factory) => factory(...dependencies.map(name => name === 'worldtime-worker' ? WorldTime : {}))
    });
    const game = Object.create(definition); game.app = {};
    return game;
}

test('players joining at different browser uptimes see the same server clock and reconnect without shifting it', () => {
    const firstClock = {now: 1000}, secondClock = {now: 90000};
    const first = gameClock(firstClock), second = gameClock(secondClock);
    first.syncWorldTime(50 * minute); second.syncWorldTime(50 * minute);
    expect(first.getWorldTime()).toBe(second.getWorldTime());
    firstClock.now += 16000; secondClock.now += 16000;
    expect(first.getWorldTime()).toBe(50 * minute + 16000);
    expect(second.getWorldTime()).toBe(first.getWorldTime());
    second.syncWorldTime(50 * minute + 16000);
    expect(second.getWorldTime()).toBe(first.getWorldTime());
});

test('the HUD reads the same clock and preview phase as lighting and fireflies', () => {
    const game = gameClock({now: 1000}); game.syncWorldTime(42.5 * minute);
    let tick, app, displayed;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), {
        Class: {extend: value => value}, setInterval: callback => {tick = callback;},
        define: (dependencies, factory) => {app = factory(() => ({text: value => {displayed = value;}}));}
    });
    app.game = game; app.calculateTime(); tick();
    expect(displayed).toBe('17:00');
    game.previewTimeMode = 'night'; tick();
    expect(displayed).toBe('20:00');
    expect(WorldTime.mainDaylight(game.getWorldTime())).toBe(0);
    game.previewTimeMode = 'day'; tick();
    expect(displayed).toBe('08:00');
    expect(WorldTime.mainDaylight(game.getWorldTime())).toBe(1);
    game.previewTimeMode = 'cycle'; tick();
    expect(displayed).toBe('17:00');
});

function lighting() {
    const context = {clearRect: jest.fn(), fillRect: jest.fn()};
    const sandbox = {self: {}, performance: {now: () => 9999999}};
    sandbox.importScripts = jest.fn(file => vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), sandbox));
    const api = vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'renderer-webworker.js'), 'utf8') + `
        canvases.lighting = {width: 960, height: 448}; contexes.lighting = testContext;
        playerPosition = {x: 0, y: 0}; drawLightSource = () => {};
        ({renderLightOverlay, intensity: () => GLOBAL_LIGHT_INTENSITY});`, {...sandbox, testContext: context});
    // importScripts must execute in the same worker global, as it does in production.
    return {api, context, imports: sandbox.importScripts};
}

test('Town and Forest use identical renderer lighting at dusk and night, while interiors keep authored darkness', () => {
    const {api, context, imports} = lighting();
    const scenes = require('../../server/maps/world_server_main.json').scenes;
    for (const time of [20, 42.5, 50, 57.5].map(value => value * minute)) {
        const expected = 0.18 + WorldTime.mainDaylight(time) * 0.77;
        for (const name of ['Town', 'Forest', 'Beach', 'Desert']) {
            api.renderLightOverlay([], 0, 0, 1, 0, scenes.find(scene => scene.name === name), [], {}, 'main', time);
            expect(api.intensity()).toBeCloseTo(expected);
            expect(context.fillRect.mock.calls.at(-2)).toEqual([0, 0, 960, 448]);
        }
    }
    expect(imports).toHaveBeenCalledTimes(1);
    api.renderLightOverlay([], 0, 0, 1, 0, scenes.find(scene => scene.name === 'Windmill'), [], {}, 'main', 50 * minute);
    expect(api.intensity()).toBe(0.5);
});

test('custom local hours freeze the same HUD, lighting and schedule clock, then cycle resumes', () => {
    const game = gameClock({now: 1000}); game.syncWorldTime(42.5 * minute);
    game.previewTimeMode = 'cycle'; game.previewHour = 22;
    expect(game.getWorldTime()).toBe(22 / 24 * WorldTime.duration);
    expect(WorldTime.mainDaylight(game.getWorldTime())).toBe(0);
    game.previewHour = null;
    expect(game.getWorldTime()).toBe(42.5 * minute);
    for (const hour of [-1, 24, NaN, '22']) expect(WorldTime.previewTime('cycle', 100, hour)).toBe(100);
});

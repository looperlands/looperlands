const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup({fullscreen = true, viewport, container = {offsetWidth: 980, offsetHeight: 504, style: {}}} = {}) {
    const frames = [];
    const window = {
        innerWidth: 1280, innerHeight: 720, visualViewport: viewport,
        requestAnimationFrame: jest.fn(callback => {frames.push(callback); return frames.length;}),
    };
    const document = {getElementById: jest.fn(() => container)};
    let methods;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), {
        document, window, Class: {extend: value => value},
        define: (dependencies, factory) => {methods = factory();},
    });
    const app = Object.create(methods);
    app.settings = {getFullscreen: () => fullscreen};
    return {app, container, window, document, frames};
}

function fittedScale(container) {
    return Number(container.style.transform.match(/scale\(([^)]+)\)/)[1]);
}

test('mobile startup and rotation center the entire frame in the visible viewport', () => {
    const viewport = {width: 390, height: 760, offsetLeft: 0, offsetTop: 0};
    const {app, container} = setup({viewport});
    app.fitGameToViewport();
    expect(container.style).toMatchObject({position: 'fixed', margin: '0', left: '195px', top: '380px'});
    expect(container.style.transform).toContain('translate(-50%, -50%)');
    expect(fittedScale(container)).toBeCloseTo(390 / 980 * 0.95);

    Object.assign(viewport, {width: 844, height: 300, offsetLeft: 0, offsetTop: 0});
    app.fitGameToViewport();
    expect(container.style).toMatchObject({left: '422px', top: '150px'});
    expect(fittedScale(container)).toBeCloseTo(300 / 504 * 0.95);
});

test('Safari viewport offsets and browser chrome changes determine fit and center', () => {
    const viewport = {width: 844, height: 330, offsetLeft: 35, offsetTop: 18};
    const {app, container} = setup({viewport});
    app.fitGameToViewport();
    expect(container.style).toMatchObject({left: '457px', top: '183px'});
    expect(fittedScale(container)).toBeCloseTo(330 / 504 * 0.95);

    viewport.height = 390;
    viewport.offsetTop = 0;
    app.fitGameToViewport();
    expect(container.style.top).toBe('195px');
    expect(fittedScale(container)).toBeCloseTo(390 / 504 * 0.95);
});

test('browsers without visualViewport use the window dimensions', () => {
    const {app, container} = setup();
    app.fitGameToViewport();
    expect(container.style).toMatchObject({left: '640px', top: '360px'});
    expect(fittedScale(container)).toBeCloseTo(Math.min(1280 / 980, 720 / 504) * 0.95);
});

test('disabling fullscreen resets an old fit while retaining viewport centering', () => {
    const {app, container} = setup({fullscreen: false});
    container.style.transform = 'scale(2)';
    app.fitGameToViewport();
    expect(fittedScale(container)).toBe(1);
    expect(container.style).toMatchObject({left: '640px', top: '360px'});
    expect(container.style.transform).toContain('translate(-50%, -50%)');
});

test.each([
    ['missing container', null],
    ['portrait container with no layout width', {offsetWidth: 0, offsetHeight: 258, style: {}}],
    ['portrait container with no layout height', {offsetWidth: 480, offsetHeight: 0, style: {}}],
])('%s does not write an invalid transform', (name, container) => {
    const {app} = setup({container});
    expect(() => app.fitGameToViewport()).not.toThrow();
    if (container) expect(container.style).toEqual({});
});

test('resize bursts coalesce and measure the final orientation on the next frame', () => {
    const {app, window, frames, container} = setup();
    app.resizeUi = jest.fn(() => app.fitGameToViewport());
    app.scheduleResize();
    app.scheduleResize();
    app.scheduleResize();
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(app.resizeUi).not.toHaveBeenCalled();
    window.innerWidth = 844;
    window.innerHeight = 390;
    frames.shift()();
    expect(app.resizeUi).toHaveBeenCalledTimes(1);
    expect(container.style).toMatchObject({left: '422px', top: '195px'});
    app.scheduleResize();
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
});

test('a running game refreshes the renderer and bars before fitting, even with fullscreen disabled', () => {
    const {app} = setup({fullscreen: false});
    const calls = [];
    app.game = {started: true, resize: jest.fn(() => calls.push('renderer')), updateBars: jest.fn(() => calls.push('bars'))};
    app.initHealthBar = jest.fn(() => calls.push('health'));
    app.fitGameToViewport = jest.fn(() => calls.push('fit'));
    app.resizeUi();
    expect(calls).toEqual(['renderer', 'health', 'bars', 'fit']);
});

test('before game start the renderer is rescaled before fitting', () => {
    const {app} = setup();
    const calls = [];
    app.game = {started: false, renderer: {
        getScaleFactor: jest.fn(() => 2), rescale: jest.fn(scale => calls.push(['renderer', scale])),
    }};
    app.fitGameToViewport = jest.fn(() => calls.push(['fit']));
    app.resizeUi();
    expect(calls).toEqual([['renderer', 2], ['fit']]);
});

test('fitting is safe before a game exists', () => {
    const {app} = setup();
    app.fitGameToViewport = jest.fn();
    app.resizeUi();
    expect(app.fitGameToViewport).toHaveBeenCalledTimes(1);
});

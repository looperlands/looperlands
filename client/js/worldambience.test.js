const fs = require('fs');
const path = require('path');
const vm = require('vm');

const config = {particles: 'fireflies', particleCount: 12};
const WorldTime = require('./worldtime-worker');

function setup(reducedMotion = false) {
    let WorldAmbience;
    const document = {getElementById: id => id === 'canvas' ? {appendChild: jest.fn()} : null, createElement: jest.fn()};
    const requestAnimationFrame = jest.fn();
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'worldambience.js'), 'utf8'), {
        document, window: {matchMedia: () => ({matches: reducedMotion})}, Date,
        requestAnimationFrame, define: factory => { WorldAmbience = factory(); }
    });
    const worker = {self: {WorldTime, WorldParticles: require('./worldparticles-worker')}, console, postMessage: jest.fn(), requestAnimationFrame,
        importScripts: jest.fn(), Date: {now: () => 100000}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'renderer-webworker.js'), 'utf8'), worker);
    const contexts = {};
    for (const id of ['background', 'entities', 'text', 'high', 'highEntities', 'lighting', 'aboveLight', 'combined']) {
        const context = {clearRect: jest.fn(), save: jest.fn(), restore: jest.fn(), translate: jest.fn(),
            beginPath: jest.fn(), rect: jest.fn(), clip: jest.fn(), fillRect: jest.fn(), drawImage: jest.fn(), createRadialGradient: jest.fn(() => ({addColorStop: jest.fn()}))};
        contexts[id] = context;
        worker.onmessage({data: {type: 'setCanvas', id, canvas: {width: 960, height: 448, getContext: () => context}}});
    }
    const render = (ambience, cameraX = 32, cameraY = 16, scale = 2, worldTime = 50 * 60000) => worker.onmessage({data: {
        type: 'render', player: {x: 0, y: 0}, ambience, worldTime,
        renderData: [{type: 'render', id: 'background', tiles: [], cameraX, cameraY, scale, clear: true},
            {type: 'entities', id: 'entities', entityData: [], cameraX, cameraY, scale}]
    }});
    return {ambience: new WorldAmbience(), document, worker, render, context: contexts.combined, requestAnimationFrame};
}

function core(context, scale) {
    return context.fillRect.mock.calls.find(([x, y, width, height]) =>
        width === 2 * scale && height === 2 * scale && x > 100 && y > 100);
}

test('configuration supplies the worker without creating an overlay or animation loop', () => {
    const {ambience, document, requestAnimationFrame} = setup();
    ambience.setConfig(config);
    expect(ambience.getRenderState()).toEqual({...config, reducedMotion: false});
    expect(document.createElement).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    ambience.clear();
    expect(ambience.getRenderState()).toBeNull();
});

test('fireflies are composited after scenery and lighting in the same render frame', () => {
    const {render, context, requestAnimationFrame} = setup();
    render({...config, reducedMotion: false});
    expect(context.createRadialGradient).toHaveBeenCalled();
    expect(core(context, 2)).toBeDefined();
    expect(context.fillRect.mock.invocationCallOrder[0]).toBeGreaterThan(
        context.drawImage.mock.invocationCallOrder.at(-1));
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(context.globalCompositeOperation).toBe('source-over');
});

test('fireflies use the exact terrain camera on scrolling and reversal without settling drift', () => {
    const {render, context} = setup();
    const state = {...config, reducedMotion: false};
    render(state, 0, 0, 2);
    const first = core(context, 2);
    for (const [x, y] of [[16, 8], [32, 16], [16, 8], [0, 0], [0, 0]]) {
        context.fillRect.mockClear();
        render(state, x, y, 2);
        const moved = core(context, 2);
        expect(moved[0]).toBeCloseTo(first[0] - x * 2);
        expect(moved[1]).toBeCloseTo(first[1] - y * 2);
    }
});

test('teleports and rescaling immediately use the new map coordinates', () => {
    const {render, context, worker} = setup();
    const view = {cameraX: 300, cameraY: 180, scale: 3};
    render({...config, reducedMotion: false}, view.cameraX, view.cameraY, view.scale);
    const expected = worker.ambienceParticlePositions(config, view, 100, 960, 448)
        .find(point => point.x > 100 && point.y > 100);
    const drawn = core(context, 3);
    expect(drawn[0]).toBeCloseTo(expected.x);
    expect(drawn[1]).toBeCloseTo(expected.y);
});

test('reduced motion omits particles without adding a lighting overlay', () => {
    const {ambience, render, context} = setup(true);
    ambience.setConfig(config);
    render(ambience.getRenderState());
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(context.createRadialGradient).not.toHaveBeenCalled();
});

test('forced day hides fireflies and leaving the scene clears the previous frame', () => {
    const {ambience, render, context} = setup();
    ambience.setConfig(config);
    render(ambience.getRenderState(), 32, 16, 2, 20 * 60000);
    expect(context.createRadialGradient).not.toHaveBeenCalled();
    expect(context.fillRect).not.toHaveBeenCalled();
    ambience.setConfig(config);
    render(ambience.getRenderState());
    expect(context.createRadialGradient).toHaveBeenCalled();
    context.fillRect.mockClear();
    context.clearRect.mockClear();
    ambience.setConfig(null);
    render(ambience.getRenderState());
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 960, 448);
    expect(context.fillRect).not.toHaveBeenCalled();
});

test('production snapshots keep preview controls hidden', () => {
    const {ambience} = setup();
    ambience.controls = {style: {display: 'flex'}};
    ambience.setConfig({...config, previewControls: false, story: {goal: 'Talk to Adam.'}});
    expect(ambience.controls.style.display).toBe('none');
});

test('glow follows the same world clock as terrain without tinting scene transitions', () => {
    const {render, context} = setup();
    const glow = () => Number(context.fillStyle.match(/,([^,]+)\)$/)[1]);
    render(config, 32, 16, 2, 42.5 * 60000);
    const duskGlow = glow();
    render(config, 32, 16, 2, 50 * 60000);
    expect(glow()).toBeCloseTo(duskGlow * 2);
    context.fillRect.mockClear();
    render({...config, particles: 'none'});
    expect(context.fillRect).not.toHaveBeenCalled();
});

test('a frozen preview phase still lets fireflies wander between render frames', () => {
    const {render, context, worker} = setup();
    render(config);
    const first = core(context, 2);
    context.fillRect.mockClear();
    worker.Date.now = () => 100016;
    render(config);
    const next = core(context, 2);
    expect(next[0]).not.toBe(first[0]);
    expect(Math.abs(next[0] - first[0])).toBeLessThan(1);
    expect(Math.abs(next[1] - first[1])).toBeLessThan(1);
});


test('area effect layers stay in the map worker and clip to scene bounds', () => {
    const {ambience, render, context, document} = setup();
    const state = {effects: [{type: 'leaves', count: 4}, {type: 'pollen', count: 3}], bounds: {x: 0, y: 0, width: 480, height: 224}};
    ambience.setConfig(state); render(ambience.getRenderState()); expect(context.clip).toHaveBeenCalledTimes(1);
    expect(context.rect).toHaveBeenCalledWith(-64, -32, 960, 448); expect(context.fillRect).toHaveBeenCalled();
    expect(document.createElement).not.toHaveBeenCalled();
});

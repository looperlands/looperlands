const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup(reducedMotion = false, clock = Date) {
    const context = {clearRect: jest.fn(), fillRect: jest.fn(),
        createRadialGradient: jest.fn(() => ({addColorStop: jest.fn()}))};
    const canvas = {style: {}, setAttribute: jest.fn(), getContext: () => context};
    const parent = {style: {}, appendChild: jest.fn()};
    const document = {hidden: false, createElement: () => canvas,
        getElementById: id => id === 'canvas' ? parent : {width: 960, height: 448}};
    const requestAnimationFrame = jest.fn(() => 7);
    const cancelAnimationFrame = jest.fn();
    const setTimeout = jest.fn(() => 8), clearTimeout = jest.fn();
    let WorldAmbience;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'worldambience.js'), 'utf8'), {
        document, window: {matchMedia: () => ({matches: reducedMotion})},
        requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout, Date: clock,
        define: factory => { WorldAmbience = factory(); }
    });
    return {ambience: new WorldAmbience(), canvas, context, parent, document, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout};
}

const config = {cycleSeconds: 180, nightOpacity: 0.12, particles: 'fireflies', particleCount: 12};

test('ambience overlays the game without blocking clicks and clears on disconnect', () => {
    const {ambience, canvas, parent, cancelAnimationFrame} = setup();
    ambience.setConfig(config);
    expect(parent.appendChild).toHaveBeenCalledWith(canvas);
    expect(canvas.style.cssText).toContain('pointer-events:none');
    expect(canvas.width).toBe(960);
    expect(canvas.height).toBe(448);
    expect(canvas.style.display).toBe('block');
    ambience.setConfig(null);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(canvas.style.display).toBe('none');
    expect(ambience.config).toBeNull();
});

test('reduced motion removes animated particles and keeps the clock on a slow timer', () => {
    const {ambience, context, requestAnimationFrame} = setup(true);
    ambience.setConfig(config);
    expect(context.fillRect).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
});

test('forced night and day ignore the cycle phase, including reduced motion', () => {
    const {ambience, context} = setup(true);
    ambience.setConfig({...config, mode: 'night', nightOpacity: 0.3});
    expect(context.fillStyle).toBe('rgba(22,30,68,0.3)');
    ambience.setConfig({...config, mode: 'day', nightOpacity: 0.3});
    expect(context.fillStyle).toBe('rgba(22,30,68,0)');
});

test('hidden tabs skip drawing and replacing the configuration cancels the previous loop', () => {
    const {ambience, document, context, cancelAnimationFrame} = setup();
    document.hidden = true;
    ambience.setConfig(config);
    expect(context.fillRect).not.toHaveBeenCalled();
    document.hidden = false;
    ambience.setConfig({...config, particles: 'leaves'});
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(context.fillRect.mock.calls.length).toBeGreaterThan(1);
});

test('fireflies have luminous halos and stay at the same map position when the camera moves', () => {
    const {ambience, context} = setup();
    let view = {x: 32, y: 16, scale: 2};
    ambience.getView = () => view;
    ambience.setConfig({...config, mode: 'night'});
    expect(context.createRadialGradient).toHaveBeenCalled();
    expect(context.globalCompositeOperation).toBe('source-over');
    const core = context.fillRect.mock.calls.find(([, , width, height]) => width === 4 && height === 4);
    expect(core[0] % 1).not.toBe(0);
    const first = ambience.particlePositions(100, 960, 448).find(point => point.index === 1 && point.x > 100 && point.y > 100);
    view = {x: 42, y: 26, scale: 2};
    ambience.view = null;
    const moved = ambience.particlePositions(100, 960, 448).find(point => point.index === 1 && Math.abs(point.x - (first.x - 20)) < 0.001);
    expect(moved.y).toBeCloseTo(first.y - 20);
});

test('stepped camera updates interpolate continuously, settle, and snap on teleports', () => {
    const {ambience} = setup();
    let camera = {x: 0, y: 0, scale: 2};
    ambience.getView = () => camera;
    ambience.view = ambience.updateView(1000);
    camera = {x: 16, y: 8, scale: 2};
    ambience.view = ambience.updateView(1016);
    expect(ambience.view.x).toBeGreaterThan(0);
    expect(ambience.view.x).toBeLessThan(16);
    const first = ambience.view.x;
    ambience.view = ambience.updateView(1032);
    expect(ambience.view.x).toBeGreaterThan(first);
    for (let time = 1048; time < 1800; time += 16) ambience.view = ambience.updateView(time);
    expect(ambience.view.x).toBe(16);
    camera = {x: 300, y: 8, scale: 2};
    expect(ambience.updateView(1816).x).toBe(300);
});


test('production story snapshots never create the local preview guide', () => {
    const {ambience, parent} = setup();
    ambience.setConfig({...config, story: {title: 'The Lantern Picnic', goal: 'Talk to Adam.'}, previewStory: {goal: 'Preview only.'}});
    expect(parent.appendChild).toHaveBeenCalledTimes(1);
    expect(ambience.controls).toBeUndefined();
    expect(ambience.canvas.style.display).toBe('block');
});

test('a production snapshot hides controls left over from a local preview', () => {
    const {ambience} = setup();
    ambience.controls = {style: {display: 'flex'}};
    ambience.setConfig({...config, previewControls: false, story: {goal: 'Talk to Bstrat.'}});
    expect(ambience.controls.style.display).toBe('none');
});


test('scene changes keep the shared clock phase and fireflies glow only as world night arrives', () => {
    let now = 180000;
    const {ambience, context} = setup(false, {now: () => now});
    const tints = [];
    context.fillRect.mockImplementation(() => { if (String(context.fillStyle).startsWith('rgba(22,30,68,')) tints.push(context.fillStyle); });
    ambience.setConfig({...config, scene: 'Town', epoch: 0, serverTime: now});
    expect(context.createRadialGradient).not.toHaveBeenCalled();
    now = 225000;
    ambience.setConfig({...config, scene: 'Town', epoch: 0, serverTime: now});
    expect(context.createRadialGradient).toHaveBeenCalled();
    const town = tints.at(-1);
    ambience.setConfig({...config, scene: 'Town', particles: 'none', epoch: 0, serverTime: now});
    expect(tints.at(-1)).toBe(town);
    ambience.setConfig({...config, scene: 'Town', epoch: 0, serverTime: now});
    expect(tints.at(-1)).toBe(town);
    ambience.clear();
});

test('reduced motion lighting follows world time and cancels its timer on disconnect', () => {
    let now = 180000;
    const {ambience, context, setTimeout, clearTimeout} = setup(true, {now: () => now});
    ambience.setConfig({...config, epoch: 0, serverTime: now});
    expect(context.fillStyle).toBe('rgba(22,30,68,0)');
    now = 270000;
    setTimeout.mock.calls.at(-1)[0]();
    expect(context.fillStyle).toBe('rgba(22,30,68,0.12)');
    expect(context.createRadialGradient).not.toHaveBeenCalled();
    ambience.clear();
    expect(clearTimeout).toHaveBeenCalledWith(8);
});

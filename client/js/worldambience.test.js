const fs = require('fs');
const path = require('path');
const vm = require('vm');
const WorldTime = require('./worldtime-worker');
const WorldParticles = require('./worldparticles-worker');

function setup(reducedMotion = false, clock = Date, getWorldTime = () => 50 * 60000) {
    const context = {clearRect: jest.fn(), fillRect: jest.fn(), save: jest.fn(), restore: jest.fn(),
        translate: jest.fn(), rotate: jest.fn(), beginPath: jest.fn(), rect: jest.fn(), clip: jest.fn(),
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
        define: (dependencies, factory) => { WorldAmbience = factory(WorldTime, WorldParticles); }
    });
    return {ambience: new WorldAmbience(undefined, getWorldTime), canvas, context, parent, document, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout};
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

test('reduced motion draws neither particles nor an extra lighting overlay', () => {
    const {ambience, context, requestAnimationFrame} = setup(true);
    ambience.setConfig(config);
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
});

test('local preview changes glow without adding a separate tint', () => {
    const {ambience, context} = setup(false, Date, () => 20 * 60000);
    ambience.setConfig({...config, previewTimeMode: 'night'});
    expect(context.createRadialGradient).toHaveBeenCalled();
    context.fillRect.mockClear();
    ambience.setConfig({...config, previewTimeMode: 'day'});
    expect(context.fillRect).not.toHaveBeenCalled();
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
    ambience.setConfig({...config, previewTimeMode: 'night'});
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


test('firefly brightness follows the renderer clock and scene changes add no tint', () => {
    let time = 20 * 60000;
    const {ambience, context} = setup(false, Date, () => time);
    const glow = () => Number(context.fillStyle.match(/,([^,]+)\)$/)[1]);
    ambience.setConfig({...config, scene: 'Town'});
    expect(context.fillRect).not.toHaveBeenCalled();
    time = 42.5 * 60000;
    ambience.setConfig({...config, scene: 'Town'});
    const duskGlow = glow();
    time = 50 * 60000;
    ambience.setConfig({...config, scene: 'Town'});
    expect(glow()).toBeCloseTo(duskGlow * 2, 2);
    context.fillRect.mockClear();
    ambience.setConfig({...config, scene: 'Forest', particles: 'none'});
    expect(context.fillRect).not.toHaveBeenCalled();
    ambience.setConfig({...config, scene: 'Town'});
    expect(glow()).toBeGreaterThan(duskGlow);
    ambience.clear();
});

test('preview freezes the world phase while firefly motion remains continuous', () => {
    let now = 10000;
    const {ambience, context} = setup(false, {now: () => now}, () => 20 * 60000);
    ambience.setConfig({...config, previewTimeMode: 'night'});
    const first = context.fillRect.mock.calls[1];
    context.fillRect.mockClear(); now += 16; ambience.draw();
    const next = context.fillRect.mock.calls[1];
    expect(next[0]).not.toBe(first[0]);
    expect(Math.abs(next[0] - first[0])).toBeLessThan(1);
    expect(Math.abs(next[1] - first[1])).toBeLessThan(1);
    ambience.clear();
});

test('layered effects draw smoothly at map scale and stay inside their authored area', () => {
    let now = 10000;
    const {ambience, context} = setup(false, {now: () => now}, () => 20 * 60000);
    ambience.getView = () => ({x: 20, y: 100, scale: 2});
    ambience.setConfig({...config, scene: 'Forest', bounds: {x: 0, y: 80, width: 400, height: 200},
        effects: [{type: 'leaves', count: 4}, {type: 'pollen', count: 3}]});
    expect(context.rect).toHaveBeenCalledWith(-40, -40, 800, 400);
    expect(context.clip).toHaveBeenCalledTimes(1);
    expect(context.rotate).toHaveBeenCalled();
    expect(context.fillRect.mock.calls.some(([, , width, height]) => width === 2 && height === 2)).toBe(true);
    const first = context.translate.mock.calls[0];
    context.translate.mockClear(); now += 16; ambience.draw();
    const next = context.translate.mock.calls[0];
    expect(next[0]).not.toBe(first[0]);
    expect(Math.abs(next[0] - first[0])).toBeLessThan(1);
    expect(Math.abs(next[1] - first[1])).toBeLessThan(1);
});

test.each(['leaves', 'pollen', 'dust', 'gusts', 'spray', 'sand', 'embers', 'ash', 'mist'])(
    '%s uses continuous map positions through camera movement and global time changes', type => {
        const view = {x: 32, y: 16, scale: 2};
        const first = WorldParticles.positions(type, 6, 100, view, 960, 448).find(p => p.x > 150 && p.y > 100);
        const at = (elapsed, camera) => WorldParticles.positions(type, 6, elapsed, camera, 960, 448)
            .find(p => p.index === first.index && Math.abs(p.x - first.x) < 30 && Math.abs(p.y - first.y) < 30);
        const next = at(100.016, view);
        expect(Math.abs(next.x - first.x)).toBeLessThan(1);
        expect(Math.abs(next.y - first.y)).toBeLessThan(1);
        const shifted = at(100, {...view, x: 42, y: 26});
        expect(shifted.x).toBeCloseTo(first.x - 20);
        expect(shifted.y).toBeCloseTo(first.y - 20);
        const {ambience, context} = setup(false, Date, () => 50 * 60000);
        ambience.setConfig({...config, particles: type, effects: [{type, count: 6}]});
        expect(context.fillRect).toHaveBeenCalled();
        expect(context.fillRect.mock.calls.some(([, , width, height]) => width === 960 && height === 448)).toBe(false);
    });

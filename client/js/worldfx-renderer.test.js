const create = require('./world-fx-renderer-worker');
function setup() {
    const ctx = {canvas: {width: 480, height: 224}, drawImage: jest.fn(), fillRect: jest.fn()};
    for (const method of ['save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'ellipse', 'stroke']) ctx[method] = jest.fn();
    const state = {flags: {heat: true}, scenery: {}, time: 500, particles: []};
    const view = {cameraX: 32, cameraY: 48, scale: 3, sources: {background: {}}};
    return {fx: create(), ctx, state, view};
}
test('particles remain anchored to map pixels as the camera and scale change', () => {
    const {fx, ctx, state, view} = setup();
    state.particles = [{x: 48, y: 64, size: 2, alpha: 0.8, color: '#aabbcc'}];
    fx.draw(ctx, state, view); expect(ctx.fillRect).toHaveBeenLastCalledWith(48, 48, 6, 6);
    view.cameraX += 8; fx.draw(ctx, state, view); expect(ctx.fillRect).toHaveBeenLastCalledWith(24, 48, 6, 6);
});
test('heat follows existing fire lights while non-fire and offscreen lights are ignored', () => {
    const {fx, ctx, state, view} = setup();
    view.fireLights = [{x: 80, y: 100, animation: 'fire'}, {x: 9000, y: 9000, animation: 'fire'}, {x: 70, y: 80}];
    fx.ground(ctx, state, view); expect(ctx.drawImage).toHaveBeenCalledTimes(14);
    ctx.drawImage.mockClear(); state.flags.heat = false; fx.ground(ctx, state, view);
    expect(ctx.drawImage).not.toHaveBeenCalled();
});
test('authored fire regions replace automatic detection, and an empty list opts out', () => {
    const {fx, ctx, state, view} = setup();
    view.fireLights = [{x: 80, y: 100, animation: 'fire'}]; state.scenery.fires = [];
    fx.ground(ctx, state, view); expect(ctx.drawImage).not.toHaveBeenCalled();
    state.scenery.fires = [{x: 50, y: 80, width: 20, height: 5}];
    fx.ground(ctx, state, view); expect(ctx.drawImage).toHaveBeenCalledTimes(3);
    expect(ctx.drawImage.mock.calls.at(-1)[4]).toBe(1);
});
test('heat draw work is bounded even with many overlapping fire lights', () => {
    const {fx, ctx, state, view} = setup();
    view.fireLights = Array.from({length: 500}, () => ({x: 80, y: 100, animation: 'fire'}));
    fx.ground(ctx, state, view); expect(ctx.drawImage).toHaveBeenCalledTimes(32 * 14);
});

test('level-up ignition and staggered shockwaves use finite camera-relative geometry', () => {
    const {fx, ctx, state, view} = setup();
    state.rings = [{owner: 'levelup', x: 48, y: 64, coreX: 40, coreY: 56, radius: 38, startedAt: 400}];
    state.particles = [{shape: 'star', x: 45, y: 50, size: 2, alpha: 0.8, color: '#ffe078'},
        {shape: 'spark', x: 48, y: 52, size: 1, alpha: 0.5, color: '#9cefe6', trailX: 2, trailY: -3}];
    fx.draw(ctx, state, view);
    expect(ctx.ellipse).toHaveBeenCalledTimes(1);
    expect(ctx.fillRect).toHaveBeenCalled(); expect(ctx.lineTo).toHaveBeenCalledTimes(9);
    for (const method of ['fillRect', 'ellipse', 'moveTo', 'lineTo']) {
        expect(ctx[method].mock.calls.flat().every(value => Number.isFinite(value))).toBe(true);
    }
    ctx.ellipse.mockClear(); ctx.fillRect.mockClear();
    state.time = 1000; state.particles = []; fx.draw(ctx, state, view);
    expect(ctx.ellipse).toHaveBeenCalledTimes(2); expect(ctx.fillRect).not.toHaveBeenCalled();
});

const Weather = require('./weather-worker');
const E = require('./sceneenvironment');
const config = {...E.defaults.weather, mode: 'cycle', transition: 5,
    sequence: [{type: 'rain', intensity: 1, duration: 20}, {type: 'sunrays', intensity: .8, duration: 20}]};
test('weather fades continuously through phases and cycle wrap on a shared clock', () => {
    expect(Weather.sample(config, 0).sunrays).toBe(.8);
    expect(Weather.sample(config, 2500).rain).toBeCloseTo(.5);
    expect(Weather.sample(config, 5000).rain).toBe(1);
    expect(Weather.sample(config, 20000).rain).toBe(1);
    expect(Weather.sample(config, 22500).sunrays).toBeCloseTo(.4);
    for (const boundary of [0, 20000, 40000]) {
        const before = Weather.sample(config, boundary - .01), after = Weather.sample(config, boundary + .01);
        expect(before.rain).toBeCloseTo(after.rain, 5); expect(before.sunrays).toBeCloseTo(after.sunrays, 5);
    }
    expect(Weather.sample(config, 45000)).toEqual(Weather.sample(config, 5000));
    expect(Weather.sample(config, -15000)).toEqual(Weather.sample(config, 25000));
});
test('sunrays fade at night and rain supplies bounded cloud cover', () => {
    expect(Weather.sample(config, 25000, 0).sunrays).toBe(0);
    expect(Weather.sample(config, 25000, .5).sunrays).toBe(.4);
    expect(Weather.sample(config, 5000).darkness).toBe(.13);
    expect(Weather.sample(null, 0).rain).toBe(0);
});
function context() {
    const ctx = {canvas: {width: 1280, height: 720}};
    for (const key of ['save', 'restore', 'beginPath', 'rect', 'clip', 'moveTo', 'lineTo', 'stroke', 'closePath', 'fill']) ctx[key] = jest.fn();
    ctx.createLinearGradient = () => ({addColorStop: jest.fn()});return ctx;
}
test('rain moves smoothly at fractional coordinates, stays bounded, and respects motion/ambience preferences', () => {
    const ctx = context(), state = Weather.sample(config, 5000), view = {cameraX: 12.25, cameraY: 109.5, scale: 3, bounds: {x: 0, y: 0, w: 1024, h: 1024}};
    Weather.draw(ctx, state, view, 5000);
    const first = ctx.moveTo.mock.calls[0];expect(first.some(value => !Number.isInteger(value))).toBe(true);
    expect(ctx.moveTo.mock.calls.length).toBeLessThanOrEqual(600);expect(ctx.clip).toHaveBeenCalled();
    ctx.moveTo.mockClear(); Weather.draw(ctx, state, view, 5000 + 1000 / 60);
    expect(ctx.moveTo.mock.calls[0]).not.toEqual(first);
    ctx.moveTo.mockClear();Weather.draw(ctx, state, {...view, reducedMotion: true}, 5000);expect(ctx.moveTo).not.toHaveBeenCalled();
    Weather.draw(ctx, state, {...view, enabled: false}, 5000);expect(ctx.moveTo).not.toHaveBeenCalled();
});
test('sunrays remain visible at distant map coordinates', () => {
    const ctx = context();Weather.draw(ctx, {sunrays: .8, rain: 0, wind: .2}, {cameraX: 7000, cameraY: 9000, scale: 2}, 0);
    const xs = ctx.moveTo.mock.calls.map(call => call[0]);expect(xs.some(x => x >= 0 && x < 1280)).toBe(true);
});

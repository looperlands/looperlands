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

test('night opacity changes weather appearance without changing the shared phase, density or cloud cover', () => {
    const day=Weather.sample(config,5000,1),night=Weather.sample(config,5000,0);
    expect(night.rain).toBe(day.rain);expect(night.darkness).toBe(day.darkness);
    expect(day.opacity).toBe(1);expect(night.opacity).toBe(.45);
    expect(Weather.sample({...config,nightOpacity:.2},5000,0).opacity).toBe(.2);
});

test('cloudy is an authorable fixed effect and blends through shared weather phases', () => {
    const cloudy={...E.defaults.weather,type:'cloudy',intensity:.8};
    expect(E.weather(cloudy)).toBe(cloudy);
    expect(Weather.sample(cloudy,1000)).toMatchObject({cloudy:.8,rain:0,sunrays:0,darkness:.064});
    const cycle={...cloudy,mode:'cycle',transition:5,sequence:[{type:'clear',intensity:0,duration:20},{type:'cloudy',intensity:.8,duration:20}]};
    expect(E.weather(cycle)).toBe(cycle);
    expect(Weather.sample(cycle,22500).cloudy).toBeCloseTo(.4);
    expect(Weather.sample(cycle,25000).cloudy).toBe(.8);
    expect(Weather.sample(cloudy,1000,0).opacity).toBe(.45);
});

test('cloudy renders both Beach layers with wind, clipping and reduced-motion preferences', () => {
    const foreground=jest.fn();
    jest.isolateModules(()=>{
        jest.doMock('./parallax-renderer-worker',()=>()=>({foreground}));
        const weather=require('./weather-worker'),ctx=context();ctx.globalAlpha=1;
        const view={cameraX:100,cameraY:200,scale:2,reducedMotion:true,bounds:{x:0,y:0,w:1000,h:1000}};
        weather.draw(ctx,weather.sample({...E.defaults.weather,type:'cloudy',intensity:.5,wind:.4},1000),view,1000);
        expect(ctx.clip).toHaveBeenCalled();
        const [,state,renderView]=foreground.mock.calls[0];
        expect(renderView.reducedMotion).toBe(true);
        expect(state.scenes[0].layers).toEqual([
            expect.objectContaining({image:'/img/parallax/clouds.png',opacity:.06,factorX:.82,nightOpacity:1}),
            expect.objectContaining({image:'/img/parallax/clouds.png',opacity:.19,factorX:1.28,nightOpacity:1})
        ]);
        expect(state.scenes[0].layers[0].driftX).toBeCloseTo(1.35);
        expect(state.scenes[0].layers[1].driftX).toBeCloseTo(1.9);
        foreground.mockClear();weather.draw(ctx,weather.sample(E.defaults.weather,1000),view,1000);
        weather.draw(ctx,{cloudy:1},{...view,enabled:false},1000);
        expect(foreground).not.toHaveBeenCalled();
    });
    jest.dontMock('./parallax-renderer-worker');
});

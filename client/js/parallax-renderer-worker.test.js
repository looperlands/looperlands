const createParallax = require('./parallax-renderer-worker');
const flush = () => new Promise(resolve => setImmediate(resolve));
const source = '/img/parallax/clouds.png';
function setup(options = {}) {
    let time = 0;
    const image = {close: jest.fn()}, loadImage = jest.fn().mockResolvedValue(image);
    const canvases = [];
    const createCanvas = (width, height) => {
        const ctx = {drawImage: jest.fn(), fillRect: jest.fn()}, canvas = {width, height, getContext: () => ctx};
        canvases.push(canvas); return canvas;
    };
    const renderer = createParallax({loadImage, createCanvas, now: () => time, fadeDuration: 0, ...options});
    const ctx = {canvas: {width: 320, height: 240}, globalAlpha: 1, filter: 'none'};
    for (const name of ['save', 'restore', 'beginPath', 'rect', 'clip', 'drawImage', 'translate', 'rotate', 'scale', 'fillRect']) ctx[name] = jest.fn();
    const stack=[];
    ctx.save=jest.fn(()=>stack.push({globalAlpha:ctx.globalAlpha,filter:ctx.filter}));
    ctx.restore=jest.fn(()=>Object.assign(ctx,stack.pop()));
    const view = {cameraX: 100, cameraY: 200, scale: 1};
    const layer = {image: source, width: 400, height: 400, factorX: 0.5, factorY: 1.5};
    const state = {scenes: [{x: 0, y: 0, w: 100, h: 100, layers: [layer]}]};
    return {renderer, ctx, view, layer, state, image, loadImage, canvases, time: value => {time = value;}};
}
async function ready(s) {s.renderer.foreground(s.ctx, s.state, s.view); await flush(); s.ctx.drawImage.mockClear();}

test('moves in both axes at independent depths, anchored to the scene origin', async () => {
    const s = setup(); await ready(s);
    s.renderer.foreground(s.ctx, s.state, s.view);
    const before = s.ctx.drawImage.mock.calls[0];
    s.ctx.drawImage.mockClear();
    s.renderer.foreground(s.ctx, s.state, {...s.view, cameraX: 120, cameraY: 210});
    const after = s.ctx.drawImage.mock.calls[0];
    expect(after[1] - before[1]).toBe(-10);
    expect(after[2] - before[2]).toBe(-15);
    s.state.scenes[0].x = 5; s.state.scenes[0].y = 10;
    s.ctx.drawImage.mockClear();
    s.renderer.foreground(s.ctx, s.state, s.view);
    expect(s.ctx.drawImage.mock.calls[0].slice(1, 3)).toEqual([-10, -60]);
});

test.each([1, 2, 3, 1.5])('scales the same native-pixel layout at zoom %s without repeat gaps', async scale => {
    const s = setup(); await ready(s);
    Object.assign(s.ctx.canvas, {width: 320 * scale, height: 240 * scale});
    s.renderer.foreground(s.ctx, s.state, {...s.view, scale});
    const calls = s.ctx.drawImage.mock.calls;
    expect(calls[0].slice(1)).toEqual([-50 * scale, -300 * scale, 400 * scale, 400 * scale]);
    expect(calls[1][2]).toBe(calls[0][2] + calls[0][4]);
});

test('clips to scene edges and never loads offscreen scenes', async () => {
    const s = setup(); s.state.scenes[0] = {x: 10, y: 15, w: 5, h: 4, layers: [s.layer]};
    s.state.scenes.push({x: 1000, y: 1000, w: 5, h: 5, layers: [{image: '/img/parallax/mist.png'}]});
    await ready(s); s.ctx.rect.mockClear(); s.renderer.foreground(s.ctx, s.state, s.view);
    expect(s.ctx.rect).toHaveBeenCalledWith(60, 40, 80, 64);
    expect(s.loadImage).toHaveBeenCalledTimes(1);
    expect(s.loadImage).toHaveBeenCalledWith(source);
});

test('keeps ground and foreground separate and reuses the decoded image across planes', async () => {
    const s = setup(); s.state.scenes[0].layers.push({...s.layer, plane: 'ground'}); await ready(s);
    s.renderer.ground(s.ctx, s.state, s.view);
    const count = s.ctx.drawImage.mock.calls.length;
    s.ctx.drawImage.mockClear(); s.renderer.foreground(s.ctx, s.state, s.view);
    expect(s.ctx.drawImage).toHaveBeenCalledTimes(count);
    expect(s.loadImage).toHaveBeenCalledTimes(1);
});

test('reduced motion fixes planes to world coordinates and disables ambient drift', async () => {
    const s = setup(); Object.assign(s.layer, {driftX: 3, driftY: -2}); await ready(s);
    const view = {...s.view, reducedMotion: true};
    s.renderer.foreground(s.ctx, s.state, view);
    const before = s.ctx.drawImage.mock.calls;
    s.time(10000); s.ctx.drawImage.mockClear(); s.renderer.foreground(s.ctx, s.state, view);
    expect(s.ctx.drawImage.mock.calls).toEqual(before);
    s.ctx.drawImage.mockClear(); s.renderer.foreground(s.ctx, s.state, {...view, cameraX: 120, cameraY: 210});
    expect(s.ctx.drawImage.mock.calls[0].slice(1, 3)).toEqual([-120, -210]);
});

test('drift uses pixels per second and non-repeating layers are drawn only once', async () => {
    const s = setup(); Object.assign(s.layer, {driftX: 3, driftY: -2, repeatX: false, repeatY: false}); await ready(s);
    s.time(2000); s.renderer.foreground(s.ctx, s.state, s.view);
    expect(s.ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(s.ctx.drawImage.mock.calls[0].slice(1, 3)).toEqual([-44, -304]);
});

test('slow drift advances every frame at fractional display pixels with crisp cached artwork', async () => {
    const s = setup(), scale = 3;
    Object.assign(s.layer, {driftX: 0.55, driftY: -0.12, repeatX: false, repeatY: false});
    Object.assign(s.ctx.canvas, {width: 960, height: 720});
    await ready(s);
    const positions = [];
    for (let frame = 0; frame < 60; frame++) {
        s.time(frame * 1000 / 60);
        s.renderer.foreground(s.ctx, s.state, {...s.view, scale});
        positions.push(s.ctx.drawImage.mock.calls.at(-1).slice(1, 3));
    }
    for (let frame = 1; frame < 60; frame++) {
        expect(positions[frame][0] - positions[frame - 1][0]).toBeCloseTo(0.55 * scale / 60, 8);
        expect(positions[frame][1] - positions[frame - 1][1]).toBeCloseTo(-0.12 * scale / 60, 8);
    }
    expect(s.canvases).toHaveLength(2); // One native sample and one nearest-neighbor enlargement, reused for all frames.
    expect(s.canvases.every(canvas => canvas.getContext().imageSmoothingEnabled === false)).toBe(true);
    expect(s.ctx.imageSmoothingEnabled).toBe(true);
    expect(s.ctx.drawImage.mock.calls[0][0]).toBe(s.canvases[1]);
});

test('fractional camera motion moves opaque canopy and roots continuously on both axes', async () => {
    const s = setup();
    Object.assign(s.layer, {placed: true, width: 80, height: 100, factorX: 1.24, factorY: 1.13, opacity: 1});
    s.state.scenes[0].placements = [{x: 250, y: 350}];
    await ready(s);
    for (const factor of [1, 1.24]) {
        s.layer.factorX = factor;
        s.renderer.foreground(s.ctx, s.state, {...s.view, playerX: 200, playerY: 300});
        const before = s.ctx.drawImage.mock.calls.at(-1);
        s.renderer.foreground(s.ctx, s.state, {...s.view, cameraX: 100.1, cameraY: 200.2, playerX: 250, playerY: 350});
        const after = s.ctx.drawImage.mock.calls.at(-1);
        expect(after[1] - before[1]).toBeCloseTo(-0.1 * factor, 8);
        expect(after[2] - before[2]).toBeCloseTo(-0.2 * 1.13, 8);
        expect(s.ctx.globalAlpha).toBe(1);
    }
});

test('fractional repeated images meet at identical edges at non-integer zoom', async () => {
    const s = setup(); await ready(s);
    s.time(31); s.layer.driftY = 0.12;
    s.renderer.foreground(s.ctx, s.state, {...s.view, cameraX: 100.1, cameraY: 200.2, scale: 1.5});
    const [first, next] = s.ctx.drawImage.mock.calls;
    expect(next[2]).toBeCloseTo(first[2] + first[4], 10);
});

test('raster variants reuse warm sizes and release buffers within their memory budget', async () => {
    const s = setup(); await ready(s);
    for (let width = 256; width < 296; width++) {
        s.layer.width = width;
        s.renderer.foreground(s.ctx, s.state, {...s.view, scale: 3});
    }
    expect(s.canvases.filter(canvas => canvas.width > 0).length).toBeLessThanOrEqual(32);
    expect(s.canvases.reduce((bytes, canvas) => bytes + canvas.width * canvas.height * 4, 0)).toBeLessThanOrEqual(16 * 1024 * 1024);
    const warm = s.canvases.length;
    s.renderer.foreground(s.ctx, s.state, {...s.view, scale: 3});
    expect(s.canvases).toHaveLength(warm);
});

test('missing and malformed assets cannot flood requests or stop rendering', async () => {
    const s = setup(); s.loadImage.mockRejectedValue(new Error('404'));
    s.state.scenes[0].layers.push(null, {image: 'https://example.org/image.png'}, {image: '/img/parallax/../secret.png'});
    await ready(s);
    for (let frame = 0; frame < 20; frame++) s.renderer.foreground(s.ctx, s.state, s.view);
    expect(s.loadImage).toHaveBeenCalledTimes(1);
    expect(s.ctx.drawImage).not.toHaveBeenCalled();
    expect(() => s.renderer.foreground(s.ctx, {scenes: [null, {}, {x: 0, y: 0, w: 2, h: 2, layers: {}}]}, s.view)).not.toThrow();
});

test('bounded image cache closes evicted bitmaps and stale asynchronous loads', async () => {
    const s = setup(); let resolve;
    s.loadImage.mockImplementationOnce(() => new Promise(done => {resolve = done;}));
    await ready(s);
    for (let i = 0; i < 17; i++) {
        s.layer.image = '/img/parallax/layer-' + i + '.png';
        s.renderer.foreground(s.ctx, s.state, s.view); await flush();
    }
    const stale = {close: jest.fn()}; resolve(stale); await flush();
    expect(stale.close).toHaveBeenCalledTimes(1);
    expect(s.image.close).toHaveBeenCalled();
});

test('clearing extension data leaves no scenery after a map transition', async () => {
    const s = setup(); await ready(s);
    s.renderer.foreground(s.ctx, null, s.view);
    s.renderer.ground(s.ctx, {scenes: []}, s.view);
    expect(s.ctx.drawImage).not.toHaveBeenCalled();
});

test('recessed surfaces scroll slower than terrain and preserve the map until their image is ready', async () => {
    const s = setup();
    Object.assign(s.layer, {plane: 'background', factorX: .62, factorY: .62});
    Object.assign(s.state.scenes[0], {cutoutColors: [[254,173,2], [999,0,0]], backgroundColor: '#fead02'});
    const view = {...s.view, viewportWidth: 320, viewportHeight: 240};
    expect(s.renderer.terrainCutouts(s.state, view)).toEqual([]);
    await flush();
    expect(s.renderer.terrainCutouts(s.state, view)).toEqual([{x: 0, y: 0, w: 1600, h: 1600, colors: [[254,173,2]]}]);
    s.renderer.background(s.ctx, s.state, view);
    const before = s.ctx.drawImage.mock.calls.at(-1);
    s.renderer.background(s.ctx, s.state, {...view, cameraX: 110, cameraY: 210});
    const after = s.ctx.drawImage.mock.calls.at(-1);
    expect(after[1] - before[1]).toBeCloseTo(-6.2);
    expect(after[2] - before[2]).toBeCloseTo(-6.2);
    expect(s.ctx.fillRect).toHaveBeenCalled();
    expect(s.renderer.terrainCutouts(null, view)).toEqual([]);
    expect(s.renderer.terrainCutouts(s.state, {...view, cameraX: 2000})).toEqual([]);
});

test('failed recessed image loads leave original terrain opaque', async () => {
    const s = setup(); s.loadImage.mockRejectedValue(new Error('404'));
    s.layer.plane = 'background'; s.state.scenes[0].cutoutColors = [[72,196,248]];
    const view = {...s.view, viewportWidth: 320, viewportHeight: 240};
    s.renderer.terrainCutouts(s.state, view); await flush();
    expect(s.renderer.terrainCutouts(s.state, view)).toEqual([]);
    expect(s.loadImage).toHaveBeenCalledTimes(1);
});

test('placed trees stay anchored over a long walk, while their crown projects around the viewport center', async () => {
    const s = setup();
    Object.assign(s.layer, {placed: true, width: 80, height: 100, factorX: 1.2, factorY: 1.2});
    s.state.scenes[0].placements = [{x: 250, y: 350}, {x: 1250, y: 1350}];
    await ready(s); s.renderer.foreground(s.ctx, s.state, s.view);
    const first = s.ctx.drawImage.mock.calls[0].slice(1);
    s.ctx.drawImage.mockClear();
    s.renderer.foreground(s.ctx, s.state, {...s.view, cameraX: 1100, cameraY: 1200});
    expect(s.ctx.drawImage.mock.calls[0].slice(1)).toEqual(first);
    s.ctx.drawImage.mockClear();
    s.renderer.foreground(s.ctx, s.state, {...s.view, cameraX: 120, cameraY: 210});
    expect(s.ctx.drawImage.mock.calls[0][1]).toBe(first[0] - 24);
    expect(s.ctx.drawImage.mock.calls[0][2]).toBe(first[1] - 12);
});

test('placed roots stay on the collision footprint; reduced motion aligns upper tree heights to the same anchor', async () => {
    const s = setup();
    Object.assign(s.layer, {placed: true, width: 80, height: 100, factorX: 1.2, factorY: 1.2, anchorY: 0.9});
    s.state.scenes[0].placements = [{x: 250, y: 350}]; await ready(s);
    s.renderer.foreground(s.ctx, s.state, {...s.view, reducedMotion: true});
    expect(s.ctx.drawImage.mock.calls[0].slice(1)).toEqual([110, 60, 80, 100]);
});

test('placed trunks expose world depth and use display scale for actor interleaving', async () => {
    const s = setup();
    Object.assign(s.layer, {placed: true, plane: 'entities', width: 80, height: 100, factorX: 1, factorY: 1});
    s.state.scenes[0].placements = [{x: 250, y: 350}, {x: 10000, y: 10000}, null];
    const view = {...s.view, scale: 3, viewportWidth: 320, viewportHeight: 240};
    expect(s.renderer.entries(s.state, view)).toEqual([]); await flush();
    const entries = s.renderer.entries(s.state, view);
    expect(entries).toHaveLength(1); expect(entries[0].y).toBe(350);
    entries[0].draw(s.ctx);
    expect(s.ctx.drawImage.mock.calls[0].slice(1)).toEqual([330, 300, 240, 300]);
});

test('overhead trees follow ambient darkness and exclude higher-priority regions', async () => {
    const s = setup();
    Object.assign(s.layer, {placed: true, plane: 'foreground', width: 80, height: 100});
    s.state.scenes[0].placements = [{x: 250, y: 350}];
    s.state.scenes[0].exclude = [{x: 200, y: 250, w: 32, h: 32}];
    await ready(s);
    const filters=[];s.ctx.drawImage.mockImplementation(()=>filters.push(s.ctx.filter));
    s.renderer.foreground(s.ctx,s.state,{...s.view,lightIntensity:.18});
    expect(filters).toContain('none');
    expect(s.canvases.some(c=>c.getContext().fillRect.mock.calls.length>0)).toBe(true);expect(s.ctx.clip).toHaveBeenCalledWith('evenodd');
});

test('sway is bounded, gradual, anchored per tree and disabled by reduced motion', async () => {
    const s=setup();Object.assign(s.layer,{placed:true,width:80,height:100,factorX:1,factorY:1,swayX:2,swayY:.5,swayPeriod:6});
    s.state.scenes[0].placements=[{x:250,y:350}];await ready(s);
    const draw=(time,view=s.view)=>{s.time(time);s.ctx.drawImage.mockClear();s.renderer.foreground(s.ctx,s.state,view);return s.ctx.drawImage.mock.calls[0];};
    const first=draw(1000),next=draw(1000+1000/60),later=draw(2200);
    expect(next[1]).not.toBe(first[1]);expect(Math.abs(next[1]-first[1])).toBeLessThan(.1);
    expect(Math.abs(later[1]-first[1])).toBeLessThanOrEqual(4);
    const moved=draw(1000,{...s.view,cameraX:s.view.cameraX+10});expect(moved[1]).toBeCloseTo(first[1]-10);
    expect(draw(1000,{...s.view,reducedMotion:true})).toEqual(draw(4000,{...s.view,reducedMotion:true}));
    delete s.layer.swayX;delete s.layer.swayY;expect(draw(1000)).toEqual(draw(4000));
});

test('overhead mist dims at night with configurable opacity and brightness', async () => {
    const s=setup();s.layer.opacity=.4;await ready(s);
    const draws=[];s.ctx.drawImage.mockImplementation(()=>draws.push({alpha:s.ctx.globalAlpha,filter:s.ctx.filter}));
    s.renderer.foreground(s.ctx,s.state,{...s.view,lightIntensity:0});
    expect(draws[0].alpha).toBeCloseTo(.18);expect(draws[0].filter).toBe('none');
    expect(s.canvases.some(c=>c.getContext().fillStyle==='rgba(0,0,0,0.453125)')).toBe(true);
    draws.length=0;Object.assign(s.layer,{nightOpacity:1,nightBrightness:1});
    s.renderer.foreground(s.ctx,s.state,{...s.view,lightIntensity:0});
    expect(draws[0]).toEqual({alpha:.4,filter:'none'});
    expect(s.ctx.globalAlpha).toBe(1);expect(s.ctx.filter).toBe('none');
});


test('newly decoded atmospheric layers fade smoothly without changing their configured opacity', async () => {
    const s = setup({fadeDuration: 800});
    Object.assign(s.layer, {opacity: .8});
    s.state.scenes[0].placements = [{x: 250, y: 350}];
    await ready(s);
    const alphas = [];
    s.ctx.drawImage.mockImplementation(() => alphas.push(s.ctx.globalAlpha));
    const draw = (time, view = s.view) => {
        s.time(time); alphas.length = 0;
        s.renderer.foreground(s.ctx, s.state, view);
        return alphas[0];
    };
    expect(draw(0)).toBe(0);
    expect(draw(400)).toBeCloseTo(.4);
    expect(draw(800)).toBeCloseTo(.8);
    expect(draw(1600)).toBeCloseTo(.8);
    expect(draw(0, {...s.view, reducedMotion: true})).toBeCloseTo(.8);
    expect(s.loadImage).toHaveBeenCalledTimes(1);
    expect(s.layer.opacity).toBe(.8);
});

test('recessed terrain is opaque when its cutout first becomes ready', async () => {
    const s = setup({fadeDuration: 800}); s.layer.plane = 'background';
    s.state.scenes[0].cutoutColors = [[0, 0, 0]];
    s.renderer.background(s.ctx, s.state, s.view); await flush();
    const alpha = []; s.ctx.drawImage.mockImplementation(() => alpha.push(s.ctx.globalAlpha));
    s.renderer.background(s.ctx, s.state, s.view);
    expect(alpha[0]).toBe(1);
    expect(s.renderer.terrainCutouts(s.state, {...s.view, viewportWidth:320, viewportHeight:240})).toHaveLength(1);
});


test('placed trees appear fully opaque immediately after decoding', async () => {
    const s = setup({fadeDuration: 800});
    Object.assign(s.layer, {placed:true, opacity:1});
    s.state.scenes[0].placements = [{x:250,y:350}]; await ready(s);
    const alpha = []; s.ctx.drawImage.mockImplementation(()=>alpha.push(s.ctx.globalAlpha));
    s.renderer.foreground(s.ctx,s.state,s.view);
    expect(alpha[0]).toBe(1);
});


test('visible trees gate frame readiness until decoded, with a bounded wait for stalled loads', async () => {
    let resolve;
    const s = setup({loadImage:()=>new Promise(r=>{resolve=r;})}); s.layer.placed=true;
    const view={...s.view,viewportWidth:320,viewportHeight:240};
    expect(s.renderer.ready(s.state,view)).toBe(false); await flush();
    expect(s.renderer.ready(s.state,view)).toBe(false);
    s.time(3000); expect(s.renderer.ready(s.state,view)).toBe(true);
    resolve(s.image); await flush(); s.time(0);
    expect(s.renderer.ready(s.state,view)).toBe(true);
});

test('failed tree images and offscreen scenes never prevent frame readiness', async () => {
    const s=setup({loadImage:()=>Promise.reject(new Error('missing'))}); s.layer.placed=true;
    const view={...s.view,viewportWidth:320,viewportHeight:240};
    expect(s.renderer.ready(s.state,view)).toBe(false); await flush();
    expect(s.renderer.ready(s.state,view)).toBe(true);
    expect(s.renderer.ready(s.state,{...view,cameraX:10000})).toBe(true);
});

test('spaced shadows leave quiet gaps, move continuously, and follow ground camera motion', async () => {
    const s = setup();
    Object.assign(s.view, {cameraX: 0, cameraY: 0});
    Object.assign(s.layer, {plane: 'ground', width: 64, height: 64, factorX: 1, factorY: 1,
        spacingX: 256, spacingY: 512, driftY: -30, opacity: .27});
    s.renderer.ground(s.ctx, s.state, s.view); await flush(); s.ctx.drawImage.mockClear();
    s.renderer.ground(s.ctx, s.state, s.view);
    expect(s.ctx.drawImage.mock.calls.map(call => call.slice(1))).toEqual([[0, 0, 64, 64], [256, 0, 64, 64]]);
    s.time(1000 / 60); s.ctx.drawImage.mockClear(); s.renderer.ground(s.ctx, s.state, s.view);
    expect(s.ctx.drawImage.mock.calls[0][2]).toBeCloseTo(-.5);
    s.ctx.drawImage.mockClear(); s.renderer.ground(s.ctx, s.state, {...s.view, cameraX: 10, cameraY: 12});
    expect(s.ctx.drawImage.mock.calls[0].slice(1, 3)).toEqual([-10, -12.5]);
    s.ctx.drawImage.mockClear(); s.time(6000); s.renderer.ground(s.ctx, s.state, s.view);
    expect(s.ctx.drawImage).not.toHaveBeenCalled(); // Entire viewport lies in the gap between flyovers.
    s.renderer.ground(s.ctx, s.state, {...s.view, reducedMotion: true});
    expect(s.ctx.drawImage.mock.calls[0].slice(1, 3)).toEqual([0, 0]);
});


test('current-scene-only layers disappear inside caves even when the outdoor scene remains in view', async () => {
    const s = setup(); s.state.scenes[0].id = 'outside';
    Object.assign(s.layer, {plane: 'ground', activeSceneOnly: true});
    s.renderer.ground(s.ctx, s.state, {...s.view, sceneId: 'cave'}); await flush();
    expect(s.loadImage).not.toHaveBeenCalled();
    s.renderer.ground(s.ctx, s.state, {...s.view, sceneId: 'outside'}); await flush();
    s.renderer.ground(s.ctx, s.state, {...s.view, sceneId: 'outside'});
    expect(s.ctx.drawImage).toHaveBeenCalled();
    s.ctx.drawImage.mockClear();
    s.renderer.ground(s.ctx, s.state, {...s.view, sceneId: 'cave'});
    expect(s.ctx.drawImage).not.toHaveBeenCalled();
});

test('curved flight follows an ellipse, turns along its tangent, and freezes under reduced motion', async () => {
    const s = setup(); Object.assign(s.view, {cameraX: 0, cameraY: 0});
    Object.assign(s.layer, {width: 40, height: 40, factorX: 1, factorY: 1, offsetX: 100, offsetY: 80,
        repeatX: false, repeatY: false, orbitRadius: 60, orbitPeriod: 4, rotateToPath: true});
    await ready(s); s.renderer.foreground(s.ctx, s.state, s.view);
    expect(s.ctx.translate).toHaveBeenLastCalledWith(180, 100);
    expect(s.ctx.rotate).toHaveBeenLastCalledWith(Math.PI);
    s.time(1000); s.renderer.foreground(s.ctx, s.state, s.view);
    const [x,y] = s.ctx.translate.mock.calls.at(-1);
    expect(x).toBeCloseTo(120); expect(y).toBeCloseTo(139);
    expect(s.ctx.rotate).toHaveBeenLastCalledWith(Math.PI * 1.5);
    s.renderer.foreground(s.ctx, s.state, {...s.view, reducedMotion: true});
    expect(s.ctx.translate).toHaveBeenLastCalledWith(180, 100);
    s.time(2000); s.renderer.foreground(s.ctx, s.state, {...s.view, reducedMotion: true});
    expect(s.ctx.translate).toHaveBeenLastCalledWith(180, 100);
});

test('repeated curved sprites have different headings rather than rotating as one flock', async () => {
    const s = setup(); Object.assign(s.view, {cameraX: 0, cameraY: 0});
    Object.assign(s.layer, {width: 40, height: 40, factorX: 1, factorY: 1,
        spacingX: 160, spacingY: 400, orbitRadius: 24, orbitPeriod: 7, rotateToPath: true});
    await ready(s); s.ctx.rotate.mockClear(); s.renderer.foreground(s.ctx, s.state, s.view);
    expect(new Set(s.ctx.rotate.mock.calls.map(([angle]) => angle)).size).toBeGreaterThan(1);
});

test('individual flight varies speed, turn direction and scale smoothly without changing identities on camera motion', async () => {
    const s = setup(); Object.assign(s.ctx.canvas, {width: 1200, height: 1200});
    Object.assign(s.view, {cameraX: 0, cameraY: 0});
    Object.assign(s.layer, {width: 40, height: 40, factorX: 1, factorY: 1, offsetX: 140, offsetY: 140,
        spacingX: 300, spacingY: 300, orbitRadius: 50, orbitPeriod: 7, orbitVariation: 1,
        scaleVariation: .5, rotateToPath: true});
    await ready(s);
    const frame = (time, view = s.view) => {
        s.time(time); s.ctx.translate.mockClear(); s.ctx.rotate.mockClear(); s.ctx.drawImage.mockClear();
        s.renderer.foreground(s.ctx, s.state, view);
        return s.ctx.translate.mock.calls.map(([x,y], index) => ({x,y,
            angle: s.ctx.rotate.mock.calls[index][0], size: s.ctx.drawImage.mock.calls[index][3]}));
    };
    const first = frame(0), next = frame(16);
    expect(first.length).toBe(next.length);
    const velocities = first.map((entry, index) => Math.hypot(next[index].x - entry.x, next[index].y - entry.y) / .016);
    expect(Math.max(...velocities) / Math.min(...velocities)).toBeGreaterThan(1.5);
    const turns = first.map((entry, index) => Math.atan2(Math.sin(next[index].angle - entry.angle), Math.cos(next[index].angle - entry.angle)));
    expect(turns.some(turn => turn > 0)).toBe(true);
    expect(turns.some(turn => turn < 0)).toBe(true);
    expect(new Set(first.map(entry => entry.size)).size).toBeGreaterThan(2);
    const later = frame(5000);
    expect(later.some((entry, index) => Math.abs(entry.size - first[index].size) > 1)).toBe(true);
    expect(later.every(entry => entry.size >= 20 && entry.size <= 60)).toBe(true);
    first.forEach((entry, index) => {
        const dx = next[index].x - entry.x, dy = next[index].y - entry.y;
        const alignment = (Math.sin(entry.angle) * dx - Math.cos(entry.angle) * dy) / Math.hypot(dx, dy);
        expect(alignment).toBeGreaterThan(.99);
    });
    expect(first.every((entry, index) => Math.abs(next[index].size - entry.size) < .1)).toBe(true);
    const moved = frame(16, {...s.view, cameraX: 2, cameraY: 3});
    first.forEach((entry, index) => {
        expect(moved[index].x).toBeCloseTo(next[index].x - 2);
        expect(moved[index].y).toBeCloseTo(next[index].y - 3);
        expect(moved[index].size).toBe(next[index].size);
        expect(moved[index].angle).toBe(next[index].angle);
    });
    const reduced = {...s.view, reducedMotion: true};
    expect(frame(1000, reduced)).toEqual(frame(10000, reduced));
    const buffers = s.canvases.length;
    for (let time = 0; time < 1000; time += 16) frame(time);
    expect(s.canvases).toHaveLength(buffers); // Height changes reuse the original raster.
});

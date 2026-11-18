const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, 'renderer-webworker.js'), 'utf8');

function setup() {
    const allocations = [], operations = [], pendingFrames = [], acknowledgements = [];
    let now = 0;
    function context(id) {
        const ctx = {imageSmoothingEnabled: false};
        for (const method of ['clearRect','save','restore','translate','scale','rotate','beginPath','moveTo','lineTo','closePath','fill','fillRect','arc','rect','clip','strokeText','fillText','drawImage']) {
            ctx[method] = jest.fn((...args) => operations.push({id, method, args}));
        }
        ctx.measureText = jest.fn(text => ({width: text.length * 8, actualBoundingBoxAscent: 12, actualBoundingBoxDescent: 3}));
        ctx.createRadialGradient = ctx.createConicGradient = jest.fn(() => ({addColorStop: jest.fn()}));
        ctx.getImageData = jest.fn(() => ({data: new Uint8ClampedArray([254,173,2,255, 100,70,40,255, 72,196,248,255])}));
        ctx.putImageData = jest.fn();
        return ctx;
    }
    class Canvas {
        constructor(width, height, id = 'scratch') {
            this.width = width; this.height = height; this.ctx = context(id); this.ctx.canvas = this; allocations.push(this);
        }
        getContext() { return this.ctx; }
    }
    const sandbox = {
        self: {WorldTime: require('./worldtime-worker'), WorldParticles: require('./worldparticles-worker'), postMessage: jest.fn()},
        OffscreenCanvas: Canvas, console, performance: {now: () => now},
        requestAnimationFrame: callback => pendingFrames.push(callback),
        postMessage: message => {if (message.type === 'rendered') acknowledgements.push(now);}
    };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);
    const api = vm.runInContext(`({render, drawText, cachedLabel, drawLightSource, renderLightOverlay, updateAnimatedLightSource, scheduleNextFrame,
        addToImageCache, clearImageCache, clearTextCache, drawScaledImage, sceneDaylight, drawSceneWeather,
        state: () => ({cacheBytes, cacheKeys: cacheKeys.slice(), labels: labelCache.size, labelBytes,
            terrain: terrainCache.size, lightScratch, shadowScratch, gradientScratch}),
        options: (shadows, player, dynamic = true) => {OPTION_SHADOWS = shadows; OPTION_PLAYER_SHADOW = player; OPTION_DYNAMIC_LIGHTS = dynamic;},
        setTileset: value => {tileset = value;},
        loadSprite: () => {sprites.avatar = {image: {avatar: true}};},
        fontReady: () => {hasLoadedFont = true; clearTextCache();},
        setPlayer: value => {playerPosition = value;}})`, sandbox);
    api.fontReady(); api.setTileset({tiles: true}); api.loadSprite();
    const canvases = {};
    for (const id of ['background','high','entities','highEntities','text','lighting','combined']) {
        canvases[id] = new Canvas(1440, 672, id);
        sandbox.onmessage({data: {type: 'setCanvas', id, canvas: canvases[id]}});
    }
    function advance(time) {
        now = time;
        for (const callback of pendingFrames.splice(0)) callback(time);
    }
    const send = data => sandbox.onmessage({data});
    return {...api, allocations, operations, pendingFrames, acknowledgements, canvases, Canvas, send, advance, sandbox};
}

function frame(cameraX = 0, cameraY = 0, revision = 1, text = []) {
    const scale = 3;
    const tiles = Array.from({length: 30}, (_, cellid) => ({tileid: 0, setW: 16, setH: 16, gridW: 30, cellid}));
    return {type: 'render', player: {x: 32, y: 32}, worldTime: 12 * 60000,
        scene: {x: 0, y: 0, width: 100, height: 100, darkness: 0},
        renderData: [
            {id: 'high', type: 'render', tiles: [], cameraX, cameraY, scale, clear: true, revision},
            {id: 'background', type: 'render', tiles, cameraX, cameraY, scale, clear: true, revision},
            {id: 'entities', type: 'entities', cameraX, cameraY, scale, entityData: [{translateX: 96, translateY: 96,
                drawData: [{spriteName: 'avatar', sx: 0, sy: 0, sW: 16, sH: 16, dx: 0, dy: 0, dW: 48, dH: 48}]}]},
            {id: 'text', type: 'text', cameraX, cameraY, scale, textData: text},
            {id: 'lights', type: 'render', tiles: [], cameraX, cameraY, scale, options: {shadows: false, playerShadow: false}}
        ]};
}

test.each([30,60,120,144])('paces at most 60 rendered frames per second on a %i Hz display', hz => {
    const worker = setup();
    worker.sandbox.postMessage = message => {
        if (message.type === 'rendered') {
            worker.acknowledgements.push(worker.time);
            worker.scheduleNextFrame();
        }
    };
    worker.scheduleNextFrame();
    for (let index = 0; index < hz * 2; index++) {
        worker.time = index * 1000 / hz;
        worker.advance(worker.time);
    }
    const target = Math.min(60, hz) * 2;
    expect(worker.acknowledgements.length).toBeGreaterThanOrEqual(target - 1);
    expect(worker.acknowledgements.length).toBeLessThanOrEqual(target + 1);
    const gaps = worker.acknowledgements.slice(1).map((t,i) => t - worker.acknowledgements[i]);
    if (hz === 60 || hz === 120) for (const gap of gaps) expect(gap).toBeCloseTo(1000 / 60);
    if (hz === 144) expect(Math.max(...gaps)).toBeLessThan(22);
});

test('duplicate frame requests and a resumed tab do not create additional render loops', () => {
    const worker = setup();
    worker.scheduleNextFrame(); worker.scheduleNextFrame();
    expect(worker.pendingFrames).toHaveLength(1);
    worker.advance(0);
    worker.scheduleNextFrame(); worker.advance(10000);
    expect(worker.acknowledgements).toEqual([0,10000]);
    worker.scheduleNextFrame(); worker.advance(10008);
    expect(worker.acknowledgements).toHaveLength(2);
    worker.advance(10017);
    expect(worker.acknowledgements).toHaveLength(3);
});

test('world buffers use native resolution, names stay sharp, and output needs four layer copies', () => {
    const worker = setup(); worker.send(frame());
    for (const id of ['background','high','entities','highEntities','lighting']) {
        expect(worker.canvases[id]).toMatchObject({width:480,height:224});
    }
    for (const id of ['text','combined']) expect(worker.canvases[id]).toMatchObject({width:1440,height:672});
    expect(worker.canvases.entities.ctx.scale).toHaveBeenCalledWith(1 / 3, 1 / 3);
    expect(worker.canvases.combined.ctx.drawImage.mock.calls.map(call => call[0])).toEqual([
        worker.canvases.entities, worker.canvases.text, worker.canvases.highEntities, worker.canvases.lighting
    ]);
});

test('panel shadow updates follow the sun and nearby indoor fire at the player', async () => {
    const worker = setup(), api = worker.sandbox, messages = [];
    api.postMessage = message => { if (message.type === 'rendered') messages.push(message); };
    api.fetch = async () => ({blob: () => ({})});
    api.createImageBitmap = async image => image;
    api.self.SceneEnvironment = require('./sceneenvironment');
    api.self.HeightShadows = {...require('./height-shadows-worker'), Pass: class {
        constructor() { this.pointFrame = {}; }
        draw() {}
        prepare() {}
        pointMask() { return null; }
    }};
    vm.runInContext('worldClock = self.WorldTime', api);
    await worker.send({type: 'setObstacles', obstacles: [], bodyMap: {
        mapId: 'main', profile: {height: 'main.png'}, width: 1, data: [1]
    }});
    const packet = frame();
    packet.mapId = 'main';
    packet.scene.dn_cycle = true;
    packet.renderData.find(layer => layer.id === 'lights').options.shadows = true;
    const sample = time => {
        worker.advance(time);
        worker.send(packet);
        worker.advance(time + 17);
        return messages.at(-1).panelShadow;
    };
    packet.worldTime = 7 * 150000;
    const morning = sample(1000);
    expect(morning.x).toBeLessThan(0);
    expect([morning.x, morning.y].every(Number.isInteger)).toBe(true);
    expect(sample(1250)).toBeUndefined();
    packet.worldTime = 16 * 150000;
    expect(sample(1500).x).toBeGreaterThan(0);

    packet.scene = {...packet.scene, dn_cycle: false, weatherExposure: 'indoor', darkness: .9};
    worker.send({type: 'setLights', lights: [{x: 80, y: 40, radius: 6, intensity: 1, animation: 'fire'}]});
    packet.player = {x: 104, y: 32};
    expect(sample(1750).x).toBeGreaterThan(0);
    packet.player.x = 40;
    expect(sample(2000).x).toBeLessThan(0);
    worker.send({type: 'setLights', lights: []});
    expect(sample(2250)).toEqual({x: 3, y: 6});
});

test('the main-map atlas powers outdoor shadows and the live proxy view', async () => {
    const worker = setup(), draw = jest.fn();
    worker.setTileset({width: 320, height: 3000});
    const atlas = {}, mask = {width: 320, height: 3000}, castSurface = {}, proxyView = {}, construct = jest.fn();
    const urls = ['../img/common/height-proxies/main.png', '../img/common/height-proxies/main-baked-shadows.png'];
    worker.sandbox.fetch = jest.fn(async url => ({blob: () => url === urls[1] ? mask : atlas}));
    worker.sandbox.createImageBitmap = async blob => blob;
    worker.sandbox.self.postMessage = jest.fn();
    worker.sandbox.self.SceneEnvironment = require('./sceneenvironment');
    worker.sandbox.self.HeightShadows = {...require('./height-shadows-worker'), Pass: class {
        constructor(...args) { construct(...args); }
        draw(...args) { draw(...args); return args[8] ? proxyView : castSurface; }
    }, skyLight: () => ({strength: .4})};
    vm.runInContext('worldClock = self.WorldTime', worker.sandbox);
    const bodyMap = {mapId: 'main', profile: {height: 'main.png', paint: 'main-baked-shadows.png'}, width: 1, data: [1]};
    const configure = () => worker.send({type: 'setObstacles', obstacles: [], bodyMap});
    const firstLoad = configure();
    await worker.send({type: 'setObstacles', obstacles: [], bodyMap: null});
    await firstLoad;
    expect(construct).not.toHaveBeenCalled();
    await configure();
    expect(worker.sandbox.fetch.mock.calls.map(([url]) => url)).toEqual(urls);
    expect(construct).toHaveBeenCalledWith(bodyMap, atlas);
    expect(worker.sandbox.self.postMessage).toHaveBeenCalledWith({type: 'shadowProxyAtlas', ready: true});
    const data = frame();
    data.mapId = 'main';
    data.scene.dn_cycle = 'true';
    data.scene.width = 2;
    const actor = data.renderData.find(layer => layer.type === 'entities').entityData[0];
    actor.translateX = 16 * 3; // The player stands inside the two-tile-wide test scene.
    actor.drawData[0].shadowBody = 'player';
    actor.drawData.unshift({...actor.drawData[0], shadowBody: undefined, spriteName: 'shadow16'});
    vm.runInContext("sprites.shadow16 = {image: 'contact-shadow'}", worker.sandbox);
    const actorContext = worker.canvases.entities.ctx;
    function drewBlob() {
        const drawn = actorContext.drawImage.mock.calls.some(([image]) => image === 'contact-shadow');
        actorContext.drawImage.mockClear();
        return drawn;
    }
    function tileSource(x) {
        const terrain = worker.canvases.background.ctx.drawImage.mock.lastCall[0];
        const tile = terrain.ctx.drawImage.mock.calls.find(call => call[1] === x * 16)[0];
        return tile;
    }
    const options = data.renderData.find(layer => layer.id === 'lights').options;
    options.shadows = true;
    worker.send(data);
    const cleaned = tileSource(0), original = tileSource(3);
    expect(cleaned.ctx.drawImage.mock.calls.map(([image]) => image)).toEqual([original.ctx.drawImage.mock.calls[0][0], mask]);
    expect(cleaned.ctx.drawImage.mock.calls[1].slice(1)).toEqual([0, 0, 16, 16, 0, 0, 16, 16]);
    expect(cleaned).toMatchObject({width: 16, height: 16});
    expect(worker.allocations.some(canvas => canvas.width === 320 && canvas.height === 3000)).toBe(false);
    const painted = actorContext.drawImage.mock.calls.map(([image]) => image);
    expect(painted).toEqual([worker.canvases.background, castSurface, 'contact-shadow', {avatar: true}]);
    expect(worker.canvases.highEntities.ctx.drawImage.mock.calls.map(([image]) => image)).toEqual([worker.canvases.high, castSurface]);
    expect(worker.canvases.lighting.ctx.drawImage.mock.calls.some(([image]) => image === castSurface)).toBe(false);
    expect(drewBlob()).toBe(true);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(draw.mock.calls[0][6]).toEqual({shadows: true, playerShadow: false});
    options.shadows = false;
    options.playerShadow = true;
    worker.send(data);
    expect(tileSource(0)).toBe(original);
    expect(drewBlob()).toBe(false);
    expect(draw.mock.calls[1][6]).toEqual({shadows: false, playerShadow: true});
    options.playerShadow = false;
    worker.send(data);
    expect(drewBlob()).toBe(true);
    expect(draw).toHaveBeenCalledTimes(2);
    options.inspectShadowProxies = true;
    worker.send(data);
    expect(worker.canvases.combined.ctx.drawImage.mock.lastCall[0]).toBe(proxyView);
    expect(drewBlob()).toBe(true);
    options.inspectShadowProxies = false;
    options.shadows = true;
    options.playerShadow = true;
    data.scene.weatherExposure = 'indoor';
    worker.send(data);
    expect(tileSource(0)).toBe(original);
    expect(drewBlob()).toBe(true);
    data.scene.weatherExposure = 'outdoor';
    data.mapId = 'duckville';
    worker.send(data);
    expect(drewBlob()).toBe(true);
    expect(draw).toHaveBeenCalledTimes(3);
    expect(worker.canvases.combined.ctx.drawImage.mock.lastCall[0]).toBe(worker.canvases.lighting);
    data.mapId = 'main';
    actor.drawData[1].spriteName = 'still-loading';
    worker.send(data);
    expect(drewBlob()).toBe(true);
});

test('a failed proxy image can be retried without restarting the game', async () => {
    const worker = setup(), api = worker.sandbox;
    api.self.postMessage = jest.fn();
    api.self.SceneEnvironment = require('./sceneenvironment');
    api.self.HeightShadows = {Pass: jest.fn()};
    api.fetch = jest.fn(async () => ({blob: () => 'atlas'}));
    api.createImageBitmap = jest.fn().mockRejectedValueOnce(new Error('Image unavailable')).mockResolvedValue('atlas');
    api.console = {log: jest.fn()};
    const map = {mapId: 'main', profile: {height: 'main.png', paint: 'main-baked-shadows.png'}, width: 1, data: [1]};
    await worker.send({type: 'setObstacles', obstacles: [], bodyMap: map});
    expect(api.self.postMessage).toHaveBeenCalledWith({type: 'shadowProxyAtlas', ready: false});
    expect(api.self.HeightShadows.Pass).not.toHaveBeenCalled();
    await worker.send({type: 'retryShadowProxyAtlas'});
    expect(api.self.HeightShadows.Pass).toHaveBeenCalledWith(map, 'atlas');
    expect(api.self.postMessage).toHaveBeenLastCalledWith({type: 'shadowProxyAtlas', ready: true});
});

test('effect lights use the current overhead mask inside the native scene lighting pass',()=>{
    const worker=setup(),registry=require('./render-extensions-worker')(),draw=jest.fn();
    registry.register('spark-light',{layer:'lighting',draw});
    worker.sandbox.effectRegistry=registry;vm.runInContext('rendererExtensions=effectRegistry',worker.sandbox);
    const data=frame(10.25,20.75);data.extensions={'spark-light':{active:true}};data.scene.darkness=.9;
    worker.send(data);
    expect(draw).toHaveBeenCalledWith(worker.canvases.lighting.ctx,{active:true},{cameraX:10,cameraY:21,scale:1,sources:{overhead:worker.canvases.highEntities}});
    expect(worker.canvases.highEntities.ctx.drawImage).toHaveBeenCalledWith(worker.canvases.high,0,0);
    draw.mockClear();worker.send(frame());expect(draw).not.toHaveBeenCalled();
});

test('palette cutouts preserve ledge pixels, reuse masked tiles and keep normal variants intact', () => {
    const worker = setup(), ctx = worker.canvases.background.ctx, image = {};
    worker.drawScaledImage(ctx, image, 0, 0, 16, 16, 0, 0, 1, null, [[254,173,2]]);
    const masked = worker.allocations.at(-1);
    expect(Array.from(masked.ctx.putImageData.mock.calls[0][0].data)).toEqual([254,173,2,0,100,70,40,255,72,196,248,255]);
    const warm = worker.allocations.length;
    worker.drawScaledImage(ctx, image, 0, 0, 16, 16, 16, 0, 1, null, [[254,173,2]]);
    expect(worker.allocations).toHaveLength(warm);
    worker.drawScaledImage(ctx, image, 0, 0, 16, 16, 32, 0, 1);
    expect(worker.allocations).toHaveLength(warm + 1);
    expect(worker.allocations.at(-1).ctx.putImageData).not.toHaveBeenCalled();
});

test('paint masks sample native coordinates on scaled tilesheets and share original tiles below their cropped edge', () => {
    const worker = setup(), target = worker.canvases.background.ctx;
    const artwork = {width: 1536, height: 3200}, maskA = {width: 768, height: 32}, maskB = {...maskA};
    const tile = (y, paint) => {
        worker.drawScaledImage(target, artwork, 64, y, 16, 16, 4, 7, 2, null, [], paint);
        return target.drawImage.mock.lastCall[0];
    };
    const normal = tile(32, null), masked = tile(32, maskA);
    expect(masked.ctx.drawImage.mock.calls[1]).toEqual([maskA, 32, 16, 8, 8, 0, 0, 32, 32]);
    expect(tile(32, maskA)).toBe(masked);
    expect(tile(32, maskB)).not.toBe(masked);
    expect(tile(32, null)).toBe(normal);
    const below = tile(64, maskA);
    expect(below.ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(tile(64, null)).toBe(below);
    expect(worker.allocations.some(canvas => canvas.width === artwork.width)).toBe(false);
});

test('recessed layers sit behind terrain and cutout changes invalidate static buffers once', () => {
    const worker = setup(); let cutouts = [];
    worker.sandbox.depthRegistry = {terrainCutouts: () => cutouts, draw: (plane, ctx) => {
        if (plane === 'background') ctx.drawImage('deep-surface', 0, 0);
    }};
    vm.runInContext('rendererExtensions = depthRegistry', worker.sandbox);
    worker.send(frame());
    expect(worker.canvases.entities.ctx.drawImage.mock.calls.slice(0, 2).map(call => call[0])).toEqual(['deep-surface', worker.canvases.background]);
    const previous = worker.canvases.background.ctx.drawImage.mock.calls.at(-1)[0];
    cutouts = [{x: 0, y: 0, w: 480, h: 224, colors: [[254,173,2]]}];
    worker.send(frame());
    const prepared = worker.canvases.background.ctx.drawImage.mock.calls.at(-1)[0];
    expect(prepared).not.toBe(previous);
    worker.send(frame());
    expect(worker.canvases.background.ctx.drawImage.mock.calls.at(-1)[0]).toBe(prepared);
    cutouts = []; worker.send(frame());
    expect(worker.canvases.background.ctx.drawImage.mock.calls.at(-1)[0]).not.toBe(prepared);
});

test('terrain bitmaps survive fractional camera scrolling and rebuild on tile changes, teleports and resize', () => {
    const worker = setup(); worker.send(frame());
    const warm = worker.allocations.length;
    worker.send(frame(3,2)); worker.send(frame(12,8));
    expect(worker.allocations).toHaveLength(warm);
    expect(worker.canvases.background.ctx.drawImage).toHaveBeenLastCalledWith(expect.anything(), -44, -40);
    worker.send(frame(12,8,2));
    expect(worker.allocations.length).toBe(warm + 2);
    worker.send(frame(1200,800,2));
    expect(worker.allocations.length).toBe(warm + 4);
    worker.send({type:'setCanvasSize',width:960,height:448});
    worker.send(frame(1200,800,2));
    expect(worker.canvases.entities).toMatchObject({width:320,height:150});
    expect(worker.state().terrain).toBe(2);
});

test('temporary tile replacements guard the current cell and restore cached baseline terrain on expiry', () => {
    const worker = setup(); let appearances = [];
    worker.sandbox.appearanceRegistry = {tileAppearance: () => appearances, draw() {}};
    vm.runInContext('rendererExtensions = appearanceRegistry', worker.sandbox);
    const packet = frame(), original = JSON.stringify(packet);
    const terrain = () => worker.canvases.background.ctx.drawImage.mock.calls.at(-1)[0];
    const tileAt = (buffer, x) => buffer.ctx.drawImage.mock.calls.find(call => call[1] === x * 16)[0];
    worker.send(packet);
    const baseline = terrain(), originalTile = tileAt(baseline, 3);
    expect(originalTile.ctx.drawImage.mock.calls[0].slice(1, 3)).toEqual([0, 0]);
    appearances = [{x: 3, y: 0, from: 1, to: 2}, {x: 4, y: 0, from: 2, to: 3}];
    worker.send(packet);
    const seasonal = terrain();
    expect(seasonal).not.toBe(baseline);
    expect(tileAt(seasonal, 3).ctx.drawImage.mock.calls[0].slice(1, 3)).toEqual([16, 0]);
    expect(tileAt(seasonal, 4)).toBe(originalTile); // Changed map content does not match the authored guard.
    worker.send(packet); expect(terrain()).toBe(seasonal);
    appearances = []; worker.send(packet);
    expect(terrain()).not.toBe(seasonal);
    expect(tileAt(terrain(), 3)).toBe(originalTile);
    expect(JSON.stringify(packet)).toBe(original);
});

test('temporary palette changes recolor only the selected existing detail', () => {
    const worker = setup();
    worker.sandbox.appearanceRegistry = {tileAppearance: () => [{x: 3, y: 0, from: 1,
        colorShift: {colorDifference: {r: 35, g: -25, b: 5}, progress: 1}}], draw() {}};
    vm.runInContext('rendererExtensions = appearanceRegistry', worker.sandbox);
    worker.send(frame());
    const buffer = worker.canvases.background.ctx.drawImage.mock.calls.at(-1)[0];
    const tinted = buffer.ctx.drawImage.mock.calls.find(call => call[1] === 48)[0];
    const ordinary = buffer.ctx.drawImage.mock.calls.find(call => call[1] === 64)[0];
    expect(Array.from(tinted.ctx.putImageData.mock.calls[0][0].data)).toEqual([255,148,7,255,135,45,45,255,107,171,253,255]);
    expect(ordinary.ctx.putImageData).not.toHaveBeenCalled();
});

test('the lighting pass clips tint, authored lights, tile lights and the lantern to pixel-aligned scene bounds', () => {
    const worker = setup(), ctx = worker.canvases.lighting.ctx;
    const scene = {x: 70, y: 221, width: 10, height: 9, darkness: .8};
    const left = scene.x * 16, top = scene.y * 16, right = (scene.x + scene.width) * 16, bottom = (scene.y + scene.height) * 16;
    worker.setPlayer({x: left, y: top});
    const light = (x, y) => ({x, y, radius: 4, intensity: .8});
    const sources = [light(left, top), light(right - 1, bottom - 1), light(right, top), light(left, bottom), light(left - 1, top)];
    const tiles = [light(left, top), light(right - 1, bottom - 1), light(right, top), light(left, bottom)];
    worker.renderLightOverlay(sources, left - 16.25, top - 32.75, 1, 0, scene, tiles, {shadows: false, playerShadow: false}, 'duckville', 0);
    expect(ctx.rect).toHaveBeenCalledWith(16, 33, 160, 144);
    expect(ctx.clip).toHaveBeenCalledTimes(1);
    expect(ctx.drawImage).toHaveBeenCalledTimes(5); // Two authored lights, two tile lights and the lantern.
    const methods = worker.operations.filter(row => row.id === 'lighting').map(row => row.method);
    expect(methods.slice(0, 6)).toEqual(['save', 'clearRect', 'beginPath', 'rect', 'clip', 'fillRect']);
    expect(methods.at(-1)).toBe('restore');

    worker.setPlayer({x: right, y: bottom});
    ctx.drawImage.mockClear();
    worker.renderLightOverlay([], left, top, 1, 0, scene, [], {}, 'duckville', 0);
    expect(ctx.drawImage).not.toHaveBeenCalled();
});

test('a frame without scene bounds keeps map lighting and clears the previous frame without a scene mask', () => {
    const worker = setup(), ctx = worker.canvases.lighting.ctx;
    worker.setPlayer({x: 32, y: 32});
    worker.renderLightOverlay([{x: 64, y: 64, radius: 4}], 0, 0, 1, 0, {darkness: .8}, [], {}, 'fixture', 0);
    expect(ctx.clip).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1440, 672);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
});

test('text reuses glyphs when positions or opacity change and clears departed labels', () => {
    const worker = setup(), entry = {text:'Local Looper',x:96,y:72,centered:true,globalAlpha:0.5};
    worker.send(frame(0,0,1,[entry]));
    const warm = worker.allocations.length, clears = worker.canvases.text.ctx.clearRect.mock.calls.length;
    worker.send(frame(0,0,1,[entry]));
    expect(worker.canvases.text.ctx.clearRect).toHaveBeenCalledTimes(clears);
    worker.send(frame(1,0,1,[{...entry,x:99,globalAlpha:1}]));
    expect(worker.allocations).toHaveLength(warm);
    expect(worker.state().labels).toBe(1);
    worker.send(frame(1,0,1,[]));
    expect(worker.canvases.text.ctx.clearRect).toHaveBeenCalledTimes(clears + 2);
    worker.fontReady(); worker.send(frame(1,0,1,[entry]));
    expect(worker.state().labels).toBe(1);
    expect(worker.allocations.length).toBe(warm + 1);
});

test('avatar names and titles share the body screen position on the art grid', () => {
    const worker = setup(), scale = 3;
    for (const [x, y, cameraX, cameraY] of [[32.2, 48.7, 20.6, 30.1], [32.8, 49.2, 21.1, 30.6]]) {
        const message = frame(cameraX, cameraY);
        const entities = message.renderData.find(data => data.type === 'entities');
        entities.entityData[0].translateX = x * scale;
        entities.entityData[0].translateY = y * scale;
        const names = [{text: 'Looper', x: (x + 8) * scale, y: (y - 12) * scale,
            centered: true, pixelAligned: true}];
        message.renderData.find(data => data.type === 'text').textData = names;
        worker.send(message);
        const label = worker.cachedLabel('Looper', 20, 5, 'white', '#373737');
        const [, nameX, nameY] = worker.canvases.text.ctx.drawImage.mock.calls.at(-1);
        const [bodyX, bodyY] = worker.canvases.entities.ctx.translate.mock.calls.at(-1);
        expect(nameX + label.x + label.advance / 2 - bodyX).toBeCloseTo(8 * scale, 8);
        expect(nameY + label.y - bodyY).toBeCloseTo(-12 * scale, 8);
    }
});

test('static and animated tile lights stay centered on the artwork as the fire animates', () => {
    const worker = setup();
    worker.send({type: 'setLightEmittingTiles', lightEmittingTiles: {241: {radius: 2}}});
    const packet = frame();
    const floor = packet.renderData.find(layer => layer.id === 'background');
    const fire = {...floor.tiles[0], tileid: 240, cellid: 33};
    floor.tiles = [fire];
    const animated = {...floor, clear: false, tiles: [{...fire, cellid: 34, slideOffsetX: 16}]};
    packet.renderData.splice(2, 0, animated);
    const ctx = worker.canvases.lighting.ctx;
    for (const offset of [16, 32]) {
        animated.tiles[0].slideOffsetX = offset;
        ctx.drawImage.mockClear();
        worker.send(packet);
        const centers = ctx.drawImage.mock.calls.slice(0, 2).map(call => [call[5] + 32, call[6] + 32]);
        expect(centers).toEqual([[56, 24], [72, 24]]);
    }
});

test('an offscreen window only enters the lighting pass when its cone can reach the camera', () => {
    const worker = setup(), ctx = worker.canvases.lighting.ctx;
    worker.setPlayer({x: -1000, y: -1000});
    const lamp = {x: 64, y: 105, radius: 8, spread: 145, intensity: .5};
    const canvas = worker.canvases.lighting;
    canvas.width = canvas.height = 96;
    const run = sources => {
        ctx.drawImage.mockClear();
        worker.renderLightOverlay(sources, 0, 0, 1, 0, {darkness: .8}, [], {shadows: false, playerShadow: false}, 'fixture', 0);
        return ctx.drawImage.mock.calls.length;
    };
    expect(run([{...lamp, angle: 0}])).toBe(0);
    expect(run([{...lamp, angle: 180}])).toBe(1);
    expect(run([{...lamp, spread: 0}])).toBe(1);
    expect(run([{...lamp, angle: 0, spread: 270}])).toBe(1);
    expect(run([{...lamp, x: -9, y: 64, angle: 90}])).toBe(0);
    expect(run([{...lamp, x: -9, y: 64, angle: 270}])).toBe(1);
});

test('fire pulses smoothly around authored settings, stays local to each source and pauses with dynamic lights', () => {
    const worker = setup();
    const base = {x:100,y:200,radius:4,intensity:0.8,animation:'fire'};
    const pulses = [];
    let previous = worker.updateAnimatedLightSource(base, 0);
    for (let time = 0; time < 2000; time += 16) {
        const animated = worker.updateAnimatedLightSource(base, time);
        pulses.push(animated.flamePulse);
        expect(animated).toEqual(worker.updateAnimatedLightSource(base, time));
        expect(Math.abs(animated.radius - base.radius)).toBeLessThanOrEqual(.18);
        expect(Math.abs(animated.intensity - base.intensity)).toBeLessThanOrEqual(.072);
        expect(Math.abs(animated.x - base.x)).toBeLessThanOrEqual(.55);
        expect(Math.abs(animated.y - base.y)).toBeLessThanOrEqual(.45);
        expect(Math.abs(animated.flamePulse - previous.flamePulse)).toBeLessThan(.14);
        previous = animated;
    }
    expect(Math.max(...pulses) - Math.min(...pulses)).toBeGreaterThan(1);
    expect(worker.updateAnimatedLightSource({...base, x: 150}, 0).flamePulse).not.toEqual(pulses[0]);
    worker.options(true, true, false);
    expect(worker.updateAnimatedLightSource(base, 0)).toBe(base);
    expect(base).toEqual({x:100,y:200,radius:4,intensity:0.8,animation:'fire'});
});

test('moving a static light does not create camera-specific gradients or canvases', () => {
    const worker = setup(); worker.options(false,false);
    const light = {x:100,y:200,radius:4,intensity:0.8};
    worker.drawLightSource(worker.canvases.lighting.ctx,light,0,0);
    const warm = worker.allocations.length;
    for (let x = 1; x < 200; x++) worker.drawLightSource(worker.canvases.lighting.ctx,{...light,x:100+x},x,x);
    expect(worker.allocations).toHaveLength(warm);
    expect(worker.state().cacheKeys).toHaveLength(1);
});

test('animated light and player shadows reuse scratch canvases without caching flicker frames', () => {
    const worker = setup(); worker.options(true,true); worker.setPlayer({x:96,y:96});
    const light = {x:100,y:100,radius:4,intensity:0.8,animation:'fire',shadow:0.5};
    worker.drawLightSource(worker.canvases.lighting.ctx,worker.updateAnimatedLightSource(light,0),0,0);
    const warm = worker.allocations.length;
    for (let time=1; time<200; time++) worker.drawLightSource(worker.canvases.lighting.ctx,worker.updateAnimatedLightSource(light,time),time,time);
    expect(worker.allocations).toHaveLength(warm);
    expect(worker.state().cacheKeys).toHaveLength(0);
});

test('building shadows stay cached while player shadows move and refresh when obstacles change', () => {
    const worker = setup(); worker.options(true,true); worker.setPlayer({x:96,y:96});
    worker.send({type:'setObstacles',obstacles:[{x:120,y:100,width:8,height:8}]});
    const calculate = jest.spyOn(worker.sandbox,'calculateShadow');
    const light = {x:100,y:100,radius:4,intensity:0.8,shadow:0.5};
    worker.drawLightSource(worker.canvases.lighting.ctx,light,0,0);
    expect(calculate).toHaveBeenCalledTimes(2);
    const warm = worker.allocations.length;
    for (let frame=0;frame<100;frame++) {
        worker.setPlayer({x:96 + frame % 10,y:96});
        worker.drawLightSource(worker.canvases.lighting.ctx,light,frame,frame);
    }
    expect(worker.allocations).toHaveLength(warm);
    expect(calculate).toHaveBeenCalledTimes(102);
    expect(worker.state().cacheKeys).toHaveLength(2);
    worker.send({type:'setObstacles',obstacles:[{x:128,y:100,width:8,height:8}]});
    worker.drawLightSource(worker.canvases.lighting.ctx,light,0,0);
    expect(calculate).toHaveBeenCalledTimes(104);
});

test('image caches are bounded by bytes and replacing a key does not duplicate eviction entries', () => {
    const worker = setup();
    const first = new worker.Canvas(512,512), replacement = new worker.Canvas(512,512);
    worker.addToImageCache('same',first); worker.addToImageCache('same',replacement);
    expect(worker.state().cacheKeys).toEqual(['same']);
    for (let index=0;index<20;index++) worker.addToImageCache('canvas'+index,new worker.Canvas(512,512));
    expect(worker.state().cacheBytes).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(worker.state().cacheKeys).toHaveLength(8);
});

test('staged terrain does not grow its visible array, and farming changes invalidate the cached command', () => {
    const sandbox = {console, _: {forEach: (values,fn) => values.forEach(fn)},
        define: (dependencies,factory) => {sandbox.Renderer = factory();}};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname,'lib/class.js'),'utf8'),sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname,'renderer.js'),'utf8'),sandbox);
    const visible = [{tileid:0,cellid:0,gridW:30,setW:16}];
    const renderer = Object.assign(Object.create(sandbox.Renderer.prototype), {
        camera: {x:0,y:0}, scale:3, tileset: {width:256,height:256},
        game: {currentTime:0, visibleTerrainTiles: visible,
            tileStages: {'1.1': {x:1,y:1,tile:2,stage:0}},
            map: {width:30,tilesize:16,isHighTile:()=>false,isAnimatedTile:()=>false,GridPositionToTileIndex:()=>30}}
    });
    const initial = renderer.drawTerrain();
    for (let frame=0;frame<1000;frame++) expect(renderer.drawTerrain().tiles).toHaveLength(2);
    expect(visible).toHaveLength(1);
    expect(renderer.drawTerrain().tiles).toBe(initial.tiles);
    renderer.game.tileStages['1.1'].stage = 1;
    renderer.game.terrainRevision = 1;
    const changed = renderer.drawTerrain();
    expect(changed.revision).not.toBe(initial.revision);
    expect(changed.tiles[1].tileid).toBe(3);
    renderer.game.tileStages = {}; renderer.game.terrainRevision++;
    expect(renderer.drawTerrain().tiles).toHaveLength(1);
});

test('combat number scaling and rotation reuse one bitmap and isolate transforms from normal labels', () => {
    const worker = setup();
    const number = {text: '500!', x: 96, y: 72, centered: true, fontSize: 30, fontWeight: 'bold', textScale: 1.8, rotation: -0.08};
    const name = {text: 'Local Looper', x: 96, y: 96, centered: true};
    worker.send(frame(0, 0, 1, [number, name]));
    const warm = worker.allocations.length;
    const ctx = worker.canvases.text.ctx;
    expect(ctx.scale).toHaveBeenCalledWith(1.8, 1.8);
    expect(ctx.rotate).toHaveBeenCalledWith(-0.08);
    for (let index = 0; index < 60; index++) {
        worker.send(frame(0, 0, 1, [{...number, textScale: 1.8 - index / 100, rotation: -0.08 + index / 1000}, name]));
    }
    expect(worker.allocations).toHaveLength(warm);
    expect(worker.state().labels).toBe(2);
    expect(ctx.save.mock.calls.length).toBe(ctx.restore.mock.calls.length);
    const calls = worker.operations.filter(operation => operation.id === 'text');
    const lastName = calls.map(operation => operation.method).lastIndexOf('drawImage');
    expect(calls[lastName - 1].method).toBe('restore');
});


test('combat labels render above foreground overlays every frame without clearing the world',()=>{
    const worker=setup(), message=frame();
    vm.runInContext("rendererExtensions = {draw(layer,ctx){if(layer==='foreground')ctx.fillRect(1,2,3,4);}}",worker.sandbox);
    const entry={text:'Awesome!',x:100,y:120,fontSize:30,color:'#fff',strokeColor:'#333'};
    message.renderData.push({type:'combatText',id:'text',cameraX:0,cameraY:0,scale:3,textData:[entry]});
    message.combatFeedback={shake:{x:2,y:-1},scale:3,impacts:[],target:null};
    for(let i=0;i<2;i++){
        worker.canvases.combined.ctx.clearRect.mockClear();
        worker.send(message);
        const ctx=worker.canvases.combined.ctx,label=worker.cachedLabel('Awesome!',30,5,'#fff','#333');
        expect(ctx.drawImage.mock.calls.at(-1)[0]).toBe(label.canvas);
        expect(ctx.clearRect).toHaveBeenCalledTimes(1);
        expect(ctx.translate).toHaveBeenCalledWith(6,-3);
        expect(ctx.drawImage.mock.invocationCallOrder.at(-1)).toBeGreaterThan(ctx.fillRect.mock.invocationCallOrder.at(-1));
    }
    expect(message.renderData.find(data=>data.type==='entities').cameraX).toBe(0);
});

test('trunks interleave with actor feet while ground effects remain beneath them', () => {
    const worker = setup(), message = frame();
    vm.runInContext(`rendererExtensions = {draw(){}, sorted(){return [
        {y: 25, draw(ctx){ctx.fillRect(25,0,1,1);}},
        {y: 45, draw(ctx){ctx.fillRect(45,0,1,1);}}
    ];}}`, worker.sandbox);
    const actors = message.renderData.find(row => row.type === 'entities');
    const base = actors.entityData[0];
    actors.entityData = [{...base, depthY: 80, groundEffect: true}, {...base, depthY: 20}, {...base, depthY: 30}, {...base, depthY: 50}];
    worker.send(message);
    const draws = worker.operations.filter(op => op.id === 'entities' &&
        (op.method === 'fillRect' || op.method === 'drawImage' && op.args[0]?.avatar));
    expect(draws.map(op => op.method === 'fillRect' ? op.args[0] : 'actor')).toEqual(['actor', 'actor', 25, 'actor', 45, 'actor']);
});

test('paints every fallback contact below overlapping actors, equipment and depth-sorted scenery', () => {
    const worker = setup(), message = frame();
    vm.runInContext(`for (const name of ['shadow16', 'player', 'weapon', 'mob']) sprites[name] = {image: name};
        rendererExtensions = {draw(){}, sorted(){return [{y: 32, draw(ctx){ctx.drawImage('trunk', 0, 0);}}];}};`, worker.sandbox);
    const actors = message.renderData.find(row => row.type === 'entities');
    const base = actors.entityData[0];
    function actor(depthY, globalAlpha, parts) {
        return {...base, depthY, globalAlpha, drawData: parts.map(spriteName => ({...base.drawData[0], spriteName}))};
    }
    actors.entityData = [actor(31, 1, ['shadow16', 'player', 'weapon']), actor(33, .4, ['shadow16', 'mob']),
        {...actor(34, 1, ['shadow16', 'mob']), dissolve: {visible: 0, pixelSize: 3}}];
    const calls = [], ctx = worker.canvases.entities.ctx;
    ctx.drawImage.mockImplementation(image => { if (typeof image === 'string') calls.push([image, ctx.globalAlpha]); });
    worker.send(message);
    expect(calls.map(([image]) => image)).toEqual(['shadow16', 'shadow16', 'player', 'weapon', 'trunk', 'mob']);
    expect(calls.slice(0, 2)).toEqual([['shadow16', 1], ['shadow16', .4]]);
});

test('night particles use the authored daylight window and shared map weather takes precedence', () => {
    const worker=setup(), E=require('./sceneenvironment');
    worker.sandbox.importScripts=jest.fn();
    const scene={x:0,y:0,width:10,height:10,authoringAtmosphere:{cycle:true,dayDarkness:0,nightDarkness:.8,color:'#142438',dayNight:E.defaults.dayNight,weather:{...E.defaults.weather,type:'sunrays'}}};
    expect(worker.sceneDaylight(scene,2/24*3600000)).toBe(0);
    expect(worker.sceneDaylight(scene,12/24*3600000)).toBe(1);
    const draw=jest.fn();worker.sandbox.self.SceneWeather={...require('./weather-worker'),draw};
    scene.weather={...E.defaults.weather,type:'rain',intensity:.6};
    const clock = 12/24*3600000;
    worker.drawSceneWeather({},scene,{cameraX:0,cameraY:0,scale:1},clock,1000);
    expect(draw.mock.calls[0][1]).toMatchObject({rain:.6,sunrays:0});
    worker.drawSceneWeather({},scene,{cameraX:0,cameraY:0,scale:1},clock,1016);
    expect(draw.mock.calls[1][1]).toEqual(draw.mock.calls[0][1]);
    expect(draw.mock.calls.map(call=>call[3])).toEqual([1000,1016]);
    draw.mockClear();scene.weather=null;
    worker.drawSceneWeather({},scene,{cameraX:0,cameraY:0,scale:1},12/24*3600000);
    expect(draw).not.toHaveBeenCalled();
});

test.each(['main', 'duckville', 'unprofiled'])('indoor finite lights in %s use the configured terrain or actor-only field', async mapId => {
    const worker = setup();
    const authored = {x: 24, y: 32, radius: 4, intensity: .6, shadow: .8};
    const fallback = {x: 44, y: 32, radius: 4, intensity: .4, shadow: 0};
    worker.send({type: 'setLights', lights: [authored, fallback]});
    const pass = {pointFrame: {}, prepare: jest.fn(), pointMask: jest.fn(), draw: jest.fn()};
    const construct = jest.fn(() => pass);
    worker.sandbox.self.HeightShadows = {Pass: construct, casterClip: () => ({})};
    worker.sandbox.self.SceneEnvironment = {outdoors: () => false};
    const profile = require('../img/common/height-proxies/catalog.json')[mapId];
    worker.sandbox.fetch = jest.fn(async () => ({blob: async () => ({})}));
    worker.sandbox.createImageBitmap = jest.fn(async blob => blob);
    const bodyMap = profile ? {mapId, profile, width: 1, data: [1]} : null;
    await worker.send({type: 'setObstacles', obstacles: [], bodyMap});
    if (profile) expect(construct).toHaveBeenCalledWith(bodyMap, expect.any(Object));
    construct.mockClear();
    const packet = frame();
    packet.mapId = mapId;
    packet.renderData.find(data => data.id === 'lights').options.shadows = true;
    worker.send(packet);
    expect(construct).toHaveBeenCalledTimes(profile ? 0 : 1);
    expect(pass.prepare).toHaveBeenCalledTimes(1);
    expect(pass.prepare.mock.calls[0][3]).toBe(packet.renderData.find(data => data.type === 'entities').entityData);
    expect(pass.pointMask.mock.calls.map(([source]) => source)).toContain(authored);
    expect(pass.pointMask.mock.calls.map(([source]) => source)).not.toContain(fallback);
    expect(pass.draw).not.toHaveBeenCalled();
});

test('the foreground stencil keeps depth-sorted trunks and equipment lit but cuts out opaque overhead terrain', () => {
    const worker = setup(); worker.loadSprite();
    const view = frame().renderData.find(d => d.type === 'entities');
    view.entityData[0].drawData.push({...view.entityData[0].drawData[0], spriteName: 'held-item', renderAbove: true});
    vm.runInContext("sprites['held-item'] = {image: 'item'}", worker.sandbox);
    const mask = worker.sandbox.pointForeground(view, [{draw: ctx => ctx.drawImage('trunk', 0, 0)}]);
    const passes = mask.canvas.ctx.drawImage.mock.calls.map(call => call[0]);
    expect(passes).toEqual(['trunk', {avatar: true}, worker.canvases.high, 'item']);
});

test('an indoor foot-contact sprite gives way inside an external torch beam and returns outside it', () => {
    const worker = setup(), packet = frame();
    packet.mapId = 'duckville';
    const settings = packet.renderData.find(layer => layer.id === 'lights').options;
    settings.shadows = true; settings.playerShadow = true;
    const view = packet.renderData.find(layer => layer.type === 'entities'), actor = view.entityData[0];
    actor.drawData[0].shadowBody = 'player';
    actor.drawData.unshift({...actor.drawData[0], spriteName: 'shadow16', shadowBody: undefined});
    const pass = {pointFrame: {}, prepare: jest.fn(), pointMask: jest.fn()};
    worker.sandbox.self.HeightShadows = {...require('./height-shadows-worker'), Pass: jest.fn(() => pass)};
    vm.runInContext("sprites.shadow16 = {image: 'contact'}", worker.sandbox);
    function contact(lights) {
        worker.send({type: 'setLights', lights});
        worker.canvases.entities.ctx.drawImage.mockClear();
        worker.send(packet);
        return worker.canvases.entities.ctx.drawImage.mock.calls.some(([image]) => image === 'contact');
    }
    const torch = {x: 40, y: 30, radius: 3, shadow: .8, spread: 70, angle: 0};
    expect(contact([])).toBe(true); // The carried lantern cannot replace its carrier's contact.
    expect(contact([torch])).toBe(false);
    expect(contact([{...torch, angle: 180}])).toBe(true);
    expect(contact([{...torch, x: 300}])).toBe(true);
    expect(contact([{...torch, shadow: 0}])).toBe(true);
});

test('point lights restrict their scratch work to the viewport and clip only foreground that intersects a cast', () => {
    const worker = setup(), target = worker.canvases.lighting;
    target.width = 100; target.height = 80;
    const foreground = new worker.Canvas(100, 80), mask = new worker.Canvas(64, 64);
    const getForeground = jest.fn(() => ({canvas: foreground, regions: [{left: 4, top: 20, right: 10, bottom: 26}]}));
    const frame = {foreground: getForeground};
    const shadow = {canvas: mask, x: -22, y: 3};
    const pass = {pointFrame: frame, pointMask: () => shadow};
    const lamp = {x: 10, y: 35, radius: 2, shadow: .7};

    worker.drawLightSource(target.ctx, lamp, 0, 0, pass);
    const light = target.ctx.drawImage.mock.calls.at(-1)[0];
    expect(light.ctx.clearRect).toHaveBeenLastCalledWith(0, 0, 42, 64);
    const clipped = light.ctx.drawImage.mock.calls.at(-1)[0];
    expect(clipped.ctx.drawImage).toHaveBeenCalledWith(foreground, 0, 3, 42, 64, 0, 0, 42, 64);

    shadow.x = 58; shadow.y = 0;
    worker.drawLightSource(target.ctx, {...lamp, x: 90, y: 32}, 0, 0, pass);
    expect(light.ctx.drawImage.mock.calls.at(-1)[0]).toBe(mask);
    expect(getForeground).toHaveBeenCalledTimes(1);

    shadow.x = 95; shadow.y = 76;
    worker.drawLightSource(target.ctx, {...lamp, x: 127, y: 108}, 0, 0, pass);
    expect(light.ctx.clearRect).toHaveBeenLastCalledWith(0, 0, 5, 4);
    expect(target.ctx.drawImage.mock.calls.at(-1).slice(1)).toEqual([0, 0, 5, 4, 95, 76, 5, 4]);
});

test('foreground coverage keeps flipped gear in screen coordinates and treats custom painting conservatively', () => {
    const worker = setup(), view = frame().renderData.find(layer => layer.type === 'entities');
    const realCanvas = worker.sandbox.OffscreenCanvas;
    worker.sandbox.OffscreenCanvas = class extends realCanvas {
        constructor(...args) {
            super(...args);
            this.ctx.getTransform = () => ({a: -1 / 3, d: 1 / 3, e: 20, f: 32});
        }
    };
    const actor = view.entityData[0];
    actor.drawData[0] = {...actor.drawData[0], dx: -6, dy: -9, dW: 24, dH: 30};
    expect(worker.sandbox.pointForeground(view, []).regions).toEqual([{left:14, right:22, top:29, bottom:39}]);
    actor.drawData[0].a = .2;
    expect(worker.sandbox.pointForeground(view, []).regions).toBeNull();
    expect(worker.sandbox.pointForeground(view, [{draw(){}}]).regions).toBeNull();
});

test('a tileset with a height atlas and no paint mask casts and inspects without altering its tile artwork', async () => {
    const worker = setup(), api = worker.sandbox;
    const original = {width: 320, height: 320}, atlas = {}, cast = {}, diagnostic = {};
    const draw = jest.fn((...args) => args[8] ? diagnostic : cast);
    const pass = {draw, pointFrame: {}, pointMask: jest.fn()};
    const construct = jest.fn(() => pass);
    worker.setTileset(original);
    api.self.HeightShadows = {...require('./height-shadows-worker'), Pass: construct, skyLight: () => ({strength: .5})};
    api.self.SceneEnvironment = {outdoors: () => true};
    api.fetch = jest.fn(async () => ({blob: async () => atlas}));
    api.createImageBitmap = jest.fn(async blob => blob);
    vm.runInContext('worldClock = self.WorldTime', api);
    const profile = require('../img/common/height-proxies/catalog.json').duckville;
    const bodyMap = {mapId: 'duckville', width: 1, data: [1], profile};
    await worker.send({type: 'setObstacles', obstacles: [], bodyMap});
    expect(api.fetch.mock.calls.map(([url]) => url)).toEqual(['../img/common/height-proxies/duckville.png']);
    expect(construct).toHaveBeenCalledWith(bodyMap, atlas);
    const packet = frame(); packet.mapId = 'duckville';
    const lights = packet.renderData.find(layer => layer.id === 'lights');
    lights.options.shadows = true;
    worker.send(packet);
    expect(draw).toHaveBeenCalledTimes(1);
    const background = worker.canvases.background.ctx.drawImage.mock.lastCall[0];
    const firstTile = background.ctx.drawImage.mock.calls.find(call => call[1] === 0)[0];
    expect(firstTile.ctx.drawImage.mock.calls[0][0]).toBe(original);
    expect(worker.canvases.entities.ctx.drawImage.mock.calls.some(([image]) => image === cast)).toBe(true);
    lights.options.inspectShadowProxies = true;
    worker.send(packet);
    expect(worker.canvases.combined.ctx.drawImage.mock.lastCall[0]).toBe(diagnostic);
    // An in-flight client frame for a different map must not use this atlas.
    packet.mapId = 'main'; lights.options.shadows = false;
    worker.send(packet);
    expect(draw).toHaveBeenCalledTimes(2);
});

test('a slower tileset load cannot replace the active profile after changing maps', async () => {
    const worker = setup(), api = worker.sandbox;
    const oldAtlas = {close: jest.fn()}, oldPaint = {close: jest.fn()}, currentAtlas = {close: jest.fn()};
    const catalog = require('../img/common/height-proxies/catalog.json');
    const oldMap = {mapId: 'main', width: 1, data: [1], profile: catalog.main};
    const currentMap = {mapId: 'duckville', width: 1, data: [2], profile: catalog.duckville};
    let release;
    const delayed = new Promise(resolve => { release = () => resolve(oldAtlas); });
    api.fetch = jest.fn(async url => ({blob: () => url.endsWith('/main.png') ? delayed :
        Promise.resolve(url.endsWith('/duckville.png') ? currentAtlas : oldPaint)}));
    api.createImageBitmap = jest.fn(async blob => blob);
    api.self.HeightShadows = {Pass: jest.fn()};
    api.self.SceneEnvironment = require('./sceneenvironment');
    const obsolete = worker.send({type: 'setObstacles', obstacles: [], bodyMap: oldMap});
    await worker.send({type: 'setObstacles', obstacles: [], bodyMap: currentMap});
    release(); await obsolete;
    expect(api.self.HeightShadows.Pass).toHaveBeenCalledTimes(1);
    expect(api.self.HeightShadows.Pass).toHaveBeenCalledWith(currentMap, currentAtlas);
    expect(oldAtlas.close).toHaveBeenCalledTimes(1);
    expect(oldPaint.close).toHaveBeenCalledTimes(1);
    expect(currentAtlas.close).not.toHaveBeenCalled();
    const ready = api.self.postMessage.mock.calls.map(([m]) => m).filter(m => m.ready);
    expect(ready).toHaveLength(1);
    // Reuse image data, rebuilding the height field for this map's own tiles.
    const otherMap = {...currentMap, mapId: 'other', data: [3]};
    await worker.send({type: 'setObstacles', obstacles: [], bodyMap: otherMap});
    expect(api.self.HeightShadows.Pass).toHaveBeenLastCalledWith(otherMap, currentAtlas);
    expect(api.fetch).toHaveBeenCalledTimes(3);
    await worker.send({type: 'setObstacles', obstacles: [], bodyMap: null});
    expect(api.self.postMessage).toHaveBeenLastCalledWith({type: 'shadowProxyAtlas', available: false, ready: false});
});

test('daytime cloud cover dims outdoor ambient and sun casts while preserving the lamp geometry', async () => {
    const worker = setup(), api = worker.sandbox;
    const sky = [], lamps = [], weather = {...require('./sceneenvironment').defaults.weather, type:'cloudy', intensity:1};
    api.fetch = async () => ({blob: () => ({})});
    api.createImageBitmap = async image => image;
    api.self.SceneEnvironment = require('./sceneenvironment');
    api.self.SceneWeather = {...require('./weather-worker'), draw() {}};
    api.self.HeightShadows = {...require('./height-shadows-worker'), Pass: class {
        constructor() { this.pointFrame = {}; }
        draw(canvas, view, scene, light) { sky.push(light); }
        prepare() {}
        pointMask(light) { lamps.push([light.x,light.y,light.radius,light.shadow]); }
    }};
    vm.runInContext('worldClock = self.WorldTime', api);
    await worker.send({type:'setObstacles',obstacles:[],bodyMap:{mapId:'main',profile:{height:'main.png'},width:1,data:[1]}});
    worker.send({type:'setLights',lights:[{x:60,y:40,radius:5,shadow:.8}]});
    const packet = frame(), options = packet.renderData.find(l=>l.id === 'lights').options;
    packet.mapId = 'main'; packet.worldTime = 9 * 150000;
    packet.scene = {...packet.scene,dn_cycle:true,weather};
    Object.assign(options,{shadows:true,ambience:true,playerShadow:true});
    function light() { worker.send(packet); return vm.runInContext('GLOBAL_LIGHT_INTENSITY',api); }
    const underCloud = light(), cloudy = sky.at(-1), originalLamps = [...lamps];
    expect(cloudy.cloudCover).toBeGreaterThan(0);
    // Local weather replaces the authored preset until the tester restores Map weather.
    packet.previewWeather = 'clear';
    lamps.length=0;
    expect(light()).toBeGreaterThan(underCloud);
    expect(sky.at(-1).strength).toBeGreaterThan(cloudy.strength);
    expect(lamps).toEqual(originalLamps);
    expect(packet.scene.weather).toBe(weather);
    packet.previewWeather = '';
    expect(light()).toBe(underCloud);
    options.ambience = false; light();
    expect(sky.at(-1).cloudCover).toBeUndefined();
    options.ambience = true; packet.worldTime = 20 * 150000; light();
    expect(sky.at(-1).sun).toBe(false);
    expect(sky.at(-1).cloudCover).toBeUndefined();
    const count = sky.length;
    packet.scene.weatherExposure='indoor'; light();
    expect(sky).toHaveLength(count);
    expect(vm.runInContext('frameWeather.sunCover',api)).toBeUndefined();
});

test('outdoor rectangles enable preview weather and sun only on the selected map and outside authored rooms', async () => {
    const worker = setup(), api = worker.sandbox, sky = jest.fn();
    api.fetch = async () => ({blob: () => ({})});
    api.createImageBitmap = async image => image;
    api.self.SceneEnvironment = require('./sceneenvironment');
    api.self.SceneWeather = {...require('./weather-worker'), draw() {}};
    api.self.HeightShadows = {...require('./height-shadows-worker'), Pass: class {
        constructor() { this.pointFrame = {}; }
        prepare() {}
        pointMask() {}
        draw(...args) { sky(args[2], args[3]); }
    }};
    const area = {x: 1, y: 1, width: 4, height: 4};
    const bodyMap = {mapId: 'cobsfarm', width: 8, data: [1], profile: {height: 'cobsfarm.png', outdoors: {cobsfarm: [area]}}};
    await worker.send({type: 'setObstacles', obstacles: [], bodyMap});
    const packet = frame();
    Object.assign(packet, {mapId: 'cobsfarm', worldTime: 9 * 150000, scene: {darkness: 0}, previewWeather: 'cloudy'});
    packet.renderData.find(layer => layer.id === 'lights').options.shadows = true;
    vm.runInContext('worldClock = self.WorldTime', api);
    worker.send(packet);
    expect(sky).toHaveBeenCalledWith(expect.objectContaining(area), expect.objectContaining({sun: true, cloudCover: expect.any(Number)}));
    packet.scene = {...area, weatherExposure: 'indoor', darkness: .8};
    worker.send(packet);
    expect(vm.runInContext('frameWeather', api)).toBeUndefined();
    packet.scene = {darkness: 0};
    packet.player.x = (area.x + area.width) * 16;
    worker.send(packet);
    expect(vm.runInContext('frameWeather', api)).toBeUndefined();
    expect(sky).toHaveBeenCalledTimes(1);
});

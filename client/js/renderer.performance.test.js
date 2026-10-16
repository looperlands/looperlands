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
        return ctx;
    }
    class Canvas {
        constructor(width, height, id = 'scratch') {
            this.width = width; this.height = height; this.ctx = context(id); allocations.push(this);
        }
        getContext() { return this.ctx; }
    }
    const sandbox = {
        self: {WorldTime: require('./worldtime-worker'), WorldParticles: require('./worldparticles-worker')},
        OffscreenCanvas: Canvas, console, performance: {now: () => now},
        requestAnimationFrame: callback => pendingFrames.push(callback),
        postMessage: message => {if (message.type === 'rendered') acknowledgements.push(now);}
    };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);
    const api = vm.runInContext(`({render, drawText, cachedLabel, drawLightSource, updateAnimatedLightSource, scheduleNextFrame,
        addToImageCache, clearImageCache, clearTextCache,
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

test('fire flicker never changes the map light or compounds radius, intensity and position over time', () => {
    const worker = setup();
    const base = {x:100,y:200,radius:4,intensity:0.8,animation:'fire'};
    for (let time = 0; time < 2000; time++) {
        const animated = worker.updateAnimatedLightSource(base, time);
        expect(animated).not.toBe(base);
        expect(animated.radius).toBeGreaterThanOrEqual(3.97);
        expect(animated.radius).toBeLessThan(4.07);
        expect(Math.abs(animated.x - base.x)).toBeLessThanOrEqual(0.4);
        expect(Math.abs(animated.y - base.y)).toBeLessThanOrEqual(0.4);
    }
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

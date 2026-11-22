const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {Bars} = require('./mobhealthbar-worker');

const source = fs.readFileSync(path.join(__dirname, 'renderer-webworker.js'), 'utf8');

function setup() {
    const allocations = [], operations = [], barInstances = [];
    const barDraw = jest.fn();
    class ObservedBars extends Bars {
        constructor() { super(); barInstances.push(this); }
        draw(...args) { barDraw(...args); super.draw(...args); }
    }

    function context(canvas) {
        const stack = [];
        const ctx = {canvas};
        const reset = () => {
            Object.assign(ctx, {globalCompositeOperation: 'source-over', globalAlpha: 1,
                imageSmoothingEnabled: true, fillStyle: '#000000', font: ''});
            stack.length = 0;
        };
        reset();
        const record = (method, args) => operations.push({canvas, method, args,
            composite: ctx.globalCompositeOperation, alpha: ctx.globalAlpha, fillStyle: ctx.fillStyle});
        for (const method of ['clearRect', 'translate', 'scale', 'rotate', 'beginPath', 'moveTo', 'lineTo',
            'closePath', 'fill', 'fillRect', 'arc', 'rect', 'clip', 'strokeText', 'fillText', 'drawImage']) {
            ctx[method] = jest.fn((...args) => record(method, args));
        }
        ctx.save = jest.fn(() => {
            record('save', []);
            stack.push({globalCompositeOperation: ctx.globalCompositeOperation, globalAlpha: ctx.globalAlpha,
                imageSmoothingEnabled: ctx.imageSmoothingEnabled, fillStyle: ctx.fillStyle, font: ctx.font});
        });
        ctx.restore = jest.fn(() => { record('restore', []); Object.assign(ctx, stack.pop()); });
        ctx.measureText = jest.fn(text => ({width: text.length * 6,
            actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2}));
        ctx.createRadialGradient = ctx.createConicGradient = jest.fn(() => ({addColorStop: jest.fn()}));
        return {ctx, reset};
    }

    class Canvas {
        constructor(width, height, id = 'scratch') {
            this.id = id; this._width = width; this._height = height;
            const {ctx, reset} = context(this);
            this.ctx = ctx; this.reset = reset;
            allocations.push(this);
        }
        get width() { return this._width; }
        set width(value) { this._width = value; this.reset(); }
        get height() { return this._height; }
        set height(value) { this._height = value; this.reset(); }
        getContext() { return this.ctx; }
    }

    const sandbox = {OffscreenCanvas: Canvas, console, performance: {now: () => 0},
        requestAnimationFrame: jest.fn(), postMessage: jest.fn(),
        self: {postMessage: jest.fn(), WorldTime: require('./worldtime-worker')},
        importScripts: jest.fn(name => {
            if (name === 'mobhealthbar-worker.js') sandbox.self.MobHealthBars = {Bars: ObservedBars};
            else if (name === 'emissive-glow-worker.js') vm.runInContext(fs.readFileSync(path.join(__dirname, name), 'utf8'), sandbox);
        })};
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);
    const api = vm.runInContext(`({drawWorldUi, drawText,
        initialize() { tileset = {}; hasLoadedFont = true; sprites.body = {image: {}, groundOffsetY: 0}; },
        setExtensions(value) { rendererExtensions = value; },
        pendingAnchor(value) { sprites.body.autoGroundAnchor = true; sprites.body.groundAnchorPending = value; }
    })`, sandbox);
    api.initialize();
    const canvases = {};
    for (const id of ['background', 'high', 'entities', 'highEntities', 'text', 'lighting', 'combined']) {
        canvases[id] = new Canvas(192, 96, id);
        sandbox.onmessage({data: {type: 'setCanvas', id, canvas: canvases[id]}});
    }
    return {...api, canvases, allocations, operations, barDraw, barInstances,
        send: (data, ports) => sandbox.onmessage({data, ports})};
}

function frame({scale = 3, cameraX = 10.6, cameraY = 20.1, hp = 100, time = 0,
    names = true, bars = true, reducedMotion = false} = {}) {
    const actor = {bodySpriteName: 'body', groundOffsetY: 0, translateX: 32 * scale,
        translateY: 48 * scale, drawData: [], ...(bars ? {
            healthBar: {id: 'mob', x: 30.2, y: 30.2, hp, maxHp: 100, width: 28}
        } : {})};
    return {type: 'render', player: {x: -1000, y: -1000}, worldTime: 0,
        scene: {x: 0, y: 0, width: 100, height: 100, darkness: 0.8},
        renderData: [
            ...['high', 'background'].map(id => ({id, type: 'render', tiles: [], cameraX,
                cameraY, scale, clear: true, revision: 1})),
            {id: 'entities', type: 'entities', entityData: [actor], cameraX, cameraY, scale,
                healthTime: time, reducedMotion},
            {id: 'text', type: 'text', cameraX, cameraY, scale, textData: names ? [{
                text: 'Rat', x: 30.2 * scale, y: 24.2 * scale, centered: true, pixelAligned: true,
                bodySpriteName: 'body', groundOffsetY: 0, color: '#fff0c4', strokeColor: '#211d28'
            }] : []},
            {id: 'lights', type: 'render', tiles: [], cameraX, cameraY, scale,
                options: {shadows: false, playerShadow: false}}
        ]};
}

function uiSurface(worker) {
    const known = new Set(Object.values(worker.canvases));
    return worker.canvases.combined.ctx.drawImage.mock.calls.map(call => call[0])
        .find(canvas => canvas && !known.has(canvas));
}

test('a draw request is acknowledged once the worker composites the destination', () => {
    const worker = setup(), port = {postMessage: jest.fn(), close: jest.fn()};
    worker.send({type: 'notifyOnDraw'}, [port]);
    worker.setExtensions({ready: () => false});
    worker.send(frame());
    expect(port.postMessage).not.toHaveBeenCalled();
    worker.setExtensions(null);
    worker.send(frame());
    worker.send(frame());
    expect(port.postMessage).toHaveBeenCalledTimes(1);
    expect(port.close).toHaveBeenCalledTimes(1);
});

test('world labels stay below lighting and overhead scenery while bars remain above lighting', () => {
    const worker = setup();
    worker.setExtensions({draw(layer, ctx) {
        if (layer === 'foreground') ctx.fillRect(1, 2, 3, 4);
    }});
    worker.send(frame());

    const ui = uiSurface(worker), combined = worker.canvases.combined;
    expect(ui).toBeDefined();
    const copyIndex = image => worker.operations.findIndex(op => op.canvas === combined && op.method === 'drawImage'
        && op.args[0] === image);
    const names = copyIndex(worker.canvases.text);
    const overhead = copyIndex(worker.canvases.highEntities);
    const light = worker.operations.findIndex(op => op.canvas === combined && op.method === 'drawImage'
        && op.args[0] === worker.canvases.lighting && op.composite === 'multiply');
    const overlay = copyIndex(ui);
    const foreground = worker.operations.findIndex(op => op.canvas === combined && op.method === 'fillRect');
    expect(names).toBeGreaterThan(-1);
    expect(overhead).toBeGreaterThan(names);
    expect(light).toBeGreaterThan(overhead);
    expect(overlay).toBeGreaterThan(light);
    expect(foreground).toBeGreaterThan(overlay);

    const copies = worker.operations.filter(op => op.canvas === ui && op.method === 'drawImage');
    expect(copies.map(op => op.args[0])).toEqual([
        worker.barDraw.mock.calls[0][0].canvas, worker.canvases.highEntities
    ]);
    expect(copies.map(op => op.composite)).toEqual(['source-over', 'destination-out']);
    expect(copies.at(-1).args.slice(1)).toEqual([0, 0, combined.width, combined.height]);
    expect(worker.canvases.entities.ctx.fillRect).not.toHaveBeenCalled();
});

test('glow affects restored world names but health bars remain on the post-lighting pass', () => {
    const worker = setup();
    worker.setExtensions({draw(layer, ctx) {
        if (layer === 'foreground') ctx.fillRect(1, 2, 3, 4);
    }});
    worker.send({type: 'setLights', lights: [{x: 30, y: 30, intensity: 0, shadow: 0,
        glowIntensity: .6, glowRadius: 24, animation: 'fire'}]});
    worker.send(frame());
    const combined = worker.canvases.combined;
    const copies = worker.operations.filter(op => op.canvas === combined && op.method === 'drawImage');
    expect(copies.map(op => op.composite)).toEqual([
        'source-over', 'source-over', 'source-over', 'multiply', 'screen', 'source-over'
    ]);
    expect(copies[1].args[0]).toBe(worker.canvases.text);
    const ui = copies.at(-1).args[0], glow = copies.at(-2).args[0];
    expect(copies.at(-1).alpha).toBe(1);
    expect(glow).toMatchObject({width: 48, height: 48});
    const uiCopies = worker.operations.filter(op => op.canvas === ui && op.method === 'drawImage');
    expect(uiCopies.map(op => op.args[0])).toEqual([
        worker.barDraw.mock.calls[0][0].canvas, worker.canvases.highEntities
    ]);
    expect(uiCopies.map(op => op.alpha)).toEqual([1, 1]);
    expect(worker.operations.indexOf(copies.at(-1))).toBeLessThan(worker.operations.findIndex(op =>
        op.canvas === combined && op.method === 'fillRect'));
    const text = worker.canvases.text.ctx, clears = text.clearRect.mock.calls.length, draws = text.drawImage.mock.calls.length;
    worker.send(frame({hp: 60, time: 100}));
    expect(text.clearRect).toHaveBeenCalledTimes(clears);
    expect(text.drawImage).toHaveBeenCalledTimes(draws);
    expect(worker.barInstances[0].states.get('mob').ratio).toBe(.6);
});

test.each([1, 2, 3])('health bars retain native pixels and camera alignment at display scale %i', scale => {
    const worker = setup();
    worker.send(frame({scale}));
    const [ctx, bars, view] = worker.barDraw.mock.calls[0];
    expect(view).toMatchObject({scale, cameraX: 10.6, cameraY: 20.1});
    expect(bars).toHaveLength(1);
    expect(ctx.canvas).toMatchObject({width: 192 / scale, height: 96 / scale});
    expect(ctx.fillRect).toHaveBeenCalledWith(5 * scale, 9 * scale, 30 * scale, 5 * scale);
    expect(ctx.scale).toHaveBeenCalledWith(1 / scale, 1 / scale);
    expect(ctx.imageSmoothingEnabled).toBe(false);
    const ui = uiSurface(worker);
    expect(ui.ctx.drawImage).toHaveBeenCalledWith(ctx.canvas, 0, 0, 192 / scale, 96 / scale, 0, 0, 192, 96);
    expect(ui.ctx.imageSmoothingEnabled).toBe(false);
});

test('a static name frame stays cached while bar damage trails animate and clean up on departure', () => {
    const worker = setup();
    worker.send(frame());
    const text = worker.canvases.text.ctx;
    const nameClears = text.clearRect.mock.calls.length, nameCopies = text.drawImage.mock.calls.length;
    worker.send(frame({hp: 60, time: 10}));
    const state = worker.barInstances[0].states.get('mob');
    expect(state.ratio).toBe(0.6);
    expect(state.value(10)).toBe(1);
    worker.send(frame({hp: 60, time: 330}));
    expect(state.value(330)).toBeCloseTo(0.65);
    expect(worker.barDraw.mock.calls.at(-1).slice(3)).toEqual([330, false]);
    expect(text.clearRect).toHaveBeenCalledTimes(nameClears);
    expect(text.drawImage).toHaveBeenCalledTimes(nameCopies);

    worker.send(frame({hp: 40, time: 340, reducedMotion: true}));
    expect(state.value(340)).toBeCloseTo(0.4);
    worker.canvases.combined.ctx.drawImage.mockClear();
    worker.send(frame({names: false, bars: false, time: 350}));
    expect(worker.barInstances[0].states.size).toBe(0);
    expect(uiSurface(worker)).toBeUndefined();
    expect(text.clearRect).toHaveBeenCalledTimes(nameClears + 1);
});

test('each UI frame clears the previous overhead mask without mutating retained name pixels', () => {
    const worker = setup();
    worker.send(frame());
    const ui = uiSurface(worker), text = worker.canvases.text.ctx;
    const nameClears = text.clearRect.mock.calls.length;
    const start = worker.operations.length;
    worker.send(frame());
    const next = worker.operations.slice(start).filter(op => op.canvas === ui);
    const clear = next.findIndex(op => op.method === 'clearRect');
    const copies = next.filter(op => op.method === 'drawImage');
    expect(clear).toBeGreaterThan(-1);
    expect(next.findIndex(op => op.method === 'drawImage')).toBeGreaterThan(clear);
    expect(copies.map(op => op.composite)).toEqual(['source-over', 'destination-out']);
    expect(worker.canvases.highEntities.ctx.clearRect).toHaveBeenCalledTimes(2);
    expect(text.clearRect).toHaveBeenCalledTimes(nameClears);
    expect(worker.operations.filter(op => op.canvas === worker.canvases.text && op.composite === 'destination-out')).toEqual([]);
});

test('UI and native bar surfaces reuse allocations and copy only the active viewport after shrinking', () => {
    const worker = setup();
    worker.send(frame());
    const ui = uiSurface(worker), native = worker.barDraw.mock.calls[0][0].canvas;
    const warm = worker.allocations.length;
    for (let index = 1; index <= 10; index++) worker.send(frame({hp: 100 - index, time: index * 17}));
    expect(worker.allocations).toHaveLength(warm);
    expect(worker.barDraw.mock.calls.every(([ctx]) => ctx.canvas === native)).toBe(true);

    worker.send({type: 'setCanvasSize', width: 210, height: 105});
    worker.send(frame({hp: 90, time: 200}));
    expect(uiSurface(worker)).toBe(ui);
    expect(ui).toMatchObject({width: 210, height: 105});
    expect(native).toMatchObject({width: 70, height: 35});
    expect(ui.ctx.imageSmoothingEnabled).toBe(false);
    expect(native.ctx.imageSmoothingEnabled).toBe(false);

    worker.canvases.combined.ctx.drawImage.mockClear();
    ui.ctx.drawImage.mockClear();
    worker.send({type: 'setCanvasSize', width: 150, height: 75});
    worker.send(frame({hp: 90, time: 220}));
    expect(ui).toMatchObject({width: 210, height: 105});
    expect(native).toMatchObject({width: 70, height: 35});
    expect(ui.ctx.drawImage).toHaveBeenCalledWith(native, 0, 0, 50, 25, 0, 0, 150, 75);
    expect(worker.canvases.combined.ctx.drawImage).toHaveBeenLastCalledWith(ui, 0, 0, 150, 75, 0, 0, 150, 75);
});

test('pending automatic anchors suppress names and bars until the body is ready', () => {
    const worker = setup();
    worker.pendingAnchor(true);
    worker.send(frame());
    expect(worker.barDraw).not.toHaveBeenCalled();
    expect(worker.canvases.text.ctx.drawImage).not.toHaveBeenCalled();
    expect(uiSurface(worker)).toBeUndefined();

    worker.pendingAnchor(false);
    worker.send(frame());
    expect(worker.barDraw).toHaveBeenCalledTimes(1);
    expect(worker.barDraw.mock.calls[0][1]).toHaveLength(1);
    expect(worker.canvases.text.ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(uiSurface(worker)).toBeDefined();
});

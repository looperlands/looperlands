const fs = require('fs'), vm = require('vm');
const L = require('../../shared/js/mapmakerlighting');

function setup() {
    const render = jest.fn(), glow = jest.fn(), post = jest.fn();
    const context = {importScripts() {}, MapmakerLighting: L, tilesize: 16, canvases: {}, contexes: {}, obstacles: [], obstacleRevision: 0, playerPosition: null,
        self: {postMessage: post},
        OffscreenCanvas: class {constructor(width, height) {this.width = width;this.height = height;this.context = {canvas: this, clearRect: jest.fn()};}getContext() {return this.context;}transferToImageBitmap() {return {width: this.width, height: this.height};}},
        transformObstacles: rows => rows.map(row => [{x: row.x, y: row.y}, {x: row.x + row.width, y: row.y + row.height}]),
        renderLightOverlay: render, drawEmissiveGlow: glow};
    vm.runInNewContext(fs.readFileSync(require.resolve('./lightingpreview-worker'), 'utf8'), context);
    return {context, render, glow, post, send: data => context.self.onmessage({data})};
}
const dimensions = {width: 172, height: 500, tilewidth: 16, tileheight: 16};

test('fitting a large map bounds the bitmap while lights, blockers and camera keep the same world alignment', () => {
    const h = setup(), lamp = L.preset('lamp', 10, 20), blocker = L.preset('shadow-rectangle', 12, 20), before = JSON.stringify([lamp, blocker]);
    h.send({objects: [lamp, blocker], dimensions, darkness: .65, motion: false, requestId: 1, view: {x: 64, y: 128, width: 4000, height: 8000}});
    const bitmap = h.post.mock.calls[0][0].bitmap, factor = 1024 / 8000, args = h.render.mock.calls[0];
    expect(bitmap.width).toBeLessThanOrEqual(1024);expect(bitmap.height).toBe(1024);
    const light = args[0][0];
    expect((light.x - args[1]) / h.context.tilesize).toBeCloseTo(6);
    expect((light.y - args[2]) / h.context.tilesize).toBeCloseTo(12);
    expect(light.radius).toBe(4);expect(h.context.obstacles[0][0].x).toBeCloseTo(12 * 16 * factor);
    expect(JSON.stringify([lamp, blocker])).toBe(before);
    expect(h.glow).not.toHaveBeenCalled();expect(h.post.mock.calls[0][0].glowBitmap).toBeUndefined();
});

test('zoomed-in views retain native resolution and invalid draft radii report an error without rendering', () => {
    const h = setup(), lamp = L.preset('lamp', 10, 20), view = {x: 100, y: 200, width: 400, height: 300};
    h.send({objects: [lamp], dimensions, darkness: .65, motion: false, requestId: 1, view});
    expect(h.post.mock.calls[0][0].bitmap).toEqual({width: 400, height: 300});
    expect(h.render.mock.calls[0][1]).toBe(100);expect(h.render.mock.calls[0][2]).toBe(200);
    lamp.properties.radius = '10000';
    h.send({objects: [lamp], dimensions, darkness: .65, motion: false, requestId: 2, view});
    expect(h.post.mock.calls[1][0]).toMatchObject({requestId: 2, error: expect.stringContaining('1 to 64')});
    expect(h.render).toHaveBeenCalledTimes(1);
});

test('glow-only sources use the game helper and a separate bounded bitmap after the lighting pass', () => {
    const h = setup(), lamp = L.preset('lamp', 10, 20), view = {x: 64, y: 128, width: 4000, height: 8000};
    Object.assign(lamp.properties, {intensity: '0', glowIntensity: '.3', glowRadius: '24'});
    h.send({objects: [lamp], dimensions, darkness: .65, motion: false, requestId: 1, view});
    const [ctx, sources, x, y, options] = h.glow.mock.calls[0];
    expect(sources[0]).toMatchObject({intensity: 0, glowIntensity: .3, glowRadius: 24});
    expect(sources[0]).not.toHaveProperty('glowColor');
    expect(x).toBe(64 * 1024 / 8000);expect(y).toBe(128 * 1024 / 8000);
    expect(options).toMatchObject({emissiveGlow: true, dynamicLights: false, reducedMotion: true, scale: 1});
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 512, 1024);
    expect(h.render.mock.invocationCallOrder[0]).toBeLessThan(h.glow.mock.invocationCallOrder[0]);
    const response = h.post.mock.calls[0][0];
    expect(response.glowBitmap).toEqual({width: 512, height: 1024});
    expect(h.post.mock.calls[0][1]).toEqual([response.bitmap, response.glowBitmap]);
    lamp.properties.glowIntensity = '0';
    h.send({objects: [lamp], dimensions, darkness: .65, motion: true, requestId: 2, view});
    expect(h.glow).toHaveBeenCalledTimes(1);expect(h.post.mock.calls[1][0].glowBitmap).toBeUndefined();
});

test.each([
    {glowRadius: '65'}, {glowIntensity: '2'}, {glowColor: '300,0,0'}, {glowIntensity: '.3', spread: '90'}
])('invalid glow drafts report a preview error without rendering: %p', properties => {
    const h = setup(), lamp = L.preset('lamp', 10, 20);
    Object.assign(lamp.properties, properties);
    h.send({objects: [lamp], dimensions, darkness: .65, motion: false, requestId: 1, view: {x: 0, y: 0, width: 400, height: 300}});
    expect(h.post.mock.calls[0][0].error).toBeTruthy();expect(h.render).not.toHaveBeenCalled();expect(h.glow).not.toHaveBeenCalled();
});

test('the actual game glow pass loads in the editor and scales native-pixel halos with the preview resolution', () => {
    const scripts = {
        './vendor/lighting-renderer.js': '../../client/js/renderer-webworker.js',
        './vendor/emissive-glow-worker.js': '../../client/js/emissive-glow-worker.js',
        './lighting-contract.js': '../../shared/js/mapmakerlighting.js'
    };
    const sandbox = {postMessage: jest.fn(), performance: {now: () => 1000}, console};
    sandbox.self = sandbox;
    sandbox.OffscreenCanvas = class {
        constructor(width, height) {
            this.width = width;this.height = height;
            this.ctx = {canvas: this};
            for (const name of ['save', 'restore', 'scale', 'translate', 'clearRect', 'fillRect', 'drawImage', 'beginPath', 'rect', 'clip', 'moveTo', 'lineTo', 'closePath', 'fill']) this.ctx[name] = jest.fn();
            this.ctx.createRadialGradient = () => ({addColorStop() {}});
        }
        getContext() {return this.ctx;}
        transferToImageBitmap() {return {width: this.width, height: this.height, canvas: this};}
    };
    vm.createContext(sandbox);
    sandbox.importScripts = (...urls) => {
        for (const url of urls) {
            if (!scripts[url]) throw new Error('Unexpected preview dependency: ' + url);
            vm.runInContext(fs.readFileSync(require.resolve(scripts[url]), 'utf8'), sandbox);
        }
    };
    vm.runInContext(fs.readFileSync(require.resolve('./lightingpreview-worker'), 'utf8'), sandbox);
    const lamp = L.preset('lamp', 10, 20);
    Object.assign(lamp.properties, {intensity: '0', shadow: '0', glowIntensity: '.3', glowRadius: '24'});
    for (const [width, height, factor] of [[4000, 8000, 1024 / 8000], [400, 300, 1]]) {
        sandbox.onmessage({data: {objects: [lamp], dimensions, darkness: .65, motion: false, requestId: 1, view: {x: 64, y: 128, width, height}}});
        const message = sandbox.postMessage.mock.lastCall[0];
        expect(message.error).toBeUndefined();
        const draw = message.glowBitmap.canvas.ctx.drawImage.mock.lastCall;
        expect(draw[7]).toBeCloseTo(48 * factor);expect(draw[8]).toBeCloseTo(48 * factor);
    }
});

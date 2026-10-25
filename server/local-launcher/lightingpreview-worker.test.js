const fs = require('fs'), vm = require('vm');
const L = require('../../shared/js/mapmakerlighting');

function setup() {
    const render = jest.fn(), post = jest.fn();
    const context = {importScripts() {}, MapmakerLighting: L, tilesize: 16, canvases: {}, contexes: {}, obstacles: [], obstacleRevision: 0, playerPosition: null,
        self: {postMessage: post},
        OffscreenCanvas: class {constructor(width, height) {this.width = width;this.height = height;}getContext() {return {};}transferToImageBitmap() {return {width: this.width, height: this.height};}},
        transformObstacles: rows => rows.map(row => [{x: row.x, y: row.y}, {x: row.x + row.width, y: row.y + row.height}]),
        renderLightOverlay: render};
    vm.runInNewContext(fs.readFileSync(require.resolve('./lightingpreview-worker'), 'utf8'), context);
    return {context, render, post, send: data => context.self.onmessage({data})};
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

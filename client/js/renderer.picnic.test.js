const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup() {
    const worker = {self: {}, console, postMessage: jest.fn(), requestAnimationFrame: jest.fn()};
    worker.importScripts = file => vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), worker);
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'renderer-webworker.js'), 'utf8'), worker);
    worker.onmessage({data: {type: 'registerExtension', module: 'picnic-renderer-worker.js'}});
    const canvases = {};
    for (const id of ['background', 'entities', 'text', 'high', 'highEntities', 'lighting', 'aboveLight', 'combined']) {
        const context = {clearRect: jest.fn(), save: jest.fn(), restore: jest.fn(), translate: jest.fn(),
            fillRect: jest.fn(), drawImage: jest.fn(), createRadialGradient: jest.fn(() => ({addColorStop: jest.fn()}))};
        canvases[id] = {width: 960, height: 448, getContext: () => context};
        worker.onmessage({data: {type: 'setCanvas', id, canvas: canvases[id]}});
    }
    const context = canvases.combined.getContext();
    const picnic = {phase: 'celebrating', center: {x: 42, y: 216}};
    const render = (cameraX, cameraY, scale, state = picnic) => worker.onmessage({data: {
        type: 'render', player: {x: 0, y: 0}, extensions: {picnic: state},
        renderData: [{type: 'render', id: 'background', tiles: [], cameraX, cameraY, scale, clear: true},
            {type: 'entities', id: 'entities', entityData: [], cameraX, cameraY, scale}]
    }});
    return {context, canvases, render, picnic};
}

test('picnic ground follows the exact terrain camera on scrolling, teleports and rescaling', () => {
    const {context, render} = setup();
    for (const [cameraX, cameraY, scale] of [[640, 3360, 2], [656, 3368, 2], [900, 3400, 2], [640, 3360, 3]]) {
        context.fillRect.mockClear();
        render(cameraX, cameraY, scale);
        expect(context.fillRect.mock.calls[0]).toEqual([
            (42 * 16 - cameraX - 20) * scale, (216 * 16 - cameraY - 8) * scale, 40 * scale, 24 * scale
        ]);
    }
});

test('picnic scenery is composited above terrain and beneath characters and lighting', () => {
    const {context, canvases, render} = setup();
    render(640, 3360, 2);
    expect(context.drawImage.mock.calls[0][0]).toBe(canvases.background);
    expect(context.drawImage.mock.calls[1][0]).toBe(canvases.entities);
    const groundOrder = context.drawImage.mock.invocationCallOrder[0];
    const picnicOrder = context.fillRect.mock.invocationCallOrder[0];
    const entitiesOrder = context.drawImage.mock.invocationCallOrder[1];
    expect(picnicOrder).toBeGreaterThan(groundOrder);
    expect(picnicOrder).toBeLessThan(entitiesOrder);
    expect(context.createRadialGradient).toHaveBeenCalledTimes(2);
});

test('finishing or leaving the picnic clears the scenery in the next terrain frame', () => {
    const {context, render, picnic} = setup();
    render(640, 3360, 2);
    for (const state of [{...picnic, phase: 'finished'}, null]) {
        context.fillRect.mockClear();
        context.clearRect.mockClear();
        render(640, 3360, 2, state);
        expect(context.clearRect).toHaveBeenCalledWith(0, 0, 960, 448);
        expect(context.fillRect).not.toHaveBeenCalled();
    }
});

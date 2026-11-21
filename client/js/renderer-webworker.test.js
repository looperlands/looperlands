const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, 'renderer-webworker.js'), 'utf8');

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
}

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

function createWorker({supportsFonts = true, anchorImageData, readbackError} = {}) {
    const font = deferred();
    const FontFace = jest.fn(function () { this.load = jest.fn(() => font.promise); });
    const fetch = jest.fn();
    const createImageBitmap = jest.fn();
    const log = jest.fn();
    const self = {FontFace: supportsFonts ? FontFace : undefined, fonts: {add: jest.fn()}, postMessage: jest.fn()};
    const readPixels = jest.fn(() => {
        if (readbackError) throw readbackError;
        return anchorImageData;
    });
    const sandbox = {self, FontFace, fetch, createImageBitmap, console: {log},
        importScripts: name => {if (name === 'sprite-ground-anchor.js') self.SpriteGroundAnchor = require('./sprite-ground-anchor');},
        OffscreenCanvas: anchorImageData || readbackError ? function (width, height) {
            this.width = width; this.height = height;
            this.getContext = () => ({drawImage: jest.fn(), getImageData: readPixels,
                strokeText: jest.fn(), fillText: jest.fn()});
        } : undefined};
    const api = vm.runInNewContext(`${source}\n({Sprite, drawEntities, drawText, getSprite: name => sprites[name], getLights: () => lights, getTileset: () => tileset});`, sandbox);
    return {...api, send: data => sandbox.onmessage({data}), font, FontFace, fetch, createImageBitmap, log, self, readPixels};
}

function mockImage(worker, image = {bitmap: true}) {
    worker.fetch.mockResolvedValue({blob: jest.fn().mockResolvedValue('image blob')});
    worker.createImageBitmap.mockResolvedValue(image);
    return image;
}

test.each([undefined, null, []])('clears previous map lights when setLights receives %p', lights => {
    const worker = createWorker({supportsFonts: false});
    const previousLights = [{x: 32, y: 48, radius: 4}];
    worker.send({type: 'setLights', lights: previousLights});
    expect(worker.getLights()).toEqual(previousLights);

    worker.send({type: 'setLights', lights});
    expect(worker.getLights()).toEqual([]);

    const nextLights = [{x: 64, y: 80, radius: 2}];
    worker.send({type: 'setLights', lights: nextLights});
    expect(worker.getLights()).toEqual(nextLights);
});

test('acknowledges a map tileset only after its bitmap is decoded', async () => {
    const worker = createWorker({supportsFonts: false});
    const image = mockImage(worker), decoding = deferred();
    worker.createImageBitmap.mockReturnValue(decoding.promise);
    worker.send({type: 'setTileset', src: 'main.png', requestId: 4});
    await flushPromises();
    expect(worker.getTileset()).toBeUndefined();
    expect(worker.self.postMessage).not.toHaveBeenCalled();
    decoding.resolve(image);
    await flushPromises();
    expect(worker.getTileset()).toBe(image);
    expect(worker.self.postMessage).toHaveBeenCalledWith({type: 'tilesetReady', requestId: 4});
});

test('late tileset decoding cannot replace the current map and releases its obsolete bitmap', async () => {
    const worker = createWorker({supportsFonts: false});
    const slow = deferred(), previous = {close: jest.fn()}, current = {close: jest.fn()};
    mockImage(worker);
    worker.createImageBitmap.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(current);
    worker.send({type: 'setTileset', src: 'old.png', requestId: 1});
    await flushPromises();
    worker.send({type: 'setTileset', src: 'new.png', requestId: 2});
    await flushPromises();
    expect(worker.getTileset()).toBe(current);
    slow.resolve(previous);
    await flushPromises();
    expect(worker.getTileset()).toBe(current);
    expect(previous.close).toHaveBeenCalledTimes(1);
    expect(current.close).not.toHaveBeenCalled();
    expect(worker.self.postMessage.mock.calls).toEqual([[{type: 'tilesetReady', requestId: 2}]]);
});

test('reports a failed tileset load so map transitions can recover', async () => {
    const worker = createWorker({supportsFonts: false});
    worker.fetch.mockRejectedValue(new Error('offline'));
    worker.send({type: 'setTileset', src: 'missing.png', requestId: 9});
    await flushPromises();
    expect(worker.getTileset()).toBeUndefined();
    expect(worker.self.postMessage).toHaveBeenCalledWith({type: 'tilesetReady', requestId: 9, error: 'Map tileset could not be loaded'});
});

test('shares one sprite fetch and decode across repeated pending loads and reuses the loaded image', async () => {
    const worker = createWorker();
    const response = deferred();
    const image = mockImage(worker);
    worker.fetch.mockReturnValue(response.promise);
    const sprite = new worker.Sprite('avatar', 'avatar.png');
    const loads = Array.from({length: 60}, () => sprite.load());

    expect(worker.fetch).toHaveBeenCalledTimes(1);
    expect(worker.createImageBitmap).not.toHaveBeenCalled();
    response.resolve({blob: jest.fn().mockResolvedValue('image blob')});
    expect(await Promise.all(loads)).toEqual(Array(60).fill(image));
    expect(worker.createImageBitmap).toHaveBeenCalledTimes(1);
    expect(await sprite.load()).toBe(image);
    expect(worker.fetch).toHaveBeenCalledTimes(1);
});

test('keeps sharing the load while image decoding is pending', async () => {
    const worker = createWorker();
    mockImage(worker);
    const decoding = deferred();
    worker.createImageBitmap.mockReturnValue(decoding.promise);
    const sprite = new worker.Sprite('avatar', 'avatar.png');
    const loading = sprite.load();
    await flushPromises();
    for (let i = 0; i < 60; i++) sprite.load();

    expect(worker.fetch).toHaveBeenCalledTimes(1);
    expect(worker.createImageBitmap).toHaveBeenCalledTimes(1);
    const image = {decoded: true};
    decoding.resolve(image);
    expect(await loading).toBe(image);
});

test('different sprites load concurrently', async () => {
    const worker = createWorker();
    mockImage(worker);
    const avatar = new worker.Sprite('avatar', 'avatar.png');
    const weapon = new worker.Sprite('weapon', 'weapon.png');
    const loads = [avatar.load(), weapon.load()];
    expect(worker.fetch.mock.calls).toEqual([['avatar.png'], ['weapon.png']]);
    await Promise.all(loads);
    expect(worker.createImageBitmap).toHaveBeenCalledTimes(2);
});

test.each(['fetch', 'decode'])('retries a sprite after a failed %s', async failure => {
    const worker = createWorker();
    const image = mockImage(worker);
    if (failure === 'fetch') worker.fetch.mockRejectedValueOnce(new Error('offline'));
    else worker.createImageBitmap.mockRejectedValueOnce(new Error('bad image'));
    const sprite = new worker.Sprite('avatar', 'avatar.png');
    expect(await sprite.load()).toBeUndefined();
    expect(await sprite.load()).toBe(image);
    expect(worker.fetch).toHaveBeenCalledTimes(2);
});

function context() {
    return Object.fromEntries(['clearRect', 'save', 'restore', 'translate', 'scale', 'rotate', 'drawImage'].map(name => [name, jest.fn()]));
}

function anchorFixture() {
    const metadata = {type: 'loadSprite', spriteName: 'body', src: 'body.png', requestId: 1,
        autoGroundAnchor: true, sourceScale: 1, width: 32, height: 32, offsetX: -8, offsetY: -12,
        animationData: {idle_down: {row: 0, length: 2}, atk_down: {row: 1, length: 5}}};
    const image = {width: 160, height: 64};
    const pixels = {...image, data: new Uint8ClampedArray(image.width * image.height * 4)};
    pixels.data[(31 * image.width + 16) * 4 + 3] = 255;
    return {metadata, image, pixels};
}

test('automatic anchors reuse the lazy image request and perform one alpha read for a loaded sprite', async () => {
    const {metadata, image, pixels} = anchorFixture();
    const worker = createWorker({supportsFonts: false, anchorImageData: pixels});
    mockImage(worker, image);
    worker.send(metadata);
    expect(worker.fetch).not.toHaveBeenCalled();
    const sprite = worker.getSprite('body');
    await Promise.all(Array.from({length: 60}, () => sprite.load()));
    await sprite.load();
    expect(worker.fetch).toHaveBeenCalledTimes(1);
    expect(worker.readPixels).toHaveBeenCalledTimes(1);
    expect(worker.self.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.self.postMessage).toHaveBeenCalledWith({type: 'spriteGroundAnchor', requestId: 1,
        spriteName: 'body', src: 'body.png', groundOffsetY: -4});
    expect(sprite.groundAnchorPending).toBe(true);
});

test('a whole avatar waits for its acknowledged correction, including gear and contact shadow', async () => {
    const {metadata, image, pixels} = anchorFixture();
    const worker = createWorker({supportsFonts: false, anchorImageData: pixels});
    mockImage(worker, image);
    const main = context(), high = context();
    for (const [id, ctx] of [['entities', main], ['highEntities', high]]) {
        worker.send({type: 'setCanvas', id, canvas: {width: 100, height: 100, getContext: () => ctx}});
    }
    for (const name of ['shadow16', 'sword']) {
        worker.send({type: 'loadSprite', spriteName: name, src: name + '.png'});
        await worker.getSprite(name).load();
    }
    worker.send(metadata);
    const draw = (spriteName, dy) => ({spriteName, sx: 0, sy: 0, sW: 32, sH: 32, dx: -8, dy, dW: 32, dH: 32});
    const actor = {bodySpriteName: 'body', groundOffsetY: 0, translateX: 32, translateY: 48,
        drawData: [draw('shadow16', 0), draw('sword', -20), draw('body', -12)]};
    const render = () => worker.drawEntities({id: 'entities', cameraX: 0, cameraY: 0, scale: 1, entityData: [actor]});
    render();
    expect(main.drawImage).not.toHaveBeenCalled();
    await worker.getSprite('body').load();
    render();
    expect(main.drawImage).not.toHaveBeenCalled();
    worker.send({type: 'spriteGroundAnchorApplied', requestId: 1, spriteName: 'body', src: 'body.png'});
    render(); // A stale command still has the old baseline.
    expect(main.drawImage).not.toHaveBeenCalled();
    actor.groundOffsetY = -4;
    actor.drawData[1].dy -= 4;
    actor.drawData[2].dy -= 4;
    render();
    expect(main.drawImage).toHaveBeenCalledTimes(3);
    expect(main.drawImage.mock.calls.map(call => call[6])).toEqual([0, -24, -16]);
    expect(high.drawImage).not.toHaveBeenCalled();
    expect(worker.fetch).toHaveBeenCalledTimes(3);
    expect(worker.readPixels).toHaveBeenCalledTimes(1);
});

test('old source results and acknowledgements cannot release a replacement avatar', async () => {
    const {metadata, image, pixels} = anchorFixture();
    const worker = createWorker({supportsFonts: false, anchorImageData: pixels});
    mockImage(worker, image);
    const pending = deferred();
    worker.fetch.mockReturnValueOnce(pending.promise);
    worker.send(metadata);
    const old = worker.getSprite('body').load();
    worker.send({...metadata, requestId: 2, src: 'new-body.png'});
    const current = worker.getSprite('body');
    worker.send({type: 'spriteGroundAnchorApplied', requestId: 2, spriteName: 'body', src: 'new-body.png'});
    expect(current.groundAnchorPending).toBe(true);
    await current.load();
    pending.resolve({blob: jest.fn().mockResolvedValue('old blob')});
    await old;
    expect(worker.self.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.self.postMessage.mock.calls[0][0]).toMatchObject({requestId: 2, src: 'new-body.png'});
    for (const acknowledgement of [
        {requestId: 1, src: 'body.png'}, {requestId: 1, src: 'new-body.png'}, {requestId: 2, src: 'body.png'}
    ]) {
        worker.send({type: 'spriteGroundAnchorApplied', spriteName: 'body', ...acknowledgement});
        expect(current.groundAnchorPending).toBe(true);
    }
    worker.send({type: 'spriteGroundAnchorApplied', requestId: 2, spriteName: 'body', src: 'new-body.png'});
    expect(current.groundAnchorPending).toBe(false);
});

test('names and titles wait for the same anchor as their body while combat text stays visible', async () => {
    const {metadata, image, pixels} = anchorFixture();
    const worker = createWorker({supportsFonts: false, anchorImageData: pixels});
    mockImage(worker, image);
    const text = {...context(), measureText: jest.fn(() => ({width: 30, actualBoundingBoxAscent: 10}))};
    worker.send({type: 'setCanvas', id: 'text', canvas: {width: 100, height: 100, getContext: () => text}});
    worker.send(metadata);
    const names = ['Hero', 'Explorer'].map((label, index) => ({text: label, title: index === 1,
        x: 40, y: 30 + index * 10, bodySpriteName: 'body', groundOffsetY: 0}));
    const render = textData => worker.drawText({id: 'text', cameraX: 0, cameraY: 0, scale: 1, textData});
    render(names);
    expect(text.drawImage).not.toHaveBeenCalled();
    await worker.getSprite('body').load();
    render(names);
    expect(text.drawImage).not.toHaveBeenCalled();
    worker.drawText({id: 'text', cameraX: 0, cameraY: 0, scale: 1,
        textData: [{text: '123', x: 40, y: 25}]}, false);
    expect(text.drawImage).toHaveBeenCalledTimes(1);
    worker.send({type: 'spriteGroundAnchorApplied', requestId: 1, spriteName: 'body', src: 'body.png'});
    render(names);
    expect(text.drawImage).toHaveBeenCalledTimes(1);
    const corrected = names.map(entry => ({...entry, groundOffsetY: -4, y: entry.y - 4}));
    render(corrected);
    expect(text.drawImage).toHaveBeenCalledTimes(3);
    expect(text.measureText).toHaveBeenCalledTimes(3);
    render(corrected);
    expect(text.drawImage).toHaveBeenCalledTimes(3); // The ready label frame retains its cache.
    expect(names[0]).toMatchObject({y: 30, groundOffsetY: 0});
});

test.each(['canvas unavailable', 'readback failure', 'empty standing frames', 'malformed sheet'])(
    'automatic anchor gracefully resolves to legacy placement after %s', async reason => {
        const {metadata, image, pixels} = anchorFixture();
        const options = {supportsFonts: false};
        if (reason !== 'canvas unavailable') options.anchorImageData = pixels;
        if (reason === 'readback failure') options.readbackError = new Error('SecurityError');
        if (reason === 'empty standing frames') pixels.data.fill(0);
        if (reason === 'malformed sheet') image.height--;
        const worker = createWorker(options);
        mockImage(worker, image);
        worker.send(metadata);
        const sprite = worker.getSprite('body');
        await sprite.load();
        expect(worker.self.postMessage).toHaveBeenCalledWith({type: 'spriteGroundAnchor', requestId: 1,
            spriteName: 'body', src: 'body.png', groundOffsetY: 0});
        worker.send({type: 'spriteGroundAnchorApplied', requestId: 1, spriteName: 'body', src: 'body.png'});
        expect(sprite.groundAnchorPending).toBe(false);
    });

test('skips pending sprites without draw exceptions and preserves the layer for the following sprite', async () => {
    const worker = createWorker();
    const image = mockImage(worker);
    const main = context(), high = context();
    for (const [id, ctx] of [['entities', main], ['highEntities', high]]) {
        worker.send({type: 'setCanvas', id, canvas: {width: 100, height: 100, getContext: () => ctx}});
    }
    for (const spriteName of ['pending', 'ready']) worker.send({type: 'loadSprite', spriteName, src: spriteName + '.png'});
    await worker.getSprite('ready').load();
    const pending = deferred();
    worker.fetch.mockReturnValue(pending.promise);
    const drawData = [
        {spriteName: 'pending', renderAbove: true},
        {spriteName: 'ready', renderAbove: false},
    ];
    for (let i = 0; i < 60; i++) worker.drawEntities({id: 'entities', cameraX: 0, cameraY: 0, scale: 1, entityData: [{translateX: 0, translateY: 0, drawData}]});

    expect(worker.fetch).toHaveBeenCalledTimes(2); // One ready sprite and one pending sprite.
    expect(main.drawImage).toHaveBeenCalledTimes(60);
    expect(main.drawImage.mock.calls.every(call => call[0] === image)).toBe(true);
    expect(high.drawImage).not.toHaveBeenCalled();
    expect(worker.log).not.toHaveBeenCalled();
    pending.resolve({blob: jest.fn().mockResolvedValue('image blob')});
    await worker.getSprite('pending').load();
    worker.drawEntities({id: 'entities', cameraX: 0, cameraY: 0, scale: 1, entityData: [{translateX: 0, translateY: 0, drawData}]});
    expect(high.drawImage).toHaveBeenCalledTimes(1);
});

test('loads the font once across a burst of worker messages and subsequent messages', async () => {
    const worker = createWorker();
    for (let i = 0; i < 60; i++) worker.send({type: 'loadSprite', spriteName: 'sprite' + i, src: 'sprite' + i + '.png'});
    expect(worker.FontFace).toHaveBeenCalledTimes(1);
    expect(worker.self.fonts.add).toHaveBeenCalledTimes(1);
    expect(worker.FontFace.mock.instances[0].load).toHaveBeenCalledTimes(1);
    worker.font.resolve();
    await flushPromises();
    worker.send({type: 'setLights', lights: []});
    expect(worker.FontFace).toHaveBeenCalledTimes(1);
});

test('handles a failed font load and retries on a later message', async () => {
    const worker = createWorker();
    worker.send({type: 'setLights', lights: []});
    worker.font.reject(new Error('offline'));
    await flushPromises();
    expect(worker.log).toHaveBeenCalledTimes(1);
    worker.FontFace.mockImplementationOnce(function () { this.load = jest.fn().mockResolvedValue(); });
    worker.send({type: 'setLights', lights: []});
    await flushPromises();
    worker.send({type: 'setLights', lights: []});
    expect(worker.FontFace).toHaveBeenCalledTimes(2);
});

test('continues handling messages when worker fonts are unsupported', () => {
    const worker = createWorker({supportsFonts: false});
    worker.send({type: 'loadSprite', spriteName: 'avatar', src: 'avatar.png'});
    worker.send({type: 'setLights', lights: []});
    expect(worker.getSprite('avatar')).toBeDefined();
    expect(worker.FontFace).not.toHaveBeenCalled();
    expect(worker.log).not.toHaveBeenCalled();
});

function combatRenderer() {
    return vm.runInNewContext(`${source}\n(drawCombatFeedback);`, {});
}

test.each([1, 2, 3])('combat overlays use pixel-aligned world coordinates and restore context at scale %s', scale => {
    const draw = combatRenderer();
    const ctx = {save: jest.fn(), restore: jest.fn(), translate: jest.fn(), fillRect: jest.fn()};
    draw(ctx, {cameraX: 20.25, cameraY: 40.25, scale,
        target: {x: 32, y: 64, width: 20, height: 20},
        impacts: [{x: 40, y: 72, progress: 0.5}]});
    expect(ctx.translate).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    for (const call of ctx.fillRect.mock.calls) expect(call.every(Number.isInteger)).toBe(true);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
});

test('combat renderer accepts absent feedback from older clients', () => {
    const ctx = {save: jest.fn()};
    expect(() => combatRenderer()(ctx, undefined)).not.toThrow();
    expect(ctx.save).not.toHaveBeenCalled();
});

test.each([0, 0.5, 0.9])('impacts keep a contrasting border while fading at progress %s', progress => {
    const pixels = [];
    const ctx = {save() {}, restore() {}, translate() {},
        fillRect(x, y, width, height) {
            pixels.push({x, y, width, height, color: this.fillStyle, alpha: this.globalAlpha});
        }};
    combatRenderer()(ctx, {cameraX: 0, cameraY: 0, scale: 2,
        impacts: [{x: 40, y: 72, progress}]});
    for (const core of pixels.filter(pixel => pixel.color === '#ffb13b')) {
        const border = pixels.find(pixel => pixel.color === '#593526' &&
            pixel.x < core.x && pixel.y < core.y &&
            pixel.x + pixel.width > core.x + core.width &&
            pixel.y + pixel.height > core.y + core.height);
        expect(border).toBeDefined();
        expect(border.alpha).toBeCloseTo(1 - progress);
        expect(core.alpha).toBe(border.alpha);
    }
    expect(pixels.filter(pixel => pixel.color === '#ffb13b')).toHaveLength(4);
});

test('clears a departed cursor with the output frame and skips pending cursor assets', () => {
    const sandbox = {self: {}, console, performance: {now: () => 0}, requestAnimationFrame: jest.fn(), postMessage: jest.fn()};
    const api = vm.runInNewContext(`${source}\ntileset = {loaded: true}; hasLoadedFont = true;\n({setCursorImage: image => {cursors.hand = image;}});`, sandbox);
    const contexts = {};
    for (const id of ['background', 'entities', 'text', 'high', 'highEntities', 'lighting', 'combined']) {
        contexts[id] = context();
        sandbox.onmessage({data: {type: 'setCanvas', id,
            canvas: {width: 960, height: 448, getContext: () => contexts[id]}}});
    }
    const render = renderData => sandbox.onmessage({data: {type: 'render', renderData}});
    const cursor = {cursor: true, id: 'aboveLight', name: 'hand', mx: 10, my: 20, s: 2, os: 1};
    expect(() => render([cursor])).not.toThrow();
    const image = {loaded: true};
    expect(contexts.combined.drawImage.mock.calls.some(call => call[0] === image)).toBe(false);
    api.setCursorImage(image); render([cursor]);
    expect(contexts.combined.drawImage).toHaveBeenLastCalledWith(image, 0, 0, 14, 14, 10, 20, 28, 28);
    contexts.combined.clearRect.mockClear(); contexts.combined.drawImage.mockClear();
    render([]);
    expect(contexts.combined.clearRect).toHaveBeenCalledWith(0, 0, 960, 448);
    expect(contexts.combined.drawImage.mock.calls.some(call => call[0] === image)).toBe(false);
});

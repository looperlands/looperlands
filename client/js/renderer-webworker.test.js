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

function createWorker({supportsFonts = true} = {}) {
    const font = deferred();
    const FontFace = jest.fn(function () { this.load = jest.fn(() => font.promise); });
    const fetch = jest.fn();
    const createImageBitmap = jest.fn();
    const log = jest.fn();
    const self = {FontFace: supportsFonts ? FontFace : undefined, fonts: {add: jest.fn()}};
    const sandbox = {self, FontFace, fetch, createImageBitmap, console: {log}};
    const api = vm.runInNewContext(`${source}\n({Sprite, drawEntities, getSprite: name => sprites[name]});`, sandbox);
    return {...api, send: data => sandbox.onmessage({data}), font, FontFace, fetch, createImageBitmap, log, self};
}

function mockImage(worker, image = {bitmap: true}) {
    worker.fetch.mockResolvedValue({blob: jest.fn().mockResolvedValue('image blob')});
    worker.createImageBitmap.mockResolvedValue(image);
    return image;
}

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
    expect(ctx.translate).toHaveBeenCalledWith(-Math.round(20.25 * scale), -Math.round(40.25 * scale));
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

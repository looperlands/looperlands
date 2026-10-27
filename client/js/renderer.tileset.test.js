const fs = require('fs'), vm = require('vm');

function setup() {
    const sandbox = {define: (dependencies, factory) => {sandbox.Renderer = factory();}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), sandbox);
    vm.runInNewContext(fs.readFileSync(require.resolve('./renderer'), 'utf8'), sandbox);
    const renderer = Object.create(sandbox.Renderer.prototype);
    renderer.worker = {postMessage: jest.fn()};
    return renderer;
}

test('map readiness waits for the renderer worker bitmap acknowledgement', async () => {
    const renderer = setup(), image = {src: 'main.png'};
    renderer.setTileset(image);
    const ready = renderer.whenTilesetReady(), resolved = jest.fn();
    ready.then(resolved);
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    const request = renderer.worker.postMessage.mock.calls[0][0];
    expect(request).toEqual({type: 'setTileset', src: image.src, requestId: 1});
    renderer.handleTilesetReady({requestId: 1});
    expect(await ready).toBe(image);
    expect(await renderer.whenTilesetReady()).toBe(image);
});

test('replacement rejects obsolete waits and ignores an obsolete acknowledgement', async () => {
    const renderer = setup();
    renderer.setTileset({src: 'old.png'});
    const oldReady = renderer.whenTilesetReady();
    renderer.setTileset({src: 'new.png'});
    await expect(oldReady).rejects.toThrow('Tileset replaced');
    const resolved = jest.fn(), ready = renderer.whenTilesetReady();
    ready.then(resolved);
    renderer.handleTilesetReady({requestId: 1});
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    renderer.handleTilesetReady({requestId: 2});
    expect(await ready).toEqual({src: 'new.png'});
});

test('worker image failures reject an awaited transition without an unhandled startup promise', async () => {
    const renderer = setup();
    renderer.setTileset({src: 'missing.png'});
    renderer.handleTilesetReady({requestId: 1, error: 'Map tileset could not be loaded'});
    await Promise.resolve();
    await expect(renderer.whenTilesetReady()).rejects.toThrow('Map tileset could not be loaded');
});

test('fishing floats wait for lazy artwork before drawing on the main canvas', () => {
    const renderer = setup(), image = {};
    const sprite = {getImage: jest.fn().mockReturnValue(null), width: 16, height: 16, offsetX: 0, offsetY: 0};
    renderer.game = {sprites: {bobber: sprite}, floatAnimation: {currentFrame: {index: 0}, row: 0}};
    renderer.context = {save: jest.fn(), restore: jest.fn(), translate: jest.fn(), drawImage: jest.fn()};
    renderer.scale = 2; renderer.tilesize = 16; renderer.upscaledRendering = true;
    const float = {spriteName: 'bobber', gridX: 3, gridY: 4};
    renderer.drawFishingFloat(float);
    expect(renderer.context.drawImage).not.toHaveBeenCalled();
    sprite.getImage.mockReturnValue(image);
    renderer.drawFishingFloat(float);
    expect(renderer.context.drawImage).toHaveBeenCalledWith(image, 0, 0, 16, 16, 0, 0, 32, 32);
});

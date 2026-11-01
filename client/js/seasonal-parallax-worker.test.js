const fs = require('fs');
const vm = require('vm');
const createRegistry = require('./render-extensions-worker');
const createParallax = require('./parallax-renderer-worker');

test('authored seasonal layers draw through both registered planes and disappear with their packet', async () => {
    const registry = createRegistry();
    const drawImage = jest.fn();
    const sources = new Set();
    const createCanvas = (width, height) => ({width, height, getContext: () => ({drawImage(image) {if (image.source) sources.add(image.source);}, fillRect() {}})});
    const self = {RendererExtensions: registry, createSceneParallax: () => createParallax({
        loadImage: async source => ({source}), createCanvas, now: () => 0, fadeDuration: 0
    })};
    vm.runInNewContext(fs.readFileSync(require.resolve('./seasonal-parallax-worker'), 'utf8'), {self});
    const context = {canvas: {width: 320, height: 240}, globalAlpha: 1, filter: 'none', drawImage};
    for (const key of ['save', 'restore', 'beginPath', 'rect', 'clip', 'translate', 'rotate', 'scale', 'fillRect']) context[key] = () => {};
    const scenes = [{id: 'town', x: 0, y: 0, w: 30, h: 30, layers: [
        {image: '/img/parallax/mist.png', plane: 'ground', width: 256, height: 256},
        {image: '/img/parallax/halloween-drifting-ghost.png', plane: 'foreground', width: 64, height: 64}
    ]}];
    const data = {'seasonal-ground': {scenes}, 'seasonal-foreground': {scenes}};
    const view = {cameraX: 0, cameraY: 0, scale: 1};
    for (const plane of ['ground', 'foreground']) registry.draw(plane, context, data, view);
    await new Promise(resolve => setImmediate(resolve));
    drawImage.mockClear();
    for (const plane of ['ground', 'foreground']) registry.draw(plane, context, data, view);
    expect(sources).toEqual(new Set([
        '/img/parallax/mist.png', '/img/parallax/halloween-drifting-ghost.png'
    ]));
    expect(drawImage).toHaveBeenCalled();
    drawImage.mockClear();
    for (const plane of ['ground', 'foreground']) registry.draw(plane, context, {}, view);
    expect(drawImage).not.toHaveBeenCalled();
});

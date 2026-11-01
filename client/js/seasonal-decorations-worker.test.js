const createDecorations = require('./seasonal-decorations-worker');
const createRegistry = require('./render-extensions-worker');
const flush = () => new Promise(resolve => setImmediate(resolve));
const pumpkin = {image: '/img/1/item-m88npumpkin.png', x: 10, y: 20};
const view = {cameraX: 100, cameraY: 250, scale: 3, viewportWidth: 320, viewportHeight: 240};

function setup(options = {}) {
    const image = {close: jest.fn()}, loadImage = jest.fn().mockResolvedValue(image);
    const renderer = createDecorations({loadImage, ...options});
    const state = {decorations: [pumpkin]};
    const context = {drawImage: jest.fn(), save: jest.fn(), restore: jest.fn()};
    return {renderer, image, loadImage, state, context};
}

test('reuses sprite images and follows the same native pixel grid and depth as characters', async () => {
    const f = setup();
    expect(f.renderer.entries(f.state, view)).toEqual([]);
    await flush();
    for (const scale of [1, 2, 3, 1.5]) {
        const [entry] = f.renderer.entries(f.state, {...view, cameraX: 100.4, cameraY: 250.8, scale});
        expect(entry.y).toBe(336);
        entry.draw(f.context);
        expect(f.context.drawImage).toHaveBeenLastCalledWith(f.image, 0, 0, 16, 16, 60 * scale, 69 * scale, 16 * scale, 16 * scale);
        expect(f.context.imageSmoothingEnabled).toBe(false);
    }
    expect(f.loadImage).toHaveBeenCalledTimes(1);
});

test('supports sheet frames and foot-anchored offsets without altering entity sort depth', async () => {
    const f = setup();
    f.state.decorations = [{...pumpkin, width: 32, height: 32, offsetX: -8, offsetY: -16,
        frame: {x: 32, y: 288, width: 32, height: 32}}];
    f.renderer.entries(f.state, view); await flush();
    const [entry] = f.renderer.entries(f.state, view);
    entry.draw(f.context);
    expect(entry.y).toBe(336);
    expect(f.context.drawImage).toHaveBeenCalledWith(f.image, 32, 288, 32, 32, 156, 162, 96, 96);
});

test('offscreen, unsupported URLs and malformed sprites never load', async () => {
    const f = setup();
    f.state.decorations = [
        {...pumpkin, x: 1000}, {...pumpkin, y: -20}, {...pumpkin, image: 'https://example.com/sprite.png'},
        {...pumpkin, image: '/img/1/../secret.png'}, {...pumpkin, image: '/img/1/foo.png?tracking=1'},
        {...pumpkin, width: 0}, {...pumpkin, height: Infinity}, {...pumpkin, frame: {x: -1, y: 0, width: 16, height: 16}},
        {...pumpkin, offsetX: NaN}, {...pumpkin, x: '10'}, null
    ];
    expect(f.renderer.entries(f.state, view)).toEqual([]);
    expect(f.renderer.entries(null, view)).toEqual([]);
    expect(f.renderer.entries({}, view)).toEqual([]);
    expect(f.renderer.entries({decorations: [pumpkin]}, null)).toEqual([]);
    await flush(); expect(f.loadImage).not.toHaveBeenCalled();
});

test('clearing the scene immediately removes decorations while retaining other renderer extensions', async () => {
    const f = setup(), registry = createRegistry();
    registry.register('seasonal-decorations', f.renderer);
    registry.register('tree', {layer: 'entities', entries: () => [{y: 400, draw() {}}]});
    const data = {'seasonal-decorations': f.state, tree: {}};
    registry.sorted(data, view); await flush();
    expect(registry.sorted(data, view).map(entry => entry.y)).toEqual([336, 400]);
    expect(registry.sorted({...data, 'seasonal-decorations': null}, view).map(entry => entry.y)).toEqual([400]);
    expect(registry.sorted({tree: {}}, view).map(entry => entry.y)).toEqual([400]);
});

test('missing images fail once without interrupting other scenery or retrying every frame', async () => {
    const loadImage = jest.fn(source => source.includes('missing') ? Promise.reject(new Error('missing')) : Promise.resolve({}));
    const onError = jest.fn(), f = setup({loadImage, onError});
    f.state.decorations.push({...pumpkin, image: '/img/1/missing.png'});
    f.renderer.entries(f.state, view); await flush();
    for (let frame = 0; frame < 5; frame++) expect(f.renderer.entries(f.state, view)).toHaveLength(1);
    expect(loadImage).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
});

test('decoding remains bounded and evicted images are closed', async () => {
    const f = setup();
    f.state.decorations = Array.from({length: 65}, (_, index) => ({...pumpkin, image: '/img/1/asset' + index + '.png'}));
    f.renderer.entries(f.state, view); await flush();
    expect(f.loadImage).toHaveBeenCalledTimes(64);
    expect(f.renderer.entries(f.state, view)).toHaveLength(64);
    f.state.decorations = [{...pumpkin, image: '/img/1/new.png'}];
    f.renderer.entries(f.state, view); await flush();
    expect(f.image.close).toHaveBeenCalledTimes(1);
    expect(f.loadImage).toHaveBeenCalledTimes(65);
});

test('tile appearances accept explicit cell and baseline guards and reject malformed transforms', () => {
    const f = setup(), tint = {colorDifference: {r: 35, g: -25, b: 5}, progress: 1};
    const replacement = {x: 38, y: 206, from: 11, to: 92}, recolor = {x: 39, y: 206, from: 12, colorShift: tint};
    const tiles = [replacement, recolor, null, {...replacement, x: -1}, {...replacement, y: 1.5},
        {...replacement, from: 0}, {...replacement, to: -1}, {...replacement, to: undefined},
        {...recolor, colorShift: {}}, {...recolor, colorShift: {...tint, progress: 2}},
        {...recolor, colorShift: {colorDifference: {r: 256, g: 0, b: 0}, progress: 1}}];
    expect(f.renderer.tileAppearance({tiles})).toEqual([replacement, recolor]);
    expect(f.renderer.tileAppearance(null)).toEqual([]);
    expect(f.renderer.tileAppearance({tiles: 'invalid'})).toEqual([]);
});

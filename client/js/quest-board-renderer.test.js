const factory = require('./quest-board-renderer-worker');
function environment() {
    const root = {fetch: jest.fn(async () => ({ok: true, blob: async () => ({})})), createImageBitmap: jest.fn(async () => ({bitmap: true}))};
    const extension = factory(root), context = {drawImage: jest.fn(), fillRect: jest.fn(), fillText: jest.fn(), strokeRect: jest.fn()};
    return {root, extension, context, view: {scale: 2, cameraX: 100, cameraY: 100}};
}
async function loadSprite(extension, context, data, view) {
    extension.draw(context, data, view);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    extension.draw(context, data, view);
}
test('JSON placements render both boards with one shared image fetch', async () => {
    const {root, extension, context, view} = environment();
    await loadSprite(extension, context, {boards: [{bounds: {x: 10, y: 10, width: 2, height: 1}, placements: [{x: 20, y: 20, width: 2, height: 1}]}]}, view);
    expect(root.fetch).toHaveBeenCalledTimes(1);
    expect(root.fetch).toHaveBeenCalledWith('../img/common/quest-board.png');
    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls[0].slice(1)).toEqual([88, 24, 128, 128]);
    expect(context.imageSmoothingEnabled).toBe(false);
    expect(root.createImageBitmap).toHaveBeenCalledWith({}, {resizeWidth: 64, resizeHeight: 64, resizeQuality: 'pixelated'});
});
test('object recipients use dropoff artwork while board recipients reuse the board', async () => {
    const {root, extension, context, view} = environment();
    const bounds = {x: 10, y: 10, width: 1, height: 1};
    await loadSprite(extension, context, {handInLocations: [{kind: 'object', bounds}, {kind: 'board', bounds}]}, view);
    expect(root.fetch).toHaveBeenCalledWith('../img/common/quest-dropoff.png');
    expect(context.drawImage).toHaveBeenCalledTimes(1);
});
test('pinned destination marker uses the configured target bounds', () => {
    const {extension, context, view} = environment();
    extension.draw(context, {destination: {x: 10, y: 10, width: 2, height: 3}}, view);
    expect(context.strokeRect).toHaveBeenCalledWith(120, 120, 64, 96);
});

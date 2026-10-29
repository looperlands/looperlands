const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');

function setup({mobile = false} = {}) {
    const modules = {mapmakerentities: require('../../shared/js/mapmakerentities.json')};
    const sandbox = {_, console: {debug() {}}, define(dependencies, factory) {
        modules.current = typeof dependencies === 'function' ? dependencies()
            : factory(...dependencies.map(name => modules[name]));
    }};
    vm.createContext(sandbox);
    for (const name of ['lib/class', '../../shared/js/gametypes', 'camera', 'transition', 'game']) {
        vm.runInContext(fs.readFileSync(require.resolve('./' + name), 'utf8'), sandbox);
        modules[name] = modules.current;
    }
    const renderer = {mobile, tilesize: 16, clearScreen: jest.fn()};
    const camera = new modules.camera(renderer);
    camera.setBoundingBox(10, 20, 60, 40);
    const game = Object.assign(Object.create(modules.game.prototype), {
        camera, renderer, zoningQueue: [], currentZoning: null,
        conversationHold: {stop: jest.fn()}, app: {closeChoicesPopup: jest.fn()},
        bubbleManager: {clean: jest.fn()}, client: {sendZone: jest.fn()},
        resetZone: jest.fn(), forEachVisibleEntityByDepth: jest.fn(),
    });
    return {game, camera, orientations: sandbox.Types.Orientations};
}

test.each([false, true])('walking along all four clamped scene edges skips zoning (mobile=%s)', mobile => {
    const {game, camera} = setup({mobile});
    for (const [cameraX, cameraY, offsetX, offsetY] of [
        [10, 25, 0, 2], [70 - camera.gridW, 25, camera.gridW - 1, 2],
        [15, 20, 5, 0], [15, 60 - camera.gridH, 5, camera.gridH - 1],
    ]) {
        camera.setGridPosition(cameraX, cameraY);
        for (let step = 0; step < 4; step++) {
            const x = camera.gridX + offsetX + (offsetY === 2 ? 0 : step);
            const y = camera.gridY + offsetY + (offsetY === 2 ? step : 0);
            if (game.isZoningTile(x, y)) game.enqueueZoningFrom(x, y);
        }
    }
    expect(game.currentZoning).toBeNull();
    expect(game.zoningQueue).toHaveLength(0);
    expect(game.client.sendZone).not.toHaveBeenCalled();
    expect(game.resetZone).not.toHaveBeenCalled();
    expect(game.conversationHold.stop).not.toHaveBeenCalled();
});

test('unclamped viewport edges still start zoning in every direction', () => {
    const {game, camera, orientations} = setup();
    camera.setGridPosition(15, 25);
    for (const [x, y, direction] of [
        [15, 30, orientations.LEFT], [44, 30, orientations.RIGHT],
        [20, 25, orientations.UP], [20, 38, orientations.DOWN],
    ]) {
        expect(game.isZoningTile(x, y)).toBe(true);
        expect(game.getZoningOrientation(x, y)).toBe(direction);
    }
    game.enqueueZoningFrom(44, 30);
    expect(game.currentZoning).not.toBeNull();
    expect(game.client.sendZone).toHaveBeenCalledTimes(1);
});

test('a blocked corner direction allows scrolling along the other axis', () => {
    const {game, camera, orientations} = setup();
    camera.setGridPosition(10, 25);
    expect(game.getZoningOrientation(10, 25)).toBe(orientations.UP);
});

test('scenes smaller than the viewport never start zoning', () => {
    const {game, camera} = setup();
    camera.setBoundingBox(10, 20, 10, 8);
    expect(game.isZoningTile(camera.gridX, camera.gridY + 3)).toBe(false);
    expect(game.isZoningTile(camera.gridX + camera.gridW - 1, camera.gridY + 3)).toBe(false);
    expect(game.isZoningTile(camera.gridX + 3, camera.gridY)).toBe(false);
    expect(game.isZoningTile(camera.gridX + 3, camera.gridY + camera.gridH - 1)).toBe(false);
});

test('bounds overrides and unbounded cameras allow scrolling past scene edges', () => {
    const {game, camera} = setup();
    camera.setGridPosition(10, 25);
    camera.boundsOverride = {x: 0, y: 0, w: 140, h: 120};
    expect(game.isZoningTile(10, 30)).toBe(true);
    camera.boundsOverride = null;
    camera.bounds = null;
    expect(game.isZoningTile(10, 30)).toBe(true);
    expect(game.isZoningTile(15, 30)).toBe(false);
});

test('queued zoning that becomes blocked is discarded without starting another transition', () => {
    const {game, camera} = setup();
    camera.setGridPosition(40, 25);
    game.zoningQueue.push({x: 69, y: 30});
    game.startZoningFrom(69, 30);
    expect(game.currentZoning).toBeNull();
    expect(game.zoningQueue).toHaveLength(0);
    expect(game.client.sendZone).not.toHaveBeenCalled();
});

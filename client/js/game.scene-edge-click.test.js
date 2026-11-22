const fs = require('fs');
const vm = require('vm');

function setup() {
    const modules = Object.fromEntries(['mob', 'player', 'item', 'npc', 'chest'].map(name => [name, class {}]));
    modules.mapmakerentities = require('../../shared/js/mapmakerentities.json');
    const sandbox = {
        Date, Math, console,
        $: () => ({hasClass: () => false, filter: () => [], is: () => false}),
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => modules[name]));
        },
    };
    vm.createContext(sandbox);
    for (const name of ['lib/class', '../../shared/js/gametypes', 'game']) {
        vm.runInContext(fs.readFileSync(require.resolve('./' + name), 'utf8'), sandbox);
        modules[name] = modules.current;
    }

    const scene = {id: 'current'}, nextScene = {id: 'next'};
    const camera = {
        gridX: 10, gridY: 20, gridW: 30, gridH: 14,
        x: 10 * 16, y: 20 * 16,
        bounds: {x: 10, y: 20, w: 30, h: 14},
    };
    const map = {
        isDoor: jest.fn(() => false),
        isColliding: jest.fn(() => false),
        getLakeName: () => null,
        getCurrentScene: jest.fn(({gridX, gridY}) =>
            gridX >= 10 && gridX < 40 && gridY >= 20 && gridY < 34 ? scene : nextScene),
    };
    const game = Object.assign(Object.create(modules.game.prototype), {
        started: true, player: {id: 1, gridX: 25, gridY: 26, isDead: false},
        previousClickPosition: {}, map, camera, renderer: {tilesize: 16},
        app: {hideChat: jest.fn(), toggleMiniMap: jest.fn()},
        getEntityAt: () => null, makePlayerGoTo: jest.fn(),
        pathingGrid: Array.from({length: 50}, () => Array(60).fill(0)),
    });
    sandbox.self = game;
    return {game, camera, map, scene};
}

test.each([
    ['left', 10, 25, 9, 25],
    ['right', 39, 25, 40, 25],
    ['top', 15, 20, 15, 19],
    ['bottom', 15, 33, 15, 34],
])('mouse click crosses a walkable %s scene edge despite clamped camera', (side, x, y, nextX, nextY) => {
    const {game} = setup();
    expect(game.getZoningOrientation(x, y)).toBe('');
    game.click({x, y});
    expect(game.makePlayerGoTo).toHaveBeenCalledWith(nextX, nextY);
});

test('blocked neighboring tile keeps the mouse destination at the clicked edge', () => {
    const {game, map} = setup();
    map.isColliding.mockImplementation((x, y) => x === 40 && y === 25);
    game.click({x: 39, y: 25});
    expect(game.makePlayerGoTo).toHaveBeenCalledWith(39, 25);
});

test('no scene change keeps the clicked edge as the destination', () => {
    const {game, map, scene} = setup();
    map.getCurrentScene.mockReturnValue(scene);
    game.click({x: 39, y: 25});
    expect(game.makePlayerGoTo).toHaveBeenCalledWith(39, 25);
});

test('clicking inside the scene does not overshoot toward its edge', () => {
    const {game} = setup();
    game.click({x: 38, y: 25});
    expect(game.makePlayerGoTo).toHaveBeenCalledWith(38, 25);
});

test('keyboard movement is never extended into the next scene', () => {
    const {game} = setup();
    game.click({x: 39, y: 25, keyboard: true});
    expect(game.makePlayerGoTo).toHaveBeenCalledWith(39, 25);
});

test('clicking a doorway on the scene edge does not skip its trigger', () => {
    const {game, map} = setup();
    map.isDoor.mockImplementation((x, y) => x === 39 && y === 25);
    game.click({x: 39, y: 25});
    expect(game.makePlayerGoTo).toHaveBeenCalledWith(39, 25);
});

test('scripted camera bounds do not cause automatic scene crossings', () => {
    const {game, camera} = setup();
    camera.boundsOverride = {...camera.bounds};
    game.click({x: 39, y: 25});
    expect(game.makePlayerGoTo).toHaveBeenCalledWith(39, 25);
});

test('ordinary unclamped viewport edge still walks one tile beyond the click', () => {
    const {game, camera, map, scene} = setup();
    Object.assign(camera, {gridX: 15, gridY: 25, x: 15 * 16, y: 25 * 16,
        bounds: {x: 10, y: 20, w: 60, h: 40}});
    map.getCurrentScene.mockReturnValue(scene);
    expect(game.isZoningTile(44, 30)).toBe(true);
    game.click({x: 44, y: 30});
    expect(game.makePlayerGoTo).toHaveBeenCalledWith(45, 30);
});

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadMovement() {
    const modules = {};
    const sandbox = {
        console,
        Types: {Orientations: {LEFT: 1, RIGHT: 2, UP: 3, DOWN: 4}},
        define(dependencies, factory) {
            if (typeof dependencies === 'function') {
                modules.current = dependencies();
            } else {
                modules.current = factory(...dependencies.map(name => modules[name] || function () {}));
            }
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'lib/class.js'), 'utf8'), sandbox);
    for (const name of ['entity', 'transition', 'character', 'updater', 'game']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, `${name}.js`), 'utf8'), sandbox);
        modules[name] = modules.current;
    }
    return {modules, sandbox};
}

function walking(pathPoints) {
    const {modules, sandbox} = loadMovement();
    const character = Object.create(modules.character.prototype);
    Object.assign(character, {
        x: 0, y: 0, gridX: 0, gridY: 0, moveSpeed: 120,
        movement: new modules.transition(), newDestination: null,
        checkAggro: jest.fn(), walk(orientation) { this.orientation = orientation; },
        idle() {},
    });
    character.followPath(pathPoints);
    const game = {currentTime: 0, forEachEntity(callback) { callback(character); }};
    const updater = Object.create(modules.updater.prototype);
    updater.game = game;
    function frame(time) {
        game.currentTime = time;
        updater.updateCharacter(character);
        updater.updateTransitions();
    }
    return {character, game, updater, frame, sandbox};
}

test.each([
    ['right', [[0, 0], [1, 0], [2, 0]], 'x', 1],
    ['left', [[0, 0], [-1, 0], [-2, 0]], 'x', -1],
    ['down', [[0, 0], [0, 1], [0, 2]], 'y', 1],
    ['up', [[0, 0], [0, -1], [0, -2]], 'y', -1],
])('%s movement starts without a jump and carries time across a tile', (_, points, axis, direction) => {
    const {character, frame} = walking(points);
    frame(0);
    expect(character[axis]).toBe(0);
    frame(60);
    expect(character[axis]).toBe(direction * 8);
    frame(130);
    expect(character[axis]).toBe(direction * 17);
    expect(character.movement.startTime).toBe(120);
    frame(240);
    expect(character[axis]).toBe(direction * 32);
    expect(character.isMoving()).toBe(false);
});

test.each([60, 120, 144])('movement follows elapsed time at %i Hz across multiple tiles', refreshRate => {
    const {character, frame} = walking(Array.from({length: 12}, (_, x) => [x, 0]));
    for (let time = 0; time < 1000; time += 1000 / refreshRate) {
        frame(time);
        expect(character.x).toBe(Math.round(time * 16 / 120));
    }
});

test('rounded positions do not finish a tile before its duration expires', () => {
    const {character, frame} = walking([[0, 0], [1, 0]]);
    frame(0);
    frame(117);
    expect(character.x).toBe(16);
    expect(character.movement.inProgress).toBe(true);
    frame(120);
    expect(character.movement.inProgress).toBe(false);
    expect(character.isMoving()).toBe(false);
});

test('a turn carries the frame remainder into the new direction', () => {
    const {character, frame} = walking([[0, 0], [1, 0], [1, 1]]);
    frame(0);
    frame(150);
    expect(character.x).toBe(16);
    expect(character.y).toBe(4);
});

test('interrupted movement completes the current tile without starting another', () => {
    const {character, frame} = walking([[0, 0], [1, 0], [2, 0]]);
    frame(0);
    character.stop();
    frame(130);
    expect(character.x).toBe(16);
    expect(character.isMoving()).toBe(false);
    expect(character.movement.inProgress).toBe(false);
});

test('held input continues across the last tile without an idle frame', () => {
    const {character, frame} = walking([[0, 0], [1, 0]]);
    character.onPathContinuation(() => [[character.gridX, 0], [character.gridX + 1, 0]]);
    frame(0);
    frame(150);
    expect(character.x).toBe(20);
    expect(character.isMoving()).toBe(true);
});

test('returning from a suspended tab limits catch-up rather than racing through the path', () => {
    const {character, frame} = walking(Array.from({length: 100}, (_, x) => [x, 0]));
    frame(0);
    frame(60000);
    expect(character.x).toBe(32);
    expect(character.movement.startTime).toBe(60000);
    frame(60060);
    expect(character.x).toBe(40);
});

test('game ticks render every worker animation frame at 60 Hz', () => {
    const {modules, sandbox} = loadMovement();
    let now = 0;
    sandbox.Date = class { getTime() { return now; } };
    const game = Object.assign(Object.create(modules.game.prototype), {
        started: true,
        renderer: {frameTime: 20, worker: {postMessage: jest.fn()}, renderFrame: jest.fn()},
        updater: {update: jest.fn()}, updateCursorLogic: jest.fn(),
        canUseCenteredCamera: () => false,
        toolImpactFeedback: {render: jest.fn()}, gamepadListener: {update: jest.fn()},
    });
    for (let frame = 0; frame < 60; frame++) {
        now = frame * 1000 / 60;
        game.tick();
    }
    expect(game.renderer.renderFrame).toHaveBeenCalledTimes(60);
    expect(game.renderer.worker.postMessage).not.toHaveBeenCalled();
});


test('the centered camera eases during ticks but explicit focus still snaps', () => {
    const {modules, sandbox} = loadMovement();
    sandbox.Date = class { getTime() { return 100; } };
    const player = {};
    const camera = {follow: jest.fn(), lookAt: jest.fn()};
    const game = Object.assign(Object.create(modules.game.prototype), {
        started: true, player,
        renderer: {camera, renderFrame: jest.fn()},
        updater: {update: jest.fn()}, updateCursorLogic: jest.fn(),
        canUseCenteredCamera: () => true,
        toolImpactFeedback: {render: jest.fn()}, gamepadListener: {update: jest.fn()},
    });
    game.tick();
    expect(camera.follow).toHaveBeenCalledWith(player, 100);
    expect(camera.lookAt).not.toHaveBeenCalled();
    game.focusPlayer();
    expect(camera.lookAt).toHaveBeenCalledWith(player);
});


test.each([[1, 1], [-1, 1], [1, -1], [-1, -1]])('diagonal (%i,%i) moves both axes together at normalized speed', (dx, dy) => {
    const {character, frame} = walking([[0, 0], [dx, dy], [dx * 2, dy * 2]]);
    const duration = 120 * Math.SQRT2;
    frame(0);
    frame(duration / 2);
    expect(character.x).toBe(dx * 8);
    expect(character.y).toBe(dy * 8);
    expect(character.movement.duration).toBeCloseTo(duration);
    frame(duration + 30);
    expect(character.x).toBe(dx * 19);
    expect(character.y).toBe(dy * 19);
    expect(character.gridX).toBe(dx);
    expect(character.gridY).toBe(dy);
    frame(duration * 2);
    expect(character.x).toBe(dx * 32);
    expect(character.y).toBe(dy * 32);
    expect(character.isMoving()).toBe(false);
});

test('level 100 diagonal movement stays straight across tile boundaries', () => {
    const {character, frame} = walking(Array.from({length: 20}, (_, i) => [i, i]));
    character.moveSpeed = 87;
    for (let time = 0; time < 1000; time += 1000 / 60) {
        frame(time);
        expect(character.x).toBe(character.y);
        expect(character.x).toBe(Math.round(time * 16 / (87 * Math.SQRT2)));
    }
});


test.each([1, 2, 3])('mouse targeting includes the camera offset inside a tile at scale %i', scale => {
    const {modules} = loadMovement();
    const game = Object.assign(Object.create(modules.game.prototype), {
        renderer: {scale, tilesize: 16, camera: {x: 175, y: 335, gridX: 10, gridY: 20}},
        mouse: {x: 2 * scale, y: 2 * scale},
    });
    expect(game.getMouseGridPosition()).toEqual({x: 11, y: 21});
    game.mouse = {x: scale, y: scale};
    expect(game.getMouseGridPosition()).toEqual({x: 11, y: 21});
    game.mouse = {x: 0, y: 0};
    expect(game.getMouseGridPosition()).toEqual({x: 10, y: 20});
});

test('mouse targeting uses floor for negative camera positions in small scenes', () => {
    const {modules} = loadMovement();
    const game = Object.assign(Object.create(modules.game.prototype), {
        renderer: {scale: 2, tilesize: 16, camera: {x: -17, y: -1, gridX: -2, gridY: -1}},
        mouse: {x: 4, y: 4},
    });
    expect(game.getMouseGridPosition()).toEqual({x: -1, y: 0});
});

test.each([60, 120, 144])('manual acceleration follows elapsed time at %i Hz and reaches full speed', hz => {
    const {character, game, frame} = walking(Array.from({length: 30}, (_, i) => [i, 0]));
    character.moveSpeed = 87;
    game.player = character;
    game.keyboardMovement = true;
    for (let time = 0; time < 1000; time += 1000 / hz) {
        frame(time);
        const distance = time < 200 ? time * time / 400 : time - 100;
        expect(character.x).toBe(Math.round(distance * 16 / 87));
    }
    expect(character.movement.duration).toBeCloseTo(87);
});

test('manual acceleration preserves normalized diagonal speed', () => {
    const {character, game, frame} = walking(Array.from({length: 20}, (_, i) => [i, i]));
    character.moveSpeed = 87;
    game.player = character;
    game.keyboardMovement = true;
    for (let time = 0; time < 1000; time += 1000 / 60) {
        frame(time);
        const distance = time < 200 ? time * time / 400 : time - 100;
        expect(character.x).toBe(character.y);
        expect(character.x).toBe(Math.round(distance * 16 / (87 * Math.SQRT2)));
    }
});

test('click-to-move remains at constant speed and clears manual acceleration', () => {
    const {character, game, frame} = walking([[0, 0], [1, 0], [2, 0]]);
    game.player = character;
    game.keyboardMovement = false;
    character.manualMovementTime = 30;
    frame(0);
    frame(60);
    expect(character.x).toBe(8);
    expect(character.manualMovementTime).toBeUndefined();
});

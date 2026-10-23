const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');
const typesSandbox = {_};
vm.runInNewContext(fs.readFileSync(require.resolve('../../shared/js/gametypes'), 'utf8'), typesSandbox);
const Types = typesSandbox.Types;

function setup(visible) {
    const modules = {};
    const sandbox = {
        _, Types, console,
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => modules[name] || function () {}));
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), sandbox);
    for (const name of ['entity', 'transition', 'timer', 'character', 'player', 'updater', 'game']) {
        vm.runInContext(fs.readFileSync(require.resolve(`./${name}`), 'utf8'), sandbox);
        modules[name] = modules.current;
    }

    const player = new modules.player(42, 'Local player', Types.Entities.WARRIOR);
    player.setGridPosition(2, 2);
    player.isLoaded = true;
    player.walk = jest.fn();
    player.idle = jest.fn();
    player.checkAggro = jest.fn();
    const cells = () => Array.from({length: 8}, () => Array.from({length: 8}, () => ({})));
    const game = Object.assign(Object.create(modules.game.prototype), {
        player, playerId: player.id, entities: {}, currentTime: 0,
        renderer: {mobile: true}, camera: {isVisiblePosition: () => visible},
        entityGrid: cells(), renderingGrid: cells(), itemGrid: cells(),
        pathingGrid: Array.from({length: 8}, () => Array(8).fill(0)),
        map: {isOutOfBounds: () => false, getCurrentTrigger: () => null, preloadNearDoors: jest.fn()},
        sprites: {clotharmor: {name: 'clotharmor', createAnimations: () => ({})}},
        getServerInfo: jest.fn(), handleScene: jest.fn(),
        onCharacterUpdate: jest.fn(),
    });
    game.renderer.getEntityBoundingRect = () => ({});
    game.camera.isVisible = () => false;
    game.addEntity(player);
    let spawn;
    game.client = {onSpawnCharacter: callback => { spawn = callback; }};
    // Register the production network callback without opening a server connection.
    const source = fs.readFileSync(require.resolve('./game'), 'utf8');
    const start = source.indexOf('self.client.onSpawnCharacter(');
    const end = source.indexOf('self.client.onDespawnEntity(', start);
    vm.runInContext(source.slice(start, end), Object.assign(sandbox, {
        self: game, Player: modules.player, Character: modules.character,
        Mob: function () {}, Npc: function () {},
    }));
    const duplicate = id => Object.assign(new modules.player(id, 'Network player', Types.Entities.WARRIOR), {
        idle: jest.fn(),
    });
    return {game, player, spawn, duplicate, modules, sandbox};
}

test.each([true, false])('duplicate local SPAWN keeps the avatar registered and controllable (visible=%s)', visible => {
    const {game, player, spawn, duplicate, modules} = setup(visible);
    spawn(duplicate(player.id), 2, 2, Types.Orientations.DOWN);

    expect(game.getEntityById(player.id)).toBe(player);
    expect(game.renderingGrid[2][2][player.id]).toBe(player);
    expect(game.entityGrid[2][2][player.id]).toBe(player);

    player.followPath([[2, 2], [3, 2]]);
    const updater = Object.assign(Object.create(modules.updater.prototype), {game});
    updater.updateCharacters();
    game.currentTime = player.moveSpeed;
    updater.updateTransitions();
    expect(player.gridX).toBe(3);
    expect(player.x).toBe(48);
    expect(player.isMoving()).toBe(false);
});

test.each([true, false])('remote SPAWN refreshes the existing avatar in every visibility state (visible=%s)', visible => {
    const {game, spawn, duplicate} = setup(visible);
    const remote = duplicate(7);
    remote.setGridPosition(1, 1);
    game.addEntity(remote);
    const replacement = duplicate(7);
    spawn(replacement, 4, 4, Types.Orientations.DOWN);

    expect(game.getEntityById(7)).toBe(remote);
    expect(game.renderingGrid[4][4][7]).toBe(remote);
    expect(game.renderingGrid[1][1][7]).toBeUndefined();
    expect(game.getEntityById(game.playerId)).toBe(game.player);
});

function walkingWest(mobile = true, route = [[4, 2], [3, 2]]) {
    const state = setup(true);
    const {game, player, modules, sandbox} = state;
    game.renderer.mobile = mobile;
    game.unregisterEntityPosition(player);
    player.setGridPosition(4, 2);
    game.registerEntityPosition(player);
    Object.assign(game, {
        getEntityAt: () => null, findVisibleTiles: jest.fn(),
        isZoningTile: () => false, updatePlayerCheckpoint: jest.fn(),
        forNearestEntityAround: () => null, lootItemAt: jest.fn(),
        audioManager: {updateMusic: jest.fn()},
    });
    Object.assign(game.map, {isDoor: () => false, findNearestActionTileAround: () => null});
    const source = fs.readFileSync(require.resolve('./game'), 'utf8');
    const start = source.indexOf('self.player.onBeforeStep(');
    const end = source.indexOf('self.player.onRequestPath(', start);
    vm.runInContext(source.slice(start, end), Object.assign(sandbox, {Chest: function () {}}));
    const updater = Object.assign(Object.create(modules.updater.prototype), {game});
    const frame = time => {
        game.currentTime = time;
        updater.updateCharacters();
        updater.updateTransitions();
    };
    player.followPath(route);
    frame(0);
    return {...state, frame};
}

test.each([
    [true, []], [false, []], [true, [[3, 2]]], [false, [[3, 2]]],
])('an unsuccessful click reroute (mobile=%s, path=%j) keeps the avatar visible and accepts the next click', async (mobile, result) => {
    const {game, player, frame} = walkingWest(mobile);
    player.onRequestPath(() => Promise.resolve(result));
    player.moveTo_(result.length ? 3 : 2, 2);
    frame(player.moveSpeed);
    await Promise.resolve();

    expect(player.isMoving()).toBe(false);
    expect(game.renderingGrid[2][3][player.id]).toBe(player);
    expect(game.entityGrid[2][3][player.id]).toBe(player);
    player.onRequestPath(() => Promise.resolve([[3, 2], [2, 2]]));
    player.moveTo_(2, 2);
    await Promise.resolve();
    frame(240);
    frame(360);
    expect(player.gridX).toBe(2);
    expect(game.renderingGrid[2][2][player.id]).toBe(player);
});

test('the avatar stays registered while a replacement click path is pending', async () => {
    const {game, player, frame} = walkingWest();
    let resolvePath;
    player.onRequestPath(() => new Promise(resolve => { resolvePath = resolve; }));
    player.moveTo_(2, 2);
    frame(player.moveSpeed);
    expect(game.renderingGrid[2][3][player.id]).toBe(player);
    expect(game.entityGrid[2][3][player.id]).toBe(player);
    resolvePath([[3, 2], [2, 2]]);
    await Promise.resolve();
    frame(240);
    frame(360);
    expect(player.gridX).toBe(2);
});

test('a rejected reroute restores movement and clears the old next-tile registration', async () => {
    const {game, player, frame} = walkingWest(true, [[4, 2], [3, 2], [2, 2]]);
    const error = new Error('Pathfinding worker unavailable');
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        player.onRequestPath(() => Promise.reject(error));
        player.moveTo_(1, 2);
        frame(player.moveSpeed);
        player.stop();
        await Promise.resolve();
        expect(player.isMoving()).toBe(false);
        expect(game.renderingGrid[2][3][player.id]).toBe(player);
        expect(game.entityGrid[2][3][player.id]).toBe(player);
        expect(game.entityGrid[2][2][player.id]).toBeUndefined();
        expect(log).toHaveBeenCalledWith(error);
        player.onRequestPath(() => Promise.resolve([[3, 2], [2, 2]]));
        player.moveTo_(2, 2);
        await Promise.resolve();
        frame(240);
        frame(360);
        expect(player.gridX).toBe(2);
    } finally {
        log.mockRestore();
    }
});

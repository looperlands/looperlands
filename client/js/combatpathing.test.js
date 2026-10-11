const fs = require('fs');
const path = require('path');
const vm = require('vm');
const _ = require('underscore');
const typesSandbox = {_, console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../shared/js/gametypes.js'), 'utf8'), typesSandbox);
const Types = typesSandbox.Types;

function setup(attackerType, targetType, targetPosition) {
    const modules = {};
    const workers = [];
    const source = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
    class Worker {
        constructor() {
            this.requests = [];
            const self = {postMessage: data => this.onmessage({data})};
            vm.runInNewContext(source('pathfinder-webworker.js'), {self, console});
            this.complete = () => self.onmessage({data: this.requests.shift()});
            workers.push(this);
        }
        postMessage(data) { this.requests.push(JSON.parse(JSON.stringify(data))); }
    }
    const sandbox = {
        console, _, Types, Worker, AltNames: {getAltNameFromKind: () => undefined},
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => modules[name] || function () {}));
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(source('lib/class.js'), sandbox);
    for (const name of ['entity', 'transition', 'timer', 'character', 'player', 'mob', 'updater', 'game']) {
        vm.runInContext(source(`${name}.js`), sandbox);
        modules[name] = modules.current;
    }
    const Pathfinder = vm.runInContext(`${source('pathfinder.js')}\nPathfinder;`, sandbox);
    const makeCharacter = (type, id) => type === 'player'
        ? new modules.player(id, 'player', Types.Entities.WARRIOR)
        : new modules.mob(id, Types.Entities.RAT);
    const attacker = makeCharacter(attackerType, 7);
    const target = makeCharacter(targetType, 42);
    attacker.setGridPosition(2, 2);
    target.setGridPosition(...targetPosition);
    Object.assign(attacker, {weaponName: 'sword1', animate: jest.fn(), hit: jest.fn()});
    target.spriteName = 'rat';
    const grid = Array.from({length: 8}, () => Array(8).fill(0));
    grid[attacker.gridY][attacker.gridX] = attacker.id;
    grid[target.gridY][target.gridX] = target.id;
    const game = Object.assign(Object.create(modules.game.prototype), {
        currentTime: 0, playerId: attackerType === 'player' ? attacker.id : target.id,
        player: attackerType === 'player' ? attacker : target,
        finalPathingGrid: grid, pathfinder: new Pathfinder(8, 8),
        map: {isColliding: (x, y) => grid[y]?.[x] === 1},
        forEachEntity(callback) { callback(attacker); },
        tryMovingToADifferentTile: () => false,
        client: {sendHit: jest.fn(), sendHurt: jest.fn(), sendShoot: jest.fn()},
        camera: {isVisible: () => false},
    });
    const updater = Object.assign(Object.create(modules.updater.prototype), {game});
    let pending;
    attacker.onRequestPath((x, y) => {
        pending = game.findPath(attacker, x, y, [attacker, target]);
        return pending;
    });
    async function settlePath() {
        for (const worker of workers) if (worker.requests.length) await worker.complete();
        await pending;
    }
    async function engage() {
        game.createAttackLink(attacker, target);
        await settlePath();
    }
    function finishMovement() {
        for (let time = 0; time <= 2400; time += 60) {
            game.currentTime = time;
            updater.updateCharacter(attacker);
            updater.updateTransitions();
        }
    }
    return {attacker, target, game, grid, engage, settlePath, finishMovement, Player: modules.player};
}

describe.each([['player', 'mob'], ['mob', 'player'], ['player', 'player']])('%s attacking %s', (attackerType, targetType) => {
    test.each([[3, 3], [1, 3], [3, 1], [1, 1], [6, 6]])('paths beside the target at (%i,%i) and starts melee attacks', async (x, y) => {
        const {attacker, target, game, engage, finishMovement} = setup(attackerType, targetType, [x, y]);
        await engage();
        expect(attacker.canReachTarget()).toBe(false);
        finishMovement();
        expect(attacker.isMoving()).toBe(false);
        expect(Math.abs(attacker.gridX - target.gridX) + Math.abs(attacker.gridY - target.gridY)).toBe(1);
        game.onCharacterUpdate(attacker);
        expect(attacker.hit).toHaveBeenCalledTimes(1);
        expect(attackerType === 'player' ? game.client.sendHit : game.client.sendHurt).toHaveBeenCalledWith(
            attackerType === 'player' ? target : attacker);
    });
});

test('a player already directly beside the target attacks without walking', async () => {
    const {attacker, game, engage, finishMovement} = setup('player', 'mob', [3, 2]);
    await engage();
    finishMovement();
    expect([attacker.gridX, attacker.gridY]).toEqual([2, 2]);
    expect(attacker.isMoving()).toBe(false);
    game.onCharacterUpdate(attacker);
    expect(attacker.hit).toHaveBeenCalledTimes(1);
});

test('a ranged player can attack a diagonal target without approaching', async () => {
    const {attacker, target, game, engage, finishMovement} = setup('player', 'mob', [3, 3]);
    attacker.weaponName = 'NFT_ee955c3f7980209b84143b0d67f6e6617d22d13cbc8965054305a2080296b273';
    expect(Types.isRangedWeapon(Types.getKindFromString(attacker.weaponName))).toBe(true);
    await engage();
    finishMovement();
    expect([attacker.gridX, attacker.gridY]).toEqual([2, 2]);
    game.onCharacterUpdate(attacker);
    expect(game.client.sendShoot).toHaveBeenCalledWith(target);
});

test.each([[1, 0], [0, 1]])('melee uses the open approach when tile (%i,%i) is blocked', async (dx, dy) => {
    const {attacker, target, game, grid, engage, finishMovement} = setup('player', 'mob', [3, 3]);
    grid[2 + dy][2 + dx] = 1;
    await engage();
    finishMovement();
    expect([attacker.gridX, attacker.gridY]).toEqual(dx ? [2, 3] : [3, 2]);
    game.onCharacterUpdate(attacker);
    expect(game.client.sendHit).toHaveBeenCalledWith(target);
});

function updateAttackersDuringStep(game, target, localPlayer, Player) {
    // Exercise the actual movement callbacks without bootstrapping the game's network connection.
    const source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
    const marker = localPlayer ? 'self.player.forEachAttacker(function (attacker) {'
        : 'entity.forEachAttacker(function (attacker) {';
    const start = source.indexOf(marker);
    const end = source.indexOf('});', start) + 3;
    vm.runInNewContext(source.slice(start, end), {
        self: game, entity: target, Player,
    });
}

test.each([true, false])('mob follows when a moving target becomes diagonally adjacent (local player: %s)', async localPlayer => {
    const {attacker, target, game, grid, engage, settlePath, finishMovement, Player} = setup('mob', 'player', [3, 2]);
    await engage();
    finishMovement();
    grid[2][3] = 0;
    target.setGridPosition(3, 3);
    grid[3][3] = target.id;
    expect(attacker.canReachTarget()).toBe(false);
    updateAttackersDuringStep(game, target, localPlayer, Player);
    await settlePath();
    expect(attacker.isMoving()).toBe(true);
    finishMovement();
    expect(Math.abs(attacker.gridX - target.gridX) + Math.abs(attacker.gridY - target.gridY)).toBe(1);
    game.onCharacterUpdate(attacker);
    expect(game.client.sendHurt).toHaveBeenCalledWith(attacker);
});

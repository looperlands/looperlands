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
        console, _, Types, Worker, setTimeout, clearTimeout, AltNames: {getAltNameFromKind: () => undefined},
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
        map: {isColliding: (x, y) => grid[y]?.[x] === 1, isOutOfBounds: (x, y) => !grid[y] || grid[y][x] === undefined},
        entities: {[attacker.id]: attacker, [target.id]: target}, handleScene: jest.fn(),
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
    function frame(time) {
        game.currentTime = time;
        updater.updateCharacter(attacker);
        updater.updateTransitions();
    }
    return {attacker, target, game, grid, engage, settlePath, finishMovement, frame, workers, Player: modules.player};
}

test('repeated mob snapshots keep the active tween and path instead of jumping to its destination', async () => {
    const s = setup('mob', 'player', [6, 6]);
    const requested = jest.spyOn(s.attacker, 'requestPathfindingTo');
    const state = {id: s.attacker.id, kind: s.attacker.kind, x: 6, y: 2};
    for (let i = 0; i < 100; i++) s.game.refreshEntityState(state);
    expect(requested).toHaveBeenCalledTimes(1);
    expect(s.workers.reduce((n, worker) => n + worker.requests.length, 0)).toBe(1);
    expect([s.attacker.gridX, s.attacker.gridY, s.attacker.x, s.attacker.y]).toEqual([2, 2, 32, 32]);
    await s.settlePath();
    s.frame(0);
    s.frame(60);
    const path = s.attacker.path, tween = s.attacker.movement;
    const position = [s.attacker.x, s.attacker.y];
    const startTime = tween.startTime;
    expect(position).toEqual([40, 32]);
    for (let i = 0; i < 100; i++) s.game.refreshEntityState(state);
    expect([s.attacker.x, s.attacker.y]).toEqual(position);
    expect(s.attacker.path).toBe(path);
    expect(s.attacker.movement.startTime).toBe(startTime);
    expect(s.attacker.newDestination).toBeNull();
    expect(requested).toHaveBeenCalledTimes(1);
    s.frame(120);
    expect([s.attacker.x, s.attacker.y]).toEqual([48, 32]);
    for (let time = 140; time <= 480; time += 20) s.frame(time);
    expect([s.attacker.gridX, s.attacker.gridY]).toEqual([6, 2]);
    expect(s.attacker.isMoving()).toBe(false);
});

test('idle mob reconciliation follows a walkable path instead of crossing a wall', async () => {
    const s = setup('mob', 'player', [6, 6]);
    s.grid[2][3] = 1;
    s.game.refreshEntityState({id: s.attacker.id, kind: s.attacker.kind, x: 5, y: 2});
    expect([s.attacker.x, s.attacker.y]).toEqual([32, 32]);
    await s.settlePath();
    expect(s.attacker.path).not.toContainEqual([3, 2]);
    for (let time = 0; time <= 1600; time += 20) {
        const previous = [s.attacker.x, s.attacker.y];
        s.frame(time);
        expect(Math.hypot(s.attacker.x - previous[0], s.attacker.y - previous[1])).toBeLessThanOrEqual(16 * 20 / 120 + 0.001);
        expect(s.grid[s.attacker.gridY][s.attacker.gridX]).not.toBe(1);
    }
    expect([s.attacker.gridX, s.attacker.gridY]).toEqual([5, 2]);
});

test('combat snapshots preserve the current chase and resume it when an idle target has moved', async () => {
    const s = setup('mob', 'player', [6, 2]);
    const requested = jest.spyOn(s.attacker, 'requestPathfindingTo');
    const state = {id: s.attacker.id, kind: s.attacker.kind, x: 5, y: 2, target: s.target.id};
    for (let i = 0; i < 100; i++) s.game.refreshEntityState(state);
    expect(requested).toHaveBeenCalledTimes(1);
    await s.settlePath();
    s.frame(0); s.frame(60);
    const path = s.attacker.path, x = s.attacker.x;
    s.game.refreshEntityState(state);
    expect(s.attacker.path).toBe(path);
    expect(s.attacker.x).toBe(x);
    expect(s.attacker.target).toBe(s.target);
    expect(s.target.attackers[s.attacker.id]).toBe(s.attacker);
    expect(requested).toHaveBeenCalledTimes(1);
    s.frame(120); s.frame(240); s.frame(360);
    expect(s.attacker.canReachTarget()).toBe(true);
    s.target.setGridPosition(6, 5);
    for (let i = 0; i < 100; i++) s.game.refreshEntityState(state);
    expect(requested).toHaveBeenCalledTimes(2);
    await s.settlePath();
    for (let time = 380; time <= 1500; time += 20) s.frame(time);
    expect(s.attacker.canReachTarget()).toBe(true);
});

test('mob snapshots respect scripted attack ownership', () => {
    const s = setup('mob', 'player', [6, 6]);
    s.game.combatPrototype = {owns: () => true};
    s.attacker.combatMovementHeld = true;
    s.attacker.x = 35;
    const cancel = jest.spyOn(s.attacker, 'cancelPath');
    s.game.refreshEntityState({id: s.attacker.id, kind: s.attacker.kind, x: 5, y: 2, target: s.target.id, level: 20});
    expect([s.attacker.gridX, s.attacker.gridY, s.attacker.x, s.attacker.y]).toEqual([2, 2, 35, 32]);
    expect(s.attacker.level).toBe(20);
    expect(cancel).not.toHaveBeenCalled();
    expect(s.attacker.target).toBeNull();
});

test('a target that comes into reach invalidates an older pending chase', async () => {
    const s = setup('mob', 'player', [6, 2]);
    const state = {id: s.attacker.id, kind: s.attacker.kind, x: 5, y: 2, target: s.target.id};
    s.game.refreshEntityState(state);
    expect(s.attacker.pendingPathRequestId).not.toBeNull();
    s.target.setGridPosition(3, 2);
    s.game.refreshEntityState(state);
    await s.settlePath();
    expect(s.attacker.isMoving()).toBe(false);
    expect(s.attacker.canReachTarget()).toBe(true);
    expect([s.attacker.gridX, s.attacker.gridY, s.attacker.x, s.attacker.y]).toEqual([2, 2, 32, 32]);
});

test.each(['empty', 'rejected'])('an %s path can retry on the next mob snapshot', async result => {
    const s = setup('mob', 'player', [6, 6]);
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        const requested = jest.spyOn(s.attacker, 'requestPathfindingTo').mockImplementationOnce(() =>
            result === 'empty' ? Promise.resolve([]) : Promise.reject(new Error('Worker unavailable')));
        const state = {id: s.attacker.id, kind: s.attacker.kind, x: 6, y: 2};
        s.game.refreshEntityState(state);
        await Promise.resolve();
        expect(s.attacker.isMoving()).toBe(false);
        expect(s.attacker.pendingPathRequestId).toBeNull();
        s.game.refreshEntityState(state);
        expect(requested).toHaveBeenCalledTimes(2);
        await s.settlePath();
        for (let time = 0; time <= 600; time += 20) s.frame(time);
        expect([s.attacker.gridX, s.attacker.gridY]).toEqual([6, 2]);
    } finally {
        error.mockRestore();
    }
});

test('a newer snapshot supersedes an outstanding path continuation without a jump', async () => {
    const s = setup('mob', 'player', [6, 6]);
    const snapshot = (x, y) => s.game.refreshEntityState({id: s.attacker.id, kind: s.attacker.kind, x, y});
    snapshot(6, 2);
    await s.settlePath();
    s.frame(0); s.frame(60);
    const x = s.attacker.x;
    snapshot(2, 6);
    expect(s.attacker.x).toBe(x);
    s.frame(120);
    expect(s.attacker.pendingPathRequestId).not.toBeNull();
    snapshot(6, 4);
    await s.workers[1].complete(); // deliver the older continuation before the new route
    expect(s.attacker.pendingPathRequestId).not.toBeNull();
    await s.settlePath();
    for (let time = 140; time <= 1400; time += 20) s.frame(time);
    expect([s.attacker.gridX, s.attacker.gridY]).toEqual([6, 4]);
    expect(s.attacker.isMoving()).toBe(false);
});

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


test.each([true,false])('a held charge cannot follow a sidestepping player until recovery ends (local: %s)',async localPlayer=>{
    const s=setup('mob','player',[3,2]);await s.engage();s.finishMovement();
    s.attacker.combatMovementHeld=true;s.attacker.cancelPath();s.target.setGridPosition(3,3);
    updateAttackersDuringStep(s.game,s.target,localPlayer,s.Player);await s.settlePath();
    expect(s.attacker.isMoving()).toBe(false);expect([s.attacker.x,s.attacker.y]).toEqual([32,32]);
    delete s.attacker.combatMovementHeld;
    updateAttackersDuringStep(s.game,s.target,localPlayer,s.Player);await s.settlePath();s.finishMovement();
    expect(s.attacker.isAdjacentNonDiagonal(s.target)).toBe(true);
});


test('ordinary melee reports its visible mob tile before requesting HURT',async()=>{
    const s=setup('mob','player',[3,2]);await s.engage();s.finishMovement();
    const calls=[];
    s.game.combatPrototype={owns:()=>false,reportMobAttack:mob=>calls.push(['origin',mob.gridX,mob.gridY])};
    s.game.client.sendHurt=mob=>calls.push(['hurt',mob.id]);
    s.game.onCharacterUpdate(s.attacker);
    expect(calls).toEqual([['origin',2,2],['hurt',s.attacker.id]]);
});

test('late ordinary MOVE packets cannot clear a charged mob target or start another path',()=>{
    const source=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');
    const start=source.indexOf('self.client.onEntityMove(function (id, x, y) {');
    const end=source.indexOf('self.client.onEntityDestroy',start);
    let receive;
    const mob={disengage:jest.fn(),idle:jest.fn()};
    const game={client:{onEntityMove:callback=>{receive=callback;}},getEntityById:()=>mob,
        combatPrototype:{owns:()=>true},makeCharacterGoTo:jest.fn(),clearPendingEntityAttack:jest.fn()};
    vm.runInNewContext(source.slice(start,end),{self:game});
    receive(7,5,5);expect(mob.disengage).not.toHaveBeenCalled();expect(game.makeCharacterGoTo).not.toHaveBeenCalled();
    game.combatPrototype.owns=()=>false;receive(7,5,5);
    expect(mob.disengage).toHaveBeenCalledTimes(1);expect(game.makeCharacterGoTo).toHaveBeenCalledWith(mob,5,5);
});

const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');

function setup() {
    const modules = {}, callbacks = {};
    const sandbox = {
        _, console: {log() {}, debug() {}, error: jest.fn()}, setTimeout, clearTimeout,
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => modules[name] || function () {}));
        },
    };
    vm.createContext(sandbox);
    for (const file of ['./lib/class', '../../shared/js/gametypes']) {
        vm.runInContext(fs.readFileSync(require.resolve(file), 'utf8'), sandbox);
    }
    const Types = sandbox.Types;
    for (const name of ['entity', 'transition', 'timer', 'character', 'player', 'item']) {
        vm.runInContext(fs.readFileSync(require.resolve('./' + name), 'utf8'), sandbox);
        modules[name] = modules.current;
    }
    modules.mob = modules.character.extend({});
    modules.npc = modules.character.extend({setShowIndicator() {}, applyBehaviorState() {}});
    modules.projectile = modules.entity.extend({});
    vm.runInContext(fs.readFileSync(require.resolve('./game'), 'utf8'), sandbox);
    modules.game = modules.current;
    const cells = () => Array.from({length: 8}, () => Array.from({length: 8}, () => ({})));
    const game = Object.assign(Object.create(modules.game.prototype), {
        playerId: 42, entities: {}, currentTime: 0,
        renderer: {mobile: true}, camera: {isVisible: () => false},
        entityGrid: cells(), renderingGrid: cells(), itemGrid: cells(),
        pathingGrid: Array.from({length: 8}, () => Array(8).fill(0)),
        map: {isOutOfBounds: () => false, getCurrentTrigger: () => null},
        sprites: {rat: {name: 'rat', createAnimations: () => ({})},
            clotharmor: {name: 'clotharmor', createAnimations: () => ({})}},
        getServerInfo: jest.fn(), handleScene: jest.fn(),
        onCharacterUpdate: jest.fn(), makeCharacterGoTo: jest.fn(),
        findPath: jest.fn((entity, x, y) => Promise.resolve([[entity.gridX, entity.gridY], [x, y]])),
    });
    const actor = (id, Type = modules.mob, x = 1, y = 1) => {
        const entity = Type === modules.player ? new Type(id, 'Player', Types.Entities.WARRIOR)
            : new Type(id, Types.Entities.RAT);
        entity.idle = jest.fn();
        entity.walk = jest.fn();
        entity.setGridPosition(x, y);
        return entity;
    };
    game.player = actor(42, modules.player, 2, 2);
    game.addEntity(game.player);
    game.client = {sendWho: jest.fn()};
    for (const name of ['EntityState', 'EntityList', 'SpawnCharacter', 'EntityMove',
        'EntityDestroy', 'PlayerMoveToItem', 'EntityAttack']) {
        game.client['on' + name] = fn => {callbacks[name] = fn;};
    }
    const text = fs.readFileSync(require.resolve('./game'), 'utf8');
    for (const [start, end] of [
        ['this.client.onEntityState(', 'this.client.onWelcome('],
        ['self.client.onSpawnCharacter(', 'self.client.onDespawnEntity('],
        ['self.client.onEntityMove(', 'self.client.onPlayerDamageMob('],
    ]) {
        const from = text.indexOf(start), to = text.indexOf(end, from);
        vm.runInContext(text.slice(from, to), Object.assign(sandbox, {
            self: game, client: game.client, Player: modules.player, Character: modules.character,
            Mob: modules.mob, Npc: modules.npc, Item: modules.item, Projectile: modules.projectile,
        }));
    }
    return {game, actor, modules, callbacks, Types, sandbox};
}

test('area entry refreshes known IDs and removes stale mobs from all grids', () => {
    const {game, actor, callbacks} = setup();
    const stale = actor(7), known = actor(8);
    game.addEntity(stale);
    game.addEntity(known);
    callbacks.EntityList([null, 8, 42]);
    expect(game.entities[7]).toBeUndefined();
    expect(game.entityGrid[1][1][7]).toBeUndefined();
    expect(game.renderingGrid[1][1][7]).toBeUndefined();
    expect(game.client.sendWho).toHaveBeenCalledWith([8]);
    expect(game.entities[8]).toBe(known);
    expect(game.entities[42]).toBe(game.player);
});

test('area cleanup also removes obsolete item-grid entries', () => {
    const {game, modules, callbacks, Types} = setup();
    const item = new modules.item(7, Types.Entities.FLASK, 'object');
    item.setGridPosition(1, 1);
    game.addEntity(item);
    callbacks.EntityList([]);
    expect(game.entities[7]).toBeUndefined();
    expect(game.itemGrid[1][1][7]).toBeUndefined();
    expect(game.renderingGrid[1][1][7]).toBeUndefined();
    expect(game.client.sendWho).not.toHaveBeenCalled();
});

test('area snapshots preserve client-owned projectiles', () => {
    const {game, modules, callbacks, Types} = setup();
    const projectile = new modules.projectile('projectile_1', Types.Entities.RAT);
    projectile.setGridPosition(1, 1);
    game.addEntity(projectile);
    callbacks.EntityList([]);
    expect(game.entities[projectile.id]).toBe(projectile);
});

test('visibility cleanup clears both tiles reserved by an entity in motion', () => {
    const {game, actor, callbacks} = setup();
    const mob = actor(7);
    game.addEntity(mob);
    mob.nextGridX = 2; mob.nextGridY = 1;
    game.registerEntityDualPosition(mob);
    callbacks.EntityList([]);
    expect(game.entityGrid[1][1][7]).toBeUndefined();
    expect(game.entityGrid[1][2][7]).toBeUndefined();
    expect(game.pathingGrid[1][2]).toBe(0);
});

test('a fresh mob snapshot reconciles the loaded object and discards old path reservations', () => {
    const {game, actor, callbacks, Types} = setup();
    const mob = actor(7);
    mob.nextGridX = 2; mob.nextGridY = 1;
    game.addEntity(mob);
    game.registerEntityDualPosition(mob);
    callbacks.EntityState({id: 7, kind: mob.kind, x: 5, y: 4, orientation: Types.Orientations.LEFT, level: 20});
    expect(game.entities[7]).toBe(mob);
    expect([mob.gridX, mob.gridY, mob.level]).toEqual([5, 4, 20]);
    expect(mob.path).toBeNull();
    expect(mob.nextGridX).toBe(-1);
    expect(game.entityGrid[1][1][7]).toBeUndefined();
    expect(game.entityGrid[1][2][7]).toBeUndefined();
    expect(game.pathingGrid[1][2]).toBe(0);
    expect(game.renderingGrid[4][5][7]).toBe(mob);
});

test('a known remote player keeps its loaded object while position and identity refresh', () => {
    const {game, actor, modules, callbacks, Types} = setup();
    const remote = actor(7, modules.player);
    remote.networkArmor = Types.Entities.CLOTHARMOR;
    remote.networkWeapon = Types.Entities.SWORD1;
    game.addEntity(remote);
    const state = {id: 7, kind: remote.kind, x: 4, y: 4, name: 'Renamed', title: 'New title', level: 30,
        armor: remote.networkArmor, weapon: remote.networkWeapon};
    expect(callbacks.EntityState(state)).toBe(true);
    expect(game.entities[7]).toBe(remote);
    expect(remote.name).toBe('Renamed');
    expect(remote.title).toBe('New title');
    expect([remote.gridX, remote.gridY, remote.level]).toEqual([4, 4, 30]);
});

test('a snapshot never replaces or repositions the local avatar', () => {
    const {game, callbacks} = setup();
    const cancel = jest.spyOn(game.player, 'cancelPath');
    expect(callbacks.EntityState({id: 42, x: 6, y: 6})).toBe(true);
    expect([game.player.gridX, game.player.gridY]).toEqual([2, 2]);
    expect(cancel).not.toHaveBeenCalled();
});

test('appearance changes wait for assets and refresh the existing avatar without breaking target references', () => {
    const {game, actor, modules, callbacks, Types} = setup();
    const remote = actor(7, modules.player);
    remote.networkArmor = Types.Entities.CLOTHARMOR;
    remote.networkWeapon = Types.Entities.SWORD1;
    game.addEntity(remote);
    game.player.target = remote;
    expect(callbacks.EntityState({id: 7, kind: remote.kind, x: 4, y: 4,
        armor: remote.networkArmor, weapon: Types.Entities.SWORD2})).toBe(false);
    expect(game.entities[7]).toBe(remote);
    expect([remote.gridX, remote.gridY]).toEqual([1, 1]);
    const appearance = actor(7, modules.player);
    appearance.networkArmor = remote.networkArmor;
    appearance.networkWeapon = Types.Entities.SWORD2;
    appearance.weaponName = 'sword2';
    callbacks.SpawnCharacter(appearance, 4, 4, Types.Orientations.DOWN);
    expect(game.entities[7]).toBe(remote);
    expect(game.player.target).toBe(remote);
    expect(remote.weaponName).toBe('sword2');
    expect(remote.networkWeapon).toBe(Types.Entities.SWORD2);
    expect([remote.gridX, remote.gridY]).toEqual([4, 4]);
});

test.each([false, true])('combat restores when target loads after attacker (packet first=%s)', packetFirst => {
    const {game, actor, modules, callbacks, Types} = setup();
    const mob = actor(7), target = actor(8, modules.player, 3, 3);
    if (packetFirst) callbacks.EntityAttack(7, 8);
    callbacks.SpawnCharacter(mob, 1, 1, Types.Orientations.DOWN, 8);
    expect(mob.target).toBeNull();
    callbacks.SpawnCharacter(target, 3, 3, Types.Orientations.DOWN);
    expect(mob.target).toBe(target);
    expect(mob.isAttacking()).toBe(true);
    expect(game.pendingEntityTargets.size).toBe(0);
    expect(game.pendingEntityAttackers.size).toBe(0);
});

test('a newer MOVE cancels an unresolved attack before the target loads', () => {
    const {game, actor, modules, callbacks, Types} = setup();
    const mob = actor(7), target = actor(8, modules.player);
    game.addEntity(mob);
    callbacks.EntityAttack(7, 8);
    callbacks.EntityMove(7, 4, 4);
    callbacks.SpawnCharacter(target, 3, 3, Types.Orientations.DOWN);
    expect(mob.target).toBeNull();
    expect(game.pendingEntityTargets.size).toBe(0);
});

test('a newer snapshot target supersedes an unresolved attack', () => {
    const {game, actor, modules, callbacks, Types} = setup();
    const mob = actor(7), target = actor(8, modules.player);
    game.addEntity(mob);
    callbacks.EntityAttack(7, 8);
    callbacks.EntityState({id: 7, kind: mob.kind, x: 1, y: 1});
    callbacks.SpawnCharacter(target, 3, 3, Types.Orientations.DOWN);
    expect(mob.target).toBeNull();
    expect(game.pendingEntityTargets.size).toBe(0);
});

test('leaving interest clears pending links even if the entity has not loaded', () => {
    const {game, callbacks} = setup();
    callbacks.EntityAttack(7, 8);
    callbacks.EntityList([]);
    expect(game.pendingEntityTargets.size).toBe(0);
    expect(game.pendingEntityAttackers.size).toBe(0);
});

test('DESTROY invalidates pending links to a target that never finished loading', () => {
    const {game, actor, modules, callbacks, Types} = setup();
    const mob = actor(7);
    game.addEntity(mob);
    callbacks.EntityAttack(7, 8);
    callbacks.EntityDestroy(8);
    callbacks.SpawnCharacter(actor(8, modules.player), 3, 3, Types.Orientations.DOWN);
    expect(mob.target).toBeNull();
    expect(game.pendingEntityTargets.size).toBe(0);
});

test('an old death-animation callback cannot remove a new incarnation with the same ID', () => {
    const {game, actor} = setup();
    const old = actor(7), replacement = actor(7, undefined, 4, 4);
    game.addEntity(old);
    game.removeEntity(old);
    game.addEntity(replacement);
    game.removeEntity(old);
    expect(game.entities[7]).toBe(replacement);
    expect(game.renderingGrid[4][4][7]).toBe(replacement);
});

test('late rendering cleanup cannot remove a replacement at the same tile', () => {
    const {game, actor} = setup();
    const old = actor(7), replacement = actor(7);
    game.addEntity(old);
    game.removeEntity(old);
    game.addEntity(replacement);
    game.removeFromRenderingGrid(old, 1, 1);
    expect(game.renderingGrid[1][1][7]).toBe(replacement);
});

test('removal invalidates a pending path-worker response', async () => {
    const {game, actor} = setup();
    const mob = actor(7);
    game.addEntity(mob);
    let resolve;
    mob.onRequestPath(() => new Promise(done => {resolve = done;}));
    mob.moveTo_(4, 4);
    game.removeEntity(mob);
    resolve([[1, 1], [2, 1], [3, 1], [4, 4]]);
    await Promise.resolve();
    await Promise.resolve();
    expect(mob.path).toBeNull();
    expect(mob.isMoving()).toBe(false);
    expect(game.entities[7]).toBeUndefined();
});

test.each([false, true])('the delayed reciprocal attack respects a newer move (interrupted=%s)', interrupted => {
    jest.useFakeTimers();
    try {
        const {game, actor, modules, callbacks} = setup();
        const mob = actor(7), target = actor(8, modules.player, 2, 1);
        target.target = mob;
        game.addEntity(mob);
        game.addEntity(target);
        callbacks.EntityAttack(7, 8);
        expect(mob.target).toBeNull();
        if (interrupted) callbacks.EntityMove(7, 4, 4);
        jest.advanceTimersByTime(200);
        expect(mob.target).toBe(interrupted ? null : target);
    } finally {
        jest.useRealTimers();
    }
});

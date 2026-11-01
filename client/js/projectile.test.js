const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');

function setup(projectileType = 'medium') {
    const modules = {};
    const browser = {}; // Browser self is the window, not the game instance.
    const sandbox = {
        _, console, self: browser, setTimeout: jest.fn(),
        define(dependencies, factory) {
            modules.current = typeof dependencies === 'function' ? dependencies()
                : factory(...dependencies.map(name => modules[name] || function () {}));
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), sandbox);
    modules.mapmakerentities = require('../../shared/js/mapmakerentities.json');
    for (const name of ['../../shared/js/gametypes', 'entity', 'transition', 'projectile', 'updater']) {
        vm.runInContext(fs.readFileSync(require.resolve(`./${name}`), 'utf8'), sandbox);
        modules[name] = modules.current;
    }
    const weapon = require('../sprites/NFT_ee955c3f7980209b84143b0d67f6e6617d22d13cbc8965054305a2080296b273.json');
    const spriteId = weapon.projectiles[projectileType];
    const animation = () => ({setSpeed: jest.fn(), setCount: jest.fn()});
    const sprite = {name: spriteId, createAnimations: () => ({fly: animation(), impact: animation()})};
    const shooter = {id: 7, weaponName: weapon.id, gridX: 2, gridY: 2};
    const target = {id: 42, kind: sandbox.Types.Entities.RAT, gridX: 5, gridY: 2, hit: jest.fn()};
    const entities = {[shooter.id]: shooter, [target.id]: target};
    let spawn;
    const game = {
        player: shooter, entities, sprites: {[weapon.id]: weapon, [spriteId]: sprite}, currentTime: 0,
        getEntityById: id => entities[id],
        getEntityAt: (x, y) => x === target.gridX && y === target.gridY ? target : null,
        addEntity: entity => { entities[entity.id] = entity; },
        removeEntity: entity => { delete entities[entity.id]; },
        removeFromRenderingGrid: jest.fn(),
        map: {isColliding: () => false},
        client: {onSpawnProjectile: callback => { spawn = callback; }, sendHit: jest.fn()},
        combatFeedback: {hitFeel: {enabled: false}}, audioManager: {playSound: jest.fn()},
    };
    sandbox.game = game;
    sandbox.Projectile = modules.projectile;
    sandbox.Mob = function () {};
    const source = fs.readFileSync(require.resolve('./game'), 'utf8');
    const start = source.indexOf('function cleanProjectile(');
    const end = source.indexOf('self.client.onOutOfAmmo(', start);
    vm.runInContext(`(function (self) { ${source.slice(start, end)} })(game);`, sandbox);
    const fire = () => spawn(shooter.id, projectileType, target.id);
    return {game, shooter, target, fire, sprite, modules, browser};
}

test.each(['short', 'medium', 'long'])('spawns and hits with %s ammo without a global game', type => {
    const {game, shooter, target, fire, sprite, modules, browser} = setup(type);
    fire();
    const projectile = Object.values(game.entities).find(entity => entity instanceof modules.projectile);
    expect(projectile.sprite).toBe(sprite);
    expect(projectile.isLoaded).toBe(true);
    expect(projectile.currentAnimation).toBe(projectile.animations.fly);
    expect(shooter.currentProjectileType).toBe(type);
    const updater = Object.assign(Object.create(modules.updater.prototype), {game});
    updater.updateProjectile(projectile);
    projectile.movement.step(projectile.moveSpeed);
    expect(game.client.sendHit).toHaveBeenCalledTimes(1);
    expect(game.client.sendHit).toHaveBeenCalledWith(target);
    expect(target.hit).toHaveBeenCalledTimes(1);
    expect(browser.sprites).toBeUndefined();
});

test.each(['shooter', 'target'])('ignores a delayed spawn after the %s has despawned', missing => {
    const state = setup();
    delete state.game.entities[state[missing].id];
    expect(state.fire).not.toThrow();
    expect(state.game.client.sendHit).not.toHaveBeenCalled();
});

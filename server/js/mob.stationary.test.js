const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');
global.Types = {};
const Types = require('../../shared/js/gametypes');
const Properties = require('./properties');

function setup() {
    const sandbox = {exports: {}, Types, setTimeout, clearTimeout, clearInterval};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), sandbox);
    const cls = sandbox.exports;
    const Utils = {randomOrientation: () => Types.Orientations.DOWN, random: () => 0,
        distanceTo: require('./utils').distanceTo};
    const Formulas = {gaussianRangeRandom: () => 0};
    function load(file) {
        sandbox.module = {exports: {}};
        sandbox.require = name => ({'./lib/class': cls, underscore: _, './message': sandbox.Messages,
            './utils': Utils, './properties': Properties, './formulas': Formulas,
            './area': sandbox.Area, './mob': sandbox.Mob,
            '../../shared/js/gametypes': Types}[name] || {});
        const source = fs.readFileSync(require.resolve(file), 'utf8');
        vm.runInContext('(function(require, module) {\n' + source + '\n})(require, module);', sandbox);
        return sandbox.module.exports;
    }
    sandbox.Messages = load('./message');
    load('./entity');
    load('./character');
    const Mob = load('./mob');
    load('./area');
    const MobArea = load('./mobarea');
    const World = load('./worldserver');
    const world = Object.assign(Object.create(World.prototype), {
        isValidPosition: jest.fn(() => true), handleEntityGroupMembership: jest.fn(),
    });
    return {world, Mob, MobArea};
}

test('mob measures distance from its spawn without a global Utils', () => {
    const {Mob} = setup();
    const mob = new Mob(7, Types.Entities.RAT, 10, 12);
    mob.move(40, 40);
    expect(mob.distanceToSpawningPoint(10, 12)).toBe(0);
    expect(mob.distanceToSpawningPoint(13, 16)).toBe(4);
    expect(mob.distanceToSpawningPoint(-16, 12)).toBe(26);
});

test.each(['TENTACLE', 'TENTACLE2', 'SEACREATURE'])('%s keeps its spawn coordinates in every authoritative snapshot', kind => {
    const {world, Mob} = setup();
    const mob = new Mob(7, Types.Entities[kind], 10, 12);
    mob.setTarget({id: 42});
    const positions = [[11, 12], [30, 14], [60, 26]];
    const expectAnchored = () => {
        expect([mob.x, mob.y]).toEqual([10, 12]);
        expect(mob.spawn().serialize().slice(1, 5)).toEqual([7, mob.kind, 10, 12]);
        expect(mob.target).toBe(42);
    };
    for (const [x, y] of positions) {
        expect(world.findPositionNextTo(mob, {x, y})).toBe(false);
        world.moveEntity(mob, x, y);
        expectAnchored();
        mob.move(x, y);
        expectAnchored();
        mob.setPosition(x, y);
        expectAnchored();
    }
    mob.resetPosition();
    expectAnchored();
    expect(world.isValidPosition).not.toHaveBeenCalled();
});

test('ordinary mobs still choose chase positions and can move', () => {
    const {world, Mob} = setup();
    const mob = new Mob(7, Types.Entities.RAT, 10, 12);
    const target = {x: 14, y: 15};
    const position = world.findPositionNextTo(mob, target);
    expect(position).toEqual({x: 14, y: 14});
    world.moveEntity(mob, position.x, position.y);
    expect([mob.x, mob.y]).toEqual([14, 14]);
    expect(world.handleEntityGroupMembership).toHaveBeenCalledWith(mob);
    mob.move(15, 14);
    expect([mob.x, mob.y]).toEqual([15, 14]);
    mob.resetPosition();
    expect([mob.x, mob.y]).toEqual([10, 12]);
});

test.each(['TENTACLE', 'TENTACLE2', 'SEACREATURE', 'RAT'])('%s respects its movement rule when an area respawns it', kind => {
    jest.useFakeTimers();
    try {
        const {Mob, MobArea} = setup();
        const mob = new Mob(7, Types.Entities[kind], 10, 12);
        const area = Object.assign(Object.create(MobArea.prototype), {
            world: {addMob: jest.fn()}, removeFromArea: jest.fn(), addToArea: jest.fn(),
            _getRandomPositionInsideArea: () => ({x: 60, y: 26}),
        });
        mob.isDead = true;
        area.respawnMob(mob, 100);
        jest.advanceTimersByTime(100);
        expect([mob.x, mob.y]).toEqual(kind === 'RAT' ? [60, 26] : [10, 12]);
        expect(mob.isDead).toBe(false);
        expect(area.world.addMob).toHaveBeenCalledWith(mob);
    } finally {
        jest.useRealTimers();
    }
});

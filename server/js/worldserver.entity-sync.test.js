const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');

function setup() {
    class Player {}
    class Mob {}
    class Npc {}
    class Item {}
    class Chest extends Item {}
    const cls = {Class: {extend: methods => methods}};
    const Types = {Messages: {SPAWN: 2, MOVE: 4, DESTROY: 22}};
    const Messages = {};
    for (const [name, type] of Object.entries({Spawn: 2, Move: 4, Destroy: 22})) {
        Messages[name] = function (entity) { this.serialize = () => [type, entity.id, entity.x, entity.y]; };
    }
    function load(name, requireFn) {
        const module = {exports: {}};
        vm.runInNewContext(fs.readFileSync(require.resolve(name), 'utf8'), {module, require: requireFn});
        return module.exports;
    }
    const World = load('./worldserver', name => {
        if (name === './lib/class') return cls;
        if (name === 'underscore') return _;
        if (name === './message') return Messages;
        return {'./player': Player, './mob': Mob, './npc': Npc, './item': Item, './chest': Chest}[name] || {};
    });
    const MapClass = load('./map', name => name === 'underscore' ? _ : {});
    const map = Object.assign(Object.create(MapClass.prototype), {
        zoneWidth: 28, zoneHeight: 12, groupWidth: 6, groupHeight: 4,
        connectedGroups: {}, getAdjacentGroupPositionsMap: {},
    });
    const world = Object.assign(Object.create(World), {
        map, groups: {}, outgoingQueues: {}, entities: {}, players: {},
    });
    world.initZoneGroups();
    function add(Type, id, x, y) {
        const entity = Object.assign(new Type(), {id, x, y, group: null, recentlyLeftGroups: []});
        world.entities[id] = entity;
        if (entity instanceof Player) {
            world.players[id] = entity;
            world.outgoingQueues[id] = [];
        }
        world.addToGroup(entity, map.getGroupIdFromPosition(x, y));
        return entity;
    }
    return {world, add, Types, Player, Mob, Npc, Item};
}

test('crossing one boundary queues spawns for three new groups, not all nine', () => {
    const {world, add, Player, Mob} = setup();
    const observer = add(Player, 1, 30, 14), mob = add(Mob, 50, 30, 14);
    mob.x = 58;
    world.handleEntityGroupMembership(mob);
    expect(Object.values(world.groups).reduce((n, group) => n + group.incoming.length, 0)).toBe(3);
    world.processGroups();
    expect(world.outgoingQueues[observer.id]).toEqual([]);
});

test.each(['mob', 'npc'])('moving a %s out of interest sends a visibility exit', kind => {
    const {world, add, Types, Player, Mob, Npc} = setup();
    const observer = add(Player, 1, 30, 14), entity = add(kind === 'mob' ? Mob : Npc, 50, 58, 14);
    entity.x = 86;
    world.onMobMoveCallback(entity);
    world.processGroups();
    expect(world.groups[observer.group].entities[50]).toBeUndefined();
    expect(world.outgoingQueues[1].map(packet => packet[0])).toEqual([Types.Messages.MOVE, Types.Messages.DESTROY]);
});

test('several boundary crossings in a tick publish only the final visibility once', () => {
    const {world, add, Types, Player, Mob} = setup();
    add(Player, 1, 86, 14);
    add(Player, 2, 2, 14);
    const mob = add(Mob, 50, 30, 14);
    for (const x of [58, 30, 58]) {
        mob.x = x;
        world.handleEntityGroupMembership(mob);
    }
    world.processGroups();
    expect(world.outgoingQueues[1].filter(packet => packet[0] === Types.Messages.SPAWN)).toHaveLength(1);
    expect(world.outgoingQueues[2].filter(packet => packet[0] === Types.Messages.SPAWN)).toHaveLength(0);
});

test('an entity removed before the outgoing tick cannot spawn a ghost', () => {
    const {world, add, Player, Mob} = setup();
    add(Player, 1, 86, 14);
    const mob = add(Mob, 50, 30, 14);
    mob.x = 58;
    world.handleEntityGroupMembership(mob);
    world.removeFromGroups(mob);
    delete world.entities[mob.id];
    world.processGroups();
    expect(world.outgoingQueues[1]).toEqual([]);
});

test('WHO replies deduplicate IDs and include only entities still in the requester interest', () => {
    const {world, add, Player, Mob} = setup();
    const observer = add(Player, 1, 30, 14);
    add(Mob, 50, 30, 14);
    add(Mob, 51, 114, 14);
    world.pushSpawnsToPlayer(observer, [50, 50, 51]);
    expect(world.outgoingQueues[1].map(packet => packet[1])).toEqual([50]);
    observer.x = 114;
    world.handleEntityGroupMembership(observer);
    world.outgoingQueues[1] = [];
    world.pushSpawnsToPlayer(observer, [50, 51]);
    expect(world.outgoingQueues[1].map(packet => packet[1])).toEqual([51]);
});

test('teleporting a player removes it from old observers and spawns it for new observers', () => {
    const {world, add, Types, Player} = setup();
    add(Player, 1, 30, 14);
    add(Player, 2, 114, 14);
    const traveler = add(Player, 50, 30, 14);
    traveler.forEachAttacker = () => {};
    traveler.forEachHater = () => {};
    traveler.x = 114;
    world.handlePlayerVanish(traveler);
    world.processGroups();
    expect(world.outgoingQueues[1].map(packet => [packet[0], packet[1]])).toEqual([[Types.Messages.DESTROY, 50]]);
    expect(world.outgoingQueues[2].map(packet => [packet[0], packet[1]])).toEqual([[Types.Messages.SPAWN, 50]]);
});

test('vanishing inside the same group preserves the existing death/teleport delivery', () => {
    const {world, add, Player} = setup();
    add(Player, 1, 30, 14);
    const traveler = add(Player, 50, 30, 14);
    traveler.forEachAttacker = () => {};
    traveler.forEachHater = () => {};
    world.handlePlayerVanish(traveler);
    expect(world.outgoingQueues[1]).toEqual([]);
});

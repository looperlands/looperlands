const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');
global.Types = {};
const Types = require('../../shared/js/gametypes');
const Properties = require('./properties');

function setup() {
    const sandbox = {exports: {}, Types, setTimeout, clearTimeout, clearInterval,
        setInterval: () => 0, process: {env: {}}, console: {log() {}}, FormatChecker: function () {}};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), sandbox);
    const dependencies = {
        './lib/class': sandbox.exports, underscore: _, './properties': Properties,
        '../../shared/js/gametypes': Types,
        './utils': {randomOrientation: () => Types.Orientations.DOWN, random: () => 0},
        './formulas': {gaussianRangeRandom: () => 0}, './format': {check: () => true},
        './looperlandsplatformclient.js': {LooperLandsPlatformClient: function () {}},
        './quests/playereventbroker.js': {PlayerEventBroker: function () {}},
        './flows/worldeventbroker.js': {WorldEventBroker: function () {}},
        './localdooraccess': require('./localdooraccess'),
    };
    function load(file) {
        sandbox.module = {exports: {}};
        sandbox.require = name => dependencies[name] || {};
        vm.runInContext('(function(require, module) {\n' + fs.readFileSync(require.resolve(file), 'utf8') +
            '\n})(require, module);', sandbox);
        dependencies[file] = sandbox.module.exports;
        return sandbox.module.exports;
    }
    load('./message');
    load('./entity');
    load('./character');
    const Mob = load('./mob');
    const Player = load('./player');
    const World = load('./worldserver');
    // Keep the actual attack callback: it moves a mob beside its selected target.
    const world = new World('world_test', 10, {cache: {get: () => undefined}});
    Object.assign(world, {
        map: {getRequiredNFT: () => undefined, getDoorTrigger: () => undefined,
            isOutOfBounds: () => false, isColliding: () => false},
        handleEntityGroupMembership: jest.fn(() => false), pushToAdjacentGroups: jest.fn(),
        pushRelevantEntityListTo: jest.fn(),
    });
    function addPlayer(id, x = 10, y = 10) {
        const connection = {id, listen: jest.fn(), onClose: jest.fn(), sendUTF8: jest.fn()};
        const player = new Player(connection, world);
        Object.assign(player, {hasEnteredGame: true, resetTimeout: jest.fn(), broadcast: jest.fn()});
        player.setPosition(x, y);
        world.entities[id] = player;
        world.players[id] = player;
        return player;
    }
    function addMob(id = 7) {
        const mob = new Mob(id, Types.Entities.RAT, 10, 12);
        mob.onMove(world.onMobMoveCallback.bind(world));
        mob.onExitCombat(jest.fn());
        world.entities[id] = mob;
        return mob;
    }
    const teleport = (player, x = 80, y = 80) => player.handleMessage([Types.Messages.TELEPORT, x, y]);
    return {world, addPlayer, addMob, teleport};
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
});

test.each([[14, 15], [80, 80]])('same-map door travel to %s,%s leaves pursuing mobs behind', async (x, y) => {
    const {world, addPlayer, addMob, teleport} = setup();
    const player = addPlayer(1);
    const mobs = [addMob(7), addMob(8)];
    for (const mob of mobs) {
        world.handleMobHate(mob.id, player.id, 5);
        mob.receiveDamage(10, player.id);
    }
    const positions = mobs.map(mob => [mob.x, mob.y]);
    world.pushToAdjacentGroups.mockClear();

    await teleport(player, x, y);

    expect([player.x, player.y]).toEqual([x, y]);
    expect(mobs.map(mob => [mob.x, mob.y])).toEqual(positions);
    expect(world.pushToAdjacentGroups).not.toHaveBeenCalled();
    expect(player.attackers).toEqual({});
    expect(player.haters).toEqual({});
    for (const mob of mobs) {
        expect(mob.target).toBeNull();
        expect(mob.hatelist).toEqual([]);
        expect(mob.dmgTakenArray).toEqual([]);
        expect(mob.spawn().serialize().slice(3, 5)).toEqual(positions[mobs.indexOf(mob)]);
    }

    jest.advanceTimersByTime(1000);
    for (const mob of mobs) {
        expect([mob.x, mob.y]).toEqual([mob.spawningX, mob.spawningY]);
        expect(mob.target).toBeNull();
        expect(mob.exitCombat_callback).toHaveBeenCalledTimes(1);
    }
});

test('a mob retargets the remaining player without clearing the new attack link', async () => {
    const {world, addPlayer, addMob, teleport} = setup();
    const traveler = addPlayer(1);
    const remaining = addPlayer(2, 12, 10);
    const mob = addMob();
    world.handleMobHate(mob.id, traveler.id, 100);
    world.handleMobHate(mob.id, remaining.id, 50);
    mob.receiveDamage(1, traveler.id);
    mob.receiveDamage(2, remaining.id);
    world.pushToAdjacentGroups.mockClear();

    await teleport(traveler);

    expect(traveler.attackers).toEqual({});
    expect(traveler.haters).toEqual({});
    expect(mob.target).toBe(remaining.id);
    expect(remaining.attackers[mob.id]).toBe(mob);
    expect(remaining.haters[mob.id]).toBe(mob);
    expect(mob.hatelist).toEqual([{id: remaining.id, hate: 50}]);
    expect(mob.dmgTakenArray).toEqual([{id: remaining.id, dmg: 2}]);
    expect(mob.returnTimeout).toBeNull();
    expect([mob.x, mob.y]).toEqual([remaining.x, remaining.y - 1]);
    const attacks = world.pushToAdjacentGroups.mock.calls.map(([, packet]) => packet.serialize())
        .filter(packet => packet[0] === Types.Messages.ATTACK);
    expect(attacks).toEqual([[Types.Messages.ATTACK, mob.id, remaining.id]]);
});

test('door travel clears secondary hate without interrupting the player still being attacked', async () => {
    const {world, addPlayer, addMob, teleport} = setup();
    const traveler = addPlayer(1);
    const remaining = addPlayer(2, 12, 10);
    const mob = addMob();
    world.handleMobHate(mob.id, remaining.id, 100);
    world.handleMobHate(mob.id, traveler.id, 5);
    mob.receiveDamage(10, traveler.id);
    const position = [mob.x, mob.y];
    world.pushToAdjacentGroups.mockClear();

    await teleport(traveler);

    expect(traveler.haters).toEqual({});
    expect(mob.hates(traveler.id)).toBe(false);
    expect(mob.wasDamagedBy(traveler.id)).toBe(false);
    expect(mob.target).toBe(remaining.id);
    expect(remaining.attackers[mob.id]).toBe(mob);
    expect([mob.x, mob.y]).toEqual(position);
    expect(world.pushToAdjacentGroups).not.toHaveBeenCalled();
    expect(mob.returnTimeout).toBeNull();
});

const path = require('path');
jest.mock('./lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('./lib/class'), 'utf8'), {exports});
    return exports;
});
global.Types = {};
const Types = require('../../shared/js/gametypes');
const ServerMap = require('./map');
const {NpcBehavior, validateConfig} = require('./npcbehavior');
const {NpcMemory} = require('./npcmemory');
const {phaseAt} = require('./npcschedule');
const WorldTime = require('../../client/js/worldtime-worker');
const picnic = require('../npc-behaviors/lantern-picnic');
const LanternPicnicScene = require('../npc-behaviors/lantern-picnic-scene');
let mainMap;
beforeAll(async () => {
    mainMap = await new Promise(resolve => {
        const map = new ServerMap(path.join(__dirname, '../maps/world_server_main.json'));
        map.ready(() => resolve(map));
    });
    mainMap.generateCollisionGrid();
});

function setup(initialHour = 14, changeConfig = () => {}) {
    let time = 1000000, hour = initialHour;
    const config = structuredClone(picnic.behavior);
    changeConfig(config);
    const npcs = Object.fromEntries(config.npcs.map((definition, i) => [100 + i, {
        id: 100 + i, type: 'npc', kind: Types.getKindFromString(definition.kind), ...definition.origin, group: '1-17'
    }]));
    const player = {id: 1, type: 'player', nftId: 'one', sessionId: 'one', x: 58, y: 175,
        hasEnteredGame: true, isBot: () => false}; // Town routines run even while a player is in the Forest.
    const other = {...player, id: 2, nftId: 'two', sessionId: 'two'};
    const blocked = new Set();
    const map = Object.create(mainMap);
    map.doors = structuredClone(mainMap.doors);
    map.isColliding = (x, y) => blocked.has(x + ',' + y) || mainMap.isColliding(x, y);
    const saves = {one: {gameData: {quests: {}, choices: []}}, two: {gameData: {quests: {}, choices: []}}};
    const world = {id: 'world_main', map, npcs, entities: {...npcs, 1: player, 2: other}, players: {1: player, 2: other},
        server: {cache: {get: id => structuredClone(saves[id])}},
        pushToPlayer: jest.fn(), pushToAdjacentGroups: jest.fn(), pushToGroup: jest.fn(),
        moveNpc: jest.fn((npc, x, y, teleport) => {
            if (!teleport) expect(Math.abs(x - npc.x) + Math.abs(y - npc.y)).toBe(1);
            const oldGroup = npc.group;
            npc.x = x; npc.y = y; npc.group = map.getGroupIdFromPosition(x, y);
            npc.recentlyLeftGroups = oldGroup === npc.group ? [] : [oldGroup];
        })};
    const behavior = world.npcBehavior = new NpcBehavior(world, config, new NpcMemory(), () => time, () => hour / 24 * WorldTime.duration);
    const tick = (count = 1) => { for (let i = 0; i < count; i++) { time += 200; behavior.tick(); } };
    return {behavior, world, player, other, saves, blocked, tick,
        hour: value => {hour = value; tick();}, actor: key => behavior.routines.get(key)};
}
const chats = world => world.pushToPlayer.mock.calls.filter(([, message]) => message.serialize()[0] === Types.Messages.CHAT);

test('Tanashi matches his map spawn and walks a complete loop clear of entrances', () => {
    const {actor, world, tick, player} = setup();
    Object.assign(player, {x: 35, y: 237});
    const tanashi = actor('town-tanashi');
    const spawnIndex = Object.keys(mainMap.staticEntities).find(index => mainMap.staticEntities[index] === 'tanashi');
    const spawn = mainMap.tileIndexToGridPosition(Number(spawnIndex));
    expect(tanashi.definition.origin).toEqual({x: spawn.x + 1, y: spawn.y});
    expect(tanashi.definition.questIds).toBeUndefined();
    tick(1000);
    const moves = world.moveNpc.mock.calls.filter(([npc]) => npc === tanashi.npc);
    expect(moves.length).toBeGreaterThan(0);
    for (const waypoint of tanashi.definition.route) {
        expect(moves.filter(([, x, y]) => x === waypoint.x && y === waypoint.y).length).toBeGreaterThan(1);
    }
    for (const [, x, y, teleport] of moves) {
        expect(teleport).toBeFalsy();
        expect(mainMap.isColliding(x, y)).toBe(false);
        expect(mainMap.doors.some(door => Math.abs(door.x - x) + Math.abs(door.y - y) <= 1)).toBe(false);
    }
});

test.each([[0, 'sleep'], [5.99, 'sleep'], [6, 'home'], [8, 'work'], [15.99, 'work'], [16, 'free-time'], [18, 'home'], [20, 'sleep'], [24, 'sleep'], [-1, 'sleep']])(
    'Adam follows clock boundaries including midnight at %s', (hour, activity) => {
        expect(phaseAt(picnic.behavior.npcs[0].schedule, hour / 24 * WorldTime.duration).key).toBe(activity);
    });

test('schedules read server uptime, forced day/night and custom local time through the shared clock', () => {
    const {behavior, actor, tick} = setup(14);
    tick(); expect(actor('town-gardener').schedule.phase.key).toBe('work');
    behavior.config.ambience.previewTimeMode = 'night'; tick();
    expect(actor('town-gardener').schedule.phase.key).toBe('sleep');
    behavior.config.ambience.previewTimeMode = 'day'; tick();
    expect(actor('town-gardener').schedule.phase.key).toBe('work');
    behavior.config.ambience.previewHour = 16.5; tick();
    expect(actor('town-gardener').schedule.phase.key).toBe('free-time');
    expect(WorldTime.mainDaylight(behavior.worldTime())).toBeCloseTo(WorldTime.mainDaylight(16.5 / 24 * WorldTime.duration));
});

test('night routes walk through public doors, stay on main and share one position for both players', () => {
    const {world, actor, tick, behavior} = setup(22);
    tick(1000);
    const adam = actor('town-gardener'), bstrat = actor('town-neighbour'), watch = actor('town-watch');
    expect(adam.schedule.room).toBe('guesthouse'); expect(bstrat.schedule.room).toBe('guesthouse');
    expect(adam.schedule.sleeping()).toBe(true); expect(watch.schedule.phase.key).toBe('work');
    expect({x: adam.npc.x, y: adam.npc.y}).toEqual({x: 151, y: 137});
    expect({x: bstrat.npc.x, y: bstrat.npc.y}).toEqual({x: 157, y: 137});
    const crossings = world.moveNpc.mock.calls.filter(([, , , teleport]) => teleport);
    expect(crossings).toHaveLength(2);
    expect(crossings.every(([, x, y]) => x === 154 && y === 143)).toBe(true);
    expect(world.pushToGroup.mock.calls.some(([, message]) => message.serialize()[0] === Types.Messages.DESTROY)).toBe(true);
    expect(chats(world)).toHaveLength(0);
    expect(behavior.routines.size).toBe(4);
});

test('morning sends neighbours back outside and the watch inside, then free time gathers all three', () => {
    const {actor, tick, hour, world} = setup(22);
    tick(1000); hour(8); tick(1000);
    expect(actor('town-gardener').schedule.room).toBe('outside');
    expect(actor('town-neighbour').schedule.phase.key).toBe('home');
    expect(actor('town-watch').schedule.room).toBe('town-hall');
    expect(actor('town-watch').schedule.sleeping()).toBe(true);
    hour(14); tick(1000);
    expect([...world.npcBehavior.routines.values()].filter(a => a.schedule).every(a => a.schedule.room === 'outside' && a.schedule.phase.key === 'work')).toBe(true);
    hour(16.5); tick(1000);
    expect([...world.npcBehavior.routines.values()].filter(a => a.schedule).every(a => a.schedule.phase.key === 'free-time')).toBe(true);
    expect(actor('town-watch').npc).toMatchObject({x: 42, y: 218});
});

test('a blocked door or occupied landing delays entry rather than disappearing or crossing a wall', () => {
    const {actor, world, blocked, tick} = setup(22);
    blocked.add('51,205'); tick(500);
    const adam = actor('town-gardener');
    expect(adam.schedule.room).toBe('outside');
    expect(world.moveNpc.mock.calls.filter(([npc, , , teleport]) => npc === adam.npc && teleport)).toHaveLength(0);
    blocked.clear();
    world.entities[500] = {id: 500, type: 'player', x: 154, y: 143}; tick(500);
    expect(adam.schedule.room).toBe('outside');
    delete world.entities[500]; tick(500);
    expect(adam.schedule.room).toBe('guesthouse');
});

test('empty worlds stop moving and a returning player resumes the current shared period', () => {
    const {world, actor, tick, hour, player} = setup(22);
    world.players = {}; tick(1000);
    expect(world.moveNpc).not.toHaveBeenCalled();
    hour(14); world.players[1] = player; tick(500);
    expect(actor('town-gardener').schedule.phase.key).toBe('work');
    expect(actor('town-gardener').schedule.room).toBe('outside');
    expect(world.moveNpc).toHaveBeenCalled();
});

test('sleeping NPCs stay quiet but answer routine and quest conversations without changing private saves', () => {
    const {actor, world, player, other, saves, tick, hour, behavior} = setup(22);
    tick(1000);
    const adam = actor('town-gardener'); player.x = adam.npc.x; player.y = adam.npc.y + 1;
    saves.one.gameData = {quests: {COMPLETED: [{questKey: picnic.BASKET}]}, choices: [picnic.SHARE]};
    const before = structuredClone(saves); tick(100);
    expect(chats(world)).toHaveLength(0);
    expect(behavior.interact(player, adam.npc.kind, adam.npc.id)).toBeTruthy();
    const reply = behavior.decorateDialogue(adam.npc, {npcContext: true});
    expect(reply.text).toContain('You woke me'); expect(reply.text).not.toMatch(/\d{2}:00/); expect(reply.text).toContain('dreaming');
    expect(reply.text).not.toMatch(/\b\d+\s*,\s*\d+\b/);
    expect(behavior.decorateDialogue(adam.npc, {npcContext: true}).text).toBe(reply.text);
    expect(behavior.decorateDialogue(adam.npc, {text: 'A quest reply'})).toEqual({text: 'A quest reply'});
    expect(behavior.decorateDialogue({behaviorState: {key: 'missing'}}, {text: 'Hello'})).toEqual({text: 'Hello'});
    expect(saves).toEqual(before); expect(saves.two.gameData.choices).not.toContain(picnic.SHARE);
    player.x = other.x; player.y = other.y;
    const adamMoves = () => world.moveNpc.mock.calls.filter(([npc]) => npc === adam.npc).length;
    const moves = adamMoves(); hour(14); tick(80);
    expect(adamMoves()).toBe(moves);
    tick(500); expect(adam.schedule.room).toBe('outside');
});

test('a picnic invites sleeping neighbours out through their doors and schedules resume after it', () => {
    const {world, behavior, actor, player, saves, tick} = setup(22);
    tick(1000);
    saves.one.gameData = {quests: {COMPLETED: [{questKey: picnic.INVITE}]}, choices: [picnic.QUIET]};
    player.x = 41; player.y = 216;
    const scene = new LanternPicnicScene(world, () => behavior.now());
    scene.tick(); expect(scene.state.phase).toBe('gathering');
    expect(actor('town-gardener').scheduleOverride.activity).toBe('picnic');
    for (let i = 0; i < 1600 && scene.state.phase !== 'finished'; i++) { tick(); scene.tick(); }
    expect(scene.state.phase).toBe('finished');
    expect(behavior.memory.has('main', 'lantern-picnic', player, 'celebrated')).toBe(true);
    expect(actor('town-gardener').scheduleOverride).toBeNull();
    tick(1000); expect(actor('town-gardener').schedule.sleeping()).toBe(true);
});

test.each([
    schedule => {schedule.phases[0].at = 1;},
    schedule => {schedule.phases[1].at = 0;},
    schedule => {schedule.phases[1].at = 24;},
    schedule => {schedule.phases[0].location = 'missing';},
    schedule => {schedule.phases[0].key = 'unknown';},
    schedule => {schedule.phases[0].explanation = '<script>';},
    schedule => {schedule.phases[0].route[0].x = 1;},
    schedule => {schedule.phases[0].route[0].waitSeconds = 0;},
    schedule => {schedule.buildings.push(schedule.buildings[0]);},
    schedule => {schedule.buildings[0].area.width = 0;},
    schedule => {schedule.buildings[0].entrance.x = 500;},
    schedule => {schedule.buildings[0].exit.x = 1;}
])('malformed schedule content is rejected', change => {
    const config = structuredClone(picnic.behavior); change(config.npcs[0].schedule);
    expect(() => validateConfig(config)).toThrow(/NPC/);
});

test.each(['tmap', 'tnft', 'ttid', 'tcollection', 'thttp_redirect'])('restricted %s doors cannot be used by a shared NPC', property => {
    const {behavior, world} = setup();
    const definition = structuredClone(picnic.behavior.npcs[0]);
    definition.key = 'restricted';
    const door = world.map.doors.find(d => d.x === 51 && d.y === 205); door[property] = 'private';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(behavior.registerRoutine(definition)).toBe(false); expect(warn).toHaveBeenCalledWith(expect.stringContaining('public return door'));
    warn.mockRestore();
});

test.each(['return', 'blocked'])('missing return and colliding scheduled waypoints are rejected: %s', reason => {
    const {behavior, world, blocked} = setup();
    const definition = structuredClone(picnic.behavior.npcs[0]); definition.key = 'invalid';
    if (reason === 'return') world.map.doors.find(d => d.x === 154 && d.y === 143).tx = 50;
    else blocked.add('151,137');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(behavior.registerRoutine(definition)).toBe(false); expect(warn).toHaveBeenCalled(); warn.mockRestore();
});

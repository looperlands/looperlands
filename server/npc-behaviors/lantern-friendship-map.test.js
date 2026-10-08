const path = require('path');
jest.mock('../js/lib/class', () => {
    const exports = {}; require('vm').runInNewContext(require('fs').readFileSync(require.resolve('../js/lib/class'), 'utf8'), {exports}); return exports;
});
global.Types = {};
const Types = require('../../shared/js/gametypes');
const ServerMap = require('../js/map');
const {NpcBehavior} = require('../js/npcbehavior');
const {NpcMemory} = require('../js/npcmemory');
const {behavior: config} = require('./lantern-friendship-behavior');
const {ComparisonScene} = require('./lantern-friendship-scenes');
const {ids: Q, choices: C} = require('./lantern-friendship');
const WorldTime = require('../../client/js/worldtime-worker');
let map;
beforeAll(async () => {map = await new Promise(resolve => {const m = new ServerMap(path.join(__dirname, '../maps/world_server_main.json')); m.ready(() => resolve(m));}); map.generateCollisionGrid();});
function setup() {
    let time = 1000000, hour = 7;
    const npcs = Object.fromEntries(Object.entries(map.staticEntities).filter(([, kind]) => Types.isNpc(Types.getKindFromString(kind))).map(([index, kind]) => {
        const p = map.tileIndexToGridPosition(Number(index)); return [index, {id: index, kind: Types.getKindFromString(kind), type: 'npc', x: p.x + 1, y: p.y, group: '0-0'}];
    }));
    const players = {one: {id: 1, nftId: 'one', sessionId: 'one', type: 'player', hasEnteredGame: true, isBot: () => false, x: 45, y: 215},
        two: {id: 2, nftId: 'two', sessionId: 'two', type: 'player', hasEnteredGame: true, isBot: () => false, x: 40, y: 215}};
    const data = {gameData: {quests: {IN_PROGRESS: [{id: Q.NAME}]}, choices: ['adam-account', 'stall-covered', 'compare-requested'].map(k => C[k])}};
    const world = {id: 'world_main', map, npcs, entities: {...npcs, player1: players.one, player2: players.two}, players, server: {cache: {get: () => data}},
        pushToPlayer: jest.fn(), pushToAdjacentGroups: jest.fn(), pushToGroup: jest.fn(),
        moveNpc: jest.fn((npc, x, y, door) => {
            if (!door) expect(Math.abs(npc.x - x) + Math.abs(npc.y - y)).toBe(1);
            else expect(Object.values(map.doors).some(d => d.x === npc.x && d.y === npc.y && d.tx === x && d.ty === y)).toBe(true);
            Object.assign(npc, {x, y, group: map.getGroupIdFromPosition(x, y)});
        })};
    const behavior = world.npcBehavior = new NpcBehavior(world, structuredClone(config), new NpcMemory(), () => time, () => hour / 24 * WorldTime.duration);
    const scene = new ComparisonScene(world, () => time);
    const tick = (count = 1, scenes = true) => {for (let i = 0; i < count; i++) {time += 200; behavior.tick(); if (scenes) scene.tick();}};
    return {world, behavior, scene, tick, clock: h => {hour = h;}, actor: key => behavior.routines.get(key)};
}
test('actual exported actors gather via public doors, avoid occupied seats, then resume the new clock phase', () => {
    const s = setup(); expect(s.behavior.routines.size).toBe(5);
    s.tick(800, false);
    expect(s.actor('town-gardener').schedule.room).toBe('guesthouse');
    expect(s.actor('town-watch').schedule.room).toBe('town-hall');
    s.tick(); expect(s.scene.state.phase).toBe('gathering');
    for (let n = 0; n < 900 && s.scene.state.phase === 'gathering'; n++) s.tick();
    expect(s.scene.state.phase).toBe('celebrating');
    expect(s.scene.actors.every(({actor, seat}) => actor.npc.x === seat.x && actor.npc.y === seat.y)).toBe(true);
    expect(s.scene.actors[0].seat).not.toEqual({x: 40, y: 215});
    s.clock(21);
    for (let n = 0; n < 900 && s.scene.state.phase !== 'finished'; n++) s.tick();
    expect(s.scene.state.phase).toBe('finished');
    expect(s.actor('town-gardener').schedule.phase.key).toBe('sleep');
    s.tick(800);
    expect(s.actor('town-gardener').schedule.room).toBe('guesthouse');
    expect(s.actor('town-neighbour').schedule.room).toBe('guesthouse');
    for (const {actor} of s.scene.actors) {expect(actor.sceneOwner).toBeUndefined(); expect(actor.scheduleOverride).toBeNull();}
});
test('Rowan stays in the local Forest envelope and Jimi binds to his one original placement', () => {
    const s = setup(), rowan = s.actor('friendship-rowan'), jimi = s.actor('friendship-jimi');
    expect(Object.values(map.staticEntities).filter(kind => kind === 'forestnpc')).toHaveLength(1);
    expect(rowan.npc).toMatchObject({x: 43, y: 185}); expect(jimi.npc).toMatchObject({x: 76, y: 293});
    expect(rowan.definition.schedule.buildings).toEqual([]);
    s.clock(12); s.tick(1200, false);
    const moves = s.world.moveNpc.mock.calls.filter(([npc]) => npc === rowan.npc);
    expect(moves.length).toBeGreaterThan(0);
    for (const [, x, y, door] of moves) {expect(map.getSceneAt(x, y).name).toBe('Forest'); expect(door).toBeFalsy();}
    expect(jimi.npc).toMatchObject({x: 76, y: 293});
});

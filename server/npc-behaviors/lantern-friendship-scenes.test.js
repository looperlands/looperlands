global.Types = {};
const {ComparisonScene, definition} = require('./lantern-friendship-scenes');
const {Cutscene} = require('../js/cutscene');
const {ids: Q, choices: C} = require('./lantern-friendship');
const {NpcSchedule} = require('../js/npcschedule');
const WorldTime = require('../../client/js/worldtime-worker');
function setup() {
    let time = 0, hour = 17;
    const players = Object.fromEntries(['one', 'two', 'bystander'].map(id => [id, {id, nftId: id, sessionId: id, hasEnteredGame: true, x: 42, y: 216}]));
    const cache = new Map(Object.values(players).map(p => [p.id, {gameData: {quests: p.id === 'bystander' ? {} : {IN_PROGRESS: [{id: Q.NAME}]}, choices: p.id === 'bystander' ? [] : ['adam-account', 'stall-covered', 'compare-requested'].map(k => C[k])}}]));
    const actors = definition.actors.map(({key}, index) => ({npc: {id: index + 10, x: 38, y: 210, behaviorState: {}}, definition: {key, route: [{x: 38, y: 210, waitSeconds: 30}], area: {x: 10, y: 193, width: 69, height: 45}, schedule: {buildings: [], phases: [{at: 0, key: 'work', location: 'outside', label: 'market', activity: 'working', route: [{x: 38, y: 210}]}, {at: 18, key: 'sleep', location: 'outside', label: 'home', activity: 'sleeping', route: [{x: 39, y: 211}]}]}}, listeners: new Map(), speechUntil: 0}));
    const memory = new Set();
    const world = {id: 'world_main', players, entities: Object.fromEntries(actors.map(a => [a.npc.id, a.npc])), server: {cache}, map: {doors: []}};
    Object.values(players).forEach(p => {p.server = world;});
    const behavior = {world, routines: new Map(actors.map(a => [a.definition.key, a])), worldTime: () => hour / 24 * WorldTime.duration,
        walkable: () => true, occupied: () => false, canReach: () => true,
        state: (a, state) => Object.assign(a.npc.behaviorState, state), face: jest.fn(), speak: jest.fn(() => true), nearbyPlayers: () => Object.values(world.players),
        memory: {has: (map, scene, player) => memory.has(player.nftId), remember: (map, scene, player) => memory.add(player.nftId)}};
    world.npcBehavior = behavior;
    actors.forEach(a => {a.schedule = new NpcSchedule(behavior, a); a.schedule.prepare(time);});
    const scene = new ComparisonScene(world, () => time);
    const routes = actors.map(a => a.definition.route);
    return {scene, world, actors, behavior, memory, players, cache, routes,
        tick: t => {time = t; scene.tick();}, clock: h => {hour = h;},
        arrive: () => scene.actors.forEach(({actor, seat}) => Object.assign(actor.npc, seat))};
}
function restored(s) {
    s.actors.forEach((a, i) => {
        expect(a.sceneOwner).toBeUndefined(); expect(a.scheduleOverride).toBeNull(); expect(a.definition.route).toBe(s.routes[i]);
        expect(a.path).toEqual([]); expect(a.schedule.override).toBeNull(); expect(a.waypoint).toBe(0);
    });
    expect(s.scene.state.phase).toBe('finished');
}
test('comparison lasts 54 seconds, records independent attendance only, restores the current clock phase', () => {
    const s = setup(), data = JSON.stringify([...s.cache.values()]); s.tick(0); s.arrive(); s.tick(1); s.clock(19);
    for (let t = 2001; t <= 54001; t += 2000) s.tick(t);
    restored(s); expect(s.memory).toEqual(new Set(['one', 'two'])); expect(JSON.stringify([...s.cache.values()])).toBe(data);
    expect(s.behavior.speak).toHaveBeenCalledTimes(8); expect(s.scene.cooldownUntil).toBe(114001);
    s.actors.forEach(a => {expect(a.schedule.phase.key).toBe('sleep'); expect(a.schedule.destination()).toEqual({x: 39, y: 211});});
});
test.each(['disconnect', 'death', 'map', 'empty', 'missing', 'exception', 'away', 'gathering-timeout', 'reader-timeout'])('every interrupted exit restores all actors: %s', reason => {
    const s = setup(); s.tick(0);
    if (reason !== 'gathering-timeout') {s.arrive(); s.tick(1);}
    switch (reason) {
        case 'disconnect': delete s.world.players.one; break;
        case 'death': s.players.one.isDead = true; break;
        case 'map': s.players.one.server = {}; break;
        case 'empty': s.world.players = {}; break;
        case 'missing': delete s.world.entities[s.actors[1].npc.id]; break;
        case 'exception': s.behavior.speak.mockImplementation(() => {throw new Error('script failed');}); break;
        case 'away': s.players.one.x = 90; s.tick(6001); break;
        case 'reader-timeout': s.actors.forEach(a => a.listeners.set('one', Infinity)); break;
    }
    s.tick(['reader-timeout', 'gathering-timeout'].includes(reason) ? 180002 : 16002);
    restored(s); expect(s.memory.size).toBe(0); expect(s.scene.cooldownUntil).toBe((['reader-timeout', 'gathering-timeout'].includes(reason) ? 180002 : 16002) + 30000);
});
test('forget cancels owner but only removes an attendee for other disconnects', () => {
    const s = setup(); s.tick(0); s.arrive(); s.tick(1); s.scene.forget(s.players.two); expect(s.scene.state.phase).toBe('celebrating');
    s.scene.forget(s.players.one); restored(s);
});
test('departed and dead attendees are pruned before success', () => {
    const s = setup(); s.tick(0); s.arrive(); s.tick(1); s.players.two.isDead = true;
    for (let t = 2001; t <= 54001; t += 2000) s.tick(t);
    expect(s.memory).toEqual(new Set(['one']));
});
test('picnic reservations prevent partial borrowing and both scenes release their locks', () => {
    const s = setup(), picnic = new Cutscene(s.world, require('./lantern-picnic-cutscene'), () => 0);
    picnic.start(s.players.one); s.tick(0); expect(s.scene.state).toBeNull();
    picnic.forget(s.players.one); s.tick(1); expect(s.scene.state.phase).toBe('gathering');
    picnic.start(s.players.one); expect(s.actors.every(a => a.sceneOwner === s.scene)).toBe(true);
    s.scene.forget(s.players.one); restored(s);
});
test('completed Q5 skips unstarted playback, but an active shared performance finishes normally', () => {
    const s = setup(); s.cache.get('one').gameData.quests = {COMPLETED: [{id: Q.NAME}]}; s.cache.get('two').gameData.quests = {};
    s.tick(0); expect(s.scene.state).toBeNull();
    s.cache.get('one').gameData.quests = {IN_PROGRESS: [{id: Q.NAME}]}; s.tick(1); s.arrive(); s.tick(2);
    s.cache.get('one').gameData.quests = {COMPLETED: [{id: Q.NAME}]};
    for (let t = 2002; t <= 54002; t += 2000) s.tick(t);
    restored(s); expect(s.memory.has('one')).toBe(true);
});
test('occupied seats use reachable audible fallback, without teleports', () => {
    const s = setup(); s.behavior.occupied = point => point.x === 40 && point.y === 210;
    s.tick(0); expect(s.scene.actors[2].seat).not.toEqual({x: 40, y: 210});
    expect(s.actors[2].npc).toMatchObject({x: 38, y: 210});
    s.scene.actors.forEach(({seat}) => expect(Math.abs(seat.x - 42) + Math.abs(seat.y - 216)).toBeLessThanOrEqual(9));
});
test('failed retry waits thirty seconds; fresh startup has ordinary routines', () => {
    const s = setup(); s.tick(0); s.scene.forget(s.players.one); s.tick(29999); expect(s.scene.state.phase).toBe('finished');
    s.tick(30000); expect(s.scene.state.phase).toBe('gathering');
    const restart = setup(); expect(restart.actors.every(a => !a.sceneOwner && !a.scheduleOverride)).toBe(true);
});

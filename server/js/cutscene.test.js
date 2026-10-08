const {Cutscene, validateDefinition} = require('./cutscene');
function setup(overrides = {}) {
    let time = 0; const saved = new Set();
    const actor = {npc: {id: 100, x: 1, y: 1, behaviorState: {}}, definition: {route: [{x: 1, y: 1}]}, waypoint: 0, speechUntil: 0, listeners: new Map()};
    const player = {id: 1, nftId: 'one', sessionId: 'one', x: 5, y: 5, hasEnteredGame: true};
    const other = {...player, id: 2, nftId: 'two', sessionId: 'two'};
    const behavior = {routines: new Map([['host', actor]]), memory: {has: (map, id, p, fact) => saved.has(map + id + p.nftId + fact), remember: (map, id, p, fact) => saved.add(map + id + p.nftId + fact)},
        walkable: () => true, occupied: () => false, canReach: () => true, state: (a, state) => Object.assign(a.npc.behaviorState, state), face: jest.fn(), speak: jest.fn(() => true), nearbyPlayers: () => [player, other]};
    const world = {id: 'world_one', npcBehavior: behavior, entities: {100: actor.npc}, players: {1: player, 2: other}, server: {cache: {get: id => ({gameData: {eligible: id === 'one'}})}}};
    const definition = {id: 'meeting', memoryKey: 'seen', center: {x: 5, y: 5}, triggerRadius: 3, audienceRadius: 4,
        arrivalTimeoutMs: 100, durationMs: 20, cooldownMs: 50, speechGapMs: 5, actors: [{key: 'host', destination: {x: 5, y: 5}}],
        eligible: (p, data) => data.eligible, activity: {key: 'meeting', location: 'square', gathering: 'joining', playing: 'watching', finished: 'working'},
        messages: {gathering: 'Gathering', playing: 'Playing', finished: 'Finished'}, steps: [{type: 'speech', npc: 'host', text: 'Hello'}], ...overrides};
    const scene = new Cutscene(world, definition, () => time);
    return {scene, world, definition, actor, player, other, behavior, saved, tick: value => {time = value; scene.tick();}, arrive: () => {actor.npc.x = 5; actor.npc.y = 5;}};
}
test('registered speech, wait and scripted animation cues play in order and restore actors', () => {
    const onCue = jest.fn(); const s = setup({onCue, steps: [{type: 'wait', durationMs: 5}, {type: 'cue', name: 'wave'}, {type: 'speech', npc: 'host', text: 'Welcome'}]});
    const route = s.actor.definition.route; s.tick(0); expect(s.scene.state.phase).toBe('gathering');
    expect(s.actor.sceneOwner).toBe(s.scene); expect(s.scene.start(s.player)).toBe(false);
    s.arrive(); s.tick(1); s.tick(5); expect(onCue).not.toHaveBeenCalled(); s.tick(6); s.tick(7);
    expect(onCue).toHaveBeenCalledTimes(1); expect(s.behavior.speak).toHaveBeenCalledWith(s.actor, 'Welcome', null, true);
    s.tick(22); expect(s.scene.state.phase).toBe('finished'); expect(s.actor.definition.route).toBe(route); expect(s.actor.sceneOwner).toBeUndefined();
    expect(s.saved).toEqual(new Set(['onemeetingoneseen'])); s.tick(100); expect(s.scene.state.phase).toBe('finished');
});
test('reading delays speech; completing another player quest is never implied', () => {
    const s = setup(); s.tick(0); s.arrive(); s.actor.listeners.set(1, 99); s.tick(1); expect(s.behavior.speak).not.toHaveBeenCalled();
    s.actor.listeners.clear(); s.tick(2); expect(s.behavior.speak).toHaveBeenCalledTimes(1); s.tick(22);
    expect(s.saved.size).toBe(1); expect(s.scene.completed(s.other)).toBe(false);
});
test('blocked arrivals abort without memory and release the scene lock; another scene cannot borrow actors', () => {
    const s = setup(); s.tick(0); const second = new Cutscene(s.world, {...s.definition, id: 'second'}, () => 0);
    second.start(s.player); expect(second.state).toBeNull(); s.tick(101); expect(s.scene.state.phase).toBe('finished'); expect(s.saved.size).toBe(0); expect(s.actor.sceneOwner).toBeUndefined();
});
test('owner disconnect cancels playback and cleanup also runs on script failure', () => {
    const s = setup(); s.tick(0); s.scene.forget(s.player); expect(s.actor.sceneOwner).toBeUndefined(); expect(s.saved.size).toBe(0);
    const broken = setup({onCue: () => {throw new Error('cue failed');}, steps: [{type: 'cue', name: 'wave'}]});
    broken.tick(0); broken.arrive(); const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => broken.tick(1)).not.toThrow(); expect(log).toHaveBeenCalledWith('Could not run scene cue: cue failed');
    log.mockRestore(); expect(broken.actor.sceneOwner).toBeUndefined();
});
test.each([{id: ''}, {actors: []}, {durationMs: -1}, {steps: [{type: 'teleport'}]}, {steps: [{type: 'speech', npc: 'absent', text: 'Hi'}]}, {steps: [{type: 'wait', durationMs: -1}]}])('invalid configuration is rejected: %j', override => {
    const s = setup(); expect(() => validateDefinition({...s.definition, ...override})).toThrow('Invalid cutscene');
});


test('quest-completion triggers can be pure configuration', () => {
    const s = setup({trigger: {questCompleted: 'meeting-quest'}, eligible: undefined});
    s.world.server.cache.get = id => ({gameData: {quests: {FINISHED: id === 'one' ? [{id: 'meeting-quest'}] : []}}});
    expect(s.scene.completed(s.player)).toBe(true); expect(s.scene.completed(s.other)).toBe(false);
});

const {WorldDefinitions, WorldScenes} = require('./worlddefinitions');
test('two registered stories stay map scoped and register without engine edits', () => {
    const registry = new WorldDefinitions(), changed = jest.fn();
    const unsubscribe = registry.subscribe(changed);
    registry.register('one', {id: 'first', quests: [{id: 'q1'}], dialogues: [{npc: 1}], npcBehavior: {enabled: true, npcs: [{key: 'a'}], conversations: []}});
    registry.register('one', {id: 'second', quests: [{id: 'q2'}], dialogues: [{npc: 2}], npcBehavior: {npcs: [{key: 'b'}], conversations: [{steps: []}]}});
    registry.register('two', {id: 'first', quests: [{id: 'q3'}]});
    expect(registry.dialogues('one')).toEqual([{npc: 1}, {npc: 2}]); expect(registry.dialogues('unknown')).toEqual([]);
    expect(registry.behavior('one').npcs.map(npc => npc.key)).toEqual(['a', 'b']); expect(registry.behavior('two')).toBeNull();
    expect(registry.quests.map(q => q.id)).toEqual(['q1', 'q2', 'q3']); expect(changed).toHaveBeenCalledTimes(3);
    unsubscribe(); registry.register('two', {id: 'empty'}); expect(changed).toHaveBeenCalledTimes(3);
});
test('duplicate definitions and quest IDs are rejected before registry mutation', () => {
    const registry = new WorldDefinitions(); registry.register('one', {id: 'a', quests: [{id: 'q1'}]});
    expect(() => registry.register('', {id: 'x'})).toThrow(); expect(() => registry.register('one', {})).toThrow();
    expect(() => registry.register('one', {id: 'a'})).toThrow('Duplicate');
    expect(() => registry.register('two', {id: 'a', quests: [{id: 'q1'}]})).toThrow('duplicate quest');
    expect(() => registry.register('two', {id: 'a', quests: [{}]})).toThrow(); expect(registry.quests).toHaveLength(1);
    registry.register('one', {id: 'b', npcBehavior: {npcs: [{key: 'same'}]}});
    registry.register('one', {id: 'c', npcBehavior: {npcs: [{key: 'same'}]}});
    expect(() => registry.behavior('one')).toThrow('Duplicate NPC');
});
test('scene lifecycle and presentation are registered and merged without quest hooks', () => {
    const registry = new WorldDefinitions(), tick = jest.fn(), forget = jest.fn();
    registry.register('one', {id: 'a', createScene: () => ({tick, forget, packet: player => ({rendererExtensions: [{id: 'a', data: player.id}], musicAreas: [{track: 'a'}], value: 1})})});
    registry.register('one', {id: 'b', createScene: () => ({packet: () => ({rendererExtensions: [{id: 'b'}], musicAreas: [{track: 'b'}]})})});
    registry.register('one', {id: 'inactive', createScene: () => null}); registry.register('one', {id: 'content-only'});
    const scenes = registry.create({id: 'world_one'}), player = {id: 7}; scenes.tick(); scenes.forget(player);
    expect(tick).toHaveBeenCalledTimes(1); expect(forget).toHaveBeenCalledWith(player); expect(scenes.get('a')).toBeTruthy(); expect(scenes.get('absent')).toBeUndefined();
    expect(scenes.packet(player)).toEqual({rendererExtensions: [{id: 'a', data: 7}, {id: 'b'}], musicAreas: [{track: 'a'}, {track: 'b'}], value: 1});
    expect(registry.create({id: 'unknown'}).packet(player)).toEqual({rendererExtensions: [], musicAreas: []});
    expect(new WorldScenes([{id: 'none', scene: {}}]).packet(player).rendererExtensions).toEqual([]);
});

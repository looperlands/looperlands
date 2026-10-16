const {mapResolver} = require('./questmaps');
const registry = {maps: new Map([
    ['family', [{quests: [{id: 'legacy', npc: 1}]}]],
    ['main', [{quests: [{id: 'story', npc: 2}]}]]
])};
test('quest families use actual giver locations, including NPC kinds shared by maps', () => {
    const resolve = mapResolver({main: {npcs: {a: {kind: 1}}}, cave: {npcs: {b: {kind: 1}}}, farm: {npcs: {c: {kind: 3}}}}, registry);
    expect(resolve({id: 'legacy', npc: 1})).toEqual(['cave', 'main']);
    expect(resolve({id: 'other', npc: 3})).toEqual(['farm']);
});
test('registered map scopes cover unspawned story givers and unknown quests remain unscoped', () => {
    const resolve = mapResolver({}, registry);
    expect(resolve({id: 'story', npc: 2})).toEqual(['main']);
    expect(resolve({id: 'unknown', npc: 99})).toEqual([]);
});

global.Types = {};
require('../../world-definitions/main').register(require('../worldextensions').registry);
const {buildQuestLog} = require('./questlog');
const content = require('../../npc-behaviors/lantern-road');
const picnic = require('../../npc-behaviors/lantern-picnic');
const registry = Object.fromEntries([...picnic.quests, ...content.quests].map(q => [q.id, q]));

test('the existing quest log recognises old finished picnic IDs and explains the active basket report', () => {
    const completed = buildQuestLog(registry, {quests: {FINISHED: picnic.quests.map(q => ({id: q.id}))}});
    expect(completed).toHaveLength(3);
    expect(completed.every(q => q.status === 'COMPLETED')).toBe(true);
    const active = buildQuestLog(registry, {quests: {IN_PROGRESS: [{questKey: picnic.BASKET}]}, choices: [picnic.FOUND, picnic.SHARE]});
    expect(active[0]).toMatchObject({progressCount: 1, amount: 1, status: 'IN_PROGRESS'});
    expect(active[0].longDesc).toContain('Return to Ordinary Adam');
});

test('the quest log shows only this character\'s caravan branch, discovered facts and remaining objectives', () => {
    const q = content.quests.find(q => q.id === 'LANTERN_ROAD_WE_TAKE');
    const data = {quests: {COMPLETED: q.requiredQuests.map(questKey => ({questKey})), IN_PROGRESS: [{questKey: q.id}]}, choices: ['lantern:caravan-detour', picnic.SHARE]};
    const before = buildQuestLog(registry, data).find(entry => entry.id === q.id);
    expect(before.amount).toBe(1);
    expect(before.progressCount).toBe(0);
    expect(before.longDesc).toContain('sheltered');
    expect(before.longDesc).not.toContain(q.objectives[1].label);
    expect(before.longDesc).toContain('Adam remembers');
    data.choices.push(content.objectiveFlag(q, q.objectives[0]));
    const after = buildQuestLog(registry, data).find(entry => entry.id === q.id);
    expect(after.progressCount).toBe(1);
    expect(after.desc).toContain('Report to Nessa');
    expect(buildQuestLog(registry, {}).length).toBe(0);
    expect(q.amount).toBe(1);
});

test('legacy loot and kill quests retain their bounded progress and display text', () => {
    const quests = {loot: {id: 'loot', eventType: 'LOOT_ITEM', target: 10, amount: 3, startText: 'Collect apples.'},
        kill: {id: 'kill', eventType: 'KILL_MOB', target: 2, amount: 5, startText: 'Clear rats.'}};
    const entries = buildQuestLog(quests, {quests: {IN_PROGRESS: [{questKey: 'loot'}, {questKey: 'kill'}]}, items: {10: 8}, mobKills: {2: 2}});
    expect(entries.map(q => q.progressCount)).toEqual([3, 2]);
    expect(entries.map(q => q.desc)).toEqual(['Collect apples.', 'Clear rats.']);
});

test('completed story entries keep a useful onward lead in the normal quest log', () => {
    const data = {quests: {COMPLETED: [...picnic.quests, content.quests[0]].map(q => ({questKey: q.id}))}};
    const entry = buildQuestLog(registry, data).find(entry => entry.id === 'LANTERN_WRECK_LETTERS');
    expect(entry.desc).toContain('Where this leads');
    expect(entry.longDesc).toContain('Windmill Scientist');
    expect(entry.longDesc).toContain('The Mill Without a Light');
});

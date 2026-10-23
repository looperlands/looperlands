global.Types = {};
const {WorldDefinitions} = require('./worlddefinitions');
const {applyChanges, validateOverrides, ownerMap, lockedObjective} = require('./localquestoverrides');
const catalog = {npcs: [{id: 40}], mobs: [{id: 2}, {id: 3}], items: [{id: 5}], areas: []};
let registry, original;
beforeEach(() => {
    registry = new WorldDefinitions();
    original = {id: 'A legacy ID with spaces', name: 'Old patrol', npc: 900, startText: ['<span class="dialogue-item">A rat</span>', 'Please help.'],
        inProgressText: ['{{remaining}} remain.', '<span class="dialogue-danger">Be careful</span>'], endText: ['Thank you.', 'A safe road.'],
        eventType: 'KILL_MOB', target: 99, amount: 100, needToReturn: true, level: 2, medal: 3,
        rental: 'preserved-rental', showIndicator: false, reward: {amount: 10}};
    registry.register('owner', {id: 'legacy', quests: [original, {...original, id: 'Next quest', requiredQuest: original.id}]});
});
const validate = overrides => validateOverrides(overrides, {mapId: 'owner', catalog, registry});

test('sparse changes preserve original IDs, unavailable givers and targets, arrays, markup and historical special fields', () => {
    const override = {id: original.id, changes: {name: 'A revised patrol'}};
    expect(() => validate([override])).not.toThrow();
    const effective = applyChanges(original, override.changes);
    expect(effective).toEqual({...original, name: 'A revised patrol'});
    expect(effective).not.toBe(original); expect(effective.reward).not.toBe(original.reward);
    expect(original.name).toBe('Old patrol'); expect(ownerMap(registry, original.id)).toBe('owner');
});

test('dialogue arrays can edit plain bubbles while retaining exactly untouched inherited HTML', () => {
    const changes = {startText: [original.startText[0], 'Please patrol the gate.'], inProgressText: '{{remaining}} rats remain.'};
    expect(() => validate([{id: original.id, changes}])).not.toThrow();
    expect(() => validate([{id: original.id, changes: {startText: ['<script>bad()</script>']}}])).toThrow('allows only balanced');
    expect(() => validate([{id: original.id, changes: {inProgressText: '{{process.exit()}}'}}])).toThrow('placeholders');
});

test('edited built-in dialogue accepts game styles while names remain plain and untouched inherited links stay intact', () => {
    expect(() => validate([{id: original.id, changes: {startText: ['Collect <span class="dialogue-item">apples</span>.'],
        inProgressText: '<span class="dialogue-danger dialogue-shake">{{remaining}}</span> remain.'}}])).not.toThrow();
    expect(() => validate([{id: original.id, changes: {name: '<span class="dialogue-item">Patrol</span>'}}])).toThrow('plain text');
    const linked = {...original, id: 'linked', startText: ['Visit <a href="https://example.com" target="_blank">the shop</a>.', 'Come back soon.']};
    registry.register('owner', {id: 'linked-story', quests: [linked]});
    expect(() => validate([{id: linked.id, changes: {name: 'A local linked quest'}}])).not.toThrow();
    expect(() => validate([{id: linked.id, changes: {startText: [linked.startText[0], 'Return <span class="dialogue-wave">tomorrow</span>.']}}])).not.toThrow();
    expect(() => validate([{id: linked.id, changes: {startText: ['Visit <a href="https://different.example">a different shop</a>.']}}])).toThrow('allows only balanced');
});

test('optional null removes inherited fields and dropping the override restores the untouched original', () => {
    const changes = {requiredQuest: null, requiredLevel: null, returnToNpc: null, inProgressText: null, reward: null};
    expect(() => validate([{id: original.id, changes}])).not.toThrow();
    const effective = applyChanges(original, changes);
    expect(effective.reward).toBeUndefined(); expect(effective.inProgressText).toBeUndefined();
    expect(original.reward).toEqual({amount: 10}); expect(applyChanges(original, {})).toEqual(original);
});

test('changed legacy objectives use supported events and valid catalog targets while original targets may stay unavailable', () => {
    expect(() => validate([{id: original.id, changes: {amount: 2}}])).not.toThrow();
    expect(() => validate([{id: original.id, changes: {target: 2, amount: 2}}])).not.toThrow();
    expect(() => validate([{id: original.id, changes: {eventType: 'LOOT_ITEM', target: 5, needToReturn: false}}])).not.toThrow();
    expect(() => validate([{id: original.id, changes: {eventType: 'LOOT_ITEM'}}])).toThrow('target');
    expect(() => validate([{id: original.id, changes: {eventType: 'AREA_ENTERED', target: 'Town'}}])).toThrow('support');
    expect(() => validate([{id: original.id, changes: {amount: 0}}])).toThrow('quantity');
    expect(() => validate([{id: original.id, changes: {eventType: 'NPC_TALKED', target: 40}}])).toThrow('one conversation');
    expect(() => validate([{id: original.id, changes: {eventType: 'NPC_TALKED', target: 40, amount: 1}}])).not.toThrow();
});

test('immutable fields, scripted objective changes, unknown IDs and editing outside the owner map are rejected', () => {
    for (const changes of [{id: 'Other'}, {npc: 40}, {rental: 'new'}, {medal: 4}, {dialogueOnly: false}, {localBuilder: true}]) {
        expect(() => validate([{id: original.id, changes}])).toThrow('cannot be changed');
    }
    expect(() => validateOverrides([{id: original.id, changes: {name: 'Other'}}], {mapId: 'other', catalog, registry})).toThrow('owner map');
    expect(() => validate([{id: 'Missing', changes: {name: 'Other'}}])).toThrow('does not exist');
    for (const scripted of [{...original, target: 'FLOW', eventType: 'NPC_TALKED'}, {...original, dialogueOnly: true}]) {
        const target = new WorldDefinitions(); target.register('owner', {id: 'script', quests: [scripted]});
        expect(lockedObjective(scripted)).toBe(true);
        expect(() => validateOverrides([{id: scripted.id, changes: {name: 'Edited story'}}], {mapId: 'owner', catalog, registry: target})).not.toThrow();
        expect(() => validateOverrides([{id: scripted.id, changes: {amount: 1}}], {mapId: 'owner', catalog, registry: target})).toThrow('locked');
    }
});

test('prerequisites retain existing IDs with spaces and reject cycles through legacy or custom definitions', () => {
    expect(() => validate([{id: original.id, changes: {requiredQuest: 'Next quest'}}])).toThrow('cycle');
    expect(() => validate([{id: 'Next quest', changes: {requiredQuest: original.id}}])).not.toThrow();
    const custom = {id: 'Custom', requiredQuest: original.id};
    expect(() => validateOverrides([{id: original.id, changes: {requiredQuest: custom.id}}], {mapId: 'owner', catalog, registry, quests: [custom]})).toThrow('cycle');
});

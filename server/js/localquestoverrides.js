// Built-in quests keep their IDs and legacy execution path. Local changes are
// sparse patches so untouched dialogue, scripted hooks and rewards survive.
const {counters, validateDialogue} = require('./localquestdialogue');
const editableFields = ['name', 'startText', 'inProgressText', 'endText', 'longText', 'questLogText', 'npcText', 'level',
    'requiredLevel', 'requiredQuest', 'returnToNpc', 'reward', 'eventType', 'target', 'amount', 'needToReturn'];
const removableFields = ['inProgressText', 'endText', 'longText', 'questLogText', 'npcText', 'requiredLevel', 'requiredQuest', 'returnToNpc', 'reward'];
const textFields = ['startText', 'inProgressText', 'endText', 'longText', 'questLogText', 'npcText'];
const objectiveFields = ['eventType', 'target', 'amount', 'needToReturn', 'returnToNpc'];
const clone = value => JSON.parse(JSON.stringify(value));
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const fail = message => {throw Object.assign(new Error(message), {status: 400});};
function ownerMap(registry, id) {
    for (const [map, definitions] of registry.maps) if (definitions.some(definition => (definition.quests || []).some(quest => quest.id === id))) return map;
}
const lockedObjective = quest => quest.target === 'FLOW' || quest.dialogueOnly === true;
function applyChanges(original, changes) {
    const effective = clone(original);
    for (const [field, value] of Object.entries(changes)) {
        if (!editableFields.includes(field)) continue;
        if (value === null) delete effective[field];
        else effective[field] = clone(value);
    }
    return effective;
}
function plainText(value, label, max) {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(label + ' must be plain text between 1 and ' + max + ' characters.');
    counters(value, label);
}
function dialogue(value, original, field) {
    if (Array.isArray(value)) {
        if (!['startText', 'inProgressText', 'endText'].includes(field) || !value.length || value.length > 20) fail('Dialogue must have between 1 and 20 text bubbles.');
        value.forEach((bubble, index) => {
            if (Array.isArray(original) && bubble === original[index]) return;
            validateDialogue(bubble, field + ' bubble');
        });
    } else validateDialogue(value, field);
}
function integer(value, label, max = 100000) {
    if (!Number.isInteger(value) || value < 1 || value > max) fail(label + ' must be a whole number between 1 and ' + max + '.');
}
function validateOverrides(overrides, {mapId, catalog, registry, quests = []}) {
    if (!Array.isArray(overrides) || overrides.length > 200) fail('A map may have at most 200 built-in quest overrides.');
    const ids = new Set(), originals = new Map(registry.quests.filter(quest => !quest.localBuilder).map(quest => [quest.id, quest]));
    const has = (type, id, label) => {if (!catalog[type].some(row => row.id === id)) fail('Choose ' + label + ' from this map\'s ' + type + ' list.');};
    for (const override of overrides) {
        if (!object(override) || Object.keys(override).some(field => !['id', 'changes'].includes(field)) || typeof override.id !== 'string' || !object(override.changes)) fail('Built-in overrides must contain an original quest ID and a changes object.');
        const original = originals.get(override.id);
        if (!original) fail('Built-in quest ' + override.id + ' does not exist. Restore or remove its override.');
        if (ownerMap(registry, override.id) !== mapId) fail('Edit built-in quest ' + override.id + ' in its owner map: ' + ownerMap(registry, override.id) + '.');
        if (ids.has(override.id)) fail('Each built-in quest may have only one override.');
        ids.add(override.id);
        if (Object.keys(override.changes).some(field => !editableFields.includes(field))) fail('Built-in quest IDs, givers and scripted settings cannot be changed.');
        const effective = applyChanges(original, override.changes);
        for (const [field, value] of Object.entries(override.changes)) {
            // Grandfather exact inherited values, including HTML/arrays and a
            // few malformed historical rewards. Only authored changes validate.
            if (equal(value, original[field])) continue;
            if (lockedObjective(original) && objectiveFields.includes(field)) fail('This quest uses scripted dialogue; its objective and return behavior are locked.');
            if (value === null) {
                if (!removableFields.includes(field)) fail(field + ' cannot be removed from a built-in quest.');
                continue;
            }
            if (field === 'name') plainText(value, 'Quest name', 120);
            if (textFields.includes(field)) dialogue(value, original[field], field);
            if (field === 'level' || field === 'requiredLevel') integer(value, field, 9999);
            if (field === 'amount') integer(value, 'Objective quantity');
            if (field === 'needToReturn' && typeof value !== 'boolean') fail('Return to giver must be true or false.');
            if (field === 'requiredQuest' && (typeof value !== 'string' || ![...originals.keys(), ...quests.map(quest => quest.id)].includes(value))) fail('Choose an existing prerequisite quest.');
            if (field === 'returnToNpc') has('npcs', value, 'a return NPC');
            if (field === 'reward') {
                if (!object(value) || Object.keys(value).some(key => !['item', 'amount'].includes(key))) fail('Rewards contain an item and amount.');
                has('items', value.item, 'a reward item'); integer(value.amount, 'Reward quantity');
            }
            if (field === 'eventType' && !['KILL_MOB', 'LOOT_ITEM', 'NPC_TALKED'].includes(value)) fail('Built-in quests support defeat, collect or talk objectives.');
        }
        if ((!equal(override.changes.target, undefined) && !equal(override.changes.target, original.target)) ||
            (override.changes.eventType !== undefined && override.changes.eventType !== original.eventType)) {
            const type = effective.eventType === 'KILL_MOB' ? 'mobs' : effective.eventType === 'LOOT_ITEM' ? 'items' : 'npcs';
            has(type, effective.target, 'a target');
        }
        const changedEvent = override.changes.eventType !== undefined && override.changes.eventType !== original.eventType;
        const changedAmount = override.changes.amount !== undefined && override.changes.amount !== original.amount;
        if (effective.eventType === 'NPC_TALKED' && (changedEvent || changedAmount) && (effective.amount ?? 1) !== 1) fail('A built-in talk objective completes after one conversation. Use quantity 1.');
        if (changedEvent && ['KILL_MOB', 'LOOT_ITEM'].includes(effective.eventType)) integer(effective.amount, 'Objective quantity');
    }
    validatePrerequisites(registry, [{quests, overrides}]);
    return overrides;
}
function validatePrerequisites(registry, entries) {
    const originals = new Map(registry.quests.filter(quest => !quest.localBuilder).map(quest => [quest.id, quest]));
    const effective = new Map(originals), starts = [];
    for (const entry of entries) {
        for (const quest of entry.quests) if (typeof quest.id === 'string') {effective.set(quest.id, quest); starts.push(quest.id);}
        for (const override of entry.overrides) if (originals.has(override.id)) {
            effective.set(override.id, applyChanges(originals.get(override.id), override.changes)); starts.push(override.id);
        }
    }
    for (const start of starts) {
        const chain = []; let next = start;
        while (effective.has(next)) {
            const repeated = chain.indexOf(next);
            if (repeated !== -1) {
                const questIds = chain.slice(repeated);
                throw Object.assign(new Error('Quest prerequisites must not form a cycle: ' + questIds.join(' → ') + '.'), {status: 400, questIds});
            }
            chain.push(next); next = effective.get(next).requiredQuest;
        }
    }
}
module.exports = {editableFields, ownerMap, lockedObjective, applyChanges, validateOverrides, validatePrerequisites};

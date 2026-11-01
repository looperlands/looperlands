const Dialogue = require('../../shared/js/dialogueformat');
const fail = message => {throw Object.assign(new Error(message), {status: 400});};

// Stable story IDs identify editable text. Runtime behavior and conditions stay
// authored in the story module; the editor never receives mutable tree paths.
function locations(quests, dialogues) {
    const entries = [];
    const add = (id, label, target, field, format = 'dialogue', maxLength = 2000) => {
        if (typeof target[field] === 'string') entries.push({id, label, target, field, format, maxLength});
    };
    for (const quest of quests) {
        add('quest:' + quest.id + ':name', quest.id + ' · Quest name', quest, 'name', 'plain', 120);
        for (const field of ['startText', 'inProgressText', 'endText']) {
            add('quest:' + quest.id + ':' + field, quest.id + ' · ' + field, quest, field, 'quest-dialogue');
        }
        for (const objective of quest.objectives || []) {
            add('objective:' + quest.id + ':' + objective.id, quest.id + ' · Objective ' + objective.id, objective, 'label', 'plain', 200);
        }
    }
    for (const dialogue of dialogues) for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
        const label = dialogue.key + ' · ' + nodeId;
        add('dialogue:' + dialogue.key + ':' + nodeId + ':text', label + ' · Dialogue', node, 'text');
        for (const [index, option] of (node.options || []).entries()) {
            add('choice:' + dialogue.key + ':' + nodeId + ':' + index, label + ' · Choice ' + (index + 1), option, 'text', 'dialogue', 200);
        }
        for (const [index, condition] of (node.conditions || []).entries()) {
            add('condition:' + dialogue.key + ':' + nodeId + ':' + index, label + ' · Conditional text ' + (index + 1), condition, 'text');
        }
    }
    if (new Set(entries.map(entry => entry.id)).size !== entries.length) fail('Halloween story text IDs must be unique.');
    return entries;
}

function getEntries(quests, dialogues) {
    return locations(quests, dialogues).map(({target, field, ...entry}) => ({...entry, value: target[field]}));
}

function validate(defaultTexts, overrides) {
    if (overrides === undefined) return;
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) fail('Story text overrides must map text IDs to strings.');
    const byId = new Map(defaultTexts.map(entry => [entry.id, entry]));
    for (const [id, value] of Object.entries(overrides)) {
        const entry = byId.get(id);
        if (!entry) fail('Unknown Halloween story text: ' + id + '. Reload the temporary content editor.');
        Dialogue.validate(value, entry.label, entry.maxLength, entry.format === 'quest-dialogue' ? Dialogue.progressTags : []);
        if (entry.format === 'plain' && /[<>]/.test(value)) fail(entry.label + ' must use plain text.');
    }
}

function apply(quests, dialogues, overrides) {
    validate(getEntries(quests, dialogues), overrides);
    if (!overrides) return;
    for (const entry of locations(quests, dialogues)) {
        if (Object.hasOwn(overrides, entry.id)) entry.target[entry.field] = overrides[entry.id];
    }
}

module.exports = {getEntries, validate, apply};

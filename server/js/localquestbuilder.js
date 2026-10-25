const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {WorldDefinitions} = require('./worlddefinitions');
const {ownerMap, lockedObjective, applyChanges, validateOverrides, validatePrerequisites} = require('./localquestoverrides');
const {counters, validateDialogue} = require('./localquestdialogue');

const objectiveTypes = ['NPC_TALKED', 'KILL_MOB', 'LOOT_ITEM', 'AREA_ENTERED', 'DELIVER_ITEM', 'TILE_ACTION'];
const idPattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const sourceFailure = (mapId, message) => {throw Object.assign(new Error('Repair tools/quests/' + mapId + '.json: ' + message + ' Edit the JSON file, then reload the Quest builder.'), {status: 400, sourceError: true});};
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function fields(value, allowed, label) {
    if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail(label + ' contains unsupported fields.');
}
function text(value, label, max = 2000, optional = false) {
    if (optional && value === undefined) return;
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
        fail(label + ' must be plain text, between 1 and ' + max + ' characters.');
    }
    counters(value, label);
}
function integer(value, label, max = 100000) {
    if (!Number.isInteger(value) || value < 1 || value > max) fail(label + ' must be a whole number between 1 and ' + max + '.');
}
function identifier(value, label) {
    if (typeof value !== 'string' || !idPattern.test(value) || ['__proto__', 'prototype', 'constructor'].includes(value)) {
        fail(label + ' must start with a letter and contain at most 64 letters, numbers, underscores or hyphens.');
    }
}
function npcKey(value) {
    if (value !== undefined && (typeof value !== 'string' || !/^[A-Za-z0-9_:-]{1,100}$/.test(value))) fail('NPC keys may contain at most 100 letters, numbers, underscores, colons or hyphens.');
}
function mapsAt(root) {
    return JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;
}
function mapAt(root, mapId) {
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !mapsAt(root).includes(mapId)) fail('Choose a configured map for the quest builder.');
    const folder = path.join(root, 'tools/quests');
    if (fs.existsSync(folder) && fs.lstatSync(folder).isSymbolicLink()) fail('The tools/quests folder must be an ordinary checkout folder.');
    return path.join(folder, mapId + '.json');
}
function readDocument(root, mapId) {
    const file = mapAt(root, mapId);
    let source;
    try {
        if (fs.lstatSync(file).isSymbolicLink()) fail('Quest files must be ordinary JSON files in tools/quests.');
        source = fs.readFileSync(file, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        source = '';
    }
    let document = {version: 1, quests: []};
    if (source) {
        if (Buffer.byteLength(source) > 262144) fail('The quest file exceeds 256 KB.');
        try {document = JSON.parse(source);}
        catch (_) {sourceFailure(mapId, 'invalid JSON.');}
    }
    try {fields(document, ['version', 'quests', 'overrides'], 'Quest file');}
    catch (error) {sourceFailure(mapId, error.message);}
    if (document.version !== 1 || !Array.isArray(document.quests)) sourceFailure(mapId, 'Quest files must contain version: 1 and a quests array.');
    if (document.quests.some(quest => !object(quest) || !Array.isArray(quest.objectives) || quest.objectives.some(objective => !object(objective)))) {
        sourceFailure(mapId, 'Each quest must be an object with an objectives array of objective objects.');
    }
    if (document.overrides !== undefined && (!Array.isArray(document.overrides) || document.overrides.some(override => !object(override) || typeof override.id !== 'string' || !object(override.changes)))) {
        sourceFailure(mapId, 'Each built-in override must contain an original quest ID and a changes object.');
    }
    return {file, quests: document.quests, overrides: document.overrides || [], revision: crypto.createHash('sha256').update(source).digest('hex')};
}
let bundled;
function bundledDefinitions() {
    // An independent registry avoids installing engine listeners or local files
    // in the toolbox process. The game owns its own registered definitions.
    if (!bundled) bundled = require('../world-definitions').register(new WorldDefinitions(), {local: false});
    return bundled;
}
function buildCatalog(root, mapId, registry = bundledDefinitions()) {
    mapAt(root, mapId);
    const Types = require('../../shared/js/gametypes');
    const authored = path.join(root, 'shared/js/mapmakerentities.json');
    if (fs.existsSync(authored)) Types.registerMapmakerEntities(JSON.parse(fs.readFileSync(authored, 'utf8')));
    const names = require('../../shared/js/altnames');
    const properties = require('./properties');
    const file = path.join(root, 'server/maps/world_server_' + mapId + '.json');
    let map;
    try {map = JSON.parse(fs.readFileSync(file, 'utf8'));}
    catch (_) {fail('Build this map once before creating quests so its NPCs, mobs and areas are available.');}
    if (!map.scenes) {
        const clientFile = path.join(root, 'client/maps/world_client_' + mapId + '.json');
        try {map.scenes = JSON.parse(fs.readFileSync(clientFile, 'utf8')).scenes || [];}
        catch (_) {map.scenes = [];}
    }
    map = require('./localworldscenes').applyScenes(map, require('./localworldauthoring').readDocument(root, mapId).scenes);
    const npcs = new Set(), mobs = new Set();
    const kindId = value => typeof value === 'number' ? value : Types.getKindFromString(value);
    for (const value of Object.values(map.staticEntities || {})) {
        const id = kindId(value);
        if (Types.isNpc(id)) npcs.add(id);
        if (Types.isMob(id)) mobs.add(id);
    }
    for (const area of map.roamingAreas || []) {
        const id = kindId(area.type);
        if (Types.isMob(id)) mobs.add(id);
    }
    for (const definition of registry.maps.get(mapId) || []) for (const npc of definition.npcBehavior?.npcs || []) {
        const id = kindId(npc.kind);
        if (Types.isNpc(id)) npcs.add(id);
    }
    const row = id => ({id, name: names.getName(Types.getKindAsString(id))});
    const sorted = values => [...values].map(row).sort((a, b) => a.name.localeCompare(b.name));
    const items = new Set(Object.values(Types.Entities).filter(id => {
        const name = Types.getKindAsString(id);
        return name && !name.startsWith('NFT_') && Types.isItem(id) && properties.getCollectItem(id) === id;
    }));
    const areas = new Map();
    for (const area of map.scenes || []) {
        // Objective matching uses the scene name when one exists, otherwise ID.
        const id = String(area.name || area.id);
        if (id !== 'undefined') areas.set(id, {id, name: area.name || 'Area ' + area.id});
    }
    const tileActions=Object.entries(require('./localtilebuilder').definitions(root,mapId)).map(([id,a])=>({id,name:a.name||id,
        stages:a.stages?.map(s=>({id:s.id,name:s.name}))||['prepare','plant','water','boost','harvest'].map(id=>({id,name:id}))}));
    return {tileActions,npcs: sorted(npcs), mobs: sorted(mobs), items: sorted(items), areas: [...areas.values()].sort((a, b) => a.name.localeCompare(b.name))};
}
function validateQuests(quests, catalog, availableIds = new Set(), reservedIds = new Set()) {
    if (!Array.isArray(quests) || quests.length > 50) fail('A map may have at most 50 builder quests.');
    const ids = new Set();
    const has = (type, id, label) => {if (!catalog[type].some(row => row.id === id)) fail('Choose ' + label + ' from this map\'s ' + type + ' list.');};
    for (const quest of quests) {
        fields(quest, ['id', 'name', 'npc', 'startText', 'inProgressText', 'endText', 'ordered', 'level', 'requiredLevel', 'requiredQuest', 'returnToNpc', 'reward', 'objectives'], 'Quest');
        identifier(quest.id, 'Quest ID');
        if (ids.has(quest.id) || reservedIds.has(quest.id)) fail('Quest ID ' + quest.id + ' is already used. Choose a unique ID.');
        ids.add(quest.id);
        text(quest.name, 'Quest name', 120); validateDialogue(quest.startText, 'Start dialogue'); validateDialogue(quest.endText, 'Completion dialogue');
        validateDialogue(quest.inProgressText, 'Progress dialogue', 2000, true);
        has('npcs', quest.npc, 'a quest giver');
        if (quest.returnToNpc !== undefined) has('npcs', quest.returnToNpc, 'a return NPC');
        if (quest.ordered !== undefined && typeof quest.ordered !== 'boolean') fail('Objective ordering must be true or false.');
        if (quest.level !== undefined) integer(quest.level, 'Quest level', 9999);
        if (quest.requiredLevel !== undefined) integer(quest.requiredLevel, 'Required player level', 9999);
        if (quest.requiredQuest !== undefined && !availableIds.has(quest.requiredQuest)) identifier(quest.requiredQuest, 'Prerequisite quest ID');
        if (quest.reward !== undefined) {
            fields(quest.reward, ['item', 'amount'], 'Reward');
            has('items', quest.reward.item, 'a reward item'); integer(quest.reward.amount, 'Reward quantity');
        }
        if (!Array.isArray(quest.objectives) || !quest.objectives.length || quest.objectives.length > 20) fail('Each quest needs between 1 and 20 objectives.');
        const objectiveIds = new Set();
        for (const [index, objective] of quest.objectives.entries()) {
            fields(objective, ['id', 'label', 'eventType', 'target', 'amount', 'npcKey', 'recipient', 'stage', 'countBy'], 'Objective');
            identifier(objective.id, 'Objective ID');
            if (objectiveIds.has(objective.id)) fail('Objective IDs must be unique within a quest.');
            objectiveIds.add(objective.id);
            text(objective.label, 'Objective label', 200, true);
            if (!objectiveTypes.includes(objective.eventType)) fail('Choose a supported objective type.');
            if (objective.amount !== undefined) integer(objective.amount, 'Objective quantity');
            if (objective.eventType === 'NPC_TALKED') has('npcs', objective.target, 'a target NPC');
            if (objective.eventType === 'NPC_TALKED') npcKey(objective.npcKey);
            else if (objective.npcKey !== undefined) fail('Only NPC talk objectives may have an NPC key.');
            if(objective.eventType==='TILE_ACTION'){has('tileActions',objective.target,'a tile action');if(objective.stage!==undefined&&(!/^[a-z][a-z0-9_-]{0,79}$/.test(objective.stage)))fail('Use a stage ID.');if(objective.countBy!==undefined&&!['actions','quantity'].includes(objective.countBy))fail('Choose actions or quantity.');}
            else if(objective.stage!==undefined||objective.countBy!==undefined)fail('Only tile actions have stage and count settings.');
            if (objective.eventType === 'KILL_MOB') has('mobs', objective.target, 'a target mob');
            if (objective.eventType === 'AREA_ENTERED') has('areas', objective.target, 'a target area');
            if (['LOOT_ITEM', 'DELIVER_ITEM'].includes(objective.eventType)) has('items', objective.target, 'a target item');
            if (objective.eventType === 'DELIVER_ITEM') {
                if (index !== quest.objectives.length - 1 || quest.ordered === false) fail('Delivery must be the final objective of an ordered quest.');
                fields(objective.recipient, ['npc', 'area', 'npcKey'], 'Delivery recipient');
                if ((objective.recipient.npc !== undefined) === (objective.recipient.area !== undefined)) fail('Choose exactly one delivery recipient: NPC or area.');
                if (objective.recipient.npc !== undefined) {has('npcs', objective.recipient.npc, 'a delivery NPC'); npcKey(objective.recipient.npcKey);}
                else {
                    has('areas', objective.recipient.area, 'a delivery area');
                    if (objective.recipient.npcKey !== undefined) fail('Area recipients cannot have NPC keys.');
                }
            } else if (objective.recipient !== undefined) fail('Only delivery objectives have recipients.');
        }
    }
    for (const quest of quests) if (quest.requiredQuest && !ids.has(quest.requiredQuest) && !availableIds.has(quest.requiredQuest)) fail('Prerequisite quest ' + quest.requiredQuest + ' does not exist on this map.');
    const byId = new Map(quests.map(quest => [quest.id, quest]));
    for (const quest of quests) {
        const chain = new Set([quest.id]);
        let next = quest.requiredQuest;
        while (byId.has(next)) {
            if (chain.has(next)) fail('Quest prerequisites must not form a cycle.');
            chain.add(next); next = byId.get(next).requiredQuest;
        }
    }
    return quests;
}
function context(root, mapId, registry = bundledDefinitions(), ignoreBrokenSources = false) {
    const document = readDocument(root, mapId), catalog = buildCatalog(root, mapId, registry);
    const declared = (registry.maps.get(mapId) || []).flatMap(definition => definition.quests || []);
    const existingQuests = registry.quests.filter(quest => !quest.localBuilder && (declared.includes(quest) || catalog.npcs.some(npc => npc.id === quest.npc)));
    const reserved = new Set(registry.quests.map(quest => quest.id));
    for (const other of mapsAt(root).filter(id => id !== mapId)) {
        try {for (const quest of readDocument(root, other).quests) if (typeof quest?.id === 'string') reserved.add(quest.id);}
        catch (error) {if (!ignoreBrokenSources) throw error;}
    }
    return {document, catalog, existingQuests, reserved};
}
function sourceEntries(root, replacement) {
    return mapsAt(root).flatMap(mapId => {
        if (replacement?.mapId === mapId) return [replacement];
        try {return [{mapId, ...readDocument(root, mapId)}];}
        catch (_) {return [];}
    });
}
function readQuests(root, mapId) {
    const registry = bundledDefinitions();
    const {document, catalog, existingQuests, reserved} = context(root, mapId, registry, true);
    let validationError;
    try {
        validateQuests(document.quests, catalog, new Set(existingQuests.map(quest => quest.id)), reserved);
        validateOverrides(document.overrides, {mapId, catalog, registry, quests: document.quests});
        validatePrerequisites(registry, sourceEntries(root));
    }
    catch (error) {validationError = error.message;}
    const byOwner = new Map([[mapId, document.overrides]]);
    const builtins = existingQuests.map(original => {
        const editMapId = ownerMap(registry, original.id);
        if (!byOwner.has(editMapId)) {
            try {byOwner.set(editMapId, readDocument(root, editMapId).overrides);}
            catch (_) {byOwner.set(editMapId, []);}
        }
        const override = byOwner.get(editMapId).find(item => item.id === original.id);
        const effective = override ? applyChanges(original, override.changes) : original;
        return {id: original.id, name: effective.name || original.id, original: JSON.parse(JSON.stringify(original)), effective: JSON.parse(JSON.stringify(effective)), editMapId, overridden: !!override,
            lockedObjective: lockedObjective(original)};
    });
    return {mapId, quests: document.quests, overrides: document.overrides, existingQuests: builtins, catalog,
        revision: document.revision, source: 'tools/quests/' + mapId + '.json', requiresBuild: true, ...(validationError ? {validationError} : {})};
}
function saveQuests(root, input) {
    fields(input, ['mapId', 'quests', 'overrides', 'revision'], 'Save request');
    const {document, catalog, existingQuests, reserved} = context(root, input.mapId, bundledDefinitions(), true);
    if (typeof input.revision !== 'string' || input.revision !== document.revision) fail('These quests changed in another tab. Reload the quest builder before saving.', 409);
    validateQuests(input.quests, catalog, new Set(existingQuests.map(quest => quest.id)), reserved);
    const overrides = input.overrides === undefined ? document.overrides : input.overrides;
    validateOverrides(overrides, {mapId: input.mapId, catalog, registry: bundledDefinitions(), quests: input.quests});
    validatePrerequisites(bundledDefinitions(), sourceEntries(root, {mapId: input.mapId, quests: input.quests, overrides}));
    const serialized = JSON.stringify({version: 1, quests: input.quests, ...(overrides.length ? {overrides} : {})}, null, 2) + '\n';
    if (Buffer.byteLength(serialized) > 262144) fail('These quests exceed the 256 KB map quest file limit. Shorten dialogue or remove quests before saving.', 413);
    const folder = path.dirname(document.file);
    fs.mkdirSync(folder, {recursive: true});
    const temporary = path.join(folder, '.' + input.mapId + '-' + crypto.randomUUID() + '.tmp');
    try {
        fs.writeFileSync(temporary, serialized, {flag: 'wx'});
        fs.renameSync(temporary, document.file);
    } finally {fs.rmSync(temporary, {force: true});}
    return readQuests(root, input.mapId);
}
function registerLocalQuests(root, registry, options = {}) {
    const Types = require('../../shared/js/gametypes');
    const baseline = new WorldDefinitions();
    baseline.maps = new Map(registry.maps);
    baseline.quests = [...registry.quests];
    const errors = [];
    const valid = [];
    const warn = (mapId, error) => {
        const message = 'Skipped tools/quests/' + mapId + '.json: ' + error.message + (error.sourceError ? '' : ' Open the Quest builder to repair this map\'s quests, then build again.');
        errors.push(message); (options.warn || console.warn)(message);
    };
    for (const mapId of mapsAt(root)) {
        try {
            const source = readDocument(root, mapId);
            if (!source.quests.length && !source.overrides.length) continue;
            const {document, catalog, existingQuests, reserved} = context(root, mapId, baseline, true);
            validateQuests(document.quests, catalog, new Set(existingQuests.map(quest => quest.id)), reserved);
            validateOverrides(document.overrides, {mapId, catalog, registry: baseline, quests: document.quests});
            valid.push({mapId, document});
        } catch (error) {
            warn(mapId, error);
        }
    }
    while (valid.length) {
        try {validatePrerequisites(baseline, valid.map(({document}) => document)); break;}
        catch (error) {
            let removed = false;
            for (let index = valid.length - 1; index >= 0; index--) {
                const entry = valid[index];
                if (![...entry.document.quests, ...entry.document.overrides].some(quest => error.questIds?.includes(quest.id))) continue;
                warn(entry.mapId, error); valid.splice(index, 1); removed = true;
            }
            if (!removed) throw error;
        }
    }
    if (options.strict && errors.length) throw new Error(errors.join('\n'));
    for (const {document} of valid) for (const override of document.overrides) {
        const original = baseline.quests.find(quest => quest.id === override.id);
        registry.replaceQuest(override.id, applyChanges(original, override.changes));
    }
    for (const {mapId, document} of valid) if (document.quests.length) registry.register(mapId, {id: 'local-quest-builder', quests: document.quests.map(quest => ({
        level: 1, medal: Types.Medals.TALK, ...quest, mapId, localBuilder: true
    }))});
    return errors;
}
module.exports = {readQuests, saveQuests, validateQuests, buildCatalog, registerLocalQuests};

const fs = require('fs');
const os = require('os');
const path = require('path');
global.Types = {};
const {readQuests, saveQuests, validateQuests, buildCatalog, registerLocalQuests} = require('./localquestbuilder');
const {WorldDefinitions} = require('./worlddefinitions');
const Types = require('../../shared/js/gametypes');
let root;
function write(relative, value) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, JSON.stringify(value));
}
const fixture = () => ({id: 'My_Patrol', name: 'Patrol the gate', npc: Types.Entities.GUARD, startText: 'Defeat one rat.',
    inProgressText: '{{remaining}} objectives remain.', endText: 'Thank you.', level: 3, requiredLevel: 1,
    objectives: [{id: 'defeat', label: 'Defeat a rat', eventType: 'KILL_MOB', target: Types.Entities.RAT, amount: 1}]});
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-quests-'));
    write('server/config.json', {maps: ['one', 'two']});
    for (const map of ['one', 'two']) write('server/maps/world_server_' + map + '.json', {width: 20, height: 20,
        staticEntities: {1: 'guard', 2: 'rat', 3: 'villager'}, scenes: [{id: 5, name: 'Town'}, {id: 6}],
        roamingAreas: [{type: 'skeleton'}]});
});
afterEach(() => {fs.rmSync(root, {recursive: true, force: true});});

test('save, reload and delete persist versioned map source while stale saves cannot overwrite newer work', () => {
    const initial = readQuests(root, 'one');
    expect(initial).toMatchObject({quests: [], source: 'tools/quests/one.json', requiresBuild: true});
    const saved = saveQuests(root, {mapId: 'one', revision: initial.revision, quests: [fixture()]});
    expect(JSON.parse(fs.readFileSync(path.join(root, saved.source)))).toEqual({version: 1, quests: [fixture()]});
    expect(readQuests(root, 'one').quests).toEqual([fixture()]);
    expect(readQuests(root, 'two').quests).toEqual([]);
    expect(() => saveQuests(root, {mapId: 'one', revision: initial.revision, quests: []})).toThrow('another tab');
    expect(saveQuests(root, {mapId: 'one', revision: saved.revision, quests: []}).quests).toEqual([]);
});

test('the catalog uses map NPCs, mobs, scene names and canonical non-NFT inventory items', () => {
    const catalog = buildCatalog(root, 'one', new WorldDefinitions());
    expect(catalog.npcs).toEqual(expect.arrayContaining([{id: Types.Entities.GUARD, name: 'guard'}]));
    expect(catalog.mobs.map(row => row.id)).toEqual(expect.arrayContaining([Types.Entities.RAT, Types.Entities.SKELETON]));
    expect(catalog.areas).toEqual([{id: '6', name: 'Area 6'}, {id: 'Town', name: 'Town'}]);
    expect(catalog.items.map(row => row.id)).toContain(Types.Entities.GOLD);
    expect(catalog.items.every(row => !Types.getKindAsString(row.id).startsWith('NFT_'))).toBe(true);
});

test('legacy server exports obtain area definitions from their client export', () => {
    write('server/maps/world_server_one.json', {staticEntities: {1: 'guard'}});
    write('client/maps/world_client_one.json', {scenes: [{id: 7, name: 'Forest'}]});
    expect(buildCatalog(root, 'one').areas).toEqual([{id: 'Forest', name: 'Forest'}]);
});

test.each(['../one', '..\\one', 'one.json', '', null, ['one']])('map source paths cannot escape configured map IDs: %j', map => {
    expect(() => readQuests(root, map)).toThrow('configured map');
});

test('quest IDs cannot replace a bundled quest or a quest on another map', () => {
    const one = readQuests(root, 'one'), two = readQuests(root, 'two');
    saveQuests(root, {mapId: 'one', revision: one.revision, quests: [fixture()]});
    expect(() => saveQuests(root, {mapId: 'two', revision: two.revision, quests: [fixture()]})).toThrow('already used');
    expect(() => saveQuests(root, {mapId: 'two', revision: two.revision, quests: [{...fixture(), id: 'KING_QUEST_1'}]})).toThrow('already used');
});

test('validation rejects unsupported engine behavior, unsafe template expressions and unavailable targets', () => {
    const catalog = readQuests(root, 'one').catalog;
    const invalid = [
        {...fixture(), rental: 'external-rental'},
        {...fixture(), id: 'constructor'},
        {...fixture(), startText: '<script>bad()</script>'},
        {...fixture(), inProgressText: '{{process.exit()}}'},
        {...fixture(), npc: Types.Entities.KING},
        {...fixture(), requiredLevel: 0},
        {...fixture(), reward: {item: Types.Entities.RAT, amount: 1}},
        {...fixture(), objectives: [{id: 'bad', eventType: 'ARBITRARY_CODE', target: 1}]},
        {...fixture(), objectives: [{id: 'bad', eventType: 'KILL_MOB', target: Types.Entities.GUARD}]},
        {...fixture(), objectives: [{id: 'bad', eventType: 'AREA_ENTERED', target: 'Missing scene'}]},
        {...fixture(), objectives: [{id: 'bad', eventType: 'LOOT_ITEM', target: Types.Entities.GOLD, amount: -1}]}
    ];
    for (const quest of invalid) expect(() => validateQuests([quest], catalog)).toThrow();
});

test('custom quest dialogue saves supported game styling and counters while labels and names stay plain', () => {
    const catalog = readQuests(root, 'one').catalog;
    const styled = {...fixture(), startText: 'Defeat <span class="dialogue-danger dialogue-shake">a rat</span>.',
        inProgressText: '<span class="dialogue-item">{{remaining}}</span> objectives remain.', endText: '<span class="dialogue-wave">Thank you!</span>'};
    const saved = saveQuests(root, {mapId: 'one', revision: readQuests(root, 'one').revision, quests: [styled]});
    expect(saved.quests[0]).toEqual(styled);
    expect(() => validateQuests([{...styled, name: '<span class="dialogue-item">Patrol</span>'}], catalog)).toThrow('plain text');
    expect(() => validateQuests([{...styled, objectives: [{...styled.objectives[0], label: '<span class="dialogue-item">Rat</span>'}]}], catalog)).toThrow('plain text');
    for (const startText of ['<span class="dialogue-item" onclick="bad()">Rat</span>', '<span class="unknown-style">Rat</span>', '<a href="https://example.com">Rat</a>']) {
        expect(() => validateQuests([{...styled, startText}], catalog)).toThrow('allows only balanced');
    }
});

test('delivery requires an ordered final step, actual item kind and exactly one valid recipient', () => {
    const catalog = readQuests(root, 'one').catalog;
    const delivery = {id: 'deliver', eventType: 'DELIVER_ITEM', target: Types.Entities.GOLD, amount: 2, recipient: {npc: Types.Entities.GUARD}};
    expect(() => validateQuests([{...fixture(), objectives: [fixture().objectives[0], delivery]}], catalog)).not.toThrow();
    expect(() => validateQuests([{...fixture(), objectives: [{...delivery, recipient: {area: 'Town'}}]}], catalog)).not.toThrow();
    const invalid = [
        {...fixture(), ordered: false, objectives: [delivery]},
        {...fixture(), objectives: [delivery, fixture().objectives[0]]},
        {...fixture(), objectives: [{...delivery, recipient: {npc: Types.Entities.GUARD, area: 'Town'}}]},
        {...fixture(), objectives: [{...delivery, recipient: {npc: Types.Entities.KING}}]}
    ];
    for (const quest of invalid) expect(() => validateQuests([quest], catalog)).toThrow();
});

test('prerequisites reject missing quests, self references, cycles and duplicate IDs', () => {
    const catalog = readQuests(root, 'one').catalog;
    expect(() => validateQuests([{...fixture(), requiredQuest: 'Missing'}], catalog)).toThrow('does not exist');
    expect(() => validateQuests([{...fixture(), requiredQuest: fixture().id}], catalog)).toThrow('cycle');
    expect(() => validateQuests([{...fixture(), requiredQuest: 'Next'}, {...fixture(), id: 'Next', requiredQuest: fixture().id}], catalog)).toThrow('cycle');
    expect(() => validateQuests([fixture(), fixture()], catalog)).toThrow('already used');
    expect(() => validateQuests([{...fixture(), objectives: [fixture().objectives[0], fixture().objectives[0]]}], catalog)).toThrow('unique');
    expect(() => validateQuests([fixture(), {...fixture(), id: 'Next', requiredQuest: fixture().id}], catalog)).not.toThrow();
});

test('a symlinked map quest file is never read or replaced by a save', () => {
    fs.mkdirSync(path.join(root, 'tools/quests'), {recursive: true});
    write('outside.json', {version: 1, quests: []});
    fs.symlinkSync(path.join(root, 'outside.json'), path.join(root, 'tools/quests/one.json'));
    expect(() => readQuests(root, 'one')).toThrow('ordinary JSON');
});

test('saved quests register in production and local playtests with the same map scope', () => {
    const originalNode = process.env.NODE_ENV, originalLocal = process.env.LOOPERLANDS_LOCAL_PLAYTEST;
    write('tools/quests/one.json', {version: 1, quests: [fixture()]});
    try {
        const production = new WorldDefinitions();
        process.env.NODE_ENV = 'production'; delete process.env.LOOPERLANDS_LOCAL_PLAYTEST;
        registerLocalQuests(root, production);
        const local = new WorldDefinitions();
        process.env.NODE_ENV = 'development'; process.env.LOOPERLANDS_LOCAL_PLAYTEST = '1';
        registerLocalQuests(root, local);
        expect(local.quests).toEqual([{medal: Types.Medals.TALK, ...fixture(), mapId: 'one', localBuilder: true}]);
        expect(production.quests).toEqual(local.quests);
    } finally {
        if (originalNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNode;
        if (originalLocal === undefined) delete process.env.LOOPERLANDS_LOCAL_PLAYTEST; else process.env.LOOPERLANDS_LOCAL_PLAYTEST = originalLocal;
    }
});

test('removing a map target leaves saved quests editable and runtime skips them until repaired', () => {
    const originalNode = process.env.NODE_ENV, originalLocal = process.env.LOOPERLANDS_LOCAL_PLAYTEST;
    const saved = saveQuests(root, {mapId: 'one', revision: readQuests(root, 'one').revision, quests: [fixture()]});
    write('server/maps/world_server_one.json', {staticEntities: {1: 'guard'}});
    try {
        const readable = readQuests(root, 'one');
        expect(readable.quests).toEqual([fixture()]);
        expect(readable.validationError).toContain('target mob');
        expect(readable.revision).toBe(saved.revision);
        process.env.NODE_ENV = 'development'; process.env.LOOPERLANDS_LOCAL_PLAYTEST = '1';
        const registry = new WorldDefinitions(), warn = jest.fn();
        expect(registerLocalQuests(root, registry, {warn})).toHaveLength(1);
        expect(registry.quests).toEqual([]); expect(warn).toHaveBeenCalledWith(expect.stringContaining('Skipped tools/quests/one.json'));
        const repaired = {...fixture(), objectives: [{id: 'talk', eventType: 'NPC_TALKED', target: Types.Entities.GUARD}]};
        const result = saveQuests(root, {mapId: 'one', revision: readable.revision, quests: [repaired]});
        expect(result.validationError).toBeUndefined();
        expect(registerLocalQuests(root, registry, {warn})).toEqual([]);
        expect(registry.quests[0].objectives).toEqual(repaired.objectives);
    } finally {
        if (originalNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNode;
        if (originalLocal === undefined) delete process.env.LOOPERLANDS_LOCAL_PLAYTEST; else process.env.LOOPERLANDS_LOCAL_PLAYTEST = originalLocal;
    }
});

test('malformed JSON skips only its map at startup while other map quests can still load and save', () => {
    const originalNode = process.env.NODE_ENV, originalLocal = process.env.LOOPERLANDS_LOCAL_PLAYTEST;
    write('tools/quests/one.json', {version: 1, quests: []});
    fs.writeFileSync(path.join(root, 'tools/quests/one.json'), '{broken JSON');
    try {
        const other = readQuests(root, 'two');
        saveQuests(root, {mapId: 'two', revision: other.revision, quests: [fixture()]});
        process.env.NODE_ENV = 'development'; process.env.LOOPERLANDS_LOCAL_PLAYTEST = '1';
        const registry = new WorldDefinitions(), warn = jest.fn();
        expect(registerLocalQuests(root, registry, {warn})).toHaveLength(1);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('invalid JSON'));
        expect(registry.quests.map(quest => quest.id)).toEqual([fixture().id]);
    } finally {
        if (originalNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNode;
        if (originalLocal === undefined) delete process.env.LOOPERLANDS_LOCAL_PLAYTEST; else process.env.LOOPERLANDS_LOCAL_PLAYTEST = originalLocal;
    }
});

test('pretty-printed source size is checked before a compact request can replace a readable quest file', () => {
    const initial = saveQuests(root, {mapId: 'one', revision: readQuests(root, 'one').revision, quests: [fixture()]});
    const source = fs.readFileSync(path.join(root, initial.source), 'utf8');
    const quests = Array.from({length: 41}, (_, index) => ({...fixture(), id: 'Quest' + index, name: 'A local mapmaker workshop patrol',
        startText: 'a'.repeat(2000), inProgressText: 'b'.repeat(2000), endText: 'c'.repeat(2000)}));
    const request = {mapId: 'one', revision: initial.revision, quests};
    expect(Buffer.byteLength(JSON.stringify(request))).toBeLessThanOrEqual(262144);
    expect(Buffer.byteLength(JSON.stringify({version: 1, quests}, null, 2))).toBeGreaterThan(262144);
    expect(() => saveQuests(root, request)).toThrow('256 KB map quest file limit');
    expect(fs.readFileSync(path.join(root, initial.source), 'utf8')).toBe(source);
    expect(readQuests(root, 'one').revision).toBe(initial.revision);
});

test.each([[null], [{id: 'Unfinished'}], [{id: 'Broken', objectives: [null]}]])('uneditable source structure gives the exact JSON repair path: %j', quests => {
    write('tools/quests/one.json', {version: 1, quests});
    expect(() => readQuests(root, 'one')).toThrow('Repair tools/quests/one.json');
    expect(() => readQuests(root, 'one')).toThrow('Edit the JSON file');
});

test('built-in sparse overrides are saved in their owner map, read with full originals and restored without changing source modules', () => {
    write('server/config.json', {maps: ['main', 'two']});
    write('server/maps/world_server_main.json', {staticEntities: {1: 'guard', 2: 'rat'}});
    const initial = readQuests(root, 'main');
    const king = initial.existingQuests.find(quest => quest.id === 'KING_QUEST_1');
    expect(king).toMatchObject({editMapId: 'main', overridden: false, lockedObjective: false});
    expect(king.original.endText).toEqual(['Thanks for killing the rats', 'Here is your next quest']);
    const original = JSON.stringify(king.original);
    const overrides = [{id: king.id, changes: {name: 'Local gate patrol', amount: 2}}];
    const saved = saveQuests(root, {mapId: 'main', revision: initial.revision, quests: [], overrides});
    expect(saved.overrides).toEqual(overrides);
    expect(saved.existingQuests.find(quest => quest.id === king.id)).toMatchObject({overridden: true, effective: {...king.original, name: 'Local gate patrol', amount: 2}});
    expect(JSON.stringify(saved.existingQuests.find(quest => quest.id === king.id).original)).toBe(original);
    expect(JSON.parse(fs.readFileSync(path.join(root, 'tools/quests/main.json'), 'utf8')).overrides).toEqual(overrides);
    // Older callers that save only custom quests must not erase built-in edits.
    const oldClientSave = saveQuests(root, {mapId: 'main', revision: saved.revision, quests: []});
    expect(oldClientSave.overrides).toEqual(overrides);
    const restored = saveQuests(root, {mapId: 'main', revision: oldClientSave.revision, quests: [], overrides: []});
    expect(restored.existingQuests.find(quest => quest.id === king.id).effective).toEqual(king.original);
    expect(restored.existingQuests.find(quest => quest.id === king.id).overridden).toBe(false);
});

test('owner-map edits are shown consistently wherever the original global quest giver appears', () => {
    write('server/config.json', {maps: ['main', 'two']});
    for (const map of ['main', 'two']) write('server/maps/world_server_' + map + '.json', {staticEntities: {1: 'king'}});
    const initial = readQuests(root, 'main');
    saveQuests(root, {mapId: 'main', revision: initial.revision, quests: [], overrides: [{id: 'KING_QUEST_1', changes: {name: 'Across the local world'}}]});
    const other = readQuests(root, 'two');
    expect(other.existingQuests.find(quest => quest.id === 'KING_QUEST_1')).toMatchObject({editMapId: 'main', overridden: true, effective: {name: 'Across the local world'}});
    expect(() => saveQuests(root, {mapId: 'two', revision: other.revision, quests: [], overrides: [{id: 'KING_QUEST_1', changes: {name: 'Conflicting copy'}}]})).toThrow('owner map');
});

test('name-only edits can retain inherited invalid rewards and existing IDs with spaces', () => {
    write('server/config.json', {maps: ['m88n', 'robits']});
    write('server/maps/world_server_m88n.json', {staticEntities: {}});
    write('server/maps/world_server_robits.json', {staticEntities: {}});
    const initial = readQuests(root, 'm88n');
    const robots = readQuests(root, 'robits');
    const spaced = robots.existingQuests.find(quest => quest.id.includes(' '));
    const gamer = initial.existingQuests.find(quest => quest.id === 'GAMER_QUEST_1');
    expect(gamer.original.reward).toEqual({amount: 10});
    const saved = saveQuests(root, {mapId: 'm88n', revision: initial.revision, quests: [], overrides: [{id: gamer.id, changes: {name: 'A local game'}}]});
    const spacedSave = saveQuests(root, {mapId: 'robits', revision: robots.revision, quests: [], overrides: [{id: spaced.id, changes: {name: 'A local legacy quest'}}]});
    expect(spacedSave.existingQuests.find(quest => quest.id === spaced.id).effective.name).toBe('A local legacy quest');
    expect(saved.validationError).toBeUndefined();
    expect(saved.existingQuests.find(quest => quest.id === gamer.id).effective.reward).toEqual(gamer.original.reward);
});

test('cross-map prerequisite cycles are rejected on save and skipped safely during local runtime startup', () => {
    write('server/config.json', {maps: ['main', 'oa']});
    for (const map of ['main', 'oa']) write('server/maps/world_server_' + map + '.json', {staticEntities: {}});
    const first = readQuests(root, 'main'), second = readQuests(root, 'oa');
    saveQuests(root, {mapId: 'main', revision: first.revision, quests: [], overrides: [{id: 'KING_QUEST_1', changes: {requiredQuest: 'OA_QUEST_1'}}]});
    const cyclic = [{id: 'OA_QUEST_1', changes: {requiredQuest: 'KING_QUEST_1'}}];
    expect(() => saveQuests(root, {mapId: 'oa', revision: second.revision, quests: [], overrides: cyclic})).toThrow('cycle');
    write('tools/quests/oa.json', {version: 1, quests: [], overrides: cyclic});
    const originalNode = process.env.NODE_ENV, originalLocal = process.env.LOOPERLANDS_LOCAL_PLAYTEST;
    try {
        process.env.NODE_ENV = 'development'; process.env.LOOPERLANDS_LOCAL_PLAYTEST = '1';
        const registry = require('../world-definitions').register(new WorldDefinitions(), {local: false}), warn = jest.fn();
        expect(registerLocalQuests(root, registry, {warn})).toHaveLength(2);
        expect(registry.quests.find(quest => quest.id === 'KING_QUEST_1').requiredQuest).toBeUndefined();
        expect(registry.quests.find(quest => quest.id === 'OA_QUEST_1').requiredQuest).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(2);
    } finally {
        if (originalNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNode;
        if (originalLocal === undefined) delete process.env.LOOPERLANDS_LOCAL_PLAYTEST; else process.env.LOOPERLANDS_LOCAL_PLAYTEST = originalLocal;
    }
});

global.Types = {};
const fs = require('fs');
const os = require('os');
const path = require('path');
const Content = require('./seasonalcontent');
const Builder = require('./localseasonbuilder');
const project = path.resolve(__dirname, '../..');
let root;
function write(relative, value) {
    const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
}
function copy(relative) {
    const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.copyFileSync(path.join(project, relative), file);
}
function input(data) {return {mapId: data.mapId, revision: data.revision, events: structuredClone(data.events)};}
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'season-builder-'));
    write('server/config.json', {maps: ['main', 'other']});
    copy('tools/seasons/main.json');
    for (const side of ['server', 'client']) {
        copy(side + '/maps/world_' + side + '_main.json');
        fs.copyFileSync(path.join(root, side + '/maps/world_' + side + '_main.json'), path.join(root, side + '/maps/world_' + side + '_other.json'));
    }
    const event = Content.readDocument(root, 'main').events[0];
    for (const image of new Set([...event.decorations.map(row => row.image), ...event.parallax.flatMap(row => row.layers.map(layer => layer.image))])) copy('client' + image);
});
afterEach(() => {fs.rmSync(root, {recursive: true, force: true}); jest.restoreAllMocks(); jest.useRealTimers();});

test('read, save and reload preserve the entire bundle and project fresh story text over cached defaults', () => {
    const data = Builder.readTool(root, 'main'), draft = input(data);
    expect(data.source).toBe('tools/seasons/main.json');
    expect(data.catalog.registeredEvents[0].requiredActors).toHaveLength(11);
    expect(data.catalog.storyLinks[0].questIds).toHaveLength(4);
    expect(data.catalog.decorationImages[0]).toMatchObject({url: expect.stringContaining('/local/api/seasons/image?'), width: expect.any(Number)});
    draft.events[0].enabled = false;
    draft.events[0].availability = {startsAt: '2026-10-30T00:00:00Z', endsAt: '2026-11-02T00:00:00Z'};
    const entry = data.catalog.storyTexts.find(entry => entry.id.endsWith(':welcome:text'));
    draft.events[0].textOverrides = {[entry.id]: 'Welcome to the autumn mysteries.'};
    const saved = Builder.saveTool(root, draft);
    expect(saved.events).toEqual(draft.events);
    expect(saved.activeEvents).toEqual([]);
    expect(Builder.readTool(root, 'main').catalog.storyTexts.find(row => row.id === entry.id)).toMatchObject({value: 'Welcome to the autumn mysteries.', original: entry.value});
    expect(Content.readDocument(root, 'main').events[0].actors).toEqual(data.events[0].actors);
    expect(Builder.readTool(root, 'other')).toMatchObject({events: [], catalog: {registeredEvents: [], storyTexts: []}});
});

test('stale edits, changed scene geometry and late build locks never overwrite a saved source', () => {
    const original = Builder.readTool(root, 'main'), draft = input(original);
    draft.events[0].name = 'A changed season'; Builder.saveTool(root, draft);
    expect(() => Builder.saveTool(root, input(original))).toThrow(/changed/);
    const fresh = Builder.readTool(root, 'main'), before = fs.readFileSync(path.join(root, fresh.source));
    expect(() => Builder.saveTool(root, input(fresh), () => {throw Object.assign(new Error('Build started'), {status: 409});})).toThrow('Build started');
    expect(fs.readFileSync(path.join(root, fresh.source))).toEqual(before);
    const scenes = fresh.catalog.scenes.map(({id, name, x, y, w, h}) => ({id, name: name || '', x, y, w, h}));
    scenes[0].name = 'Renamed scene'; write('tools/worlds/main.json', {version: 1, scenes});
    expect(() => Builder.saveTool(root, input(fresh))).toThrow(/geometry changed/);
    const changed = Builder.readTool(root, 'main');
    write('tools/worlds/main.json', {version: 1, scenes: scenes.filter(scene => String(scene.id) !== '624')});
    expect(() => Content.validate(root, 'main')).toThrow(/missing scene 624/);
    expect(changed.revision).not.toBe(fresh.revision);
});

test('protected Halloween event and linked actor identities cannot be removed or copied to another map', () => {
    const data = Builder.readTool(root, 'main');
    expect(() => Builder.saveTool(root, {...input(data), events: []})).toThrow(/registered/);
    const draft = input(data); draft.events[0].actors.shift();
    expect(() => Builder.saveTool(root, draft)).toThrow(/linked actor halloween:witch/);
    const other = Builder.readTool(root, 'other');
    expect(() => Builder.saveTool(root, {...input(other), events: data.events})).toThrow(/protected main-map story/);
});

test('new events and actors can be created on another map, read by a fresh registry and deleted', () => {
    const original = Builder.readTool(root, 'other');
    expect(original.catalog.npcs.some(npc => npc.id === 'guard')).toBe(true);
    expect(original.catalog.decorationImages.length).toBeGreaterThan(0);
    expect(original.catalog.ambientPresets.some(preset => preset.id === 'campfire')).toBe(true);
    expect(original.catalog.parallaxImages.length).toBeGreaterThan(0);
    const event = {id: 'spring_fair', name: 'Spring fair', enabled: true, availability: {annual: {start: '04-01', end: '04-08'}},
        actors: [{key: 'spring_fair:host', kind: 'guard', label: 'Fair host', x: 44, y: 214, greeting: 'Welcome to our fair.'}],
        decorations: [], tiles: [], ambientSounds: [], parallax: [], textOverrides: {}};
    const saved = Builder.saveTool(root, {...input(original), events: [event]});
    expect(Builder.readTool(root, 'other').events).toEqual([event]);
    const registry = new (require('./worlddefinitions').WorldDefinitions)();
    require('../world-definitions/seasons').register(root, registry);
    expect(registry.maps.get('other').some(definition => definition.id === 'seasonal-content')).toBe(true);
    expect(registry.dialogues('other')).toContainEqual(expect.objectContaining({key: 'spring_fair:host', nodes: {greeting: {text: 'Welcome to our fair.'}}}));
    const removed = Builder.saveTool(root, {...input(saved), events: []});
    expect(removed.events).toEqual([]);
    const next = new (require('./worlddefinitions').WorldDefinitions)(); require('../world-definitions/seasons').register(root, next);
    expect(next.maps.has('other')).toBe(false);
});

test.each([
    {'unknown-text': 'A new line'},
    {'dialogue:halloween:witch:welcome:text': '<script>alert(1)</script>'}
])('story overrides reject unknown identities and unsafe markup', textOverrides => {
    const draft = input(Builder.readTool(root, 'main')); draft.events[0].textOverrides = textOverrides;
    expect(() => Builder.saveTool(root, draft)).toThrow();
});

test('Quest builder text precedence is visible without changing the seasonal draft', () => {
    const data = Builder.readTool(root, 'main'), draft = input(data);
    const id = 'quest:HALLOWEEN_MISSING_SHADOW:startText';
    draft.events[0].textOverrides = {[id]: 'Seasonal directions to the Forest.'};
    write('tools/quests/main.json', {version: 1, quests: [], overrides: [{id: 'HALLOWEEN_MISSING_SHADOW', changes: {startText: 'Quest builder directions.'}}]});
    const saved = Builder.saveTool(root, draft);
    expect(saved.catalog.storyTexts.find(row => row.id === id)).toMatchObject({value: 'Seasonal directions to the Forest.', effective: 'Quest builder directions.'});
    expect(saved.catalog.storyTextConflicts).toContainEqual({id, questId: 'HALLOWEEN_MISSING_SHADOW', field: 'startText', source: 'tools/quests/main.json',
        seasonalValue: 'Seasonal directions to the Forest.', value: 'Quest builder directions.'});
    expect(saved.events[0].textOverrides[id]).toBe('Seasonal directions to the Forest.');
});

test('unsafe paths, symlinked files and malformed sources cannot be overwritten', () => {
    for (const id of ['../main', 'main.json', 'missing', null]) expect(() => Builder.readTool(root, id)).toThrow(/configured map/);
    const file = path.join(root, 'tools/seasons/main.json');
    fs.unlinkSync(file); fs.symlinkSync(path.join(root, 'missing.json'), file);
    expect(() => Builder.readTool(root, 'main')).toThrow(/symbolic links/);
    fs.unlinkSync(file); write('tools/seasons/main.json', '{broken');
    expect(() => Builder.readTool(root, 'main')).toThrow(/invalid JSON/);
    copy('tools/seasons/main.json');
    const image = Content.readDocument(root, 'main').events[0].decorations[0].image;
    fs.unlinkSync(path.join(root, 'client' + image)); fs.symlinkSync(path.join(project, 'client' + image), path.join(root, 'client' + image));
    expect(() => Content.validate(root, 'main')).toThrow(/symbolic links/);
});

test.each([true, false])('a fresh game snapshot loads saved positions and gates all event consumers when enabled=%s', enabled => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-31T12:00:00Z'));
    const draft = input(Builder.readTool(root, 'main')); draft.events[0].enabled = enabled;
    draft.events[0].availability = {startsAt: '2026-10-30T00:00:00Z', endsAt: '2026-11-02T00:00:00Z'};
    draft.events[0].actors[0].x = 44;
    draft.events[0].actors[0].label = 'Whispy, freshly edited';
    draft.events[0].decorations[0].offsetX = 3;
    const welcome = 'dialogue:halloween:witch:welcome:text';
    draft.events[0].textOverrides = {[welcome]: 'The saved seasonal greeting.'};
    Builder.saveTool(root, draft);
    jest.isolateModules(() => {
        const source = require('./seasonalcontent');
        jest.spyOn(source, 'readDocument').mockImplementation(() => Content.readDocument(root, 'main'));
        const content = require('../world-definitions/halloween-content'), story = require('../world-definitions/halloween-story');
        const shop = require('../world-definitions/halloween-shop'), Availability = require('./contentavailability');
        expect(content.event).toEqual(draft.events[0]);
        expect(story.dialogues.find(row => row.key === 'halloween:witch').nodes.welcome.text).toBe('The saved seasonal greeting.');
        for (const quest of story.quests) {expect(quest.availability).toBe(content.availability); expect(Availability.isAvailable(quest.availability)).toBe(enabled);}
        for (const dialogue of story.dialogues) expect(Availability.isAvailable(dialogue.availability)).toBe(enabled);
        expect(shop.availability).toBe(content.availability);
        const Shop = require('./halloweenshopcontroller');
        expect(new Shop(shop, {}).inventory()).toHaveLength(enabled ? 3 : 0);
        const world = {map: require('../maps/world_server_main.json'), entities: {}, npcs: {}, isValidPosition: () => true,
            addEntity(npc) {this.entities[npc.id] = npc;}};
        const scene = new (require('./halloween').HalloweenScene)(world, {createNpc: (id, kind, x, y) => ({id, kind, x, y})});
        expect(scene.actors.size).toBe(enabled ? draft.events[0].actors.length : 0);
        if (enabled) expect(scene.actors.get('halloween:witch')).toMatchObject({x: 44, y: 214, behaviorState: {label: 'Whispy, freshly edited'}});
        expect(scene.packet().rendererExtensions).toHaveLength(enabled ? 3 : 0);
        expect(scene.packet().ambientSounds).toHaveLength(enabled ? draft.events[0].ambientSounds.length : 0);
    });
});

test('HTTP reads and saves expose safe previews and report validation or build conflicts', async () => {
    const app = require('express')(), toolbox = {root}; app.use(require('express').json()); Builder.install(app, toolbox);
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    try {
        const url = 'http://127.0.0.1:' + server.address().port;
        const response = await fetch(url + '/local/api/seasons?mapId=main'), data = await response.json();
        expect(response.status).toBe(200);
        const image = await fetch(url + data.catalog.decorationImages[0].url);
        expect(image.status).toBe(200); expect(image.headers.get('content-type')).toMatch(/image\/png/);
        expect((await fetch(url + '/local/api/seasons/image?image=' + encodeURIComponent('/img/1/../../config.json'))).status).toBe(400);
        const save = body => fetch(url + '/local/api/seasons', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
        const draft = input(data); draft.events[0].enabled = 'false';
        expect((await save(draft)).status).toBe(400);
        toolbox.job = {status: 'running'}; expect((await save(input(data))).status).toBe(409);
        delete toolbox.job; expect((await save(input(data))).status).toBe(200);
        toolbox.closed = true; expect((await save(input(data))).status).toBe(503);
    } finally {await new Promise(resolve => server.close(resolve));}
});

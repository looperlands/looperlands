const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
global.Types = {};
const Content = require('./mapmakercontent');
let root;
const write = (file, value) => {const target = path.join(root, file); fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, JSON.stringify(value));};
const rule = {id: 'arrival', name: 'Arrival', enabled: true, when: {type: 'player.spawned', options: {}}, conditions: [], actions: [{type: 'send_notification', options: {message: 'Welcome'}}]};
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'production-content-'));
    write('server/config.json', {maps: ['one']});
    const map = {width: 10, height: 10, tilesize: 16, data: Array(100).fill(1), collisions: [], staticEntities: {}, scenes: [{id: 1, name: 'Old scene', x: 0, y: 0, w: 10, h: 10}]};
    write('client/maps/world_client_one.json', map); write('server/maps/world_server_one.json', map);
});
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));

test('production artifacts include the same scenes, atmosphere and action placements as local transport', () => {
    const doc = {version: 1, rules: [rule], dialogues: [], scenes: [{id: 'clearing', name: 'Clearing', x: 1, y: 1, w: 4, h: 4}], atmosphere: [{sceneId: 'clearing', cycle: true, dayDarkness: 0, nightDarkness: .8, color: '#123456', music: '', particles: []}]};
    write('tools/worlds/one.json', doc);
    const stage = {id: 'work', name: 'Work', duration: 0, waitSeconds: 0, level: 1, costs: [], rewards: [], xp: 0, tile: 0, successChance: 1};
    write('tools/tiles/one.json', {version: 1, actions: {repair: {type: 'sequence', name: 'Repair', start: 'work', stages: [stage]}}, placements: [{action: 'repair', x: 2, y: 3, width: 1, height: 1}]});
    const local = Content.applyMap(root, 'one', JSON.parse(fs.readFileSync(path.join(root, 'client/maps/world_client_one.json'))));
    expect(Content.build(root)).toBe(3);
    const deployed = JSON.parse(fs.readFileSync(path.join(root, 'client/maps/world_client_one.json')));
    const server = JSON.parse(fs.readFileSync(path.join(root, 'server/maps/world_server_one.json')));
    const context = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'client/maps/world_client_one.js'), 'utf8'), context);
    expect(deployed).toEqual(local); expect(JSON.parse(JSON.stringify(context.mapData))).toEqual(local);
    expect(server.scenes).toEqual(deployed.scenes); expect(deployed.authoringActions['2.3']).toEqual({action: 'repair'});
    expect(JSON.parse(fs.readFileSync(path.join(root, 'tools/worlds/one.json')))).toEqual(doc);
});

test('invalid saved content fails the production build before any map artifacts change', () => {
    const file = path.join(root, 'client/maps/world_client_one.json'), before = fs.readFileSync(file);
    write('tools/worlds/one.json', {version: 1, rules: [{...rule, actions: [{type: 'unsupported', options: {}}]}], dialogues: [], atmosphere: []});
    expect(() => Content.build(root)).toThrow('supported'); expect(fs.readFileSync(file)).toEqual(before);
    write('tools/worlds/one.json', {version: 1, rules: [], dialogues: [], atmosphere: []});
    write('tools/quests/one.json', {version: 1, quests: [{id: 'INVALID'}]});
    expect(() => Content.build(root)).toThrow('tools/quests/one.json'); expect(fs.readFileSync(file)).toEqual(before);
});

test('repository event rules extend Platform flows without sharing block IDs or mutating the remote definition', () => {
    write('tools/worlds/one.json', {version: 1, rules: [rule], dialogues: [], atmosphere: []});
    const remote = {handlers: [{idx: 1000005, type: 'player.spawned', then: [{idx: 1000008, type: 'has.level', true: [{idx: 1000010, type: 'send_notification'}]}]}]};
    const before = JSON.stringify(remote), combined = Content.mergeFlow('world_one', remote, root);
    expect(JSON.stringify(remote)).toBe(before); expect(combined.handlers).toHaveLength(2);
    expect(combined.handlers[1].idx).toBeGreaterThan(1000010);
    expect(Content.mergeFlow('one', undefined, root).handlers[0].type).toBe('player.spawned');
    write('tools/worlds/one.json', {version: 1, rules: [], dialogues: [], atmosphere: []});
    expect(Content.mergeFlow('one', remote, root)).toBe(remote);
});

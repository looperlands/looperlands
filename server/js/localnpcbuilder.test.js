const fs = require('fs');
const path = require('path');
const os = require('os');
jest.mock('./lib/class', () => {const exports = {}; require('vm').runInNewContext(require('fs').readFileSync(require.resolve('./lib/class'), 'utf8'), {exports}); return exports;});
global.Types = {};
const Types = require('../../shared/js/gametypes');
const {definitions} = require('./worlddefinitions');
const {readBehavior, saveBehavior, placements, install} = require('./localnpcbuilder');
const {loadConfig, NpcBehavior} = require('./npcbehavior');
const {NpcMemory} = require('./npcmemory');
const WorldTime = require('../../client/js/worldtime-worker');
let root;
const routine = () => ({key: 'town-watch', label: 'Town watch', kind: 'guard', preset: 'patrol',
    origin: {x: 5, y: 5}, area: {x: 1, y: 1, width: 18, height: 18}, stepMs: 600,
    preserveDialogue: true, route: [{x: 6, y: 5, waitSeconds: 5}], lines: {greeting: ['Hello']}, questIds: ['STORY']});
const base = () => ({enabled: true, npcs: [routine()], conversations: [], speech: {radius: 14, cooldownSeconds: 20, greetingCooldownSeconds: 180}});
const map = () => ({width: 20, height: 20, collisions: [7*20+7], staticEntities: {105: 'guard', 168: 'villager'}, doors: []});
function write(relative, data) {const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, JSON.stringify(data));}
beforeEach(() => {root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-npc-')); write('server/config.json', {maps: ['fixture', 'empty']}); write('server/maps/world_server_fixture.json', map()); write('server/maps/world_server_empty.json', {...map(), staticEntities: {}});});
afterEach(() => {definitions.maps.delete('fixture'); fs.rmSync(root, {recursive: true, force: true});});
function save(npc, initial = readBehavior(root, 'fixture', base())) {return saveBehavior(root, {mapId: 'fixture', revision: initial.revision, originalKey: npc.key === 'town-watch' ? npc.key : undefined, npc}, base());}
test('loads bundled routines and correctly decodes actual static NPC placements', () => {
    const result = readBehavior(root, 'fixture', base());
    expect(result.config).toEqual(base()); expect(result.customized).toEqual([]);
    expect(result.placements).toEqual([{kind: 'guard', x: 5, y: 5}, {kind: 'villager', x: 8, y: 8}]);
    expect(placements({width: 20, staticEntities: {20: 'guard', 1: 'rat'}})).toEqual([{kind: 'guard', x: 20, y: 0}]);
});
test('editing one routine preserves quest links and global settings; stale saves and resets are guarded', () => {
    const before = readBehavior(root, 'fixture', base()), npc = {...routine(), stepMs: 450};
    const saved = save(npc, before);
    expect(saved.config.speech).toEqual(base().speech); expect(saved.config.npcs[0].questIds).toEqual(['STORY']);
    expect(saved.customized).toEqual(['town-watch']);
    expect(() => save(npc, before)).toThrow('another tab');
    const reset = saveBehavior(root, {mapId: 'fixture', revision: saved.revision, resetKey: 'town-watch'}, base());
    expect(reset.config).toEqual(base());
});
test('a new routine is loaded on the next game start and the engine runs its saved schedule', () => {
    const npc = {...routine(), key: 'neighbour', kind: 'villager', origin: {x: 8, y: 8}, route: [{x: 9, y: 8, waitSeconds: 1}]};
    npc.schedule = {buildings: [], phases: [{at: 0, key: 'work', activity: 'working', label: 'market', location: 'outside', explanation: 'At work.', travelling: 'walking to work', route: npc.route}, {at: 12, key: 'sleep', activity: 'sleeping', label: 'garden', location: 'outside', explanation: 'Resting.', travelling: 'going to rest', route: [{x: 10, y: 8, waitSeconds: 1}]}]};
    save(npc); definitions.register('fixture', {id: 'base', npcBehavior: base()});
    const config = loadConfig('fixture', root); expect(config.npcs).toHaveLength(2); expect(config.npcs[1]).toEqual(npc);
    let now = 1000;
    const entities = {1: {id: 1, type: 'npc', kind: Types.Entities.GUARD, x: 5, y: 5}, 2: {id: 2, type: 'npc', kind: Types.Entities.VILLAGER, x: 8, y: 8}};
    const world = {id: 'world_fixture', npcs: entities, entities, players: {}, map: {doors: [], isOutOfBounds: () => false, isColliding: () => false}, moveNpc: jest.fn(), pushToAdjacentGroups: jest.fn()};
    const engine = new NpcBehavior(world, config, new NpcMemory(), () => now, () => WorldTime.duration*0.6);
    const saved = engine.routines.get('neighbour'); saved.schedule.prepare(now); expect(saved.schedule.phase.key).toBe('sleep'); expect(saved.schedule.destination()).toMatchObject({x: 10, y: 8});
    const updated = readBehavior(root, 'fixture', base()); updated.config.npcs[1].stepMs = 750;
    saveBehavior(root, {mapId: 'fixture', revision: updated.revision, originalKey: npc.key, npc: updated.config.npcs[1]}, base());
    expect(loadConfig('fixture', root).npcs[1].stepMs).toBe(750); // No require cache for authored JSON.
});
test('routines can be authored on maps with no bundled behaviours and removed again', () => {
    const before = readBehavior(root, 'fixture', null); const npc = routine();
    const saved = saveBehavior(root, {mapId: 'fixture', revision: before.revision, npc}, null);
    expect(loadConfig('fixture', root).npcs[0]).toEqual(npc);
    const reset = saveBehavior(root, {mapId: 'fixture', revision: saved.revision, resetKey: npc.key}, null);
    expect(reset.config.npcs).toEqual([]); expect(loadConfig('fixture', root)).toBeNull();
});
test.each(['../fixture', 'fixture/other', 'unknown', null, ['fixture']])('rejects invalid map path %j', value => {expect(() => readBehavior(root, value, null)).toThrow();});
test('rejects source symlinks and unsupported file versions', () => {
    fs.mkdirSync(path.join(root, 'tools/npcs'), {recursive: true}); const link = path.join(root, 'tools/npcs/fixture.json'); fs.symlinkSync(path.join(root, 'server/config.json'), link);
    expect(() => readBehavior(root, 'fixture', null)).toThrow('symbolic'); fs.unlinkSync(link); write('tools/npcs/fixture.json', {version: 2, npcs: []}); expect(() => readBehavior(root, 'fixture', null)).toThrow('source');
});
test('rejects missing spawns, collisions, duplicate actors, invalid schedules and ID renames without writing', () => {
    for (const change of [n => {n.origin.x = 6;}, n => {n.route[0] = {x: 7, y: 7, waitSeconds: 1};}, n => {n.route = [];}, n => {n.lines.greeting = ['<b>Hi</b>'];}, n => {n.stepMs = 30;}, n => {n.key = 'duplicate';}, n => {n.schedule = {buildings: [], phases: [{at: 4}]};}]) {
        const npc = routine(); change(npc); expect(() => save(npc)).toThrow();
    }
    const initial = readBehavior(root, 'fixture', base());
    expect(() => saveBehavior(root, {mapId: 'fixture', revision: initial.revision, originalKey: 'old-id', npc: routine()}, base())).toThrow('renamed');
    expect(fs.existsSync(path.join(root, 'tools/npcs/fixture.json'))).toBe(false);
});
test.each(['tnft','titem','tquest','tlevel','tweapon_level','ttime_range','ttid','tcollection','thttp_redirect','tmap'])('refuses gated building travel: %s', gate => {
    const source = map(); source.doors = [{x: 2, y: 2, tx: 12, ty: 12, [gate]: 'rule'}, {x: 12, y: 12, tx: 2, ty: 2}]; write('server/maps/world_server_fixture.json', source);
    const npc = routine(); npc.schedule = {buildings: [{key: 'home', label: 'Home', entrance: {x: 2, y: 2}, exit: {x: 12, y: 12}, area: {x: 10, y: 10, width: 5, height: 5}}], phases: [{at: 0, key: 'sleep', activity: 'sleeping', label: 'home', location: 'home', explanation: 'Resting.', travelling: 'going home', route: [{x: 13, y: 12, waitSeconds: 1}]}]};
    expect(() => save(npc)).toThrow('public return door');
});
test('valid public building travel saves while a blocked phase route is rejected', () => {
    const source = map(); source.doors = [{x: 2, y: 2, tx: 12, ty: 12}, {x: 12, y: 12, tx: 2, ty: 2}]; write('server/maps/world_server_fixture.json', source);
    const npc = routine(); npc.schedule = {buildings: [{key: 'home', label: 'Home', entrance: {x: 2, y: 2}, exit: {x: 12, y: 12}, area: {x: 10, y: 10, width: 5, height: 5}}], phases: [{at: 0, key: 'sleep', activity: 'sleeping', label: 'home', location: 'home', explanation: 'Resting.', travelling: 'going home', route: [{x: 13, y: 12, waitSeconds: 1}]}]};
    expect(save(npc).config.npcs[0]).toEqual(npc);
    source.collisions.push(12*20+13); write('server/maps/world_server_fixture.json', source); expect(() => save(npc)).toThrow('Blocked');
});
test('API refuses saves during builds and shutdown; map metadata is available before game readiness', () => {
    const routes = {}, app = {get: (route, handler) => {routes['GET '+route] = handler;}, post: (route, handler) => {routes['POST '+route] = handler;}}, toolbox = {root, job: {status: 'running'}};
    install(app, toolbox); const res = {json: jest.fn(), status: jest.fn().mockReturnThis()};
    routes['GET /local/api/npcs']({query: {}}, res); expect(res.json).toHaveBeenCalledWith({maps: ['fixture', 'empty']});
    routes['POST /local/api/npcs']({body: {}}, res); expect(res.status).toHaveBeenLastCalledWith(409);
    toolbox.closed = true; routes['POST /local/api/npcs']({body: {}}, res); expect(res.status).toHaveBeenLastCalledWith(503);
});

test('routine, waypoint and schedule speech preserve supported styles after save and runtime reload', () => {
    const npc = routine();
    npc.lines.greeting = ['<span class="dialogue-wave">Welcome!</span>'];
    npc.route[0].line = 'Bring <span class="dialogue-item">wood</span>.';
    npc.schedule = {buildings: [], phases: [{at: 0, key: 'work', activity: 'working', label: 'market', location: 'outside',
        explanation: '<span class="dialogue-danger dialogue-shake">Busy!</span>', travelling: 'walking to work', route: npc.route}]};
    save(npc); definitions.register('fixture', {id: 'base', npcBehavior: base()});
    expect(loadConfig('fixture', root).npcs[0]).toEqual(npc);
    for (const line of ['{{remaining}}', '<span class="dialogue-wave" onclick="bad()">Hi</span>']) {
        npc.schedule.phases[0].explanation = line;
        expect(() => save(npc)).toThrow();
    }
});

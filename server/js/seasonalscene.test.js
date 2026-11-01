global.Types = {};
jest.mock('./lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('./lib/class'), 'utf8'), {exports});
    return exports;
});
jest.mock('./npc', () => class {
    constructor(id, kind, x, y) {Object.assign(this, {id, kind, type: 'npc', x, y});}
    despawn() {return {id: this.id};}
});
const fs = require('fs'), os = require('os'), path = require('path');
const {SeasonalScene} = require('./seasonalscene');
const Availability = require('./contentavailability');
const {WorldDefinitions} = require('./worlddefinitions');
function event(id, start = '10-01', end = '10-03', x = 3) {
    return {id, name: id, enabled: true, availability: {annual: {start, end}},
        actors: [{key: id + ':host', kind: 'guard', label: id + ' host', x, y: 3}],
        decorations: [{image: '/img/1/item-m88npumpkin.png', x, y: 4}],
        tiles: [{x, y: 5, from: 1, to: 2}],
        ambientSounds: [{id: 'fire', name: id + ' fire', preset: 'campfire', x, y: 3, radius: 5, volume: .3}],
        parallax: [{sceneId: 'one', layers: [{image: '/img/parallax/mist.png', plane: 'ground', width: 64, height: 64, opacity: .2}]}]};
}
function worldFixture() {
    const ordinary = {id: 100, type: 'npc', x: 10, y: 10};
    const world = {id: 'world_one', map: {width: 20, height: 20, scenes: [{id: 'one', x: 0, y: 0, w: 20, h: 20}],
        doors: [], isOutOfBounds: (x, y) => x <= 0 || y <= 0 || x >= 20 || y >= 20, isColliding: () => false},
    entities: {100: ordinary}, npcs: {100: ordinary}, players: {}, server: {cache: {get: () => ({gameData: {}})}},
    isValidPosition: () => true, pushToAdjacentGroups: jest.fn(), pushToGroup: jest.fn(), pushToPlayer: jest.fn(),
    addEntity(npc) {this.entities[npc.id] = npc;}, removeEntity(npc) {delete this.entities[npc.id]; delete this.npcs[npc.id];},
    moveNpc: jest.fn((npc, x, y) => {npc.x = x; npc.y = y;})};
    return {world, ordinary};
}
const createNpc = (id, kind, x, y) => ({id, kind, x, y, type: 'npc', despawn: () => ({id})});

test('two independent events compose, close and return without replacing each other or permanent world content', () => {
    const first = event('autumn'), second = event('lanterns', '10-02', '10-04', 6);
    const {world, ordinary} = worldFixture(), mapBefore = structuredClone(world.map.scenes);
    let now = Date.parse('2026-09-30T23:59:59Z'), nextId = 100;
    const scene = new SeasonalScene(world, [first, second], {createNpc, allocateId: () => nextId++, isAvailable: schedule => Availability.isAvailable(schedule, now)});
    expect(scene.actors.size).toBe(0); expect(scene.packet().rendererExtensions).toEqual([]);
    now = Date.parse('2026-10-01T00:00:00Z'); scene.tick();
    const firstNpc = scene.actors.get('autumn:host'); expect(firstNpc.id).toBe(101);
    expect(scene.packet().rendererExtensions[0].data.decorations).toEqual(first.decorations);
    now = Date.parse('2026-10-02T00:00:00Z'); scene.tick();
    const secondNpc = scene.actors.get('lanterns:host'), packet = scene.packet();
    expect(secondNpc.id).not.toBe(firstNpc.id);
    expect(new Set(packet.rendererExtensions.map(extension => extension.id)).size).toBe(3);
    expect(packet.rendererExtensions[0].data).toEqual({decorations: [...first.decorations, ...second.decorations], tiles: [...first.tiles, ...second.tiles]});
    expect(packet.rendererExtensions[1].data.scenes).toHaveLength(1);
    expect(packet.rendererExtensions[1].data.scenes[0].layers).toHaveLength(2);
    expect(packet.ambientSounds.map(sound => sound.id)).toEqual(['autumn:fire', 'lanterns:fire']);
    now = Date.parse('2026-10-03T00:00:00Z'); scene.tick();
    expect(scene.actors.has('autumn:host')).toBe(false); expect(scene.actors.get('lanterns:host')).toBe(secondNpc);
    expect(scene.packet().rendererExtensions[0].data.tiles).toEqual(second.tiles);
    expect(world.entities[100]).toBe(ordinary);
    now = Date.parse('2026-10-04T00:00:00Z'); scene.tick();
    expect(world.npcs).toEqual({100: ordinary}); expect(scene.packet()).toEqual({rendererExtensions: [], ambientSounds: []});
    expect(world.map.scenes).toEqual(mapBefore);
    now = Date.parse('2027-10-01T00:00:00Z'); scene.tick();
    expect(scene.actors.get('autumn:host').id).not.toBe(firstNpc.id);
});

test('occupied arrival tiles delay only their actor, and disabled events never spawn', () => {
    const first = event('autumn'), disabled = {...event('closed', '10-01', '10-03', 6), enabled: false};
    const {world} = worldFixture(); world.entities.player = {x: 3, y: 3, type: 'player'};
    const scene = new SeasonalScene(world, [first, disabled], {createNpc, isAvailable: schedule => Availability.isAvailable(schedule, Date.parse('2026-10-02T00:00:00Z'))});
    expect(scene.actors.size).toBe(0);
    delete world.entities.player; scene.tick();
    expect([...scene.actors.keys()]).toEqual(['autumn:host']);
});

test('the registry loads custom events from its source root and starts patrols on a map without a base NPC engine', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'season-runtime-'));
    const source = event('spring', '04-01', '04-04');
    source.actors[0].greeting = 'Welcome to the spring fair.';
    source.actors[0].area = {x: 1, y: 1, width: 12, height: 12};
    source.actors[0].route = [{x: 4, y: 3, waitSeconds: 1}, {x: 3, y: 3, waitSeconds: 1}];
    try {
        fs.mkdirSync(path.join(root, 'server'), {recursive: true}); fs.mkdirSync(path.join(root, 'tools/seasons'), {recursive: true});
        fs.writeFileSync(path.join(root, 'server/config.json'), JSON.stringify({maps: ['one']}));
        fs.writeFileSync(path.join(root, 'tools/seasons/one.json'), JSON.stringify({version: 1, events: [source]}));
        const registry = require('../world-definitions').register(new WorldDefinitions(), {root, local: false});
        expect(registry.behavior('one')).toMatchObject({enabled: true, npcs: []});
        const dialogue = registry.dialogues('one').find(row => row.key === 'spring:host');
        expect(dialogue.nodes.greeting.text).toBe(source.actors[0].greeting);
        expect(Availability.isAvailable(dialogue.availability, Date.parse('2026-04-02T00:00:00Z'))).toBe(true);
        expect(Availability.isAvailable(dialogue.availability, Date.parse('2026-04-04T00:00:00Z'))).toBe(false);
        jest.useFakeTimers().setSystemTime(new Date('2026-04-02T00:00:00Z'));
        const {world} = worldFixture();
        world.players.observer = {id: 'observer', x: 8, y: 8, hasEnteredGame: true, isBot: () => false};
        world.entities.observer = world.players.observer;
        let time = 100000;
        world.npcBehavior = new (require('./npcbehavior').NpcBehavior)(world, registry.behavior('one'), new (require('./npcmemory').NpcMemory)(), () => time);
        const scene = registry.create(world).get('seasonal-content');
        expect(scene.actors.has('spring:host')).toBe(true);
        time += 2000; world.npcBehavior.tick();
        expect(world.moveNpc).toHaveBeenCalledWith(scene.actors.get('spring:host'), 4, 3, false);
        source.enabled = false;
        fs.writeFileSync(path.join(root, 'tools/seasons/one.json'), JSON.stringify({version: 1, events: [source]}));
        const fresh = require('../world-definitions').register(new WorldDefinitions(), {root, local: false});
        expect(fresh.create(worldFixture().world).get('seasonal-content').actors.size).toBe(0);
        expect(Availability.isAvailable(fresh.dialogues('one')[0].availability)).toBe(false);
    } finally {jest.useRealTimers(); fs.rmSync(root, {recursive: true, force: true});}
});

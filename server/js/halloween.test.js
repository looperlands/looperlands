global.Types = {};
// The real message classes use this legacy helper's sloppy-mode arguments.callee.
jest.mock('./lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('./lib/class'), 'utf8'), {exports});
    return exports;
});
const fs = require('fs');
const path = require('path');
const {HalloweenScene, placements} = require('./halloween');
const Availability = require('./contentavailability');
const scenery = require('../world-definitions/halloween-scenery');
const {createParallax} = require('../world-definitions/halloween-parallax');
const story = require('../world-definitions/halloween-story');
const Types = require('../../shared/js/gametypes');

function fixture(options = {}) {
    const world = {map: {width: 172, height: 500}, entities: {}, npcs: {},
        isValidPosition: jest.fn(() => true),
        npcBehavior: {registerRoutine: jest.fn(), routines: new Map()},
        addEntity(npc) {this.entities[npc.id] = npc;},
        removeEntity(npc) {delete this.entities[npc.id]; delete this.npcs[npc.id];},
        pushToAdjacentGroups: jest.fn()};
    const createNpc = (id, kind, x, y) => ({id, kind, x, y, group: 'town', despawn: () => ({id})});
    const scene = new HalloweenScene(world, {createNpc, ...options});
    return {world, scene};
}

test.each([
    [{annual: {start: '10-15', end: '11-09'}}, '2026-10-15T00:00:00Z', '2026-11-09T00:00:00Z'],
    [{startsAt: '2026-11-01T12:00:00Z', endsAt: '2026-11-01T13:00:00Z'}, '2026-11-01T12:00:00Z', '2026-11-01T13:00:00Z']
])('calendar window %j controls all scenery and actors while players remain connected', (availability, start, end) => {
    let now = Date.parse(start) - 1;
    const {world, scene} = fixture({availability, isAvailable: schedule => Availability.isAvailable(schedule, now)});
    expect(Object.keys(world.npcs)).toHaveLength(0);
    expect(scene.packet()).toEqual({rendererExtensions: [], ambientSounds: []});
    now++;
    scene.tick();
    expect(Object.keys(world.npcs)).toHaveLength(placements.length);
    const original = {...world.npcs};
    scene.tick();
    expect(world.npcs).toEqual(original);
    expect(world.npcBehavior.registerRoutine).toHaveBeenCalledTimes(3);
    for (const actor of placements.filter(p => p.route)) expect(world.npcBehavior.registerRoutine).toHaveBeenCalledWith(expect.objectContaining({key: actor.key, area: actor.area}));
    expect(scene.packet().rendererExtensions).toHaveLength(3);
    expect(scene.packet().ambientSounds).toHaveLength(2);
    const ordinary = {id: 99, x: 10, y: 10};
    world.entities[99] = ordinary; world.npcs[99] = ordinary;
    now = Date.parse(end);
    expect(scene.packet().rendererExtensions).toEqual([]);
    scene.tick();
    expect(world.npcs).toEqual({99: ordinary});
    expect(world.entities).toEqual({99: ordinary});
    expect(world.pushToAdjacentGroups).toHaveBeenCalledTimes(placements.length);
    now = Date.parse(start);
    scene.tick();
    expect(Object.keys(world.npcs)).toHaveLength(placements.length + 1);
});

test('arrival waits for occupied tiles and does not depend on daily NPC schedules', () => {
    let active = false;
    const {world, scene} = fixture({isAvailable: () => active});
    delete world.npcBehavior;
    const witch = placements[0];
    world.entities[7] = {id: 7, x: witch.x, y: witch.y};
    active = true; scene.tick();
    expect(scene.actors.has(witch.key)).toBe(false);
    delete world.entities[7]; scene.tick();
    expect(scene.actors.get(witch.key).behaviorState.label).toContain('Whispy');
    active = false; scene.tick();
    expect(world.npcs).toEqual({});
});

test('authored actors, routes and visual substitutions match the checked-in main map', () => {
    const root = path.resolve(__dirname, '../..');
    const server = JSON.parse(fs.readFileSync(path.join(root, 'server/maps/world_server_main.json')));
    const client = JSON.parse(fs.readFileSync(path.join(root, 'client/maps/world_client_main.json')));
    const blocked = new Set(server.collisions), occupied = new Set(Object.keys(server.staticEntities).map(Number));
    const doors = new Set(server.doors.map(door => door.x + ',' + door.y));
    const walkable = p => p.x > 0 && p.y > 0 && p.x < server.width && p.y < server.height &&
        !blocked.has(p.y * server.width + p.x) && !doors.has(p.x + ',' + p.y);
    for (const actor of placements) {
        expect(Types.isNpc(Types.getKindFromString(actor.kind))).toBe(true);
        expect(story.dialogues.find(dialogue => dialogue.key === actor.key)).toMatchObject({npc: Types.getKindFromString(actor.kind), name: actor.label});
        expect(walkable(actor)).toBe(true);
        expect(occupied.has(actor.y * server.width + actor.x)).toBe(false);
        for (const stop of actor.route || []) expect(walkable(stop)).toBe(true);
    }
    // Each loop has a real path between stops, within the routine's authored area.
    for (const actor of placements.filter(p => p.route)) {
        let start = actor;
        for (const target of actor.route) {
            const queue = [start], visited = new Set([start.x + ',' + start.y]);
            for (let i = 0; i < queue.length; i++) {
                const p = queue[i];
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const next = {x: p.x + dx, y: p.y + dy}, key = next.x + ',' + next.y;
                    const area = actor.area;
                    if (!walkable(next) || occupied.has(next.y * server.width + next.x) || next.x < area.x || next.x >= area.x + area.width ||
                        next.y < area.y || next.y >= area.y + area.height || visited.has(key)) continue;
                    visited.add(key); queue.push(next);
                }
            }
            expect(visited.has(target.x + ',' + target.y)).toBe(true);
            start = target;
        }
    }
    for (const tile of scenery.tiles) expect([client.data[tile.y * client.width + tile.x]].flat()).toContain(tile.from);
    for (const decoration of scenery.decorations) {
        expect(fs.existsSync(path.join(root, 'client', decoration.image))).toBe(true);
        expect(walkable(decoration)).toBe(true);
        expect(occupied.has(decoration.y * server.width + decoration.x)).toBe(false);
    }
    const parallax = createParallax(server.scenes);
    for (const scene of parallax.scenes) {
        const {id, x, y, w, h} = scene;
        expect(client.scenes.find(candidate => candidate.id === id)).toMatchObject({x, y, w, h});
        for (const layer of scene.layers) expect(fs.existsSync(path.join(root, 'client', layer.image))).toBe(true);
    }
});

test('all three procession ghosts walk and repeat every stop without overlapping main-map occupants', () => {
    const ServerMap = require('./map');
    const {NpcBehavior} = require('./npcbehavior');
    const {NpcMemory} = require('./npcmemory');
    const map = Object.create(ServerMap.prototype);
    map.initMap(require('../maps/world_server_main.json'));
    map.generateCollisionGrid();
    let now = 1000000;
    const player = {id: 'observer', type: 'player', x: 19, y: 132, hasEnteredGame: true, isBot: () => false};
    const world = {id: 'world_main', map, npcs: {}, entities: {observer: player}, players: {observer: player},
        server: {cache: {get: () => ({gameData: {}})}},
        pushToAdjacentGroups: jest.fn(), pushToGroup: jest.fn(), pushToPlayer: jest.fn(),
        isValidPosition: (x, y) => !map.isOutOfBounds(x, y) && !map.isColliding(x, y),
        addEntity(npc) {this.entities[npc.id] = npc;},
        moveNpc: jest.fn((npc, x, y) => {
            expect(Math.abs(npc.x - x) + Math.abs(npc.y - y)).toBe(1);
            expect(world.npcBehavior.walkable({x, y})).toBe(true);
            expect(world.npcBehavior.occupied({x, y}, npc)).toBe(false);
            npc.x = x; npc.y = y;
        })};
    // Match worldserver's static spawn coordinates and blocking entity types.
    for (const [tile, name] of Object.entries(map.staticEntities)) {
        const kind = Types.getKindFromString(name), point = map.tileIndexToGridPosition(Number(tile));
        const id = 'static-' + tile;
        world.entities[id] = {id, kind, x: point.x + 1, y: point.y,
            type: Types.isNpc(kind) ? 'npc' : Types.isMob(kind) ? 'mob' : 'item'};
    }
    for (const [index, chest] of map.staticChests.entries()) {
        const id = 'chest-' + index;
        world.entities[id] = {id, type: 'chest', x: chest.x, y: chest.y};
    }
    world.npcBehavior = new NpcBehavior(world, {enabled: true, npcs: []}, new NpcMemory(), () => now);
    const scene = new HalloweenScene(world, {isAvailable: () => true,
        createNpc: (id, kind, x, y) => ({id, kind, type: 'npc', x, y, group: 'graveyard'})});
    expect(scene.actors.size).toBe(placements.length);
    const routines = [...world.npcBehavior.routines.values()];
    expect(routines).toHaveLength(3);
    const arrivals = new Map(routines.map(routine => [routine.definition.key, []]));
    // Tick the real controller: nextStep, stop waits and occupied paths remain active.
    for (const end = now + 180000; now < end; now += 200) {
        const targets = routines.map(routine => ({waypoint: routine.waypoint, target: routine.definition.route[routine.waypoint]}));
        world.npcBehavior.tick();
        routines.forEach((routine, index) => {
            const {waypoint, target} = targets[index];
            if (routine.waypoint !== waypoint && routine.npc.x === target.x && routine.npc.y === target.y) {
                arrivals.get(routine.definition.key).push({x: target.x, y: target.y});
            }
        });
        expect(new Set([...scene.actors.values()].map(npc => npc.x + ',' + npc.y)).size).toBe(placements.length);
    }
    for (const routine of routines) {
        const route = routine.definition.route.map(({x, y}) => ({x, y}));
        expect(route.at(-1)).toEqual(routine.definition.origin);
        expect(arrivals.get(routine.definition.key).slice(0, route.length * 2)).toEqual([...route, ...route]);
        expect(world.moveNpc.mock.calls.some(([npc]) => npc === routine.npc)).toBe(true);
    }
});

test('the Halloween adventure spans four connected main-map regions with audio at its relocated source', () => {
    const map = require('../maps/world_server_main.json');
    const regions = {
        Town: ['witch'], Forest: ['footprints', 'pumpkin'],
        Graveyard: ['gravedigger-left', 'gravedigger-right', 'memorial', 'procession-1', 'procession-2', 'procession-3'],
        Beach: ['well', 'keepsake']
    };
    const inside = (point, area) => point.x >= area.x && point.x < area.x + (area.w ?? area.width) &&
        point.y >= area.y && point.y < area.y + (area.h ?? area.height);
    const blocked = new Set(map.collisions), occupied = new Set(Object.keys(map.staticEntities).map(Number));
    const doors = new Set(map.doors.map(door => door.y * map.width + door.x));
    const start = placements.find(actor => actor.key === 'halloween:witch');
    const queue = [start], reachable = new Set([start.y * map.width + start.x]);
    for (let i = 0; i < queue.length; i++) {
        const point = queue[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const next = {x: point.x + dx, y: point.y + dy}, index = next.y * map.width + next.x;
            if (next.x < 0 || next.x >= map.width || next.y < 0 || next.y >= map.height || blocked.has(index) ||
                occupied.has(index) || doors.has(index) || reachable.has(index)) continue;
            reachable.add(index); queue.push(next);
        }
    }
    expect(new Set(placements.map(p => p.x + ',' + p.y)).size).toBe(placements.length);
    for (const [name, keys] of Object.entries(regions)) {
        const region = map.scenes.find(scene => scene.name === name);
        for (const key of keys) {
            const actor = placements.find(p => p.key === 'halloween:' + key);
            expect(inside(actor, region)).toBe(true);
            expect(reachable.has(actor.y * map.width + actor.x)).toBe(true);
            // Keep relocated investigations outside authored enemy spawn areas;
            // Whispy retains her existing place in Town's rat area.
            if (key !== 'witch') expect(map.roamingAreas.some(area => inside(actor, area))).toBe(false);
        }
        expect(scenery.decorations.some(point => inside(point, region))).toBe(true);
    }
    const well = placements.find(actor => actor.key === 'halloween:well');
    expect(scenery.ambientSounds.find(sound => sound.id === 'well')).toMatchObject({x: well.x, y: well.y});
});

test('seasonal NPC animation frames fit their spritesheets at every supported scale', () => {
    const root = path.resolve(__dirname, '../..');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'shared/js/mapmakerentities.json')));
    for (const kind of new Set(placements.map(actor => actor.kind))) {
        const sprite = JSON.parse(fs.readFileSync(path.join(root, 'client/sprites', kind + '.json')));
        const registration = manifest.find(entity => entity.id === kind);
        if (registration) expect(registration.sprite).toEqual(sprite);
        for (const scale of [1, 2, 3]) {
            const png = fs.readFileSync(path.join(root, 'client/img', String(scale), kind + '.png'));
            const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
            for (const animation of Object.values(sprite.animations)) {
                expect(animation.length * sprite.width * scale).toBeLessThanOrEqual(width);
                expect((animation.row + 1) * sprite.height * scale).toBeLessThanOrEqual(height);
            }
        }
    }
});

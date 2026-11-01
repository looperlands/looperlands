global.Types = {};
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
                    if (!walkable(next) || next.x < 25 || next.x >= 49 || next.y < 207 || next.y >= 227 || visited.has(key)) continue;
                    visited.add(key); queue.push(next);
                }
            }
            expect(visited.has(target.x + ',' + target.y)).toBe(true);
            start = target;
        }
    }
    for (const tile of scenery.tiles) expect([client.data[tile.y * client.width + tile.x]].flat()).toContain(tile.from);
    for (const decoration of scenery.decorations) expect(fs.existsSync(path.join(root, 'client', decoration.image))).toBe(true);
    const parallax = createParallax(server.scenes);
    for (const scene of parallax.scenes) {
        const {id, x, y, w, h} = scene;
        expect(client.scenes.find(candidate => candidate.id === id)).toMatchObject({x, y, w, h});
        for (const layer of scene.layers) expect(fs.existsSync(path.join(root, 'client', layer.image))).toBe(true);
    }
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

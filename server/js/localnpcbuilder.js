const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Types = require('../../shared/js/gametypes');
const {WorldDefinitions} = require('./worlddefinitions');
const {validateConfig} = require('./npcbehaviorconfig');
const {NpcSchedule} = require('./npcschedule');
const {filename, readOverrides, mergeBehavior} = require('./npcbehaviorfiles');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const hash = data => crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
function maps(root) {return JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;}
function checkMap(root, mapId) {if (!maps(root).includes(mapId)) fail('Choose a configured map.'); filename(root, mapId);}
function bundled(mapId) {
    return require('../world-definitions').register(new WorldDefinitions(), {local: false}).behavior(mapId);
}
function readMap(root, mapId) {
    const file = path.join(root, 'server/maps/world_server_' + mapId + '.json');
    if (!fs.existsSync(file)) fail('Build this map first to load its NPC placements and collision data.', 404);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function placements(map) {
    return Object.entries(map.staticEntities || {}).flatMap(([index, value]) => {
        const kind = typeof value === 'number' ? value : Types.getKindFromString(value);
        const tile = Number(index) - 1;
        return Types.isNpc(kind) ? [{kind: Types.getKindAsString(kind), x: tile % map.width + 1, y: Math.floor(tile / map.width)}] : [];
    });
}
function readBehavior(root, mapId, base = bundled(mapId)) {
    checkMap(root, mapId);
    const overrides = readOverrides(root, mapId), config = mergeBehavior(base, overrides), map = readMap(root, mapId);
    return {mapId, config, revision: hash({base, overrides}), source: 'tools/npcs/' + mapId + '.json',
        customized: overrides.npcs.map(npc => npc.key), bundled: (base?.npcs || []).map(npc => npc.key),
        placements: placements(map), dimensions: {width: map.width, height: map.height}, requiresRestart: true};
}
function validateRoutine(npc, config, map) {
    if (!npc || typeof npc !== 'object' || !/^[a-z][a-z0-9_-]{1,79}$/.test(npc.key) ||
        typeof npc.label !== 'string' || !npc.label.trim() || npc.label.length > 100 || /[<>]/.test(npc.label)) fail('Use a unique routine ID and a plain-text name.');
    if (npc.route?.length > 100 || npc.schedule?.phases?.length > 48 || npc.schedule?.buildings?.length > 30) fail('Use at most 100 waypoints, 48 phases and 30 buildings.');
    const duplicate = config.npcs.find(row => row.key !== npc.key && row.kind === npc.kind && row.origin.x === npc.origin?.x && row.origin.y === npc.origin?.y);
    if (duplicate) fail('This NPC placement already has a routine: ' + duplicate.key);
    if (!placements(map).some(row => row.kind === npc.kind && row.x === npc.origin?.x && row.y === npc.origin?.y)) fail('The NPC does not exist at this origin in the built map. Place it in Tiled and build that map first.');
    try {validateConfig({...config, npcs: config.npcs.map(row => row.key === npc.key ? npc : row).concat(config.npcs.some(row => row.key === npc.key) ? [] : [npc])});}
    catch (error) {fail(error.message);}
    const collisions = new Set(map.collisions || []), doors = Object.values(map.doors || {});
    const walkable = (p, allowDoor = false) => Number.isInteger(p.x) && Number.isInteger(p.y) && p.x > 0 && p.y > 0 && p.x < map.width && p.y < map.height && !collisions.has(p.y * map.width + p.x) && (allowDoor || !doors.some(d => d.x === p.x && d.y === p.y));
    if (!walkable(npc.origin) || npc.route.some(p => !walkable(p))) fail('The origin and route must use walkable tiles away from door landings.');
    const areas = [npc.area, ...(npc.schedule?.buildings || []).map(b => b.area)];
    if (areas.some(a => a.x < 0 || a.y < 0 || a.x + a.width > map.width || a.y + a.height > map.height)) fail('Movement areas must stay inside the map.');
    if (npc.schedule) {
        if (npc.schedule.phases.some(p => p.route.length > 100)) fail('Use at most 100 waypoints per phase.');
        try {new NpcSchedule({world: {map: {doors}}, walkable}, {definition: structuredClone(npc)});}
        catch (error) {fail(error.message);}
    }
}
function saveBehavior(root, input, base = bundled(input?.mapId)) {
    checkMap(root, input?.mapId);
    const current = readBehavior(root, input.mapId, base);
    if (current.revision !== input.revision) fail('NPC routines changed in another tab or on disk. Reload routines and reapply your changes.', 409);
    const overrides = readOverrides(root, input.mapId);
    if (input.resetKey) {
        if (!overrides.npcs.some(npc => npc.key === input.resetKey)) fail('This routine has no saved override.');
        overrides.npcs = overrides.npcs.filter(npc => npc.key !== input.resetKey);
    } else {
        const npc = input.npc;
        if (input.originalKey && input.originalKey !== npc?.key) fail('Saved routine IDs cannot be renamed.');
        if (!input.originalKey && current.config.npcs.some(row => row.key === npc?.key)) fail('This routine ID is already in use.', 409);
        validateRoutine(npc, current.config, readMap(root, input.mapId));
        const index = overrides.npcs.findIndex(row => row.key === npc.key);
        if (index < 0) overrides.npcs.push(npc); else overrides.npcs[index] = npc;
    }
    const file = filename(root, input.mapId);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    const temp = file + '.' + crypto.randomUUID() + '.tmp';
    try {fs.writeFileSync(temp, JSON.stringify(overrides, null, 2) + '\n', {flag: 'wx'}); fs.renameSync(temp, file);}
    finally {fs.rmSync(temp, {force: true});}
    return readBehavior(root, input.mapId, base);
}
function install(app, toolbox) {
    const respond = callback => (req, res) => {try {res.json(callback(req));} catch (error) {res.status(error.status || 500).json({error: error.message});}};
    app.get('/local/api/npcs', respond(req => req.query.mapId === undefined ? {maps: maps(toolbox.root)} : readBehavior(toolbox.root, req.query.mapId)));
    app.post('/local/api/npcs', respond(req => {
        if (toolbox.closed) fail('The toolbox is shutting down.', 503);
        if (toolbox.job?.status === 'running') fail('Wait for the map build to finish before saving NPC routines.', 409);
        return saveBehavior(toolbox.root, req.body);
    }));
}
module.exports = {readBehavior, saveBehavior, validateRoutine, placements, install};

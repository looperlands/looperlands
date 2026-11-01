const fs = require('fs');
const path = require('path');
const Availability = require('./contentavailability');
const Environment = require('../../client/js/sceneenvironment');
const Ambient = require('../../client/js/ambientconfig');
const Types = require('../../shared/js/gametypes');

const MAX_BYTES = 1024 * 1024;
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const pointKey = point => point.x + ',' + point.y;
function fields(value, keys, label) {
    if (!object(value) || Object.keys(value).some(key => !keys.includes(key))) fail(label + ' contains unsupported fields.');
}
function list(value, max, label) {
    if (!Array.isArray(value) || value.length > max) fail(label + ' must contain at most ' + max + ' entries.');
}
function number(value, min, max, label, integer = false) {
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(label + ' must be ' + (integer ? 'a whole number ' : '') + 'between ' + min + ' and ' + max + '.');
}
function text(value, label, max = 120) {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[<>\u0000-\u001f]/.test(value)) fail(label + ' must be plain text, up to ' + max + ' characters.');
}
function safe(root, relative) {
    root = path.resolve(root);
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) fail('Invalid seasonal content path.');
    for (let current = file; current !== root; current = path.dirname(current)) {
        try {if (fs.lstatSync(current).isSymbolicLink()) fail('Seasonal content paths must not contain symbolic links.');}
        catch (error) {if (error.code !== 'ENOENT') throw error;}
    }
    return file;
}
function maps(root) {return JSON.parse(fs.readFileSync(safe(root, 'server/config.json'), 'utf8')).maps;}
function source(root, mapId) {
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !maps(root).includes(mapId)) fail('Choose a configured map.');
    return safe(root, 'tools/seasons/' + mapId + '.json');
}
function point(point, label, map) {
    number(point.x, 0, map ? map.width - 1 : 100000, label + ' X', true);
    number(point.y, 0, map ? map.height - 1 : 100000, label + ' Y', true);
}
function actor(row) {
    fields(row, ['key', 'kind', 'label', 'x', 'y', 'area', 'route', 'greeting'], 'Seasonal actor');
    if (typeof row.key !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}:[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(row.key)) fail('Actor keys need an event prefix and stable name, such as halloween:witch.');
    if (typeof row.kind !== 'string' || !Types.isNpc(Types.getKindFromString(row.kind))) fail('Choose a registered NPC kind.');
    text(row.label, 'Actor label'); point(row, 'Actor');
    if (row.greeting !== undefined) {
        if (row.greeting !== '') require('../../shared/js/dialogueformat').validate(row.greeting, 'Actor greeting', 400);
    }
    if ((row.area === undefined) !== (row.route === undefined)) fail('Moving actors need both a routine area and route.');
    if (row.route !== undefined) {
        fields(row.area, ['x', 'y', 'width', 'height'], 'Routine area');
        point(row.area, 'Routine area');
        for (const dimension of ['width', 'height']) number(row.area[dimension], 1, 1000, 'Routine area ' + dimension, true);
        if (row.area.width * row.area.height > 2500) fail('Routine areas may cover at most 2500 tiles.');
        list(row.route, 64, 'Route stops');
        for (const stop of row.route) {
            fields(stop, ['x', 'y', 'waitSeconds', 'activity'], 'Route stop');
            point(stop, 'Route stop'); number(stop.waitSeconds, 1, 300, 'Stop wait');
            if (stop.activity !== undefined) text(stop.activity, 'Stop activity');
        }
        try {require('./npcbehaviorconfig').validateConfig({enabled: true, npcs: [{...row, origin: {x: row.x, y: row.y}, preset: 'patrol', stepMs: 850}]});}
        catch (error) {fail(error.message);}
    }
}
function decoration(row) {
    fields(row, ['image', 'x', 'y', 'width', 'height', 'offsetX', 'offsetY', 'frame'], 'Decoration');
    if (typeof row.image !== 'string' || !/^\/img\/1\/[A-Za-z0-9][A-Za-z0-9_-]*\.png$/.test(row.image)) fail('Choose a local /img/1 PNG decoration.');
    point(row, 'Decoration');
    for (const key of ['width', 'height']) if (row[key] !== undefined) number(row[key], 1, 256, 'Decoration ' + key);
    for (const key of ['offsetX', 'offsetY']) if (row[key] !== undefined) number(row[key], -256, 256, 'Decoration ' + key);
    if (row.frame !== undefined) {
        fields(row.frame, ['x', 'y', 'width', 'height'], 'Decoration frame');
        point(row.frame, 'Frame');
        for (const key of ['width', 'height']) number(row.frame[key], 1, 256, 'Frame ' + key);
    }
}
function tile(row) {
    fields(row, ['x', 'y', 'from', 'to', 'colorShift'], 'Tile appearance'); point(row, 'Tile appearance');
    number(row.from, 1, 1000000, 'Original tile', true);
    if (row.to !== undefined) number(row.to, 1, 1000000, 'Replacement tile', true);
    if (row.to === undefined && row.colorShift === undefined) fail('A tile appearance needs a replacement tile or color shift.');
    if (row.colorShift !== undefined) {
        fields(row.colorShift, ['colorDifference', 'progress'], 'Tile color shift');
        fields(row.colorShift.colorDifference, ['r', 'g', 'b'], 'Tile color difference');
        for (const channel of ['r', 'g', 'b']) number(row.colorShift.colorDifference[channel], -255, 255, 'Color ' + channel);
        number(row.colorShift.progress, 0, 1, 'Color progress');
    }
}
function validateDocument(document) {
    fields(document, ['version', 'events'], 'Seasonal content source');
    if (document.version !== 1) fail('Seasonal content source requires version: 1.');
    list(document.events, 10, 'Seasonal events');
    const ids = new Set(), keys = new Set();
    for (const event of document.events) {
        fields(event, ['id', 'name', 'enabled', 'availability', 'actors', 'decorations', 'tiles', 'ambientSounds', 'parallax', 'textOverrides'], 'Seasonal event');
        if (typeof event.id !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(event.id) || ['constructor', 'prototype'].includes(event.id) || ids.has(event.id)) fail('Seasonal events need unique safe IDs.');
        ids.add(event.id); text(event.name, 'Event name');
        if (event.textOverrides !== undefined && (!object(event.textOverrides) || Object.keys(event.textOverrides).length > 250 ||
            Object.entries(event.textOverrides).some(([key, value]) => key.length > 200 || typeof value !== 'string' || value.length > 6000))) fail('Story text overrides must be a small object of stable text IDs and strings.');
        if (typeof event.enabled !== 'boolean') fail('Event enabled must be a boolean.');
        if (!object(event.availability) || Object.hasOwn(event.availability, 'enabled')) fail('Choose an annual or one-off window; use the event enabled setting separately.');
        try {Availability.validate(event.availability);} catch (error) {fail(error.message);}
        list(event.actors, 100, 'Seasonal actors'); list(event.decorations, 512, 'Decorations'); list(event.tiles, 512, 'Tile appearances'); list(event.parallax, 100, 'Seasonal scene layers');
        for (const row of event.actors) {
            actor(row);
            if (!row.key.startsWith(event.id + ':') || keys.has(row.key)) fail('Actor keys must be unique and belong to their event.');
            keys.add(row.key);
        }
        event.decorations.forEach(decoration); event.tiles.forEach(tile); Ambient.validate(event.ambientSounds);
        const appearances = event.tiles.map(row => pointKey(row) + ':' + row.from);
        if (new Set(appearances).size !== appearances.length) fail('Use one appearance override for each original tile at a position.');
        const scenes = new Set();
        for (const row of event.parallax) {
            fields(row, ['sceneId', 'layers'], 'Seasonal scene layers');
            if (!['string', 'number'].includes(typeof row.sceneId) || !/^[A-Za-z0-9_-]{1,100}$/.test(String(row.sceneId)) || scenes.has(String(row.sceneId))) fail('Use one layer group for each existing scene.');
            scenes.add(String(row.sceneId)); Environment.parallax({layers: row.layers});
            if (row.layers.some(layer => layer.placed || !['ground', 'foreground'].includes(layer.plane))) fail('Seasonal layers support continuous ground and foreground artwork.');
        }
    }
    if (document.events.reduce((count, event) => count + event.decorations.length, 0) > 512) fail('Use at most 512 decorations across this map\'s seasonal events.');
    if (document.events.reduce((count, event) => count + event.tiles.length, 0) > 512) fail('Use at most 512 tile appearances across this map\'s seasonal events.');
    const layers = new Map();
    for (const event of document.events) for (const row of event.parallax) {
        const count = (layers.get(String(row.sceneId)) || 0) + row.layers.length;
        if (count > 8) fail('Use at most eight seasonal layers per scene across all events.');
        layers.set(String(row.sceneId), count);
    }
    if (layers.size > 100) fail('Use seasonal layers in at most 100 scenes per map.');
    return document;
}
function readDocument(root, mapId) {
    const file = source(root, mapId);
    if (!fs.existsSync(file)) return {version: 1, events: []};
    if (fs.statSync(file).size > MAX_BYTES) fail('Seasonal content source exceeds 1 MB.');
    let document;
    try {document = JSON.parse(fs.readFileSync(file, 'utf8'));} catch (error) {if (!(error instanceof SyntaxError)) throw error; fail('Repair tools/seasons/' + mapId + '.json: invalid JSON.', 422);}
    return validateDocument(document);
}
function context(root, mapId) {
    source(root, mapId);
    const read = relative => require('./localmapfiles').readJson(safe(root, relative));
    const server = read('server/maps/world_server_' + mapId + '.json');
    const built = read('client/maps/world_client_' + mapId + '.json');
    const document = require('./localworldauthoring').readDocument(root, mapId);
    const client = require('./localworldscenes').applyScenes(built, document.scenes);
    return {server, client};
}
function png(root, image) {
    const file = safe(root, 'client' + image);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail('Missing seasonal image: ' + image);
    const bytes = Buffer.alloc(24), descriptor = fs.openSync(file, 'r');
    try {fs.readSync(descriptor, bytes, 0, 24, 0);} finally {fs.closeSync(descriptor);}
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) fail('Seasonal artwork must be a PNG: ' + image);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (!width || !height || width > 16384 || height > 16384) fail('Invalid seasonal image dimensions: ' + image);
    return {width, height};
}
function validate(root, mapId, document = readDocument(root, mapId)) {
    validateDocument(document);
    if (!document.events.length) return document;
    const {server, client} = context(root, mapId);
    const collisions = new Set(server.collisions), doors = new Set(server.doors.map(pointKey));
    const occupied = new Set();
    for (const [index, name] of Object.entries(server.staticEntities)) {
        const kind = Types.getKindFromString(name);
        if (Types.isNpc(kind) || Types.isMob(kind)) occupied.add(((Number(index) - 1) % server.width + 1) + ',' + Math.floor((Number(index) - 1) / server.width));
    }
    for (const chest of server.staticChests || []) occupied.add(pointKey(chest));
    const actors = document.events.flatMap(event => event.actors);
    if (new Set(actors.map(pointKey)).size !== actors.length) fail('Seasonal actors cannot share arrival tiles.');
    const walkable = p => p.x > 0 && p.y > 0 && p.x < server.width && p.y < server.height && !collisions.has(p.y * server.width + p.x) && !doors.has(pointKey(p)) && !occupied.has(pointKey(p));
    function walk(p, label) {point(p, label, server); if (!walkable(p)) fail(label + ' must use a walkable tile without a door or static NPC, mob or chest.');}
    const stops = new Map();
    for (const row of actors) {
        walk(row, 'Actor ' + row.key);
        if (!row.route) continue;
        if (row.area.x + row.area.width > server.width || row.area.y + row.area.height > server.height) fail('Routine area for ' + row.key + ' must stay inside the map.');
        const blocked = new Set(actors.filter(other => other !== row).map(pointKey));
        let start = row;
        for (const stop of row.route) {
            walk(stop, 'Route stop for ' + row.key);
            const key = pointKey(stop);
            if (blocked.has(key) || (stops.has(key) && stops.get(key) !== row.key)) fail('Moving actors need separate arrival and stopping tiles: ' + row.key);
            stops.set(key, row.key);
            const queue = [start], visited = new Set([pointKey(start)]), area = row.area;
            for (let i = 0; i < queue.length && !visited.has(key); i++) {
                for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                    const next = {x: queue[i].x + dx, y: queue[i].y + dy}, nextKey = pointKey(next);
                    if (next.x < area.x || next.y < area.y || next.x >= area.x + area.width || next.y >= area.y + area.height || !walkable(next) || blocked.has(nextKey) || visited.has(nextKey)) continue;
                    visited.add(nextKey); queue.push(next);
                }
            }
            if (!visited.has(key)) fail('Route stop for ' + row.key + ' is unreachable inside its routine area.');
            start = stop;
        }
    }
    const imageSizes = new Map();
    const image = value => {if (!imageSizes.has(value)) imageSizes.set(value, png(root, value)); return imageSizes.get(value);};
    for (const event of document.events) {
        for (const row of event.decorations) {
            walk(row, 'Decoration'); const size = image(row.image), frame = row.frame || {x: 0, y: 0, width: row.width ?? 16, height: row.height ?? 16};
            if (frame.x + frame.width > size.width || frame.y + frame.height > size.height) fail('Decoration frame must fit inside its image.');
        }
        for (const row of event.tiles) {
            point(row, 'Tile appearance', client);
            if (![client.data[row.y * client.width + row.x]].flat().includes(row.from)) fail('Original tile no longer matches the built map at ' + pointKey(row) + '. Reload the map or update its tile guard.');
            if (row.to !== undefined) {
                const size = image('/img/1/tilesheet_' + (['oadungeon', 'oaoverworld'].includes(mapId) ? 'oa' : mapId) + '.png');
                if (row.to > (size.width / client.tilesize) * (size.height / client.tilesize)) fail('Replacement tile is outside the map tilesheet.');
            }
        }
        Ambient.validate(event.ambientSounds, server);
        require('./localambientassets').validateReferences(root, event.ambientSounds);
        for (const row of event.parallax) {
            if (!client.scenes.some(scene => String(scene.id) === String(row.sceneId))) fail('Seasonal layers refer to missing scene ' + row.sceneId + '. Restore the scene or remove its seasonal layers.');
            row.layers.forEach(layer => image(layer.image));
        }
    }
    return document;
}

module.exports = {MAX_BYTES, fail, fields, safe, maps, source, readDocument, validateDocument, context, png, validate};

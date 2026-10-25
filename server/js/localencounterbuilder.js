const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const Types = require('../../shared/js/gametypes');
const {saves} = require('./localobjectbatch');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const maps = root => JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;
function source(root, mapId) {
    root = path.resolve(root);
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !maps(root).includes(mapId)) fail('Choose a configured map.');
    const file = path.join(root, 'tools/maps/tmx', mapId + '.tmx');
    for (let p = file; p !== root; p = path.dirname(p)) if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) fail('Tiled source paths must not contain symbolic links.');
    if (!fs.existsSync(file)) fail('This map has no Tiled source file.', 404);
    return file;
}
function run(root, mapId, input = {}) {
    const file = source(root, mapId);
    return new Promise((resolve, reject) => {
        const child = execFile('python3', [path.resolve(__dirname, '../../tools/maps/editencounters.py'), file],
            {timeout: 30000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8'}, (error, stdout) => {
                let data;try {data = JSON.parse(stdout);} catch (_) {return reject(Object.assign(new Error('The Tiled source could not be read. Check Python 3 and the map XML.'), {status: 503}));}
                if (error || data.error) return reject(Object.assign(new Error(data.error || 'The encounter could not be saved.'), {status: data.status || 500}));
                resolve(data);
            });
        child.stdin.on('error', () => {});child.stdin.end(JSON.stringify(input));
    });
}
function catalog() {
    const items = [], mobs = [], names = require('../../shared/js/altnames');
    Types.forEachKind((kind, id) => {
        if (typeof kind !== 'number' || id.startsWith('NFT_')) return;
        const entry = {id, name: names.getName(id) || id};
        if (Types.isMob(kind)) mobs.push(entry);
        if (kind !== Types.Entities.CHEST && Types.isItem(kind)) items.push(entry);
    });
    for (const rows of [items, mobs]) rows.sort((a, b) => a.name.localeCompare(b.name));
    return {items, mobs};
}
function decorate(data, mapId) {
    const {tilewidth: tw, tileheight: th} = data.dimensions;
    const objects = data.objects.map(row => {
        const p = row.properties, loot = [];
        if (p.chances !== undefined) for (const part of p.chances.split(',')) {
            const [item, weight] = part.split(':');loot.push({item: item.trim(), weight: Number(weight)});
        } else for (const item of (p.items || '').split(',').filter(Boolean)) {
            const previous = loot.find(l => l.item === item.trim());if (previous) previous.weight++;else loot.push({item: item.trim(), weight: 1});
        }
        return {id: row.id, kind: row.kind, name: row.name, x: row.x / tw, y: row.y / th,
            width: row.width / tw, height: row.height / th, mob: row.mob,
            count: Number(p.nb ?? Object.values(p)[0] ?? 1), loot, lootMode: p.chances === undefined && loot.every(entry => entry.weight === 1) ? 'uniform' : 'weighted',
            respawnSeconds: Number(p.delay ?? 30), rewardX: Number(p.x ?? row.x / tw), rewardY: Number(p.y ?? row.y / th),
            editable: !row.rotation && (row.kind === 'chest' ? ['point', 'rectangle'].includes(row.shape) : row.shape === 'rectangle')};
    });
    return {...data, objects, mapId, source: 'tools/maps/tmx/' + mapId + '.tmx'};
}
async function readEncounters(root, mapId) {
    const file = source(root, mapId);
    return decorate(await require('./localtmxcache').readTmx(file, 'encounters', () => run(root, mapId)), mapId);
}
function integer(value, min, max, name) {if (!Number.isSafeInteger(value) || value < min || value > max) fail(name + ' must be a whole number from ' + min + ' to ' + max + '.');}
function validate(root, mapId, row, current, data, builtMap) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || !['chest', 'encounter', 'reward'].includes(row.kind)) fail('Choose a chest, encounter or clear-area reward.');
    if (Object.keys(row).some(k => !['id','kind','name','x','y','width','height','mob','count','loot','lootMode','respawnSeconds','rewardX','rewardY','editable'].includes(k))) fail('Only chest and encounter settings can be edited here.');
    if (current && (current.kind !== row.kind || !current.editable)) fail('Keep the existing object type. Rotated or unsupported shapes must be edited in Tiled.');
    if (typeof row.name !== 'string' || row.name.length > 120 || /[\u0000-\u001f]/.test(row.name)) fail('Use a name of up to 120 characters.');
    const d = data.dimensions;
    integer(row.x, row.kind === 'chest' ? 1 : 0, d.width - 1, 'Tile X');integer(row.y, row.kind === 'chest' ? 1 : 0, d.height - 1, 'Tile Y');
    if (row.kind !== 'chest') {
        integer(row.width, 1, d.width - row.x, 'Width');integer(row.height, 1, d.height - row.y, 'Height');
        if (row.width * row.height > 250000) fail('Use an area of at most 250000 tiles.');
    }
    const filename = path.join(root, 'server/maps/world_server_' + mapId + '.json');
    let map;try {map = builtMap || require('./localmapfiles').readJson(filename);} catch (_) {fail('Build this map first so placements can be checked against collisions.');}
    if (map.width !== d.width || map.height !== d.height) fail('Map dimensions changed in Tiled. Build the map before placing objects.');
    const blocked = new Set(map.collisions || []), walkable = (x, y) => x > 0 && y > 0 && x < map.width && y < map.height && !blocked.has(y * map.width + x);
    const properties = {};
    if (row.kind === 'encounter') {
        if (!Types.isMob(Types.getKindFromString(row.mob))) fail('Choose a registered mob type.');
        integer(row.count, 1, 1000, 'Mob population');properties.nb = String(row.count);
    } else {
        if (!Array.isArray(row.loot) || !row.loot.length || row.loot.length > 100) fail('Add 1–100 loot items.');
        if (!['weighted', 'uniform'].includes(row.lootMode)) fail('Choose equal chances or weighted loot.');
        const used = new Set();
        for (const entry of row.loot) {
            if (typeof entry.item !== 'string' || !/^[A-Za-z0-9_-]+$/.test(entry.item) || !Types.isItem(Types.getKindFromString(entry.item)) || Types.getKindFromString(entry.item) === Types.Entities.CHEST) fail('Choose registered loot items.');
            if (used.has(entry.item)) fail('Use each loot item once.');used.add(entry.item);
            if (!Number.isFinite(entry.weight) || entry.weight <= 0 || entry.weight > 1000000) fail('Loot weights must be greater than 0 and at most 1000000.');
        }
        properties.items = row.loot.map(l => l.item).join(',');
        properties.chances = row.lootMode === 'weighted' ? row.loot.map(l => l.item + ':' + l.weight).join(',') : null;
        const x = row.kind === 'chest' ? row.x : row.rewardX, y = row.kind === 'chest' ? row.y : row.rewardY;
        integer(x, 1, d.width - 1, 'Chest tile X');integer(y, 1, d.height - 1, 'Chest tile Y');
        if (!walkable(x, y)) fail('The chest position is blocked. Choose a walkable tile.');
        if (data.objects.some(other => other.id !== current?.id && other.kind !== 'encounter' && (other.kind === 'chest' ? other.x : other.rewardX) === x && (other.kind === 'chest' ? other.y : other.rewardY) === y)) fail('Another chest uses that tile. Choose a different chest position.');
        if (row.kind === 'chest') {integer(row.respawnSeconds, 1, 604800, 'Respawn delay');properties.delay = String(row.respawnSeconds);}
        else {properties.x = String(x);properties.y = String(y);}
    }
    if (row.kind !== 'chest') {
        let free = false;
        for (let y = row.y; y < row.y + row.height && !free; y++) for (let x = row.x; x < row.x + row.width; x++) if (walkable(x, y)) {free = true;break;}
        if (!free) fail('The area has no walkable tiles.');
    }
    return {kind: row.kind, name: row.name, x: row.x * d.tilewidth, y: row.y * d.tileheight,
        width: row.kind === 'chest' ? 0 : row.width * d.tilewidth, height: row.kind === 'chest' ? 0 : row.height * d.tileheight,
        mob: row.mob, properties};
}
async function saveObject(root, input, beforeWrite = () => {}) {
    const file = source(root, input?.mapId);
    const work = (saves.get(file) || Promise.resolve()).catch(() => {}).then(async () => {
        if (input.operations !== undefined) {
            const changes = require('./localobjectbatch').operations(input);
            const data = await readEncounters(root, input.mapId);
            if (data.revision !== input.revision) fail('This map changed in Tiled or another tab. Keep the draft and reload before saving.', 409);
            const edited = new Set(changes.filter(row => row.operation !== 'add').map(row => String(row.objectId)));
            const final = data.objects.filter(row => !edited.has(row.id));
            const candidates = changes.map((change, index) => {
                const current = data.objects.find(row => row.id === String(change.objectId));
                if (change.operation !== 'add' && !current) fail('A chest or encounter was removed. Keep the draft and reload.', 404);
                const id = current?.id || 'draft-' + index;
                if (change.operation !== 'remove') final.push({...change.object, id});
                return {change, current, id};
            });
            const built = candidates.some(row => row.change.operation !== 'remove') ? require('./localmapfiles').readJson(path.join(root, 'server/maps/world_server_' + input.mapId + '.json')) : null;
            const operations = candidates.map(({change, current, id}) => ({...change, object: change.operation === 'remove' ? undefined :
                validate(root, input.mapId, {...change.object, id}, current || {id, kind: change.object?.kind, editable: true}, {...data, objects: final}, built)}));
            beforeWrite();
            return decorate(await run(root, input.mapId, {revision: input.revision, operations}), input.mapId);
        }
        if (!['add', 'update', 'remove'].includes(input.operation) || typeof input.revision !== 'string') fail('Reload chests and encounters before saving.');
        const data = await readEncounters(root, input.mapId);
        if (data.revision !== input.revision) fail('This map changed in Tiled or another tab. Reload before saving.', 409);
        const current = data.objects.find(r => r.id === String(input.objectId));
        if (input.operation !== 'add' && !current) fail('This object was removed. Reload the map.', 404);
        const object = input.operation === 'remove' ? undefined : validate(root, input.mapId, input.object, input.operation === 'add' ? null : current, data);
        beforeWrite();return decorate(await run(root, input.mapId, {...input, object}), input.mapId);
    });
    saves.set(file, work);try {return await work;} finally {if (saves.get(file) === work) saves.delete(file);}
}
function install(app, toolbox) {
    app.get('/local/api/encounters', async (req, res) => {try {res.json(req.query.mapId === undefined ? {maps: maps(toolbox.root), catalog: catalog()} : await readEncounters(toolbox.root, req.query.mapId));} catch (e) {res.status(e.status || 500).json({error: e.message});}});
    app.get('/local/encounter-chest.png', (req, res) => res.sendFile(path.join(toolbox.root, 'client/img/1/chest.png')));
    app.post('/local/api/encounters', async (req, res) => {
        const available = () => {if (toolbox.closed) fail('The toolbox is shutting down.', 503);if (toolbox.job?.status === 'running') fail('Wait for the map build to finish before saving.', 409);};
        try {available();toolbox.encounterSaveCount = (toolbox.encounterSaveCount || 0) + 1;try {res.json(await saveObject(toolbox.root, req.body, available));} finally {toolbox.encounterSaveCount--;}} catch (e) {res.status(e.status || 500).json({error: e.message});}
    });
}
module.exports = {readEncounters, saveObject, validate, catalog, install};

const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const {catalog} = require('./localassetbuilder');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const saves = new Map();

function mapFile(root, mapId) {
    const configured = JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !configured.includes(mapId)) fail('Choose a configured map.');
    const file = path.resolve(root, 'tools/maps/tmx', mapId + '.tmx');
    for (let current = file; current !== path.resolve(root); current = path.dirname(current)) {
        if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail('Tiled source paths must not contain symbolic links.');
    }
    if (!fs.existsSync(file)) fail('This map has no Tiled source. Placement is unavailable.', 404);
    return file;
}
function run(root, mapId, input = {}) {
    const file = mapFile(root, mapId);
    return new Promise((resolve, reject) => {
        const child = execFile('python3', [path.resolve(__dirname, '../../tools/maps/editentities.py'), file],
            {timeout: 30000, maxBuffer: 8 * 1024 * 1024}, (error, stdout) => {
                let data;
                try {data = JSON.parse(stdout);} catch (_) {return reject(Object.assign(new Error('The Tiled source could not be read. Check Python 3 and the map XML.'), {status: 503}));}
                if (error || data.error) return reject(Object.assign(new Error(data.error || 'Placement could not be saved.'), {status: data.status || 500}));
                resolve({...data, mapId, source: 'tools/maps/tmx/' + mapId + '.tmx'});
            });
        child.stdin.on('error', () => {});
        child.stdin.end(JSON.stringify(input));
    });
}
async function readPlacements(root, mapId) {return run(root, mapId);}
function spriteFile(root, relative) {
    const file = path.resolve(root, relative);
    for (let current = file; current !== path.resolve(root); current = path.dirname(current)) {
        if (!current.startsWith(path.resolve(root) + path.sep) || (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())) fail('Sprite paths must not contain symbolic links.');
    }
    return file;
}
function library(root) {
    return {entries: catalog(root).entries.map(entry => {
        try {
            const id = (entry.type === 'item' ? 'item-' : '') + entry.id;
            const sprite = JSON.parse(fs.readFileSync(spriteFile(root, 'client/sprites/' + id + '.json'), 'utf8'));
            const idle = sprite.animations.idle_down || sprite.animations.idle || sprite.animations.idle_right || Object.values(sprite.animations)[0];
            return {...entry, preview: {width: sprite.width, height: sprite.height, row: idle.row,
                offsetX: sprite.offset_x ?? (entry.type === 'item' ? 0 : -16), offsetY: sprite.offset_y ?? (entry.type === 'item' ? 0 : -16),
                url: './api/entity-sprites/' + encodeURIComponent(entry.id)}};
        } catch (_) {return entry;}
    })};
}
async function savePlacement(root, input) {
    const file = mapFile(root, input?.mapId);
    const previous = saves.get(file) || Promise.resolve();
    const work = previous.catch(() => {}).then(async () => {
        if (!['add', 'move', 'remove'].includes(input.operation) || typeof input.revision !== 'string') fail('Refresh the map and choose a placement action.');
        if (input.operation === 'add' && !catalog(root).entries.some(row => row.id === input.kind)) fail('Choose a registered item, mob or NPC. Save new definitions in their editor first.');
        let dimensions;
        if (input.operation !== 'remove') {
            const p = input.position;
            if (!p || !Number.isInteger(p.x) || !Number.isInteger(p.y)) fail('Choose whole-number tile coordinates.');
            const relative = path.join('server/maps', 'world_server_' + input.mapId + '.json');
            const built = path.resolve(root, relative);
            for (let current = built; current !== path.resolve(root); current = path.dirname(current)) {
                if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail('Map paths must not contain symbolic links.');
            }
            const map = JSON.parse(fs.readFileSync(built, 'utf8'));
            dimensions = {width: map.width, height: map.height};
            if ((map.collisions || []).includes(p.y * map.width + p.x)) fail('This tile is blocked. Choose a walkable tile.');
        }
        return run(root, input.mapId, {...input, dimensions});
    });
    saves.set(file, work);
    try {return await work;} finally {if (saves.get(file) === work) saves.delete(file);}
}
function overlay(report, source) {
    const old = report.objects.filter(row => ['npc', 'mob', 'item', 'entity'].includes(row.type));
    const entries = new Map((source.entries || []).map(row => [row.id, row]));
    const objects = [];
    for (const p of [...source.legacy, ...source.placements]) {
        const built = old.find(row => row.x === p.x && row.y === p.y);
        const entry = entries.get(p.kind);
        const type = entry?.type || built?.type || 'entity', kind = p.kind || built?.kind || 'unknown';
        const id = p.id ? 'placement:' + p.id : type + ':' + (p.y * report.width + p.x);
        objects.push({id, type, kind, name: entry?.name || kind, x: p.x, y: p.y, width: 1, height: 1,
            builtId: built?.kind === kind ? built.id : null,
            placementId: p.id || null, tiledLayer: p.id ? 'mapmaker-entities' : 'entities',
            editor: ['npc', 'mob', 'item'].includes(type) ? '#' + (type === 'npc' ? 'npcs' : type === 'mob' ? 'mobs' : 'items') + '/?asset=' + encodeURIComponent(kind) : null});
    }
    objects.push(...report.objects.filter(row => !old.includes(row)));
    // Match built validation findings to their corresponding current source placement.
    const findings = report.findings.map(f => {
        const original = old.find(row => row.id === f.objectId);
        if (!original) return f;
        const current = objects.find(row => row.kind === original.kind && row.x === original.x && row.y === original.y);
        return current ? {...f, objectId: current.id} : null;
    }).filter(Boolean);
    return {...report, objects, findings, placements: source, summary: {...report.summary, objects: objects.length,
        errors: findings.filter(f => f.severity === 'error').length, warnings: findings.filter(f => f.severity === 'warning').length}};
}
function install(app, toolbox) {
    app.get('/local/api/entity-library', (req, res) => {
        try {res.json(library(toolbox.root));} catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    app.get('/local/api/entity-sprites/:id', (req, res) => {
        try {
            const id = req.params.id;
            if (typeof id !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(id)) fail('Choose a valid entity sprite.');
            // Sprite requests fan out across the map. Avoid rescanning the entire asset library per image.
            const sprite = [id, 'item-' + id].find(name => fs.existsSync(spriteFile(toolbox.root, 'client/sprites/' + name + '.json')));
            if (!sprite) fail('This entity sprite was not found.', 404);
            res.type('png').send(fs.readFileSync(spriteFile(toolbox.root, 'client/img/1/' + sprite + '.png')));
        } catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    app.get('/local/api/entity-placements', async (req, res) => {
        try {res.json(await readPlacements(toolbox.root, req.query.mapId));}
        catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    app.post('/local/api/entity-placements', async (req, res) => {
        try {
            if (toolbox.closed || toolbox.job?.status === 'running') fail('Wait for the map build to finish before saving placements.', 409);
            toolbox.entitySaveCount = (toolbox.entitySaveCount || 0) + 1;
            try {res.json(await savePlacement(toolbox.root, req.body));} finally {toolbox.entitySaveCount--;}
        } catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
}
module.exports = {readPlacements, savePlacement, overlay, library, install};

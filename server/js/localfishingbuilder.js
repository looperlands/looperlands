const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const Lakes = require('./lakes');
const Areas = require('./fishingareas');
const {operations, saves} = require('./localobjectbatch');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const maps = root => JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;
const source = (root, mapId) => require('./localdoorbuilder').mapFile(root, mapId);
function run(root, mapId, input = {}) {
    return new Promise((resolve, reject) => {
        const child = execFile('python3', ['-B', path.resolve(__dirname, '../../tools/maps/editfishing.py'), source(root, mapId)],
            {timeout: 30000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8'}, (error, stdout) => {
                let data;try {data = JSON.parse(stdout);} catch (_) {return reject(Object.assign(new Error('Check Python 3 and the Tiled source XML before reloading fishing.'), {status: 503}));}
                if (error || data.error) return reject(Object.assign(new Error(data.error || 'Fishing areas could not be saved.'), {status: data.status || 500}));
                resolve(data);
            });
        child.stdin.on('error', () => {});child.stdin.end(JSON.stringify(input));
    });
}
function catalog(root = path.resolve(__dirname, '../..')) {
    const names = require('../../shared/js/altnames');
    const lakes = Object.entries(Lakes).filter(([key, value]) => value?.fish && !key.startsWith('toolbox-fishing-')).map(([id, value]) => ({id, level: value.level, fish: Object.entries(value.fish).map(([item, rarity]) => ({item, rarity}))}));
    const items = [...new Set(lakes.flatMap(lake => lake.fish.map(row => row.item)))].map(id => {
        const row = {id, name: names.getName(id) || id, description: Lakes.getInventoryDescription(id)};
        try {
            const sprite = require('./localmapfiles').readJson(require('./localtilebuilder').safe(root, 'client/sprites/' + id + '.json'));
            const animation = Object.values(sprite.animations || {})[0];
            if (fs.existsSync(require('./localtilebuilder').safe(root,'client/img/1/' + id + '.png'))) row.preview = {width:sprite.width,height:sprite.height,row:animation?.row || 0,url:'./api/fishing-sprites/' + id};
        } catch (_) {}
        return row;
    }).sort((a,b) => a.name.localeCompare(b.name));
    return {lakes, items};
}
function geometry(root, mapId) {
    const file = require('./localtilebuilder').safe(root, 'client/maps/world_client_' + mapId + '.json');
    const map = require('./localmapfiles').readJson(file);
    return {...map, baseFishingTiles: map.baseFishingTiles || map.fishingTiles || {}};
}
function decorate(data, root, mapId) {
    const {tilewidth: tw, tileheight: th} = data.dimensions, map = geometry(root, mapId);
    const objects = data.objects.map(row => {const p = row.properties;return {id: row.id, kind: 'fishing', name: row.name,
        x: row.x / tw, y: row.y / th, width: row.width / tw, height: row.height / th,
        scope: p.scope || 'area', sourceLake: p.sourceLake || '', level: Number(p.level || 1),
        fish: String(p.fish || '').split(',').filter(Boolean).map(value => {const [item, rarity] = value.trim().split(':');return {item, rarity};}),
        editable: !row.rotation && row.shape === 'rectangle'};});
    const waters = new Map();
    for (const [index, lake] of Object.entries(map.baseFishingTiles)) {
        const x = Number(index) % map.width, y = Math.floor(Number(index) / map.width);
        const row = waters.get(lake) || {id: lake, count: 0, x, y, right: x + 1, bottom: y + 1};
        row.count++;row.x = Math.min(row.x, x);row.y = Math.min(row.y, y);row.right = Math.max(row.right, x + 1);row.bottom = Math.max(row.bottom, y + 1);waters.set(lake, row);
    }
    return {...data, mapId, source: 'tools/maps/tmx/' + mapId + '.tmx', objects, waters: [...waters.values()].map(({right,bottom,...row}) => ({...row,width:right-row.x,height:bottom-row.y}))};
}
async function readFishing(root, mapId) {
    return decorate(await require('./localtmxcache').readTmx(source(root, mapId), 'fishing', () => run(root, mapId)), root, mapId);
}
async function saveObjects(root, input, beforeWrite = () => {}) {
    const file = source(root, input?.mapId);
    const work = (saves.get(file) || Promise.resolve()).catch(() => {}).then(async () => {
        const changes = operations(input), data = await readFishing(root, input.mapId);
        if (data.revision !== input.revision) fail('This map changed in Tiled or another tab. Keep your draft, then reload before saving.', 409);
        const edited = new Set(changes.filter(row => row.operation !== 'add').map(row => String(row.objectId)));
        const final = data.objects.filter(row => !edited.has(row.id));
        const candidates = changes.map((change, index) => {
            const current = data.objects.find(row => row.id === String(change.objectId));
            if (change.operation !== 'add' && !current) fail('A fishing area was removed. Keep your draft and reload.', 404);
            if (change.operation !== 'remove' && current && !current.editable) fail('Edit rotated or unsupported fishing shapes in Tiled.');
            const row = change.operation === 'remove' ? null : {...change.object, id: current?.id || 'draft-' + index};
            if (row) final.push(row);
            return {change, row};
        });
        const map = geometry(root, input.mapId);
        if (map.width !== data.dimensions.width || map.height !== data.dimensions.height) fail('Map dimensions changed. Build this map before placing fishing areas.');
        Areas.validate(final, map);
        const batch = candidates.map(({change, row}) => ({...change, object: row ? {kind: 'fishing', name: row.name, x: row.x * data.dimensions.tilewidth, y: row.y * data.dimensions.tileheight,
            width: row.width * data.dimensions.tilewidth, height: row.height * data.dimensions.tileheight,
            properties: {scope: row.scope, sourceLake: row.sourceLake, level: String(row.level || 1), fish: row.fish.map(f => f.item + ':' + f.rarity).join(',')}} : undefined}));
        beforeWrite();return decorate(await run(root, input.mapId, {revision: input.revision, operations: batch}), root, input.mapId);
    });
    saves.set(file, work);try {return await work;} finally {if (saves.get(file) === work) saves.delete(file);}
}
function install(app, toolbox) {
    app.get('/local/api/fishing', async (req, res) => {try {res.json(req.query.mapId === undefined ? {maps: maps(toolbox.root), catalog: catalog(toolbox.root)} : await readFishing(toolbox.root, req.query.mapId));} catch (e) {res.status(e.status || 500).json({error: e.message});}});
    app.get('/local/api/fishing-sprites/:id', (req,res) => {
        try {const id=req.params.id;if(!/^[A-Za-z0-9_-]+$/.test(id)||!Lakes.isFish(id))return res.status(404).end();res.sendFile(require('./localtilebuilder').safe(toolbox.root,'client/img/1/' + id + '.png'));}catch(e){res.status(e.status||400).json({error:e.message});}
    });
    app.post('/local/api/fishing', async (req, res) => {
        const available = () => {if (toolbox.closed) fail('The toolbox is shutting down.',503);if (toolbox.job?.status === 'running') fail('Wait for the map build to finish before saving.',409);};
        try {available();toolbox.fishingSaveCount = (toolbox.fishingSaveCount || 0) + 1;try {res.json(await saveObjects(toolbox.root,req.body,available));} finally {toolbox.fishingSaveCount--;}} catch (e) {res.status(e.status || 500).json({error:e.message});}
    });
}
module.exports = {catalog, readFishing, saveObjects, install};

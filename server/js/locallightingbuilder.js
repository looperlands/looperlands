const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const Lighting = require('../../shared/js/mapmakerlighting');
const {saves} = require('./localobjectbatch');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
function maps(root) {return JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;}
function source(root, mapId) {
    root = path.resolve(root);
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !maps(root).includes(mapId)) fail('Choose a configured map.');
    const file = path.join(root, 'tools/maps/tmx', mapId + '.tmx');
    for (let p = file; p !== root; p = path.dirname(p)) {
        if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) fail('Tiled source paths must not contain symbolic links.');
    }
    if (!fs.existsSync(file)) fail('This map has no Tiled source file.', 404);
    return file;
}
async function run(root, mapId, input = {}) {
    const filename = source(root, mapId);
    const load = () => new Promise((resolve, reject) => {
        const child = execFile('python3', [path.resolve(__dirname, '../../tools/maps/editlighting.py'), filename],
            {timeout: 30000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8'}, (error, stdout) => {
                let data;
                try {data = JSON.parse(stdout);} catch (_) {return reject(Object.assign(new Error('The lighting source could not be read. Check Python 3 and the map XML.'), {status: 503}));}
                if (error || data.error) return reject(Object.assign(new Error(data.error || 'Lighting could not be saved.'), {status: data.status || 500}));
                resolve({...data, mapId, source: 'tools/maps/tmx/' + mapId + '.tmx'});
            });
        child.stdin.on('error', () => {});
        child.stdin.end(JSON.stringify(input));
    });
    return input.operation || input.operations ? load() : require('./localtmxcache').readTmx(filename, 'lighting', load);
}
function number(value, min, max, name, integer = false) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(name + ' must be ' + (integer ? 'a whole number ' : '') + 'from ' + min + ' to ' + max + '.');
}
function validateObject(row, current, dimensions) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail('Choose a lighting object.');
    if (Object.keys(row).some(k => !['id', 'kind', 'name', 'shape', 'x', 'y', 'width', 'height', 'points', 'properties', 'rotation'].includes(k))) fail('Only lighting fields can be edited here.');
    if (!['light', 'shadow'].includes(row.kind) || !['rectangle', 'ellipse', 'polygon'].includes(row.shape) ||
        (row.kind === 'light' && row.shape === 'polygon') || (row.kind === 'shadow' && row.shape === 'ellipse')) fail('Use a round or area light, or a rectangle or polygon shadow.');
    if (current && (row.kind !== current.kind || row.shape !== current.shape)) fail('Keep the existing object shape. Create a new object to use another shape.');
    if ((current?.rotation || row.rotation || 0) !== 0) fail('Rotated lighting objects must be edited in Tiled.');
    if (typeof row.name !== 'string' || row.name.length > 120 || /[\u0000-\u001f]/.test(row.name)) fail('Use a name of up to 120 characters.');
    const width = dimensions.width * dimensions.tilewidth, height = dimensions.height * dimensions.tileheight;
    // Ellipse bounds may extend beyond the map while their center stays inside it.
    number(row.x, -4096, width, 'X position'); number(row.y, -4096, height, 'Y position');
    number(row.width, row.shape === 'polygon' ? 0 : 0.01, width, 'Width');
    number(row.height, row.shape === 'polygon' ? 0 : 0.01, height, 'Height');
    const center = row.kind === 'light' && row.shape === 'ellipse';
    number(row.x + (center ? row.width / 2 : 0), 0, width - 1, 'Object X');
    number(row.y + (center ? row.height / 2 : 0), 0, height - 1, 'Object Y');
    if (row.shape === 'polygon') {
        if (typeof row.points !== 'string' || row.points.length > 12000) fail('Use 3–128 polygon points as x,y pixel pairs.');
        const pairs = row.points.trim().split(/\s+/);
        if (pairs.some(p => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+),[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(p))) fail('Use polygon points as complete x,y pixel pairs.');
        const points = pairs.map(p => p.split(',').map(Number));
        if (points.length < 3 || points.length > 128 || points.some(p => p.length !== 2 || p.some(v => !Number.isFinite(v) || Math.abs(v) > 16384))) fail('Use 3–128 polygon points as x,y pixel pairs.');
        if (new Set(points.map(p => p.join(','))).size < 3) fail('A shadow polygon needs three different points.');
        const area = points.reduce((sum, p, i) => {const next = points[(i + 1) % points.length];return sum + p[0] * next[1] - next[0] * p[1];}, 0);
        if (Math.abs(area) < 0.01) fail('The shadow polygon must enclose an area.');
    }
    if (!row.properties || typeof row.properties !== 'object' || Array.isArray(row.properties)) fail('Choose valid light settings.');
    const properties = {};
    for (const [key, value] of Object.entries(row.properties)) {
        if (![...Lighting.propertyNames, 'light'].includes(key)) {
            if (!current || current.properties[key] !== value) fail('Unknown lighting properties cannot be changed here.');
            continue;
        }
        if (row.kind === 'shadow') {
            if (!current || current.properties[key] !== value) fail('Light settings belong to a light source.');
            continue;
        }
        if (value === null) {properties[key] = null;continue;}
        if (typeof value !== 'string' || !value.trim()) fail('Choose a value for ' + key + '.');
        if (key === 'color') {
            const channels = value.split(',');
            if (channels.length !== 3 || channels.some(v => !/^\d{1,3}$/.test(v.trim()) || Number(v) > 255)) fail('Use a color with three RGB channels from 0 to 255.');
        } else if (key === 'animation') {
            if (value !== 'fire') fail('Use the fire animation or remove animation for a steady light.');
        } else {
            const numeric = Number(value.replace(',', '.'));
            const max = ['intensity', 'light', 'shadow'].includes(key) ? 1 : ['radius', 'innerRadius'].includes(key) ? 64 : 360;
            number(numeric, key === 'radius' ? 1 : 0, max, key, !['intensity', 'light', 'shadow'].includes(key));
        }
        properties[key] = value;
    }
    const merged = {...current?.properties};
    for (const [key, value] of Object.entries(properties)) {if (value === null) delete merged[key];else merged[key] = value;}
    if (row.kind === 'light') {
        const light = Lighting.light({...row, properties: merged}, dimensions.tilewidth);
        if (light.radius > 64) fail('Light radius must be at most 64 tiles.');
        if ((light.innerRadius || 0) > (light.radius || 1)) fail('Inner radius must not exceed the light radius.');
        if ((light.innerSpread || 0) > (light.spread || 0)) fail('Inner spread must not exceed the beam spread.');
    }
    return {...row, properties};
}
async function saveObject(root, input, beforeWrite = () => {}) {
    const file = source(root, input?.mapId);
    const work = (saves.get(file) || Promise.resolve()).catch(() => {}).then(async () => {
        if (input.operations !== undefined) {
            const changes = require('./localobjectbatch').operations(input);
            const data = await run(root, input.mapId);
            if (data.revision !== input.revision) fail('This map changed in Tiled or another tab. Keep the draft and reload before saving.', 409);
            const operations = changes.map(change => {
                const current = data.objects.find(row => row.id === String(change.objectId));
                if (change.operation !== 'add' && !current) fail('A lighting object was removed. Keep the draft and reload.', 404);
                return {...change, object: change.operation === 'remove' ? undefined : validateObject(change.object, change.operation === 'add' ? null : current, data.dimensions)};
            });
            beforeWrite();
            return run(root, input.mapId, {revision: input.revision, operations});
        }
        if (!['add', 'update', 'remove'].includes(input.operation) || typeof input.revision !== 'string') fail('Reload lighting and choose a save action.');
        const data = await run(root, input.mapId);
        if (data.revision !== input.revision) fail('This map changed in another tab or in Tiled. Reload lights before saving.', 409);
        const current = data.objects.find(row => row.id === String(input.objectId));
        if (input.operation !== 'add' && !current) fail('This lighting object was removed. Reload lights.', 404);
        const row = input.operation === 'remove' ? undefined : validateObject(input.object, input.operation === 'add' ? null : current, data.dimensions);
        beforeWrite();
        return run(root, input.mapId, {...input, object: row});
    });
    saves.set(file, work);
    try {return await work;} finally {if (saves.get(file) === work) saves.delete(file);}
}
function install(app, toolbox) {
    app.get('/local/api/lighting', async (req, res) => {
        try {res.json(req.query.mapId === undefined ? {maps: maps(toolbox.root)} : await run(toolbox.root, req.query.mapId));}
        catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    app.post('/local/api/lighting', async (req, res) => {
        const available = () => {
            if (toolbox.closed) fail('The toolbox is shutting down.', 503);
            if (toolbox.job?.status === 'running') fail('Wait for the map build to finish before saving lighting.', 409);
        };
        try {
            available(); toolbox.lightingSaveCount = (toolbox.lightingSaveCount || 0) + 1;
            try {res.json(await saveObject(toolbox.root, req.body, available));}
            finally {toolbox.lightingSaveCount--;}
        } catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
}
module.exports = {readLighting: run, saveObject, validateObject, install};

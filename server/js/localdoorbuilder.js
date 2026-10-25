const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const WorldTime = require('../../client/js/worldtime-worker');
const DialogueFormat = require('../../shared/js/dialogueformat');
const gates = ['nft', 'item', 'quest', 'collection', 'http_redirect', 'level', 'weapon_level'];
const messages = ['message', 'nft_message', 'item_message', 'quest_message', 'collection_message', 'trigger_message', 'time_message'];
const editable = [...gates, ...messages, 'tid', 'time_range'];
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
function mapFile(root, mapId) {
    root = path.resolve(root);
    const maps = JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !maps.includes(mapId)) fail('Choose a configured map.');
    const file = path.join(root, 'tools/maps/tmx', mapId + '.tmx');
    for (let current = file; current !== path.resolve(root); current = path.dirname(current)) {
        if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail('Tiled source paths must not contain symbolic links.');
    }
    if (!fs.existsSync(file)) fail('This map has no Tiled source file.', 404);
    return file;
}
function run(root, filename, input) {
    return new Promise((resolve, reject) => {
        const child = execFile('python3', [path.join(__dirname, '../../tools/maps/editdoors.py'), filename],
            {timeout: 30000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8'}, (error, stdout) => {
                let data;
                try {data = JSON.parse(stdout);} catch (_) {return reject(Object.assign(new Error('The Tiled source could not be read. Check that Python 3 is available and the map is valid XML.'), {status: 503}));}
                if (error || data.error) return reject(Object.assign(new Error(data.error || 'The map could not be saved.'), {status: data.status || 500}));
                resolve(data);
            });
        child.stdin.on('error', () => {});
        child.stdin.end(JSON.stringify(input));
    });
}
function decorate(data, mapId) {
    return {...data, mapId, source: 'tools/maps/tmx/' + mapId + '.tmx', requiresBuild: true,
        doors: data.doors.map(door => ({...door, tileX: door.x / data.dimensions.tilewidth, tileY: door.y / data.dimensions.tileheight,
            activeGates: gates.filter(key => Object.hasOwn(door.properties, key))}))};
}
async function readDoors(root, mapId) {return decorate(await run(root, mapFile(root, mapId), {action: 'read'}), mapId);}
function validateChanges(changes, properties) {
    if (!changes || typeof changes !== 'object' || Array.isArray(changes) || Object.keys(changes).some(key => !editable.includes(key))) fail('Only supported entrance conditions and messages can be edited.');
    for (const [key, value] of Object.entries(changes)) {
        if (value === null) continue;
        if (messages.includes(key)) {DialogueFormat.validate(value, 'Entrance message'); continue;}
        if (key === 'level' || key === 'weapon_level') {
            if (!Number.isInteger(value) || value < 1 || value > 10000) fail('Level requirements must be whole numbers from 1 to 10000.');
        } else {
            if (typeof value !== 'string' || !value.trim() || value.length > 300 || /[\u0000-\u001f<>]/.test(value.replace(/[\n\r\t]/g, ''))) fail('Conditions must contain plain text. Clear the field to remove it.');
            if (key === 'time_range') {
                if (!WorldTime.isInRange(0, value) && !WorldTime.isInRange(WorldTime.duration / 2, value) && !/^([01]?\d|2[0-3]):[0-5]\d\s*-\s*([01]?\d|2[0-3]):[0-5]\d$/.test(value)) fail('Use game-time hours such as 08:00-18:00 or 22:00-06:00.');
            } else if (key === 'http_redirect') {
                let url; try {url = new URL(value);} catch (_) {fail('Use a full http:// or https:// redirect URL.');}
                if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail('Use a full http:// or https:// redirect URL without credentials.');
            } else if (/[\/?#%\\\r\n\t]/.test(value)) fail('Condition IDs must not contain URL path separators or query characters.');
        }
    }
    const merged = {...properties};
    for (const [key, value] of Object.entries(changes)) {if (value === null) delete merged[key]; else merged[key] = value;}
    if (gates.some(key => Object.hasOwn(changes, key)) && gates.filter(key => Object.hasOwn(merged, key)).length > 1) fail('Choose one main access condition. The game does not combine these conditions.');
    return changes;
}
// A per-map queue prevents two simultaneous requests from accepting the same revision.
const saves = new Map();
async function saveDoor(root, input) {
    const filename = mapFile(root, input?.mapId);
    if (!/^\d+$/.test(String(input.doorId)) || typeof input.revision !== 'string') fail('Choose an entrance and reload its source before saving.');
    const key = filename;
    const previous = saves.get(key) || Promise.resolve();
    const work = previous.catch(() => {}).then(async () => {
        const current = await readDoors(root, input.mapId);
        if (current.revision !== input.revision) fail('This map changed in another tab or in Tiled. Reload entrances before saving.', 409);
        const door = current.doors.find(door => door.id === String(input.doorId));
        if (!door) fail('This entrance was not found. Reload entrances.', 404);
        const changes = validateChanges(input.changes, door.properties);
        if (!Object.keys(changes).length) return current;
        return decorate(await run(root, filename, {action: 'save', doorId: input.doorId, revision: input.revision, changes}), input.mapId);
    });
    saves.set(key, work);
    try {return await work;} finally {if (saves.get(key) === work) saves.delete(key);}
}
function install(app, toolbox) {
    app.get('/local/api/doors', async (req, res) => {
        try {res.json(req.query.mapId === undefined ? {maps: JSON.parse(fs.readFileSync(path.join(toolbox.root, 'server/config.json'), 'utf8')).maps} : await readDoors(toolbox.root, req.query.mapId));}
        catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    app.post('/local/api/doors', async (req, res) => {
        try {
            if (toolbox.closed) fail('The toolbox is shutting down.', 503);
            if (toolbox.job?.status === 'running') fail('Wait for the map build to finish before saving entrances.', 409);
            toolbox.doorSaveCount = (toolbox.doorSaveCount || 0) + 1;
            try {res.json(await saveDoor(toolbox.root, req.body));} finally {toolbox.doorSaveCount--;}
        } catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
}
module.exports = {readDoors, saveDoor, validateChanges, install, gates, messages};

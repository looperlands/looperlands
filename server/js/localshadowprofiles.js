const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const {execFile} = require('child_process');
const {promisify} = require('util');
const {readPreview, tilesetId} = require('./localmappreview');
const {signature} = require('./localmapfiles');
const run = promisify(execFile);
const sourceDir = 'tools/maps/height_profiles';
const assetDir = 'client/img/common/height-proxies';
const endpoint = '/local/api/shadow-profiles';

function fail(message, status = 400) { throw Object.assign(new Error(message), {status}); }

function sourceFile(root, ...parts) {
    const file = path.join(root, ...parts);
    for (let p = file; p !== root; p = path.dirname(p)) {
        if (fs.lstatSync(p, {throwIfNoEntry: false})?.isSymbolicLink()) fail('Shadow profiles do not follow symbolic links.');
    }
    return file;
}

function listMaps(root) {
    const {maps} = JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8'));
    return maps.filter(id => typeof id === 'string' && /^[\w-]+$/.test(id)).map(id => ({id, name: id, tileset: tilesetId(id)}));
}

function readProfile(root, mapId) {
    root = path.resolve(root);
    if (!listMaps(root).some(map => map.id === mapId)) fail('Choose a configured map.');
    const map = readPreview(root, mapId, 0, 0);
    const tileset = tilesetId(mapId);
    const file = sourceFile(root, sourceDir, tileset + '.json');
    const sheet = sourceFile(root, 'client', map.tileset.slice(1));
    if (!fs.existsSync(sheet)) fail('The native tilesheet is missing for this map.', 404);
    const fd = fs.openSync(sheet, 'r'), header = Buffer.alloc(24);
    try { fs.readSync(fd, header, 0, header.length, 0); } finally { fs.closeSync(fd); }
    if (header.toString('ascii', 1, 4) !== 'PNG' || !header.readUInt32BE(16) || !header.readUInt32BE(20)) fail('Invalid native PNG tilesheet.', 422);
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const profile = text ? JSON.parse(text) : {};
    const revision = crypto.createHash('sha256').update(JSON.stringify([tileset, text, signature(sheet), map.width, map.height])).digest('hex');
    return {profile, file, details: {
        mapId, tileset, revision, artwork: '/local/api/map-artwork?mapId=' + encodeURIComponent(mapId),
        artWidth: header.readUInt32BE(16), artHeight: header.readUInt32BE(20), mapWidth: map.width, mapHeight: map.height,
        bodies: profile.bodies || [], paint: profile.paint || [], outdoors: profile.outdoors?.[mapId] || [],
        baseProfile: Boolean(text)
    }};
}

function validateRect(rect, width, height) {
    if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isSafeInteger)) fail('Bounds must be four whole native pixel coordinates.');
    const [left, top, right, bottom] = rect;
    if (left < 0 || top < 0 || right <= left || bottom <= top || right > width || bottom > height) fail('The bounds must fit the native tilesheet.');
}

function checkBody(body, details) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Each object needs a body definition.');
    validateRect(body.bounds, details.artWidth, details.artHeight);
}

function rectPixels([left, top, right, bottom]) {
    return (right - left) * (bottom - top);
}

function outdoorBounds(areas, details) {
    if (!Array.isArray(areas) || areas.length > 128) fail('Choose up to 128 outdoor rectangles.');
    return areas.map(area => {
        const {x, y, width, height} = area || {};
        if (![x,y,width,height].every(Number.isSafeInteger) || x < 0 || y < 0 || width <= 0 || height <= 0 ||
            x + width > details.mapWidth || y + height > details.mapHeight) fail('Outdoor bounds must fit the map in whole tiles.');
        return {x, y, width, height};
    });
}

async function bake(root, args, signal) {
    const program = sourceFile(root, 'tools/maps/generate_main_height_proxies.py');
    try {
        const {stdout} = await run('python3', [program, '--root', root, ...args], {signal, timeout: 120000, maxBuffer: 1024 * 1024});
        return stdout;
    } catch (error) {
        if (signal?.aborted) throw error;
        const stderr = error.stderr || '';
        if (error.code === 'ENOENT' || stderr.includes("No module named 'PIL'")) fail('Install Python 3 and Pillow in the toolbox environment to bake shadow profiles.', 503);
        if (error.killed) fail('Shadow baking timed out. Try smaller object bounds.', 422);
        fail(stderr.trim().split('\n').pop() || 'Shadow baking failed.', 422);
    }
}

// Replace each file atomically and publish the catalog last. All staging files live beside
// their destination, so saving also works with checkout and temporary storage on separate mounts.
function publish(updates) {
    const tag = '.' + crypto.randomUUID() + '.tmp';
    const staged = [], changed = [];
    try {
        for (const [file, bytes] of updates) {
            const temp = file + tag;
            const previous = fs.existsSync(file) ? fs.readFileSync(file) : null;
            fs.mkdirSync(path.dirname(file), {recursive: true});
            staged.push({file, temp, previous, bytes});
            if (bytes !== null) fs.writeFileSync(temp, bytes, {flag: 'wx'});
        }
        for (const item of staged) {
            if (item.bytes !== null) fs.renameSync(item.temp, item.file);
            else fs.rmSync(item.file, {force: true});
            changed.push(item);
        }
    } catch (error) {
        for (const {file, temp, previous} of changed.reverse()) {
            if (previous === null) fs.rmSync(file, {force: true});
            else { fs.writeFileSync(temp, previous); fs.renameSync(temp, file); }
        }
        throw error;
    } finally {
        for (const {temp} of staged) fs.rmSync(temp, {force: true});
    }
}

const json = value => JSON.stringify(value, null, 2) + '\n';

async function saveProfile(toolbox, input) {
    const root = path.resolve(toolbox.root);
    const {profile, file, details} = readProfile(root, input.mapId);
    if (input.revision !== details.revision) fail('The shared tileset profile changed. Reload before saving.', 409);
    if (!Array.isArray(input.bodies) || input.bodies.length > 512 || !Array.isArray(input.paint) || input.paint.length > 512) {
        fail('Choose up to 512 bodies and 512 painted shadow regions.');
    }
    input.bodies.forEach(body => checkBody(body, details));
    input.paint.forEach(rect => validateRect(rect, details.artWidth, details.artHeight));
    // Disjoint regions fit on the sheet. Allow overlapping seams and paint while bounding repeated rasterization.
    const pixels = input.bodies.reduce((total, body) => total + rectPixels(body.bounds), 0) +
        input.paint.reduce((total, rect) => total + rectPixels(rect), 0);
    if (pixels > Math.max(65536, 4 * details.artWidth * details.artHeight)) fail('Reduce overlapping body or paint rectangles.');
    if (input.paint.length && !input.bodies.length) fail('Add a shadow body before removing any painted shadows.');
    const areas = outdoorBounds(input.outdoors, details);
    const updated = {...profile, bodies: input.bodies, paint: input.paint, outdoors: {...profile.outdoors}};
    if (areas.length) updated.outdoors[input.mapId] = areas;
    else delete updated.outdoors[input.mapId];
    if (!Object.keys(updated.outdoors).length) delete updated.outdoors;
    const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-shadow-save-'));
    try {
        const stagedProfile = path.join(stage, 'profile.json');
        fs.writeFileSync(stagedProfile, json(updated));
        const {tileset} = details;
        const entry = input.bodies.length ? JSON.parse(await bake(root, ['--map', tileset, '--profile-file', stagedProfile, '--output-dir', stage])) : null;
        if (toolbox.closed) fail('The toolbox is shutting down.', 503);
        if (readProfile(root, input.mapId).details.revision !== input.revision) fail('The shared tileset profile changed while baking. Reload before saving.', 409);
        const catalogFile = sourceFile(root, assetDir, 'catalog.json');
        const catalog = fs.existsSync(catalogFile) ? JSON.parse(fs.readFileSync(catalogFile, 'utf8')) : {};
        if (entry) catalog[tileset] = entry;
        else delete catalog[tileset];
        const image = tileset + '.png', paint = tileset + '-baked-shadows.png';
        if (entry && (entry.height !== image || (entry.paint && entry.paint !== paint))) fail('The baker returned an unexpected asset filename.', 500);
        publish([[file, json(updated)], [sourceFile(root, assetDir, image), entry ? fs.readFileSync(path.join(stage, image)) : null],
            [sourceFile(root, assetDir, paint), entry?.paint ? fs.readFileSync(path.join(stage, paint)) : null], [catalogFile, json(catalog)]]);
        return readProfile(root, input.mapId).details;
    } finally { fs.rmSync(stage, {recursive: true, force: true}); }
}

async function previewBody(root, input, signal) {
    root = path.resolve(root);
    const {details} = readProfile(root, input.mapId);
    checkBody(input.body, details);
    const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-shadow-preview-'));
    try {
        const body = path.join(stage, 'body.json'), output = path.join(stage, 'preview.png');
        fs.writeFileSync(body, json(input.body));
        await bake(root, ['--map', details.tileset, '--preview-body', body, '--output', output], signal);
        return fs.readFileSync(output);
    } finally { fs.rmSync(stage, {recursive: true, force: true}); }
}

function install(app, toolbox) {
    const respond = handler => async (req, res) => {
        try { await handler(req, res); } catch (error) { res.status(error.status || 500).json({error: error.message}); }
    };
    app.get(endpoint, respond((req, res) => res.json(req.query.mapId === undefined ?
        {maps: listMaps(toolbox.root)} : readProfile(toolbox.root, req.query.mapId).details)));
    app.post(endpoint + '/preview', respond(async (req, res) => {
        const request = new AbortController();
        const cancel = () => request.abort();
        res.once('close', cancel);
        try { res.type('png').send(await previewBody(toolbox.root, req.body || {}, request.signal)); }
        catch (error) { if (!request.signal.aborted) throw error; }
        finally { res.off('close', cancel); }
    }));
    app.post(endpoint, respond(async (req, res) => {
        if (toolbox.closed) fail('The toolbox is shutting down.', 503);
        if (toolbox.job?.status === 'running' || toolbox.shadowSave) fail('Wait for the current build or shadow profile save to finish.', 409);
        toolbox.shadowSave = saveProfile(toolbox, req.body || {});
        try { res.json(await toolbox.shadowSave); } finally { toolbox.shadowSave = null; }
    }));
}

module.exports = {install};

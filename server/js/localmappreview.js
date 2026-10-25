const fs = require('fs');
const path = require('path');
const SIZE = 13;
const cache = new Map();
function fail(message, status = 400) {throw Object.assign(new Error(message), {status});}
function tileset(mapId) {return '/img/1/tilesheet_' + (['oadungeon', 'oaoverworld'].includes(mapId) ? 'oa' : mapId) + '.png';}
function crop(map, x, y) {
    const tiles = [];
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
        const tx = x + col - 6, ty = y + row - 6;
        tiles.push(tx < 0 || ty < 0 || tx >= map.width || ty >= map.height ? null : map.data[ty * map.width + tx] ?? 0);
    }
    return tiles;
}
function readPreview(root, mapId, x, y) {
    root = path.resolve(root);
    const maps = JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !maps.includes(mapId)) fail('Choose a configured map.');
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || Math.abs(x) > 1000000 || Math.abs(y) > 1000000) fail('Preview coordinates must be whole tile numbers within ±1000000.');
    const file = path.join(root, 'client/maps/world_client_' + mapId + '.json');
    for (let p = file; p !== path.resolve(root); p = path.dirname(p)) {
        if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) fail('Map previews do not follow symbolic links.');
    }
    let stat;
    try {stat = fs.statSync(file);} catch (_) {fail('Build ' + mapId + ' first to preview its map artwork.', 404);}
    const signature = stat.mtimeMs + ':' + stat.ctimeMs + ':' + stat.size;
    let entry = cache.get(file);
    if (!entry || entry.signature !== signature) {
        let map;
        try {map = require('./localmapfiles').readJson(file);} catch (_) {fail('The built map could not be read. Rebuild ' + mapId + '.', 422);}
        if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width < 1 || map.height < 1 || map.width * map.height > 2000000 || !Array.isArray(map.data)) fail('The built map has invalid tile data. Rebuild ' + mapId + '.', 422);
        entry = {signature, map};
    }
    cache.delete(file); cache.set(file, entry);
    if (cache.size > 4) cache.delete(cache.keys().next().value);
    return {mapId, x, y, size: SIZE, width: entry.map.width, height: entry.map.height, tilesize: entry.map.tilesize || 16, tileset: tileset(mapId), revision: signature, tiles: crop(entry.map, x, y)};
}
function install(app, toolbox) {
    app.get('/local/api/map-preview', (req, res) => {
        try {
            if (toolbox.job?.status === 'running') fail('The map is building. Preview it again when the build finishes.', 409);
            const number = value => typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : NaN;
            res.json(readPreview(toolbox.root, req.query.mapId, number(req.query.x), number(req.query.y)));
        } catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
}
module.exports = {crop, readPreview, install};

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {signature} = require('./localmapfiles');

function fingerprint(root, mapId) {
    const configured = JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !configured.includes(mapId)) throw Object.assign(new Error('Choose a configured map.'), {status: 400});
    require('./localtilebuilder').safe(root, 'tools/maps/tmx/' + mapId + '.tmx');
    const hash = crypto.createHash('sha256');
    function add(relative, recursive = false) {
        const file = path.join(root, relative);
        if (!fs.existsSync(file)) {hash.update(relative + ':missing'); return;}
        const stat = fs.lstatSync(file);
        if (stat.isSymbolicLink()) throw Object.assign(new Error('Map data sources must not contain symbolic links.'), {status: 400});
        hash.update(relative + ':' + signature(file));
        if (recursive && stat.isDirectory()) for (const entry of fs.readdirSync(file).sort()) add(relative + '/' + entry, true);
    }
    for (const relative of ['server/config.json', 'tools/maps/tmx/' + mapId + '.tmx', 'client/maps/world_client_' + mapId + '.json',
        'shared/js/mapmakerentities.json', 'shared/js/gametypes.js', 'client/js/audio.js', 'client/img/1', 'client/audio/music', 'client/audio/sounds', 'client/audio/ambient',
        'client/img/1/tilesheet_' + (['oadungeon', 'oaoverworld'].includes(mapId) ? 'oa' : mapId) + '.png']) add(relative);
    for (const relative of ['server/maps', 'tools/quests', 'tools/npcs', 'tools/worlds', 'tools/tiles', 'tools/interactions', 'client/sprites', 'client/tileActions']) add(relative, true);
    return hash.digest('hex');
}

function readers(root, mapId) {
    let library;
    const world = require('./localworldauthoring');
    return [
        ['map-list', 'Configured maps and choices', () => ({maps: JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps,
            catalog: require('./localencounterbuilder').catalog(), fishingCatalog: require('./localfishingbuilder').catalog(root), zoneCatalog:require('./localzonebuilder').catalog(root)})],
        ['source', 'Tiled objects and placements', () => require('./localmapsource').preload(root, mapId), false],
        ['map-canvas', 'Map artwork and collision data', () => {
            const canvas = require('./localworldconnections').canvas(root, mapId);
            try {
                const server = require('./localmapfiles').readJson(require('./localtilebuilder').safe(root, 'server/maps/world_server_' + mapId + '.json'));
                const collisions = server.collisions || [];
                if (collisions.length !== canvas.collisions.length || collisions.some((value, index) => value !== canvas.collisions[index])) canvas.serverCollisions = collisions;
            } catch (_) {} // Client geometry remains usable if the server export is missing.
            const file = path.join(root, 'client/img/1/tilesheet_' + (['oadungeon', 'oaoverworld'].includes(mapId) ? 'oa' : mapId) + '.png');
            return {...canvas, tileset: '/local/api/map-artwork?mapId=' + encodeURIComponent(mapId), artworkRevision: fs.existsSync(file) ? signature(file) : 'missing'};
        }],
        ['doors', 'Doors and portals', () => require('./localdoorbuilder').readDoors(root, mapId)],
        ['lighting', 'Lights and shadows', () => require('./locallightingbuilder').readLighting(root, mapId)],
        ['encounters', 'Chests and encounters', () => require('./localencounterbuilder').readEncounters(root, mapId)],
        ['zones', 'Checkpoints and gameplay zones', () => require('./localzonebuilder').readZones(root,mapId)],
        ['fishing', 'Fishing areas and catches', () => require('./localfishingbuilder').readFishing(root, mapId)],
        ['npcs', 'NPC routines', () => require('./localnpcbuilder').readBehavior(root, mapId)],
        ['quests', 'Quests and progression', () => require('./localquestbuilder').readQuests(root, mapId)],
        ['tile-authoring', 'Interactions and tile actions', () => require('./localtilebuilder').readTool(root, mapId)],
        ['world-authoring', 'Events, dialogue, scenes and sequences', async () => {
            const catalog = await world.catalog(root, mapId), tools = {};
            for (const tool of ['events', 'dialogues', 'atmosphere', 'scenes', 'sequences', 'ambient']) {
                const {catalog: _, ...data} = await world.readTool(root, mapId, tool, catalog);
                tools[tool] = data;
            }
            return {catalog, tools};
        }],
        ['entity-library', 'Entity library', () => library = require('./localentitybuilder').library(root)],
        ['analysis', 'Inspector and validation', async () => {
            const report = await require('./localmapanalysis').analyze(root, mapId);
            const {tiles, collisions, tileset, ...validation} = report;
            let inspector = {...validation};
            try {
                const source = await require('./localentitybuilder').readPlacements(root, mapId);
                source.entries = library?.entries || require('./localassetbuilder').catalog(root).entries;
                inspector = require('./localentitybuilder').overlay(inspector, source);
                delete inspector.placements.entries;
            } catch (error) {inspector.placementError = error.message;}
            return {validation, inspector};
        }]
    ];
}

function createWorkspace(root, options = {}) {
    const cache = new Map();
    const revision = options.fingerprint || (id => fingerprint(root, id));
    function load(mapId) {
        const version = revision(mapId);
        let entry = cache.get(mapId);
        if (entry?.version === version) {cache.delete(mapId); cache.set(mapId, entry); return entry;}
        entry = {version, events: [], listeners: new Set()};
        const emit = event => {entry.events.push(event); for (const listener of entry.listeners) listener(event);};
        entry.promise = Promise.resolve().then(async () => {
            const tasks = (options.readers || (id => readers(root, id)))(mapId);
            for (const [index, [key, label, read, publish = true]] of tasks.entries()) {
                emit({type: 'progress', mapId, label, completed: index, total: tasks.length});
                try {
                    const data = await read();
                    if (publish) emit({type: 'resource', key, data});
                } catch (error) {
                    if (publish) emit({type: 'resource', key, error: error.message, status: error.status || 500});
                    // A malformed source must not hide independent editor data.
                }
                await new Promise(resolve => setImmediate(resolve));
            }
            if (revision(mapId) !== version) throw Object.assign(new Error('Map files changed while loading. Reload map data to try again.'), {status: 409});
            emit({type: 'ready', mapId, revision: version});
        }).catch(error => {
            emit({type: 'failed', error: error.message, status: error.status || 500});
            if (cache.get(mapId) === entry) cache.delete(mapId);
        }).finally(() => {entry.done = true;});
        cache.delete(mapId); cache.set(mapId, entry);
        if (cache.size > 2) cache.delete(cache.keys().next().value);
        return entry;
    }
    return {load, revision};
}

function install(app, toolbox) {
    const workspace = createWorkspace(toolbox.root);
    app.get('/local/api/map-workspace', async (req, res) => {
        try {
            if (toolbox.job?.status === 'running') return res.status(409).json({error: 'Wait for the map build to finish before loading map data.'});
            const mapId = req.query.mapId;
            if (req.query.revision === '1') return res.json({revision: workspace.revision(mapId)});
            const entry = workspace.load(mapId);
            res.status(200).setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
            res.flushHeaders();
            const send = event => {if (!res.destroyed) res.write(JSON.stringify(event) + '\n');};
            for (const event of entry.events) send(event);
            entry.listeners.add(send);
            res.once('close', () => entry.listeners.delete(send));
            await entry.promise;
            entry.listeners.delete(send);
            if (!res.destroyed) res.end();
        } catch (error) {if (!res.headersSent) res.status(error.status || 500).json({error: error.message}); else res.end();}
    });
}
module.exports = {fingerprint, readers, createWorkspace, install};

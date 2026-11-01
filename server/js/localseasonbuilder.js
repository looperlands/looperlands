const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Content = require('./seasonalcontent');
const Contract = require('../world-definitions/halloween-contract');
const Availability = require('./contentavailability');
const Ambient = require('../../client/js/ambientconfig');
const Types = require('../../shared/js/gametypes');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function imageUrl(image) {return '/local/api/seasons/image?image=' + encodeURIComponent(image);}
function imageEntries(root, sources) {
    return [...new Set(sources)].sort().flatMap(image => {
        // Legacy placeholders and missing optional inventory sprites are not choices.
        // An image referenced by a saved event still passes strict source validation.
        try {return [{image, name: path.basename(image, '.png').replaceAll('-', ' '), url: imageUrl(image), ...Content.png(root, image)}];}
        catch (_) {return [];}
    });
}
function images(root, folder, pattern) {
    const directory = Content.safe(root, 'client' + folder);
    if (!fs.existsSync(directory)) return [];
    return imageEntries(root, fs.readdirSync(directory).filter(name => pattern.test(name)).map(name => folder + '/' + name));
}
function storyTexts(root, mapId, events) {
    if (mapId !== 'main') return {storyTexts: [], storyTextConflicts: []};
    const entries = require('../world-definitions/halloween-story').defaultTexts.map(entry => ({...entry, eventId: 'halloween',
        original: entry.value, value: events.find(event => event.id === 'halloween')?.textOverrides?.[entry.id] ?? entry.value}));
    const source = 'tools/quests/' + mapId + '.json', file = Content.safe(root, source);
    let overrides = [];
    if (fs.existsSync(file)) {
        try {overrides = JSON.parse(fs.readFileSync(file, 'utf8')).overrides || []; if (!Array.isArray(overrides)) throw new Error('Invalid overrides');}
        catch (_) {return {storyTexts: entries, storyTextConflicts: [], storyTextWarning: 'Quest builder overrides could not be read. Repair ' + source + ' to verify which quest text will appear in the game.'};}
    }
    const conflicts = [];
    for (const entry of entries) {
        const match = /^quest:([^:]+):([^:]+)$/.exec(entry.id);
        if (!match) continue;
        const override = overrides.find(row => row.id === match[1]);
        if (!override?.changes || !Object.hasOwn(override.changes, match[2]) || JSON.stringify(override.changes[match[2]]) === JSON.stringify(entry.value)) continue;
        entry.effective = override.changes[match[2]];
        conflicts.push({id: entry.id, questId: match[1], field: match[2], source, seasonalValue: entry.value, value: entry.effective});
    }
    return {storyTexts: entries, storyTextConflicts: conflicts};
}
function catalog(root, mapId, events = Content.readDocument(root, mapId).events) {
    const {client} = Content.context(root, mapId), npcs = [], decorationSources = events.flatMap(event => event.decorations.map(row => row.image));
    Types.forEachKind((kind, id) => {
        if (Types.isNpc(kind)) npcs.push({id, name: id});
        if (Types.isItem(kind) && !id.startsWith('NFT_')) decorationSources.push('/img/1/item-' + id + '.png');
    });
    return {width: client.width, height: client.height, scenes: client.scenes, npcs,
        decorationImages: imageEntries(root, decorationSources),
        parallaxImages: images(root, '/img/parallax', /^[a-z0-9][a-z0-9-]{0,79}\.png$/),
        ambientPresets: Object.entries(Ambient.presets).map(([id, {name, radius, volume}]) => ({id, name, radius, volume})),
        customSounds: require('./localambientassets').catalog(root), registeredEvents: Contract.registered(mapId), storyLinks: Contract.storyLinks(mapId),
        ...storyTexts(root, mapId, events)};
}
function revision(document, map) {
    // Geometry is part of the edit base: a concurrent map/scene save must not
    // silently validate a draft against a different layout.
    return hash({document, server: {width: map.server.width, height: map.server.height, collisions: map.server.collisions,
        doors: map.server.doors, staticEntities: map.server.staticEntities, staticChests: map.server.staticChests},
    client: {width: map.client.width, height: map.client.height, data: map.client.data, scenes: map.client.scenes}});
}
function readTool(root, mapId) {
    const document = Content.readDocument(root, mapId);
    Contract.validate(mapId, document.events);
    return {mapId, revision: revision(document, Content.context(root, mapId)), events: document.events,
        source: 'tools/seasons/' + mapId + '.json', catalog: catalog(root, mapId, document.events), requiresRestart: true,
        activeEvents: document.events.filter(event => Availability.isAvailable({...event.availability, enabled: event.enabled})).map(event => event.id)};
}
function saveTool(root, input, beforeWrite = () => {}) {
    Content.fields(input, ['mapId', 'revision', 'events'], 'Seasonal save request');
    const current = Content.readDocument(root, input.mapId);
    if (typeof input.revision !== 'string' || input.revision !== revision(current, Content.context(root, input.mapId))) Content.fail('These seasonal settings or map geometry changed. Keep your draft, reload, then apply your edits again.', 409);
    const document = {version: 1, events: input.events};
    Content.validate(root, input.mapId, document); Contract.validate(input.mapId, document.events);
    require('./localquestbuilder').validateSeasonalDependencies(root, input.mapId, document.events);
    if (input.mapId === 'main') require('../world-definitions/halloween-text').validate(require('../world-definitions/halloween-story').defaultTexts,
        document.events.find(event => event.id === 'halloween').textOverrides);
    const json = JSON.stringify(document, null, 2) + '\n';
    if (Buffer.byteLength(json) > Content.MAX_BYTES) Content.fail('Seasonal content source exceeds 1 MB.', 413);
    beforeWrite();
    if (input.revision !== revision(Content.readDocument(root, input.mapId), Content.context(root, input.mapId))) Content.fail('These seasonal settings changed before saving. Reload and apply your edits again.', 409);
    const file = Content.source(root, input.mapId);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    const temporary = file + '.' + crypto.randomUUID() + '.tmp';
    try {fs.writeFileSync(temporary, json, {flag: 'wx'}); fs.renameSync(temporary, file);}
    finally {fs.rmSync(temporary, {force: true});}
    return readTool(root, input.mapId);
}
function install(app, toolbox) {
    const writable = () => {
        if (toolbox.closed) Content.fail('The toolbox is shutting down.', 503);
        if (toolbox.job?.status === 'running') Content.fail('Wait for the build to finish before saving.', 409);
    };
    app.get('/local/api/seasons', (req, res) => {
        try {res.json(req.query.mapId === undefined ? {maps: Content.maps(toolbox.root)} : readTool(toolbox.root, req.query.mapId));}
        catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    app.post('/local/api/seasons', (req, res) => {
        try {writable(); res.json(saveTool(toolbox.root, req.body, writable));}
        catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
    app.get('/local/api/seasons/image', (req, res) => {
        try {
            const image = req.query.image;
            if (typeof image !== 'string' || !/^\/img\/(?:1|parallax)\/[A-Za-z0-9][A-Za-z0-9_-]*\.png$/.test(image)) Content.fail('Choose a local seasonal PNG image.');
            Content.png(toolbox.root, image);
            res.type('image/png').send(fs.readFileSync(Content.safe(toolbox.root, 'client' + image)));
        } catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
}
module.exports = {readTool, saveTool, catalog, install};

const fs = require('fs');
const path = require('path');
const World = require('./localworldauthoring');
const Tiles = require('./localtilebuilder');
const Contract = require('../../shared/js/mapmakerauthoring');

const projectRoot = path.resolve(__dirname, '../..');

function mergeFlow(mapId, platformFlow, root = projectRoot) {
    const rules = World.readDocument(root, mapId.replace(/^world_/, '')).rules;
    World.validateRules(rules);
    if (!rules.some(rule => rule.enabled)) return platformFlow;
    let next = 1000000;
    function visit(blocks) {
        for (const block of blocks || []) {
            if (Number.isSafeInteger(block.idx)) next = Math.max(next, block.idx + 1);
            for (const key of ['then', 'true', 'false']) visit(block[key]);
        }
    }
    visit(platformFlow?.handlers);
    const authored = Contract.compile(rules, next);
    return {...platformFlow, handlers: [...(platformFlow?.handlers || []), ...authored.handlers]};
}

function applyMap(root, mapId, map) {
    const document = World.readDocument(root, mapId);
    require('./localparallaxassets').validateLayers(root,document.atmosphere);
    require('../../client/js/ambientconfig').validate(document.ambientSounds, map);
    require('./localambientassets').validateReferences(root, document.ambientSounds);
    map = {...map, ambientSounds: document.ambientSounds};
    return Tiles.applyMap(World.applyAtmosphere(require('./localworldscenes').applyScenes(map, document.scenes), document.atmosphere, document.weather), Tiles.document(root, mapId));
}

function validate(root = projectRoot) {
    const {WorldDefinitions} = require('./worlddefinitions');
    const registry = require('../world-definitions').register(new WorldDefinitions(), {authored: false});
    require('./localquestbuilder').registerLocalQuests(root, registry, {strict: true});
    for (const mapId of Tiles.maps(root)) {
        const fishingMap = JSON.parse(fs.readFileSync(path.join(root, 'server/maps/world_server_' + mapId + '.json'), 'utf8'));
        require('./fishingareas').validate(fishingMap.fishingAreas || [], fishingMap);
        const checkpointIds=new Set();
        for(const cp of fishingMap.checkpoints||[]){if(!Number.isSafeInteger(cp.id)||cp.id<1||checkpointIds.has(cp.id))throw new Error('Checkpoint IDs must be unique positive whole numbers in '+mapId);checkpointIds.add(cp.id);}
        const doc = World.readDocument(root, mapId), tileDoc = Tiles.document(root, mapId);
        World.validateRules(doc.rules);
        require('./scriptedsequenceconfig').validate(doc.sequences);
        require('./scriptedsequenceloader').validateDefinitions(root,mapId,doc.sequences,registry);
        World.validateDialogues(doc.dialogues);
        World.validateAtmosphere(doc.atmosphere);
        require('../../client/js/ambientconfig').validate(doc.ambientSounds, fishingMap);
        require('./localambientassets').validateReferences(root, doc.ambientSounds);
        if (doc.scenes != null || doc.atmosphere.length || doc.weather || doc.ambientSounds.length || Object.keys(tileDoc.actions).length || tileDoc.placements.length) {
            const map = Tiles.readMap(root, mapId);
            applyMap(root, mapId, map);
            Tiles.validate(tileDoc, map, {base: Tiles.base(root, mapId), quests: registry.quests.map(quest => quest.id)});
        }
        const {readOverrides, mergeBehavior} = require('./npcbehaviorfiles');
        const overrides = readOverrides(root, mapId), base = registry.behavior(mapId);
        if (base || overrides.npcs.length) require('./npcbehaviorconfig').validateConfig(mergeBehavior(base, overrides));
    }
}

// Run only in the disposable production image. Local exports remain the Tiled
// baseline used by Restore original; local playtests apply the same overlays.
function build(root = projectRoot) {
    validate(root);
    const outputs = [];
    for (const mapId of Tiles.maps(root)) {
        const doc = World.readDocument(root, mapId), tiles = Tiles.document(root, mapId);
        if (doc.scenes == null && !doc.atmosphere.length && !doc.weather && !doc.ambientSounds.length && !tiles.placements.length) continue;
        const file = path.join(root, 'client/maps/world_client_' + mapId + '.json');
        const map = applyMap(root, mapId, JSON.parse(fs.readFileSync(file, 'utf8')));
        outputs.push([file, JSON.stringify(map)], [file.replace(/\.json$/, '.js'), 'var mapData = ' + JSON.stringify(map) + ';']);
        const server = path.join(root, 'server/maps/world_server_' + mapId + '.json');
        const serverMap = JSON.parse(fs.readFileSync(server, 'utf8'));
        outputs.push([server, JSON.stringify({...serverMap, scenes: map.scenes})]);
    }
    for (const [file, source] of outputs) fs.writeFileSync(file, source);
    return outputs.length;
}

module.exports = {mergeFlow, applyMap, validate, build};

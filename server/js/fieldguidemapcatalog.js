const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AltNames = require('../../shared/js/altnames');
const NpcTalk = require('../../shared/js/npctalk');
const root = path.resolve(__dirname, '../..');

function entryFactory(types, lakes, properties, overrides) {
    const authored = new Map(Object.values(overrides.maps).flatMap(map => map.entries).map(entry => [entry.target, entry]));
    return raw => {
        if (typeof raw !== 'string' && typeof raw !== 'number') return null;
        let kind = typeof raw === 'number' || /^\d+$/.test(raw) ? Number(raw) : types.getKindFromString(raw) ?? types.Entities[raw];
        // Pickup variants (e.g. gold piles) award one inventory item and share its entry.
        if (kind !== undefined && properties.isCollectable(kind)) kind = properties.getCollectItem(kind);
        const target = lakes.isFish(raw) ? raw : kind !== undefined ? types.getKindAsString(kind) : null;
        if (!target) return null;
        const category = lakes.isFish(target) ? 'fish' : types.isMob(kind) ? 'monsters' : types.isItem(kind) ? 'items' : null;
        if (!category) return null;
        if (authored.has(target)) return {...authored.get(target)};
        const sprite = (category === 'items' ? ['item-' + target, target] : [target]).find(name =>
            fs.existsSync(path.join(root, 'client/sprites', name + '.json')) && fs.existsSync(path.join(root, 'client/img/1', name + '.png')));
        const label = AltNames.getName(target).replace(/_/g, ' ');
        return {id: /^[a-zA-Z0-9_-]{1,80}$/.test(target) ? target : 'asset-' + crypto.createHash('sha256').update(target).digest('hex').slice(0, 32),
            target, category, name: label.charAt(0).toUpperCase() + label.slice(1), sprite: sprite || null,
            visibility: 'unknown', completion: {items: 'obtain', fish: 'catch', monsters: 'defeat'}[category],
            hint: {items: 'Explore this map to find this item.', fish: 'Fish in this map’s waters.', monsters: 'Explore this map to face this opponent.'}[category]};
    };
}

function mapCollection(server, client, actions, quests, makeEntry, properties, types, lakes) {
    const entries = new Map(), shops = new Set(), seen = new Set();
    function add(raw) {
        const entry = makeEntry(raw);
        if (!entry || seen.has(entry.id)) return;
        seen.add(entry.id); entries.set(entry.id, entry);
        if (entry.category === 'monsters') {
            for (const [item, chance] of Object.entries(properties[entry.target]?.drops || {})) if (chance > 0) add(item);
            // These adds are spawned by worldserver's boss mechanics rather than map tiles.
            for (const child of {seacreature: ['tentacle', 'tentacle2'], cobslimeking: ['cobslimeblue', 'cobslimeyellow', 'cobslimered']}[entry.target] || []) add(child);
        }
    }
    for (const area of server.roamingAreas || []) if (area.nb > 0) add(area.type);
    for (const target of Object.values(server.staticEntities || {})) {
        add(target);
        for (const line of NpcTalk[target] || []) {
            const match = line.match(/^\/openShop\s+(\S+)/);
            if (match) shops.add(match[1]);
        }
    }
    for (const chest of [...server.staticChests || [], ...server.chestAreas || []]) {
        for (const item of chest.i || []) if (!chest.c || chest.c[item] === undefined || chest.c[item] > 0) add(item);
    }
    for (const lake of new Set(Object.values(client.fishingTiles || {}))) for (const fish of Object.keys(lakes[lake]?.fish || {})) add(fish);
    for (const action of new Set(Object.values(client.actionTiles || {}).map(tile => tile.action))) {
        const definition = actions[action];
        for (const crop of Object.values(definition?.crops || {})) {
            add(crop.yieldItem);
            for (const drop of crop.rareDrops || []) if (drop.chance > 0) add(drop.item);
            if (crop.seedReturnChance > 0) add(definition.seedItem);
        }
    }
    const npcs = new Set(Object.values(server.staticEntities || {}).map(name => types.getKindFromString(name)));
    for (const quest of quests) if (quest.reward && npcs.has(quest.npc)) add(quest.reward.item);
    return {edition: '1', entries: [...entries.values()].sort((a, b) => a.id.localeCompare(b.id)), shops: [...shops]};
}

function buildMapCatalog(types, lakes, overrides) {
    const properties = require('./properties');
    const makeEntry = entryFactory(types, lakes, properties, overrides);
    const {definitions} = require('./worlddefinitions');
    const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    const maps = {};
    for (const file of fs.readdirSync(path.join(root, 'server/maps')).filter(name => /^world_server_.+\.json$/.test(name))) {
        const map = file.slice('world_server_'.length, -5);
        maps[map] = mapCollection(read(path.join(root, 'server/maps', file)), read(path.join(root, 'client/maps/world_client_' + map + '.json')),
            read(path.join(root, 'client/tileActions', map + '.json')), definitions.quests, makeEntry, properties, types, lakes);
    }
    // Authored entries are overrides; they never add membership to an unrelated map.
    return {version: 1, maps};
}
module.exports = {buildMapCatalog, mapCollection, entryFactory};

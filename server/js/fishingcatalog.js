const crypto = require('crypto');
const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// Only fish available in a map's waters belong in its public fishing collection.
// Shop stock, secret entries and excluded content never increase the target.
function buildFishingCatalog(guide, lakes, readMap) {
    const fish = new Map(), collections = [];
    for (const [id, collection] of Object.entries(guide.maps)) {
        const waters = [...new Set(Object.values(readMap(id).fishingTiles || {}))]
            .map(lake => lakes[lake]).filter(lake => lake?.fish);
        const entries = collection.entries.filter(entry => entry.category === 'fish' &&
            ['listed', 'unknown'].includes(entry.visibility) && entry.completion === 'catch' &&
            waters.some(lake => rarities.includes(lake.fish[entry.target])));
        if (!entries.length) continue;
        for (const entry of entries) {
            const row = fish.get(entry.id) || {id: entry.id, target: entry.target, name: entry.name, sprite: entry.sprite, habitats: []};
            for (const rarity of rarities) {
                const matching = waters.filter(lake => lake.fish[entry.target] === rarity);
                if (!matching.length) continue;
                const levels = matching.map(lake => lake.level).filter(level => Number.isInteger(level) && level > 0);
                row.habitats.push({collectionId: id, rarity, minLevel: levels.length === matching.length ? Math.min(...levels) : null});
            }
            fish.set(entry.id, row);
        }
        const members = [...new Set(entries.map(entry => entry.id))].sort();
        const edition = crypto.createHash('sha256').update(JSON.stringify(members)).digest('hex').slice(0, 12);
        collections.push({id, name: id.replace(/[_-]/g, ' ').replace(/\b\w/g, value => value.toUpperCase()), edition, fish: members});
    }
    for (const row of fish.values()) {
        row.habitats.sort((a, b) => a.collectionId.localeCompare(b.collectionId) || rarities.indexOf(a.rarity) - rarities.indexOf(b.rarity));
        const tiers = new Set(row.habitats.map(habitat => habitat.rarity));
        // A fish can have different rarities in different waters; never invent one global tier.
        row.rarity = tiers.size === 1 ? [...tiers][0] : null;
    }
    return {schemaVersion: 1, fish: [...fish.values()].sort((a, b) => a.id.localeCompare(b.id)), collections: collections.sort((a, b) => a.id.localeCompare(b.id))};
}
module.exports = {buildFishingCatalog};

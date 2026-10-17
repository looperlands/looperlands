const crypto = require('crypto');

// Only fish available in a map's waters belong in its public fishing collection.
// Shop stock, secret entries and excluded content never increase the target.
function buildFishingCatalog(guide, lakes, readMap) {
    const fish = new Map(), collections = [];
    for (const [id, collection] of Object.entries(guide.maps)) {
        const water = new Set(Object.values(readMap(id).fishingTiles || {})
            .flatMap(lake => Object.keys(lakes[lake]?.fish || {}).filter(target => ['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(lakes[lake].fish[target]))));
        const entries = collection.entries.filter(entry => entry.category === 'fish' &&
            ['listed', 'unknown'].includes(entry.visibility) && entry.completion === 'catch' && water.has(entry.target));
        if (!entries.length) continue;
        for (const entry of entries) fish.set(entry.id, {id: entry.id, target: entry.target, name: entry.name, sprite: entry.sprite});
        const members = [...new Set(entries.map(entry => entry.id))].sort();
        const edition = crypto.createHash('sha256').update(JSON.stringify(members)).digest('hex').slice(0, 12);
        collections.push({id, name: id.replace(/[_-]/g, ' ').replace(/\b\w/g, value => value.toUpperCase()), edition, fish: members});
    }
    return {schemaVersion: 1, fish: [...fish.values()].sort((a, b) => a.id.localeCompare(b.id)), collections: collections.sort((a, b) => a.id.localeCompare(b.id))};
}
module.exports = {buildFishingCatalog};

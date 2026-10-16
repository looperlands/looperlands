const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const categories = ['items', 'fish', 'monsters'];
const rules = {items: ['obtain', 'loot'], fish: ['catch'], monsters: ['defeat']};
const flag = (id, state) => 'field-guide:entry:' + id + ':' + state;
const visitFlag = map => 'field-guide:map:' + map;

function validateCatalog(catalog, types, lakes) {
    const idPattern = /^[a-zA-Z0-9_-]{1,80}$/;
    const validId = value => typeof value === 'string' && idPattern.test(value);
    if (catalog.version !== 1 || !catalog.maps || typeof catalog.maps !== 'object') throw new Error('Invalid Field Guide catalog');
    const definitions = new Map();
    for (const [map, collection] of Object.entries(catalog.maps)) {
        if (!validId(map) || !collection || !validId(collection.edition) || !Array.isArray(collection.entries)) throw new Error('Invalid Field Guide map: ' + map);
        const ids = new Set();
        for (const entry of collection.entries) {
            if (!entry || !validId(entry.id) || ids.has(entry.id) || !categories.includes(entry.category) ||
                !['listed', 'unknown', 'secret', 'excluded'].includes(entry.visibility) || !rules[entry.category].includes(entry.completion) ||
                typeof entry.name !== 'string' || !entry.name || typeof entry.hint !== 'string' ||
                typeof entry.target !== 'string' || entry.sprite !== null && (typeof entry.sprite !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(entry.sprite))) throw new Error('Invalid Field Guide entry: ' + entry?.id);
            ids.add(entry.id);
            const kind = types.getKindFromString(entry.target);
            if (entry.category === 'monsters' ? !types.isMob(kind) : entry.category === 'fish' ? !lakes.isFish(entry.target) : !types.isItem(kind)) throw new Error('Unknown Field Guide target: ' + entry.target);
            const identity = JSON.stringify([entry.category, entry.target, entry.completion, entry.visibility]);
            if (definitions.has(entry.id) && definitions.get(entry.id) !== identity) throw new Error('Conflicting Field Guide entry: ' + entry.id);
            definitions.set(entry.id, identity);
        }
    }
    return catalog;
}
function loadCatalog(types, lakes) {
    const overrides = validateCatalog(JSON.parse(fs.readFileSync(path.join(__dirname, '../field-guide.json'), 'utf8')), types, lakes);
    return validateCatalog(require('./fieldguidemapcatalog').buildMapCatalog(types, lakes, overrides), types, lakes);
}
function project(collection, facts) {
    const entries = [], required = [], bonuses = [];
    for (const entry of collection.entries) {
        if (entry.visibility === 'excluded') continue;
        const completed = facts.has(flag(entry.id, 'completed'));
        const discovered = completed || facts.has(flag(entry.id, 'discovered'));
        const bonus = entry.visibility === 'secret';
        if (bonus && !discovered) continue;
        const state = completed ? 'completed' : discovered ? 'discovered' : 'unknown';
        const revealed = discovered || entry.visibility === 'listed';
        const row = {
            id: crypto.createHash('sha256').update(entry.id).digest('hex').slice(0, 24),
            category: entry.category, state, bonus, completion: entry.completion,
            name: revealed ? entry.name : null, sprite: revealed ? entry.sprite : null, hint: entry.hint
        };
        entries.push(row);
        (bonus ? bonuses : required).push(row);
    }
    return {edition: collection.edition, entries, totals: {
        total: required.length, discovered: required.filter(e => e.state !== 'unknown').length,
        completed: required.filter(e => e.state === 'completed').length
    }, bonusDiscoveries: bonuses.length};
}
module.exports = {loadCatalog, validateCatalog, project, flag, visitFlag};

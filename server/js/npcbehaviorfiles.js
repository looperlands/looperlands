const fs = require('fs');
const path = require('path');
const directory = 'tools/npcs';
function filename(root, mapId) {
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId)) throw new Error('Choose a configured map.');
    const file = path.resolve(root, directory, mapId + '.json');
    for (let current = file; current !== path.resolve(root); current = path.dirname(current)) {
        if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('NPC source paths must not contain symbolic links.');
    }
    return file;
}
function readOverrides(root, mapId) {
    const file = filename(root, mapId);
    if (!fs.existsSync(file)) return {version: 1, npcs: []};
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.version !== 1 || !Array.isArray(data.npcs) || data.npcs.length > 500 || new Set(data.npcs.map(npc => npc.key)).size !== data.npcs.length) throw new Error('Invalid NPC behaviour source: ' + mapId);
    return data;
}
function mergeBehavior(base, overrides) {
    const config = structuredClone(base || {enabled: true, npcs: []});
    for (const npc of overrides.npcs) {
        const index = config.npcs.findIndex(row => row.key === npc.key);
        if (index < 0) config.npcs.push(structuredClone(npc)); else config.npcs[index] = structuredClone(npc);
    }
    return config;
}
module.exports = {filename, readOverrides, mergeBehavior};

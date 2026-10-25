const fs = require('fs');
const cache = new Map();
function signature(file) {
    const stat = fs.statSync(file, {bigint: true});
    return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join(':');
}
function readJson(file) {
    const version = signature(file);
    let entry = cache.get(file);
    if (!entry || entry.version !== version) entry = {version, data: JSON.parse(fs.readFileSync(file, 'utf8'))};
    cache.delete(file); cache.set(file, entry);
    if (cache.size > 48) cache.delete(cache.keys().next().value);
    // Readers may apply authoring overlays; keep the shared source immutable.
    return structuredClone(entry.data);
}
module.exports = {readJson, signature};

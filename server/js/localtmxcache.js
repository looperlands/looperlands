const fs = require('fs');

// Share completed and in-flight reads across tools. Saves still go through the
// Python editor's content revision check; a changed file never reuses a read.
const cache = new Map();
function primeTmx(file, reader, data, version) {
    if (signature(file) === version) cache.set(file + ':' + reader, {version, promise: Promise.resolve(data)});
}
function signature(file) {
    const stat = fs.statSync(file, {bigint: true});
    return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join(':');
}
async function readTmx(file, reader, load) {
    const key = file + ':' + reader, version = signature(file);
    let entry = cache.get(key);
    if (!entry || entry.version !== version) {
        entry = {version};
        entry.promise = Promise.resolve().then(load).then(data => {
            if (signature(file) !== version && cache.get(key) === entry) cache.delete(key);
            return data;
        }).catch(error => {
            if (cache.get(key) === entry) cache.delete(key);
            throw error;
        });
    }
    cache.delete(key); cache.set(key, entry);
    if (cache.size > 96) cache.delete(cache.keys().next().value);
    return structuredClone(await entry.promise);
}
module.exports = {readTmx, primeTmx, signature};

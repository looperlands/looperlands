const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const stateFile = '.mapmaker-client.json';
function clientFingerprint(root) {
    const hash = crypto.createHash('sha256');
    function file(relative) {
        const stat = fs.statSync(path.join(root, relative), {bigint: true});
        hash.update(JSON.stringify([relative, String(stat.size), String(stat.mtimeNs)]));
    }
    function directory(relative) {
        for (const entry of fs.readdirSync(path.join(root, relative), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
            const child = relative + '/' + entry.name;
            // Map exports are independent files, never inputs to the JS bundles.
            if (child === 'client/maps') continue;
            if (entry.isSymbolicLink()) throw new Error('Use a full build for symbolic links.');
            if (entry.isDirectory()) directory(child);
            else file(child);
        }
    }
    directory('client');
    for (const relative of ['bin/build-client.js', 'bin/mapmaker-client.js', 'bin/r.js', 'package-lock.json']) file(relative);
    // The generated AMD module is refreshed by the full builder. Check its source
    // too so newly saved entity definitions always trigger a compilation.
    hash.update(fs.readFileSync(path.join(root, 'shared/js/mapmakerentities.json')));
    return hash.digest('hex');
}
function canReuseClient(root) {
    try {
        const state = JSON.parse(fs.readFileSync(path.join(root, 'client-build', stateFile), 'utf8'));
        if (state.version !== 1 || !state.fingerprint) return false;
        for (const relative of ['index.html', 'js/home.js', 'js/game.js', 'js/lib/require-jquery.js']) {
            if (!fs.statSync(path.join(root, 'client-build', relative)).isFile()) return false;
        }
        return state.fingerprint === clientFingerprint(root);
    } catch (_) {return false;}
}
function recordClientBuild(root, fingerprint) {
    const file = path.join(root, 'client-build', stateFile);
    // An edit during compilation must not certify an inconsistent client.
    if (!fingerprint || clientFingerprint(root) !== fingerprint) return;
    fs.writeFileSync(file, JSON.stringify({version: 1, fingerprint}));
}
module.exports = {clientFingerprint, canReuseClient, recordClientBuild};

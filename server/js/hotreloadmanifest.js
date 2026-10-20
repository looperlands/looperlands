const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {POLICIES} = require('./hotreloadpolicy');

const hash = source => crypto.createHash('sha256').update(source).digest('hex');
const MANIFEST = '.live-release.json';

function createManifest(root, revision) {
    const files = {};
    function visit(relative, target = files, prefix = '') {
        const filename = path.join(root, relative);
        const stat = fs.lstatSync(filename);
        if (stat.isSymbolicLink()) throw new Error('Runtime symlink is unsupported: ' + relative);
        if (stat.isDirectory()) {
            for (const name of fs.readdirSync(filename).sort()) visit(relative + '/' + name, target, prefix);
        } else if (!/(?:\.(?:test|spec)\.[^.]+$|(?:^|\/)README(?:\.[^/]+)?$)/i.test(relative)) {
            if (!relative.endsWith('/build.txt')) target[relative.slice(prefix.length)] = hash(fs.readFileSync(filename));
        }
    }
    for (const relative of ['server', 'shared', 'package.json', 'package-lock.json', 'Dockerfile.prod',
        'bin/build.sh', 'bin/build-client.js', 'bin/check-client-assets.js', 'bin/r.js',
        'bin/live-update-artifact.js', 'bin/live-update-request.js', 'bin/stage-client-update.js']) visit(relative);
    const clientRoot = fs.existsSync(path.join(root, 'client-build')) ? 'client-build' : 'client';
    const client = {revision, files: {}};
    visit(clientRoot, client.files, clientRoot + '/');
    return {protocol: 1, revision, files, client};
}

function createBundle(root) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, MANIFEST), 'utf8'));
    const sources = {};
    for (const relative of Object.keys(manifest.files)) {
        if (POLICIES[relative] || /^server\/mob-combat\/[a-zA-Z0-9_-]+\.json$/.test(relative)) {
            const source = fs.readFileSync(path.join(root, relative), 'utf8');
            if (hash(source) !== manifest.files[relative]) throw new Error('Artifact differs from manifest: ' + relative);
            sources[relative] = source;
        }
    }
    return {manifest, sources};
}

module.exports = {hash, MANIFEST, createManifest, createBundle};

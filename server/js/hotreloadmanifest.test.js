const fs = require('fs');
const os = require('os');
const path = require('path');
const {MANIFEST, hash, createManifest, createBundle} = require('./hotreloadmanifest');

let root;
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-artifact-'));
    const files = {
        'server/js/formulas.js': 'module.exports = {};',
        'server/js/formulas.test.js': 'test-only code',
        'server/mob-combat/main.json': '{"defaults":{"chance":0.5}}',
        'server/README.md': 'documentation',
        'shared/js/gametypes.js': 'protocol',
        'client/js/app.js': 'client source',
        'client/index.html': '<html><head></head></html>',
        'client/img/avatar.bin': Buffer.from([0, 128, 255]),
        'package.json': '{}', 'package-lock.json': '{}', 'Dockerfile.prod': 'FROM node',
        'bin/build.sh': 'build', 'bin/build-client.js': 'build client',
        'bin/check-client-assets.js': 'validate assets', 'bin/r.js': 'optimizer',
        'bin/live-update-artifact.js': 'exporter', 'bin/live-update-request.js': 'requester',
        'bin/stage-client-update.js': 'stager',
    };
    for (const [relative, source] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(root, relative)), {recursive: true});
        fs.writeFileSync(path.join(root, relative), source);
    }
});
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));

test('the release manifest covers binary assets, protocol and build inputs while excluding tests and documentation', () => {
    const manifest = createManifest(root, 'a'.repeat(40));
    expect(manifest.client.files['img/avatar.bin']).toBe(hash(Buffer.from([0, 128, 255])));
    expect(manifest.files['client/img/avatar.bin']).toBeUndefined();
    expect(manifest.client.revision).toBe(manifest.revision);
    expect(manifest.files['shared/js/gametypes.js']).toBe(hash('protocol'));
    expect(manifest.files['bin/build.sh']).toBe(hash('build'));
    expect(manifest.files['bin/live-update-request.js']).toBe(hash('requester'));
    expect(manifest.files['server/js/formulas.test.js']).toBeUndefined();
    expect(manifest.files['server/README.md']).toBeUndefined();
    fs.writeFileSync(path.join(root, 'server/js/formulas.test.js'), 'changed test');
    expect(createManifest(root, manifest.revision)).toEqual(manifest);
});

test('the artifact exports only allowed source bodies and verifies their content against the image manifest', () => {
    const manifest = createManifest(root, 'a'.repeat(40));
    fs.writeFileSync(path.join(root, MANIFEST), JSON.stringify(manifest));
    const bundle = createBundle(root);
    expect(bundle.manifest).toEqual(manifest);
    expect(Object.keys(bundle.sources)).toEqual(['server/js/formulas.js', 'server/mob-combat/main.json']);
    expect(bundle.sources['server/mob-combat/main.json']).toBe('{"defaults":{"chance":0.5}}');
    fs.writeFileSync(path.join(root, 'server/js/formulas.js'), 'unexpected artifact edit');
    expect(() => createBundle(root)).toThrow('Artifact differs from manifest');
});

test('rebuilding the same release ignores timestamp-based client cache metadata but rejects changed assets', () => {
    const {clientFingerprint, recordClientBuild} = require('../../bin/mapmaker-client');
    const {HotReload} = require('./hotreload');
    for (const relative of ['bin/mapmaker-client.js', 'shared/js/placedfxconfig.js', 'shared/js/pixelfxcatalog.js', 'shared/js/mapmakerentities.json']) {
        fs.writeFileSync(path.join(root, relative), 'build input');
    }
    fs.cpSync(path.join(root, 'client'), path.join(root, 'client-build'), {recursive: true});
    const fingerprint = clientFingerprint(root);
    recordClientBuild(root, fingerprint);
    const before = createManifest(root, 'a'.repeat(40));
    const reload = new HotReload(root, before);

    // Fresh checkouts change timestamps even when the compiled assets are identical.
    fs.utimesSync(path.join(root, 'client/js/app.js'), new Date(0), new Date(0));
    const rebuilt = clientFingerprint(root);
    expect(rebuilt).not.toBe(fingerprint);
    recordClientBuild(root, rebuilt);
    const next = createManifest(root, before.revision);
    expect(next).toEqual(before);
    expect(next.client.files['.mapmaker-client.json']).toBeUndefined();
    expect(reload.plan({manifest: next, sources: {}}, before.revision)).toMatchObject({method: 'hmr', changed: []});

    fs.writeFileSync(path.join(root, 'client-build/js/app.js'), 'changed client');
    const changed = createManifest(root, before.revision);
    expect(() => reload.plan({manifest: changed, sources: {}}, before.revision)).toThrow('An immutable release cannot change its contents');
});

test('symlinked runtime files cannot enter a release artifact', () => {
    fs.symlinkSync(path.join(root, 'package.json'), path.join(root, 'client/linked.json'));
    expect(() => createManifest(root, 'a'.repeat(40))).toThrow('Runtime symlink is unsupported');
});

test('saved content changes and removals enter the server manifest and require a reboot', () => {
    const {HotReload} = require('./hotreload');
    for (const folder of ['quests', 'npcs', 'worlds', 'seasons', 'tiles', 'interactions']) {
        fs.mkdirSync(path.join(root, 'tools', folder), {recursive: true});
        fs.writeFileSync(path.join(root, 'tools', folder, 'main.json'), '{}');
    }
    const before = createManifest(root, 'a'.repeat(40));
    for (const folder of ['quests', 'npcs', 'worlds', 'seasons', 'tiles', 'interactions']) expect(before.files['tools/' + folder + '/main.json']).toBe(hash('{}'));
    fs.writeFileSync(path.join(root, 'tools/seasons/main.json'), '{"events":[]}');
    const next = createManifest(root, 'b'.repeat(40));
    const reload = new HotReload(root, before);
    expect(reload.plan({manifest: next, sources: {}}, before.revision).method).toBe('reboot');
    fs.unlinkSync(path.join(root, 'tools/quests/main.json'));
    expect(createManifest(root, 'c'.repeat(40)).files['tools/quests/main.json']).toBeUndefined();
});

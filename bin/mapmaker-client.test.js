const fs = require('fs');
const os = require('os');
const path = require('path');
const {clientFingerprint, canReuseClient, recordClientBuild} = require('./mapmaker-client');
let root;
function write(relative, text = relative) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, text);
}
function record() {recordClientBuild(root, clientFingerprint(root));}
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-client-cache-'));
    for (const relative of ['client/index.html', 'client/js/game.js', 'client/sprites/rat.json', 'client/img/1/rat.png',
        'client/maps/world_client_one.js', 'client-build/index.html', 'client-build/js/home.js', 'client-build/js/game.js',
        'client-build/js/lib/require-jquery.js', 'bin/build-client.js', 'bin/mapmaker-client.js', 'bin/r.js', 'package-lock.json']) write(relative);
    write('shared/js/mapmakerentities.json', '[]');
});
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));

test('only a complete certified build can skip compilation after a map export', () => {
    expect(canReuseClient(root)).toBe(false);
    record();
    write('client/maps/world_client_one.js', 'new map data');
    expect(canReuseClient(root)).toBe(true);
    fs.rmSync(path.join(root, 'client-build/js/game.js'));
    expect(canReuseClient(root)).toBe(false);
});
test.each(['client/js/game.js', 'client/sprites/rat.json', 'client/img/1/rat.png', 'client/css/style.css',
    'shared/js/mapmakerentities.json', 'bin/build-client.js', 'package-lock.json'])('%s changes require full compilation', relative => {
    record(); write(relative, 'changed source');
    expect(canReuseClient(root)).toBe(false);
});
test('deleted sources and edits during a full build invalidate reuse', () => {
    record(); fs.rmSync(path.join(root, 'client/sprites/rat.json'));
    expect(canReuseClient(root)).toBe(false);
    const fingerprint = clientFingerprint(root);
    write('client/js/game.js', 'edited during compilation');
    recordClientBuild(root, fingerprint);
    expect(canReuseClient(root)).toBe(false);
});

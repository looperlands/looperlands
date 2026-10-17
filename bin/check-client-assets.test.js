const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

let fixture;
beforeEach(() => {
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-runtime-assets-'));
    fs.mkdirSync(path.join(fixture, 'js'));
    fs.writeFileSync(path.join(fixture, 'index.html'), '');
});
afterEach(() => fs.rmSync(fixture, {recursive: true, force: true}));

function write(file, source = '') {
    fs.mkdirSync(path.dirname(path.join(fixture, file)), {recursive: true});
    fs.writeFileSync(path.join(fixture, file), source);
}

function check() {
    return spawnSync(process.execPath, [path.join(__dirname, 'check-client-assets.js'), fixture], {encoding: 'utf8'});
}

test('rejects missing entry scripts and accepts complete local entries with external URLs', () => {
    write('index.html', '<script src="https://cdn.example/lib.js"></script><script src="js/settings.js?v=1"></script><script data-main="js/home" src="js/loader.js"></script>');
    const result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('js/settings.js');
    expect(result.stderr).toContain('js/home.js');
    expect(result.stderr).toContain('js/loader.js');
    for (const file of ['settings.js', 'home.js', 'loader.js']) write('js/' + file);
    expect(check().status).toBe(0);
});

test('detects missing renderer and pathfinder workers referenced by built JavaScript', () => {
    write('js/game.js', 'new Worker("js/renderer-webworker.js");');
    write('js/pathfinder.js', "new Worker('js/pathfinder-webworker.js');");
    let result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('js/renderer-webworker.js');
    expect(result.stderr).toContain('js/pathfinder-webworker.js');
    write('js/renderer-webworker.js');
    write('js/pathfinder-webworker.js');
    expect(check().status).toBe(0);
});

test('checks static worker imports relative to the worker and leaves dynamic map imports to runtime', () => {
    write('js/mapworker.js', "importScripts('lib/underscore.min.js'); importScripts('../maps/world_client_' + event.data + '.js');");
    const result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('js/lib/underscore.min.js');
    write('js/lib/underscore.min.js');
    expect(check().status).toBe(0);
});

test('checks literal dynamic imports relative to the importing script', () => {
    write('js/minigame.js', `import('./arcade.js?v=1'); import('https://cdn.example/game.js'); import('../apps/' + game + '/index.js');`);
    const result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('js/arcade.js');
    write('js/arcade.js');
    expect(check().status).toBe(0);
});

test('production pruning retains the on-demand arcade module', () => {
    write('js/minigame.js', "import('./arcade.js');");
    write('js/arcade.js');
    write('js/unused-module.js');
    const build = fs.readFileSync(path.join(__dirname, 'build.sh'), 'utf8');
    const pruning = build.match(/^find \$BUILDDIR\/js[\s\S]+?-delete$/m)[0];
    const result = spawnSync('sh', ['-c', pruning], {env: {...process.env, BUILDDIR: fixture}, encoding: 'utf8'});
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(fixture, 'js/unused-module.js'))).toBe(false);
    expect(fs.existsSync(path.join(fixture, 'js/arcade.js'))).toBe(true);
    expect(check().status).toBe(0);
});

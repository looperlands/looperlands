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
    write('js/renderer-webworker.js', "loadImg('../img/common/height-proxies/main.png');");
    const result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('js/lib/underscore.min.js');
    expect(result.stderr).toContain('img/common/height-proxies/main.png');
    write('js/lib/underscore.min.js');
    write('img/common/height-proxies/main.png');
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

test('production pruning retains on-demand arcade and shadow dependencies', () => {
    write('js/minigame.js', "import('./arcade.js');");
    write('js/arcade.js');
    write('js/renderer-webworker.js', "importScripts('height-shadows-worker.js'); importScripts('sceneenvironment.js');");
    write('js/height-shadows-worker.js');
    write('js/sceneenvironment.js');
    write('js/unused-module.js');
    const build = fs.readFileSync(path.join(__dirname, 'build.sh'), 'utf8');
    const pruning = build.match(/^find \$BUILDDIR\/js[\s\S]+?-delete$/m)[0];
    const result = spawnSync('sh', ['-c', pruning], {env: {...process.env, BUILDDIR: fixture}, encoding: 'utf8'});
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(fixture, 'js/unused-module.js'))).toBe(false);
    expect(fs.existsSync(path.join(fixture, 'js/arcade.js'))).toBe(true);
    expect(check().status).toBe(0);
});

function startupSprites(names, metadata) {
    const modules = metadata.map(data => `define(${JSON.stringify('text!../sprites/' + data.id + '.json')}, function () {
        return ${JSON.stringify(JSON.stringify(data))};
    });`).join('\n');
    write('js/game.js', modules + `\ndefine('game', function () {
        this.spriteNames = ${JSON.stringify(names)};
        throw new Error('Asset validation must not execute the bundle');
    });`);
}

test('rejects missing startup sprite images from embedded custom metadata', () => {
    startupSprites(['hand', 'custom-garden-creature'], [{id: 'hand'}, {id: 'custom-garden-creature'}]);
    write('img/1/hand.png');
    let result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('img/1/custom-garden-creature.png');
    write('img/1/custom-garden-creature.png');
    result = check();
    expect(result.status).toBe(0);
});

test('ignores unused sprite metadata and scales the renderer does not load', () => {
    startupSprites(['hand'], [{id: 'hand'}, {id: 'arrow'}, {id: 'impact'}]);
    write('img/1/hand.png');
    expect(check().status).toBe(0);
});

test('rejects startup sprites absent from the embedded metadata', () => {
    startupSprites(['custom-garden-creature'], [{id: 'hand'}]);
    const result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('missing startup sprite metadata: custom-garden-creature');
});

test('validates automatically registered Toolbox sprites embedded in the bundle', () => {
    startupSprites([], []);
    fs.appendFileSync(path.join(fixture,'js/game.js'), `\ndefine('mapmakerentities', function () {return ${JSON.stringify([{sprite:{id:'item-moon_shard'}}])};});`);
    expect(check().stderr).toContain('img/1/item-moon_shard.png');
    write('img/1/item-moon_shard.png');
    expect(check().status).toBe(0);
});

test('verifies the atlas and optional paint images registered by the built shadow catalog', () => {
    const id = 'text!../img/common/height-proxies/catalog.json', folder = 'img/common/height-proxies/';
    const profiles = {harbor: {height: 'quay.png', paint: 'quay-paint.png'}, caves: {height: 'rock.png'}};
    write('js/game.js', `define('${id}', function () {return ${JSON.stringify(JSON.stringify(profiles))};});
        define('mapassets', ['${id}'], function () {});`);
    // Stale loose metadata cannot satisfy the catalog used inside the game bundle.
    write(folder + 'catalog.json', '{}');
    write(folder + 'quay.png');
    const incomplete = check();
    expect(incomplete.status).not.toBe(0);
    expect(incomplete.stderr).toContain(folder + 'quay-paint.png');
    expect(incomplete.stderr).toContain(folder + 'rock.png');
    write(folder + 'quay-paint.png'); write(folder + 'rock.png');
    expect(check().status).toBe(0);

    write('js/game.js', `define('mapassets', ['${id}'], function () {});`);
    fs.unlinkSync(path.join(fixture, folder, 'catalog.json'));
    expect(check().stderr).toContain(folder + 'catalog.json');
    write(folder + 'catalog.json', JSON.stringify({island: {height: 'island.png'}}));
    expect(check().stderr).toContain(folder + 'island.png');
    write(folder + 'island.png');
    expect(check().status).toBe(0);
});

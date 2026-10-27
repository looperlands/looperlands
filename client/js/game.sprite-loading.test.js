const fs = require('fs'), path = require('path'), vm = require('vm'), _ = require('underscore');
jest.setTimeout(20000);

function fixture(rendererOptions = {}) {
    const authored = require('../../shared/js/mapmakerentities.json');
    const modules = {mapmakerentities: authored}, requests = [];
    modules.sprites = new Proxy(Object.fromEntries(authored.map(entry => [entry.sprite.id, entry.sprite])), {
        get(target, name) {
            return target[name] || JSON.parse(fs.readFileSync(path.join(__dirname, '../sprites', name + '.json'), 'utf8'));
        }
    });
    const sandbox = {_, URL, setTimeout: jest.fn(), clearTimeout: jest.fn(),
        window: {location: {href: 'http://localhost:8000/'}}, console: {log() {}},
        Image: function () {Object.defineProperty(this, 'src', {set: url => requests.push(url)});},
        define(deps, factory) {
            modules.current = typeof deps === 'function' ? deps() : factory(...deps.map(name => modules[name] || function () {}));
        }
    };
    vm.createContext(sandbox);
    for (const file of ['./lib/class', '../../shared/js/gametypes', './sprite', './game']) {
        vm.runInContext(fs.readFileSync(require.resolve(file), 'utf8'), sandbox);
        if (file === './sprite') modules.sprite = modules.current;
    }
    const source = fs.readFileSync(require.resolve('./game'), 'utf8');
    const names = vm.runInContext(source.match(/this\.spriteNames = (\[[\s\S]*?\n\s*\]);/)[1], sandbox);
    const game = Object.assign(Object.create(modules.current.prototype), {
        spriteNames: names, storage: {data: {player: {armor: 'clotharmor', weapon: 'sword1'}}},
        renderer: {scale: 2, upscaledRendering: true, worker: {postMessage: jest.fn()}, ...rendererOptions}
    });
    return {game, requests, types: sandbox.Types};
}

test('cold startup loads only main-thread artwork from the real sprite catalog', () => {
    const {game, requests, types} = fixture();
    game.loadSprites(); game.setSpriteScale(2);
    const eager = requests.length;
    const previous = game.spriteNames.filter(name => !name.startsWith('NFT_')).length;
    expect(eager).toBeLessThan(previous / 2);
    expect(requests).toEqual(expect.arrayContaining(['img/1/target.png', 'img/1/chest.png', 'img/1/item-cake.png',
        'img/1/clotharmor.png', 'img/1/sword1.png']));
    expect(requests).not.toContain('img/1/rat.png');
    for (const [name, sprite] of Object.entries(game.sprites)) {
        if (types.isNpc(types.getKindFromString(name))) expect(sprite.image).toBeDefined();
    }
    expect(game.sprites.rat.isLoaded).toBe(true);
});

test.each([{mobile: true}, {mobile: false}])('scaled rendering retains deferred sprites and main-thread images (%j)', options => {
    const {game, requests} = fixture({upscaledRendering: false, ...options});
    game.loadSprites();
    expect(requests).toContain('img/2/target.png');
    expect(requests).not.toContain('img/2/rat.png');
    if (!options.mobile) {
        expect(requests).toContain('img/3/target.png');
        expect(game.spritesets[2].rat.isLoaded).toBe(true);
    }
    expect(game.spritesets[1].rat.isLoaded).toBe(true);
});

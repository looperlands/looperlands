const fs = require('fs');
const vm = require('vm');
global.Types = {};
let methods;
function fixture() {
    const prompt = {active: false, click: null, style: {},
        hasClass() { return this.active; },
        removeAttr() { this.style = {}; return this; }, off() { this.click = null; return this; },
        css(arg, value) {
            if (typeof arg === 'string' && value === undefined) return this.style[arg] || '50%';
            Object.assign(this.style, typeof arg === 'string' ? {[arg]: value} : arg);
            return this;
        },
        width() { return 1000; }, height() { return 700; },
        attr() { return this; }, addClass() { this.active = true; return this; },
        removeClass() { this.active = false; return this; },
        one(event, callback) { this.click = callback; return this; }
    };
    const sandbox = {console, window: {}, Class: {extend: value => { methods = value; return value; }},
        define: (deps, factory) => factory(...deps.map(() => function () {})), $: () => prompt};
    vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), sandbox);
    const player = {id: 1, onLeave: jest.fn()};
    const game = {player, renderer: {tilesize: 16, scale: 2}, client: {sendTrigger: jest.fn()}, showNotification: jest.fn()};
    sandbox.self = game;
    let close;
    sandbox.loadMinigame = jest.fn(async (name, game, options) => {
        prompt.active = false; prompt.click = null; close = options.onClose;
    });
    const trigger = {id: 2071, minigame: 'spaceowls'};
    return {prompt, player, game, sandbox, trigger, close: () => close()};
}
test('cabinet opens once and rearms at the same tile after returning', async () => {
    const f = fixture();
    methods.handleTrigger.call(f.game, f.trigger, f.player);
    expect(f.game.client.sendTrigger).toHaveBeenCalledWith(2071, true);
    await f.prompt.click();
    expect(f.prompt.active).toBe(false);
    f.close();
    expect(f.prompt.active).toBe(true);
    await f.prompt.click();
    expect(f.sandbox.loadMinigame).toHaveBeenCalledTimes(2);
    f.player.triggerArea = null;
    f.close();
    expect(f.prompt.active).toBe(false);
});
test('failed load displays a notification and allows another attempt', async () => {
    const f = fixture();
    f.sandbox.loadMinigame.mockRejectedValueOnce(new Error('Avatar still loading'));
    methods.handleTrigger.call(f.game, f.trigger, f.player);
    await f.prompt.click();
    expect(f.game.showNotification).toHaveBeenCalledWith('Avatar still loading');
    expect(f.prompt.active).toBe(true);
    await f.prompt.click();
    expect(f.sandbox.loadMinigame).toHaveBeenCalledTimes(2);
});
test('Duckville prompt tracks the cabinet as the camera moves and the render scale changes', () => {
    const f = fixture();
    const renderer = f.game.renderer;
    const camera = renderer.camera = {x: 1440, y: 2112};
    renderer.canvas = {offsetLeft: 10, offsetTop: 10};
    renderer.getCanvasPosition = (x, y) => ({x: (x - camera.x) * renderer.scale, y: (y - camera.y) * renderer.scale});
    renderer.renderFrame = jest.fn();
    Object.assign(f.game, {
        started: true,
        updateCursorLogic: jest.fn(),
        updater: {update: jest.fn()},
        canUseCenteredCamera: () => true,
        visibleTileArea: {map: undefined},
        toolImpactFeedback: {render: jest.fn()},
        growthWorldReported: true,
        gamepadListener: {update: jest.fn()},
        positionMinigamePrompt: methods.positionMinigamePrompt
    });
    const trigger = {id: 1190, minigame: 'spaceowls', promptAnchor: {x: 99.5, y: 137}};
    methods.handleTrigger.call(f.game, trigger, f.player);
    expect(f.prompt.style).toEqual({left: 314, top: 170, translate: '-50% calc(-100% - 4px)'});

    renderer.scale = 3;
    camera.follow = () => { camera.x = 1456; camera.y = 2128; };
    methods.tick.call(f.game);
    expect(f.prompt.style).toMatchObject({left: 418, top: 202});

    f.player.onLeave.mock.calls[0][1]();
    expect(f.prompt.active).toBe(false);
    expect(f.prompt.style).toEqual({});
});

test.each([
    ['m88n2', 2071, {x: 91, y: 30, w: 1, h: 2}],
    ['duckville', 1190, {x: 99, y: 138, w: 1, h: 1, promptAnchor: '99.5,137'}]
])('%s cabinet source and all three exports agree on a walkable entrance', (mapId, triggerId, placement) => {
    const path = require('path');
    const root = path.resolve(__dirname, '../..');
    const xml = fs.readFileSync(path.join(root, `tools/maps/tmx/${mapId}.tmx`), 'utf8');
    const object = xml.match(new RegExp(`<object id="${triggerId}"[^>]*>[\\s\\S]*?</object>`))[0];
    const attrs = Object.fromEntries([...object.split('>')[0].matchAll(/(\w+)="([^"]*)"/g)].map(m => [m[1], /^\d+$/.test(m[2]) ? Number(m[2]) : m[2]]));
    const props = [...object.matchAll(/<property name="([^"]*)" value="([^"]*)"/g)].map(m => ({name:m[1],value:m[2]}));
    const input = {map: {width:172,height:500,tilewidth:16,tileset:[],layer:[],objectgroup:[{name:'triggers',object:{...attrs, properties:{property:props}}}]}};
    const exporter = {module: {exports: {}}, Array, console, require: name =>
        name === 'underscore' ? require('underscore') : name.includes('gametypes') ? {} :
        require(path.resolve(root, 'tools/maps', name))};
    vm.runInNewContext(fs.readFileSync(require.resolve('../../tools/maps/processmap'), 'utf8'), exporter);
    const processMap = exporter.module.exports;
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
        for (const mode of ['client','server']) {
            // Older exports omit editor metadata; compare the runtime contract in both formats.
            const {objectId, name, ...expected} = processMap(input, {mode}).triggers.find(t => t.minigame === 'spaceowls');
            const map = JSON.parse(fs.readFileSync(path.join(root, `${mode}/maps/world_${mode}_${mapId}.json`), 'utf8'));
            const triggers = map.triggers.filter(t => t.minigame === 'spaceowls')
                .map(({objectId, name, ...trigger}) => trigger);
            expect(expected).toMatchObject({id: triggerId, minigame: 'spaceowls', ...placement});
            expect(triggers).toEqual([expected]);
            for (let y=expected.y;y<expected.y+expected.h;y++) expect(map.collisions).not.toContain(y*map.width+expected.x);
            if (mode === 'client') {
                const js = fs.readFileSync(path.join(root,`client/maps/world_client_${mapId}.js`),'utf8');
                expect(JSON.parse(js.replace(/^var mapData = /, ''))).toEqual(map);
            }
        }
    } finally { log.mockRestore(); }
});

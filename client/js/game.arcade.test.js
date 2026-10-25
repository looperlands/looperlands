const fs = require('fs');
const vm = require('vm');
global.Types = {};
let methods;
function fixture() {
    const prompt = {active: false, click: null,
        hasClass() { return this.active; },
        removeAttr() { return this; }, off() { this.click = null; return this; },
        css(arg) { return typeof arg === 'string' ? '50%' : this; },
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
test('Tiled cabinet trigger and all three shipped exports agree on a walkable entrance', () => {
    const path = require('path');
    const root = path.resolve(__dirname, '../..');
    const xml = fs.readFileSync(path.join(root, 'tools/maps/tmx/m88n2.tmx'), 'utf8');
    const object = xml.match(/<object id="2071"[^>]*>[\s\S]*?<\/object>/)[0];
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
            // Existing shipped maps omit the editor metadata added by newer exports.
            const {objectId, name, ...expected} = processMap(input, {mode}).triggers.find(t => t.minigame === 'spaceowls');
            const map = JSON.parse(fs.readFileSync(path.join(root, `${mode}/maps/world_${mode}_m88n2.json`), 'utf8'));
            expect(map.triggers.filter(t => t.minigame === 'spaceowls')).toEqual([expected]);
            for (let y=expected.y;y<expected.y+expected.h;y++) expect(map.collisions).not.toContain(y*map.width+expected.x);
            if (mode === 'client') {
                const js = fs.readFileSync(path.join(root,'client/maps/world_client_m88n2.js'),'utf8');
                expect(JSON.parse(js.replace(/^var mapData = /, ''))).toEqual(map);
            }
        }
    } finally { log.mockRestore(); }
});

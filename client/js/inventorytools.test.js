const fs = require('fs'), vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');

test('tool tags retain inventory-object behavior and include fishing rods', () => {
    for (const id of [Types.Entities.M88NSHOVEL, Types.Entities.M88NWATERCAN]) {
        expect(Types.hasTag(id, 'tool')).toBe(true);
        expect(Types.isTool(String(id))).toBe(true);
        expect(Types.isObject(id)).toBe(true);
        expect(Types.isItem(id)).toBe(true);
        expect(Types.isSpecialItem(id)).toBe(false);
        expect(Types.isDynamicNFT(id)).toBe(false);
    }
    const rod = Types.Entities.NFT_344a35ef18eafc0708b2e42b14443db0990fa39977d9347fb256905cbd5ba819;
    expect(Types.isTool(rod)).toBe(true);
    expect(Types.isSpecialItem(rod)).toBe(true);
    expect(Types.isTool(Types.Entities.M88NSEEDS)).toBe(false);
    expect(Types.isToolOfType('m88nshovel', 'shovel')).toBe(true);
    expect(Types.getToolAnimationSprite(Types.Entities.M88NWATERCAN)).toBe('tool-watering-can');
});

test('inventory groups tagged items beside fishing rods without duplicate or equip/consume behavior', async () => {
    let app, html;
    const nodes = new Map();
    const $ = selector => {
        if (!nodes.has(selector)) {
            let proxy;
            proxy = new Proxy({length: 0}, {get: (target, key) => key === 'length' ? 0 : (...args) => {
                if (selector === '#inventorycontent' && key === 'html') html = args[0];
                return proxy;
            }});
            nodes.set(selector, proxy);
        }
        return nodes.get(selector);
    };
    const items = {};
    for (const [name, qty] of [['M88NSHOVEL', 1], ['M88NWATERCAN', 2], ['M88NSEEDS', 5]]) {
        items[Types.Entities[name]] = {qty, consumable: false, image: 'item-' + name.toLowerCase(), description: name};
    }
    const data = {inventory: [], special: [{nftId: 'fishingrod', name: 'Fishing rod', level: 1}], items, bots: []};
    const document = {getElementById: jest.fn(() => null)};
    vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
        document, window: {}, $, Types, _: require('underscore'), console,
        axios: {get: async () => ({data})}, setTimeout, clearTimeout, setInterval, clearInterval,
        Class: {extend: methods => methods}, define: (_, factory) => {app = factory($);},
    });
    app.storage = {sessionId: 'test'};
    app.game = {client: {sendEquipInventory: jest.fn()}, player: {switchWeapon: jest.fn()}};
    app.settings = {getInventorySlots: () => null};
    app.cooldownMap = {};
    app.dynamicNFTData = {};
    app.showInventory();
    await new Promise(resolve => setImmediate(resolve));
    const tools = html.slice(html.indexOf("id='inventory-tools'"), html.indexOf("id='inventory-items'"));
    expect(tools).toContain("id='fishingrod'");
    for (const id of [Types.Entities.M88NSHOVEL, Types.Entities.M88NWATERCAN]) {
        expect(tools).toContain("id='" + id + "'");
        expect(html.split("id='item_" + id + "'")).toHaveLength(2);
        expect(tools).toContain("id='count_" + id + "'");
        expect(app.inventoryToolTips[id].header).toBeDefined();
    }
    expect(tools).not.toContain("id='" + Types.Entities.M88NSEEDS + "'");
    expect(html).toContain("id='" + Types.Entities.M88NSEEDS + "'");
    expect(app.game.client.sendEquipInventory).not.toHaveBeenCalled();
    expect(app.game.player.switchWeapon).not.toHaveBeenCalled();
});

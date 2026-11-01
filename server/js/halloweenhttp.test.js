global.Types = {};
const fs = require('fs');
const vm = require('vm');
const express = require('express');
const {once} = require('events');
const {WorldDefinitions} = require('./worlddefinitions');
const {installHttp} = require('./halloweenhttp');
const source = fs.readFileSync(require.resolve('./ws'), 'utf8');

test.each(['2026-10-31T12:00:00Z', '2026-11-09T00:00:00Z'])('registered feature routes retain precedence over ordinary shops at %s', async date => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(Date.parse(date));
    const registry = new WorldDefinitions(), app = express();
    registry.register('main', {id: 'halloween', installHttp});
    registry.register('main', {id: 'content-only'});
    const data = {mapId: 'main', entityId: 1, nftId: 'avatar', gameData: {items: {}}};
    const cache = {get: () => data};
    const dao = {getShopInventory: jest.fn(async () => [])};
    const inventoryExchanges = {exchange: jest.fn(async () => {})};
    const self = {fieldGuide: {observe: jest.fn()}};
    const context = vm.createContext({app, cache, dao, self, inventoryExchanges, fieldGuide: self.fieldGuide,
        require: name => name === './worlddefinitions' ? {definitions: registry} : require(name)});
    // Execute the real server composition and fallback blocks in source order.
    const hook = source.indexOf("require('./worlddefinitions').definitions.installHttp");
    const shops = source.indexOf('        app.get("/shop/:shopId/inventory"');
    const blocks = [{start: hook, end: source.indexOf('        if (updates?.clients)', hook)},
        {start: shops, end: source.indexOf('        app.get("/session/:sessionId/consumeItem', shops)}];
    for (const block of blocks.sort((a, b) => a.start - b.start)) vm.runInContext(source.slice(block.start, block.end), context);
    self.worldsMap = {main: {getPlayerById: () => ({x: 10, y: 10, level: 1, hasEnteredGame: true}),
        npcs: {witch: {x: 12, y: 10, behaviorState: {key: 'halloween:witch'}}}}};
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const get = path => fetch('http://127.0.0.1:' + server.address().port + path);
    try {
        const active = date.startsWith('2026-10');
        const inventory = await get('/shop/halloween-cauldron/inventory');
        expect(await inventory.json()).toHaveLength(active ? 3 : 0);
        const purchase = await get('/session/session/shop/halloween-cauldron/buy/1');
        expect(purchase.status).toBe(active ? 200 : 410);
        expect(inventoryExchanges.exchange).toHaveBeenCalledTimes(active ? 1 : 0);
        expect(dao.getShopInventory).not.toHaveBeenCalled();
        expect((await get('/shop/normal/inventory')).status).toBe(200);
        expect((await get('/session/session/shop/normal/buy/1')).status).toBe(404);
        expect(dao.getShopInventory.mock.calls).toEqual([['normal'], ['normal']]);
    } finally {
        now.mockRestore();
        await new Promise(resolve => server.close(resolve));
    }
});

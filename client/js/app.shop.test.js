const fs = require('fs');
const vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');

function shop({grain = 15, gold = 10, level = 10, fail = false} = {}) {
    const elements = new Map();
    const makeElement = () => {
        const el = {classes: new Set(), handlers: {}, value: '', children: []};
        for (const method of ['css', 'html', 'scrollTop', 'prop', 'attr', 'show', 'hide']) {
            el[method] = () => el;
        }
        el.addClass = name => { el.classes.add(name); return el; };
        el.removeClass = name => { el.classes.delete(name); return el; };
        el.toggleClass = (name, enabled) => enabled ? el.addClass(name) : el.removeClass(name);
        el.text = el.val = value => {
            if (value === undefined) return el.value;
            el.value = value;
            return el;
        };
        el.find = selector => $(selector);
        el.append = child => { el.children.push(child); return el; };
        el.on = (events, handler) => { el.handlers[events] = handler; return el; };
        el.off = events => { delete el.handlers[events]; return el; };
        el.click = handler => el.on('click', handler);
        return el;
    };
    const $ = selector => {
        if (typeof selector === 'object') return selector;
        if (selector.startsWith('<')) return makeElement();
        if (!elements.has(selector)) elements.set(selector, makeElement());
        return elements.get(selector);
    };
    const item = {id: 1, item: Types.Entities.M88NFLOUR, name: 'Flour',
        price: {m88ngrain: 5, GOLD: 2}, minPlayerLevel: 3};
    const get = jest.fn(url => fail ? Promise.reject(new Error('offline')) : Promise.resolve({data:
        url.startsWith('/shop/') ? [item] : {
            resources: {[Types.Entities.GOLD]: gold},
            items: {[Types.Entities.M88NGRAIN]: {qty: grain}}
        }
    }));
    let app;
    vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
        define: (deps, factory) => { app = factory($); }, Class: {extend: methods => methods},
        Types, axios: {get}, setTimeout: () => {}, console: {error: jest.fn()}
    });
    app.storage = {sessionId: 'session'};
    app.game = {player: {level}, showNotification: jest.fn(), audioManager: {playSound: jest.fn()}};
    const purchase = app.purchaseShopItem.bind(app);
    app.purchaseShopItem = jest.fn();
    const event = {preventDefault: jest.fn(), stopImmediatePropagation: jest.fn()};
    return {app, $, get, purchase, select: () => {
        const row = $('#shop-popup-items').children[0];
        row.handlers.click({...event, currentTarget: row});
        return row;
    }, confirm: () => $('#confirm-shop-purchase').handlers.click(event)};
}

test('flour can be bought with harvested grain outside the resource bar, including bulk purchases', async () => {
    const s = shop();
    await s.app.openShop('farmers', 'Farmers Shop');
    expect(s.select().classes.has('disabled')).toBe(false);
    s.$('#shop-quantity').val(3);
    s.confirm();
    expect(s.app.purchaseShopItem).toHaveBeenCalledWith('farmers', 1, 3);
});

test.each([{grain: 4}, {gold: 1}, {level: 2}])('insufficient ingredients or level disable flour: %j', async options => {
    const s = shop(options);
    await s.app.openShop('farmers', 'Farmers Shop');
    expect(s.select().classes.has('disabled')).toBe(true);
    expect(s.$('#confirm-shop-purchase').classes.has('disabled')).toBe(true);
    expect(s.$('#confirm-shop-purchase').handlers.click).toBeUndefined();
});

test('bulk purchase cannot exceed the harvested grain balance', async () => {
    const s = shop();
    await s.app.openShop('farmers', 'Farmers Shop');
    s.select();
    s.$('#shop-quantity').val(4);
    s.confirm();
    expect(s.app.purchaseShopItem).not.toHaveBeenCalled();
    expect(s.$('#confirm-shop-purchase').classes.has('disabled')).toBe(true);
});

test('inventory load failures show an actionable shop notification', async () => {
    const s = shop({fail: true});
    await s.app.openShop('farmers', 'Farmers Shop');
    expect(s.app.game.showNotification).toHaveBeenCalledWith('Unable to load the shop. Please try again.');
});

test('successful purchases reload shop balances for the next purchase', async () => {
    const s = shop();
    s.app.initResourcesDisplay = jest.fn();
    s.app.openShop = jest.fn();
    s.$('#shop-popup-name').text('Farmers Shop');
    await s.purchase('farmers', 1, 3);
    expect(s.get).toHaveBeenCalledWith('/session/session/shop/farmers/buy/1?quantity=3');
    expect(s.app.openShop).toHaveBeenCalledWith('farmers', 'Farmers Shop');
});

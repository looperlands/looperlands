const fs = require('fs'), vm = require('vm');
function setup() {
    const elements = new Map();
    const doc = {hidden: false, getElementById: id => {
        if (!elements.has(id)) elements.set(id, {classList: {add: jest.fn(), remove: jest.fn()}});
        return elements.get(id);
    }};
    const axios = {get: jest.fn()};
    let app;
    vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
        document: doc, axios, console, setTimeout, clearTimeout, Class: {extend: methods => methods},
        define: (_, factory) => { app = factory(); },
    });
    app.storage = {sessionId: 'one'};
    app.cooldownMap = {};
    app.isInventoryVisible = true;
    return {app, doc, elements, axios};
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('closed inventory gets a pickup status and bag cue immediately, then hides it', () => {
    const {app, doc, elements} = setup();
    function element() {
        return {children: [], hidden: false, setAttribute: jest.fn(), addEventListener: jest.fn(),
            appendChild(child) { this.children.push(child); },
            querySelector(type) { return this.children[type === 'img' ? 0 : 1]; }};
    }
    doc.createElement = element;
    const bar = element();
    bar.insertAdjacentElement = (_, anchor) => { bar.anchor = anchor; };
    elements.set('bar-container', bar);
    const get = doc.getElementById;
    doc.getElementById = id => id === 'hud-pickup' ? bar.anchor?.children[0] || null : get(id);
    app.isInventoryVisible = false;
    app.refreshConsumableHud = jest.fn();
    app.acknowledgePickup({kind: 7, getSpriteName: () => 'item-pie', getLootMessage: () => 'You pick up a pie'});
    const toast = bar.anchor.children[0];
    expect(toast.hidden).toBe(false);
    expect(toast.children[1].textContent).toBe('You pick up a pie');
    expect(toast.children[0].src).toBe('img/1/item-pie.png');
    expect(elements.get('inventorybutton').classList.add).toHaveBeenCalledWith('inventory-changed');
    expect(elements.has('item_7')).toBe(false);
    expect(app.refreshConsumableHud).toHaveBeenCalledWith(250);
    jest.advanceTimersByTime(2400);
    expect(toast.hidden).toBe(true);
    app.acknowledgePickup({kind: 8, getLootMessage: () => '<b>Collected</b>', sprite: {filepath: 'existing.png'}});
    expect(toast.hidden).toBe(false);
    expect(toast.children[1].textContent).toBe('<b>Collected</b>');
    expect(bar.anchor.children).toHaveLength(1);
});
test('background and missing-HUD pickups remain quiet', () => {
    const {app, doc, elements} = setup();
    doc.hidden = true;
    app.acknowledgePickup({kind: 7});
    expect(elements.size).toBe(0);
    doc.hidden = false;
    doc.getElementById = () => null;
    expect(() => app.acknowledgePickup({kind: 7})).not.toThrow();
});
test.each([true, false])('consumption only acknowledges a confirmed result: consumed=%s', async consumed => {
    const {app, axios, elements} = setup();
    axios.get.mockResolvedValue({data: {items: [], consumed}});
    app.consumeItem('7');
    await Promise.resolve();
    expect(elements.has('inventorybutton')).toBe(consumed);
});

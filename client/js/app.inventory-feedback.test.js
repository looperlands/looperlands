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
test('a pickup updates the HUD quantity and bag cue without creating another notification', () => {
    const {app, doc, elements} = setup();
    doc.createElement = jest.fn();
    app.isInventoryVisible = false;
    app.refreshConsumableHud = jest.fn();
    app.acknowledgePickup({kind: 7});
    expect(elements.get('inventorybutton').classList.add).toHaveBeenCalledWith('inventory-changed');
    expect(elements.has('item_7')).toBe(false);
    expect(doc.createElement).not.toHaveBeenCalled();
    expect(app.refreshConsumableHud).toHaveBeenCalledWith(250);
});
test('background pickups refresh quantities without a visual cue', () => {
    const {app, doc, elements} = setup();
    doc.hidden = true;
    app.refreshConsumableHud = jest.fn();
    app.acknowledgePickup({kind: 7});
    expect(elements.size).toBe(0);
    expect(app.refreshConsumableHud).toHaveBeenCalledWith(250);
    app.acknowledgePickup(null);
    expect(app.refreshConsumableHud).toHaveBeenCalledTimes(1);
});
test.each([true, false])('consumption only acknowledges a confirmed result: consumed=%s', async consumed => {
    const {app, axios, elements} = setup();
    axios.get.mockResolvedValue({data: {items: [], consumed}});
    app.consumeItem('7');
    await Promise.resolve();
    expect(elements.has('inventorybutton')).toBe(consumed);
});

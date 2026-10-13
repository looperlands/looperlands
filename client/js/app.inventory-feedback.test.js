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
test('first load is quiet; changed and newly collected quantities highlight on the next readback', () => {
    const {app, elements} = setup();
    app.highlightInventoryChanges({7: {qty: 3}});
    expect(elements.size).toBe(0);
    app.highlightInventoryChanges({7: {qty: 2}, 8: {qty: 1}});
    expect(elements.get('count_7').classList.add).toHaveBeenCalledWith('inventory-changed');
    expect(elements.get('item_8').classList.add).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(900);
    expect(elements.get('count_7').classList.remove).toHaveBeenCalledTimes(1);
    app.highlightInventoryChanges({7: {qty: 2}, 8: {qty: 1}});
    expect(elements.get('item_8').classList.add).toHaveBeenCalledTimes(1);
});
test('last-item removal still acknowledges the change through the inventory button', () => {
    const {app, elements} = setup();
    app.highlightInventoryChanges({7: {qty: 1}});
    app.isInventoryVisible = false;
    app.highlightInventoryChanges({});
    expect(elements.get('inventorybutton').classList.add).toHaveBeenCalledTimes(1);
    expect(elements.has('item_7')).toBe(false);
});
test('changing sessions resets the baseline; background updates stay quiet', () => {
    const {app, doc, elements} = setup();
    app.highlightInventoryChanges({7: {qty: 1}});
    app.storage.sessionId = 'two';
    app.highlightInventoryChanges({7: {qty: 20}});
    doc.hidden = true;
    app.highlightInventoryChanges({7: {qty: 19}});
    expect(elements.size).toBe(0);
});
test.each([true, false])('consumption only acknowledges a confirmed result: consumed=%s', async consumed => {
    const {app, axios, elements} = setup();
    axios.get.mockResolvedValue({data: {items: [], consumed}});
    app.consumeItem('7');
    await Promise.resolve();
    expect(elements.has('inventorybutton')).toBe(consumed);
});

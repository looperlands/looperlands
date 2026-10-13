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

test('consumption synchronizes server effects and announces a new XP boost in the existing status bar', async () => {
    const {app, axios} = setup();
    const effects = [{id: 'xp', label: '2x XP', expiresAt: 61000}];
    app.game = {showNotification: jest.fn()};
    app.consumableHud = {syncEffects: jest.fn().mockReturnValue([{...effects[0], duration: 60000}]), tick: jest.fn()};
    app.refreshConsumableHud = jest.fn();
    axios.get.mockResolvedValue({data: {consumed: true, items: [], effects, effectsUpdatedAt: 1000}});
    await expect(app.consumeItem('78009300')).resolves.toBe(true);
    expect(app.consumableHud.syncEffects).toHaveBeenCalledWith(effects, 1000);
    expect(app.game.showNotification).toHaveBeenCalledWith('2x XP for 60s');
});

test('an old session consumption response cannot change effects or display a notification', async () => {
    const {app, axios} = setup();
    let resolve;
    axios.get.mockReturnValue(new Promise(done => {resolve = done;}));
    app.consumableHud = {syncEffects: jest.fn(), tick: jest.fn()};
    app.game = {showNotification: jest.fn()};
    const request = app.consumeItem('7');
    app.storage.sessionId = 'two';
    resolve({data: {consumed: true, effects: [{id: 'xp', label: '2x XP', expiresAt: 61000}], effectsUpdatedAt: 1000}});
    await request;
    expect(app.consumableHud.syncEffects).not.toHaveBeenCalled();
    expect(app.game.showNotification).not.toHaveBeenCalled();
});

test('an inventory refresh restores effects but ignores a response from an old session', async () => {
    const {app, axios} = setup();
    const effects = [{id: 'xp', label: '2x XP', expiresAt: 61000}];
    app.consumableHud = {sync: jest.fn(), syncEffects: jest.fn()};
    axios.get.mockResolvedValue({data: {items: {}, effects, effectsUpdatedAt: 1000}});
    await app.refreshConsumableHud();
    expect(app.consumableHud.syncEffects).toHaveBeenCalledWith(effects, 1000);
    let resolve;
    axios.get.mockReturnValue(new Promise(done => {resolve = done;}));
    const request = app.refreshConsumableHud();
    app.storage.sessionId = 'two';
    resolve({data: {effects: []}});
    await request;
    expect(app.consumableHud.syncEffects).toHaveBeenCalledTimes(1);
});

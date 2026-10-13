const fs = require('fs'), vm = require('vm');
function setup() {
    const slot = {classList: {add: jest.fn(), remove: jest.fn()}};
    const item = {classList: {add: jest.fn(), remove: jest.fn()}};
    const doc = {hidden: false, getElementById: id => id === 'item_7' ? item
        : id === 'consumableSlot2' ? {querySelector: () => slot} : null};
    let app;
    vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
        document: doc, setTimeout, Class: {extend: methods => methods},
        define: (_, factory) => { app = factory(); },
    });
    app.isInventoryVisible = true;
    app.settings = {getInventorySlots: () => [3, 7, 9]};
    return {app, doc, item, slot};
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('a cooldown ending highlights only the item and its assigned quick slot once', () => {
    const {app, item, slot} = setup();
    app.markCooldownReady('7');
    expect(item.classList.add).toHaveBeenCalledWith('cooldown-ready');
    expect(slot.classList.add).toHaveBeenCalledWith('cooldown-ready');
    jest.advanceTimersByTime(450);
    expect(item.classList.remove).toHaveBeenCalledTimes(1);
    expect(slot.classList.remove).toHaveBeenCalledTimes(1);
});
test.each(['inventory', 'tab'])('no cue is queued while the %s is hidden', reason => {
    const {app, doc, item} = setup();
    if (reason === 'inventory') app.isInventoryVisible = false;
    else doc.hidden = true;
    app.markCooldownReady('7');
    expect(item.classList.add).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
});
test('missing slots and items do not break cooldown completion', () => {
    const {app} = setup();
    app.settings.getInventorySlots = () => [8];
    expect(() => app.markCooldownReady('8')).not.toThrow();
});

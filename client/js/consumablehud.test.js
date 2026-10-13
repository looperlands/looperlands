const fs = require('fs'), vm = require('vm');
function element() {
    const classes = new Set();
    const result = {children: [], dataset: {}, attributes: {}, events: {},
        classList: {toggle: (name, active) => active ? classes.add(name) : classes.delete(name), contains: name => classes.has(name)},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, callback) { this.events[name] = callback; }, blur: jest.fn(),
        insertBefore(child, before) {
            child.remove();
            this.children.splice(before ? this.children.indexOf(before) : this.children.length, 0, child);
            child.parent = this;
        },
        appendChild(child) { this.insertBefore(child, null); },
        remove() {
            if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
            this.parent = null;
        }};
    return result;
}
function setup(slots = [7]) {
    let Hud;
    const bar = element();
    bar.insertAdjacentElement = (_, anchor) => { bar.anchor = anchor; };
    const document = {hidden: false, getElementById: () => bar, createElement: element};
    vm.runInNewContext(fs.readFileSync(require.resolve('./consumablehud'), 'utf8'), {
        document, Date, setInterval, clearInterval, define: factory => { Hud = factory(); },
    });
    const app = {settings: {getInventorySlots: () => slots}, cooldownMap: {}, consumeItem: jest.fn(), game: {player: {isDead: false}}};
    return {hud: new Hud(app), app, document, slots, bar};
}
const pie = {image: 'item-pie', description: 'Pie', qty: 3, consumable: true};
beforeEach(() => {jest.useFakeTimers(); jest.setSystemTime(1000);});
afterEach(() => jest.useRealTimers());
test('assigned consumables stay on the HUD while the inventory is closed, with count and keyboard hint', () => {
    const {hud} = setup();
    hud.sync({7: pie});
    const slot = hud.buttons.get('7');
    expect(hud.root.hidden).toBe(false);
    expect(slot.count.textContent).toBe('3');
    expect(slot.key.textContent).toBe('1');
    expect(slot.button.disabled).toBe(false);
    const insert = jest.spyOn(hud.slots, 'insertBefore');
    jest.advanceTimersByTime(250);
    expect(insert).not.toHaveBeenCalled(); // Retain keyboard focus during the ticker.
});
test('shared cooldowns block every affected item, count down outside inventory, then cue readiness once', () => {
    const {hud, app} = setup([7, 8]);
    hud.sync({7: {...pie, cooldown: 7000}, 8: {...pie, cooldown: 7000}});
    expect(hud.buttons.get('7').timer.textContent).toBe('6s');
    expect(hud.buttons.get('8').button.disabled).toBe(true);
    hud.sync({7: {...pie, cooldown: 0}, 8: pie}); // An older read cannot erase a new cooldown.
    expect(app.cooldownMap[7]).toBe(7000);
    jest.advanceTimersByTime(6000);
    expect(hud.buttons.get('7').button.disabled).toBe(false);
    expect(hud.buttons.get('7').button.classList.contains('cooldown-ready')).toBe(true);
    jest.advanceTimersByTime(500);
    expect(hud.buttons.get('7').button.classList.contains('cooldown-ready')).toBe(false);
});
test('using the HUD waits for confirmation and prevents repeated requests while pending', async () => {
    const {hud, app} = setup();
    hud.sync({7: pie});
    let confirm;
    app.consumeItem.mockReturnValue(new Promise(resolve => {confirm = resolve;}));
    const button = hud.buttons.get('7').button;
    button.events.click();
    button.events.click();
    expect(app.consumeItem).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    app.cooldownMap[7] = 7000;
    hud.sync({7: {...pie, qty: 2}});
    confirm(true);
    await Promise.resolve();
    expect(hud.buttons.get('7').count.textContent).toBe('2');
    expect(button.disabled).toBe(true);
});
test('a consumed last item and death disable use; server quantity readback re-enables it', () => {
    const {hud, app} = setup();
    hud.sync({7: pie});
    hud.sync({});
    expect(hud.buttons.get('7').count.textContent).toBe('0');
    expect(hud.buttons.get('7').button.disabled).toBe(true);
    hud.sync({7: pie});
    app.game.player.isDead = true;
    hud.tick(1000);
    expect(hud.buttons.get('7').button.disabled).toBe(true);
});
test('long cooldowns fit a compact badge while quantities remain separate', () => {
    const {hud} = setup();
    hud.sync({7: {...pie, qty: 123, cooldown: 76000}});
    expect(hud.buttons.get('7').timer.textContent).toBe('1:15');
    expect(hud.buttons.get('7').count.textContent).toBe('123');
});
test('active effects have a visible countdown and clear on expiry or cancellation', () => {
    const {hud} = setup([]);
    hud.setEffect('attack', 10, 60000);
    expect(hud.effectLabel.textContent).toBe('+10% attack · 1:00');
    jest.advanceTimersByTime(1000);
    expect(hud.effectLabel.textContent).toBe('+10% attack · 0:59');
    hud.setEffect('attack', 10, 0);
    expect(hud.root.hidden).toBe(true);
    hud.setEffect('defense', 5, 1000);
    jest.advanceTimersByTime(1000);
    expect(hud.effectLabel.hidden).toBe(true);
});
test('unassigned cooldowns appear temporarily, empty and non-consumable slots stay out, and cues stay quiet in background', () => {
    const {hud, document} = setup([2]);
    hud.sync({2: {consumable: false}, 7: {...pie, cooldown: 2000}});
    expect([...hud.buttons.keys()]).toEqual(['7']);
    document.hidden = true;
    jest.advanceTimersByTime(1000);
    expect(hud.root.hidden).toBe(true);
    expect(hud.buttons.size).toBe(0);
    hud.destroy();
    expect(jest.getTimerCount()).toBe(0);
});

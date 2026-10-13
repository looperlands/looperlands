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
        replaceChildren(...children) {
            this.children.forEach(child => { child.parent = null; });
            this.children = [];
            children.forEach(child => this.appendChild(child));
        },
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
const effectText = (hud, id = 'fish') => {
    const panel = hud.effectPanels.get(id);
    return panel.name.textContent + ' · ' + panel.timer.children.map(cell => cell.textContent).join('');
};
beforeEach(() => {jest.useFakeTimers(); jest.setSystemTime(1000);});
afterEach(() => jest.useRealTimers());

test('a server-confirmed taco shows 2x XP for 60 seconds independently of its cooldown', () => {
    const {hud} = setup([]);
    hud.syncEffects([{id: 'xp', label: '2x XP', expiresAt: 61000}], 1000);
    expect(effectText(hud, 'xp')).toBe('2x XP · 1:00');
    expect(hud.root.hidden).toBe(false);
    const panel = hud.effectPanels.get('xp').label;
    jest.advanceTimersByTime(1000);
    expect(effectText(hud, 'xp')).toBe('2x XP · 0:59');
    expect(hud.effectPanels.get('xp').label).toBe(panel);
    jest.advanceTimersByTime(59000);
    expect(hud.effectPanels.size).toBe(0);
    expect(hud.root.hidden).toBe(true);
});

test('XP, damage, companion and fish buffs coexist; a fish cancellation only removes the fish', () => {
    const {hud} = setup([]);
    hud.syncEffects([{id: 'xp', label: '2x XP', expiresAt: 61000},
        {id: 'meleeDamageDealt', label: '2x melee damage', expiresAt: 21000},
        {id: 'companion:xp', label: 'Companion 3x XP', expiresAt: 121000}], 1000);
    hud.setEffect('attack', 10, 300000);
    expect(hud.effectPanels.size).toBe(4);
    hud.setEffect(0, 0, 0);
    expect(hud.effectPanels.size).toBe(3);
    jest.advanceTimersByTime(20000);
    expect(hud.effectPanels.has('meleeDamageDealt')).toBe(false);
    expect(hud.effectPanels.has('xp')).toBe(true);
});

test('snapshots handle different server clocks and reject out-of-order inventory responses', () => {
    const {hud} = setup([]);
    hud.syncEffects([{id: 'xp', label: '2x XP', expiresAt: 961000}], 901000);
    expect(effectText(hud, 'xp')).toBe('2x XP · 1:00');
    hud.syncEffects([], 900000);
    expect(hud.effectPanels.has('xp')).toBe(true);
    hud.syncEffects(undefined);
    expect(hud.effectPanels.has('xp')).toBe(true);
    hud.syncEffects([], 902000);
    expect(hud.root.hidden).toBe(true);
});

test('refreshes retain timer width and literal text; invalid and expired effects are ignored', () => {
    const {hud} = setup([]);
    hud.syncEffects([{id: 'xp', label: '<b>2x XP</b>', expiresAt: 601000}, null,
        {id: 'expired', label: 'Old', expiresAt: 1000}, {id: 'bad', expiresAt: NaN}], 1000);
    const panel = hud.effectPanels.get('xp');
    expect(panel.name.textContent).toBe('<b>2x XP</b>');
    const timeGroup = panel.label.children[1];
    expect(timeGroup.className).toBe('hud-effect-time');
    expect(timeGroup.children[0].textContent).toBe('·');
    expect(timeGroup.children[1]).toBe(panel.timer);
    expect(panel.timer.children).toHaveLength(5);
    jest.advanceTimersByTime(1000);
    hud.syncEffects([{id: 'xp', label: '<b>2x XP</b>', expiresAt: 601000}], 2000);
    expect(panel.timer.children).toHaveLength(5);
    expect(hud.effectPanels.size).toBe(1);
});
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

test('consumables stay disabled until the game finishes joining', () => {
    const {hud, app} = setup();
    app.game.started = false;
    hud.sync({7: pie});
    expect(hud.buttons.get('7').button.disabled).toBe(true);
    app.game.started = true;
    hud.tick(1000);
    expect(hud.buttons.get('7').button.disabled).toBe(false);
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
    expect(effectText(hud)).toBe('+10% attack · 1:00');
    jest.advanceTimersByTime(1000);
    expect(effectText(hud)).toBe('+10% attack · 0:59');
    hud.setEffect('attack', 10, 0);
    expect(hud.root.hidden).toBe(true);
    hud.setEffect('defense', 5, 1000);
    jest.advanceTimersByTime(1000);
    expect(hud.effectPanels.has('fish')).toBe(false);
});
test('timer character count stays fixed across minute digit changes', () => {
    const {hud} = setup([]);
    hud.setEffect('attack', 10, 600000);
    expect(effectText(hud)).toBe('+10% attack · 10:00');
    const cells = hud.effectPanels.get('fish').timer.children.length;
    jest.advanceTimersByTime(1000);
    expect(effectText(hud)).toBe('+10% attack · \u00a09:59');
    expect(hud.effectPanels.get('fish').timer.children).toHaveLength(cells);
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

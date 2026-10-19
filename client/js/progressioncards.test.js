const fs = require('fs');
const vm = require('vm');

function setup({shown = [], reduced = false} = {}) {
    let GameCards;
    const rect = () => ({left: 400, top: 100, width: 258, height: 414});
    vm.runInNewContext(fs.readFileSync(require.resolve('./progressioncards'), 'utf8'), {
        define: factory => {GameCards = factory();},
        Promise, Date, setTimeout, clearTimeout, innerWidth: 1280,
        document: {hidden: false, getElementById: () => ({getBoundingClientRect: rect})}
    });
    const cards = Object.fromEntries(['avatar', 'weapon'].map(type => [type, {
        el: {hidden: !shown.includes(type), isConnected: true, getBoundingClientRect: rect, classList: {add: jest.fn(), remove: jest.fn()}},
        fill: {style: {}, getBoundingClientRect: rect}, percent: {}, level: {}, note: {}, delta: {},
        banner: {hidden: true}, front: {}, back: {}, footer: {}, flipped: false
    }]));
    const controller = Object.assign(Object.create(GameCards.prototype), {
        cards, opened: new Set(shown), temporary: new Set(), timers: new Set(), animations: new Set(), xpBaselines: new Map(),
        stats: {}, previous: {avatar: 31, weapon: 25}, busy: false, slow: false, random: () => .5,
        key: 'session:map', root: {hidden: false},
        game: {sessionId: 'session', mapId: 'map', started: true, player: {id: 1, x: 20, y: 30, isDead: false, getWeaponName: () => 'sword1'}, audioManager: {playSound: jest.fn()}},
        rewardButtons: [{disabled: false}], effects: {replaceChildren: jest.fn()}, status: {},
        quiet: () => reduced, position: jest.fn(), renderCard: jest.fn(),
        motes: jest.fn(), burst: jest.fn(), returnToHud: jest.fn(), loadModifiers: jest.fn(),
        animate: jest.fn(() => ({cancel: jest.fn()}))
    });
    return controller;
}
const before = {avatar: 30, weapon: 24, avatarPercent: 18, weaponPercent: 18};
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('cards opened only for a level-up return to hidden after the sequence', () => {
    const cards = setup(); cards.sequence(['avatar', 'weapon'], before, true);
    expect([...cards.temporary]).toEqual(['avatar', 'weapon']);
    expect(cards.cards.avatar.el.hidden).toBe(false);
    jest.runAllTimers();
    expect(cards.cards.avatar.el.hidden).toBe(true);
    expect(cards.cards.weapon.el.hidden).toBe(true);
    expect(cards.opened.size).toBe(0);
    expect(cards.busy).toBe(false);
});

test('a card that was already open stays open while the temporary card closes', () => {
    const cards = setup({shown: ['avatar']}); cards.sequence(['avatar', 'weapon'], before, true);
    jest.runAllTimers();
    expect([...cards.opened]).toEqual(['avatar']);
    expect(cards.cards.avatar.el.hidden).toBe(false);
    expect(cards.cards.weapon.el.hidden).toBe(true);
});

test('manually showing a temporary card keeps it open', () => {
    const cards = setup(); cards.sequence(['avatar', 'weapon'], before, true);
    cards.open('weapon'); jest.runAllTimers();
    expect([...cards.opened]).toEqual(['weapon']);
});

test('inspecting a temporary card keeps it open without pinning the other card', () => {
    const cards = setup(); cards.sequence(['avatar', 'weapon'], before, true);
    cards.flip('weapon'); jest.runAllTimers();
    expect([...cards.opened]).toEqual(['weapon']);
    expect(cards.cards.weapon.flipped).toBe(true);
});

test('an overlapping award does not mistake an auto-open for manual intent', () => {
    const cards = setup(); cards.sequence(['avatar', 'weapon'], before, true);
    jest.advanceTimersByTime(2100);
    cards.sequence(['weapon'], {avatar: 31, weapon: 25}, true);
    jest.runAllTimers();
    expect(cards.opened.size).toBe(0);
    expect(cards.cards.avatar.el.hidden).toBe(true);
    expect(cards.cards.weapon.el.hidden).toBe(true);
});

test('cancel removes temporary cards and pending effects, preserving an already open card', () => {
    const cards = setup({shown: ['avatar']}); cards.sequence(['avatar', 'weapon'], before, true);
    jest.advanceTimersByTime(1000); cards.cancel(); jest.runAllTimers();
    expect([...cards.opened]).toEqual(['avatar']);
    expect(cards.timers.size).toBe(0);
    expect(cards.burst).not.toHaveBeenCalled();
    expect(cards.returnToHud).not.toHaveBeenCalled();
});

test('showing a card during its exit cancels the exit and prevents delayed hiding', () => {
    const cards = setup(); cards.sequence(['avatar', 'weapon'], before, true);
    jest.advanceTimersByTime(2350);
    const exit = cards.cards.avatar.exitAnimation;
    expect(exit).toBeTruthy();
    cards.open('avatar'); jest.runAllTimers();
    expect(exit.cancel).toHaveBeenCalled();
    expect(cards.cards.avatar.el.hidden).toBe(false);
    expect([...cards.opened]).toEqual(['avatar']);
});

test('simultaneous upgrades have separate arrival and level-up beats', () => {
    const cards = setup(); cards.sequence(['avatar', 'weapon'], before, true);
    jest.advanceTimersByTime(1050);
    expect(cards.cards.avatar.level.textContent).toBe(31);
    expect(cards.cards.weapon.level.textContent).toBe(24);
    jest.advanceTimersByTime(100);
    expect(cards.cards.weapon.level.textContent).toBe(25);
});

test('reduced motion still restores visibility after the readable result', () => {
    const cards = setup({shown: ['weapon'], reduced: true});
    cards.sequence(['avatar', 'weapon'], before, true);
    jest.advanceTimersByTime(150);
    expect(cards.cards.avatar.level.textContent).toBe(31);
    expect(cards.cards.weapon.level.textContent).toBe(25);
    jest.runAllTimers();
    expect([...cards.opened]).toEqual(['weapon']);
});

test('XP totals start silently and capture gains across all asset types', () => {
    const cards = setup();
    const baseline = ['avatar', 'weapon', 'tool', 'companion'].map(type => ({id: type, type, xp: 100}));
    expect(cards.captureXp(baseline)).toEqual([]);
    expect(cards.captureXp(baseline.map(asset => ({...asset, xp: 125}))).map(gain => [gain.type, gain.amount]))
        .toEqual([['avatar', 25], ['weapon', 25], ['tool', 25], ['companion', 25]]);
    expect(cards.captureXp(baseline.map(asset => ({...asset, xp: 125})))).toEqual([]);
});

test('XP readback recovery does not duplicate messages and new equipment starts silently', () => {
    const cards = setup();
    cards.captureXp([{id: 'a', type: 'weapon', xp: 100}]);
    expect(cards.captureXp([{id: 'a', type: 'weapon', xp: 120}])[0].amount).toBe(20);
    expect(cards.captureXp([{id: 'a', type: 'weapon', xp: 100}])).toEqual([]);
    expect(cards.captureXp([{id: 'a', type: 'weapon', xp: 120}])).toEqual([]);
    expect(cards.captureXp([{id: 'b', type: 'weapon', xp: 90000}])).toEqual([]);
    expect(cards.captureXp([{id: 'b', type: 'weapon', xp: 90005}])[0].amount).toBe(5);
});

test('the HUD flight removes its sprite copy as soon as the animation finishes', async () => {
    const cards = setup(); let resolve;
    const finished = new Promise(done => {resolve = done;});
    cards.animate.mockReturnValue({cancel: jest.fn(), finished});
    const clone = {classList: {add: jest.fn()}, style: {}, remove: jest.fn()};
    cards.cards.avatar.sprite = {cloneNode: () => clone};
    cards.cards.avatar.art = {getBoundingClientRect: () => ({left: 400, top: 100, width: 100, height: 100})};
    cards.effects.append = jest.fn();
    Object.getPrototypeOf(cards).returnToHud.call(cards, 'avatar');
    expect(clone.remove).not.toHaveBeenCalled();
    resolve(); await Promise.resolve();
    expect(clone.remove).toHaveBeenCalledTimes(1);
});

function statistics({avatar = 30, weapon = 24, weaponId = 'sword', xp = 100} = {}) {
    return {avatarLevelInfo: {currentLevel: avatar, percentage: 20},
        weaponInfo: {assetId: weaponId, weaponLevelInfo: {currentLevel: weapon, percentage: 10}},
        experience: [{id: 'player', type: 'avatar', xp}, {id: weaponId, type: 'weapon', xp}]};
}
test('ordinary player XP updates do not open cards or duplicate messages; weapon labels stay suppressed', () => {
    const c = setup(); c.game.infoManager = {addDamageInfo: jest.fn()};
    c.update(statistics()); c.update(statistics({xp: 120})); c.update(statistics({xp: 120}));
    expect(c.opened.size).toBe(0);
    expect(c.game.infoManager.addDamageInfo).toHaveBeenCalledTimes(1);
    expect(c.game.infoManager.addDamageInfo).toHaveBeenCalledWith('+20 XP', 20, 15, 'xp', 1);
    expect(c.xpBaselines.get('weapon:sword')).toBe(120);
    expect(c.renderCard).toHaveBeenCalledWith('weapon');
});
test('weapon-only gains refresh progress without any floating message', () => {
    const c = setup(); c.game.infoManager = {addDamageInfo: jest.fn()};
    c.update(statistics()); const data = statistics(); data.experience[1].xp = 150; c.update(data);
    expect(c.game.infoManager.addDamageInfo).not.toHaveBeenCalled();
    expect(c.xpBaselines.get('weapon:sword')).toBe(150);
});
test('tool and companion gains still have their own XP labels', () => {
    const c = setup(); c.game.infoManager = {addDamageInfo: jest.fn()};
    const assets = ['tool', 'companion'].map(type => ({id: type, type, xp: 100}));
    c.showXp(assets); c.showXp(assets.map(a => ({...a, xp: 125})));
    expect(c.game.infoManager.addDamageInfo.mock.calls.map(call => call[0])).toEqual(['+25 Tool XP', '+25 Companion XP']);
});
test('weapon swaps establish silent level and XP baselines while same-asset upgrades celebrate', () => {
    const c = setup(); c.game.infoManager = {addDamageInfo: jest.fn()};
    c.update(statistics()); c.update(statistics({weapon: 80, weaponId: 'other'}));
    expect(c.opened.size).toBe(0);
    c.update(statistics({weapon: 81, weaponId: 'other'}));
    expect([...c.opened]).toEqual(['weapon']);
    jest.runAllTimers(); expect(c.opened.size).toBe(0);
});
test('a map change cancels a pending celebration and resets baselines', () => {
    const c = setup(); c.update(statistics()); c.update(statistics({avatar: 31}));
    expect(c.opened.has('avatar')).toBe(true);
    c.game.mapId = 'other'; c.update(statistics({avatar: 80, xp: 100000}));
    jest.runAllTimers(); expect(c.opened.size).toBe(0);
    expect(c.previous.avatar).toBe(80);
});
test('fallback statistics reads catch awards without opening cards and never overlap', async () => {
    const c = setup(); let done;
    c.game.renderStatistics = jest.fn(() => new Promise(resolve => {done = resolve;}));
    c.tick(); c.tick(); expect(c.game.renderStatistics).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(3000); c.tick(); expect(c.game.renderStatistics).toHaveBeenCalledTimes(1);
    done(); await Promise.resolve(); c.tick(); expect(c.game.renderStatistics).toHaveBeenCalledTimes(2);
    expect(c.opened.size).toBe(0);
});

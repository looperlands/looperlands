const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup(saved = {}) {
    const values = new Map(Object.entries(saved));
    const localStorage = {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, value),
    };
    const elements = new Map();
    const document = {getElementById: id => {
        if (!elements.has(id)) elements.set(id, {checked: false, addEventListener: jest.fn()});
        return elements.get(id);
    }};
    const reducedMotion = {matches: false};
    const window = {matchMedia: jest.fn(() => reducedMotion)};
    const app = {game: {combatFeedback: {clear: jest.fn()}, audioManager: {enable: jest.fn(), disable: jest.fn()}}};
    const $ = () => ({css: jest.fn(), width: () => 600, height: () => 400});
    const GameSettings = vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'settings.js'), 'utf8') + '\nGameSettings;', {
        localStorage, document, window, $, console,
    });
    return {settings: new GameSettings(app), values, elements, reducedMotion, app};
}

test('combat effects default on and retain a saved disabled preference', () => {
    expect(setup().settings.getCombatEffectsEnabled()).toBe(true);
    const disabled = setup({combatEffectsEnabled: 'false'});
    expect(disabled.settings.getCombatEffectsEnabled()).toBe(false);
    expect(disabled.elements.get('combatEffectsEnabled').checked).toBe(false);
});

test('saving settings persists the checkbox and removes active bursts', () => {
    const {settings, values, elements, app} = setup();
    elements.get('combatEffectsEnabled').checked = false;
    settings.setSettings();
    expect(values.get('combatEffectsEnabled')).toBe('false');
    expect(app.game.combatFeedback.clear).toHaveBeenCalledTimes(1);
});

test('reduced motion follows OS preference changes during the session', () => {
    const {settings, reducedMotion} = setup();
    expect(settings.getReducedMotion()).toBe(false);
    reducedMotion.matches = true;
    expect(settings.getReducedMotion()).toBe(true);
});

test('saving the stream setting refreshes playback immediately without changing game audio', () => {
    const {settings, values, app} = setup();
    app.game.map = {updateStreamMusic: jest.fn()};
    settings.setStreamMusicEnabled(false);
    expect(values.get('streamMusicEnabled')).toBe('false');
    expect(app.game.map.updateStreamMusic).toHaveBeenCalledTimes(1);
    expect(app.game.audioManager.disable).not.toHaveBeenCalled();
    settings.setStreamMusicEnabled(true);
    expect(app.game.map.updateStreamMusic).toHaveBeenCalledTimes(2);
});

const visualOptions = [
    ['mobHealthBarsEnabled', 'getMobHealthBarsEnabled'], ['hitTargetIndicatorEnabled', 'getHitTargetIndicatorEnabled'],
    ['damageNumbersEnabled', 'getDamageNumbersEnabled'], ['experiencePopupsEnabled', 'getExperiencePopupsEnabled'],
    ['comboMessagesEnabled', 'getComboMessagesEnabled'], ['comboPraiseEnabled', 'getComboPraiseEnabled'],
    ['cameraShakeEnabled', 'getCameraShakeEnabled'], ['effectTimersEnabled', 'getEffectTimersEnabled']
];
test.each(visualOptions)('%s defaults on, persists off through Save Settings and restores after reopening', (key,getter) => {
    const first = setup();
    expect(first.settings[getter]()).toBe(true);
    first.elements.get(key).checked = false;
    first.settings.setSettings();
    const reopened = setup(Object.fromEntries(first.values));
    expect(reopened.settings[getter]()).toBe(false);
    expect(reopened.elements.get(key).checked).toBe(false);
    for (const [other,otherGetter] of visualOptions) if (other !== key) expect(reopened.settings[otherGetter]()).toBe(true);
});
test('adding a shake preference preserves an existing impact-effects opt-out but honors a saved shake choice', () => {
    expect(setup({combatEffectsEnabled:'false'}).settings.getCameraShakeEnabled()).toBe(false);
    const explicit = setup({combatEffectsEnabled:'false',cameraShakeEnabled:'true'});
    expect(explicit.settings.getCameraShakeEnabled()).toBe(true);
    expect(explicit.settings.getCombatEffectsEnabled()).toBe(false);
});
test('combat text preferences separate rewards, hit numbers, messages and praise from emotes and fishing', () => {
    const {settings,values,elements} = setup({comboMessagesEnabled:'false'});
    expect(elements.get('comboPraiseEnabled').disabled).toBe(true);
    expect(settings.isCombatInfoVisible('combo')).toBe(false);
    expect(settings.isCombatInfoVisible('comboPraise')).toBe(false);
    for (const type of ['xp','inflicted','received','healed','emote','fishTrait']) expect(settings.isCombatInfoVisible(type)).toBe(true);
    values.set('comboMessagesEnabled','true');values.set('comboPraiseEnabled','false');
    expect(settings.isCombatInfoVisible('combo')).toBe(true);expect(settings.isCombatInfoVisible('comboPraise')).toBe(false);
    values.set('damageNumbersEnabled','false');values.set('experiencePopupsEnabled','false');
    for (const type of ['xp','inflicted','received','healed']) expect(settings.isCombatInfoVisible(type)).toBe(false);
    for (const type of ['combo','emote','fishTrait']) expect(settings.isCombatInfoVisible(type)).toBe(true);
});

test('saving effect-timer visibility refreshes the active HUD immediately',()=>{
    const {settings,elements,app}=setup();app.consumableHud={tick:jest.fn()};
    elements.get('effectTimersEnabled').checked=false;settings.setSettings();
    expect(settings.getEffectTimersEnabled()).toBe(false);expect(app.consumableHud.tick).toHaveBeenCalledWith(expect.any(Number));
});

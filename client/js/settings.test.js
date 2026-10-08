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

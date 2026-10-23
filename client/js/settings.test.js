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
        if (!elements.has(id)) elements.set(id, {checked: false, attributes: {}, dataset: {}, focus: jest.fn(),
            setAttribute(key,value){this.attributes[key]=value;},addEventListener: jest.fn()});
        return elements.get(id);
    }};
    const sections=['combat','display','interface','audio'];
    const tabs=sections.map(key=>{const tab=document.getElementById('settings-tab-'+key);tab.dataset.settingsTab=key;return tab;});
    const panels=sections.map(key=>{const panel=document.getElementById('settings-panel-'+key);panel.dataset.settingsPanel=key;return panel;});
    const options={scrollTop:0};
    document.querySelectorAll=selector=>selector==='[data-settings-tab]'?tabs:panels;
    document.querySelector=()=>options;
    const reducedMotion = {matches: false};
    const window = {matchMedia: jest.fn(() => reducedMotion)};
    const app = {toggleSettings: jest.fn(), fitGameToViewport: jest.fn(), game: {combatFeedback: {clear: jest.fn()}, audioManager: {enable: jest.fn(), disable: jest.fn()}}};
    const $ = () => ({css: jest.fn(), width: () => 600, height: () => 400});
    const GameSettings = vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'settings.js'), 'utf8') + '\nGameSettings;', {
        localStorage, document, window, $, console,
    });
    return {settings: new GameSettings(app), values, elements, reducedMotion, app, tabs, panels, options};
}

test('combat effects default on and retain a saved disabled preference', () => {
    expect(setup().settings.getCombatEffectsEnabled()).toBe(true);
    const disabled = setup({combatEffectsEnabled: 'false'});
    expect(disabled.settings.getCombatEffectsEnabled()).toBe(false);
    expect(disabled.elements.get('combatEffectsEnabled').checked).toBe(false);
});

test('build information shows the actual timestamp in local time with release details available', () => {
    const {settings, elements} = setup();
    const builtAt = '2026-10-20T23:30:00Z', revision = 'a'.repeat(40);
    settings.setBuildInfo({builtAt, revision});
    const element = elements.get('settings-build-date');
    expect(element.textContent).toBe(new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(builtAt)));
    expect(element.dateTime).toBe('2026-10-20T23:30:00.000Z');
    expect(element.title).toContain(revision);
});

test.each([undefined, {}, {builtAt: 'invalid'}])('missing or invalid build information keeps the fallback text', info => {
    const {settings, elements} = setup();
    settings.setBuildInfo(info);
    expect(elements.get('settings-build-date').textContent).toBeUndefined();
});

const subtleHitFeelOptions = [
    ['hitFlashEnabled','flash'],['hitSquashEnabled','squash'],['slashArcsEnabled','slash'],['hitRecoilEnabled','recoil'],
    ['hitStopEnabled','freeze'],['hitSparksEnabled','particles'],['layeredHitAudioEnabled','audio']
];
test('balanced hit effects default on while Arcade intensity defaults off',()=>{
    const {settings,elements}=setup();
    for(const [key,option] of subtleHitFeelOptions){expect(settings.getHitFeelOptions()[option]).toBe(true);expect(elements.has(key)).toBe(false);}
    expect(settings.getHitFeelOptions().shatter).toBe(true);expect(elements.get('finisherShatterEnabled').checked).toBe(true);
    expect(settings.getIntenseCombatEffectsEnabled()).toBe(false);expect(elements.get('intenseCombatEffectsEnabled').checked).toBe(false);
    expect(settings.getHitFeelOptions().intense).toBe(false);
});
test('subtle effects have no controls and obsolete per-effect preferences cannot silently disable them',()=>{
    const obsolete=Object.fromEntries(subtleHitFeelOptions.map(([key])=>[key,'false']));
    const {settings,elements}=setup(obsolete);settings.setSettings();
    for(const [key,option] of subtleHitFeelOptions){expect(settings.getHitFeelOptions()[option]).toBe(true);expect(elements.has(key)).toBe(false);}
});
test('finisher shatter remains optional and preserves its saved preference',()=>{
    const {settings,elements,values}=setup();elements.get('finisherShatterEnabled').checked=false;settings.setSettings();
    const reopened=setup(Object.fromEntries(values));expect(reopened.settings.getHitFeelOptions().shatter).toBe(false);
    expect(reopened.elements.get('finisherShatterEnabled').checked).toBe(false);
});
test('Arcade intensity is an explicit persisted opt-in and never overrides effect opt-outs',()=>{
    const {settings,elements,values}=setup({finisherShatterEnabled:'false'});
    elements.get('intenseCombatEffectsEnabled').checked=true;settings.setSettings();
    expect(settings.getHitFeelOptions()).toMatchObject({intense:true,shatter:false});
    const reopened=setup(Object.fromEntries(values));expect(reopened.settings.getIntenseCombatEffectsEnabled()).toBe(true);
    expect(reopened.settings.getHitFeelOptions()).toMatchObject({intense:true,shatter:false});
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
test('new visual options default on independently of older settings and preserve saved choices', () => {
    const existing = setup({combatEffectsEnabled: 'false'});
    for (const [key, getter] of visualOptions) {
        expect(existing.settings[getter]()).toBe(true);
        expect(existing.elements.get(key).checked).toBe(true);
    }
    expect(existing.settings.getCombatEffectsEnabled()).toBe(false);
    const explicit = setup({combatEffectsEnabled: 'false', cameraShakeEnabled: 'false'});
    expect(explicit.settings.getCameraShakeEnabled()).toBe(false);
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

function listener(element,event){return element.addEventListener.mock.calls.find(([type])=>type===event)[1];}
test('settings open on Combat with exactly one selected tab and visible panel',()=>{
    const {tabs,panels}=setup();
    expect(tabs.map(tab=>tab.attributes['aria-selected'])).toEqual(['true','false','false','false']);
    expect(tabs.map(tab=>tab.tabIndex)).toEqual([0,-1,-1,-1]);
    expect(panels.map(panel=>panel.hidden)).toEqual([false,true,true,true]);
});
test('switching sections preserves pending choices and Save Settings commits every section together',()=>{
    const {tabs,panels,elements,values,options,app}=setup();
    elements.get('mobHealthBarsEnabled').checked=false;options.scrollTop=200;
    listener(tabs[1],'click')();elements.get('fullscreen').checked=false;
    listener(tabs[2],'click')();elements.get('effectTimersEnabled').checked=false;
    listener(tabs[3],'click')();elements.get('musicEnabled').checked=false;
    expect(panels.map(panel=>panel.hidden)).toEqual([true,true,true,false]);expect(options.scrollTop).toBe(0);
    expect(values.get('mobHealthBarsEnabled')).toBe('true');expect(app.toggleSettings).not.toHaveBeenCalled();
    listener(tabs[0],'click')();expect(elements.get('mobHealthBarsEnabled').checked).toBe(false);
    const event={preventDefault:jest.fn()};listener(elements.get('settingsForm'),'submit')(event);
    for(const key of ['mobHealthBarsEnabled','fullscreen','effectTimersEnabled','musicEnabled']) expect(values.get(key)).toBe('false');
    expect(event.preventDefault).toHaveBeenCalled();expect(app.toggleSettings).toHaveBeenCalledTimes(1);
});
test.each([['ArrowRight',3,0],['ArrowLeft',0,3],['Home',2,0],['End',0,3]])('%s moves section focus without leaking to game controls',(key,from,to)=>{
    const {tabs,panels}=setup(),event={key,preventDefault:jest.fn(),stopPropagation:jest.fn()};
    listener(tabs[from],'keydown')(event);
    expect(tabs[to].focus).toHaveBeenCalledTimes(1);expect(tabs[to].attributes['aria-selected']).toBe('true');
    expect(panels[to].hidden).toBe(false);expect(event.preventDefault).toHaveBeenCalled();expect(event.stopPropagation).toHaveBeenCalled();
});
test('ordinary Tab navigation remains native',()=>{
    const {tabs}=setup(),event={key:'Tab',preventDefault:jest.fn(),stopPropagation:jest.fn()};
    listener(tabs[0],'keydown')(event);expect(event.preventDefault).not.toHaveBeenCalled();
});


test('fullscreen changes persist before refitting through the shared viewport layout', () => {
    const {settings, app, values} = setup();
    const saved = [];
    app.fitGameToViewport.mockImplementation(() => saved.push(values.get('fullscreen')));
    settings.setFullscreen(false);
    settings.setFullscreen(true);
    expect(app.fitGameToViewport).toHaveBeenCalledTimes(2);
    expect(saved).toEqual(['false', 'true']);
});

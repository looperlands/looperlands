const fs = require('fs');
const vm = require('vm');

function setup({safari = true, webAudio = true, howler = true, local = true, mp3 = true} = {}) {
    const media = [], effects = [], timers = [];
    function element() {
        const listeners = {};
        const sound = {
            paused: true, ended: false, duration: 3, readyState: 4, currentTime: 0,
            addEventListener: jest.fn((event, callback) => {listeners[event] = callback;}),
            removeEventListener: jest.fn(), load: jest.fn(), play: jest.fn(), pause: jest.fn(),
            cloneNode: jest.fn(element), listeners,
        };
        media.push(sound);
        return sound;
    }
    function Howl(options) {
        this.options = options;
        this.load = jest.fn();
        this.unload = jest.fn();
        this.play = jest.fn();
        this.stop = jest.fn();
        this.duration = jest.fn(() => 3);
        effects.push(this);
    }
    const sandbox = {
        window: {
            location: {href: local ? 'http://127.0.0.1:8013/' : 'https://game.looperlands.io/'},
            ...(howler ? {Howl, Howler: {usingWebAudio: webAudio}} : {}),
        },
        Detect: {canPlayMP3: () => mp3, isSafari: () => safari, isWindows: () => false},
        document: {createElement: jest.fn(element)},
        _: {
            size: value => value.length,
            each: (values, callback) => Object.values(values).forEach(callback),
            times: (count, callback) => {for (let index = 0; index < count; index++) callback();},
            detect: (values, callback) => values.find(callback),
        },
        console: {log: jest.fn(), debug: jest.fn(), error: jest.fn()},
        setTimeout: (callback, delay) => timers.push({callback, delay}),
        define: (dependencies, factory) => {sandbox.AudioManager = factory(function () {});},
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./audio'), 'utf8'), sandbox);
    const manager = new sandbox.AudioManager({renderer: {mobile: true}});
    return {manager, media, effects, timers, sandbox};
}

test('Safari combat effects reuse decoded sound objects without querying or playing HTML media', () => {
    const {manager, effects, sandbox} = setup();
    const kill = manager.soundEffects.kill1;
    const getSound = jest.spyOn(manager, 'getSound');
    manager.playSound('kill1');
    manager.playSound('kill1');
    manager.playSound('hit1');
    expect(kill.play).toHaveBeenCalledTimes(2);
    expect(manager.soundEffects.hit1.play).toHaveBeenCalledTimes(1);
    expect(effects).toHaveLength(manager.soundNames.length);
    expect(getSound).not.toHaveBeenCalled();
    expect(sandbox.document.createElement).not.toHaveBeenCalled();
});

test('server sound indices select the same effects on the Safari path', () => {
    const {manager} = setup();
    manager.playSound(9);
    manager.playSound('10');
    expect(manager.soundEffects.kill1.play).toHaveBeenCalledTimes(1);
    expect(manager.soundEffects.kill2.play).toHaveBeenCalledTimes(1);
});

test('disabling audio stops current effects and prevents playback until enabled again', () => {
    const {manager, effects} = setup();
    manager.playSound('kill1');
    manager.disable();
    for (const sound of effects) expect(sound.stop).toHaveBeenCalledTimes(1);
    manager.playSound('kill1');
    expect(manager.soundEffects.kill1.play).toHaveBeenCalledTimes(1);
    manager.enable();
    manager.playSound('kill1');
    expect(manager.soundEffects.kill1.play).toHaveBeenCalledTimes(2);
});

test('Safari effect loading preserves the existing decision to leave music disabled', () => {
    const {manager, effects} = setup();
    const loadMusic = jest.spyOn(manager, 'loadMusic');
    for (const sound of effects) sound.options.onload();
    expect(loadMusic).not.toHaveBeenCalled();
});

test.each([
    {safari: false}, {webAudio: false}, {howler: false},
])('keeps HTML playback available when Web Audio effects are not selected: %j', options => {
    const {manager, effects} = setup(options);
    manager.playSound('kill1');
    expect(effects).toHaveLength(0);
    expect(manager.sounds.kill1).toHaveLength(4);
    expect(manager.sounds.kill1[0].play).toHaveBeenCalledTimes(1);
});

test('a failed Web Audio load releases its resources and falls back to the same asset', () => {
    const {manager} = setup({local: false, mp3: false});
    const effect = manager.soundEffects.kill1;
    effect.options.onloaderror();
    expect(effect.unload).toHaveBeenCalledTimes(1);
    expect(manager.soundEffects.kill1).toBeUndefined();
    expect(manager.sounds.kill1[0].src).toBe(effect.options.src[0]);
    expect(manager.sounds.kill1[0].src).toBe('https://cdn.jsdelivr.net/gh/balkshamster/looperlands@main/client/audio/sounds/kill1.ogg');
    manager.playSound('kill1');
    expect(manager.sounds.kill1[0].play).toHaveBeenCalledTimes(1);
});

test('music ducking uses Web Audio duration and restores volume at the existing time', () => {
    const {manager, timers} = setup();
    manager.currentMusic = {sound: {}};
    const lower = jest.spyOn(manager, 'lowerCurrentMusicVolume').mockImplementation(() => {});
    const raise = jest.spyOn(manager, 'raiseCurrentMusicVolume').mockImplementation(() => {});
    manager.playSound('npc', true);
    expect(lower).toHaveBeenCalledTimes(1);
    expect(timers).toHaveLength(1);
    expect(timers[0].delay).toBe(2000);
    timers[0].callback();
    expect(raise).toHaveBeenCalledTimes(1);
});

test('music stays on HTML media when Safari loads it explicitly', () => {
    const {manager} = setup();
    manager.loadMusic('village');
    manager.playMusic({name: 'village', sound: manager.sounds.village[0]});
    expect(manager.sounds.village[0].loop).toBe(true);
    expect(manager.sounds.village[0].play).toHaveBeenCalledTimes(1);
    expect(manager.soundEffects.village).toBeUndefined();
});

const fs = require('fs');
const vm = require('vm');

function setup({safari = true, webAudio = true, howler = true, local = true, mp3 = true, mobile = true} = {}) {
    const media = [], effects = [], timers = [];
    const documentListeners = new Map();
    const intervals = new Set();
    const playbackChecks = new Set();
    function element() {
        const listeners = {};
        const sound = {
            paused: true, ended: false, duration: 3, readyState: 4, currentTime: 0, volume: 1,
            addEventListener: jest.fn((event, callback) => {listeners[event] = callback;}),
            removeEventListener: jest.fn(), removeAttribute: jest.fn(), load: jest.fn(),
            play: jest.fn(() => {sound.paused = false; return Promise.resolve();}),
            pause: jest.fn(() => {sound.paused = true;}),
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
        document: {
            createElement: jest.fn(element), hidden: false,
            addEventListener: (event, callback) => {
                if (!documentListeners.has(event)) documentListeners.set(event, new Set());
                documentListeners.get(event).add(callback);
            },
            removeEventListener: (event, callback) => documentListeners.get(event)?.delete(callback),
        },
        _: {
            size: value => value.length,
            each: (values, callback) => Object.values(values).forEach(callback),
            times: (count, callback) => {for (let index = 0; index < count; index++) callback();},
            detect: (values, callback) => values.find(callback),
        },
        console: {log: jest.fn(), debug: jest.fn(), error: jest.fn()},
        setTimeout: (callback, delay) => timers.push({callback, delay}),
        setInterval: (callback, delay) => {
            const interval = {callback, delay};
            (delay < 5000 ? intervals : playbackChecks).add(interval);
            return interval;
        },
        clearInterval: interval => {
            intervals.delete(interval);
            playbackChecks.delete(interval);
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), sandbox);
    sandbox.define = factory => {sandbox.Area = factory();};
    vm.runInContext(fs.readFileSync(require.resolve('./area'), 'utf8'), sandbox);
    sandbox.define = factory => {sandbox.MusicPlayer = factory();};
    vm.runInContext(fs.readFileSync(require.resolve('./musicplayer'), 'utf8'), sandbox);
    sandbox.define = (dependencies, factory) => {sandbox.AudioManager = factory(sandbox.Area, sandbox.MusicPlayer);};
    vm.runInContext(fs.readFileSync(require.resolve('./audio'), 'utf8'), sandbox);
    const manager = new sandbox.AudioManager({renderer: {mobile}, player: {gridX: 1, gridY: 1}});
    const dispatch = event => documentListeners.get(event)?.forEach(callback => callback());
    return {manager, media, effects, timers, intervals, playbackChecks, sandbox, dispatch};
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

test.each([true, false])('Safari area music starts without waiting for sound effects (mobile: %s)', mobile => {
    const {manager, media} = setup({mobile});
    expect(media).toHaveLength(0);
    manager.addArea(0, 0, 10, 10, 'village');
    manager.updateMusic();
    expect(media).toHaveLength(1);
    expect(media[0].src).toBe('audio/music/village.mp3');
    expect(media[0].loop).toBe(false);
    expect(media[0].play).toHaveBeenCalledTimes(1);
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

test('area changes reuse the permitted media element and cancel an old fade', async () => {
    const {manager, media, intervals} = setup();
    manager.addArea(0, 0, 10, 10, 'village');
    manager.addArea(10, 0, 10, 10, 'forest');
    manager.updateMusic();
    await Promise.resolve();
    manager.fadeOutCurrentMusic();
    expect(intervals.size).toBe(1);
    manager.game.player.gridX = 11;
    manager.updateMusic();
    expect(media).toHaveLength(1);
    expect(media[0].src).toBe('audio/music/forest.mp3');
    expect(media[0].play).toHaveBeenCalledTimes(2);
    expect(intervals.size).toBe(0);
    expect(media[0].volume).toBe(1);
});

test('a blocked area track retries on interaction without requiring player movement', async () => {
    const {manager, dispatch} = setup();
    const sound = manager.musicPlayer.getSound();
    sound.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    manager.addArea(0, 0, 10, 10, 'village');
    manager.updateMusic();
    await Promise.resolve();
    dispatch('click');
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(manager.currentMusic.name).toBe('village');
});

test('disabling game audio cancels fades and blocked retries, then enabling restarts the area', async () => {
    const {manager, intervals, dispatch} = setup();
    manager.addArea(0, 0, 10, 10, 'village');
    const sound = manager.musicPlayer.getSound();
    sound.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    manager.updateMusic();
    manager.lowerCurrentMusicVolume();
    manager.disable();
    await Promise.resolve();
    dispatch('keydown');
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(intervals.size).toBe(0);
    manager.enable();
    expect(sound.play).toHaveBeenCalledTimes(2);
});

test('server music selections accept names and stable zero-based indices', () => {
    const {manager} = setup();
    manager.playMusicByName('0');
    expect(manager.musicPlayer.source).toBe('audio/music/village.mp3');
    manager.playMusicByName('forest');
    expect(manager.musicPlayer.source).toBe('audio/music/forest.mp3');
    manager.playMusicByName('missing');
    expect(manager.musicPlayer.source).toBe('audio/music/forest.mp3');
});

test('streams replace area music while effects remain enabled and area music returns when the stream ends', async () => {
    const {manager, media} = setup();
    manager.addArea(0, 0, 10, 10, 'village');
    manager.updateMusic();
    await Promise.resolve();
    manager.playStreamMusic('https://example.com/radio.mp3');
    expect(media[0].paused).toBe(true);
    expect(media[1].play).toHaveBeenCalledTimes(1);
    expect(manager.enabled).toBe(true);
    manager.playSound('kill1');
    expect(manager.soundEffects.kill1.play).toHaveBeenCalledTimes(1);
    manager.updateMusic();
    expect(media[0].play).toHaveBeenCalledTimes(1);
    manager.playStreamMusic(null);
    expect(media[1].paused).toBe(true);
    expect(media[0].play).toHaveBeenCalledTimes(2);
});

test('repeated stream polling does not restart a track and stream changes reuse its element', async () => {
    const {manager, media} = setup();
    manager.playStreamMusic('https://example.com/first.mp3');
    await Promise.resolve();
    manager.playStreamMusic('https://example.com/first.mp3');
    expect(media[0].play).toHaveBeenCalledTimes(1);
    manager.playStreamMusic('https://example.com/second.mp3');
    expect(media).toHaveLength(1);
    expect(media[0].src).toBe('https://example.com/second.mp3');
    expect(media[0].play).toHaveBeenCalledTimes(2);
});

test('stream and game-audio settings remain independent', async () => {
    const {manager, dispatch} = setup();
    manager.disable();
    manager.playStreamMusic('https://example.com/radio.mp3');
    const sound = manager.streamMusic.sound;
    await Promise.resolve();
    manager.disable();
    expect(sound.paused).toBe(false);
    manager.playStreamMusic(null);
    dispatch('click');
    expect(sound.paused).toBe(true);
    expect(sound.play).toHaveBeenCalledTimes(1);
});

test('replacing the audio manager removes gesture listeners and unloads active effects', () => {
    const {manager, effects, dispatch} = setup();
    manager.playStreamMusic('https://example.com/radio.mp3');
    const sound = manager.streamMusic.sound;
    manager.destroy();
    dispatch('click');
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(sound.removeAttribute).toHaveBeenCalledWith('src');
    for (const effect of effects) expect(effect.unload).toHaveBeenCalledTimes(1);
});

test('leaving a music area during dialogue ducking still fades out and stops the track', async () => {
    const {manager, intervals} = setup();
    manager.addArea(0, 0, 10, 10, 'village');
    manager.updateMusic();
    await Promise.resolve();
    manager.lowerCurrentMusicVolume();
    manager.game.player.gridX = 30;
    manager.updateMusic();
    expect(intervals.size).toBe(1);
    const fade = [...intervals][0];
    for (let index = 0; index < 60; index++) {
        if (intervals.has(fade)) fade.callback();
    }
    expect(manager.musicPlayer.sound.paused).toBe(true);
    expect(manager.musicPlayer.active).toBe(false);
    expect(intervals.size).toBe(0);
});

test('empty stream polls cannot restart a track deliberately faded out for death or a minigame', async () => {
    const {manager, intervals} = setup();
    manager.addArea(0, 0, 10, 10, 'village');
    manager.updateMusic();
    await Promise.resolve();
    manager.fadeOutCurrentMusic();
    manager.playStreamMusic(null);
    const sound = manager.musicPlayer.sound;
    expect(sound.play).toHaveBeenCalledTimes(1);
    const fade = [...intervals][0];
    for (let index = 0; index < 60; index++) {
        if (intervals.has(fade)) fade.callback();
    }
    manager.playStreamMusic(null);
    expect(sound.paused).toBe(true);
    expect(sound.play).toHaveBeenCalledTimes(1);
});


test('an unchanged stream URL poll resumes a paused track without reloading it', async () => {
    const {manager} = setup();
    const url = 'https://example.com/radio.mp3';
    manager.playStreamMusic(url);
    await Promise.resolve();
    const sound = manager.streamMusic.sound;
    sound.currentTime = 12;
    sound.paused = true;
    manager.playStreamMusic(url);
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(sound.currentTime).toBe(12);
    expect(sound.load).toHaveBeenCalledTimes(1);
});

test('Duckville garden music continues through successive song completions', async () => {
    const {manager} = setup();
    const garden = JSON.parse(fs.readFileSync(require.resolve('../maps/world_client_duckville.json'), 'utf8'))
        .musicAreas.find(area => area.id === 'beesinthegarden');
    manager.game.player = {gridX: garden.x + 1, gridY: garden.y + 1};
    manager.addArea(garden.x, garden.y, garden.w, garden.h, garden.id);
    manager.updateMusic();
    const sound = manager.musicPlayer.sound;
    expect(sound.src).toBe('audio/music/beesinthegarden.mp3');
    expect(sound.listeners.ended).toEqual(expect.any(Function));
    for (let song = 0; song < 2; song++) {
        await Promise.resolve();
        sound.currentTime = sound.duration;
        sound.paused = true;
        sound.ended = true;
        sound.listeners.ended();
    }
    expect(sound.play).toHaveBeenCalledTimes(3);
    manager.disable();
    sound.listeners.ended();
    expect(sound.play).toHaveBeenCalledTimes(3);
});

const fs = require('fs');
const vm = require('vm');

function setup({safari = true, webAudio = true, howler = true, local = true, mp3 = true, mobile = true} = {}) {
    const media = [], effects = [], timers = [];
    const documentListeners = new Map();
    const intervals = new Set();
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
        this.rate = jest.fn();
        this.volume = jest.fn();
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
            intervals.add(interval);
            return interval;
        },
        clearInterval: interval => intervals.delete(interval),
    };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), sandbox);
    sandbox.define = factory => {sandbox.Area = factory();};
    vm.runInContext(fs.readFileSync(require.resolve('./area'), 'utf8'), sandbox);
    sandbox.define = factory => {sandbox.MusicPlayer = factory();};
    vm.runInContext(fs.readFileSync(require.resolve('./musicplayer'), 'utf8'), sandbox);
    sandbox.define = Object.assign(factory => {sandbox.AmbientConfig = factory();}, {amd: true});
    vm.runInContext(fs.readFileSync(require.resolve('./ambientconfig'), 'utf8'), sandbox);
    sandbox.define = Object.assign((deps, factory) => {sandbox.Soundscape = factory(sandbox.AmbientConfig);}, {amd: true});
    vm.runInContext(fs.readFileSync(require.resolve('./soundscape'), 'utf8'), sandbox);
    sandbox.define = (dependencies, factory) => {sandbox.AudioManager = factory(sandbox.Area, sandbox.MusicPlayer, sandbox.AmbientConfig, sandbox.Soundscape);};
    vm.runInContext(fs.readFileSync(require.resolve('./audio'), 'utf8'), sandbox);
    const manager = new sandbox.AudioManager({renderer: {mobile}, player: {gridX: 1, gridY: 1}});
    const dispatch = event => documentListeners.get(event)?.forEach(callback => callback());
    return {manager, media, effects, timers, intervals, sandbox, dispatch};
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

test('confirmed combo audio caps pitch and respects the existing audio switch', () => {
    const {manager} = setup();
    manager.playConfirmedImpact(5, false);
    expect(manager.soundEffects.hit1.rate).toHaveBeenCalledWith(1.24, undefined);
    manager.playConfirmedImpact(50, true);
    expect(manager.soundEffects.hit2.rate).toHaveBeenCalledWith(1.24 * .88, undefined);
    manager.disable();
    manager.playConfirmedImpact(3, true);
    expect(manager.soundEffects.hit1.play).toHaveBeenCalledTimes(1);
});

test('preview bass context is unlocked by a gesture, reused, suspended and closed with game audio', () => {
    const {manager,sandbox} = setup();
    const context={state:'suspended',resume:jest.fn(()=>Promise.resolve()),suspend:jest.fn(()=>Promise.resolve()),close:jest.fn(()=>Promise.resolve())};
    sandbox.window.AudioContext=jest.fn(()=>context);
    manager.prepareImpactAudio();manager.prepareImpactAudio();
    expect(sandbox.window.AudioContext).toHaveBeenCalledTimes(1);expect(context.resume).toHaveBeenCalledTimes(2);
    manager.disable();manager.prepareImpactAudio();expect(context.resume).toHaveBeenCalledTimes(2);
    expect(context.suspend).toHaveBeenCalledTimes(1);manager.destroy();expect(context.close).toHaveBeenCalledTimes(1);
});

test.each([true, false])('repeating sounds vary subtly on each play (Web Audio: %s)', safari => {
    const {manager, sandbox} = setup({safari});
    sandbox.Math = Object.create(Math);
    sandbox.Math.random = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(1);
    const sound = safari ? manager.soundEffects.hit1 : manager.getSound('hit1');
    if (safari) sound.play.mockReturnValueOnce(21).mockReturnValueOnce(22);
    manager.playSound('hit1');
    if (safari) expect(sound.rate).toHaveBeenLastCalledWith(0.92, 21);
    else {
        expect(sound.playbackRate).toBe(0.92);
        expect(sound.preservesPitch).toBe(false);
    }
    manager.playSound(6); // hit1, as sent by the server
    if (safari) expect(sound.rate).toHaveBeenLastCalledWith(1.08, 22);
    else expect(sound.playbackRate).toBe(1.08);
    manager.playSound('achievement');
    expect(sandbox.Math.random).toHaveBeenCalledTimes(2);
    if (safari) expect(manager.soundEffects.achievement.rate).not.toHaveBeenCalled();
    else expect(manager.getSound('achievement').playbackRate).toBe(1);
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
    expect(media[0].loop).toBe(true);
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
    expect(media[0].volume).toBe(.25);
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

test('scene music overrides ordinary areas, supports silence/inheritance and preserves scripted priority', () => {
    const {manager} = setup();
    const entity = {gridX: 2, gridY: 2};
    const ordinary = {contains: () => true, musicName: 'ordinary'};
    manager.areas = [ordinary];
    manager.getMusic = jest.fn(name => name ? {name} : null);
    let scene = {authoringMusic: 'forest'};
    manager.game.map = {getCurrentScene: () => scene};
    expect(manager.getSurroundingMusic(entity)).toEqual({name: 'forest'});
    scene.authoringMusic = '';
    expect(manager.getSurroundingMusic(entity)).toBeNull();
    scene.authoringMusic = null;
    expect(manager.getSurroundingMusic(entity)).toEqual({name: 'ordinary'});
    scene.authoringMusic = 'forest';
    manager.game.worldMusicAreas = [ordinary];
    expect(manager.getSurroundingMusic(entity)).toEqual({name: 'ordinary'});
});

test('ambience uses interpolated player tiles, clears map changes, and respects pause and mute', () => {
    const {manager} = setup();
    const update = jest.spyOn(manager.soundscape, 'update'), clear = jest.spyOn(manager.soundscape, 'clear');
    manager.game.started = true; manager.game.player = {x: 168, y: 320};
    manager.game.map = {tilesize: 16, isLoaded: true, ambientSounds: [{id: 'fire'}]};
    manager.updateAmbience();
    expect(update).toHaveBeenLastCalledWith([{id: 'fire'}], {x: 10.5, y: 20}, true);
    expect(clear).toHaveBeenCalledTimes(1);
    manager.updateAmbience(); expect(clear).toHaveBeenCalledTimes(1);
    manager.game.map = {isLoaded: true}; manager.updateAmbience(); expect(clear).toHaveBeenCalledTimes(2);
    manager.game.isStopped = true; manager.updateAmbience(); expect(update.mock.calls.at(-1)[2]).toBe(false);
    manager.game.isStopped = false; manager.disable(); manager.updateAmbience(); expect(update.mock.calls.at(-1)[2]).toBe(false);
});

test('zero-based achievement sound IDs work and mute stops native samples too', () => {
    const {manager} = setup({safari: false});
    manager.playSound('0'); expect(manager.sounds.achievement[0].play).toHaveBeenCalled();
    manager.disable(); expect(manager.sounds.achievement[0].pause).toHaveBeenCalled();
});

test('separate volumes apply to existing and future effects, regular music and streams', () => {
    const {manager} = setup({safari: false}); manager.playMusicByName('village');
    expect(manager.musicPlayer.sound.volume).toBe(.25);
    manager.setVolumes({music: .12, sound: 0, ambient: .6});
    manager.playSound('hit1'); expect(manager.sounds.hit1[0].volume).toBe(0);
    expect(manager.soundscape.effectsVolume).toBe(0); expect(manager.soundscape.ambientVolume).toBe(.6);
    manager.playStreamMusic('https://example.com/music.mp3'); expect(manager.streamMusic.sound.volume).toBe(.12);
    manager.setVolumes({music: 0}); expect(manager.streamMusic.sound.volume).toBe(0);
});
test('Safari effects follow the effects volume independently of music', () => {
    const {manager} = setup(); manager.setVolumes({sound: .35, music: .1});
    expect(manager.soundEffects.hit1.volume).toHaveBeenCalledWith(.35);
});
test('music fades use normalized levels and cannot restore full volume or get stuck at mute', () => {
    const {manager, intervals} = setup(); manager.playMusicByName('village');
    manager.setVolumes({music: .2}); manager.lowerCurrentMusicVolume();
    for (let i = 0; i < 60; i++) for (const interval of [...intervals]) interval.callback();
    expect(manager.musicPlayer.sound.volume).toBeLessThan(.06);
    manager.setVolumes({music: .1}); manager.raiseCurrentMusicVolume();
    for (let i = 0; i < 60; i++) for (const interval of [...intervals]) interval.callback();
    expect(manager.musicPlayer.sound.volume).toBe(.1);
    manager.setVolumes({music: 0}); manager.fadeOutCurrentMusic();
    for (let i = 0; i < 60; i++) for (const interval of [...intervals]) interval.callback();
    expect(intervals.size).toBe(0); expect(manager.musicPlayer.active).toBe(false);
    manager.playMusicByName('forest'); expect(manager.musicPlayer.sound.volume).toBe(0);
    manager.setVolumes({music: .15}); expect(manager.musicPlayer.sound.volume).toBe(.15);
});

test('confirmed impact bass follows the effects slider and mute even on a shared context', () => {
    const {manager, sandbox} = setup();
    const param = () => ({value: 0, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn()});
    const context = {state: 'running', currentTime: 1, destination: {},
        createGain: () => ({gain: param(), connect: jest.fn(), disconnect: jest.fn()}),
        createOscillator: () => ({frequency: param(), connect: jest.fn(), disconnect: jest.fn(), start: jest.fn(), stop: jest.fn()})};
    sandbox.window.Howler.ctx = context;
    manager.setVolumes({sound: .2}); manager.playConfirmedImpact(1, true);
    expect(manager.impactGain.gain.value).toBe(.2);
    manager.setVolumes({sound: 0}); expect(manager.impactGain.gain.value).toBe(0);
    manager.setVolumes({sound: .4}); manager.disable(); expect(manager.impactGain.gain.value).toBe(0);
    manager.enable(); expect(manager.impactGain.gain.value).toBe(.4);
});

const fs = require('fs');
const vm = require('vm');

function setup() {
    let now = 0, frameId = 0;
    const frames = new Map(), timers = new Map(), listeners = new Map();
    class Mob {}
    const entity = new Mob();
    const node = () => ({style: {}, appendChild: jest.fn(), addEventListener: jest.fn(), remove: jest.fn()});
    const document = {
        hidden: false, body: node(), createElement: jest.fn(node),
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: jest.fn(name => listeners.delete(name)),
    };
    const effect = {stop: jest.fn(), _webAudio: true};
    const audio = {
        enabled: true, soundEffects: {kill1: effect}, soundNames: ['kill1'], sounds: {},
        load: jest.fn(function (base, name) {this.sounds[name] = [{pause: jest.fn()}];}),
        playSound: jest.fn(function () {return this.soundEffects.kill1 ? 'web' : 'html';}),
    };
    const game = {
        audioManager: audio, camera: {isVisible: () => true}, getEntityById: () => entity,
        tick() {}, updater: {update() {}}, renderer: {renderFrame() {}},
        client: {
            receiveActionBatch() {},
            despawn_callback: jest.fn(() => {audio.playSound('kill1'); entity.isDead = true; now += 12;}),
        },
    };
    const sandbox = {
        document, performance: {now: () => now},
        requestAnimationFrame: callback => {frames.set(++frameId, callback); return frameId;},
        cancelAnimationFrame: jest.fn(id => frames.delete(id)),
        setTimeout: (callback, delay) => {const id = {}; timers.set(id, {callback, at: now + delay}); return id;},
        clearTimeout: id => timers.delete(id),
        define: (dependencies, factory) => {sandbox.module = factory(Mob);},
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./kill-audio-probe'), 'utf8'), sandbox);
    const originals = {play: audio.playSound, despawn: game.client.despawn_callback, tick: game.tick};
    const probe = sandbox.module.install(game);
    function frame(time) {
        now = time;
        const callbacks = [...frames.values()]; frames.clear();
        callbacks.forEach(callback => callback(time));
    }
    function finish(time = 2200) {
        now = time;
        for (const [id, timer] of [...timers]) if (timer.at <= time) {timers.delete(id); timer.callback();}
    }
    function kill(time = 100) {now = time; game.client.despawn_callback('rat-1');}
    return {probe, frame, finish, kill, audio, game, originals, document, listeners, sandbox};
}

test('measures delayed frame gaps separately from the death callback and sound call', () => {
    const {probe, frame, finish, kill} = setup();
    frame(0); frame(16);
    kill();
    frame(108); frame(1008); frame(1024);
    finish();
    const [record] = probe.report();
    expect(record).toMatchObject({mode: 'normal', despawnMs: 12, beforeMaxMs: 16, afterMaxMs: 900});
    expect(record.sounds).toEqual([{name: 'kill1', mode: 'normal', durationMs: 0}]);
    expect(record.gapsOver50ms).toContainEqual({afterDeathMs: 908, gapMs: 900});
    expect(record.invalidReason).toBeUndefined();
});

test('rejects background-throttled timing instead of reporting it as a kill stall', () => {
    const {probe, frame, finish, kill, document, listeners} = setup();
    frame(0); frame(16); kill();
    document.hidden = true;
    listeners.get('visibilitychange')();
    frame(1000);
    document.hidden = false;
    listeners.get('visibilitychange')();
    frame(1500); frame(1516); finish();
    expect(probe.report()[0]).toMatchObject({invalidReason: 'Page hidden during sample', afterMaxMs: 16});
});

test('compares playback modes without persisting a Sound setting or replacing decoded buffers', () => {
    const {probe, audio} = setup();
    const effects = audio.soundEffects;
    expect(audio.playSound('kill1')).toBe('web');
    probe.setMode('html');
    expect(audio.playSound('kill1')).toBe('html');
    expect(audio.soundEffects).toBe(effects);
    probe.setMode('silent');
    audio.playSound('kill1');
    probe.setMode('normal');
    expect(audio.playSound('kill1')).toBe('web');
    expect(audio.enabled).toBe(true);
    expect(audio.load).toHaveBeenCalledTimes(1);
});

test('rejects a sample when the playback mode changes during its measurement window', () => {
    const {probe, frame, finish, kill} = setup();
    frame(0); frame(16); kill();
    probe.setMode('silent');
    frame(112); finish();
    expect(probe.report()[0].invalidReason).toBe('Audio mode changed during sample');
});

test('stopping the probe restores callbacks and removes its frame loop and panel', () => {
    const {probe, audio, game, originals, document, sandbox} = setup();
    probe.stop();
    expect(audio.playSound).toBe(originals.play);
    expect(game.client.despawn_callback).toBe(originals.despawn);
    expect(game.tick).toBe(originals.tick);
    expect(game.killAudioProbe).toBeUndefined();
    expect(sandbox.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(document.createElement.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
});

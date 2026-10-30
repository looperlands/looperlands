const Soundscape = require('./soundscape'), Config = require('./ambientconfig');
const fire = (patch = {}) => ({id: 'fire', name: 'Fire', preset: 'campfire', x: 10, y: 10, radius: 10, volume: .5, ...patch});
function setup() {
    const listeners = new Map(), sources = [];
    const param = () => ({value: 0, setTargetAtTime: jest.fn()});
    const node = () => ({connect: jest.fn(), disconnect: jest.fn(), gain: param(), pan: param()});
    const context = {state: 'running', sampleRate: 8000, currentTime: 1, destination: {},
        createGain: jest.fn(node), createStereoPanner: jest.fn(node),
        createBuffer: jest.fn((channels, length, rate) => {const data = new Float32Array(length); return {getChannelData: () => data, duration: length / rate};}),
        createBufferSource: jest.fn(() => {const s = {...node(), start: jest.fn(), stop: jest.fn()}; sources.push(s); return s;}),
        resume: jest.fn(() => Promise.resolve()), close: jest.fn(() => Promise.resolve())};
    const doc = {hidden: false, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name, fn) => {if (listeners.get(name) === fn) listeners.delete(name);}};
    const host = {AudioContext: jest.fn(() => context)};
    return {engine: new Soundscape(host, doc), context, doc, host, listeners, sources};
}
test('distance is radial, centered at the source, silent at the boundary, and stereo is relative to the listener', () => {
    expect(Config.spatial(fire(), {x: 10, y: 10})).toEqual({gain: .5, pan: 0});
    expect(Config.spatial(fire(), {x: 10, y: 15})).toEqual({gain: .25, pan: 0});
    expect(Config.spatial(fire(), {x: 0, y: 10}).gain).toBe(0);
    expect(Config.spatial(fire(), {x: 16, y: 18}).gain).toBe(0);
    expect(Config.spatial(fire(), {x: 8, y: 10}).pan).toBeGreaterThan(0);
    expect(Config.spatial(fire(), {x: 12, y: 10}).pan).toBeLessThan(0);
});
test('no context starts before a gesture; movement smooths a reused voice and leaving range releases it', () => {
    const {engine, host, listeners, sources} = setup();
    engine.update([fire()], {x: 10, y: 10}); expect(host.AudioContext).not.toHaveBeenCalled();
    listeners.get('pointerdown')(); engine.update([fire()], {x: 8, y: 10});
    const voice = engine.voices.get('fire'); expect(voice.pan.pan.setTargetAtTime.mock.calls[0][0]).toBeGreaterThan(0);
    engine.update([fire()], {x: 12, y: 10}); expect(sources).toHaveLength(1);
    expect(voice.pan.pan.setTargetAtTime.mock.calls[1][0]).toBeLessThan(0);
    engine.update([fire()], {x: 50, y: 10}); expect(engine.voices.size).toBe(0);
    expect(voice.source.stop).toHaveBeenCalledWith(1.4);
    voice.source.onended(); expect(voice.gain.disconnect).toHaveBeenCalled(); expect(engine.cues.size).toBe(0);
});
test('the mix is bounded, texture buffers are shared, and distant sources allocate nothing', () => {
    const {engine, context} = setup(); engine.unlock();
    engine.update(Array.from({length: 30}, (_, i) => fire({id: 'fire' + i, x: i < 20 ? 10 : 100})), {x: 10, y: 10});
    expect(engine.voices.size).toBe(8); expect(context.createBuffer).toHaveBeenCalledTimes(1);
    expect([...engine.voices.values()][0].gain.gain.setTargetAtTime).toHaveBeenCalledWith(.5 / Math.sqrt(8), 1, .12);
});
test.each(['mute', 'hidden', 'inactive', 'clear', 'destroy'])('%s stops and disconnects ambient and transient voices', reason => {
    const {engine, doc, listeners, context, sources} = setup(); engine.unlock();
    engine.update([fire()], {x: 10, y: 10}); engine.cue('wood');
    if (reason === 'mute') engine.setEnabled(false);
    if (reason === 'hidden') {doc.hidden = true; listeners.get('visibilitychange')();}
    if (reason === 'inactive') engine.update([fire()], {x: 10, y: 10}, false);
    if (reason === 'clear') engine.clear(); if (reason === 'destroy') engine.destroy();
    expect(engine.voices.size).toBe(0); expect(engine.cues.size).toBe(0);
    sources.forEach(source => {expect(source.stop).toHaveBeenCalled(); expect(source.disconnect).toHaveBeenCalled();});
    if (reason === 'destroy') {expect(listeners.size).toBe(0); expect(context.close).toHaveBeenCalled();}
});
test('mute prevents new cues and gestures, while enabling can restart the soundscape', () => {
    const {engine, host} = setup(); engine.setEnabled(false); engine.unlock();
    expect(host.AudioContext).not.toHaveBeenCalled(); engine.setEnabled(true); engine.unlock();
    engine.cue('stone'); expect(engine.cues.size).toBe(1); engine.setEnabled(false); engine.cue('stone'); expect(engine.cues.size).toBe(0);
    engine.setEnabled(true); engine.update([fire()], {x: 10, y: 10}); expect(engine.voices.size).toBe(1);
});
test.each(Object.keys(Config.presets))('%s texture is finite, audible and tapered at the loop join', preset => {
    const {context} = setup(), buffer = Soundscape.texture(context, preset), data = buffer.getChannelData(0);
    let power = 0, peak = 0;
    for (const value of data) {power += value * value; peak = Math.max(peak, Math.abs(value));}
    expect(Number.isFinite(power)).toBe(true);
    expect(Math.sqrt(power / data.length)).toBeGreaterThan(.005); expect(peak).toBeLessThan(1); expect(Math.abs(data[0])).toBe(0); expect(Math.abs(data[data.length - 1])).toBeLessThan(.005);
});
test('invalid source definitions cannot reach a saved map', () => {
    expect(Config.validate([fire()], {width: 20, height: 20})).toHaveLength(1);
    for (const patch of [{x: -1}, {x: 20}, {y: .5}, {radius: 0}, {radius: 65}, {volume: NaN}, {volume: 2}, {preset: 'constructor'}, {name: '<script>'}, {url: 'external'}]) expect(() => Config.validate([fire(patch)], {width: 20, height: 20})).toThrow();
    expect(() => Config.validate([fire(), fire()])).toThrow('unique');
});

test('effects and ambience have independent buses, including zero before audio unlock', () => {
    const {engine} = setup(); engine.setVolumes(.3, 0); engine.unlock();
    expect(engine.effectsBus.gain.value).toBe(.3); expect(engine.ambientBus.gain.value).toBe(0);
    engine.update([fire()], {x: 10, y: 10}); engine.cue('wood');
    expect(engine.voices.get('fire').pan.connect).toHaveBeenCalledWith(engine.ambientBus);
    expect([...engine.cues][0].pan.connect).toHaveBeenCalledWith(engine.effectsBus);
    engine.setVolumes(0, .6); expect(engine.effectsBus.gain.value).toBe(0); expect(engine.ambientBus.gain.value).toBe(.6);
});
const uploaded = 'upload:brook--' + 'a'.repeat(64) + '.wav';
const settle = () => new Promise(resolve => setImmediate(resolve));
test('uploaded clips load only nearby, share decoded data, and use the positional mix', async () => {
    const {engine, host, context} = setup(); host.AbortController = AbortController;
    host.fetch = jest.fn(async () => ({ok: true, arrayBuffer: async () => new ArrayBuffer(100)}));
    const buffer = {duration: 2}; context.decodeAudioData = jest.fn(async () => buffer);
    engine.unlock(); engine.update([fire({preset: uploaded})], {x: 100, y: 100}); expect(host.fetch).not.toHaveBeenCalled();
    engine.update([fire({preset: uploaded})], {x: 8, y: 10}); await settle();
    engine.update([fire({preset: uploaded})], {x: 8, y: 10});
    expect(host.fetch).toHaveBeenCalledTimes(1); expect(context.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(engine.voices.get('fire').source.buffer).toBe(buffer);
    expect(engine.voices.get('fire').pan.pan.setTargetAtTime.mock.calls[0][0]).toBeGreaterThan(0);
});
test('clearing while a clip decodes prevents stale completion from retaining data or starting playback', async () => {
    const {engine, host, context} = setup(); host.AbortController = AbortController;
    host.fetch = jest.fn(async () => ({ok: true, arrayBuffer: async () => new ArrayBuffer(100)}));
    let finish; context.decodeAudioData = jest.fn(() => new Promise(resolve => {finish = resolve;}));
    engine.unlock(); engine.update([fire({preset: uploaded})], {x: 10, y: 10}); await settle();
    engine.clear(); finish({duration: 2}); await settle();
    expect(engine.voices.size).toBe(0); expect(engine.buffers.size).toBe(0); expect(engine.pending.size).toBe(0);
});
test('missing uploads fail quietly without repeated requests; bundled presets fall back to synthesis', async () => {
    const {engine, host} = setup(); host.AbortController = AbortController;
    host.fetch = jest.fn(async () => ({ok: false})); engine.unlock();
    engine.update([fire({preset: uploaded})], {x: 10, y: 10}); await settle();
    engine.update([fire({preset: uploaded})], {x: 10, y: 10}); expect(host.fetch).toHaveBeenCalledTimes(1);
    expect(engine.errors.get(uploaded)).toMatch(/unavailable/); expect(engine.voices.size).toBe(0);
    engine.update([fire()], {x: 10, y: 10}); await settle(); engine.update([fire()], {x: 10, y: 10}); expect(engine.voices.size).toBe(1);
});

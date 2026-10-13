const fs = require('fs'), vm = require('vm');
function setup() {
    const nodes = [];
    const context = {state: 'running', currentTime: 1, sampleRate: 48000, destination: {},
        createBuffer: jest.fn(() => ({getChannelData: () => new Float32Array(1920)})),
        resume: jest.fn(() => Promise.resolve()),
        createBufferSource: jest.fn(() => {
            const node = {connect: jest.fn(), disconnect: jest.fn(), start: jest.fn(), playbackRate: {}};
            nodes.push(node); return node;
        }),
        createBiquadFilter: jest.fn(() => ({connect: jest.fn(), disconnect: jest.fn(), frequency: {}})),
        createGain: jest.fn(() => ({connect: jest.fn(), disconnect: jest.fn(), gain: {
            setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn()}}))};
    const listeners = {};
    const document = {hidden: false, addEventListener: (event, handler) => {listeners[event] = handler;},
        removeEventListener: jest.fn()};
    const window = {Howler: {ctx: context}};
    let methods;
    vm.runInNewContext(fs.readFileSync(require.resolve('./audio'), 'utf8'), {
        document, window, Class: {extend: value => value}, define: (_, factory) => {methods = factory();},
    });
    const manager = Object.assign(Object.create(methods), {enabled: true});
    manager.setupFootsteps();
    return {manager, context, document, window, listeners, nodes};
}
test('audio starts only after a gesture, shares its noise buffer, and releases finished nodes', () => {
    const {manager, context, document, listeners, nodes} = setup();
    manager.playFootstep('sand');
    expect(context.createBufferSource).not.toHaveBeenCalled();
    listeners.pointerdown();
    manager.playFootstep('sand');
    expect(nodes[0].start).toHaveBeenCalledWith(1);
    expect(document.removeEventListener).toHaveBeenCalledTimes(2);
    manager.playFootstep('sand');
    expect(nodes).toHaveLength(1);
    context.currentTime = 1.2;
    manager.playFootstep('grass');
    expect(context.createBuffer).toHaveBeenCalledTimes(1);
    expect(context.createBiquadFilter.mock.results.map(result => result.value.frequency.value)).toEqual([1100, 400]);
    nodes[0].onended();
    expect(nodes[0].disconnect).toHaveBeenCalledTimes(1);
});
test.each(['mute', 'background', 'suspended'])('%s produces no audio', reason => {
    const {manager, context, document, listeners} = setup();
    listeners.keydown();
    if (reason === 'mute') manager.enabled = false;
    if (reason === 'background') document.hidden = true;
    if (reason === 'suspended') context.state = 'suspended';
    manager.playFootstep('stone');
    expect(context.createBufferSource).not.toHaveBeenCalled();
});
test('muted gestures do not prepare audio; unavailable audio fails quietly', () => {
    const {manager, listeners, window} = setup();
    manager.enabled = false;
    listeners.keydown();
    expect(manager.footstepContext).toBeUndefined();
    manager.enabled = true;
    delete window.Howler;
    expect(() => listeners.pointerdown()).not.toThrow();
    expect(() => manager.playFootstep('ground')).not.toThrow();
});

const fs = require('fs');
const vm = require('vm');

function setup() {
    const listeners = new Map();
    const media = [];
    const document = {
        hidden: false,
        addEventListener: (event, callback) => {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event).add(callback);
        },
        removeEventListener: (event, callback) => listeners.get(event)?.delete(callback),
        createElement: () => {
            const sound = {
                paused: true, ended: false, readyState: 4, currentTime: 0, error: null,
                listeners: {}, load: jest.fn(), removeAttribute: jest.fn(),
                addEventListener: (event, callback) => {sound.listeners[event] = callback;},
                removeEventListener: (event, callback) => {
                    if (sound.listeners[event] === callback) delete sound.listeners[event];
                },
                play: jest.fn(() => {sound.paused = false; return Promise.resolve();}),
                pause: jest.fn(() => {sound.paused = true;}),
            };
            media.push(sound);
            return sound;
        },
    };
    const sandbox = {document, define: factory => {sandbox.MusicPlayer = factory();}};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./lib/class'), 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('./musicplayer'), 'utf8'), sandbox);
    const player = new sandbox.MusicPlayer();
    const dispatch = event => listeners.get(event)?.forEach(callback => callback());
    return {player, document, media, listeners, dispatch};
}

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
    return {promise, resolve, reject};
}

test.each(['click', 'touchend', 'keydown'])('a rejected play promise retries directly on %s', async event => {
    const {player, dispatch} = setup();
    const sound = player.getSound();
    sound.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    player.play('radio.mp3');
    await Promise.resolve();
    expect(player.pending).toBeNull();
    expect(sound.paused).toBe(true);
    dispatch(event);
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(sound.paused).toBe(false);
});

test('a synchronous play error can also retry on the next interaction', () => {
    const {player, dispatch} = setup();
    const sound = player.getSound();
    sound.play.mockImplementationOnce(() => {throw new Error('NotAllowedError');});
    player.play('radio.mp3');
    dispatch('click');
    expect(sound.play).toHaveBeenCalledTimes(2);
});

test('readiness does not queue duplicate play calls while an attempt is pending', async () => {
    const {player, dispatch} = setup();
    const sound = player.getSound();
    const request = deferred();
    sound.play.mockReturnValueOnce(request.promise);
    player.play('radio.mp3');
    dispatch('click');
    sound.listeners.canplay();
    expect(sound.play).toHaveBeenCalledTimes(1);
    request.reject(new Error('NotAllowedError'));
    await Promise.resolve();
    dispatch('keydown');
    expect(sound.play).toHaveBeenCalledTimes(2);
});

test('switching tracks reuses one element and an old promise cannot clear the new pending attempt', async () => {
    const {player, media, dispatch} = setup();
    const sound = player.getSound();
    const first = deferred(), second = deferred();
    sound.play.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    player.play('first.mp3');
    player.play('second.mp3');
    const pending = player.pending;
    first.reject(new Error('AbortError'));
    await Promise.resolve();
    dispatch('click');
    expect(player.pending).toBe(pending);
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(media).toHaveLength(1);
    expect(sound.src).toBe('second.mp3');
    second.reject(new Error('NotAllowedError'));
    await Promise.resolve();
    dispatch('click');
    expect(sound.play).toHaveBeenCalledTimes(3);
});

test('stopped tracks cannot restart from late rejection, readiness, or gestures', async () => {
    const {player, dispatch} = setup();
    const sound = player.getSound();
    const request = deferred();
    sound.play.mockReturnValueOnce(request.promise);
    player.play('radio.mp3');
    player.stop();
    request.reject(new Error('AbortError'));
    await Promise.resolve();
    sound.listeners.canplay();
    dispatch('touchend');
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(sound.paused).toBe(true);
});

test('a track paused by the browser resumes when the page becomes visible', async () => {
    const {player, document, dispatch} = setup();
    player.play('radio.mp3');
    const sound = player.sound;
    await Promise.resolve();
    sound.paused = true;
    document.hidden = true;
    dispatch('visibilitychange');
    expect(sound.play).toHaveBeenCalledTimes(1);
    document.hidden = false;
    dispatch('visibilitychange');
    expect(sound.play).toHaveBeenCalledTimes(2);
});

test('media errors can reload on interaction and browsers without play promises remain supported', () => {
    const {player, dispatch} = setup();
    const sound = player.getSound();
    sound.play.mockImplementation(() => undefined);
    player.play('radio.mp3');
    sound.error = {code: 2};
    dispatch('click');
    expect(sound.load).toHaveBeenCalledTimes(2);
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(player.pending).toBeNull();
});

test('destroy removes listeners and releases the media source', () => {
    const {player, listeners, dispatch} = setup();
    player.play('radio.mp3');
    const sound = player.sound;
    player.destroy();
    dispatch('click');
    for (const callbacks of listeners.values()) expect(callbacks.size).toBe(0);
    expect(sound.listeners.canplay).toBeUndefined();
    expect(sound.paused).toBe(true);
    expect(sound.removeAttribute).toHaveBeenCalledWith('src');
});

test('media becoming ready can retry an earlier failed playback attempt', async () => {
    const {player} = setup();
    const sound = player.getSound();
    sound.readyState = 0;
    sound.play.mockRejectedValueOnce(new Error('NotSupportedError'));
    player.play('radio.mp3');
    await Promise.resolve();
    sound.readyState = 4;
    sound.listeners.canplay();
    expect(sound.play).toHaveBeenCalledTimes(2);
    expect(sound.paused).toBe(false);
});

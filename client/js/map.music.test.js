const fs = require('fs');
const vm = require('vm');

function setup() {
    let definition;
    const requests = [], failures = [], intervals = new Map();
    const axios = {post: jest.fn(() => new Promise((resolve, reject) => {
        requests.push(resolve);
        failures.push(reject);
    }))};
    const sandbox = {
        Class: {extend: value => value}, define: (names, factory) => {definition = factory();},
        axios, console: {log: jest.fn()},
        setInterval: callback => {const id = intervals.size + 1; intervals.set(id, callback); return id;},
        clearInterval: jest.fn(id => intervals.delete(id)),
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./map'), 'utf8'), sandbox);
    let enabled = true;
    const settings = {getStreamMusicEnabled: () => enabled};
    const audio = {playStreamMusic: jest.fn()};
    const game = {app: {settings}, audioManager: audio};
    const map = Object.assign(Object.create(definition), {mapId: 'first', game});
    game.map = map;
    return {map, game, audio, requests, failures, intervals, axios, sandbox, setEnabled: value => {enabled = value;}};
}

test('map streams start on a successful poll without relying on mouse movement', async () => {
    const {map, requests, audio, axios} = setup();
    map._initStreamCheck();
    expect(axios.post).toHaveBeenCalledWith('/music', {map: 'first'}, {timeout: 10000});
    requests[0]({data: 'radio.mp3'});
    await Promise.resolve();
    expect(audio.playStreamMusic).toHaveBeenCalledWith('radio.mp3');
});

test.each([undefined, null, [], '', 'null', '  '])('an empty stream response stops the previous track: %j', async data => {
    const {map, audio, requests, intervals} = setup();
    map._initStreamCheck();
    requests[0]({data: 'old.mp3'});
    for (let index = 0; index < 5; index++) await Promise.resolve();
    expect(audio.playStreamMusic).toHaveBeenLastCalledWith('old.mp3');
    [...intervals.values()][0]();
    requests[1]({data});
    await Promise.resolve();
    expect(audio.playStreamMusic).toHaveBeenLastCalledWith(null);
});

test('the stream setting takes effect immediately and can reuse the last requested URL', () => {
    const {map, audio, setEnabled} = setup();
    map.streamMusicURL = 'radio.mp3';
    setEnabled(false);
    map.updateStreamMusic();
    expect(audio.playStreamMusic).toHaveBeenLastCalledWith(null);
    setEnabled(true);
    map.updateStreamMusic();
    expect(audio.playStreamMusic).toHaveBeenLastCalledWith('radio.mp3');
});

test('an old map or stopped poll cannot restart music after navigation', async () => {
    const {map, game, requests, audio, intervals} = setup();
    map._initStreamCheck();
    map.stopStreamCheck();
    game.map = {mapId: 'second'};
    requests[0]({data: 'old.mp3'});
    await Promise.resolve();
    expect(intervals.size).toBe(0);
    expect(audio.playStreamMusic).not.toHaveBeenCalled();
});

test('slow polls cannot overlap or starve a valid music response', async () => {
    const {map, requests, intervals, audio, axios} = setup();
    map._initStreamCheck();
    [...intervals.values()][0]();
    [...intervals.values()][0]();
    expect(axios.post).toHaveBeenCalledTimes(1);
    requests[0]({data: 'new.mp3'});
    for (let index = 0; index < 5; index++) await Promise.resolve();
    expect(audio.playStreamMusic).toHaveBeenLastCalledWith('new.mp3');
    [...intervals.values()][0]();
    expect(axios.post).toHaveBeenCalledTimes(2);
});

test('initializing polling twice clears the previous timer and invalidates its response', async () => {
    const {map, requests, intervals, audio} = setup();
    map._initStreamCheck();
    map._initStreamCheck();
    requests[0]({data: 'old.mp3'});
    await Promise.resolve();
    expect(intervals.size).toBe(1);
    expect(audio.playStreamMusic).not.toHaveBeenCalled();
});

test('stream polling can precede audio initialization', async () => {
    const {map, game, requests, audio} = setup();
    game.audioManager = null;
    map._initStreamCheck();
    requests[0]({data: 'radio.mp3'});
    await Promise.resolve();
    game.audioManager = audio;
    map.updateStreamMusic();
    expect(audio.playStreamMusic).toHaveBeenCalledWith('radio.mp3');
});

test('failed or timed-out polls keep the last track and allow the next poll to recover', async () => {
    const {map, failures, requests, intervals, audio} = setup();
    map.streamMusicURL = 'old.mp3';
    map._initStreamCheck();
    failures[0](new Error('timeout'));
    for (let index = 0; index < 8; index++) await Promise.resolve();
    expect(map.streamMusicURL).toBe('old.mp3');
    [...intervals.values()][0]();
    requests[1]({data: 'new.mp3'});
    await Promise.resolve();
    expect(audio.playStreamMusic).toHaveBeenLastCalledWith('new.mp3');
});

const fs = require('fs');
const vm = require('vm');

function setup() {
    const get = jest.fn();
    const exports = {};
    vm.runInNewContext(fs.readFileSync(require.resolve('./looperlandsplatformclient'), 'utf8'), {
        exports, process: {on: jest.fn()}, console,
        require: name => name === './localplaytest'
            ? {isLocalPlaytest: () => false}
            : {create: () => ({get})},
    });
    const platformClient = new exports.LooperLandsPlatformClient('test-key', 'https://example.test');
    const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
    let handler;
    const warn = jest.fn();
    vm.runInNewContext(source.slice(
        source.indexOf('        app.post("/music",'),
        source.indexOf("        require('./localplaytestlauncher')")
    ), {platformClient, console: {warn}, app: {post: (path, callback) => {handler = callback;}}});
    const res = {status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn()};
    return {get, platformClient, handler, res, warn};
}

test('music route returns the platform response and bounds the upstream request', async () => {
    const {get, handler, res} = setup();
    get.mockResolvedValue({data: 'https://example.test/radio.mp3'});
    await handler({body: {map: 'map/one'}}, res);
    expect(get).toHaveBeenCalledWith('/api/maps/map%2Fone/music', {timeout: 5000});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('https://example.test/radio.mp3');
});

test.each([
    {code: 'ECONNRESET', request: {}},
    {code: 'ECONNABORTED', request: {}},
    {response: {status: 502}},
])('music failures return 503 and the next poll can recover: %j', async error => {
    const {get, handler, res, warn} = setup();
    get.mockRejectedValueOnce(error).mockResolvedValueOnce({data: 'radio.mp3'});
    await expect(handler({body: {map: 'one'}}, res)).resolves.toBeUndefined();
    expect(res.status).toHaveBeenLastCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({error: 'music_unavailable'});
    expect(warn).toHaveBeenCalledWith('Music platform request failed', error.code || 'request_failed', error.response?.status);
    expect(res.send).not.toHaveBeenCalled();
    await handler({body: {map: 'one'}}, res);
    expect(res.status).toHaveBeenLastCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('radio.mp3');
});

test('loadMusic preserves the upstream error for the caller', async () => {
    const {get, platformClient} = setup();
    const error = Object.assign(new Error('socket hang up'), {code: 'ECONNRESET', request: {}});
    get.mockRejectedValue(error);
    await expect(platformClient.loadMusic('one')).rejects.toBe(error);
});

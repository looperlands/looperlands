const http = require('http');
const access = require('./localdooraccess');
const keys = ['NODE_ENV', 'LOOPERLANDS_LOCAL_PLAYTEST', 'LOOPERLANDS_OWNERSHIP_BASE_URL', 'LOOPERLANDS_OWNERSHIP_API_KEY'];
let environment, server, requests, result, status;
beforeEach(async () => {
    environment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    requests = []; result = true; status = 200;
    server = http.createServer((req, res) => {
        requests.push({url: req.url, method: req.method, key: req.headers['x-api-key']});
        res.writeHead(status, {'Content-Type': 'application/json'}); res.end(JSON.stringify(result));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    Object.assign(process.env, {NODE_ENV: 'development', LOOPERLANDS_LOCAL_PLAYTEST: '1',
        LOOPERLANDS_OWNERSHIP_BASE_URL: `http://127.0.0.1:${server.address().port}`, LOOPERLANDS_OWNERSHIP_API_KEY: 'test-key'});
});
afterEach(async () => {
    await new Promise(resolve => server.close(resolve));
    for (const [key, value] of Object.entries(environment)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
});

test('real checks use read-only encoded NFT and collection requests and return both ownership decisions', async () => {
    await expect(access.checkOwnership('nft', '0x123', 'wallet', {localDoorAccess: 'live'})).resolves.toBe(true);
    result = false;
    await expect(access.checkOwnership('collection', 'Cobs Farm/a', 'wallet', {localDoorAccess: 'live'})).resolves.toBe(false);
    expect(requests).toEqual([
        {url: '/api/asset/nft/0x123/owns?wallet=wallet', method: 'GET', key: 'test-key'},
        {url: '/api/collection/Cobs%20Farm%2Fa/owns?wallet=wallet', method: 'GET', key: 'test-key'}
    ]);
    await expect(access.checkOwnership('nft', '0x123', 'wallet', {localDoorAccess: 'local'})).resolves.toBe(true);
    await expect(access.checkOwnership('nft', '0x123', 'wallet', {localDoorAccess: 'allow-all'})).resolves.toBe(true);
    expect(requests).toHaveLength(2);
});

test.each([[503, true], [200, 'false'], [200, {owns: true}]])('API failure or malformed response denies access (%s, %j)', async (code, body) => {
    status = code; result = body;
    await expect(access.checkOwnership('nft', '0x123', 'wallet', {localDoorAccess: 'live'})).rejects.toThrow('Access was denied');
});

test('live checks without credentials cannot fall back to local allowance', async () => {
    delete process.env.LOOPERLANDS_OWNERSHIP_API_KEY;
    await expect(access.checkOwnership('nft', 'x', 'wallet', {localDoorAccess: 'live'})).rejects.toThrow('not configured');
    expect(requests).toHaveLength(0);
});

test('allow-all belongs to one local session and cannot be enabled in production', () => {
    expect(access.allowAll({localDoorAccess: 'allow-all'})).toBe(true);
    expect(access.allowAll({localDoorAccess: 'live'})).toBe(false);
    expect(access.allowAll({localDoorAccess: 'local'})).toBe(false);
    process.env.NODE_ENV = 'production';
    expect(access.allowAll({localDoorAccess: 'allow-all'})).toBe(false);
});

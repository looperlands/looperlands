const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

jest.mock('axios');
jest.mock('alchemy-sdk', () => ({Network: {ETH_MAINNET: 'eth-mainnet'}, Alchemy: jest.fn()}));
// The legacy game-types module assigns its namespace on the global object.
global.Types = {};

const wallet = '0x1e8ab2cc09be581530bb9f3ac94353f6f7412239';
const avatar = '0xb69e3e44f58d5399faad29b94108a88dbed79e6a14c676fb202e817ac5697560';
const environmentKeys = ['NODE_ENV', 'LOOPERLANDS_LOCAL_PLAYTEST', 'LOOPERLANDS_LOCAL_DATA_DIR'];
let originalEnvironment;
let fixture;

beforeEach(() => {
    jest.resetModules();
    originalEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-local-boundary-'));
    process.env.LOOPERLANDS_LOCAL_DATA_DIR = fixture;
    jest.spyOn(process, 'on').mockImplementation(() => process);
});

afterEach(() => {
    jest.restoreAllMocks();
    for (const [key, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    fs.rmSync(fixture, {recursive: true, force: true});
});

function environment(nodeEnv, flag) {
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
    if (flag === undefined) delete process.env.LOOPERLANDS_LOCAL_PLAYTEST;
    else process.env.LOOPERLANDS_LOCAL_PLAYTEST = flag;
}

function platform(...configuration) {
    const [apiKey, baseUrl] = configuration.length ? configuration : ['test-provider-key', 'https://platform.invalid'];
    const axios = require('axios');
    const http = {get: jest.fn().mockResolvedValue({data: false})};
    axios.create.mockReturnValue(http);
    const {LooperLandsPlatformClient} = require('./looperlandsplatformclient');
    return {client: new LooperLandsPlatformClient(apiKey, baseUrl), axios, http};
}

test.each([
    ['production', '1'], ['test', '1'], [undefined, '1'],
    ['development', undefined], ['development', '0'], ['development', 'true']
])('ownership stays with the provider for NODE_ENV=%s and local flag=%s', async (nodeEnv, flag) => {
    environment(nodeEnv, flag);
    expect(require('./localplaytest').isLocalPlaytest()).toBe(false);
    const {client, axios, http} = platform();
    await expect(client.checkOwnership(avatar, wallet)).resolves.toBe(false);
    await expect(client.checkOwnershipOfCollection('Cobs Farm', wallet)).resolves.toBe(false);
    expect(axios.create).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith(`/api/asset/nft/${avatar}/owns?wallet=${wallet}`);
    expect(http.get).toHaveBeenCalledWith(`/api/collection/Cobs Farm/owns?wallet=${wallet}`);
});

test('explicit local development accepts the mapmaker identity without credentials or HTTP', async () => {
    environment('development', '1');
    expect(require('./localplaytest').isLocalPlaytest()).toBe(true);
    const {client, axios, http} = platform(undefined, undefined);
    await expect(client.checkOwnership(avatar, wallet)).resolves.toBe(true);
    await expect(client.checkOwnershipOfCollection('Cobs Farm', wallet)).resolves.toBe(true);
    expect(axios.create).not.toHaveBeenCalled();
    expect(http.get).not.toHaveBeenCalled();
});

test('local mode does not contact configured live Platform credentials', async () => {
    environment('development', '1');
    const {client, axios} = platform();
    await expect(client.checkOwnership(avatar, wallet)).resolves.toBe(true);
    expect(axios.create).not.toHaveBeenCalled();
});

test('local player names avoid external ENS requests', async () => {
    environment('development', '1');
    const axios = require('axios');
    const ens = require('./ens');
    await expect(ens.getEnsName(wallet)).resolves.toBeNull();
    expect(typeof await ens.getEns(wallet)).toBe('string');
    expect(axios.get).not.toHaveBeenCalled();
});

test('production still resolves ENS when the local flag is set', async () => {
    environment('production', '1');
    const axios = require('axios');
    axios.get.mockResolvedValue({data: {data: 'mapmaker.eth'}});
    await expect(require('./ens').getEnsName(wallet)).resolves.toBe('mapmaker.eth');
    expect(axios.get).toHaveBeenCalledWith(
        `https://api3.loopring.io/api/wallet/v3/resolveName?owner=${wallet}`, {timeout: 1500}
    );
});

test('local ownership allowance does not bypass the session API key', async () => {
    const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
    let createSession;
    const dao = {walletHasNFT: jest.fn().mockResolvedValue(true)};
    vm.runInNewContext(source.slice(
        source.indexOf('        async function newSession('),
        source.indexOf("        app.post('/session/:sessionId/teleport'")
    ), {
        app: {post: (route, handler) => {createSession = handler;}}, dao,
        process: {env: {NODE_ENV: 'development', LOOPERLANDS_LOCAL_PLAYTEST: '1', LOOPWORMS_API_KEY: 'local-key'}},
        console: {error: jest.fn()}
    });
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn()};
    await createSession({headers: {'x-api-key': 'wrong-key'}, body: {
        walletId: wallet, nftId: avatar, mapId: 'm88n2', checkpointId: '1', xp: 1000000
    }}, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({error: 'invalid api key'}));
    expect(dao.walletHasNFT).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
});

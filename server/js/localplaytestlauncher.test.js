const express = require('express');
const fs = require('fs');
const vm = require('vm');

// The legacy game-types module assigns its namespace on the global object.
global.Types = {};
const {installLocalLauncher, experienceAtLevel, buildCatalog} = require('./localplaytestlauncher');

const wallet = '0x1e8ab2cc09be581530bb9f3ac94353f6f7412239';
const avatar = '0xb69e3e44f58d5399faad29b94108a88dbed79e6a14c676fb202e817ac5697560';
const weapon = '0x82e68ef0bee270d142ae3ec162490c0fa2e88a273bb768687f2fee4f6930c741';
const apiKey = 'test-private-local-key';
const sessionId = 'c'.repeat(40);
const catalog = {
    items: [{id: '100', key: 'wood', name: 'Wood'}],
    quests: [{id: 'test-quest', name: 'Test quest'}],
    maps: [{id: 'm88n2', name: 'M88N2', checkpoints: [{id: 1, x: 2, y: 3, starting: true}]}],
    avatars: [{id: avatar, nftId: avatar, name: 'Test avatar', sprite: 'NFT_test-avatar'}],
    weapons: [
        {id: 'sword1', nftId: null, name: 'Basic sword', sprite: 'sword1', fixedLevel: 0},
        {id: weapon, nftId: weapon, name: 'Test weapon', sprite: 'NFT_test-weapon'}
    ],
    traits: ['fighter', 'ranger', 'tank', 'rogue'], maxLevel: 9999,
    defaults: {mapId: 'm88n2', checkpointId: 1, walletId: wallet, nftId: avatar, level: 1,
        weaponId: 'sword1', weaponLevel: 0, trait: 'fighter', title: ''}
};
const validSettings = {mapId: 'm88n2', checkpointId: 1, walletId: wallet, nftId: avatar,
    level: 12, weaponId: weapon, weaponLevel: 7, trait: 'ranger', title: 'Mapmaker'};
const environmentKeys = ['NODE_ENV', 'LOOPERLANDS_LOCAL_PLAYTEST', 'LOOPERLANDS_OWNERSHIP_BASE_URL', 'LOOPERLANDS_OWNERSHIP_API_KEY'];
let environment, server, baseUrl, platform, createSession, world;

beforeEach(() => {
    environment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
    process.env.NODE_ENV = 'development';
    process.env.LOOPERLANDS_LOCAL_PLAYTEST = '1';
    platform = {localPlaytest: true, prepareSession: jest.fn().mockResolvedValue(undefined),
        equip: jest.fn().mockResolvedValue({success: true}), setPlayerTitle: jest.fn().mockResolvedValue({})};
    createSession = jest.fn((req, res) => res.status(200).send({sessionId}));
    world = {isValidPosition: jest.fn((x, y) => x === 4 && y === 5)};
});

afterEach(async () => {
    if (server) {
        const running = server;
        server = undefined;
        await new Promise((resolve, reject) => running.close(error => error ? reject(error) : resolve()));
    }
    for (const [key, value] of Object.entries(environment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

async function start(testCatalog = catalog) {
    const app = express();
    app.use(express.json());
    server = await new Promise(resolve => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    const installed = installLocalLauncher(app, {worlds: () => ({m88n2: world}), platform, createSession,
        appUrl: baseUrl, apiKey, catalog: testCatalog});
    return installed;
}

function post(settings = validSettings, headers = {}) {
    return fetch(baseUrl + '/local/api/session', {method: 'POST',
        headers: {'Content-Type': 'application/json', ...headers}, body: JSON.stringify(settings)});
}

test.each([
    ['production', '1'], ['test', '1'], ['development', 'true'], ['development', '0']
])('the launcher is absent for NODE_ENV=%s and local flag=%s', async (nodeEnv, flag) => {
    process.env.NODE_ENV = nodeEnv;
    process.env.LOOPERLANDS_LOCAL_PLAYTEST = flag;
    expect(await start()).toBe(false);
    expect((await fetch(baseUrl + '/local/')).status).toBe(404);
    expect((await fetch(baseUrl + '/local/api/catalog')).status).toBe(404);
    expect((await post()).status).toBe(404);
    expect(platform.prepareSession).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
});

test('local development serves a browser launcher and a catalog without exposing its API key', async () => {
    expect(await start()).not.toBe(false);
    const page = await fetch(baseUrl + '/local/');
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toMatch(/<html/i);
    expect(html).not.toContain(apiKey);
    const response = await fetch(baseUrl + '/local/api/catalog');
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject(catalog);
    expect(JSON.stringify(json)).not.toContain(apiKey);
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))(?:["'])/g)) {
        const asset = await fetch(new URL(match[1], baseUrl + '/local/'));
        expect(asset.status).toBe(200);
        expect(await asset.text()).not.toContain(apiKey);
    }
});

test('selected settings create a fresh session using the server-held API key and local equipment state', async () => {
    await start();
    const response = await post({...validSettings, x: 4, y: 5, xp: 999, f2p: true}, {Origin: baseUrl});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({sessionId,
        url: expect.stringMatching(/\/\?sessionId=c{40}$/)});
    expect(createSession).toHaveBeenCalledTimes(1);
    const [request] = createSession.mock.calls[0];
    expect(request.headers['x-api-key']).toBe(apiKey);
    expect(request.body).toMatchObject({walletId: wallet, nftId: avatar, mapId: 'm88n2', checkpointId: '1',
        xp: experienceAtLevel(12), weapon, trait: 'ranger', title: 'Mapmaker', f2p: false, x: 4, y: 5});
    expect(platform.prepareSession).toHaveBeenCalledWith(expect.objectContaining({walletId: wallet,
        nftId: weapon, xp: experienceAtLevel(7)}));
    expect(platform.equip).toHaveBeenCalledWith(wallet, avatar, weapon);
    expect(world.isValidPosition).toHaveBeenCalledWith(4, 5);
});

test('a basic sword can start a session without creating an NFT weapon', async () => {
    await start();
    const response = await post({...validSettings, weaponId: 'sword1', weaponLevel: 0});
    expect(response.status).toBe(200);
    expect(createSession.mock.calls[0][0].body.weapon).toBe('sword1');
    expect(platform.prepareSession.mock.calls.some(([settings]) => settings.nftId === 'sword1')).toBe(false);
});

test.each(['local', 'allow-all', 'live'])('door mode %s and selected starting progress reach the new session', async localDoorAccess => {
    process.env.LOOPERLANDS_OWNERSHIP_BASE_URL = 'https://example.invalid';
    process.env.LOOPERLANDS_OWNERSHIP_API_KEY = 'server-secret';
    await start();
    const response = await post({...validSettings, localDoorAccess,
        startingInventory: [{item: '100', amount: 12}], finishedQuests: ['test-quest']});
    expect(response.status).toBe(200);
    expect(createSession.mock.calls[0][0].body).toMatchObject({localDoorAccess,
        startingInventory: [{item: '100', amount: 12}], finishedQuests: ['test-quest']});
    const json = await (await fetch(baseUrl + '/local/api/catalog')).json();
    expect(json.liveOwnershipAvailable).toBe(true);
    expect(JSON.stringify(json)).not.toContain('server-secret');
});

test('live checks without server configuration are rejected before modifying progress', async () => {
    delete process.env.LOOPERLANDS_OWNERSHIP_BASE_URL;
    delete process.env.LOOPERLANDS_OWNERSHIP_API_KEY;
    await start();
    expect((await post({...validSettings, localDoorAccess: 'live'})).status).toBe(400);
    expect(platform.prepareSession).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
});

test.each([
    ['invalid access mode', {localDoorAccess: 'anything'}],
    ['unknown starting item', {startingInventory: [{item: '99999', amount: 1}]}],
    ['negative item amount', {startingInventory: [{item: '100', amount: -1}]}],
    ['fractional item amount', {startingInventory: [{item: '100', amount: 1.5}]}],
    ['duplicate items', {startingInventory: [{item: '100', amount: 1}, {item: '100', amount: 2}]}],
    ['unknown finished quest', {finishedQuests: ['missing']}],
    ['duplicate quests', {finishedQuests: ['test-quest', 'test-quest']}],
    ['unknown map', {mapId: 'not-a-map'}],
    ['unknown checkpoint', {checkpointId: 99}],
    ['unknown avatar', {nftId: '0x' + 'f'.repeat(64)}],
    ['invalid wallet', {walletId: 'mapmaker'}],
    ['short wallet', {walletId: '0x1234'}],
    ['unknown weapon', {weaponId: 'unknown'}],
    ['custom level on a bundled weapon', {weaponId: 'sword1', weaponLevel: 8}],
    ['unknown trait', {trait: 'superhero'}],
    ['blank player name', {title: ''}],
    ['too long player name', {title: 'a'.repeat(25)}],
    ['HTML player name', {title: '<b>Mapmaker</b>'}],
    ['zero avatar level', {level: 0}],
    ['too high avatar level', {level: 10000}],
    ['fractional avatar level', {level: 1.5}],
    ['non-numeric avatar level', {level: 'abc'}],
    ['zero weapon level', {weaponLevel: 0}],
    ['too high weapon level', {weaponLevel: 10000}],
    ['fractional weapon level', {weaponLevel: 1.5}],
    ['only x coordinate', {x: 4}],
    ['only y coordinate', {y: 5}],
    ['fractional coordinate', {x: 4.5, y: 5}],
    ['blocked position', {x: 99, y: 99}]
])('%s is rejected before changing local progress', async (description, changes) => {
    await start();
    const response = await post({...validSettings, ...changes});
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({error: expect.any(String)}));
    expect(platform.prepareSession).not.toHaveBeenCalled();
    expect(platform.equip).not.toHaveBeenCalled();
    expect(platform.setPlayerTitle).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
});

test('a cross-origin page cannot change local playtest progress', async () => {
    await start();
    const response = await post(validSettings, {Origin: 'https://unrelated.example'});
    expect(response.status).toBe(403);
    expect(platform.prepareSession).not.toHaveBeenCalled();
    expect(platform.equip).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
});

test('a browser form submission is rejected before changing local playtest progress', async () => {
    await start();
    const response = await fetch(baseUrl + '/local/api/session', {method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'mapId=m88n2'});
    expect(response.status).toBe(415);
    expect(platform.prepareSession).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
});

test('a meaningful session error reaches the launcher instead of an invalid game URL', async () => {
    createSession.mockImplementation((req, res) => res.status(503).json({status: false, error: 'Server update is in progress'}));
    await start();
    const response = await post();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe('Server update is in progress');
    expect(body.url).toBeUndefined();
});

test('a missing session ID cannot become a successful launch URL', async () => {
    createSession.mockImplementation((req, res) => res.status(200).json({sessionId: null}));
    await start();
    const response = await post();
    expect(response.status).toBeGreaterThanOrEqual(400);
    const body = await response.json();
    expect(body.error).toEqual(expect.any(String));
    expect(body.url).toBeUndefined();
});

test.each([1, 2, 12, 9999])('the XP preset produces level %i using the actual game formula', level => {
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./formulas'), 'utf8'), {
        module, exports: module.exports, process: {env: {}},
        require: name => name === 'node-cron' ? {schedule: () => {}} : {}
    });
    const xp = experienceAtLevel(level);
    expect(Number.isSafeInteger(xp)).toBe(true);
    expect(module.exports.level(xp)).toBe(level);
});


test('the catalog includes only loaded maps and bundled assets for the known mapmaker avatar', () => {
    const generated = buildCatalog({
        m88n2: {map: {isLoaded: true, width: 10, height: 20,
            checkpoints: {1: {id: 1, x: 2, y: 3}}, startingAreas: [{id: 1}]}},
        loading: {map: {isLoaded: false}}
    });
    expect(generated.maps).toEqual([{id: 'm88n2', name: 'm88n2', width: 10, height: 20,
        checkpoints: [{id: 1, x: 2, y: 3, starting: true}]}]);
    expect(generated.avatars).toContainEqual(expect.objectContaining({nftId: avatar}));
    expect(generated.weapons).toContainEqual(expect.objectContaining({id: 'sword1', nftId: null, fixedLevel: 0}));
    expect(generated.defaults).toMatchObject({mapId: 'm88n2', nftId: avatar, weaponId: 'sword1'});
});

test('loading maps return a useful error and the catalog recovers when maps become available', async () => {
    const loadingCatalog = {...catalog, maps: []};
    await start(loadingCatalog);
    const initial = await fetch(baseUrl + '/local/api/catalog');
    expect(initial.status).toBe(503);
    expect(await initial.json()).toEqual({error: expect.any(String)});
    loadingCatalog.maps = catalog.maps;
    const ready = await fetch(baseUrl + '/local/api/catalog');
    expect(ready.status).toBe(200);
    expect((await ready.json()).maps).toEqual(catalog.maps);
});

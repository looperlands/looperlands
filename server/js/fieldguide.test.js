const fs = require('fs');
const os = require('os');
const path = require('path');
global.Types = {};
const Types = require('../../shared/js/gametypes');
const Lakes = require('./lakes');
const {FieldGuide} = require('./fieldguide');
const {FieldGuideStore} = require('./fieldguidestore');
const {project, validateCatalog, loadCatalog, flag, visitFlag} = require('./fieldguidecatalog');

const item = {id: 'ore', category: 'items', target: 'ore', sprite: 'item-ore', name: 'Ore', hint: 'Look near the mine.', completion: 'obtain', visibility: 'unknown'};
const fish = {...item, id: 'guppy', category: 'fish', target: 'cobguppy', sprite: 'cobguppy', name: 'Guppy', completion: 'catch'};
const mob = {...item, id: 'rat', category: 'monsters', target: 'rat', sprite: 'rat', name: 'Rat', completion: 'defeat'};
const secret = {...mob, id: 'boss', target: 'boss', name: 'Secret boss', visibility: 'secret'};
const excluded = {...mob, id: 'internal', visibility: 'excluded'};
const collection = {edition: '1', entries: [item, fish, mob, secret, excluded]};
let directory, store, client, sessions, player, guide, session;
beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-field-guide-'));
    client = {recordFieldGuide: jest.fn((nftId, facts) => Promise.resolve({accepted: facts})), getFieldGuide: jest.fn().mockResolvedValue([])};
    store = new FieldGuideStore(client, {file: path.join(directory, 'outbox.json'), timer: false});
    player = {id: 1, sessionId: 'session', nftId: 'avatar', walletId: 'wallet', mapId: 'main', hasEnteredGame: true, isBot: () => false, send: jest.fn()};
    session = {entityId: 1, nftId: 'avatar', walletId: 'wallet', mapId: 'main', gameData: {choices: [], fieldGuide: [], items: {}, mobKills: {}}};
    sessions = new Map([['session', session]]);
    guide = new FieldGuide(sessions, () => ({main: {getPlayerById: id => id === 1 ? player : null}}), client, {store, catalog: {version: 1, maps: {main: collection, unvisited: collection}}});
});
afterEach(() => {clearInterval(store.timer); fs.rmSync(directory, {recursive: true, force: true});});
const response = () => ({statusCode: 200, status(code) {this.statusCode = code; return this;}, json(body) {this.body = body; return this;}, set: jest.fn()});
const request = map => ({params: {sessionId: 'session'}, query: map ? {map} : {}});

test('published starter catalog validates real kinds, fish and available sprite assets', () => {
    const catalog = loadCatalog(Types, Lakes);
    for (const map of Object.values(catalog.maps)) for (const entry of map.entries) {
        expect(fs.existsSync(path.join(__dirname, '../../client/img/1', entry.sprite + '.png'))).toBe(true);
        expect(fs.existsSync(path.join(__dirname, '../../client/sprites', entry.sprite + '.json'))).toBe(true);
    }
});
test.each([
    {...item, id: undefined}, {...item, category: 'weapons'}, {...item, completion: 'catch'},
    {...fish, target: 'missing'}, {...item, sprite: '../private'}, {...item, visibility: 'maybe'}
])('invalid catalog entry is rejected', entry => {
    expect(() => validateCatalog({version: 1, maps: {main: {edition: '1', entries: [entry]}}}, Types, Lakes)).toThrow();
});
test('unknowns expose neither names nor runtime keys and secrets/excluded entries have no placeholders or totals', () => {
    const result = project(collection, new Set());
    expect(result.totals).toEqual({total: 3, discovered: 0, completed: 0});
    expect(result.entries).toHaveLength(3);
    expect(result.entries.every(entry => entry.name === null && entry.sprite === null)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/Secret boss|cobguppy|item-ore|internal/);
    expect(new Set(result.entries.map(entry => entry.id)).size).toBe(3);
});
test('secret reveal and completion leave the standard denominator unchanged', () => {
    const facts = new Set([flag('boss', 'completed')]);
    const result = project(collection, facts);
    expect(result.totals).toEqual({total: 3, discovered: 0, completed: 0});
    expect(result.bonusDiscoveries).toBe(1);
    expect(result.entries.at(-1)).toMatchObject({name: 'Secret boss', state: 'completed', bonus: true});
});
test('encounter and defeat are distinct, repeat events do not rewrite facts or notify twice', async () => {
    await guide.record(player, 'encounter', Types.Entities.RAT);
    expect(guide.facts(session).has(flag('rat', 'discovered'))).toBe(true);
    expect(guide.facts(session).has(flag('rat', 'completed'))).toBe(false);
    await guide.record(player, 'defeat', Types.Entities.RAT);
    await guide.record(player, 'defeat', Types.Entities.RAT);
    expect(guide.facts(session).has(flag('rat', 'completed'))).toBe(true);
    expect(player.send).toHaveBeenCalledTimes(2);
});
test('gifts reveal fish without proving a catch and a catch both reveals and completes it', async () => {
    await guide.record(player, 'obtain', 'cobguppy');
    expect(guide.facts(session).has(flag('guppy', 'completed'))).toBe(false);
    await guide.record(player, 'catch', 'cobguppy', 2);
    expect(guide.facts(session).has(flag('guppy', 'completed'))).toBe(true);
    expect(player.send.mock.calls.at(-1)[0][1]).toContain('caught');
});
test('purchases cannot satisfy combat-loot requirements and negative inventory changes cannot discover anything', async () => {
    guide.entries = [{...item, completion: 'loot'}];
    guide.byTarget.set(String(Types.Entities.ORE), new Set(guide.entries));
    await guide.record(player, 'obtain', Types.Entities.ORE);
    expect(guide.facts(session).has(flag('ore', 'completed'))).toBe(false);
    await guide.record(player, 'loot', Types.Entities.ORE, -1);
    expect(guide.facts(session).has(flag('ore', 'completed'))).toBe(false);
    await guide.record(player, 'loot', Types.Entities.ORE);
    expect(guide.facts(session).has(flag('ore', 'completed'))).toBe(true);
});
test('backfill preserves sold items and uses kills, but never invents catches', async () => {
    session.gameData.items = {[Types.Entities.ORE]: 1, cobguppy: 1};
    session.gameData.mobKills = {[Types.Entities.RAT]: 2};
    await guide.reconcile(player);
    session.gameData.items = {};
    await guide.reconcile(player);
    const facts = guide.facts(session);
    expect(facts.has(flag('ore', 'completed'))).toBe(true);
    expect(facts.has(flag('rat', 'completed'))).toBe(true);
    expect(facts.has(flag('guppy', 'discovered'))).toBe(true);
    expect(facts.has(flag('guppy', 'completed'))).toBe(false);
    expect(player.send).not.toHaveBeenCalled();
});
test('durable retry survives restart and a missing platform acknowledgment retains the fact', async () => {
    await guide.record(player, 'catch', 'cobguppy');
    client.recordFieldGuide.mockResolvedValue(undefined);
    await store.flush();
    const restarted = new FieldGuideStore(client, {file: store.file, timer: false});
    expect(restarted.facts('avatar')).toContain(flag('guppy', 'completed'));
    client.recordFieldGuide.mockImplementation((nftId, facts) => Promise.resolve({accepted: facts}));
    await restarted.flush();
    expect(JSON.parse(fs.readFileSync(store.file, 'utf8'))).toEqual([]);
    expect(client.recordFieldGuide).toHaveBeenCalledWith('avatar', [flag('guppy', 'completed')]);
});
test('a reconnect before pending writes flush still receives acknowledged facts in its new cache', async () => {
    await guide.record(player, 'catch', 'cobguppy');
    session.gameData.fieldGuide = [];
    await store.flush();
    expect(session.gameData.fieldGuide).toContain(flag('guppy', 'completed'));
});
test('earned facts survive disconnection during the disk write', async () => {
    const pending = guide.record(player, 'catch', 'cobguppy');
    sessions.delete('session');
    await pending;
    expect(store.facts('avatar')).toContain(flag('guppy', 'completed'));
    expect(player.send).not.toHaveBeenCalled();
});
test('concurrent progress merges the latest unrelated quest and inventory changes', async () => {
    const write = store.add.bind(store);
    store.add = async (...args) => {
        await write(...args);
        sessions.set('session', {...session, gameData: {...session.gameData, choices: ['quest-progress:other'], items: {123: 8}}});
    };
    await guide.record(player, 'catch', 'cobguppy');
    expect(sessions.get('session').gameData.choices).toContain('quest-progress:other');
    expect(sessions.get('session').gameData.items).toEqual({123: 8});
});
test('list authenticates the live actor and refuses unvisited map payloads', async () => {
    const unvisited = response(); await guide.list(request('unvisited'), unvisited);
    expect(unvisited.statusCode).toBe(403);
    expect(unvisited.body.entries).toBeUndefined();
    const current = response(); await guide.list(request(), current);
    expect(current.statusCode).toBe(200);
    expect(current.body.maps).toEqual(['main']);
    expect(current.body.map).toBe('main');
    player.walletId = 'different';
    const invalid = response(); await guide.list(request(), invalid);
    expect(invalid.statusCode).toBe(401);
});
test('changing maps during reconciliation cannot return the previous map as current', async () => {
    guide.reconcile = async () => {player.mapId = 'other';};
    const res = response(); await guide.list(request(), res);
    expect(res.statusCode).toBe(409);
});
test('separate Loopers do not share facts and F2P never writes to platform storage', async () => {
    await guide.record(player, 'catch', 'cobguppy');
    const second = {...session, nftId: 'second', gameData: {fieldGuide: []}};
    expect(guide.facts(second).has(flag('guppy', 'completed'))).toBe(false);
    session.f2p = true; session.gameData.fieldGuide = [];
    guide.known.delete(player);
    expect(guide.facts(session).has(flag('guppy', 'completed'))).toBe(false);
    const add = jest.spyOn(store, 'add');
    await guide.record(player, 'catch', 'cobguppy');
    expect(add).not.toHaveBeenCalled();
    expect(session.gameData.fieldGuide).toContain(flag('guppy', 'completed'));
});
test('corrupt persistence returns an unavailable state without erasing the outbox', async () => {
    fs.writeFileSync(store.file, 'broken');
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const broken = new FieldGuideStore(client, {file: store.file, timer: false});
    guide.store = broken;
    const res = response(); await guide.list(request(), res);
    expect(res.statusCode).toBe(503);
    expect(fs.readFileSync(store.file, 'utf8')).toBe('broken');
    spy.mockRestore();
});
test('a legacy cache refresh cannot erase already acknowledged guide facts', async () => {
    await guide.record(player, 'catch', 'cobguppy');
    await store.flush();
    session.gameData = {choices: ['quest-progress:other'], items: {}, mobKills: {}};
    expect(guide.facts(session).has(flag('guppy', 'completed'))).toBe(true);
});
test('shutdown waits for accepted gameplay facts before draining the durable outbox', async () => {
    const recorded = guide.record(player, 'catch', 'cobguppy');
    await guide.close(); await recorded;
    expect(client.recordFieldGuide).toHaveBeenCalledWith('avatar', [flag('guppy', 'completed')]);
    expect(store.facts('avatar')).toEqual([]);
});

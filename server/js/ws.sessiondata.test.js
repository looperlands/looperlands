const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require.resolve('./ws'), 'utf8');

function route(path, data) {
    const start = source.indexOf(`        app.get('${path}'`);
    const doubleQuotedStart = source.indexOf(`        app.get("${path}"`);
    const offset = start < 0 ? doubleQuotedStart : start;
    const end = source.indexOf('\n        app.get(', offset + 1);
    let handler;
    const cache = {get: () => data, set: jest.fn()};
    const dao = {loadWeapon: jest.fn().mockResolvedValue('sword'), loadAvatarGameData: jest.fn()};
    const ens = {getEnsName: jest.fn().mockResolvedValue('name.eth'), getEns: jest.fn().mockResolvedValue('Player')};
    vm.runInNewContext(source.slice(offset, end), {
        app: {get: (url, fn) => {handler = fn;}}, cache, dao, ens,
        Types: {getKindFromString: () => 5}, require
    });
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    return {cache, dao, res, run: () => handler({params: {sessionId: 'session', itemId: 'gold', questId: 'test-quest'}}, res)};
}

test.each(['reject', 'undefined'])('failed session loading remains retryable: %s', async failure => {
    const data = {nftId: '0xavatar', walletId: 'wallet', isDirty: false};
    const r = route('/session/:sessionId', data);
    if (failure === 'reject') r.dao.loadAvatarGameData.mockRejectedValueOnce(new Error('offline'));
    else r.dao.loadAvatarGameData.mockResolvedValueOnce(undefined);
    await r.run();
    expect(r.res.status).toHaveBeenLastCalledWith(503);
    expect(r.cache.set).not.toHaveBeenCalled();
    expect(data.isDirty).toBe(false);
    expect(data.gameData).toBeUndefined();
    const gameData = {items: {5: 7}, quests: {}, mobKills: {}};
    r.dao.loadAvatarGameData.mockResolvedValue(gameData);
    await r.run();
    expect(r.res.status).toHaveBeenLastCalledWith(200);
    expect(data.gameData).toEqual(gameData);
    expect(data.isDirty).toBe(true);
});

test('free sessions initialize empty game data without a platform request', async () => {
    const data = {nftId: '0xavatar', walletId: 'wallet', f2p: true};
    const r = route('/session/:sessionId', data);
    await r.run();
    expect(r.res.status).toHaveBeenCalledWith(200);
    expect(r.dao.loadAvatarGameData).not.toHaveBeenCalled();
    expect(data.gameData).toEqual({items: {}, quests: {}, mobKills: {}, consumables: {}});
});

test.each([
    [undefined, 404, undefined],
    [{}, 503, undefined],
    [{gameData: {}}, 200, false],
    [{gameData: {items: {5: 7}}}, 200, true],
    [{gameData: {items: {5: 0}}}, 200, false],
    [{gameData: {items: {}}}, 200, false]
])('ownsItem handles session state %j', async (data, status, owns) => {
    const r = route('/session/:sessionId/ownsItem/:itemId', data);
    await r.run();
    expect(r.res.status).toHaveBeenCalledWith(status);
    if (owns !== undefined) expect(r.res.json).toHaveBeenCalledWith(owns);
});

test.each(['COMPLETED', 'FINISHED'])('quest doors accept %s quests from session data', async status => {
    const r = route('/session/:sessionId/completedQuest/:questId', {gameData: {quests: {[status]: [{questKey: 'test-quest'}]}}});
    await r.run();
    expect(r.res.json).toHaveBeenCalledWith(true);
});

test('missing quest progress denies access with a single response', async () => {
    const r = route('/session/:sessionId/completedQuest/:questId', {gameData: {}});
    await r.run();
    expect(r.res.json).toHaveBeenCalledTimes(1);
    expect(r.res.json).toHaveBeenCalledWith(false);
});

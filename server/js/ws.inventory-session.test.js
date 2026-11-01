const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require.resolve('./ws'), 'utf8');

function fixture(busyAtStart) {
    let busy = busyAtStart, createSession;
    const sessions = new Map([['old', {nftId: 'avatar', walletId: 'wallet', mapId: 'main', entityId: 1, isDirty: true}]]);
    const close = jest.fn(), cache = {get: id => sessions.get(id), keys: () => [...sessions.keys()],
        set: (id, data) => sessions.set(id, data), del: jest.fn(id => sessions.delete(id))};
    const platformClient = {prepareSession: jest.fn(async () => {busy = true;})};
    vm.runInNewContext(source.slice(source.indexOf('        async function newSession('),
        source.indexOf("        app.post('/session/:sessionId/teleport'")), {
        app: {post: (url, handler) => {createSession = handler;}}, cache,
        dao: {walletHasNFT: async () => true}, platformClient,
        inventoryExchanges: {isPending: () => busy}, self: {worldsMap: {main: {getPlayerById: () => ({connection: {close}})}}},
        Types: {getKindFromString: () => 1, isBot: () => false}, crypto: require('crypto'),
        process: {env: {LOOPWORMS_API_KEY: 'test-key'}}, console
    });
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn()};
    const run = () => createSession({body: {nftId: 'avatar', walletId: 'wallet', mapId: 'main', checkpointId: '1', xp: 1},
        headers: {'x-api-key': 'test-key'}}, res);
    return {sessions, cache, close, platformClient, res, run, settle: () => {busy = false; platformClient.prepareSession.mockImplementation(async () => {});}};
}

test.each([true, false])('reconnect cannot replace reserved session while an exchange is pending (already pending=%s)', async busyAtStart => {
    const f = fixture(busyAtStart); await f.run();
    expect(f.res.status).toHaveBeenLastCalledWith(503);
    expect(f.cache.del).not.toHaveBeenCalled();
    expect(f.close).not.toHaveBeenCalled();
    expect(f.sessions.has('old')).toBe(true);
    if (busyAtStart) expect(f.platformClient.prepareSession).not.toHaveBeenCalled();
    f.settle(); await f.run();
    expect(f.res.status).toHaveBeenLastCalledWith(200);
    expect(f.cache.del).toHaveBeenCalledWith('old');
    expect(f.close).toHaveBeenCalledTimes(1);
});

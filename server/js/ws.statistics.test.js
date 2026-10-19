const fs = require('fs'), vm = require('vm');
const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
function setup({tool = false, weapon = true, companion = true} = {}) {
    let route;
    const sessions = {one: {mapId: 'map', entityId: 1, nftId: 'avatar', xp: 1234, botSessionId: companion ? 'bot' : undefined},
        bot: {nftId: 'companion', xp: 5678, entityId: 2}};
    const player = {weapon: 'sprite-id', getNFTWeapon: () => weapon ? {nftId: 'nft-weapon'} : undefined};
    const world = {getPlayerById: () => player,
        getNFTWeaponStatistics: () => weapon ? {constructor: tool ? 'NFTSpecialItem' : 'NFTWeapon', experience: 3456} : undefined,
        getItemWeaponStatistics: () => ({currentLevel: 1})};
    const start = source.indexOf('        app.get("/session/:sessionId/statistics"');
    const end = source.indexOf('        app.get("/session/:sessionId/polling"', start);
    vm.runInNewContext(source.slice(start, end), {app: {get: (_, handler) => {route = handler;}},
        cache: {get: id => sessions[id]}, self: {worldsMap: {map: world}},
        effectiveLevelInfo: (_, __, info) => info, Formulas: {hp: () => 100,
            calculatePercentageToNextLevel: () => ({currentLevel: 3, percentage: 20}),
            calculateToolPercentageToNextLevel: () => ({currentLevel: 2, percentage: 10})}});
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    return {sessions, res, request: () => route({params: {sessionId: 'one'}}, res)};
}
test('statistics expose authoritative XP totals and stable asset identities', async () => {
    const s = setup(); await s.request();
    expect(s.res.json).toHaveBeenCalledWith(expect.objectContaining({experience: [
        {id: 'avatar', type: 'avatar', xp: 1234}, {id: 'nft-weapon', type: 'weapon', xp: 3456},
        {id: 'companion', type: 'companion', xp: 5678}], weaponInfo: expect.objectContaining({assetId: 'nft-weapon'})}));
});
test('tools have their own XP type; normal weapons and absent companions invent no XP', async () => {
    const tool = setup({tool: true, companion: false}); await tool.request();
    expect(tool.res.json.mock.calls[0][0].experience[1].type).toBe('tool');
    const normal = setup({weapon: false, companion: false}); await normal.request();
    expect(normal.res.json.mock.calls[0][0].experience).toEqual([{id: 'avatar', type: 'avatar', xp: 1234}]);
});
test('the next snapshot includes XP committed by any award source, not just combat', async () => {
    const s = setup(); await s.request(); s.sessions.one.xp += 99; await s.request();
    expect(s.res.json.mock.calls[1][0].experience[0].xp).toBe(1333);
});

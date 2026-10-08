const {EventBoardController} = require('./eventboardcontroller');
const id = '00000000-0000-4000-8000-000000000001';
function fixture() {
    const session = {walletId: 'wallet:1', nftId: 'avatar', mapId: 'main', entityId: 7};
    const player = {sessionId: 'session', walletId: session.walletId, mapId: 'main', x: 53, y: 217};
    const map = {eventBoards: [{x: 52, y: 214, w: 3, h: 3}]};
    const world = {map, getPlayerById: jest.fn(() => player)};
    const platform = {getEventBoard: jest.fn(async () => ({events: [], serverTime: new Date().toISOString()})), registerEvent: jest.fn(async () => {})};
    const controller = new EventBoardController({get: () => session}, () => ({main: world}), platform);
    const req = {params: {sessionId: 'session', eventId: id, runId: id, action: 'join'}, body: {confirmed: true, wallet: 'forged-wallet'}};
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis()};
    return {controller, player, session, world, platform, req, res};
}
test('registration binds the real online player and board proximity, never the submitted wallet', async () => {
    const f = fixture(); await f.controller.register(f.req, f.res);
    expect(f.platform.registerEvent).toHaveBeenCalledWith('wallet:1', id, id, 'join');
    f.player.x = 100; await f.controller.register(f.req, f.res);
    expect(f.res.status).toHaveBeenLastCalledWith(403); expect(f.platform.registerEvent).toHaveBeenCalledTimes(1);
    f.player.sessionId = 'different'; await f.controller.register(f.req, f.res);
    expect(f.res.status).toHaveBeenLastCalledWith(401);
});
test('confirmation, round identity and supported actions are required', async () => {
    for (const override of [{body: {}}, {params: {action: 'assign'}}, {params: {runId: 'bad'}}]) {
        const f = fixture(); f.req = {...f.req, ...override, params: {...f.req.params, ...override.params}};
        await f.controller.register(f.req, f.res);
        expect(f.res.status).toHaveBeenCalledWith(400); expect(f.platform.registerEvent).not.toHaveBeenCalled();
    }
});
test('live results discard upcoming, ended and other-map rounds even if upstream sends them', async () => {
    const f = fixture(); const valid = {status: 'live', maps: ['main'], startsAt: new Date(Date.now()-1000).toISOString(), endsAt: new Date(Date.now()+10000).toISOString()};
    f.player.x = 100; f.platform.getEventBoard.mockResolvedValue({events: [valid, {...valid, isCompetition: false}, {...valid, maps: ['forest']}, {...valid, status: 'upcoming'}, {...valid, endsAt: new Date(Date.now()-1).toISOString()}]});
    await f.controller.list(f.req, f.res, true);
    expect(f.platform.getEventBoard).toHaveBeenCalledWith('wallet:1', 'avatar', 'main');
    expect(f.res.json).toHaveBeenCalledWith({events: [valid]});
    await f.controller.list(f.req, f.res); expect(f.res.status).toHaveBeenLastCalledWith(403);
});
test('unavailable and rejected registrations give actionable failures', async () => {
    const f = fixture(); f.platform.registerEvent.mockRejectedValue({response: {status: 409, data: {error: 'Locked'}}});
    await f.controller.register(f.req, f.res); expect(f.res.json).toHaveBeenLastCalledWith({error: 'Locked'});
    f.platform.registerEvent.mockRejectedValue(new Error('timeout')); await f.controller.register(f.req, f.res);
    expect(f.res.status).toHaveBeenLastCalledWith(503);
    f.platform.getEventBoard.mockRejectedValue(new Error('timeout')); await f.controller.list(f.req, f.res);
    expect(f.res.status).toHaveBeenLastCalledWith(503);
});
test('leaving the board while the request is pending discards its result', async () => {
    const f = fixture(); f.platform.getEventBoard.mockImplementation(async () => {f.player.x = 200; return {events: []};});
    await f.controller.list(f.req, f.res); expect(f.res.status).toHaveBeenCalledWith(409);
});

test('town board passes through community events without enabling competition registration', async () => {
    const f = fixture();
    const event = {id, runId: id+':1791374430', isCompetition: false, canJoin: false, canWithdraw: false};
    f.platform.getEventBoard.mockResolvedValue({events: [event]});
    await f.controller.list(f.req, f.res);
    expect(f.res.json).toHaveBeenCalledWith({events: [event]});
    f.req.params.runId = event.runId;
    await f.controller.register(f.req, f.res);
    expect(f.res.status).toHaveBeenCalledWith(400);
    expect(f.platform.registerEvent).not.toHaveBeenCalled();
});

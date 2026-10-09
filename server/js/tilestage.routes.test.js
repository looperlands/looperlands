const fs = require('fs'), vm = require('vm');
function setup(session = {mapId: 'duckville', entityId: 1, nftId: 'avatar'}) {
    const source = fs.readFileSync(require.resolve('./ws'), 'utf8');
    const start = source.indexOf('        app.post("/session/:sessionId/tileStage",');
    const end = source.indexOf('        app.post("/session/:sessionId/tileStage/start",', start);
    let handler;
    const controller = {findCurrentStage: jest.fn(async () => ({key: 'prepare'}))};
    const world = {getPlayerById: () => ({hasEnteredGame: true, sessionId: 'session'})};
    vm.runInNewContext(source.slice(start, end), {
        app: {post: (_, callback) => {handler = callback;}}, cache: {get: () => session},
        self: {worldsMap: {duckville: world}}, tileActionsController: controller,
        console: {error: jest.fn()},
    });
    const req = {params: {sessionId: 'session'}, body: {map: 'duckville', tileAction: {gridX: 1, gridY: 2}}};
    const res = {status: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis()};
    return {handler, controller, req, res};
}
test.each([undefined, {mapId: 'other'}])('expired or mismatched stage sessions fail without calling farming', async session => {
    const state = setup(session === undefined ? null : session);
    await state.handler(state.req, state.res);
    expect(state.res.status).toHaveBeenCalledWith(403);
    expect(state.controller.findCurrentStage).not.toHaveBeenCalled();
});
test('stage load failures produce an HTTP error instead of an unhandled rejection', async () => {
    const state = setup();
    state.controller.findCurrentStage.mockRejectedValue(new Error('offline'));
    await state.handler(state.req, state.res);
    expect(state.res.status).toHaveBeenCalledWith(500);
    expect(state.res.send).toHaveBeenCalledWith(expect.objectContaining({success: false}));
});
test('active sessions can still preview valid farming stages', async () => {
    const state = setup();
    await state.handler(state.req, state.res);
    expect(state.res.status).toHaveBeenCalledWith(200);
    expect(state.res.send).toHaveBeenCalledWith({key: 'prepare'});
});

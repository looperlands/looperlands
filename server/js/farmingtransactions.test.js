process.env.GAMESERVER_NAME = 'test';
jest.mock('./dao.js', () => ({}));
jest.mock('./formulas', () => ({level: () => 20}));
global.Types = {};
const Types = require('../../shared/js/gametypes');
const Controller = require('./tileactionscontroller');
const definitions = require('./fixtures/farming');
function setup(durable = {revision: 0, plot: null, xp: 1000000}) {
    const inventory = {[Types.Entities.M88NSHOVEL]: 1, [Types.Entities.M88NWATERCAN]: 1, [Types.Entities.M88NSEEDS]: 5};
    const session = {nftId: 'avatar', xp: durable.xp, gameData: {items: {...inventory}}};
    const cache = {keys: () => ['session'], get: () => session, set: jest.fn()};
    const world = {players: {1: {nftId: 'avatar', handleExperience: jest.fn(),
        applyPersistedExperience: jest.fn(async xp => {session.xp = xp;})}},
        placeStagedTile: jest.fn(), placeStagedTileGroup: jest.fn(), clearStagedTile: jest.fn(), sendNotifications: jest.fn()};
    const dao = {loadFarmPlots: jest.fn(async () => durable.plot ? [durable.plot] : []),
        loadFarmState: jest.fn(async () => ({revision: durable.revision, plot: durable.plot && {...durable.plot}})),
        getItemCount: jest.fn(async (_, item) => inventory[item] || 0),
        updateResourceBalance: jest.fn(), saveFarmPlot: jest.fn(), deleteFarmPlot: jest.fn(),
        commitFarmTransaction: jest.fn(async request => {
            if (request.expectedRevision !== durable.revision) throw new Error('plot_changed');
            for (const item of request.items) inventory[item.item] = (inventory[item.item] || 0) + item.amount;
            durable.xp += request.xp;
            durable.revision++;
            durable.plot = request.plot && {...request.plot, revision: durable.revision};
            return {requestId: request.requestId, revision: durable.revision, plot: durable.plot, xp: durable.xp,
                quantities: Object.fromEntries(request.items.map(item => [item.item, inventory[item.item]]))};
        })};
    let now = 1000000;
    const controller = new Controller(cache, null, {dao, stageDefinitions: definitions(), now: () => now, random: () => 0});
    const tile = {name: 'farm', gridX: 10, gridY: 20};
    const execute = async item => {
        const stage = await controller.findCurrentStage('avatar', 'duckville', tile, world);
        return controller.executeStage('avatar', 'duckville', tile, item, world, stage.key, stage.revision);
    };
    return {controller, dao, world, tile, durable, session, inventory, execute, grow: () => {now += 100000;}};
}
test('the entire crop lifecycle commits items, plot and XP through one operation per stage', async () => {
    const s = setup();
    expect((await s.execute()).success).toBe(true);
    expect((await s.execute('M88NLETTUCE')).success).toBe(true);
    expect((await s.execute()).success).toBe(true);
    s.grow();
    expect((await s.execute()).success).toBe(true);
    expect(s.dao.commitFarmTransaction.mock.calls.map(([request]) => request.action)).toEqual(['prepare', 'plant', 'water', 'harvest']);
    expect(s.durable).toMatchObject({revision: 4, plot: null, xp: 1000065});
    expect(s.session.gameData.items[Types.Entities.M88NLETTUCE]).toBe(1);
    expect(s.dao.updateResourceBalance).not.toHaveBeenCalled();
    expect(s.dao.saveFarmPlot).not.toHaveBeenCalled();
    expect(s.dao.deleteFarmPlot).not.toHaveBeenCalled();
    expect(s.world.players[1].handleExperience).not.toHaveBeenCalled();
    expect(s.world.players[1].applyPersistedExperience).toHaveBeenLastCalledWith(1000065);
});
test('a restarted game server rejects an old prepare even after the plot becomes empty again', async () => {
    const s = setup();
    await s.execute(); await s.execute('M88NLETTUCE'); await s.execute(); s.grow(); await s.execute();
    const restarted = setup(s.durable);
    expect((await restarted.controller.executeStage('avatar', 'duckville', restarted.tile, null, restarted.world, 'prepare', 0)).success).toBe(false);
    expect(restarted.dao.commitFarmTransaction).not.toHaveBeenCalled();
});
test('an ambiguous response rechecks durable state and cannot pay or spend twice', async () => {
    const s = setup();
    const commit = s.dao.commitFarmTransaction.getMockImplementation();
    s.dao.commitFarmTransaction.mockImplementationOnce(async request => {await commit(request); throw new Error('timeout');});
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        expect((await s.execute()).success).toBe(false);
        expect((await s.controller.findCurrentStage('avatar', 'duckville', s.tile, s.world)).revision).toBe(1);
        expect((await s.controller.executeStage('avatar', 'duckville', s.tile, null, s.world, 'prepare', 0)).success).toBe(false);
        expect(s.durable.xp).toBe(1000015);
        expect(s.dao.commitFarmTransaction).toHaveBeenCalledTimes(1);
    } finally {log.mockRestore();}
});
test('atomic farming requires a revision and never falls back to legacy writes on API failure', async () => {
    const s = setup();
    expect((await s.controller.executeStage('avatar', 'duckville', s.tile, null, s.world, 'prepare')).success).toBe(false);
    s.dao.commitFarmTransaction.mockRejectedValue(new Error('HTTP 404'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try { expect((await s.execute()).success).toBe(false); } finally {log.mockRestore();}
    expect(s.dao.saveFarmPlot).not.toHaveBeenCalled();
    expect(s.dao.updateResourceBalance).not.toHaveBeenCalled();
});
test('planting reports missing seeds and logs the upstream rejection without credentials', async () => {
    const s = setup();
    await s.execute();
    const error = Object.assign(new Error('insufficient_items'), {code: 'insufficient_items',
        cause: {response: {status: 409, data: {code: 'insufficient_items'}},
            config: {headers: {'X-Api-Key': 'secret'}}}});
    s.dao.commitFarmTransaction.mockRejectedValue(error);
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        expect((await s.execute('M88NLETTUCE')).success).toBe(false);
        const details = JSON.parse(log.mock.calls[0][1]);
        expect(details).toMatchObject({status: 409, platformCode: 'insufficient_items'});
        expect(log.mock.calls[0][1]).not.toContain('secret');
        expect(JSON.stringify(s.world.sendNotifications.mock.calls)).toContain('enough seeds');
        expect(s.durable.plot.state).toBe('prepared');
        expect(s.inventory[Types.Entities.M88NSEEDS]).toBe(5);
    } finally {log.mockRestore();}
});
test('a failed local XP refresh cannot reject a durably committed planting', async () => {
    const s = setup();
    await s.execute();
    s.world.players[1].applyPersistedExperience.mockRejectedValueOnce(new Error('session disconnected'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        expect((await s.execute('M88NLETTUCE')).success).toBe(true);
        expect(s.durable.plot.state).toBe('planted');
        expect(s.inventory[Types.Entities.M88NSEEDS]).toBe(4);
        expect(s.session.gameData.items[Types.Entities.M88NSEEDS]).toBe(4);
        expect(log).toHaveBeenCalledWith('[tileStage.duckville] committed farming XP refresh failed', expect.any(String));
        expect(JSON.stringify(s.world.sendNotifications.mock.calls)).not.toContain('Could not');
    } finally {log.mockRestore();}
});

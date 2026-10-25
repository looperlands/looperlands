const Persistence = require('./tilesequencepersistence');
const signature = 'a'.repeat(64);
const transaction = {requestId: 'b'.repeat(64), nftId: 'avatar', mapId: 'one', x: 2, y: 3,
    signature, expectedRevision: 0, stage: null, readyAt: 0, tile: 0, success: true,
    items: [{item: '100', amount: -2}, {item: '100', amount: 1}], requiredItems: [{item: '100', quantity: 2}], xp: 3};

test('production sequences map to atomic namespaced transactions and reconcile receipt state', async () => {
    const platform = {commitFarmTransaction: jest.fn(async request => ({requestId: request.requestId, revision: 1,
        plot: request.plot, xp: 103, quantities: {'100': 9}, replayed: false}))};
    expect(await Persistence.commit(platform, transaction)).toEqual({state: {revision: 1, stage: null, readyAt: 0, tile: 0}, xp: 103, quantities: {'100': 9}, success: true, replayed: false});
    expect(platform.commitFarmTransaction.mock.calls[0][0]).toMatchObject({action: 'sequence', mapId: 'tile-sequence:one:' + signature,
        items: [{item: '100', amount: -1}], requiredItems: transaction.requiredItems,
        plot: {state: 'sequence', sequenceStage: null, signature, success: true}});
});

test('a missing namespaced plot begins at its own revision without falling back to local state', async () => {
    const platform = {getFarmState: jest.fn(async () => ({revision: 0, plot: null}))};
    expect(await Persistence.read(platform, 'one', 2, 3, signature)).toEqual({revision: 0});
    expect(platform.getFarmState).toHaveBeenCalledWith('tile-sequence:one:' + signature, 2, 3);
    await expect(Persistence.read(platform, 'one', 2, 3, 'bad')).rejects.toThrow('identity');
});

test('equal costs and rewards keep the inventory requirement without requesting a missing zero-delta receipt', async () => {
    const platform = {commitFarmTransaction: jest.fn(async request => ({revision: 1, plot: request.plot, xp: 3, quantities: {}}))};
    const result = await Persistence.commit(platform, {...transaction, items: [{item: '100', amount: -2}, {item: '100', amount: 2}]});
    expect(result.quantities).toEqual({});
    expect(platform.commitFarmTransaction.mock.calls[0][0]).toMatchObject({items: [], requiredItems: transaction.requiredItems});
});

test('stale revision errors preserve the controller conflict contract', async () => {
    const platform = {commitFarmTransaction: async () => {throw Object.assign(new Error('plot_changed'), {code: 'plot_changed'});}};
    await expect(Persistence.commit(platform, transaction)).rejects.toMatchObject({code: 'tile_changed'});
});

test('malformed upstream sequence state cannot authorize another stage', async () => {
    const platform = {getFarmState: async () => ({revision: 3, plot: {state: 'growing', signature}})};
    await expect(Persistence.read(platform, 'one', 2, 3, signature)).rejects.toThrow('Invalid tile sequence');
});

test('personal progress has isolated namespaces and restores durable trigger outcomes', async () => {
    const plots = new Map();
    const platform = {
        getFarmState: jest.fn(async mapId => plots.get(mapId) || {revision: 0, plot: null}),
        commitFarmTransaction: jest.fn(async request => {
            const result = {revision: 1, plot: request.plot, xp: 103, quantities: {'100': 9}};
            plots.set(request.mapId, result);
            return result;
        })
    };
    await Persistence.commit(platform, {...transaction, owner: 'avatar', effects: {gate: false}});
    expect(await Persistence.read(platform, 'one', 2, 3, signature, 'avatar')).toMatchObject({revision: 1, effects: {gate: false}});
    expect(await Persistence.read(platform, 'one', 2, 3, signature, 'other')).toEqual({revision: 0});
    expect(await Persistence.read(platform, 'one', 2, 3, signature)).toEqual({revision: 0});
});

test('expired production cooldowns reset through a revision-checked transaction without costs or rewards', async () => {
    const plot = {state: 'sequence', signature, sequenceStage: null, readyAt: 100, tile: 4,
        success: true, ownerNftId: 'avatar', sequenceEffects: [{trigger: 'gate', active: true}]};
    const platform = {getFarmState: jest.fn(async () => ({revision: 2, plot})),
        commitFarmTransaction: jest.fn(async request => ({revision: 3, plot: request.plot, xp: 103, quantities: {}}))};
    const reset = {...transaction, expectedRevision: 2, now: 200, stage: 'work', tile: 1};
    expect(await Persistence.reset(platform, reset)).toEqual({revision: 3, stage: 'work', readyAt: 0, tile: 1, effects: {gate: true}});
    expect(platform.commitFarmTransaction.mock.calls[0][0]).toMatchObject({expectedRevision: 2, items: [], requiredItems: [], xp: 0,
        nftId: 'avatar', plot: {sequenceStage: 'work', readyAt: 0, sequenceEffects: [{trigger: 'gate', active: true}]}});
    platform.commitFarmTransaction.mockClear();
    await expect(Persistence.reset(platform, {...reset, now: 50})).rejects.toMatchObject({code: 'tile_changed'});
    await expect(Persistence.reset(platform, {...reset, expectedRevision: 1})).rejects.toMatchObject({code: 'tile_changed'});
    expect(platform.commitFarmTransaction).not.toHaveBeenCalled();
});

global.Types = {};
jest.mock('./tileactions/duckvillecontroller', () => class {});
jest.mock('./message', () => ({TileStage: class {constructor(stage) {this.stage = stage;}}}));
const Controller = require('./tileactionscontroller');
function setup(effect) {
    const world = {map: {tileStages: {}}, pushBroadcast: jest.fn()};
    const backend = {stageDefinitions: {test: {farm: {stageParticles: effect}}}, executeStage: jest.fn(async () => {
        world.map.tileStages['1.2'] = {x: 1, y: 2, tile: 42};
        return {success: true, activity: {action: 'farm', stage: 'prepare'}};
    })};
    const controller = new Controller(null, null, {controllers: {test: backend}});
    return {world, backend, controller, execute: () => controller.executeStage('avatar', 'test', {name: 'farm', gridX: 1, gridY: 2}, null, world)};
}
test('successful changes send one transient burst outside stored tile snapshots', async () => {
    const {world, execute} = setup(); await execute();
    expect(world.pushBroadcast).toHaveBeenCalledTimes(1);
    expect(world.pushBroadcast.mock.calls[0][0].stage).toMatchObject({particlesOnly: true, particles: {preset: 'soil'}});
    expect(world.map.tileStages['1.2']).toEqual({x: 1, y: 2, tile: 42});
    await execute(); expect(world.pushBroadcast).toHaveBeenCalledTimes(1);
});
test.each([false, {enabled: false}, {stages: {prepare: false}}])('opt-out suppresses FX without cancelling the committed action: %j', config => {
    const {world, execute} = setup(config);
    return execute().then(result => {expect(result.success).toBe(true); expect(world.pushBroadcast).not.toHaveBeenCalled();});
});
test('failed actions, hydration and recovery have no transient events', async () => {
    const {world, backend, execute} = setup();
    backend.executeStage.mockResolvedValueOnce({success: false}).mockResolvedValueOnce({success: true});
    await execute(); await execute(); expect(world.pushBroadcast).not.toHaveBeenCalled();
});
test('invalid visual configuration never cancels a committed action', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
        const {world, execute} = setup({stages: {prepare: {count: 999}}});
        await expect(execute()).resolves.toMatchObject({success: true});
        expect(world.pushBroadcast).not.toHaveBeenCalled();
        expect(world.map.tileStages['1.2'].tile).toBe(42);
    } finally { warning.mockRestore(); }
});

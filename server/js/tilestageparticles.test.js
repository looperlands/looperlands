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

test.each(['shared', 'player'])('custom bursts play for %s interactions without artwork changes', async scope => {
    const design = require('../../client/js/worldfxconfig').custom({shape: 'star',colors: ['#abcdef'],glow: 8});
    const {world,backend,execute}=setup({stages:{prepare:{preset:'sparks',design}}});
    Object.assign(backend.stageDefinitions.test.farm,{type:'sequence',scope});
    const player={nftId:'avatar'};world.players={player};world.pushToPlayer=jest.fn();
    backend.executeStage.mockResolvedValueOnce({success:true,activity:{action:'farm',stage:'prepare',failed:false}})
        .mockResolvedValueOnce({success:true}).mockResolvedValueOnce({success:true,activity:{action:'farm',stage:'prepare',failed:true}});
    await execute();await execute();await execute();
    const calls=scope==='player'?world.pushToPlayer.mock.calls:world.pushBroadcast.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][scope==='player'?1:0].stage.particles.design).toEqual(design);
    expect(scope==='player'?world.pushBroadcast:world.pushToPlayer).not.toHaveBeenCalled();
    expect(world.map.tileStages).toEqual({});
});

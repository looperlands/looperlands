global.Types = {};
jest.mock('./tileactions/duckvillecontroller', () => class {});
jest.mock('./message', () => ({TileAction: class { constructor(state) {this.state = state;} }}));
const Controller = require('./tileactionscontroller');
const Types = require('../../shared/js/gametypes');

function setup(stage = {playAnimation: true, duration: 3, requirements: {tool: 'M88NSHOVEL'}, hasTool: true}) {
    const actor = {id: 1, nftId: 'avatar', sessionId: 'session', hasEnteredGame: true,
        x: 10, y: 20, group: 'nearby', orientation: Types.Orientations.DOWN, getLevel: () => 20};
    const backend = {stageDefinitions: {test: {}}, findCurrentStage: jest.fn(async () => stage)};
    const controller = new Controller(null, null, {duckvilleController: backend});
    const world = {getPlayerById: jest.fn(() => actor), pushToAdjacentGroups: jest.fn()};
    const tile = {gridX: 9, gridY: 20};
    return {controller, backend, world, actor, tile};
}
test('tool ownership selects linked sprite; start uses server stage and broadcasts only nearby', async () => {
    const {controller, world, actor, tile} = setup();
    const result = await controller.startStage(actor, 'test', tile, world);
    expect(result).toMatchObject({success: true, stage: {animationSprite: 'tool-shovel'},
        animation: {entityId: 1, animationSprite: 'tool-shovel', orientation: Types.Orientations.LEFT, duration: 3000, tileX: 9, tileY: 20, impactFeedback: {impactFrame: 3, count: 8}}});
    expect(world.pushToAdjacentGroups).toHaveBeenCalledWith('nearby', expect.objectContaining({state: result.animation}), 1);
    expect(actor.weapon).toBeUndefined();
    expect((await controller.startStage(actor, 'test', tile, world)).success).toBe(false);
    expect(world.pushToAdjacentGroups).toHaveBeenCalledTimes(1);
});
test.each([
    {playAnimation: true, requirements: {tool: 'M88NSHOVEL'}, hasTool: false},
    {playAnimation: true, requirements: {tool: 'M88NSHOVEL'}},
    {playAnimation: true, waiting: true},
    {playAnimation: true, duration: 1000},
    {playAnimation: true, duration: 0},
    {playAnimation: true, requirements: {level: 21}},
    {playAnimation: false},
])('unavailable actions never broadcast: %j', async stage => {
    const {controller, world, actor, tile} = setup(stage);
    expect((await controller.startStage(actor, 'test', tile, world)).success).toBe(false);
    expect(world.pushToAdjacentGroups).not.toHaveBeenCalled();
});
test.each(['move', 'disconnect', 'session'])('rechecks the actor after async inventory lookup: %s', async change => {
    const {controller, backend, world, actor, tile} = setup();
    backend.findCurrentStage.mockImplementation(async () => {
        if (change === 'move') actor.x = 30;
        if (change === 'disconnect') world.getPlayerById.mockReturnValue(null);
        if (change === 'session') actor.sessionId = 'replacement';
        return {playAnimation: true};
    });
    expect((await controller.startStage(actor, 'test', tile, world)).success).toBe(false);
    expect(world.pushToAdjacentGroups).not.toHaveBeenCalled();
});
test('unmapped tools retain normal weapon appearance', async () => {
    const {controller, world, actor, tile} = setup({playAnimation: true, duration: 2});
    expect((await controller.startStage(actor, 'test', tile, world)).animation.animationSprite).toBeNull();
});

test('stale action cannot start animating a different tool stage', async () => {
    const {controller, world, actor, tile} = setup({key: 'water', playAnimation: true, duration: 3,
        requirements: {tool: 'M88NWATERCAN'}, hasTool: true});
    expect((await controller.startStage(actor, 'test', tile, world, 'prepare')).success).toBe(false);
    expect(world.pushToAdjacentGroups).not.toHaveBeenCalled();
});

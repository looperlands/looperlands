const fs = require('fs'), vm = require('vm');
const cls = {};
vm.runInNewContext(fs.readFileSync(require.resolve('../../server/js/lib/class'), 'utf8'), {exports: cls});
global.Types = {};
const Types = require('../../shared/js/gametypes');
function setup() {
    let TileActions;
    const axios = {post: jest.fn(async () => ({data: {success: true}}))};
    vm.runInNewContext(fs.readFileSync(require.resolve('./tileactions'), 'utf8'), {
        Class: cls.Class, Types, axios, console, setTimeout, clearTimeout, setInterval, clearInterval,
        define: (_, factory) => {TileActions = factory();},
    });
    const actor = {id: 1, orientation: Types.Orientations.DOWN, isDead: false,
        isMoving: jest.fn(() => false), currentAnimation: {name: 'idle_down'},
        setAnimation: jest.fn(function(name) {this.currentAnimation = {name};}),
        idle: jest.fn(function(orientation) {this.orientation = orientation; this.currentAnimation = {name: 'idle'};})};
    const game = {player: actor, mapId: 'main', sessionId: 'session',
        getEntityById: jest.fn(() => actor), sprites: {'tool-shovel': {animationData: {atk_right: {length: 5}}}},
        showNotification: jest.fn(), toolImpactFeedback: {startAction: jest.fn(), stopAction: jest.fn()}};
    return {actions: new TileActions(game), actor, game, axios};
}
const state = {entityId: 1, orientation: Types.Orientations.LEFT, duration: 3000, animationSprite: 'tool-shovel'};
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('left-facing tool animates and restores original appearance and orientation', async () => {
    const {actions, actor, game} = setup();
    actor.weaponName = 'redsword';
    const done = actions.showActionAnimation(state);
    expect(actor.actionToolName).toBe('tool-shovel');
    expect(game.toolImpactFeedback.startAction).toHaveBeenCalledWith(actor, state, actor.currentAnimation);
    expect(actor.flipSpriteX).toBe(true);
    expect(actor.orientation).toBe(Types.Orientations.LEFT);
    jest.advanceTimersByTime(3000);
    expect(await done).toBe(true);
    expect(actor.actionToolName).toBeUndefined();
    expect(actor.weaponName).toBe('redsword');
    expect(game.toolImpactFeedback.stopAction).toHaveBeenCalledWith(actor, false);
    expect(actor.orientation).toBe(Types.Orientations.DOWN);
    expect(jest.getTimerCount()).toBe(0);
});
test.each(['movement', 'map', 'death', 'despawn', 'stop', 'combat'])('cleans up interrupted actions: %s', async reason => {
    const {actions, actor, game} = setup();
    const done = actions.showActionAnimation(state);
    if (reason === 'movement') actor.isMoving.mockReturnValue(true);
    if (reason === 'map') game.mapId = 'other';
    if (reason === 'death') actor.isDead = true;
    if (reason === 'despawn') game.getEntityById.mockReturnValue(null);
    if (reason === 'stop') game.isStopped = true;
    if (reason === 'combat') actor.currentAnimation = {name: 'atk_down'};
    jest.advanceTimersByTime(50);
    expect(await done).toBe(false);
    expect(game.toolImpactFeedback.stopAction).toHaveBeenCalledWith(actor, true);
    expect(actor.actionToolName).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
});
test('unknown sprite safely retains equipped appearance', async () => {
    const {actions, actor} = setup();
    const done = actions.showActionAnimation({...state, animationSprite: 'missing'});
    expect(actor.actionToolName).toBeUndefined();
    jest.advanceTimersByTime(3000);
    expect(await done).toBe(true);
});
test('server rejection releases the stage and never executes', async () => {
    const {actions, axios} = setup();
    axios.post.mockResolvedValue({data: {success: false, message: 'Missing tool'}});
    const stage = {playAnimation: true, requirements: {tool: 'M88NSHOVEL'}, hasTool: true};
    await actions.executeStage({gridX: 1, gridY: 2}, stage);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(stage.inProgress).toBe(false);
    expect(actions.localActionInProgress).toBe(false);
});
test.each([false, true])('approved action executes only after an uninterrupted animation (cancel=%s)', async cancel => {
    const {actions, actor, axios} = setup();
    const stage = {playAnimation: true, duration: 3, requirements: {tool: 'M88NSHOVEL'}, hasTool: true};
    axios.post.mockResolvedValueOnce({data: {success: true, stage: {...stage, animationSprite: 'tool-shovel'}, animation: state}});
    const result = actions.executeStage({gridX: 1, gridY: 2}, stage);
    await Promise.resolve(); await Promise.resolve();
    expect(axios.post).toHaveBeenCalledTimes(1);
    if (cancel) actor.isMoving.mockReturnValue(true);
    jest.advanceTimersByTime(3000);
    await result;
    expect(axios.post).toHaveBeenCalledTimes(cancel ? 1 : 2);
    expect(stage.inProgress).toBe(false);
    expect(actions.localActionInProgress).toBe(false);
    expect(actor.actionToolName).toBeUndefined();
});
test('tool cadence does not change subsequent combat animation speed', async () => {
    const {actions, actor} = setup();
    const combatSpeed = [50, 50, 50, 50, 50];
    const animation = {name: 'atk_right', speed: combatSpeed,
        setSpeed(value) {this.speed = value;}};
    actor.getAnimationByName = () => animation;
    actor.setAnimation = () => {actor.currentAnimation = animation;};
    const done = actions.showActionAnimation(state);
    expect(animation.speed).toBe(140);
    jest.advanceTimersByTime(3000);
    expect(await done).toBe(true);
    expect(animation.speed).toEqual(combatSpeed);
});

test.each(['server update', 'map change', 'session change'])('optimistic rollback preserves newer state: %s', reason => {
    const {actions, game} = setup();
    game.tileStages = {};
    game.tileStageRevisions = {};
    game.handleTileStage = jest.fn(stage => {
        const key = stage.x + '.' + stage.y;
        game.tileStageRevisions[key] = (game.tileStageRevisions[key] || 0) + 1;
    });
    const snapshot = actions.applyOptimisticStage({gridX: 1, gridY: 2}, {optimisticStage: {tile: 123, stage: 0}});
    if (reason === 'server update') game.handleTileStage({x: 1, y: 2, clear: true});
    if (reason === 'map change') game.mapId = 'other';
    if (reason === 'session change') game.sessionId = 'other';
    game.handleTileStage.mockClear();
    actions.revertOptimisticStage(snapshot);
    expect(game.handleTileStage).not.toHaveBeenCalled();
});
test('optimistic rollback still restores its own rejected action', () => {
    const {actions, game} = setup();
    game.tileStages = {'1.2': {tile: 99, stage: 0}};
    game.tileStageRevisions = {};
    game.handleTileStage = jest.fn(stage => {
        const key = stage.x + '.' + stage.y;
        game.tileStageRevisions[key] = (game.tileStageRevisions[key] || 0) + 1;
    });
    const snapshot = actions.applyOptimisticStage({gridX: 1, gridY: 2}, {optimisticStage: {tile: 123, stage: 0}});
    actions.revertOptimisticStage(snapshot);
    expect(game.handleTileStage).toHaveBeenLastCalledWith({x: 1, y: 2, clear: true});
    expect(game.tileStages['1.2']).toEqual({tile: 99, stage: 0});
});

test('an old seed selection cannot execute after a map change', () => {
    const {actions, game, axios} = setup();
    game.app = {showSelectionPopup: jest.fn()};
    actions.executeStage({gridX: 1, gridY: 2}, {key: 'plant', name: 'Plant',
        requirements: {items: ['M88NLETTUCE']}, itemChoices: {M88NLETTUCE: {count: 1, title: 'Lettuce'}}});
    const choice = game.app.showSelectionPopup.mock.calls[0][1][0];
    game.mapId = 'other';
    choice.callback('M88NLETTUCE');
    expect(axios.post).not.toHaveBeenCalled();
});

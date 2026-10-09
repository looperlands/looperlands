const fs = require('fs'), vm = require('vm');
let methods;
const error = jest.fn();
vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), {
    Class: {extend: definition => definition}, console: {error},
    define: (_, factory) => {methods = factory();},
});
function setup() {
    return {handleTileStage: methods.handleTileStage, tileStages: {}, animatedTiles: [],
        map: {stagedTiles: {}, isAnimatedTile: () => false, tilesize: 16, tilesetColumns: 64},
        renderer: {scale: 1, tileset: {width: 1024}}};
}
test('staged farming tiles use the receiving game instance without global self', () => {
    const game = setup();
    game.handleTileStage({x: 1, y: 2, tile: 123, stage: 0});
    expect(game.tileStages['1.2'].tile).toBe(123);
    game.handleTileStage({x: 1, y: 2, clear: true});
    expect(game.tileStages).toEqual({});
    expect(game.tileStageRevisions['1.2']).toBe(2);
});
test('missing crop graphics do not crash the staged tile handler', () => {
    const game = setup();
    expect(() => game.handleTileStage({x: 1, y: 2, tileGroup: 'missing', stage: 1})).not.toThrow();
    expect(game.tileStages).toEqual({});
    expect(error).toHaveBeenCalledWith('Could not find staged tile group missing');
});
test('configured crop stages replace the soil and render each crop tile', () => {
    const game = setup();
    game.tileStages['1.2'] = {x: 1, y: 2, tile: 99};
    game.map.stagedTiles['100'] = {groupName: 'lettuce', replaceBaseTile: true,
        stageTiles: [100, 200, 300], size: {w: 2, h: 2}, offset: {x: 0, y: -1}};
    game.handleTileStage({x: 1, y: 2, tileGroup: 'lettuce', stage: 1});
    expect(game.tileStages['1.2']).toBeUndefined();
    expect(Object.values(game.tileStages).map(stage => stage.tile)).toEqual([200, 264, 201, 265]);
    expect(game.tileStages['1.2:0.0'].y).toBe(1);
});

test('network callbacks keep the game context when invoked by the game client', () => {
    const game = setup();
    game.tileActions = {showActionAnimation: jest.fn()};
    game.client = {onTileStage(callback) {this.stage = callback;}, onTileAction(callback) {this.action = callback;}};
    methods.bindTileActionCallbacks.call(game);
    game.client.stage({x: 1, y: 2, tile: 123, stage: 0});
    expect(game.tileStages['1.2'].tile).toBe(123);
    game.client.action({entityId: 1});
    expect(game.tileActions.showActionAnimation).toHaveBeenCalledWith({entityId: 1});
});

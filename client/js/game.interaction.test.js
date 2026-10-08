const fs = require('fs'), path = require('path'), vm = require('vm');
function setup() {
    let definition; const scenery = {nearestAction: jest.fn(), execute: jest.fn()};
    let modal = false;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), {
        Class: {extend: value => {definition = value; return value;}},
        Types: {isNpc: kind => kind === 44}, _: {each: (values, fn) => Object.values(values || {}).forEach(fn)},
        $: () => ({hasClass: () => modal}),
        define: (dependencies, factory) => factory(...dependencies.map(name => name === 'worldscenery' ? scenery : {}))
    });
    const game = Object.create(definition);
    const adam = {id: 1, kind: 44, gridX: 4, gridY: 5, hasInteraction: () => true};
    const bstrat = {id: 2, kind: 44, gridX: 5, gridY: 6, hasInteraction: () => true};
    game.player = {gridX: 5, gridY: 5}; game.renderingGrid = Array.from({length: 11}, () => Array.from({length: 11}, () => ({})));
    game.renderingGrid[5][4][adam.id] = adam; game.renderingGrid[6][5][bstrat.id] = bstrat;
    game.map = {isOutOfBounds: () => false, findNearestActionTileAround: jest.fn()};
    game.makeNpcTalk = jest.fn(); game.runTileAction = jest.fn();
    return {game, adam, bstrat, scenery, modal: value => {modal = value;}};
}

test('E opens only the NPC indicated by the nearest-actor prompt, even when two neighbours are adjacent', () => {
    const {game, adam} = setup();
    game.interact();
    expect(game.makeNpcTalk).toHaveBeenCalledTimes(1);
    expect(game.makeNpcTalk).toHaveBeenCalledWith(adam);
});

test('an open dialogue or dead character cannot start another interaction', () => {
    const {game, modal} = setup(); modal(true); game.interact();
    modal(false); game.player.isDead = true; game.interact();
    expect(game.makeNpcTalk).not.toHaveBeenCalled();
});

test('active story markers use E before nearby dialogue and ordinary tile actions still work', () => {
    const {game, scenery, adam, bstrat} = setup(); const marker = {id: 'letters'};
    scenery.nearestAction.mockReturnValue(marker); game.interact();
    expect(scenery.execute).toHaveBeenCalledWith(game, marker);
    expect(game.makeNpcTalk).not.toHaveBeenCalled();
    scenery.nearestAction.mockReturnValue(undefined);
    adam.kind = bstrat.kind = 2; const eventBoard = {action: 'event_board'};
    game.map.findNearestActionTileAround.mockReturnValue(eventBoard); game.interact();
    expect(game.runTileAction).toHaveBeenCalledWith(eventBoard);
});

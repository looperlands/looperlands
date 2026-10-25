const fs = require('fs');
const vm = require('vm');
let methods;
vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), {
    Class: {extend: definition => definition},
    define: (_, factory) => {methods = factory();},
    Types: {isNpc: kind => kind === 'npc'},
    $: () => ({hasClass: () => false}),
});

function setup() {
    return {
        renderer: {mobile: true}, gamepadListener: {isActive: () => false},
        player: {gridX: 2, gridY: 2, isAdjacent: () => true},
        getInteractionPrompt: methods.getInteractionPrompt,
        isNearTileAction: methods.isNearTileAction,
        interactAtTile: methods.interactAtTile,
        createBubble: jest.fn(), assignBubbleTo: jest.fn(), destroyBubble: jest.fn(),
        forEachEntityAround: jest.fn(), makeNpcTalk: jest.fn(),
        map: {findNearestActionTileAround: jest.fn()}, runTileAction: jest.fn(),
    };
}

test('mobile tile prompts expose a tappable button and its adjacency check', () => {
    const game = setup(), action = {id: 'tile', gridX: 3, gridY: 2};
    methods.showTileActionBubble.call(game, action, {name: 'Harvest'});
    const [id, markup, showCheck] = game.createBubble.mock.calls[0];
    expect(id).toBe('tile');
    expect(markup).toContain('class="interaction-prompt"');
    expect(markup).toContain('Harvest [Tap]');
    expect(markup).toContain('data-tile-x="3" data-tile-y="2"');
    expect(showCheck()).toBe(true);
    game.player.isAdjacent = () => false;
    expect(showCheck()).toBe(false);
});

test('touch input on a desktop layout also uses the Tap hint, while keyboard and gamepad retain theirs', () => {
    const game = setup();
    game.renderer.mobile = false;
    expect(game.getInteractionPrompt('Talk')).toContain('Talk [E]');
    game.touchListener = {hasTouchInput: true};
    expect(game.getInteractionPrompt('Talk')).toContain('Talk [Tap]');
    game.gamepadListener.isActive = () => true;
    expect(game.getInteractionPrompt('Talk')).toContain('Talk [Left Stick Button]');
});

test('interaction starts adjacent NPC dialogue', () => {
    const game = setup(), npc = {kind: 'npc'};
    game.forEachEntityAround.mockImplementation((x, y, radius, callback) => callback(npc));
    methods.interact.call(game);
    expect(game.makeNpcTalk).toHaveBeenCalledWith(npc);
    expect(game.runTileAction).not.toHaveBeenCalled();
});

test('interaction initiates the nearby tile action when no NPC is present', () => {
    const game = setup(), action = {id: 'tile'};
    game.map.findNearestActionTileAround.mockReturnValue(action);
    methods.interact.call(game);
    expect(game.runTileAction).toHaveBeenCalledWith(action);
});

test('a clicked tile prompt targets that exact placed interaction even when an NPC is nearby',()=>{
    const game=setup(),action={id:'tile-action-3-2',gridX:3,gridY:2};
    game.map.findNearestActionTileAround.mockReturnValue(action);
    methods.interactAtTile.call(game,3,2);
    expect(game.map.findNearestActionTileAround).toHaveBeenCalledWith(3,2,0);
    expect(game.runTileAction).toHaveBeenCalledWith(action);
    expect(game.forEachEntityAround).not.toHaveBeenCalled();
    game.runTileAction.mockClear();game.player.isAdjacent=()=>false;
    methods.interactAtTile.call(game,3,2);expect(game.runTileAction).not.toHaveBeenCalled();
});

test('players standing on a walkable placed interaction can use its prompt',()=>{
    const game=setup(),action={id:'tile-action-2-2',gridX:2,gridY:2};
    game.player.isAdjacent=()=>false;game.map.findNearestActionTileAround.mockReturnValue(action);
    methods.showTileActionBubble.call(game,action,{name:'Open'});
    expect(game.createBubble.mock.calls[0][2]()).toBe(true);
    methods.interactAtTile.call(game,2,2);expect(game.runTileAction).toHaveBeenCalledWith(action);
});

test('standing on a placed interaction gives it keyboard priority over nearby NPCs',()=>{
    const game=setup(),action={id:'tile-action-2-2',gridX:2,gridY:2};
    game.map.authoringActions={'2.2':{action:'chest'}};game.map.findNearestActionTileAround.mockReturnValue(action);
    methods.interact.call(game);
    expect(game.runTileAction).toHaveBeenCalledWith(action);expect(game.makeNpcTalk).not.toHaveBeenCalled();
});

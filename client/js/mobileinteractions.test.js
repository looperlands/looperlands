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

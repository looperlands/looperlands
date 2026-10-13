const fs = require('fs');
const vm = require('vm');
let gameMethods;
vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), {
    Class: {extend: methods => methods}, define: (_, factory) => {gameMethods = factory();},
    setTimeout, clearTimeout,
});

test('clicking an NPC during reveal completes its existing line without advancing server dialogue', () => {
    const text = {isTyping: true, finish: jest.fn()};
    const game = {bubbleManager: {getBubbleById: jest.fn(() => ({dialogueText: text}))},
        checkForQuests: jest.fn(), checkForPartnerTask: jest.fn(), app: {initResourcesDisplay: jest.fn()}};
    gameMethods.makeNpcTalk.call(game, {id: 42});
    expect(text.finish).toHaveBeenCalledTimes(1);
    expect(game.checkForQuests).not.toHaveBeenCalled();
    expect(game.checkForPartnerTask).not.toHaveBeenCalled();
});

test('presentation is passed through for NPC text and omitted for existing chat callers', () => {
    const game = {currentTime: 100, bubbleManager: {create: jest.fn()}};
    gameMethods.createBubble.call(game, 42, 'Hello', undefined, {dialogue: true});
    expect(game.bubbleManager.create).toHaveBeenLastCalledWith(42, 'Hello', 100, undefined, {dialogue: true});
    gameMethods.createBubble.call(game, 7, 'Chat message');
    expect(game.bubbleManager.create).toHaveBeenLastCalledWith(7, 'Chat message', 100, undefined, undefined);
});

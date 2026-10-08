const {Conversation, lines} = require('./worldconversation');
function setup() {
    const view = {nearby: jest.fn(() => true), speech: jest.fn(), replies: jest.fn(), decision: jest.fn(), choose: jest.fn(), close: jest.fn()};
    return {view, conversation: new Conversation(view)};
}
test('player and NPC lines take turns in world bubbles before asking for a real decision', () => {
    const {view, conversation} = setup();
    const node = {playerLine: 'Could we share the basket?', text: ['Of course.', 'Blankets first, then bread.'], decision: true,
        options: [{text: 'Share it', goto: 'share'}, {text: 'Return it', goto: 'return'}]};
    conversation.start(7, node);
    expect(view.speech.mock.calls[0][1]).toEqual({speaker: 'player', text: node.playerLine});
    expect(view.decision).not.toHaveBeenCalled();
    conversation.advance(); conversation.advance();
    expect(view.speech.mock.calls.map(call => call[1].speaker)).toEqual(['player', 'npc', 'npc']);
    conversation.advance();
    expect(view.decision).toHaveBeenCalledWith(7, node);
    expect(conversation.active()).toBe(false);
});
test('ordinary questions stay beneath the NPC and E cannot pick an answer for the player', () => {
    const {view, conversation} = setup();
    const options = [{text: 'What keeps you here?', goto: 'presence'}, {text: 'See you later', goto: 'later'}];
    conversation.start(7, {text: 'How can I help?', options});
    view.speech.mock.calls[0][2]();
    expect(view.replies).toHaveBeenCalledWith(7, 'How can I help?', options, expect.any(Function));
    conversation.advance(); expect(view.choose).not.toHaveBeenCalled();
    view.replies.mock.calls[0][3]('presence');
    expect(view.choose).toHaveBeenCalledWith(7, 'presence');
    expect(view.decision).not.toHaveBeenCalled();
});
test('a single continuation stays in the world, and automatic goto advances only after the last line', () => {
    const {view, conversation} = setup();
    conversation.start(7, {text: 'Let me explain.', options: [{text: 'Go on', goto: 'explain'}], decision: true});
    conversation.advance(); expect(view.decision).not.toHaveBeenCalled();
    view.replies.mock.calls[0][3]('explain');
    conversation.start(7, {text: 'That is why I keep the late shift.', goto: 'welcome'});
    expect(view.choose).toHaveBeenCalledTimes(1);
    conversation.advance(); expect(view.choose).toHaveBeenLastCalledWith(7, 'welcome');
    conversation.start(7, {text: 'Good night.'}); conversation.advance();
    expect(conversation.advance()).toBe(false);
});
test('moving away or talking to a different NPC clears old speech and cannot select stale replies', () => {
    const {view, conversation} = setup();
    conversation.start(7, {text: 'Hello'});
    expect(conversation.advance(8)).toBe(false);
    view.nearby.mockReturnValue(false);
    expect(conversation.advance()).toBe(false);
    expect(view.close).toHaveBeenCalledWith(7);
    view.nearby.mockReturnValue(true); conversation.start(8, {text: 'Welcome'});
    conversation.start(9, {text: 'Hi'});
    expect(view.close).toHaveBeenCalledWith(8);
});
test('long authored speech wraps into readable plain text without dropping paragraphs', () => {
    expect(lines(undefined)).toEqual([]);
    expect(lines(['Hello<br><br>there', '<b>Friend</b>'])).toEqual(['Hello', 'there', 'Friend']);
    const text = 'a word '.repeat(60).trim();
    expect(lines(text).every(line => line.length <= 175)).toBe(true);
    expect(lines(text).join(' ')).toBe(text);
    const {view, conversation} = setup();
    conversation.start(7, {options: [{text: 'Hi', goto: 'hi'}]});
    expect(view.replies).toHaveBeenCalledWith(7, 'What would you like to ask?', expect.any(Array), expect.any(Function));
});

test('keyboard advances speech, highlights replies, chooses only on Enter and closes on Escape', () => {
    const {view, conversation} = setup(); view.highlight = jest.fn();
    expect(conversation.handleKey('Enter')).toBe(false);
    conversation.start(7, {text: ['Hello.', 'How can I help?'], options: [{text: 'Directions', goto: 'directions'}, {text: 'Your news', goto: 'news'}]});
    expect(conversation.handleKey('ArrowUp')).toBe(false);
    conversation.handleKey('e'); conversation.handleKey('Enter');
    expect(view.highlight).toHaveBeenLastCalledWith(0);
    conversation.handleKey('ArrowUp'); expect(view.highlight).toHaveBeenLastCalledWith(1);
    conversation.handleKey('ArrowRight'); expect(view.highlight).toHaveBeenLastCalledWith(0);
    conversation.handleKey('s'); expect(view.highlight).toHaveBeenLastCalledWith(1);
    expect(conversation.handleKey('e')).toBe(true); expect(view.choose).not.toHaveBeenCalled();
    expect(conversation.handleKey('a')).toBe(false);
    conversation.handleKey('Enter'); expect(view.choose).toHaveBeenCalledWith(7, 'news');
    conversation.start(7, {text: 'Goodbye.'}); conversation.handleKey('Escape');
    expect(conversation.active()).toBe(false);
});

test('listening hold renews during reading and releases on close, switching NPC or walking away', () => {
    jest.useFakeTimers();
    const {ListeningHold} = require('./worldconversation');
    const view = {nearby: jest.fn(() => true), listen: jest.fn(), leave: jest.fn()};
    const hold = new ListeningHold(view);
    hold.start(7); jest.advanceTimersByTime(64000);
    expect(view.listen.mock.calls.filter(call => call[1])).toHaveLength(17);
    hold.start(8); expect(view.listen).toHaveBeenCalledWith(7, false);
    view.nearby.mockReturnValue(false); jest.advanceTimersByTime(4000);
    expect(view.listen).toHaveBeenLastCalledWith(8, false); expect(view.leave).toHaveBeenCalledWith(8);
    const calls = view.listen.mock.calls.length; jest.advanceTimersByTime(20000);
    expect(view.listen).toHaveBeenCalledTimes(calls);
    hold.stop(); hold.start(9); hold.stop(); expect(view.listen).toHaveBeenLastCalledWith(9, false);
    jest.useRealTimers();
});

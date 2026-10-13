const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require.resolve('./dialoguetext'), 'utf8');

function load(reduced = false, intl = Intl) {
    let DialogueText, changed;
    const motion = {matches: reduced, addEventListener: (_, callback) => {changed = callback;}, removeEventListener: jest.fn()};
    vm.runInNewContext(source, {
        define: factory => {DialogueText = factory();}, Intl: intl,
        window: {matchMedia: () => motion}, setTimeout, clearTimeout,
    });
    return {DialogueText, motion, reduce: () => changed({matches: true})};
}

function classes() {
    const values = new Set();
    return {add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value)};
}

function line(text, options, reduced) {
    const loaded = load(reduced);
    const root = {classList: classes()};
    const glyphs = loaded.DialogueText.graphemes(text).map(textContent => ({textContent, classList: classes()}));
    // Isolate scheduling from DOM rendering; browser preview exercises the actual DOM preparation.
    class TestLine extends loaded.DialogueText { prepare() {return glyphs;} }
    const controller = new TestLine(root, options);
    return {...loaded, root, glyphs, controller};
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {jest.clearAllTimers(); jest.useRealTimers();});

test('punctuation pauses once and the portrait rests during the pause', () => {
    const speaking = jest.fn(), complete = jest.fn();
    const state = line('A, B.', {onSpeaking: speaking, onComplete: complete});
    expect(state.glyphs[0].classList.contains('revealed')).toBe(true);
    jest.advanceTimersByTime(30);
    expect(state.glyphs[1].classList.contains('revealed')).toBe(true);
    expect(speaking).toHaveBeenLastCalledWith(false);
    jest.advanceTimersByTime(139);
    expect(state.glyphs[2].classList.contains('revealed')).toBe(false);
    jest.advanceTimersByTime(1);
    expect(speaking).toHaveBeenLastCalledWith(true);
    jest.runAllTimers();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(state.controller.isTyping).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    expect(state.DialogueText.delayAfter('.', '.')).toBe(30);
    expect(state.DialogueText.delayAfter('.', ' ')).toBe(300);
    expect(state.DialogueText.delayAfter('…', ' ')).toBe(350);
});

test('skip reveals the entire line once without leaving a scheduled reveal', () => {
    const complete = jest.fn();
    const state = line('Welcome… traveler!', {onComplete: complete});
    state.controller.finish(); state.controller.finish();
    jest.runAllTimers();
    expect(state.glyphs.every(glyph => glyph.classList.contains('revealed'))).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
});

test('a reused popup starts a new letter-pop sequence after its previous line was skipped', () => {
    const state = line('First line', {});
    state.controller.finish();
    expect(state.root.classList.contains('dialogue-instant')).toBe(true);
    class NextLine extends state.DialogueText { prepare() {return state.glyphs;} }
    const next = new NextLine(state.root);
    expect(state.root.classList.contains('dialogue-instant')).toBe(false);
    next.cancel();
});

test('closing or replacing a line stops its timer without completing the old conversation', () => {
    const complete = jest.fn(), speaking = jest.fn();
    const state = line('This line is interrupted.', {onComplete: complete, onSpeaking: speaking});
    state.controller.cancel(); state.controller.finish();
    jest.runAllTimers();
    expect(state.glyphs.filter(glyph => glyph.classList.contains('revealed'))).toHaveLength(1);
    expect(complete).not.toHaveBeenCalled();
    expect(speaking).toHaveBeenLastCalledWith(false);
    expect(state.motion.removeEventListener).toHaveBeenCalled();
});

test('reduced motion completes immediately; switching preferences finishes an active line', () => {
    const complete = jest.fn();
    const instant = line('No animation', {onComplete: complete}, true);
    expect(instant.controller.isTyping).toBe(false);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    const active = line('Still typing', {onComplete: complete});
    active.reduce();
    expect(active.controller.isTyping).toBe(false);
    expect(complete).toHaveBeenCalledTimes(2);
});

test.each([Intl, {}])('Unicode graphemes remain intact with and without Intl.Segmenter (%p)', intl => {
    const {DialogueText} = load(false, intl);
    expect(Array.from(DialogueText.graphemes('A👩🏽‍🚀e\u0301🇳🇱'))).toEqual(['A', '👩🏽‍🚀', 'e\u0301', '🇳🇱']);
});

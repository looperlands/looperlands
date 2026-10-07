const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

function createApp() {
    const document = new EventTarget();
    const elements = new Map();
    const keydownListeners = [];
    const documentEvents = {
        keydown(callback) {
            keydownListeners.push(callback);
            document.addEventListener('keydown', callback);
        },
        off(type) {
            if (type === 'keydown') {
                keydownListeners.forEach(callback => document.removeEventListener(type, callback));
            }
        },
    };
    const $ = selector => {
        if (selector === document) {
            return documentEvents;
        }
        if (!elements.has(selector)) {
            const classes = new Set();
            let value = '';
            const element = {
                addClass(name) { classes.add(name); return this; },
                removeClass(name) { classes.delete(name); return this; },
                hasClass(name) { return classes.has(name); },
                show() { return this; },
                focus: jest.fn(),
                val(nextValue) {
                    if (nextValue === undefined) { return value; }
                    value = nextValue;
                    return this;
                },
            };
            elements.set(selector, element);
        }
        return elements.get(selector);
    };

    let app;
    vm.runInNewContext(appSource, {
        document,
        $,
        axios: { get: () => Promise.resolve({ data: undefined }) },
        Class: { extend: methods => methods },
        define: (dependencies, factory) => { app = factory($); },
    });
    app.game = { started: true };
    return { app, document, $ };
}

test.each([
    ['farming item selection', '#selection-popup', 'closeSelectionPopup'],
    ['NPC dialogue', '#dialogue-popup', 'closeChoicesPopup'],
])('Enter can open chat after closing %s', (name, selector, closeMethod) => {
    const { app, document, $ } = createApp();
    const otherShortcut = jest.fn();
    $(document).keydown(event => {
        if (event.key === 'Enter') {
            app.showChat();
        }
    });
    $(document).keydown(otherShortcut);

    // Both choosing an item and dismissing its popup use this close method.
    for (let i = 0; i < 2; i++) {
        $(selector).removeClass('hidden').addClass('active');
        app[closeMethod]();
        expect($(selector).hasClass('active')).toBe(false);
        expect($(selector).hasClass('hidden')).toBe(true);
    }

    const enter = new Event('keydown');
    enter.key = 'Enter';
    document.dispatchEvent(enter);

    expect($('#chatbox').hasClass('active')).toBe(true);
    expect($('#chatinput').focus).toHaveBeenCalledTimes(1);
    expect(otherShortcut).toHaveBeenCalledTimes(1);
});

function chatEvent(overrides = {}) {
    return {
        which: 13,
        shiftKey: false,
        stopPropagation: jest.fn(),
        preventDefault: jest.fn(),
        ...overrides,
    };
}

test('Enter sends a long multiline message intact and clears the composer', () => {
    const { app, $ } = createApp();
    app.game.player = {};
    app.game.say = jest.fn();
    app.hideChat = jest.fn();
    const message = 'A'.repeat(1999) + '\n' + 'B'.repeat(2000);
    $('#chatinput').val(message);
    const event = chatEvent();

    app.handleChatKeyboardInput(event);

    expect(app.game.say).toHaveBeenCalledWith(message);
    expect($('#chatinput').val()).toBe('');
    expect(app.hideChat).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
});

test.each([
    ['Shift+Enter', { shiftKey: true }],
    ['IME composition', { isComposing: true }],
    ['jQuery IME composition', { originalEvent: { isComposing: true } }],
])('%s keeps the draft open and allows text entry', (name, overrides) => {
    const { app, $ } = createApp();
    app.game.say = jest.fn();
    app.hideChat = jest.fn();
    $('#chatinput').val('draft');
    const event = chatEvent(overrides);

    app.handleChatKeyboardInput(event);

    expect(app.game.say).not.toHaveBeenCalled();
    expect(app.hideChat).not.toHaveBeenCalled();
    expect($('#chatinput').val()).toBe('draft');
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
});

test('Escape closes chat without sending or clearing the draft', () => {
    const { app, $ } = createApp();
    app.game.say = jest.fn();
    app.hideChat = jest.fn();
    $('#chatinput').val('draft');
    app.handleChatKeyboardInput(chatEvent({ which: 27 }));
    expect(app.game.say).not.toHaveBeenCalled();
    expect(app.hideChat).toHaveBeenCalledTimes(1);
    expect($('#chatinput').val()).toBe('draft');
});

test('the Send action ignores whitespace-only multiline drafts', () => {
    const { app, $ } = createApp();
    app.game.player = {};
    app.game.say = jest.fn();
    app.hideChat = jest.fn();
    $('#chatinput').val(' \n\t\n');
    app.sendChatMessage();
    expect(app.game.say).not.toHaveBeenCalled();
});

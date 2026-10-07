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
            const element = {
                addClass(name) { classes.add(name); return this; },
                removeClass(name) { classes.delete(name); return this; },
                hasClass(name) { return classes.has(name); },
                show() { return this; },
                focus: jest.fn(),
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

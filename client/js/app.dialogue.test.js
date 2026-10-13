const fs = require('fs');
const vm = require('vm');
let methods;
vm.runInNewContext(fs.readFileSync(require.resolve('./app'), 'utf8'), {
    Class: {extend: definition => definition}, define: (_, factory) => {methods = factory();},
});

test.each(['Enter', 'e', ' '])('%s during reveal completes text without selecting a response', key => {
    const app = {dialogueText: {isTyping: true, finish: jest.fn()}};
    const event = {key, preventDefault: jest.fn(), stopImmediatePropagation: jest.fn()};
    methods.handleChoiceKeyboardInput.call(app, event);
    expect(app.dialogueText.finish).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1);
});

test('navigation during reveal does not change the selected response', () => {
    const app = {dialogueText: {isTyping: true, finish: jest.fn()}};
    const event = {key: 'ArrowDown', preventDefault: jest.fn(), stopImmediatePropagation: jest.fn()};
    methods.handleChoiceKeyboardInput.call(app, event);
    expect(app.dialogueText.finish).not.toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
});

test('holding Enter after reveal does not confirm a choice', () => {
    const app = {dialogueText: {isTyping: false}};
    const event = {key: 'Enter', repeat: true, preventDefault: jest.fn(), stopImmediatePropagation: jest.fn()};
    methods.handleChoiceKeyboardInput.call(app, event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
});

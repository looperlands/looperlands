const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('arrow keys in focused chat history do not start player movement', () => {
    const history = { tagName: 'DIV', closest: selector => selector === '#global' ? history : null };
    const document = { activeElement: history, addEventListener: jest.fn() };
    const setInterval = jest.fn();
    const source = fs.readFileSync(path.join(__dirname, 'keyboardhandler.js'), 'utf8');
    const KeyboardHandler = vm.runInNewContext(`${source}\nKeyBoardHandler;`, {
        document,
        window: { addEventListener: jest.fn() },
        console: { log: jest.fn() },
        setInterval,
    });
    const handler = new KeyboardHandler({}, { settings: { getRenderText: () => true } });
    handler.handleMovement = jest.fn();
    handler.handleKeyDown({ key: 'ArrowUp', code: 'ArrowUp' });

    expect(handler.keys.arrowup).toBe(0);
    expect(handler.handleMovement).not.toHaveBeenCalled();
    expect(setInterval).not.toHaveBeenCalled();
});

const fs = require('fs');
const vm = require('vm');

function setup() {
    let CursorController;
    vm.runInNewContext(fs.readFileSync(require.resolve('./cursorcontroller'), 'utf8'), {
        define: (_, factory) => { CursorController = factory(); },
    });
    const listeners = {}, windowListeners = {};
    const surface = {classList: {toggle: jest.fn()}};
    const canvas = {tagName: 'CANVAS', parentElement: surface};
    const doc = {
        hidden: false,
        elementFromPoint: jest.fn(() => canvas),
        addEventListener: (name, callback) => { listeners[name] = callback; },
    };
    const controller = new CursorController(surface, doc, {
        addEventListener: (name, callback) => { windowListeners[name] = callback; },
    });
    const move = (overrides = {}) => listeners.pointermove({
        pointerType: 'mouse', clientX: 80, clientY: 120, ...overrides,
    });
    return {controller, doc, surface, canvas, move, listeners, windowListeners};
}

test('shows only one cursor over the world and switches back for UI controls', () => {
    const {controller, doc, surface, move} = setup();
    expect(controller.update(true)).toBe(false);
    move();
    expect(controller.visible).toBe(true);
    expect(doc.elementFromPoint).toHaveBeenLastCalledWith(80, 120);
    expect(surface.classList.toggle).toHaveBeenLastCalledWith('game-cursor-active', true);
    doc.elementFromPoint.mockReturnValue({tagName: 'BUTTON'});
    move();
    expect(controller.visible).toBe(false);
    expect(surface.classList.toggle).toHaveBeenLastCalledWith('game-cursor-active', false);
});

test.each(['DIV', 'INPUT', 'IFRAME', 'CANVAS'])('opening a %s overlay under a stationary pointer hides the game cursor', tagName => {
    const {controller, doc, canvas, move} = setup();
    controller.update(true);
    move();
    doc.elementFromPoint.mockReturnValue({tagName});
    expect(controller.update(true)).toBe(false);
    doc.elementFromPoint.mockReturnValue(canvas);
    expect(controller.update(true)).toBe(true);
});

test('disabling the setting or leaving gameplay restores the system cursor immediately', () => {
    const {controller, surface, move} = setup();
    controller.update(true);
    move();
    expect(controller.update(false)).toBe(false);
    expect(surface.classList.toggle).toHaveBeenLastCalledWith('game-cursor-active', false);
    expect(controller.update(true)).toBe(true);
});

test.each(['blur', 'leave', 'hidden'])('%s clears the last pointer position until a new mouse event', reason => {
    const {controller, doc, move, listeners, windowListeners} = setup();
    controller.update(true);
    move();
    if (reason === 'blur') windowListeners.blur();
    if (reason === 'leave') listeners.pointerout({relatedTarget: null});
    if (reason === 'hidden') {
        doc.hidden = true;
        listeners.visibilitychange();
        doc.hidden = false;
    }
    expect(controller.update(true)).toBe(false);
    move();
    expect(controller.visible).toBe(true);
});

test('moving between DOM elements does not discard the pointer position', () => {
    const {controller, move, listeners, canvas} = setup();
    controller.update(true);
    move();
    listeners.pointerout({relatedTarget: canvas});
    expect(controller.update(true)).toBe(true);
});

test.each(['touch', 'pen'])('%s input does not leave a mouse cursor at a stale location', pointerType => {
    const {controller, move} = setup();
    controller.update(true);
    move();
    move({pointerType});
    expect(controller.update(true)).toBe(false);
});

test('no element outside the viewport means the system cursor remains available', () => {
    const {controller, doc, move} = setup();
    controller.update(true);
    doc.elementFromPoint.mockReturnValue(null);
    move();
    expect(controller.visible).toBe(false);
});

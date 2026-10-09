const fs = require('fs');
const vm = require('vm');

function setup() {
    const handlers = {};
    const windowHandlers = {};
    let captured = null;
    const canvas = {
        addEventListener: (name, fn) => { handlers[name] = fn; },
        setPointerCapture: id => { captured = id; },
        hasPointerCapture: id => captured === id,
        releasePointerCapture: jest.fn(() => { captured = null; }),
    };
    const document = { getElementById: () => canvas, addEventListener: jest.fn() };
    const blocked = jest.fn(() => false);
    const game = {
        keyboardHandler: {movementIsBlocked: blocked, handleMovement: jest.fn()},
        app: {center: jest.fn(), setMouseCoordinates: jest.fn()}, click: jest.fn(),
    };
    const setInterval = jest.fn(() => 1), clearInterval = jest.fn();
    const TouchListener = vm.runInNewContext(`${fs.readFileSync(require.resolve('./touchListener'), 'utf8')}\nTouchListener;`, {
        document, window: {addEventListener: (name, fn) => {windowHandlers[name] = fn;}},
        setInterval, clearInterval, Date,
    });
    const touch = new TouchListener(game);
    const fire = (name, overrides = {}) => handlers[name]({
        pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100,
        target: {tagName: 'CANVAS'}, preventDefault: jest.fn(), ...overrides,
    });
    return {game, touch, fire, setInterval, clearInterval, blocked, windowHandlers, canvas};
}

test('tap invokes world click on release, while a drag only drives movement', () => {
    const {game, touch, fire, setInterval, clearInterval} = setup();
    fire('pointerdown');
    expect(game.click).not.toHaveBeenCalled();
    fire('pointerup');
    expect(game.click).toHaveBeenCalledTimes(1);
    game.click.mockClear();
    fire('pointerdown');
    fire('pointermove', {clientX: 130});
    expect(touch.direction).toEqual({dx: 1, dy: 0});
    expect(game.keyboardHandler.handleMovement).toHaveBeenCalledTimes(1);
    fire('pointermove', {clientX: 130});
    expect(setInterval).toHaveBeenCalledTimes(1);
    fire('pointermove', {clientX: 102});
    expect(touch.direction).toEqual({dx: 0, dy: 0});
    fire('pointerup');
    expect(game.click).not.toHaveBeenCalled();
    expect(clearInterval).toHaveBeenCalledWith(1);
});

test('second finger cannot replace or end the movement finger', () => {
    const {touch, fire, setInterval} = setup();
    fire('pointerdown');
    fire('pointermove', {clientX: 140});
    fire('pointerdown', {pointerId: 2});
    fire('pointermove', {pointerId: 2, clientX: 20});
    fire('pointerup', {pointerId: 2});
    expect(touch.pointerId).toBe(1);
    expect(touch.direction.dx).toBe(1);
    expect(setInterval).toHaveBeenCalledTimes(1);
});

test.each(['pointercancel', 'lostpointercapture', 'blur', 'panel'])('%s clears movement without a world click', type => {
    const {touch, game, fire, blocked, windowHandlers} = setup();
    fire('pointerdown');
    fire('pointermove', {clientY: 130});
    if (type === 'blur') windowHandlers.blur();
    else if (type === 'panel') {blocked.mockReturnValue(true); touch.update();}
    else fire(type);
    expect(touch.pointerId).toBeNull();
    expect(touch.direction).toEqual({dx: 0, dy: 0});
    expect(touch.updateInterval).toBeNull();
    expect(game.click).not.toHaveBeenCalled();
});

test('synthetic click after a drag is suppressed before foreground navigation', () => {
    const {fire} = setup();
    fire('pointerdown');
    fire('pointermove', {clientX: 130});
    fire('pointerup');
    const event = {preventDefault: jest.fn(), stopImmediatePropagation: jest.fn()};
    fire('click', event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopImmediatePropagation).toHaveBeenCalled();
});

test('mouse and overlay controls do not start touch movement', () => {
    const {touch, fire} = setup();
    fire('pointerdown', {pointerType: 'mouse'});
    fire('pointerdown', {target: {tagName: 'BUTTON'}});
    expect(touch.pointerId).toBeNull();
});

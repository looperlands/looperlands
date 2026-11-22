const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

function createApp(reducedMotion = true) {
    let app, playDiagonalWipe, now = 0;
    const nodes = new Map();
    const frames = [];
    let pixels;
    const context = {
        createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)}),
        putImageData: image => {pixels = image.data;},
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('./diagonalwipe'), 'utf8'), {
        define: factory => {playDiagonalWipe = factory();},
        performance: {now: () => now}, requestAnimationFrame: callback => frames.push(callback),
    });
    const document = {
        createElement(tagName) {
            return {
                tagName, children: [], attributes: {}, listeners: {}, style: {}, inert: false, hidden: false,
                getContext: () => context,
                contains(node) {return this === node || this.children.some(child => child.contains(node));},
                setAttribute(name, value) {this.attributes[name] = value;},
                removeAttribute(name) {delete this.attributes[name];},
                appendChild(child) {
                    this.children.push(child);
                    child.isConnected = true;
                    if (child.id) nodes.set(child.id, child);
                },
                addEventListener(type, callback) {this.listeners[type] = callback;},
                focus: jest.fn(function () {document.activeElement = this;}),
            };
        },
        getElementById: id => nodes.get(id),
    };
    document.body = document.createElement('body');
    const container = document.createElement('div');
    container.id = 'container';
    document.body.appendChild(container);
    const viewport = document.createElement('div');
    viewport.id = 'canvas';
    container.appendChild(viewport);
    const foreground = document.createElement('canvas');
    viewport.appendChild(foreground);
    document.activeElement = foreground;
    const bodyClasses = {removeClass: jest.fn(), addClass: jest.fn(), hasClass: jest.fn(() => false)};
    vm.runInNewContext(source, {
        document, setTimeout, clearInterval,
        Class: {extend: value => value},
        define: (names, factory) => {app = factory(...names.map(name => ({
            jquery: () => bodyClasses, diagonalwipe: playDiagonalWipe,
        })[name]));},
    });
    app.game = {renderer: {scale: 2, canvas: {width: 72, height: 48}}};
    app.settings = {getReducedMotion: () => reducedMotion};
    const frameAt = time => {now = time; frames.shift()(time);};
    const mask = () => Array.from(pixels.filter((_, i) => i % 4 === 3));
    return {app, document, container, viewport, foreground, bodyClasses, mask, frameAt, frames};
}

test('reduced-motion travel uses a solid cover and keeps one accessible status overlay', async () => {
    const {app, document, container, foreground, frames} = createApp();
    app.setMapTransition(true);
    const {overlay, status, retry, chooseCharacter} = app.mapTransition;
    expect(overlay.hidden).toBe(false);
    expect(overlay.attributes).toMatchObject({role: 'dialog', 'aria-modal': 'true', 'aria-describedby': status.id});
    expect(status.attributes).toMatchObject({role: 'status', 'aria-live': 'polite'});
    expect(status.textContent).toBe('Loading map…');
    expect(container.inert).toBe(true);
    expect(container.attributes['aria-busy']).toBe('true');
    expect(document.activeElement).toBe(overlay);
    expect(retry.hidden).toBe(true);
    expect(chooseCharacter.hidden).toBe(true);

    app.setMapTransition(true, 'Connecting to map…');
    expect(document.body.children).toHaveLength(2);
    expect(status.textContent).toBe('Connecting to map…');

    expect(app.mapTransition.canvas.style.backgroundColor).toBe('black');
    await app.setMapTransition(false);
    expect(frames).toHaveLength(0);
    expect(overlay.hidden).toBe(true);
    expect(container.inert).toBe(false);
    expect(container.attributes['aria-busy']).toBeUndefined();
    expect(document.activeElement).toBe(foreground);
});

test('the world viewport wipes in six-pixel stairs with a dithered edge while the HUD stays outside the mask', async () => {
    const {app, container, viewport, foreground, document, mask, frameAt} = createApp(false);
    const covered = app.setMapTransition(true, '');
    const {canvas, panel} = app.mapTransition;
    expect(viewport.children).toEqual([foreground, canvas]);
    expect(panel.hidden).toBe(true);
    expect([canvas.width, canvas.height]).toEqual([36, 24]);
    expect(mask().every(alpha => alpha === 0)).toBe(true);
    expect(app.setMapTransition(true, '')).toBe(covered);
    frameAt(275);
    const halfway = mask();
    const block = (x, y) => [0, 1, 36, 37].map(offset => halfway[y * 36 + x + offset]);
    expect(block(0, 0)).toEqual([255, 255, 255, 255]);
    expect(block(24, 0)).toEqual([255, 0, 0, 255]);
    expect(block(18, 6)).toEqual(block(24, 0));
    expect(block(34, 22)).toEqual([0, 0, 0, 0]);
    frameAt(550);
    await covered;
    expect(mask().every(alpha => alpha === 255)).toBe(true);
    const revealed = app.setMapTransition(false);
    frameAt(825);
    expect(mask()).toEqual(halfway.map(alpha => 255 - alpha));
    expect(container.inert).toBe(true);
    frameAt(1100);
    await revealed;
    expect(mask().every(alpha => alpha === 0)).toBe(true);
    expect(canvas.hidden).toBe(true);
    expect(app.isMapTransitionVisible()).toBe(false);
    expect(document.activeElement).toBe(foreground);
});

test('failed travel waits for an explicit retry and returns focus to the loading status', () => {
    const {app, document} = createApp();
    const retryTravel = jest.fn();
    app.setMapTransition(true);
    app.showMapTransitionFailure(retryTravel);
    const {overlay, status, retry, chooseCharacter} = app.mapTransition;
    expect(status.textContent).toBe('Could not load this map. Try again to continue.');
    expect(status.attributes).toMatchObject({role: 'alert', 'aria-live': 'assertive'});
    expect(retry.hidden).toBe(false);
    expect(chooseCharacter.hidden).toBe(false);
    expect(chooseCharacter.href).toBe('https://looperlands.io');
    expect(retryTravel).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(retry);

    retry.onclick();
    expect(retryTravel).toHaveBeenCalledTimes(1);
    expect(retry.onclick).toBeNull();
    expect(retry.hidden).toBe(true);
    expect(chooseCharacter.hidden).toBe(true);
    expect(status.textContent).toBe('Loading map…');
    expect(document.activeElement).toBe(overlay);
});

test('map travel traps Tab and prevents input from reaching game shortcuts', () => {
    const {app, document} = createApp();
    app.setMapTransition(true);
    const {overlay, retry, chooseCharacter} = app.mapTransition;
    const tab = {key: 'Tab', preventDefault: jest.fn(), stopPropagation: jest.fn()};
    overlay.listeners.keydown(tab);
    expect(tab.preventDefault).toHaveBeenCalledTimes(1);
    expect(tab.stopPropagation).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(overlay);

    app.showMapTransitionFailure(jest.fn());
    overlay.listeners.keydown({...tab, shiftKey: true});
    expect(document.activeElement).toBe(chooseCharacter);
    overlay.listeners.keydown(tab);
    expect(document.activeElement).toBe(retry);
    overlay.listeners.keydown(tab);
    expect(document.activeElement).toBe(chooseCharacter);
    const enter = {key: 'Enter', preventDefault: jest.fn(), stopPropagation: jest.fn()};
    overlay.listeners.keydown(enter);
    expect(enter.stopPropagation).toHaveBeenCalledTimes(1);
    expect(enter.preventDefault).not.toHaveBeenCalled();
    const click = {stopPropagation: jest.fn()};
    overlay.listeners.click(click);
    expect(click.stopPropagation).toHaveBeenCalledTimes(1);
});

test('expired travel sessions offer character recovery without a stale retry action', () => {
    const {app, document} = createApp();
    const retryTravel = jest.fn();
    app.showMapTransitionFailure(retryTravel);
    app.showMapTransitionFailure(null, 'Your travel session expired. Choose your character to continue.');
    const {overlay, status, retry, chooseCharacter} = app.mapTransition;
    expect(status.textContent).toBe('Your travel session expired. Choose your character to continue.');
    expect(retry.hidden).toBe(true);
    expect(retry.onclick).toBeNull();
    expect(retryTravel).not.toHaveBeenCalled();
    expect(chooseCharacter.hidden).toBe(false);
    expect(document.activeElement).toBe(chooseCharacter);
    const tab = {key: 'Tab', preventDefault: jest.fn(), stopPropagation: jest.fn()};
    overlay.listeners.keydown(tab);
    expect(document.activeElement).toBe(chooseCharacter);
    overlay.listeners.keydown({...tab, shiftKey: true});
    expect(document.activeElement).toBe(chooseCharacter);
});

test('ending travel before it starts does not mount an overlay or move focus', () => {
    const {app, document, foreground} = createApp();
    app.setMapTransition(false);
    expect(document.body.children).toHaveLength(1);
    expect(document.activeElement).toBe(foreground);
});

test('ordinary startup keeps its intro delay', () => {
    jest.useFakeTimers();
    try {
        const {app, bodyClasses} = createApp();
        const start = jest.fn();
        app.hideIntro(start);
        jest.advanceTimersByTime(999);
        expect(start).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1);
        expect(start).toHaveBeenCalledTimes(1);
        expect(bodyClasses.addClass).toHaveBeenCalledWith('game');
    } finally {
        jest.useRealTimers();
    }
});

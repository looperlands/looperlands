const fs = require('fs');
const path = require('path');
const vm = require('vm');

function camera() {
    const sandbox = {console: {debug() {}}, define(factory) { sandbox.Camera = factory(); }};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'lib/class.js'), 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'camera.js'), 'utf8'), sandbox);
    return new sandbox.Camera({mobile: false, tilesize: 16});
}

// Entity coordinates whose centered-camera target is (x, y).
const target = (x, y = 0) => ({x: x + 240, y: y + 112});

test.each([25, 30, 60, 120, 144])('follows fractional movement without lag or post-stop drift at %i Hz', hz => {
    const view = camera();
    view.follow(target(100, 80));
    for (let frame = 1; frame <= hz; frame++) {
        const x = 100 + frame * 32 / hz, y = 80 - frame * 16 / hz;
        view.follow(target(x, y));
        expect(view.x).toBeCloseTo(x, 10);
        expect(view.y).toBeCloseTo(y, 10);
        // A centered actor must not slide within the viewport while walking.
        expect(Math.round(target(x, y).x - view.x)).toBe(240);
        expect(Math.round(target(x, y).y - view.y)).toBe(112);
    }
    const stopped = [view.x, view.y];
    for (let frame = 0; frame < hz; frame++) {
        view.follow(target(132, 64));
        expect([view.x, view.y]).toEqual(stopped);
    }
});

test('direction changes and teleports follow immediately on both axes', () => {
    const view = camera();
    for (const [x, y] of [[0, 0], [32.25, 16.75], [20.5, 8.5], [400, 500]]) {
        view.follow(target(x, y));
        expect([view.x, view.y]).toEqual([x, y]);
        expect([view.gridX, view.gridY]).toEqual([Math.floor(x / 16), Math.floor(y / 16)]);
    }
});

test('missing follow target leaves explicit positioning intact', () => {
    const view = camera();
    view.setPosition(40.25, 80.75);
    view.follow(null);
    expect([view.x, view.y]).toEqual([40.25, 80.75]);
});

test('bounds clamp following and release immediately when the actor returns', () => {
    const view = camera();
    view.setBoundingBox(0, 0, 40, 20); // viewport 30 by 14: max (160, 96)
    view.follow(target(192, 128));
    expect([view.x, view.y]).toEqual([160, 96]);
    view.follow(target(144.25, 80.75));
    expect([view.x, view.y]).toEqual([144.25, 80.75]);
});

test('small scenes keep the camera centered within their bounds', () => {
    const view = camera();
    view.setBoundingBox(0, 0, 10, 8);
    view.follow(target(0), 0);
    const position = [view.x, view.y];
    view.follow(target(32, 32), 16);
    expect([view.x, view.y]).toEqual(position);
});

test('a map bounds override preserves scene changes until normal following resumes', () => {
    const view = camera();
    view.setBoundingBox(0, 0, 40, 30);
    view.boundsOverride = {x: 0, y: 0, w: 140, h: 120};
    view.setGridPosition(75, 73);
    expect([view.gridX, view.gridY]).toEqual([75, 73]);
    view.setBoundingBox(0, 0, 50, 40);
    expect([view.gridX, view.gridY]).toEqual([75, 73]);
    view.removeBoundingBox({gridX: 15, gridY: 7});
    expect([view.gridX, view.gridY]).toEqual([75, 73]);
    view.setBoundingBox(0, 0, 50, 40);
    view.boundsOverride = null;
    view.checkBounds();
    expect([view.gridX, view.gridY]).toEqual([20, 26]);
});

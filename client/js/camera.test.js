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

test('initial focus snaps to the player, then eases sudden movement', () => {
    const view = camera();
    view.follow(target(100, 80), 0);
    expect([view.x, view.y]).toEqual([100, 80]);
    view.follow(target(132, 96), 40);
    expect(view.x).toBeGreaterThan(100);
    expect(view.x).toBeLessThan(132);
    expect(view.y).toBeGreaterThan(80);
    expect(view.y).toBeLessThan(96);
    expect(view.gridX).toBe(Math.floor(view.x / 16));
});

test.each([25, 30, 60, 120, 144])('easing reaches the same position after equal time at %i Hz', hz => {
    const view = camera();
    view.follow(target(0), 0);
    for (let time = 1000 / hz; time < 200; time += 1000 / hz) {
        view.follow(target(32), time);
    }
    view.follow(target(32), 200);
    expect(view.followX).toBeCloseTo(32 * (1 - Math.exp(-200 / 70)), 8);
    expect(view.x).toBe(30);
});

test('fractional easing settles on the target instead of stalling one pixel short', () => {
    const view = camera();
    view.follow(target(0), 0);
    for (let time = 16; time <= 800; time += 16) view.follow(target(16), time);
    expect(view.x).toBe(16);
});

test('reversing direction starts following back immediately', () => {
    const view = camera();
    view.follow(target(0), 0);
    view.follow(target(32), 80);
    const before = view.x;
    view.follow(target(0), 96);
    expect(view.x).toBeLessThan(before);
    expect(view.x).toBeGreaterThan(0);
});

test('teleports and resumed tabs snap instead of taking a long pan', () => {
    const view = camera();
    view.follow(target(0), 0);
    view.follow(target(400), 16);
    expect(view.x).toBe(400);
    view.follow(target(432), 1000);
    expect(view.x).toBe(432);
});

test('explicit positioning resets smoothing for scene changes and camera modes', () => {
    const view = camera();
    view.follow(target(0), 0);
    view.follow(target(32), 16);
    view.lookAt(target(40));
    expect(view.x).toBe(40);
    view.follow(target(48), 32);
    expect(view.x).toBe(48);
    view.setGridPosition(0, 0);
    view.follow(target(32), 48);
    expect(view.x).toBe(32);
});

test('bounds clamp the eased position without accumulating hidden overshoot', () => {
    const view = camera();
    view.setBoundingBox(0, 0, 40, 20); // camera width 30: max x = 160
    view.follow(target(160), 0);
    for (let time = 16; time <= 160; time += 16) view.follow(target(192), time);
    expect(view.x).toBe(160);
    expect(view.followX).toBe(160);
    view.follow(target(144), 176);
    expect(view.x).toBeLessThan(160);
});

test('small scenes keep the camera centered within their bounds', () => {
    const view = camera();
    view.setBoundingBox(0, 0, 10, 8);
    view.follow(target(0), 0);
    const position = [view.x, view.y];
    view.follow(target(32, 32), 16);
    expect([view.x, view.y]).toEqual(position);
});

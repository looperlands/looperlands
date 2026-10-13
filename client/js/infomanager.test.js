const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup(reducedMotion = false) {
    let InfoManager;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'infomanager.js'), 'utf8'), {
        define: factory => { InfoManager = factory(); },
        Class: {extend: methods => function (...args) { Object.assign(this, methods); this.init(...args); }},
        _: {each: (items, callback) => Object.entries(items).forEach(([key, value]) => callback(value, key))},
    });
    const game = {currentTime: 1000, app: {settings: {getReducedMotion: () => reducedMotion}}};
    return {info: new InfoManager(game), game};
}

test('same-target burst hits combine their exact amounts without restarting their flight', () => {
    const {info, game} = setup();
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    game.currentTime += 50;
    info.addDamageInfo(5, 48, 48, 'inflicted', 7);
    const numbers = Object.values(info.infos);
    expect(numbers).toHaveLength(1);
    expect(numbers[0].value).toBe(15);
    expect(numbers[0].startedAt).toBe(1000);
    expect(numbers[0].initialX).toBe(28);
    expect(numbers[0].fillColor).toBe('white');
});

test('stacking ends 200 ms after the initial hit even while hits keep arriving', () => {
    const {info, game} = setup();
    for (const time of [1000, 1100, 1199, 1200, 1300, 1400]) {
        game.currentTime = time;
        info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    }
    const numbers = Object.values(info.infos);
    expect(numbers.map(number => number.value)).toEqual([15, 10, 5]);
    expect(numbers.map(number => number.initialX)).toEqual([28, 36, 24]);
    info.update(2000);
    expect(Object.values(info.infos).map(number => number.value)).toEqual([10, 5]);
});

test('different targets, text types and critical status never combine', () => {
    const {info} = setup();
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    info.addDamageInfo(5, 32, 48, 'inflicted', 8);
    info.addDamageInfo(-5, 32, 48, 'received', 7);
    info.addDamageInfo('+5', 32, 48, 'healed', 7);
    info.addDamageInfo(5, 32, 48, 'inflicted', 7, true);
    expect(Object.values(info.infos)).toHaveLength(5);
    const [normal, , , , critical] = Object.values(info.infos);
    expect(critical.initialX).not.toBe(normal.initialX);
    expect(critical.fillColor).toBe('#fce045');
    expect(critical.value).toBe('5!');
    expect(critical.baseScale).toBeGreaterThan(normal.baseScale);
    const sameTarget = Object.values(info.infos).filter((number, index) => index !== 1);
    expect(new Set(sameTarget.map(number => number.initialY)).size).toBe(4);
});

test.each([['healed', '+5', '+10'], ['received', -5, -10]])('%s retains its sign when stacking', (type, value, total) => {
    const {info} = setup();
    info.addDamageInfo(value, 32, 48, type, 1);
    info.addDamageInfo(value, 32, 48, type, 1);
    expect(Object.values(info.infos).map(number => number.value)).toEqual([total]);
});

test('labels that are not combat amounts remain independent and retain their old animation', () => {
    const {info} = setup();
    for (const type of ['xp', 'emote', 'fishTrait']) {
        info.addDamageInfo('Hello', 32, 48, type);
        info.addDamageInfo('Hello', 32, 48, type);
    }
    info.update(1500);
    expect(Object.values(info.infos)).toHaveLength(6);
    for (const label of Object.values(info.infos)) {
        expect(label.combat).toBeUndefined();
        expect(label.value).toBe('Hello');
        expect(label.y).toBe(47);
    }
});

test('combat text expires after a long frame gap and releases its lane state', () => {
    const {info} = setup();
    info.addDamageInfo(-5, 32, 48, 'received', 1);
    info.update(5000);
    expect(Object.keys(info.infos)).toHaveLength(0);
    expect(Object.keys(info.damageLanes)).toHaveLength(0);
    expect(Object.keys(info.damageStacks)).toHaveLength(0);
});

test.each([false, true])('reduced motion=%s preserves the readable hold and fade', reducedMotion => {
    const {info} = setup(reducedMotion);
    info.addDamageInfo('+5', 32, 48, 'healed', 1);
    info.update(1500);
    const number = Object.values(info.infos)[0];
    expect(number.y).toBe(reducedMotion ? 48 : 38);
    expect(number.x).toBe(reducedMotion ? 28 : 24);
    expect(number.opacity).toBe(1);
    if (reducedMotion) {
        expect(number.rotation).toBe(0);
        expect(number.textScale).toBe(number.baseScale);
    }
    expect(number.fillColor).toBe('rgb(80, 255, 80)');
    info.update(1825);
    expect(number.opacity).toBeCloseTo(0.25);
});

test('animation is independent of frame rate and larger amounts have bounded emphasis', () => {
    const direct = setup().info, stepped = setup().info;
    for (const manager of [direct, stepped]) manager.addDamageInfo(500, 32, 48, 'inflicted', 7);
    for (let time = 1000; time < 1825; time += 16) stepped.update(time);
    direct.update(1825); stepped.update(1825);
    const a = Object.values(direct.infos)[0], b = Object.values(stepped.infos)[0];
    for (const key of ['x', 'y', 'textScale', 'rotation', 'opacity']) expect(a[key]).toBeCloseTo(b[key]);
    const {info} = setup();
    info.addDamageInfo(1, 32, 48, 'inflicted', 1);
    info.addDamageInfo(1e12, 32, 48, 'inflicted', 2);
    const [small, large] = Object.values(info.infos);
    expect(large.baseScale).toBeGreaterThan(small.baseScale);
    expect(large.baseScale).toBeLessThanOrEqual(1.3);
    info.update(1040);
    expect(small.textScale).toBeGreaterThan(small.baseScale);
    info.update(1200);
    expect(small.textScale).toBe(small.baseScale);
});

test('clearing the manager discards text and lane state without reusing IDs', () => {
    const {info} = setup();
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    const firstId = Object.keys(info.infos)[0];
    info.clear();
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    expect(Object.keys(info.infos)).not.toContain(firstId);
    expect(Object.values(info.infos)[0].x).toBe(28);
});

test.each([1, 2, 3])('combat transforms and a defined font size reach the renderer at scale %s', scale => {
    const {info} = setup();
    info.addDamageInfo(25, 32, 48, 'inflicted', 7);
    info.addDamageInfo('+10 XP', 32, 48, 'xp');
    const sandbox = {define: (dependencies, factory) => {sandbox.Renderer = factory();}};
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'lib/class.js'), 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8'), sandbox);
    const renderer = Object.assign(Object.create(sandbox.Renderer.prototype), {scale, game: {infoManager: info}});
    const [combat, xp] = renderer.drawCombatInfo();
    expect(combat).toMatchObject({fontSize: 10 * scale, fontWeight: 'bold', textScale: expect.any(Number), rotation: expect.any(Number)});
    expect(xp).toMatchObject({fontSize: 10 * scale, text: '+10 XP'});
    expect(xp.textScale).toBeUndefined();
    expect(xp.fontWeight).toBeUndefined();
});

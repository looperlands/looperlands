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

test('identical hits in the same frame remain distinct and get separate lanes', () => {
    const {info, game} = setup();
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    info.addDamageInfo(5, 32, 48, 'inflicted', 7);
    game.currentTime += 50;
    info.addDamageInfo(5, 48, 48, 'inflicted', 7);
    const numbers = Object.values(info.infos);
    expect(numbers).toHaveLength(3);
    expect(numbers.map(number => number.x)).toEqual([28, 36, 40]);
    expect(numbers[0].fillColor).toBe('white');
});

test('combat text expires after a long frame gap and releases its lane state', () => {
    const {info} = setup();
    info.addDamageInfo(-5, 32, 48, 'received', 1);
    info.update(5000);
    expect(Object.keys(info.infos)).toHaveLength(0);
    expect(Object.keys(info.damageLanes)).toHaveLength(0);
});

test.each([false, true])('reduced motion=%s controls vertical travel while preserving fading', reducedMotion => {
    const {info} = setup(reducedMotion);
    info.addDamageInfo('+5', 32, 48, 'healed', 1);
    info.update(1500);
    const number = Object.values(info.infos)[0];
    expect(number.y).toBe(reducedMotion ? 48 : 42);
    expect(number.opacity).toBe(0.5);
    expect(number.fillColor).toBe('rgb(80, 255, 80)');
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

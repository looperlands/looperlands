const E = require('./sceneenvironment');
const clone = value => JSON.parse(JSON.stringify(value));
test('all authored examples satisfy the shared contract', () => {
    for (const id of ['main', 'm88n']) {
        expect(E.weather(require('../../tools/worlds/' + id + '.json').weather)).toBeTruthy();
        for (const row of require('../../tools/worlds/' + id + '.json').atmosphere) {
        for (const key of ['dayNight', 'weather', 'parallax']) if (row[key]) expect(E[key](row[key])).toBe(row[key]);
    }}
});
test('invalid timing, image sources and unbounded effects are rejected before saving', () => {
    expect(() => E.dayNight({...E.defaults.dayNight, dawn: 18})).toThrow('Dawn');
    expect(() => E.dayNight({...E.defaults.dayNight, dusk: 23, duskDuration: 2})).toThrow('midnight');
    expect(() => E.weather({...E.defaults.weather, wind: Infinity})).toThrow('Wind');
    const weather = clone(E.defaults.weather); weather.sequence[0].duration = 10;
    expect(() => E.weather(weather)).toThrow('Transitions');
    const layer = {image: '/img/parallax/clouds.png', plane: 'foreground', width: 384, height: 320};
    expect(() => E.parallax({layers: [{...layer, image: 'https://example.org/clouds.png'}]})).toThrow('registered');
    expect(() => E.parallax({layers: [{...layer, factorX: 10}]})).toThrow('factorX');
    expect(() => E.parallax({layers: Array(9).fill(layer)})).toThrow('eight');
    expect(() => E.parallax({layers: [layer], cutoutColors: [[1, 2, 3]]})).toThrow('background');
});

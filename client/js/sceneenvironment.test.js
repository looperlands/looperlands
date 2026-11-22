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

test('shadow repeat spacing is bounded and Duckville examples satisfy the authoring contract', () => {
    for (const row of require('../../tools/worlds/duckville.json').atmosphere) if (row.parallax) E.parallax(row.parallax);
    const layer = {image: '/img/parallax/dragon-shadow.png', plane: 'ground', width: 288, height: 288, spacingX: 640, spacingY: 1280};
    expect(E.parallax({layers: [layer]})).toBeTruthy();
    for (const invalid of [{spacingX: 200}, {spacingY: Infinity}, {spacingY: 4097}]) {
        expect(() => E.parallax({layers: [{...layer, ...invalid}]})).toThrow(/spacing/);
    }
});


test('curved flight and scene visibility accept only bounded values', () => {
    const layer = {image: '/img/parallax/bird-shadow.png', plane: 'ground', width: 40, height: 40,
        orbitRadius: 88, orbitPeriod: 7, rotateToPath: true, activeSceneOnly: true};
    expect(E.parallax({layers: [layer]})).toBeTruthy();
    for (const invalid of [{orbitRadius: 257}, {orbitPeriod: 0}, {rotateToPath: 'yes'}, {activeSceneOnly: 1}]) {
        expect(() => E.parallax({layers: [{...layer, ...invalid}]})).toThrow();
    }
});

test('individual orbit and height variation reject unbounded inputs', () => {
    const layer = {image: '/img/parallax/bird-shadow.png', plane: 'ground', width: 40, height: 40,
        orbitVariation: 1, scaleVariation: .5};
    expect(E.parallax({layers: [layer]})).toBeTruthy();
    for (const invalid of [{orbitVariation: -1}, {orbitVariation: 1.1}, {scaleVariation: .8}, {scaleVariation: NaN}]) {
        expect(() => E.parallax({layers: [{...layer, ...invalid}]})).toThrow();
    }
});

test('background emission is opt-in, bounded and rejected on occluding planes', () => {
    const base = {image: '/img/parallax/lava-depth.png', plane: 'background', width: 384, height: 384};
    expect(E.parallax({layers: [{...base, emissionIntensity: .65}]})).toBeTruthy();
    for (const invalid of [-.1, 1.01, NaN, Infinity]) {
        expect(() => E.parallax({layers: [{...base, emissionIntensity: invalid}]})).toThrow();
    }
    expect(() => E.parallax({layers: [{...base, plane: 'foreground', emissionIntensity: .5}]})).toThrow('background');
    expect(() => E.parallax({layers: [{...base, placed: true, emissionIntensity: .5}]})).toThrow('unplaced');
});

test('light spill requires exposed luminous background and bounded authoring values', () => {
    const base = {image: '/img/parallax/lava-depth.png', plane: 'background', width: 384, height: 384,
        emissionIntensity: .65, illuminationIntensity: .7, illuminationRadius: 40};
    expect(E.parallax({layers: [base], cutoutColors: [[254, 173, 2]]})).toBeTruthy();
    for (const invalid of [-1, 1.01, NaN, Infinity]) {
        expect(() => E.parallax({layers: [{...base, illuminationIntensity: invalid}], cutoutColors: [[254, 173, 2]]})).toThrow();
    }
    for (const invalid of [7, 65, NaN]) {
        expect(() => E.parallax({layers: [{...base, illuminationRadius: invalid}], cutoutColors: [[254, 173, 2]]})).toThrow();
    }
    expect(() => E.parallax({layers: [base]})).toThrow('cutout');
    expect(() => E.parallax({layers: [{...base, emissionIntensity: 0}], cutoutColors: [[254,173,2]]})).toThrow('luminous');
    expect(() => E.parallax({layers: [{...base, plane: 'foreground'}], cutoutColors: [[254,173,2]]})).toThrow('background');
});

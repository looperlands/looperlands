const Fx = require('./worldfxconfig');

test('Tiled string properties and presets normalize into bounded authoring data', () => {
    expect(Fx.ambient('forest')).toEqual([{type: 'leaves', count: 9}, {type: 'pollen', count: 4}]);
    expect(Fx.ambient('[{"type":"fireflies","count":6}]')).toEqual([{type: 'fireflies', count: 6}]);
    expect(Fx.ambient(false)).toEqual([]);
    expect(Fx.scenery('{"fires":[{"x":16,"y":32,"width":48,"height":16}]}').fires).toEqual([{x: 16, y: 32, width: 48, height: 16}]);
});
test.each([{count: 999}, {colors: []}, {colors: ['red']}, {preset: 'unknown'}, {gravity: Infinity}, {lifetimeMs: 1}, {unknown: 1}])('invalid bursts are rejected before rendering: %j', spec => {
    expect(() => Fx.burst(spec)).toThrow();
});
test.each(['unknown', [{type: 'leaves', count: 25}], [{type: 'leaves', count: 20}, {type: 'pollen', count: 20}]])('invalid ambience is rejected: %j', spec => {
    expect(() => Fx.ambient(spec)).toThrow();
});
test('per-action opt-out and palette overrides preserve defaults for other stages', () => {
    const config = {stages: {prepare: false, harvest: {preset: 'leaves', colors: ['#ffcc00'], count: 4}}};
    expect(Fx.stageBurst(config, 'prepare')).toBeNull();
    expect(Fx.stageBurst(false, 'plant')).toBeNull();
    expect(Fx.stageBurst(config, 'harvest')).toMatchObject({preset: 'leaves', colors: ['#ffcc00'], count: 4});
    expect(Fx.stageBurst(config, 'water').preset).toBe('water');
});
test('scene geometry and named toggles are validated', () => {
    expect(() => Fx.scenery({enabled: {heat: 'yes'}})).toThrow();
    expect(() => Fx.scenery({enabled: {unknown: true}})).toThrow();
    expect(() => Fx.scenery({fires: [{x: 0, y: 0, width: 2048, height: 1}]})).toThrow();
    expect(() => Fx.scenery({enabled: {heat: true}})).not.toThrow();
    expect(() => Fx.scenery({enabled: {rain: true}})).toThrow();
});

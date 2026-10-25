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

test('custom ambience and bursts share a cloned, bounded appearance contract', () => {
    const design = {colors: ['#123456', '#ffffff'], shape: 'star', size: 8, velocityX: -40, glow: 24};
    const effect = Fx.ambient([{type: 'custom', count: 12, design}])[0];
    expect(effect.design).toMatchObject(design);
    expect(effect.design).toHaveProperty('opacity', 0.8);
    effect.design.colors.push('#abcdef');
    expect(design.colors).toHaveLength(2);
    expect(Fx.burst({preset: 'sparks', design})).toMatchObject({size: 8, colors: design.colors, design});
    expect(Fx.stageBurst({stages: {open: {preset: 'sparks', design}}}, 'open').design.shape).toBe('star');
});

test.each([{shape: 'unknown'}, {size: 9}, {size: 1.5}, {opacity: -0.1}, {velocityX: 81}, {velocityY: NaN},
    {sway: 33}, {glow: 25}, {spin: Infinity}, {pulse: 2}, {colors: []}, {colors: ['red']}, {colors: Array(7).fill('#ffffff')}, {code: 'run()'}, null])(
    'custom particle designs reject unsafe or unbounded settings: %j', design => {
        expect(() => Fx.ambient([{type: 'custom', count: 1, design}])).toThrow();
        expect(() => Fx.burst({design})).toThrow();
    });

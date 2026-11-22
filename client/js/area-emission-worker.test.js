const {build} = require('./area-emission-worker');

test('exposed lava emits a warm field that falls off smoothly and stops at the radius', () => {
    const mask = new Uint8Array(21 * 21);
    mask[10 * 21 + 10] = 1;
    const {light: pixels, bounce} = build(mask, 21, 21, 8);
    const alpha = (x, y) => pixels[(y * 21 + x) * 4 + 3];
    expect(alpha(10, 10)).toBe(190);
    expect(alpha(12, 10)).toBeGreaterThan(alpha(14, 10));
    expect(alpha(14, 10)).toBeGreaterThan(alpha(17, 10));
    expect(alpha(18, 10)).toBe(0);
    expect(bounce[(10 * 21 + 10) * 4 + 3]).toBe(0);
    expect(bounce[(10 * 21 + 12) * 4 + 3]).toBe(alpha(12, 10));
    expect(bounce[(10 * 21 + 18) * 4 + 3]).toBe(0);
    expect(pixels.slice((10 * 21 + 10) * 4, (10 * 21 + 10) * 4 + 3)).toEqual(new Uint8ClampedArray([255,154,62]));
});

test('adjacent exposed cells form a continuous source, not separate spotlights', () => {
    const mask = new Uint8Array(30 * 10);
    for (let x = 6; x <= 23; x++) mask[5 * 30 + x] = 1;
    const {light: pixels} = build(mask, 30, 10, 5);
    const alpha = (x, y) => pixels[(y * 30 + x) * 4 + 3];
    expect(alpha(9, 5)).toBe(alpha(21, 5));
    expect(alpha(15, 7)).toBeGreaterThan(0);
    expect(alpha(0, 5)).toBe(0);
});

test('no cutout leaves the lightmap transparent and invalid input is rejected', () => {
    const field = build(new Uint8Array(64), 8, 8, 6);
    expect(field.light.every(pixel => pixel === 0)).toBe(true);
    expect(field.bounce.every(pixel => pixel === 0)).toBe(true);
    expect(() => build(new Uint8Array(5), 8, 8, 6)).toThrow('Invalid emission mask');
});

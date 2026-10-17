const fs = require('fs'), vm = require('vm');
const source = fs.readFileSync(require.resolve('./renderer-webworker'), 'utf8');
const draw = vm.runInNewContext(source + '\ndrawDissolvingSprite;', {self: {}, console});
function frame(visible, scatter = false) {
    const ctx = {drawImage: jest.fn()};
    draw(ctx, 'sprite', 32, 64, 16, 32, -8, -16, 48, 96, {visible, pixelSize: 3, scatter});
    return ctx.drawImage.mock.calls;
}

test('dissolve renders exact full and empty endpoints', () => {
    expect(frame(1)).toEqual([['sprite', 32, 64, 16, 32, -8, -16, 48, 96]]);
    expect(frame(0)).toEqual([]);
});

test('pixel masks are stable, monotonic, bounded and use original sprite colors', () => {
    const half = frame(0.5), quarter = frame(0.25);
    expect(frame(0.5)).toEqual(half);
    expect(quarter.length).toBeGreaterThan(0);
    expect(half.length).toBeGreaterThan(128);
    expect(half.length).toBeLessThanOrEqual(512);
    expect(half.length).toBeGreaterThan(quarter.length);
    quarter.forEach(cell => expect(half).toContainEqual(cell));
    half.forEach(([image, x, y, w, h, dx, dy, dw, dh]) => {
        expect(image).toBe('sprite');
        expect(x).toBeGreaterThanOrEqual(32); expect(x + w).toBeLessThanOrEqual(48);
        expect(y).toBeGreaterThanOrEqual(64); expect(y + h).toBeLessThanOrEqual(96);
        expect(w / dw).toBeCloseTo(1 / 3); expect(h / dh).toBeCloseTo(1 / 3);
    });
    expect(frame(0.5, true)).not.toEqual(half);
});

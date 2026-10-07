global.Types = {};
const Utils = require('./utils');

describe('chat sanitization', () => {
    test('preserves multiline text while removing executable HTML', () => {
        const message = 'First line\n<script>alert(1)</script>Second line<img src=x onerror=alert(1)>';
        expect(Utils.sanitize(message)).toBe('First line\nSecond line');
    });

    test('filters whole profanity words without changing innocent substrings', () => {
        expect(Utils.sanitize('SHIT\nshitake')).toBe('****\nshitake');
    });

    test('preserves the configured chat whitelist', () => {
        expect(Utils.sanitize('cornhole wang rigger')).toBe('cornhole wang rigger');
    });
});

describe('bounded values', () => {
    test.each([
        [-1, 0],
        [0, 0],
        [5, 5],
        [10, 10],
        [11, 10],
    ])('clamps %s to %s in the inclusive range 0–10', (value, expected) => {
        expect(Utils.clamp(0, 10, value)).toBe(expected);
    });
});

describe('tile distance', () => {
    test.each([
        [0, 0, 0, 0, 0],
        [0, 0, 4, 0, 4],
        [0, 0, 0, 4, 4],
        [0, 0, 4, 3, 4],
        [0, 0, 3, 4, 4],
        [-2, -3, 2, 1, 4],
    ])('counts grid steps from (%s, %s) to (%s, %s)', (x, y, targetX, targetY, expected) => {
        expect(Utils.distanceTo(x, y, targetX, targetY)).toBe(expected);
        expect(Utils.distanceTo(targetX, targetY, x, y)).toBe(expected);
    });
});

test('random bounds and orientations cover the four valid directions', () => {
    const random = jest.spyOn(Math, 'random');
    random.mockReturnValue(0);
    expect(Utils.randomInt(2, 4)).toBe(2); expect(Utils.randomRange(2, 4)).toBe(2);
    random.mockReturnValue(0.999999);
    expect(Utils.randomInt(2, 4)).toBe(4); expect(Utils.random(4)).toBe(3);
    const Types = require('../../shared/js/gametypes');
    [Types.Orientations.LEFT, Types.Orientations.RIGHT, Types.Orientations.UP, Types.Orientations.DOWN].forEach((orientation, index) => {
        random.mockReturnValue(index / 4); expect(Utils.randomOrientation()).toBe(orientation);
    });
    random.mockRestore();
});

test('shuffle preserves input membership and selection does not mutate its source', () => {
    const source = ['a', 'b', 'c'];
    expect(Utils.shuffleArray([...source]).sort()).toEqual(source);
    expect(source).toContain(Utils.shuffleAndGetRandom(source));
    expect(source).toEqual(['a', 'b', 'c']);
    expect(Utils.shuffleAndGetRandom('single')).toBe('single');
    expect(Utils.Mixin({a: 1}, {b: 2})).toEqual({a: 1, b: 2});
    expect(Utils.Mixin({a: 1}, null)).toEqual({a: 1});
    const id = Utils.getID(); expect(Utils.getID()).toBe(id + 1);
});

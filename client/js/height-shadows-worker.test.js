const {skyLight, bodyHeight, makeStamp, place, shade} = require('./height-shadows-worker');
const WorldTime = require('./worldtime-worker');

function at(hour, cycle) {
    const time = hour / 24 * WorldTime.duration;
    return skyLight(time, cycle, WorldTime.mainDaylight(time));
}

test('the outdoor clock turns morning shadows through noon and lengthens them before sunset', () => {
    const morning = at(7.5), noon = at(12), evening = at(16.5), moon = at(20);
    expect(morning.x).toBeGreaterThan(.1);
    expect(noon.x).toBeCloseTo(0);
    expect(evening.x).toBeLessThan(-.6);
    expect(Math.hypot(noon.x, noon.y)).toBeLessThan(Math.hypot(evening.x, evening.y));
    expect(moon.strength).toBeGreaterThan(0);
    expect(moon.strength).toBeLessThan(noon.strength);
    expect(at(20 + 24)).toEqual(moon);
});

test('authored dawn and dusk position their own sun and moon', () => {
    const cycle = {dawn: 6, dusk: 17, duskDuration: 1};
    expect(at(7, cycle).x).toBeGreaterThan(1);
    expect(at(12, cycle).x).toBeCloseTo(0);
    expect(at(17, cycle).x).toBeLessThan(-1);
    expect(skyLight(0, cycle, 0).strength).toBeGreaterThan(0);
});

function field(width, height) {
    return {width, height, x: 0, y: 0, face: new Uint8Array(width * height), ground: new Uint8Array(width * height)};
}

test('opaque sprite rows make a vertical face and sloped roof with physical depth', () => {
    const pixels = new Uint8Array(2 * 8 * 4);
    for (let y = 0; y < 8; y++) {
        pixels[y * 8 + 3] = 255;
        pixels[y * 8 + 7] = 90;
    }
    const body = {base: 7, front: 3, slope: .5, depth: 2};
    const stamp = makeStamp(pixels, 2, 8, body);
    expect(Array.from(stamp.face)).toEqual([5,0, 5,0, 4,0, 4,0, 3,0, 2,0, 1,0, 0,0]);
    expect(bodyHeight(-1, 3, .5)).toBe(0);
    const scene = field(24, 24);
    place(scene, stamp, 1, 4, true);
    expect(scene.face[4 * 24 + 2]).toBe(5);
    for (let row = 7; row <= 9; row++) expect(scene.ground[row * 24 + 2]).toBe(5);
    expect(scene.ground[9 * 24 + 1]).toBe(0);
    const receiverOnly = field(24, 24);
    place(receiverOnly, stamp, 1, 4, false, false);
    expect(receiverOnly.face[4 * 24 + 1]).toBe(5);
    expect(receiverOnly.ground.some(Boolean)).toBe(false);
});

function mask(scene, left, top, width, height, x) {
    const result = {width, height, data: new Uint8ClampedArray(width * height * 4)};
    shade(scene, left, top, result, {x, y: 0, strength: .4});
    return result.data.filter((_, i) => i % 4 === 3);
}

test('a tall body casts onto lower receivers and the filtered result stays fixed when scrolling', () => {
    const scene = field(400, 120);
    for (let y = 10; y < 90; y++) scene.ground.fill(40, y * 400 + 165, y * 400 + 178);
    const east = mask(scene, 120, 20, 110, 5, 1);
    const west = mask(scene, 120, 20, 110, 5, -1);
    expect(east[155 - 120]).toBeGreaterThan(25);
    expect(east[190 - 120]).toBe(0);
    expect(west[190 - 120]).toBeGreaterThan(25);
    for (let y = 0; y < 3; y++) {
        const moved = mask(scene, 133, 21 + y, 50, 1, 1);
        expect(moved).toEqual(east.slice((y + 1) * 110 + 13, (y + 1) * 110 + 63));
    }
    scene.face.fill(50);
    expect(mask(scene, 120, 20, 110, 5, 1).some(Boolean)).toBe(false);
});

test.each([[1, 0], [-1, 0], [0, -1], [-1, 1]])(
    'a one-pixel caster makes a continuous shadow along the (%i, %i) light ray',
    (x, y) => {
        const size = 320, middle = 160, height = 140;
        const scene = field(size, size);
        scene.ground[middle * size + middle] = height;
        const view = {width: size, height: size, data: new Uint8ClampedArray(size * size * 4)};
        shade(scene, 0, 0, view, {x, y, strength: .4});
        const alpha = (px, py) => view.data[(py * size + px) * 4 + 3];
        const ray = Array.from({length: height}, (_, distance) =>
            alpha(middle - distance * x, middle - distance * y));
        expect(Math.min(...ray)).toBeGreaterThan(0);
        expect(alpha(middle - height * x, middle - height * y)).toBe(0);
        expect(alpha(middle + x, middle + y)).toBe(0);
        // The neighbouring parallel ray never crosses this caster.
        expect(alpha(middle - 36 * x + y, middle - 36 * y - x)).toBe(0);
    }
);

test('a sloped body receives light across its crown and still shades its vertical front', () => {
    const width = 32, height = 60, base = 59, front = 18;
    const body = {base, front, slope: .68, depth: 8};
    const sprite = new Uint8Array(width * height * 4).fill(255);
    const scene = field(160, 160);
    place(scene, makeStamp(sprite, width, height, body), 50, 20);
    const view = {width, height, data: new Uint8ClampedArray(width * height * 4)};
    shade(scene, 50, 20, view, {x: -.8, y: -.35, strength: .4});
    const alpha = row => view.data[(row * width + 16) * 4 + 3];
    const crown = Array.from({length: base - front}, (_, row) => alpha(row));
    expect(Math.max(...crown)).toBe(0);
    expect(alpha(base - 5)).toBeGreaterThan(75);
});

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
    shade(scene, left, top, result, {x, y: 0, strength: .4}, new Uint8Array((width + 1) * (height + 1)));
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

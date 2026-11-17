const {Pass, skyLight, casterDraw, bodyHeight, makeStamp, makeActorStamp, readProxyTile, place, shade} = require('./height-shadows-worker');
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

test.each([-1.5, 1.5])('light at x=%d travels below a raised board while hitting its posts', x => {
    // A plank spans three tiles, with an eight-pixel opening between the plank and earth.
    const atlas = {width: 48, height: 16, data: new Uint8Array(48 * 16 * 4)};
    for (let y = 0; y < 12; y++) {
        for (let col = 0; col < atlas.width; col++) {
            const plank = y < 4, post = (col >= 1 && col <= 3) || (col >= 44 && col <= 46);
            if (!plank && !post) continue;
            const z = 12 - y;
            atlas.data.set([3 * z - Number(plank), z, 254, 255], (y * atlas.width + col) * 4);
        }
    }
    const scene = field(96, 56);
    for (let tile = 0; tile < 3; tile++) place(scene, readProxyTile(atlas, tile + 1), 24 + 16 * tile, 16);
    const view = {width: scene.width, height: scene.height, data: new Uint8ClampedArray(scene.face.length * 4)};
    const light = {x, y: -.5, strength: .4};
    const alpha = (col, row) => view.data[(row * scene.width + col) * 4 + 3];
    shade(scene, 0, 0, view, light);
    expect(alpha(48, 28)).toBe(0); // Sunlight passes under the board at ground level.
    expect(alpha(x < 0 ? 73 : 23, 29)).toBeGreaterThan(40); // A grounded post casts nearby.
    const castX = x < 0 ? 82 : 14;
    expect(alpha(castX, 33)).toBeGreaterThan(60); // The plank casts farther away.
    // Lift a receiver along the same light ray, first below and then above the plank.
    function onRay(z) {
        const rx = castX - Math.round(-z * x), ry = 33 - z - Math.round(-z * light.y);
        scene.face[ry * scene.width + rx] = z;
        shade(scene, 0, 0, view, light);
        return alpha(rx, ry);
    }
    expect(onRay(5)).toBeGreaterThan(25);
    expect(onRay(18)).toBe(0);
});

test('a trunk hidden by its crown casts its full height from the visible bark footprint', () => {
    const atlas = {width: 16, height: 16, data: new Uint8Array(16 * 16 * 4)};
    atlas.data.set([3 * 5 + 25, 5, 254, 255], (8 * 16 + 7) * 4);
    const scene = field(96, 48);
    place(scene, readProxyTile(atlas, 1), 32, 12);
    expect(scene.face[20 * scene.width + 39]).toBe(5);
    expect(scene.ground[25 * scene.width + 39]).toBe(30);
    expect(scene.ground[26 * scene.width + 39]).toBe(0);
    expect(mask(scene, 0, 25, 96, 1, 1)[22]).toBeGreaterThan(10);
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
        expect(alpha(middle - (height + 3) * x, middle - (height + 3) * y)).toBe(0);
        expect(alpha(middle + 3 * x, middle + 3 * y)).toBe(0);
        // The neighboring ray lies in the penumbra and the lit side beyond it stays clear.
        const core = alpha(middle - 36 * x, middle - 36 * y);
        const edge = alpha(middle - 36 * x + y, middle - 36 * y - x);
        expect(edge).toBeGreaterThan(0);
        expect(edge).toBeLessThan(core);
        expect(alpha(middle - 36 * x + 3 * y, middle - 36 * y - 3 * x)).toBe(0);
        expect(alpha(middle - 120 * x, middle - 120 * y)).toBeLessThan(core);
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

test('upright actors keep the same foot contact and body shape in differently padded animation cells', () => {
    function frame(width, height, left, top) {
        const rgba = new Uint8Array(width * height * 4);
        for (let y = top; y < top + 8; y++) {
            for (let x = left; x < left + 4; x++) rgba[(y * width + x) * 4 + 3] = 255;
        }
        return makeActorStamp(rgba, width, height, 'upright');
    }
    const loose = field(64, 64), tight = field(64, 64);
    place(loose, frame(48, 48, 20, 16), 0, 0, true);
    place(tight, frame(4, 8, 0, 0), 24, 16);
    expect(loose.face).toEqual(tight.face);
    expect(loose.ground).toEqual(tight.ground);
    expect(tight.ground[24 * 64 + 24]).toBeGreaterThan(0);
    expect(tight.ground[25 * 64 + 24]).toBe(0);
});

test('a low animal has a raised torso and a ground-level tail along either axis', () => {
    const width = 23, rgba = new Uint8Array(width * width * 4);
    // A long one-pixel tail extending upwards from a seven-pixel torso.
    for (let y = 1; y <= 18; y++) {
        const half = y < 10 ? 0 : 3;
        for (let x = 11 - half; x <= 11 + half; x++) rgba[(y * width + x) * 4 + 3] = 255;
    }
    const rotated = new Uint8Array(rgba.length);
    for (let y = 0; y < width; y++) for (let x = 0; x < width; x++)
        rotated[(x * width + width - 1 - y) * 4 + 3] = rgba[(y * width + x) * 4 + 3];
    const a = makeActorStamp(rgba, width, width, 'low'), b = makeActorStamp(rotated, width, width, 'low');
    expect(a.face[4 * width + 11]).toBe(1);
    expect(a.face[14 * width + 11]).toBe(7);
    for (let y = 0; y < width; y++) for (let x = 0; x < width; x++)
        expect(b.face[x * width + width - 1 - y]).toBe(a.face[y * width + x]);
});

test.each([7, 12, 16])('a small animal casts a visible shadow outside its painted body at %i:00', hour => {
    // Native alpha silhouette of the first idle_right rat frame, with cell padding cropped.
    const rows = [
        '..........####.........',
        '.........#######.###...',
        '........##############.',
        '.......################',
        '.###..################.',
        '#..####.#############..',
        '.........###########...',
        '..........#####....##..',
    ];
    const width = rows[0].length, pixels = new Uint8Array(width * rows.length * 4);
    rows.forEach((row, y) => [...row].forEach((part, x) => {
        if (part === '#') pixels[(y * width + x) * 4 + 3] = 255;
    }));
    const stamp = makeActorStamp(pixels, width, rows.length, 'low');
    for (const flipped of [false, true]) {
        const left = 16, top = 8, scene = field(56, 32);
        place(scene, stamp, left, top, flipped, true, false);
        const shadow = {width: 56, height: 32, data: new Uint8ClampedArray(56 * 32 * 4)};
        shade(scene, 0, 0, shadow, at(hour));
        let visible = 0;
        for (let y = 0; y < shadow.height; y++) for (let x = 0; x < shadow.width; x++) {
            const bodyX = flipped ? width - 1 - (x - left) : x - left;
            if (rows[y - top]?.[bodyX] === '#') continue;
            if (shadow.data[(y * shadow.width + x) * 4 + 3] >= 24) visible++;
        }
        expect(visible).toBeGreaterThanOrEqual(18);
    }
});

test('the legacy overlay and the proxy pass can share frame eligibility', () => {
    const draw = {shadowBody: 'player', spriteName: 'hero', dW: 96, dH: 96};
    const actor = {drawData: [{spriteName: 'shadow16'}, draw]};
    const images = {hero: {image: {}}};
    expect(casterDraw(actor, images, 2)).toBe(draw);
    expect(casterDraw(actor, {}, 2)).toBeUndefined();
    expect(casterDraw({...actor, globalAlpha: .2}, images, 2)).toBeUndefined();
    expect(casterDraw({...actor, dissolve: {visible: .4}}, images, 2)).toBeUndefined();
    expect(casterDraw(actor, images, .25)).toBeUndefined();
});

test.each(['rat', 'snake'])('highlighting a %s preserves its ground shadow', animal => {
    const terrain = field(32, 32), canvas = {width: 32, height: 32};
    const mask = {...canvas, data: new Uint8ClampedArray(32 * 32 * 4)};
    const pass = Object.assign(Object.create(Pass.prototype), {
        terrain: () => terrain, mask, surface: canvas, face: terrain.face.slice(), ground: terrain.ground.slice(),
        output: {putImageData() {}}, sprites: new WeakMap(),
        read: (pixels, sx, sy, sw, sh, w, h, pose) => makeActorStamp(pixels, w, h, pose)
    });
    const normal = new Uint8Array(8 * 8 * 4), highlight = normal.slice();
    for (let y = 1; y <= 6; y++) for (let x = 1; x <= 6; x++) {
        const i = (y * 8 + x) * 4 + 3;
        if (x > 1 && x < 6 && y > 1 && y < 6) normal[i] = highlight[i] = 255;
        else highlight[i] = 150; // Alpha of the hover outline from Sprite.createSilhouette.
    }
    function cast(name, image) {
        const draw = {shadowBody: 'scenery', spriteName: name, dx: 0, dy: 0, dW: 8, dH: 8};
        pass.draw(canvas, {cameraX: 0, cameraY: 0, scale: 1}, {}, at(16),
            [{translateX: 12, translateY: 8, drawData: [draw]}], {[name]: {image}}, {shadows: true}, []);
        return mask.data.slice();
    }
    const ordinary = cast(animal, normal);
    expect(ordinary.some(Boolean)).toBe(true);
    expect(cast(animal + '_silhouette', highlight)).toEqual(ordinary);
});

test('the world shadow mask keeps actors as casters and shows their faces in inspection mode', () => {
    const canvas = {width: 32, height: 32}, terrain = field(canvas.width, canvas.height);
    const mask = {width: 32, height: 32, data: new Uint8ClampedArray(32 * 32 * 4)};
    const sprite = makeActorStamp(new Uint8Array(4 * 4 * 8).fill(255), 4, 8, 'upright');
    const pass = Object.assign(Object.create(Pass.prototype), {
        terrain: () => terrain, sprite: () => sprite, mask, surface: canvas,
        face: terrain.face.slice(), ground: terrain.ground.slice(), proxyPixels: {...mask, data: mask.data.slice()},
        output: {putImageData: jest.fn()}
    });
    const draw = {shadowBody: 'player', spriteName: 'hero', dx: 0, dy: 0, dW: 4, dH: 8};
    const actors = [{translateX: 10, translateY: 10, drawData: [draw]}];
    const args = [canvas, {cameraX: 0, cameraY: 0, scale: 1}, {}, {x: 1, y: 0, strength: .4},
        actors, {hero: {image: {}}}, {playerShadow: true, shadows: true}, []];
    expect(pass.draw(...args)).toBe(canvas);
    expect(pass.face.some(Boolean)).toBe(false);
    expect(pass.ground.some(Boolean)).toBe(true);
    expect(mask.data.some(Boolean)).toBe(true);
    expect(pass.draw(...args, true)).toBe(canvas);
    expect(pass.proxyPixels.data[(10 * canvas.width + 10) * 4 + 1]).toBeGreaterThan(0);
});

test('a moving canopy casts away from its roots and leaves the cached terrain clear', () => {
    const canvas = {width: 96, height: 56}, terrain = field(canvas.width, canvas.height);
    const mask = {...canvas, data: new Uint8ClampedArray(96 * 56 * 4)};
    const image = {width: 16, height: 8}, pixels = new Uint8Array(16 * 8 * 4).fill(255);
    const pass = Object.assign(Object.create(Pass.prototype), {
        terrain: () => terrain, read: (img, sx, sy, sw, sh, w, h, body) => makeStamp(pixels, w, h, body),
        mask, surface: canvas, face: terrain.face.slice(), ground: terrain.ground.slice(),
        output: {putImageData: jest.fn()}, sprites: new WeakMap()
    });
    const tree = {image, ...image, x: 40, y: 16, body: {base: 20, front: 20, slope: 1, depth: 2, raised: true}};
    const view = {cameraX: 0, cameraY: 0, scale: 1};
    function draw(scenery) {
        pass.draw(canvas, view, {}, {x: 1.5, y: -.5, strength: .4}, [], {}, {shadows: true}, scenery);
        return (x, y) => mask.data[(y * canvas.width + x) * 4 + 3];
    }
    // Exercise the production surface cache across a fixed, moving and removed layer.
    const buffers = {peaks: new Float32Array(96 * 56), blockerHeights: new Uint8Array(96 * 56),
        coverage: new Uint8ClampedArray(100 * 60)};
    pass.shadowBuffers = buffers;
    expect(draw([tree])(23, 43)).toBeGreaterThan(40);
    expect(draw([tree])(47, 36)).toBe(0);
    tree.x += 32;
    expect(draw([tree])(23, 43)).toBe(0);
    expect(draw([tree])(55, 43)).toBeGreaterThan(40);
    expect(draw([])(55, 43)).toBe(0);
    expect(terrain.raised).toBeUndefined();
    // A grounded profile using the same frame has a distinct cached stamp.
    tree.body = {...tree.body, raised: false};
    draw([tree]);
    expect(pass.ground.some(Boolean)).toBe(true);
});

test('map polygon fallbacks yield only to their specific placed and decoded shadow body', () => {
    const map = require('../maps/world_client_main.json');
    const forest = map.scenes.find(scene => scene.name === 'Forest');
    const assembly = require('../../tools/worlds/main.json').atmosphere.find(scene => scene.sceneId === String(forest.id)).parallax;
    const scenery = assembly.placements.map(p => ({rootX: forest.x * 16 + p.x, rootY: forest.y * 16 + p.y}));
    const pass = Object.create(Pass.prototype);
    pass.map = map;
    pass.tile = jest.fn(() => ({}));

    const town = map.shadows.filter(shadow => [620, 621, 623].includes(shadow.id) || (shadow.id >= 671 && shadow.id <= 681));
    const trees = map.shadows.filter(shadow => shadow.id >= 682 && shadow.id <= 694);
    expect(town.filter(shadow => shadow.proxyOwner?.gid)).toHaveLength(14);
    expect(trees.filter(shadow => Number.isInteger(shadow.proxyOwner?.rootX))).toHaveLength(13);
    expect([...town, ...trees].every(s => pass.ownsPointBlocker(s.proxyOwner, scenery))).toBe(true);
    // A disabled parallax layer, missing tileset body, edited map placement or
    // independently authored polygon keeps its ordinary point-light silhouette.
    expect(trees.some(s => pass.ownsPointBlocker(s.proxyOwner, []))).toBe(false);
    expect(pass.ownsPointBlocker(null, scenery)).toBe(false);
    expect(pass.ownsPointBlocker({...town[0].proxyOwner, tileX: 0, tileY: 0}, scenery)).toBe(false);
    pass.tile.mockReturnValue(null);
    expect(pass.ownsPointBlocker(town[0].proxyOwner, scenery)).toBe(false);
});

test('an actor-only pass retains tile-owned authored blockers while the main atlas is loading', () => {
    const owner = {gid: 4, tileX: 0, tileY: 0};
    const pending = Object.create(Pass.prototype);
    expect(pending.ownsPointBlocker(owner, [])).toBe(false);
    const ready = Object.assign(Object.create(Pass.prototype), {map: {width: 1, data: [4]}, tile: () => ({})});
    expect(ready.ownsPointBlocker(owner, [])).toBe(true);
});

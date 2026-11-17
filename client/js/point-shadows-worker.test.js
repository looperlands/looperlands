const {Pass, sourcePosition, makeMask} = require('./point-shadows-worker');
const {readProxyTile, place} = require('./height-shadows-worker');

const scene = () => ({x: 0, y: 0, width: 112, height: 80, ground: new Uint8Array(112 * 80), face: new Uint8Array(112 * 80)});
function sample(field, light, x, y) {
    const bounds = {x: 0, y: 0, right: field.width, bottom: field.height};
    const rgba = new Uint8ClampedArray(field.width * field.height * 4);
    makeMask(field, sourcePosition(field, light), 100, bounds, rgba);
    return rgba[(y * field.width + x) * 4 + 3];
}

test('independent torches on opposite sides of a wall have opposite occlusion', () => {
    const field = scene();
    for (let y = 12; y < 68; y++) field.ground.fill(20, y * field.width + 48, y * field.width + 53);
    const west = {x: 24, y: 30, animation: 'fire'}, east = {...west, x: 80};
    expect(sample(field, west, 72, 40)).toBeGreaterThan(210);
    expect(sample(field, east, 72, 40)).toBe(0);
    expect(sample(field, east, 32, 40)).toBeGreaterThan(210);
    expect(sample(field, west, 32, 40)).toBe(0);
});

test('a short blocker casts a finite shadow and an emitter inside its own solid stays lit', () => {
    const field = scene();
    for (let y = 24; y <= 52; y++) {
        field.ground.fill(4, y * field.width + 44, y * field.width + 47);
        field.ground.fill(14, y * field.width + 21, y * field.width + 28);
    }
    const lamp = {x: 24, y: 26};
    expect(sample(field, lamp, 32, 40)).toBe(0);
    expect(sample(field, lamp, 48, 40)).toBeGreaterThan(50);
    expect(sample(field, lamp, 72, 40)).toBe(0);
});

test('light travels under an elevated plank and is blocked on its way up to a raised receiver', () => {
    const field = scene(), atlas = {width: 16, height: 16, data: new Uint8Array(16 * 16 * 4)};
    for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) {
        const z = 16 - y;
        atlas.data.set([3 * z - 1, z, 252, 255], (y * 16 + x) * 4);
    }
    place(field, readProxyTile(atlas, 1), 46, 24);
    const fire = {x: 24, y: 30, animation: 'fire'};
    expect(sample(field, fire, 72, 40)).toBe(0);
    field.face[24 * field.width + 72] = 16;
    expect(sample(field, fire, 72, 24)).toBeGreaterThan(200);
});

test('visibility reuses an unchanging source and responds to moved caster geometry', () => {
    const previousCanvas = global.OffscreenCanvas;
    const putImageData = jest.fn();
    global.OffscreenCanvas = class {
        constructor(width, height) { Object.assign(this, {width, height}); }
        getContext() { return {createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)}), putImageData}; }
    };
    try {
        const field = scene(), pass = new Pass();
        const frame = {field, terrain: {}, dynamic: [], left: 0, top: 0, width: 112, height: 80, sceneShadows: true};
        const light = {x: 24, y: 30, radius: 6, animation: 'fire'};
        const spot = {stamp: {width: 4, groundTop: 0, ground: new Uint8Array(64).fill(20), face: new Uint8Array(64)},
            x: 48, y: 32, casts: true};
        for (let y = 32; y < 48; y++) field.ground.fill(20, y * field.width + 48, y * field.width + 52);
        frame.dynamic = [spot];
        expect(pass.mask(frame, light).visible).toBe(true);
        expect(pass.mask(frame, {...light, intensity: .31, color: {r: 100}}).visible).toBe(true);
        expect(putImageData).toHaveBeenCalledTimes(1);
        frame.dynamic = [{...spot, x: 180}];
        field.ground.fill(0);
        expect(pass.mask(frame, light)).toBeNull();
    } finally { global.OffscreenCanvas = previousCanvas; }
});

test('a carried source omits its own player while other lights and overlapping mobs keep casting', () => {
    const {Pass: Geometry, makeStamp} = require('./height-shadows-worker');
    const field = scene(), terrain = scene(), pass = Object.create(Geometry.prototype);
    const body = {base: 8, front: 8, slope: 1, depth: 2};
    function actor(width, x, player) {
        const stamp = makeStamp(new Uint8Array(width * 8 * 4).fill(255), width, 8, body);
        place(field, stamp, x, 32, false, true, false);
        return {stamp, x, y: 32, casts: true, player};
    }
    const player = actor(8, 42, true), mob = actor(3, 46, false);
    pass.pointFrame = {field, terrain, dynamic: [player, mob], sceneShadows: true};
    const torch = pass.pointField(), carried = pass.pointField('player');
    expect(torch.ground[40 * field.width + 43]).toBe(8);
    expect(carried.ground[40 * field.width + 43]).toBe(0);
    expect(carried.ground[40 * field.width + 47]).toBe(8);
    expect(pass.pointField().ground[40 * field.width + 43]).toBe(8);
});

test('moving a caster updates its old and new shadow with the same native pixels as tracing the full light', () => {
    const previousCanvas = global.OffscreenCanvas, upload = jest.fn();
    global.OffscreenCanvas = class {
        constructor(width, height) { Object.assign(this, {width, height}); }
        getContext() { return {createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)}), putImageData: upload}; }
    };
    try {
        const {makeStamp} = require('./height-shadows-worker');
        const width = 180, height = 120, terrain = {x: 0, y: 0, width, height,
            face: new Uint8Array(width * height), ground: new Uint8Array(width * height)};
        for (let y = 18; y < 70; y++) terrain.ground[y * width + 82] = 28; // one-pixel wall crossing block boundaries
        for (let y = 43; y < 53; y++) terrain.face.fill(14, y * width + 80, y * width + 95);
        const rail = {width: 16, height: 16, data: new Uint8Array(16 * 16 * 4)};
        for (let x = 0; x < 16; x++) rail.data.set([3 * 8 - 1, 8, 252, 255], x * 4);
        place(terrain, readProxyTile(rail, 1), 59, 38);
        const stamp = makeStamp(new Uint8Array(6 * 5 * 4).fill(255), 6, 5, {base: 5, front: 5, slope: 1, depth: 2});
        const field = {...terrain, ground: terrain.ground.slice()}, pass = new Pass(), light = {x: 49, y: 45, radius: 5};
        const frame = {terrain, field, width: 128, height: 90, left: 22, top: 10, sceneShadows: true};
        for (const x of [95, 98, 107, 103, 42, 75, 140]) {
            field.ground.set(terrain.ground);
            place(field, stamp, x, 61, false, true, false);
            frame.dynamic = [{stamp, x, y: 61, casts: true}];
            const result = pass.mask(frame, light);
            const expected = new Uint8ClampedArray(result.image.data.length);
            makeMask(field, sourcePosition(field, light), 80, result, expected);
            expect(Buffer.from(result.image.data).equals(Buffer.from(expected))).toBe(true);
        }
        expect(upload.mock.calls.some(args => args.length === 7)).toBe(true);
    } finally { global.OffscreenCanvas = previousCanvas; }
});

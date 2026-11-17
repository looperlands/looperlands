const {readProxyTile, place} = require('./height-shadows-worker');

test('GIDs pick baked receivers and cast exactly the encoded physical depth', () => {
    const atlas = {width: 32, height: 32, data: new Uint8ClampedArray(32 * 32 * 4)};
    const first = ((16 + 2) * atlas.width + 16 + 3) * 4;
    atlas.data.set([180, 60, 248, 255], first); // GID 4, local pixel (3, 2)
    atlas.data.set([180, 60, 255, 0], first + 4);

    const stamp = readProxyTile(atlas, 4);
    const world = {x: 0, y: 0, width: 32, height: 100,
        face: new Uint8Array(3200), ground: new Uint8Array(3200)};
    place(world, stamp, 5, 10);

    expect(world.face[12 * 32 + 8]).toBe(60);
    for (let y = 65; y <= 72; y++) expect(world.ground[y * 32 + 8]).toBe(60);
    expect(world.ground[64 * 32 + 8]).toBe(0);
    expect(world.ground[73 * 32 + 8]).toBe(0);
    expect(world.face[12 * 32 + 9]).toBe(0);
    expect(readProxyTile(atlas, 1)).toBeNull();
    expect(readProxyTile(atlas, 5)).toBeNull();
});

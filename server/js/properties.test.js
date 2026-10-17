const fs = require('fs');
const path = require('path');

global.Types = {};
const Types = require('../../shared/js/gametypes');
const Properties = require('./properties');

test.each([
    ['sword1', 0],
    ['axe', 3],
    ['redsword', 8]
])('%s retains its inventory name and weapon rank', (name, rank) => {
    const kind = Types.getKindFromString(name);
    expect(Properties.getWeaponName(kind)).toBe(name);
    expect(Properties.getWeaponLevel(kind)).toBe(rank);
});

const armor = 'NFT_C114f87326C0E07F40e73B6c9fCEa54888c2C67f_8490';
const rangedWeapons = [
    'ee955c3f7980209b84143b0d67f6e6617d22d13cbc8965054305a2080296b273',
    'f49308e033301819885fb9ea18103a27b69eed5138193b3309998d4d2f5fb1e0'
];
const spriteNames = [
    Properties.getCollectableImageName(Types.Entities.M88NTACOSHELL),
    Properties.getCollectableImageName(Types.Entities.M88NHOTDOGBUN),
    'item-energydrink', armor, 'item-' + armor,
    ...rangedWeapons.flatMap(id => ['NFT_short' + id, 'NFT_long' + id])
];

test.each(spriteNames)('%s has matching PNG filenames and dimensions at every scale', name => {
    const client = path.resolve(__dirname, '../../client');
    const sprite = JSON.parse(fs.readFileSync(path.join(client, 'sprites', name + '.json'), 'utf8'));
    expect(sprite.id).toBe(name);
    let baseSize;
    for (const scale of [1, 2, 3]) {
        const png = fs.readFileSync(path.join(client, 'img', String(scale), name + '.png'));
        expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const size = [png.readUInt32BE(16), png.readUInt32BE(20)];
        if (scale === 1) baseSize = size;
        expect(size).toEqual(baseSize.map(dimension => dimension * scale));
        expect(size[0] % (sprite.width * scale)).toBe(0);
        expect(size[1] % (sprite.height * scale)).toBe(0);
    }
});

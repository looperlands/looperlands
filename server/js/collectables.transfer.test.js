global.Types = {};
const Types = require('../../shared/js/gametypes');
const Collectables = require('./collectables');
const Properties = require('./properties');

test.each([
    'KEY_ARACHWEAVE', 'THUDKEY', 'FOREST_KEY', 'ICEKEY1', 'ICEKEY2', 'ICEKEY3', 'ICEKEY4',
    'M88NSKELETONKEY', 'M88NTICKET', 'M88NGOLDENTICKET', 'M88NGEMTICKET', 'M88NCOMPASS',
    'M88NDRSBOOK', 'M88NDINNERBELL', 'M88NBINOCULARS', 'M88NTENTACLE', 'M88NVIPBAG', 'M88NGOLDBAG', 'ORB', 'SATCHEL',
    'HERMITHOME', 'EVERPEAKMAP1', 'EVERPEAKMAP2', 'EVERPEAKMAP3', 'EVERPEAKMAP4',
    'EVERPEAKMAP5', 'PNEUMA_SIGN', 'VILLAGESIGN10', 'M88NGOLDMEDAL', 'M88NSILVERMEDAL', 'M88NBRONZEMEDAL'
])('%s remains personal progression', name => {
    expect(Types.Entities[name]).toBeDefined();
    expect(Collectables.isTransferable(Types.Entities[name])).toBe(false);
});

test('every current item-gated map door requires a non-transferable item', () => {
    const fs = require('fs');
    const path = require('path');
    const directory = path.join(__dirname, '../../client/maps');
    const items = new Set();
    for (const filename of fs.readdirSync(directory).filter(name => /^world_client_.*\.json$/.test(name))) {
        const map = JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8'));
        for (const door of map.doors || []) if (door.titem) items.add(door.titem);
    }
    expect(items.size).toBeGreaterThan(0);
    for (const name of items) {
        const kind = Types.getKindFromString(name);
        expect(kind).toBeDefined();
        expect({name, transferable: Collectables.isTransferable(kind)}).toEqual({name, transferable: false});
    }
});

test('mapmakers can exclude consumables, ordinary items and fish independently of consumption', () => {
    for (const [name, kind] of [['cpotion_s', Types.Entities.CPOTION_S], ['m88nrose', Types.Entities.M88NROSE], ['cobguppy', 'cobguppy']]) {
        const previous = Properties[name];
        const consumable = Collectables.isConsumable(kind);
        expect(Collectables.isTransferable(kind)).toBe(true);
        Properties[name] = {...previous, transferable: false};
        try {
            expect(Collectables.isTransferable(kind)).toBe(false);
            expect(Collectables.isConsumable(kind)).toBe(consumable);
            Properties[name].transferable = true;
            expect(Collectables.isTransferable(kind)).toBe(true);
        } finally {
            if (previous === undefined) delete Properties[name];
            else Properties[name] = previous;
        }
    }
});

test('unknown IDs, item-name aliases, world entities, equipment and NFT quantities are not transferable', () => {
    for (const item of [999999999, 'cpotion_s', 'M88NSKELETONKEY', 'missing-fish', 'toString', Types.Entities.CHEST, Types.Entities.RAT, Types.Entities.SWORD1]) {
        expect(Collectables.isTransferable(item)).toBe(false);
    }
    Types.forEachKind((kind, name) => {
        if (name.startsWith('NFT_')) expect(Collectables.isTransferable(kind)).toBe(false);
    });
});

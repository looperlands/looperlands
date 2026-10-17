const {buildFishingCatalog} = require('./fishingcatalog');
const entry = (id, visibility = 'unknown') => ({id, target: id, category: 'fish', completion: 'catch', visibility, name: id, sprite: id});
const lakes = {pond: {fish: {carp: 'common', trout: 'rare', secret: 'epic', excluded: 'common', impossible: 'invalid'}}};
const readMap = () => ({fishingTiles: {1: 'pond'}});
test('collections include catchable species once and exclude shops, secrets and invalid-rarity fish', () => {
    const guide = {maps: {main: {entries: ['carp', 'trout', 'shop', 'impossible'].map(id => entry(id)).concat([entry('secret', 'secret'), entry('excluded', 'excluded')])}, dry: {entries: []}}};
    const catalog = buildFishingCatalog(guide, lakes, readMap);
    expect(catalog.collections).toHaveLength(1);
    expect(catalog.collections[0].fish).toEqual(['carp', 'trout']);
    expect(catalog.fish.map(fish => fish.id)).toEqual(['carp', 'trout']);
});
test('shared species are global and collection editions depend on membership, not entry order', () => {
    const catalog = entries => buildFishingCatalog({maps: {main: {entries}, other: {entries: [entry('carp')]}}}, lakes, readMap);
    expect(catalog([entry('carp'), entry('trout')]).fish).toHaveLength(2);
    expect(catalog([entry('carp'), entry('trout')]).collections[0].edition).toBe(catalog([entry('trout'), entry('carp')]).collections[0].edition);
    expect(catalog([entry('carp')]).collections[0].edition).not.toBe(catalog([entry('trout'), entry('carp')]).collections[0].edition);
});
test('rarity and minimum fishing level come only from reachable waters', () => {
    const lakes = {pond: {level: 7, fish: {carp: 'rare'}}, river: {level: 3, fish: {carp: 'rare'}}, unused: {level: 1, fish: {carp: 'legendary'}}};
    const guide = {maps: {main: {entries: [entry('carp')]}}};
    const catalog = buildFishingCatalog(guide, lakes, () => ({fishingTiles: {1: 'pond', 2: 'river', 3: 'pond'}}));
    expect(catalog.fish[0]).toMatchObject({rarity: 'rare', habitats: [{collectionId: 'main', rarity: 'rare', minLevel: 3}]});
});
test('varying rarity is retained per map without changing membership editions', () => {
    const guide = {maps: {main: {entries: [entry('carp')]}, other: {entries: [entry('carp')]}}};
    const lakes = {main: {level: 2, fish: {carp: 'common'}}, other: {level: 9, fish: {carp: 'epic'}}};
    const readMap = id => ({fishingTiles: {1: id}});
    const catalog = buildFishingCatalog(guide, lakes, readMap);
    expect(catalog.fish[0]).toMatchObject({rarity: null, habitats: [
        {collectionId: 'main', rarity: 'common', minLevel: 2},
        {collectionId: 'other', rarity: 'epic', minLevel: 9}
    ]});
    lakes.other.fish.carp = 'common';
    expect(buildFishingCatalog(guide, lakes, readMap).collections).toEqual(catalog.collections);
});
test('multiple rarities in one map remain explicit and missing levels stay unknown', () => {
    const guide = {maps: {main: {entries: [entry('carp')]}}};
    const catalog = buildFishingCatalog(guide, {a: {fish: {carp: 'rare'}}, b: {level: 8, fish: {carp: 'epic'}}}, () => ({fishingTiles: {1: 'a', 2: 'b'}}));
    expect(catalog.fish[0]).toMatchObject({rarity: null, habitats: [
        {collectionId: 'main', rarity: 'rare', minLevel: null},
        {collectionId: 'main', rarity: 'epic', minLevel: 8}
    ]});
});

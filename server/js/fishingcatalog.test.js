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

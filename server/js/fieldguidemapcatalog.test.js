global.Types = {};
const Types = require('../../shared/js/gametypes');
const Lakes = require('./lakes');
const Properties = require('./properties');
const {entryFactory, mapCollection} = require('./fieldguidemapcatalog');
const {loadCatalog} = require('./fieldguidecatalog');
const makeEntry = entryFactory(Types, Lakes, Properties);

test('permanently non-combat creatures cannot create impossible guide entries', () => {
    for (const target of ['alaric', 'blackdog', 'turtle', 'villager1', 'cobchicken', 'm88nbabymonkey', 'cobWalkingNpc1']) {
        expect(makeEntry(target)).toBeNull();
        expect(makeEntry(Types.getKindFromString(target))).toBeNull();
    }
    const catalog = loadCatalog(Types, Lakes);
    for (const collection of Object.values(catalog.maps)) {
        expect(collection.entries.some(entry => Properties[entry.target]?.nonCombat)).toBe(false);
    }
});

test('area-damage immunity and temporary friendliness do not exclude combat targets', () => {
    for (const target of ['cobdirt', 'cobhay', 'm88nmine', 'm88ntrainer', 'm88ncow', 'ghostie', 'rat']) {
        expect(makeEntry(target)).toMatchObject({target, category: 'monsters', completion: 'defeat'});
    }
});

test('server non-combat metadata matches permanent friendliness in client mob definitions', () => {
    const fs = require('fs'), vm = require('vm');
    let mobs;
    const Mob = {extend(definition) {return Object.assign(Object.create(this), definition);}};
    vm.runInNewContext(fs.readFileSync(require.resolve('../../client/js/mobs'), 'utf8'), {
        Types, define: (_, factory) => {mobs = factory(Mob, function Timer() {});}
    });
    const nonCombat = [];
    for (const definition of Object.values(mobs)) {
        let kind;
        const mob = new Proxy({_super: (_, value) => {kind = value;}}, {
            get: (object, key) => key in object ? object[key] : () => {}
        });
        definition.init.call(mob, 1);
        const permanent = mob.isFriendly === true && !definition.breakFriendly && !definition.appear;
        const target = Types.getKindAsString(kind);
        expect(!!Properties[target]?.nonCombat).toBe(permanent);
        if (permanent) nonCombat.push(target);
    }
    expect(nonCombat.length).toBeGreaterThan(0);
});

test('actual map membership covers main spawns, drops, chests and boss adds without importing another map', () => {
    const catalog = loadCatalog(Types, Lakes), entries = catalog.maps.main.entries;
    for (const target of ['ogre', 'm88nmine', 'spectre', 'deathknight', 'eye', 'snake', 'skeleton2', 'tentacle', 'tentacle2', 'manacrystal', 'loopring', 'goldensword', 'firefox', 'm88ndiamondworm']) {
        expect(entries.some(entry => entry.target === target)).toBe(true);
    }
    expect(entries.filter(entry => entry.category === 'fish')).toEqual([]);
    expect(entries.some(entry => entry.target === 'cobslimeking')).toBe(false);
    expect(entries.find(entry => entry.id === 'boss').visibility).toBe('secret');
    expect(entries.find(entry => entry.id === 'flask').completion).toBe('loot');
    expect(catalog.maps.main.shops).toEqual(['potionshop', 'blacksmith']);
    expect(catalog.maps.cobsfarm.entries.filter(entry => entry.category === 'fish').map(entry => entry.target).sort()).toEqual(['cobbluegill', 'cobcan', 'cobcruciancarp', 'cobkoi', 'cobtrashbag']);
});
test('new map content, fishing, harvests and quest rewards appear without authoring a second catalog', () => {
    const collection = mapCollection({roamingAreas: [{type: 'rat', nb: 1}, {type: 'boss', nb: 0}], staticEntities: {1: 'king'}, staticChests: [{i: [Types.Entities.GOLD3]}]},
        {fishingTiles: {1: 'cobFarmLake'}, actionTiles: {2: {action: 'farm'}}},
        {farm: {seedItem: 'M88NSEEDS', crops: {a: {yieldItem: 'M88NGRAIN', seedReturnChance: .5, rareDrops: [{item: 'M88NWORM', chance: .1}]}}}},
        [{npc: Types.Entities.KING, reward: {item: Types.Entities.ORE}}], makeEntry, Properties, Types, Lakes);
    const targets = collection.entries.map(entry => entry.target);
    for (const target of ['rat', 'flask', 'GOLD', 'cobguppy', 'cobneon', 'cobgoldfish', 'm88ngrain', 'm88nseeds', 'm88nworm', 'ore']) expect(targets).toContain(target);
    expect(targets).not.toContain('boss');
    expect(targets).not.toContain('GOLD3');
    expect(new Set(targets).size).toBe(targets.length);
});
test('an excluded override stays excluded everywhere it is spawned', () => {
    const factory = entryFactory(Types, Lakes, Properties, {rat: {visibility: 'excluded'}});
    expect(factory('rat').visibility).toBe('excluded');
});
test('partial overrides retain generated identity, category, artwork and completion defaults', () => {
    const factory = entryFactory(Types, Lakes, Properties, {rat: {hint: 'Explore the walls.'}});
    expect(factory(Types.Entities.RAT)).toMatchObject({id: 'rat', target: 'rat', category: 'monsters',
        sprite: 'rat', completion: 'defeat', visibility: 'unknown', hint: 'Explore the walls.'});
    expect(factory('wood').completion).toBe('obtain');
});
test.each([
    {missing: {visibility: 'secret'}}, {rat: {category: 'items'}}, {rat: {target: 'boss'}},
    {rat: {completion: 'catch'}}, {rat: {visibility: 'maybe'}}, {rat: {sprite: '../private'}},
    {rat: {id: 13}}, {rat: {name: ''}}, {rat: {hint: null}}, {rat: null}, {rat: []}
])('malformed overrides are rejected even if their target is not on the current map', overrides => {
    expect(() => entryFactory(Types, Lakes, Properties, overrides)).toThrow('Invalid Field Guide override');
});

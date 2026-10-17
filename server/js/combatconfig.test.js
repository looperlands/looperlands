const fs = require('fs');
global.Types ||= {};
const Types = require('../../shared/js/gametypes');
const {CombatConfig, DEFAULTS, loadConfig} = require('./combatconfig');
const mob = (kind, x = 10, y = 20) => ({kind: Types.getKindFromString(kind), spawningX: x, spawningY: y, x, y});

afterEach(() => jest.restoreAllMocks());

test('unconfigured maps and mobs inherit the global combat defaults', () => {
    expect(loadConfig('map-without-combat-config').forMob(mob('skeleton2'))).toEqual(DEFAULTS);
    expect(DEFAULTS).toEqual({enabled: true, chance: 0.5, minCooldownMs: 2000, maxCooldownMs: 4000, damageMultiplier: 5});
});
test('spawn settings override mob settings, map defaults and global defaults field by field', () => {
    const config = new CombatConfig({defaults: {damageMultiplier: 2}, mobs: {skeleton2: {chance: 0.8, enabled: false}},
        spawns: [{kind: 'skeleton2', x: 10, y: 20, enabled: true, minCooldownMs: 4000}]});
    const skeleton = mob('skeleton2');
    expect(config.forMob(skeleton)).toEqual({...DEFAULTS, damageMultiplier: 2, chance: 0.8, minCooldownMs: 4000});
    skeleton.x = 45; skeleton.y = 77;
    expect(config.forMob(skeleton).minCooldownMs).toBe(4000);
    expect(config.forMob(mob('skeleton2', 11, 20))).toEqual({...DEFAULTS, damageMultiplier: 2, chance: 0.8, enabled: false});
    expect(config.forMob(mob('skeleton', 10, 20))).toEqual({...DEFAULTS, damageMultiplier: 2});
    expect(Object.isFrozen(config.forMob(skeleton))).toBe(true);
});
test('main map examples configure actual mobs and a real Greater Skeleton spawn', () => {
    const config = loadConfig('main'), map = require('../maps/world_server_main.json');
    expect(config.forMob(mob('rat')).enabled).toBe(false);
    expect(config.forMob(mob('skeleton'))).toMatchObject({chance: 0.35, minCooldownMs: 5000, maxCooldownMs: 8000, damageMultiplier: 3});
    expect(config.forMob(mob('skeleton2'))).toMatchObject({chance: 0.75, minCooldownMs: 2500, maxCooldownMs: 4500, damageMultiplier: 4});
    for (const spawn of require('../mob-combat/main.json').spawns) {
        expect(map.staticEntities[String(spawn.y * map.width + spawn.x)]).toBe(spawn.kind);
        expect(config.forMob(mob(spawn.kind, spawn.x, spawn.y))).toMatchObject({chance: 1, minCooldownMs: 3000, maxCooldownMs: 3000});
    }
    expect(config.forMob(mob('deathknight'))).toEqual(DEFAULTS);
    expect(loadConfig('oa').forMob(mob('rat')).enabled).toBe(true);
});
test.each([
    null, [], {unknown: {}}, {defaults: null}, {mobs: null}, {spawns: null},
    {defaults: {chance: -1}}, {defaults: {chance: 1.1}}, {defaults: {chance: '0.5'}},
    {defaults: {chance: NaN}}, {defaults: {damageMultiplier: Infinity}}, {defaults: {damageMultiplier: 0}},
    {defaults: {enabled: 'false'}}, {defaults: {minCooldownMs: 999}}, {defaults: {maxCooldownMs: 1000.5}},
    {defaults: {minCooldownMs: 7000}}, {defaults: {damage: 40}},
    {mobs: []}, {mobs: {skeleton2: {chance: false}}}, {mobs: {skeleton2: null}}, {mobs: {skeleton2: {maxCooldownMs: 1000}}},
    {mobs: {sword1: {enabled: false}}}, {mobs: {greater_skeleton: {enabled: false}}},
    {spawns: {}}, {spawns: [null]}, {spawns: [{kind: 'skeleton2', x: 0, y: 20}]},
    {spawns: [{kind: 'skeleton2', x: 10, y: 20, damageMultiplier: -2}]},
    {spawns: [{kind: 'skeleton2', x: 10, y: 20}, {kind: 'skeleton2', x: 10, y: 20}]}
])('invalid authoring input is rejected: %j', config => {
    expect(() => new CombatConfig(config)).toThrow();
});
test('malformed or invalid config files report their source and retain safe defaults', () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const read = jest.spyOn(fs, 'readFileSync');
    for (const input of ['{', '{"defaults":{"chance":4}}']) {
        read.mockReturnValueOnce(input);
        expect(loadConfig('main').forMob(mob('skeleton2'))).toEqual(DEFAULTS);
        expect(log).toHaveBeenLastCalledWith(expect.stringContaining('mob-combat/main.json'));
    }
});
test('map identifiers cannot load configuration outside the mob-combat directory', () => {
    const read = jest.spyOn(fs, 'readFileSync');
    for (const map of ['../main', '/tmp/main', '', undefined]) expect(loadConfig(map).forMob(mob('rat'))).toEqual(DEFAULTS);
    expect(read).not.toHaveBeenCalled();
});

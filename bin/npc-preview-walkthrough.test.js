global.Types = {};
jest.mock('../server/js/discord', () => ({}));
jest.mock('node-cron', () => ({schedule: jest.fn()}));
const content = require('../server/npc-behaviors/lantern-road');
const picnic = require('../server/npc-behaviors/lantern-picnic');
const {storyData, targetFor, render} = require('./npc-preview-walkthrough');
const {createTestPlayer} = require('./npc-preview-player');
const Formulas = require('../server/js/formulas');
const Properties = require('../server/js/properties');
const Types = require('../shared/js/gametypes');

test('the local test avatar has a true level 100 and a level 100 built-in weapon without changing production properties', () => {
    const before = structuredClone(Properties.goldensword);
    const profile = createTestPlayer(Formulas);
    expect(Formulas.level(profile.xp)).toBe(100);
    expect(profile.weapon).toEqual({kind: 'goldensword', level: 100});
    expect(Types.isWeapon(Types.getKindFromString(profile.weapon.kind))).toBe(true);
    expect(profile.modifiers.moveSpeed).toBeGreaterThan(1);
    expect(profile.modifiers.maxHp).toBeGreaterThan(1);
    expect(profile.modifiers.meleeDamageTaken).toBeLessThan(1);
    expect(Properties.goldensword).toEqual(before);
});

test('walkthrough travel follows mobile NPCs and allows only accepted objectives on the selected route', () => {
    const q = content.quests.find(q => q.id === 'LANTERN_ROAD_WE_TAKE');
    const data = storyData({quests: [{questKey: picnic.INVITE, status: 'FINISHED'}, {questKey: q.id, status: 'IN_PROGRESS'}], choices: ['lantern:caravan-detour']});
    const world = {npcs: {adam: {x: 40, y: 212, behaviorState: {key: 'town-gardener'}}}};
    expect(targetFor('npc:town-gardener', data, world)).toEqual({x: 40, y: 212});
    expect(targetFor('objective:' + q.id + ':detour', data, world)).toEqual({x: 64, y: 77});
    expect(targetFor('objective:' + q.id + ':direct', data, world)).toBeNull();
    expect(targetFor('objective:LANTERN_LONG_TABLE:gather', data, world)).toBeNull();
    expect(targetFor('invented', data, world)).toBeNull();
    expect(targetFor('npc:forest-caretaker', data, world)).toEqual({x: 58, y: 176});
});

test('the walkthrough includes every quest and question while keeping coordinates hidden and preserving saved progress', () => {
    const q = content.quests.find(q => q.id === 'LANTERN_ROAD_WE_TAKE');
    const saved = {quests: [{id: picnic.INVITE, status: 'FINISHED'}, {questKey: q.id, status: 'IN_PROGRESS'}], choices: ['lantern:caravan-detour']};
    const before = structuredClone(saved);
    const html = render(saved, 2);
    for (const quest of [...picnic.quests, ...content.quests]) expect(html).toContain(quest.name.replaceAll("'", '&#39;'));
    expect(html).toContain('selected>2 · Continue your save');
    expect(html).toContain('Completed'); expect(html).toContain('In progress');
    expect(html).toContain('Waiting for'); expect(html).toContain('optional');
    expect(html).toContain('eastern Desert path');
    expect(html).not.toContain('objective:' + q.id + ':direct');
    expect(html).not.toMatch(/\b\d+\s*,\s*\d+\b/);
    expect(saved).toEqual(before);
    const separate = render({quests: [], choices: []}, 1);
    expect(separate).toContain('selected>1 · Separate test save');
    expect(separate).toContain('disabled');
});

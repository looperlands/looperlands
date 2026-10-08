const fs = require('fs');
const vm = require('vm');
const path = require('path');
let Board;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'eventboard.js'), 'utf8'), {
    define: (dependencies, factory) => {Board = factory({}, {duckville: 'The Nexus'});}, URL
});
const start = Date.parse('2026-10-08T12:00:00Z');
const event = {runId: 'round', status: 'live', maps: ['duckville'], startsAt: '2026-10-08T12:00:00Z', endsAt: '2026-10-08T13:00:00Z'};
test('event panel appears only during the round on an explicitly linked map', () => {
    expect(Board.visibleEvents([event], 'duckville', start).length).toBe(1);
    for (const [map, now] of [['main', start], ['duckville', start - 1], ['duckville', start + 3600000]]) expect(Board.visibleEvents([event], map, now).length).toBe(0);
    expect(Board.visibleEvents([{...event, maps: []}, {...event, status: 'upcoming'}], 'duckville', start).length).toBe(0);
});
test('multiple simultaneous events stay independently visible', () => {
    expect(Board.visibleEvents([event, {...event, runId: 'other'}], 'duckville', start).map(row => row.runId)).toEqual(['round', 'other']);
});
test('event links are HTTP(S) links to validated event paths', () => {
    const path = '/events/00000000-0000-4000-8000-000000000001';
    expect(Board.safeDetailsUrl('https://looperlands.io/?token=unused#old', path)).toBe('https://looperlands.io'+path);
    expect(Board.safeDetailsUrl('javascript:alert(1)', path)).toBeNull();
    expect(Board.safeDetailsUrl('https://looperlands.io', '//evil.invalid')).toBeNull();
    expect(Board.safeDetailsUrl('', path)).toBeNull();
});
test('scoring descriptions reflect active seconds, quantities, actions and fishing lakes', () => {
    expect(Board.ruleLabel({type: 'playtime', points: 2, measurement: 'activeSeconds'})).toBe('Active playtime — 2 points per active second');
    expect(Board.ruleLabel({type: 'fishing', points: 3, target: 'guppy', targetLabel: 'Guppy', lake: 'townLake', measurement: 'quantity'})).toBe('Catch fish · Guppy · townLake — 3 points per item');
    expect(Board.ruleLabel({type: 'tile', points: 1, target: '*', stage: 'plant', action: 'farm', measurement: 'count'})).toContain('plant · All targets · farm — 1 point per action');
    expect(Board.ruleLabel({type: 'activeDays', points: 5})).toContain('per active day');
});

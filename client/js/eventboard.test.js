const fs = require('fs');
const vm = require('vm');
const path = require('path');
let Board;
function element(tag) {
    return {tag, children: [], setAttribute() {}, append(...children) {this.children.push(...children);},
        set textContent(value) {this.value = value;},
        get textContent() {return (this.value || '')+this.children.map(child => child.textContent).join(' ');}};
}
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'eventboard.js'), 'utf8'), {
    define: (dependencies, factory) => {Board = factory({}, {duckville: 'The Nexus'});}, URL, document: {createElement: element}
});
const start = Date.parse('2026-10-08T12:00:00Z');
const event = {runId: 'round', status: 'live', maps: ['duckville'], startsAt: '2026-10-08T12:00:00Z', endsAt: '2026-10-08T13:00:00Z'};
test('event panel appears only during the round on an explicitly linked map', () => {
    expect(Board.visibleEvents([event], 'duckville', start).length).toBe(1);
    for (const [map, now] of [['main', start], ['duckville', start - 1], ['duckville', start + 3600000]]) expect(Board.visibleEvents([event], map, now).length).toBe(0);
    expect(Board.visibleEvents([{...event, maps: []}, {...event, status: 'upcoming'}, {...event, isCompetition: false}], 'duckville', start).length).toBe(0);
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

test('multiple targets, actions and stages have readable scoring descriptions', () => {
    expect(Board.ruleLabel({type: 'tile', points: 2, target: ['tomato', 'carrot'], stage: ['plant', 'harvest'], action: ['farm', 'garden'], measurement: 'count'})).toBe('plant, harvest · tomato, carrot · farm, garden — 2 points per action');
    expect(Board.ruleLabel({type: 'kill', points: 1, target: ['12', '13'], targetLabel: 'Skeleton, Ogre', measurement: 'count'})).toBe('Defeat · Skeleton, Ogre — 1 point per action');
});

test('community details show attendance instructions without scoring, sign-up or a broken competition link', () => {
    const board = {date: value => value, maps: () => 'Main map'};
    const detail = Board.prototype.renderDetails.call(board, {isCompetition: false, status: 'upcoming', name: 'Raid Alert!', description: 'Meet at Goose', startsAt: 'start', endsAt: 'end', locationDescription: '@ Goose'});
    expect(detail.textContent).toContain('Meet at Goose');
    expect(detail.textContent).toContain('Main map · @ Goose');
    expect(detail.textContent).toContain('RSVP instructions');
    expect(detail.textContent).not.toContain('How to score');
    expect(detail.textContent).not.toContain('Full event page');
    expect(detail.children.at(-1).children.every(child => child.tag === 'small')).toBe(true);
});

test('standings show ENS first with a subtitle and retain legacy labels and your marker', () => {
    const container = element('div');
    Board.prototype.standings.call({}, container, {teams: [], leaderboard: [
        {rank: 1, ens: 'andre.eth', title: 'Knight', label: 'andre.eth', score: 10, isYou: true},
        {rank: 2, label: 'MossKnight', score: 5}
    ]});
    expect(container.children[0].children[0].children[0].textContent).toBe('#1 andre.eth (You)');
    expect(container.children[0].children[0].children[1].tag).toBe('small');
    expect(container.children[0].children[0].children[1].textContent).toBe('Knight');
    expect(container.children[1].textContent).toContain('#2 MossKnight');
});

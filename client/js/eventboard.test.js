const fs = require('fs');
const vm = require('vm');
const path = require('path');
let Board;
function element(tag) {
    return {tag, children: [], dataset: {}, classList:{toggle() {}}, addEventListener() {}, contains() {return false;}, querySelector() {return null;}, replaceChildren(...children) {this.children = children;}, setAttribute() {}, append(...children) {this.children.push(...children);},
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
test('multi-map rounds follow players between selected maps', () => {
    const round = {...event, maps: ['duckville', 'forest'], allMaps: false};
    for (const map of ['duckville', 'forest']) expect(Board.visibleEvents([round], map, start)).toEqual([round]);
    expect(Board.visibleEvents([round], 'main', start)).toEqual([]);
});
test('explicit all-map rounds appear everywhere while respecting timing and competition status', () => {
    const round = {...event, maps: [], allMaps: true};
    for (const map of ['duckville', 'main', 'new-map']) expect(Board.visibleEvents([round], map, start)).toEqual([round]);
    for (const now of [start - 1, start + 3600000]) expect(Board.visibleEvents([round], 'main', now)).toEqual([]);
    expect(Board.visibleEvents([{...round, isCompetition: false}, {...round, status: 'ended'}], 'main', start)).toEqual([]);
    expect(Board.prototype.maps.call({}, round)).toBe('All maps');
    expect(Board.prototype.maps.call({}, {...event, maps: ['duckville', 'forest']})).toBe('The Nexus, forest');
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

test('daily progress confirms earned points and explains the next streak bonus', () => {
    const dailyPlay = {points: 17, activeDays: 7, streak: 7, checkedInToday: true, todayPoints: 8, nextBonusDay: 14, nextBonusPoints: 7};
    const content = Board.prototype.renderDailyPlay.call({dailyPlay});
    expect(content.textContent).toContain('Total points 17');
    expect(content.textContent).toContain('+8 points earned today');
    expect(content.textContent).toContain('+7 bonus at day 14');
    expect(content.textContent).toContain('00:00 UTC');
    expect(Board.prototype.renderDailyPlay.call({dailyPlay: {...dailyPlay, checkedInToday: false}}).textContent).toContain('Credit appears after activity syncs');
});


test('daily progress never opens or fills the live event HUD', () => {
    const board = {app:{game:{mapId:'main'}}, now:()=>start, live:[], panel:element('aside'), opened:false,
        dailyPlay:{points:1,activeDays:1,streak:1,checkedInToday:true,todayPoints:1,nextBonusDay:3,nextBonusPoints:3},
        renderDailyPlay:Board.prototype.renderDailyPlay, updatePanelTimer:Board.prototype.updatePanelTimer};
    Board.prototype.renderPanel.call(board);
    expect(board.panel.hidden).toBe(true);
    expect(board.panel.textContent).not.toContain('Daily play');
    board.dailyPlay = null;
    Board.prototype.renderPanel.call(board);
    expect(board.panel.hidden).toBe(true);
});

test('UTC reset clears yesterday confirmation and requests fresh progress', () => {
    const board = {app:{game:{started:true,client:{connection:{connected:true}},mapId:'main'}},
        mapId:'main', live:[], dailyPlay:{resetsAt:'2026-10-09T00:00:00Z'},
        now:()=>Date.parse('2026-10-09T00:00:00Z'), renderPanel:jest.fn(), loadLive:jest.fn()};
    Board.prototype.tick.call(board);
    expect(board.dailyPlay).toBeNull();
    expect(board.loadLive).toHaveBeenCalledTimes(1);
});


test('daily progress has its own view and leaves the event browser clear', () => {
    const board = {board:element('section'), events:[], tab:'upcoming', now:()=>start,
        dailyPlay:{points:17,activeDays:7,streak:7,checkedInToday:true,todayPoints:8,nextBonusDay:14,nextBonusPoints:7},
        renderDailyPlay:Board.prototype.renderDailyPlay};
    Board.prototype.renderBoard.call(board);
    expect(board.board.textContent).toContain('Daily play 17 pts');
    expect(board.board.textContent).not.toContain('Today counted!');
    board.tab = 'daily';
    Board.prototype.renderBoard.call(board);
    expect(board.board.textContent).toContain('+8 points earned today');
    expect(board.board.textContent).not.toContain('More adventures on the way');
    board.dailyPlay = null;
    Board.prototype.renderBoard.call(board);
    expect(board.tab).toBe('upcoming');
    expect(board.board.textContent).toContain('More adventures on the way');
});

test('daily progress does not add content to a running event panel', () => {
    const round = {...event, name:'Fishing', teams:[], leaderboard:[], rules:[], prizes:[]};
    const board = {app:{game:{mapId:'duckville'}}, now:()=>start, live:[round], panel:element('aside'), opened:false,
        dailyPlay:{points:99}, standings:()=>{}, detailsLink:()=>null, updatePanelTimer:()=>{}};
    Board.prototype.renderPanel.call(board);
    expect(board.panel.hidden).toBe(false);
    expect(board.panel.textContent).toContain('Fishing');
    expect(board.panel.textContent).not.toContain('Daily play');
});

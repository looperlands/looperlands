const fs = require('fs');
const vm = require('vm');
const path = require('path');
function element(tag) {
    return {tag, children: [], dataset: {}, style: {}, attrs: {}, listeners: {}, hidden: false,
        setAttribute(key, value) {this.attrs[key] = value;},
        append(...children) {this.children.push(...children);},
        addEventListener(type, listener) {this.listeners[type] = listener;},
        set textContent(value) {this.value = String(value); this.children = [];},
        get textContent() {return (this.value || '') + this.children.map(child => child.textContent).join(' ');},
        querySelector() {return null;}, querySelectorAll() {return [];}, contains() {return false;},
    };
}
function load() {
    let Board;
    const axios = {post: jest.fn(), get: jest.fn()};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'questboard.js'), 'utf8'), {
        define: (dependencies, factory) => {Board = factory({main: 'Main map'});},
        document: {createElement: element}, axios, Date, Map, Set,
        crypto: {randomUUID: jest.fn(() => 'request-12345678')},
    });
    return {Board, axios};
}
const {Board} = load();
const now = Date.parse('2026-10-11T10:00:00Z');
const occurrence = (overrides = {}) => ({id: 'today', mapId: 'main', opensAt: now - 1000, acceptUntil: now + 5000, endsAt: now + 10000,
    snapshot: {name: 'Workshop supplies', category: 'requests', objectives: [{id: 'supply', eventType: 'DELIVER_ITEMS', items: [{item: 'hide', amount: 4}, {item: 'ore', amount: 6}]}], rewards: {xp: 80}, recipient: {id: 'crate', label: 'Workshop crate', bounds: {x: 10, y: 10, width: 1, height: 1}}}, ...overrides});
const attempt = (overrides = {}) => ({id: 'accepted', occurrenceId: 'today', status: 'accepted', progress: {}, ...overrides});
function boardState(overrides = {}) {
    return Object.assign(Object.create(Board.prototype), {data: {occurrences: [], attempts: [], inventory: {}}, journal: {}, mapId: 'main', currentBoard: {id: 'town', bounds: {x: 10, y: 10, width: 2, height: 1}},
        app: {sessionId: 'session', game: {mapId: 'main', player: {gridX: 10, gridY: 11}}},
        tab: 'available', filter: 'all', mode: 'board', now: () => now, readPin: () => null, requests: new Map(), render: jest.fn(), setPin: jest.fn(), load: jest.fn(),
        ...overrides});
}
function descendants(root) {return [root, ...root.children.flatMap(descendants)];}
test('requests need the complete basket and do not care where inventory originated', () => {
    expect(Board.readiness(occurrence(), attempt(), {hide: 4, ore: 6}, now).canSettle).toBe(true);
    expect(Board.readiness(occurrence(), attempt(), {hide: 4, ore: 5}, now).canSettle).toBe(false);
    expect(Board.readiness(occurrence(), null, {hide: 4, ore: 6}, now).canSettle).toBe(false);
});
test('combined requests require personal progress in addition to the basket', () => {
    const row = occurrence(); row.snapshot.objectives.unshift({id: 'mine', eventType: 'TILE_ACTION', amount: 6});
    expect(Board.readiness(row, attempt(), {hide: 4, ore: 6}, now).canSettle).toBe(false);
    expect(Board.readiness(row, attempt({progress: {mine: 6}}), {hide: 4, ore: 6}, now).canSettle).toBe(true);
});
test('expired hand-ins cannot settle, while earned action rewards remain claimable', () => {
    const delivery = occurrence({endsAt: now});
    expect(Board.readiness(delivery, attempt({status: 'ready'}), {hide: 4, ore: 6}, now).canSettle).toBe(false);
    const challenge = occurrence({endsAt: now, snapshot: {objectives: [{id: 'kill', eventType: 'KILL_MOB', amount: 3}]}});
    expect(Board.readiness(challenge, attempt({status: 'ready', progress: {kill: 3}}), {}, now).canSettle).toBe(true);
    expect(Board.readiness(challenge, attempt({status: 'accepted', progress: {kill: 3}}), {}, now).canSettle).toBe(false);
});
test('withdrawn and completed attempts cannot settle again', () => {
    for (const status of ['withdrawn', 'completed', 'expired']) expect(Board.readiness(occurrence(), attempt({status}), {hide: 10, ore: 10}, now).canSettle).toBe(false);
});
test('recipient adjacency is exact, does not allow diagonal distance, and respects owning map', () => {
    const board = boardState(), target = occurrence().snapshot.recipient;
    expect(board.near(target, 'main')).toBe(true);
    expect(board.near(target, 'other-map')).toBe(false);
    board.app.game.player.gridX = 11;
    expect(board.near(target, 'main')).toBe(false);
    expect(Board.boundsDistance({x: 10, y: 10, width: 2, height: 2}, 12, 11)).toBe(1);
});
test('additional board placements are discoverable and interactable without Tiled tiles', () => {
    const board = boardState({discovery: {boards: [{id: 'town', bounds: {x: 50, y: 50, width: 1, height: 1}, placements: [{x: 10, y: 10, width: 2, height: 1}]}], handInLocations: []}});
    expect(board.near(board.discovery.boards[0])).toBe(true);
    expect(board.findAction(11, 11)).toMatchObject({targetId: 'town', action: 'quest_board', gridX: 11, gridY: 10});
    expect(board.findAction(11, 12)).toBeNull();
});
test('available, accepted and upcoming occurrences have separate views', () => {
    const current = occurrence(), accepted = occurrence({id: 'mine'}), future = occurrence({id: 'tomorrow', opensAt: now + 1000});
    const board = boardState({data: {occurrences: [current, accepted, future], attempts: [attempt({occurrenceId: 'mine'})]}});
    expect(board.rows().map(row => row.id)).toEqual(['today']);
    board.tab = 'mine'; expect(board.rows().map(row => row.id)).toEqual(['mine']);
    board.tab = 'schedule'; expect(board.rows().map(row => row.id)).toEqual(['tomorrow']);
});
test('journal includes saved occurrences even if the current map no longer publishes them', () => {
    const board = boardState({tab: 'mine', mode: 'journal', data: {occurrences: [], attempts: [attempt({occurrence: occurrence()})]}});
    expect(board.rows()[0].id).toBe('today');
});
test('configured category filters apply to stories and board assignments', () => {
    const board = boardState({currentBoard: {categories: ['challenges']}, data: {occurrences: [occurrence(), occurrence({id: 'challenge', snapshot: {name: 'A challenge', category: 'challenges'}})], stories: [{id: 'story', name: 'Story'}]}});
    expect(board.rows().map(row => row.id)).toEqual(['challenge']);
});
test('a recipient view only shows that recipient on the current map', () => {
    const other = occurrence({id: 'other', mapId: 'other-map'});
    const board = boardState({tab: 'mine', mode: 'recipient', recipientId: 'crate', data: {occurrences: [], attempts: [attempt({occurrence: occurrence()}), attempt({id: 'a2', occurrenceId: 'other', occurrence: other})]}});
    expect(board.rows().map(row => row.id)).toEqual(['today']);
});
test('generic tile activities have readable labels and do not imply farming', () => {
    expect(Board.objectiveLabel({eventType: 'TILE_ACTION', action: 'quarry', stage: 'extract', target: 'IRON_ORE'})).toBe('Extract · Iron Ore');
    expect(Board.objectiveLabel({eventType: 'KILL_MOB', targetLabel: 'Rats'})).toBe('Defeat Rats');
});
test('deadlines use supplied server time and handle permanent notices', () => {
    expect(Board.countdown(now + 60000, now)).toBe('1m left');
    expect(Board.countdown(now + 61 * 60000, now)).toBe('1h 1m left');
    expect(Board.countdown(now, now)).toBe('Ended');
    expect(Board.countdown(null, now)).toBe('No deadline');
});
test('the request displays every item and asks explicit confirmation before spending it', () => {
    const board = boardState({data: {inventory: {hide: 4, ore: 6}}, confirming: 'today', confirmAction: 'settle'});
    const row = {...occurrence(), quest: occurrence().snapshot, attempt: attempt()};
    const details = board.renderDetails(row);
    expect(details.textContent).toContain('Items can come from anywhere');
    expect(details.textContent).toContain('This removes 4 × Hide and 6 × Ore');
    const confirm = descendants(details).find(value => value.dataset.focus === 'confirm');
    expect(confirm.disabled).toBe(false);
    board.app.game.player.gridX = 40;
    expect(descendants(board.renderDetails(row)).find(value => value.dataset.focus === 'confirm').disabled).toBe(true);
});
test('another Looper cannot claim an accepted assignment in the client', () => {
    const board = boardState({data: {inventory: {hide: 4, ore: 6}}});
    const row = {...occurrence(), quest: occurrence().snapshot, attempt: attempt({isCurrentLooper: false})};
    const details = board.renderDetails(row);
    expect(details.textContent).toContain('Switch to the Looper that accepted');
    expect(descendants(details).find(value => value.dataset.focus === 'primary').disabled).toBe(true);
});
test('locked notices explain eligibility and disable acceptance', () => {
    const board = boardState(); const row = {...occurrence(), quest: occurrence().snapshot, lockedReason: 'Requires level 5.'};
    const details = board.renderDetails(row);
    expect(details.textContent).toContain('Requires level 5.');
    expect(descendants(details).find(value => value.dataset.focus === 'primary').disabled).toBe(true);
});
test('an ambiguous settlement retry reuses the same request identity', async () => {
    const {Board: FreshBoard, axios} = load();
    const board = boardState(); Object.setPrototypeOf(board, FreshBoard.prototype);
    const row = {...occurrence(), quest: occurrence().snapshot, attempt: attempt()};
    axios.post.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce({data: {receipt: {xp: 80}}});
    await board.mutate('settle', row); expect(board.error).toContain('could not be confirmed');
    await board.mutate('settle', row);
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.post.mock.calls[0][1]).toEqual(axios.post.mock.calls[1][1]);
    expect(axios.post.mock.calls[0][1]).toMatchObject({recipientId: 'crate', confirmed: true, requestId: 'request-12345678'});
    expect(board.requests.size).toBe(0);
});
test('overlapping primary actions are suppressed while saving', async () => {
    const {Board: FreshBoard, axios} = load(); const board = boardState({pending: true}); Object.setPrototypeOf(board, FreshBoard.prototype);
    await board.mutate('accept', {...occurrence(), quest: occurrence().snapshot}); expect(axios.post).not.toHaveBeenCalled();
});
test('open dialog consumes movement shortcuts and wraps keyboard focus', () => {
    const first = {focus: jest.fn()}, last = {focus: jest.fn()};
    const board = boardState({opened: true, dialog: {querySelectorAll: () => [first, last], contains: () => false}});
    const event = {key: 'Tab', preventDefault: jest.fn(), stopImmediatePropagation: jest.fn()}; board.keyboard(event);
    expect(first.focus).toHaveBeenCalled(); expect(event.stopImmediatePropagation).toHaveBeenCalled();
    const move = {key: 'w', stopImmediatePropagation: jest.fn()}; board.keyboard(move); expect(move.stopImmediatePropagation).toHaveBeenCalled();
});

test('refresh clears a hand-in confirmation after a lost success response', () => {
    const board = boardState({confirming: 'today', confirmAction: 'settle', data: {inventory: {}}});
    const row = {...occurrence(), quest: occurrence().snapshot, attempt: attempt({status: 'completed'})};
    const details = board.renderDetails(row);
    expect(board.confirming).toBeNull();
    expect(details.textContent).toContain('Your reward has been recorded');
    expect(details.textContent).not.toContain('Confirm hand-in');
    expect(details.textContent).not.toContain('This removes');
});
test('permanent quests do not display the storage sentinel as a real deadline', () => {
    expect(Board.countdown(253402300799000, now)).toBe('No deadline');
    expect(boardState().date(253402300799000)).toBe('No deadline');
});

test('acceptance selects the new assignment after pin and refresh render older completed work', async () => {
    const {Board: FreshBoard, axios} = load();
    const board = boardState({selected: 'old-completed', opened: true}); Object.setPrototypeOf(board, FreshBoard.prototype);
    board.setPin.mockImplementation(() => {board.selected = 'old-completed';});
    board.load.mockImplementation(async () => {board.selected = 'old-completed';});
    axios.post.mockResolvedValue({data: {attempt: {id: 'new-attempt', occurrenceId: 'new-occurrence'}}});
    await board.mutate('accept', {...occurrence({id: 'new-occurrence'}), quest: occurrence().snapshot});
    expect(board.tab).toBe('mine');
    expect(board.selected).toBe('new-occurrence');
    expect(board.setPin).toHaveBeenCalledWith('new-attempt');
});

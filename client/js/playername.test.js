const fs = require('fs');
const vm = require('vm');

function setup(storage = new Map()) {
    const nodes = new Map();
    function node(id) {
        if (!nodes.has(id)) {
            const element = new EventTarget();
            Object.assign(element, {value: '', hidden: true, textContent: '', disabled: false,
                focus: jest.fn(), setAttribute: jest.fn(), removeAttribute: jest.fn()});
            nodes.set(id, element);
        }
        return nodes.get(id);
    }
    const document = {getElementById: node, activeElement: null};
    const axios = {put: jest.fn().mockResolvedValue({data: {title: 'New Looper🎖️', name: 'New Looper🎖️'}}),
        post: jest.fn().mockResolvedValue({data: {showPrompt: true}})};
    let PlayerName;
    vm.runInNewContext(fs.readFileSync(require.resolve('./playername'), 'utf8'), {
        document, axios, setTimeout, $: () => ({hasClass: () => false}),
        localStorage: {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)},
        define: (_, factory) => {PlayerName = factory();}
    });
    const app = {sessionId: 'session', storage: {data: {walletId: '0xabc'}},
        game: {started: true, player: {title: 'Player'}}, toggleSettings: jest.fn(), settings: {selectSection: jest.fn()}};
    return {view: new PlayerName(app), app, node, storage, document, axios};
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test.each(['Player', 'Player🎖️', '', undefined])('only an unnamed player receives a delayed hint for %p', async title => {
    const {view, node} = setup();
    view.onWelcome(title);
    expect(node('player-name-hint').hidden).toBe(true);
    await jest.advanceTimersByTimeAsync(8000);
    expect(node('player-name-hint').hidden).toBe(false);
    expect(node('player-display-name').focus).not.toHaveBeenCalled();
});

test('dismissal stays dismissed after revive and reconnect', async () => {
    const {view, node, storage} = setup();
    view.onWelcome('Player');
    await jest.advanceTimersByTimeAsync(8000);
    node('player-name-dismiss').dispatchEvent(new Event('click'));
    view.onWelcome('Player');
    await jest.advanceTimersByTimeAsync(8000);
    expect(node('player-name-hint').hidden).toBe(true);
    const returned = setup(storage);
    returned.view.onWelcome('Player');
    await jest.advanceTimersByTimeAsync(8000);
    expect(returned.node('player-name-hint').hidden).toBe(true);
    expect(returned.axios.post).not.toHaveBeenCalled();
});

test('a prompt claimed on another device stays hidden', async () => {
    const {view, node, axios} = setup();
    axios.post.mockResolvedValue({data: {showPrompt: false}});
    view.onWelcome('Player');
    await jest.advanceTimersByTimeAsync(8000);
    expect(node('player-name-hint').hidden).toBe(true);
});

test('existing custom titles skip the prompt and badges stay outside the editor', async () => {
    const {view, node, axios} = setup();
    view.onWelcome('My Looper🎖️');
    await jest.advanceTimersByTimeAsync(8000);
    expect(axios.post).not.toHaveBeenCalled();
    expect(node('player-name-hint').hidden).toBe(true);
    expect(node('player-display-name').value).toBe('My Looper');
});

test('choosing a name opens the Interface settings tab and focuses the input', () => {
    const {app, node} = setup();
    node('player-name-choose').dispatchEvent(new Event('click'));
    expect(app.toggleSettings).toHaveBeenCalled();
    expect(app.settings.selectSection).toHaveBeenCalledWith('interface');
    expect(node('player-display-name').focus).toHaveBeenCalled();
});

test('Enter saves only the name and prevents submitting the surrounding settings form', async () => {
    const {node, axios, app} = setup();
    node('player-display-name').value = 'New Looper';
    const enter = new Event('keydown', {cancelable: true});
    enter.key = 'Enter';
    node('player-display-name').dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(axios.put).toHaveBeenCalledWith('/session/session/title', {title: 'New Looper'});
    expect(app.toggleSettings).not.toHaveBeenCalled();
});

test('saving updates the local player and blocks duplicate submissions', async () => {
    const {view, node, app, axios} = setup();
    node('player-display-name').value = 'New Looper';
    const saved = view.save();
    expect(node('player-name-save').disabled).toBe(true);
    await view.save();
    await saved;
    expect(axios.put).toHaveBeenCalledTimes(1);
    expect(app.game.player).toMatchObject({title: 'New Looper🎖️', name: 'New Looper🎖️'});
    expect(node('player-name-save').disabled).toBe(false);
    expect(node('player-name-status').textContent).toBe('Name saved.');
});

test('failed saves keep the entered name and allow retry', async () => {
    const {view, node, app, axios} = setup();
    axios.put.mockRejectedValueOnce(new Error('Offline'));
    node('player-display-name').value = 'New Looper';
    await view.save();
    expect(app.game.player.title).toBe('Player');
    expect(node('player-display-name').value).toBe('New Looper');
    expect(node('player-name-save').disabled).toBe(false);
    expect(node('player-name-status').textContent).toContain('try again');
});

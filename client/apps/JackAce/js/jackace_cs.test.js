const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadClient() {
    const element = {removeClass: jest.fn(), on: jest.fn(), click: jest.fn()};
    element[0] = element;
    const context = {
        Howl: class {}, console: {error: jest.fn(), log: jest.fn()},
        URLSearchParams, window: {location: {search: '?sessionId=test'}},
        axios: {post: jest.fn()}, $: jest.fn(() => element), alert: jest.fn()
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'jackace_cs.js'), 'utf8'), context);
    for (const name of ['animateText', 'showGameWindow', 'resetGame', 'setPlayerMoney', 'flashCredits']) context[name] = jest.fn().mockResolvedValue();
    return {context, element};
}

test('animated totals score the zero-coded ten and soften aces', () => {
    const {context} = loadClient();
    expect(context.calculateCardValue(0, 0, '0C')).toEqual({currentTotal: 10, aceCount: 0});
    expect(context.calculateCardValue(11, 1, '0C')).toEqual({currentTotal: 21, aceCount: 1});
    expect(context.calculateCardValue(20, 1, '0C')).toEqual({currentTotal: 20, aceCount: 0});
});

test.each([
    {message: '[SPLIT] Invalid action >> Cannot split.', status: 400},
    {message: '[HIT] Invalid action >> action not available.', status: 400},
    {message: 'GOLD transfer needs confirmation. Retry STAND.', status: 503, recoverable: true}
])('recoverable request failure keeps the hand: $message', async ({message, status, recoverable}) => {
    const {context, element} = loadClient();
    const error = {response: {status, data: {message, recoverable}}};
    context.axios.post.mockRejectedValue(error);
    await expect(context.makeRequest('STAND')).rejects.toBe(error);
    expect(context.resetGame).not.toHaveBeenCalled();
    expect(element.click).not.toHaveBeenCalled();
    expect(element.removeClass).toHaveBeenCalledWith('processing');
});

test('network and animation failures always release the button lock and reject', async () => {
    const {context, element} = loadClient();
    const error = new Error('offline');
    context.axios.post.mockRejectedValue(error);
    context.animateText.mockRejectedValue(new Error('animation unavailable'));
    await expect(context.makeRequest('HIT')).rejects.toBe(error);
    expect(context.resetGame).not.toHaveBeenCalled();
    expect(element.removeClass).toHaveBeenCalledWith('processing');
});

test('a server-confirmed absent hand resets the local game', async () => {
    const {context} = loadClient();
    const error = {response: {status: 400, data: {message: '[HIT] Invalid action >> no hand in progress.'}}};
    context.axios.post.mockRejectedValue(error);
    await expect(context.makeRequest('HIT')).rejects.toBe(error);
    expect(context.resetGame).toHaveBeenCalledTimes(1);
});

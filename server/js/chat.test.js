jest.mock('./discord.js', () => ({ sendMessage: jest.fn() }));

const chat = require('./chat.js');
const discord = require('./discord.js');

beforeEach(() => jest.clearAllMocks());

test('long multiline chat stays intact in history and is split for Discord', () => {
    const message = 'a'.repeat(1999) + '\n' + 'b'.repeat(2000);
    chat.addMessage('Farmer', message);
    const history = chat.getMessages();
    expect(history[history.length - 1].message).toBe(message);
    const chunks = discord.sendMessage.mock.calls.map(call => call[0]);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.length <= 2000)).toBe(true);
    expect(chunks.join('')).toBe(`💬 **Farmer:** ${message}`);
});

test('history retains the latest 100 messages in chronological order', () => {
    for (let i = 0; i <= 100; i++) {
        chat.addMessage('Farmer', `Message ${i}`);
    }
    const history = chat.getMessages();
    expect(history).toHaveLength(100);
    expect(history[0].message).toBe('Message 1');
    expect(history[99].message).toBe('Message 100');
});

test('legacy public history reads the durable world stream without exposing inboxes or replaying Discord', () => {
    const {ChatHistory} = require('./chathistory');
    const history = new ChatHistory();
    const sender = {id: 'opaque', label: 'Farmer'};
    history.append(['world'], {id: 'public', sender, message: 'Hello', epoch: Date.now()});
    history.append(['inbox:alice'], {id: 'private', sender, message: 'Secret', epoch: Date.now()});
    chat.setHistory(history);
    try {
        expect(chat.getMessages()).toEqual([{playerName: 'Farmer', identity: sender, message: 'Hello', epoch: history.get('world')[0].epoch}]);
        expect(discord.sendMessage).not.toHaveBeenCalled();
    } finally { chat.setHistory(undefined); }
});

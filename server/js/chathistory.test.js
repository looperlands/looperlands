const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const {ChatHistory} = require('./chathistory');

let directory, filename;
beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-chat-'));
    filename = path.join(directory, 'history.json');
});
afterEach(() => {jest.restoreAllMocks(); fs.rmSync(directory, {recursive: true, force: true});});
const message = (id, epoch = Date.now()) => ({id, epoch, message: 'hello'});

test('a separate process reads committed inboxes and stable identities without a shutdown hook', () => {
    const history = new ChatHistory(filename);
    const id = history.publicId('alice');
    history.append(['inbox:alice', 'inbox:bob'], message('private'));
    history.append(['world'], message('public'));
    const recovered = JSON.parse(execFileSync(process.execPath, ['-e', `
        const {ChatHistory} = require(${JSON.stringify(path.join(__dirname, 'chathistory'))});
        const history = new ChatHistory(${JSON.stringify(filename)});
        console.log(JSON.stringify({id: history.publicId('alice'), alice: history.get('inbox:alice'), bob: history.get('inbox:bob'), world: history.get('world')}));
    `], {encoding: 'utf8'}));
    expect(recovered.id).toBe(id);
    expect(recovered.alice).toEqual(recovered.bob);
    expect(recovered.alice[0].id).toBe('private');
    expect(recovered.world[0].id).toBe('public');
    expect(fs.statSync(filename).mode & 0o777).toBe(0o600);
});

test('history expires messages individually after 30 days, even when an inbox stays active', () => {
    const history = new ChatHistory(filename);
    history.append(['world', 'inbox:alice'], message('expired', Date.now() - 31 * 86400000));
    history.append(['world', 'inbox:alice'], message('recent'));
    const recovered = new ChatHistory(filename);
    expect(recovered.get('world').map(entry => entry.id)).toEqual(['recent']);
    expect(recovered.get('inbox:alice').map(entry => entry.id)).toEqual(['recent']);
    expect(fs.readFileSync(filename, 'utf8')).not.toContain('expired');
});

test('disk history keeps the latest 100 messages and deduplicates gift receipts', () => {
    const history = new ChatHistory(filename);
    for (let i = 0; i < 105; i++) history.append(['world'], message(String(i)));
    history.append(['world'], message('104'));
    const recovered = new ChatHistory(filename);
    expect(recovered.get('world')).toHaveLength(100);
    expect(recovered.get('world')[0].id).toBe('5');
});

test('a failed atomic replacement preserves both participants history on disk and in memory', () => {
    const history = new ChatHistory(filename);
    history.append(['inbox:alice', 'inbox:bob'], message('saved'));
    jest.spyOn(fs, 'renameSync').mockImplementationOnce(() => {throw Object.assign(new Error('Disk error'), {code: 'EIO'});});
    expect(() => history.append(['inbox:alice', 'inbox:bob'], message('unsaved'))).toThrow('Disk error');
    expect(history.get('inbox:alice').map(entry => entry.id)).toEqual(['saved']);
    expect(history.get('inbox:bob').map(entry => entry.id)).toEqual(['saved']);
    const recovered = new ChatHistory(filename);
    expect(recovered.get('inbox:alice')).toEqual(history.get('inbox:alice'));
    expect(fs.readdirSync(directory)).toEqual(['history.json']);
});

test('a corrupt history file prevents startup and is left intact', () => {
    fs.writeFileSync(filename, '{corrupt');
    expect(() => new ChatHistory(filename)).toThrow();
    expect(fs.readFileSync(filename, 'utf8')).toBe('{corrupt');
});

test('daily cleanup expires idle conversations without another message', () => {
    jest.useFakeTimers();
    const history = new ChatHistory(filename);
    try {
        history.append(['inbox:alice'], message('old', Date.now() - 29.5 * 86400000));
        jest.advanceTimersByTime(86400000);
        expect(history.get('inbox:alice')).toBeUndefined();
        expect(fs.readFileSync(filename, 'utf8')).not.toContain('old');
    } finally { history.close(); jest.useRealTimers(); }
});

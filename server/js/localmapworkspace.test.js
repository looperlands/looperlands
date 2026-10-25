const {createWorkspace} = require('./localmapworkspace');
test('concurrent tools join one load, receive real stage progress, and reuse the completed map', async () => {
    let release;
    const read = jest.fn(() => new Promise(resolve => {release = resolve;}));
    const workspace = createWorkspace('/unused', {fingerprint: () => 'revision', readers: () => [['doors', 'Entrances', read], ['quests', 'Quests', async () => ({quests: []})]]});
    const first = workspace.load('one'), second = workspace.load('one');
    expect(second).toBe(first);
    await Promise.resolve();
    expect(first.events[0]).toMatchObject({type: 'progress', completed: 0, total: 2});
    release({doors: [{id: '7'}]}); await first.promise;
    expect(first.events.at(-1)).toEqual({type: 'ready', mapId: 'one', revision: 'revision'});
    expect(workspace.load('one')).toBe(first); expect(read).toHaveBeenCalledTimes(1);
});
test('source changes invalidate a map; edits during loading cannot publish a ready snapshot', async () => {
    let version = 'first';
    const read = jest.fn(async () => ({}));
    const workspace = createWorkspace('/unused', {fingerprint: () => version, readers: () => [['doors', 'Entrances', read]]});
    const first = workspace.load('one'); await first.promise;
    version = 'second'; const next = workspace.load('one'); await next.promise;
    expect(next).not.toBe(first); expect(read).toHaveBeenCalledTimes(2);
    const unstable = createWorkspace('/unused', {fingerprint: () => version, readers: () => [['doors', 'Entrances', async () => {version = 'edited';}]]});
    const loading = unstable.load('one'); await loading.promise;
    expect(loading.events.at(-1)).toMatchObject({type: 'failed', status: 409});
    expect(loading.events.some(event => event.type === 'ready')).toBe(false);
});
test('one unavailable editor does not hide independent sections, and cached maps stay bounded', async () => {
    const workspace = createWorkspace('/unused', {fingerprint: () => 'revision', readers: () => [
        ['doors', 'Entrances', async () => {throw Object.assign(new Error('Invalid XML'), {status: 422});}],
        ['quests', 'Quests', async () => ({quests: []})]
    ]});
    const entry = workspace.load('one'); await entry.promise;
    expect(entry.events).toContainEqual({type: 'resource', key: 'doors', error: 'Invalid XML', status: 422});
    expect(entry.events).toContainEqual({type: 'resource', key: 'quests', data: {quests: []}});
    await workspace.load('two').promise; await workspace.load('three').promise;
    expect(workspace.load('one')).not.toBe(entry);
});

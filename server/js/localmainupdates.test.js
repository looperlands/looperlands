const {checkMainUpdates} = require('./localmainupdates');

const localCommit = 'a'.repeat(40), mainCommit = 'b'.repeat(40);
let runGit, fetch;
const response = (data, status = 200) => ({ok: status >= 200 && status < 300, status, json: async () => data});

beforeEach(() => {
    runGit = jest.fn(async args => {
        const command = args.join(' ');
        if (command === 'rev-parse HEAD') return localCommit;
        if (command === 'branch --show-current') return 'my-map';
        if (command.startsWith('status ')) return '';
        if (command === 'remote get-url origin') return 'https://github.com/looperlands/looperlands.git';
        throw new Error('Missing remote');
    });
    fetch = jest.fn().mockResolvedValueOnce(response({sha: mainCommit}));
});

const check = () => checkMainUpdates({root: '/checkout', runGit, fetch});

test.each([
    [3, 0, 'behind'], [0, 2, 'ahead'], [3, 2, 'diverged'], [0, 0, 'up-to-date']
])('local...main comparison with ahead_by=%i behind_by=%i reports %s', async (githubAhead, githubBehind, status) => {
    fetch.mockResolvedValueOnce(response({ahead_by: githubAhead, behind_by: githubBehind}));
    const result = await check();
    expect(result).toMatchObject({status, localBranch: 'my-map', localCommit, mainCommit,
        behind: githubAhead, ahead: githubBehind, dirty: false});
    expect(fetch.mock.calls[1][0]).toBe(`https://api.github.com/repos/looperlands/looperlands/compare/${localCommit}...${mainCommit}`);
    expect(result.commands).toEqual(githubAhead ? ['git fetch origin main', 'git merge origin/main'] : undefined);
    for (const [args] of runGit.mock.calls) expect(['fetch', 'merge', 'checkout', 'pull']).not.toContain(args[0]);
});

test('an identical local and main commit needs no comparison request', async () => {
    fetch.mockReset().mockResolvedValueOnce(response({sha: localCommit}));
    const result = await check();
    expect(result).toMatchObject({status: 'up-to-date', behind: 0, ahead: 0});
    expect(result.commands).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
});

test('an unreadable Git checkout does not contact GitHub', async () => {
    runGit.mockRejectedValue(new Error('git unavailable'));
    expect(await check()).toMatchObject({status: 'unknown', message: expect.stringContaining('Git checkout')});
    expect(fetch).not.toHaveBeenCalled();
});

test('an unpublished local commit is unknown instead of falsely ahead or behind', async () => {
    fetch.mockResolvedValueOnce(response({}, 404));
    const result = await check();
    expect(result).toMatchObject({status: 'unknown', localCommit, mainCommit,
        message: expect.stringContaining('not been pushed'), commands: ['git fetch origin main', 'git merge origin/main']});
    expect(result.behind).toBeUndefined();
    expect(result.ahead).toBeUndefined();
});

test('dirty working files prompt the mapmaker to save changes before merging', async () => {
    const cleanGit = runGit.getMockImplementation();
    runGit.mockImplementation(args => args[0] === 'status' ? Promise.resolve(' M tools/maps/tmx/m88n2.tmx\n?? my-map.txt') : cleanGit(args));
    fetch.mockResolvedValueOnce(response({ahead_by: 1, behind_by: 0}));
    expect(await check()).toMatchObject({status: 'behind', dirty: true,
        message: expect.stringContaining('Commit or stash your local changes before merging')});
});

test.each([403, 429])('GitHub HTTP %i returns an actionable unknown status', async status => {
    fetch.mockReset().mockResolvedValueOnce(response({}, status));
    const result = await check();
    expect(result.status).toBe('unknown');
    expect(result.message).toContain('limiting this update check');
    expect(result.behind).toBeUndefined();
});

test('a network failure remains unknown and does not mutate Git', async () => {
    fetch.mockReset().mockRejectedValue(new Error('network offline'));
    expect(await check()).toMatchObject({status: 'unknown', message: expect.stringContaining('online')});
    expect(runGit.mock.calls.some(([args]) => ['fetch', 'merge', 'pull'].includes(args[0]))).toBe(false);
});

test('the upstream GitHub remote takes precedence over a fork origin', async () => {
    const original = runGit.getMockImplementation();
    runGit.mockImplementation(args => {
        if (args.join(' ') === 'remote get-url upstream') return Promise.resolve('git@github.com:looperlands/looperlands.git');
        if (args.join(' ') === 'remote get-url origin') return Promise.resolve('https://github.com/mapmaker/looperlands.git');
        return original(args);
    });
    fetch.mockResolvedValueOnce(response({ahead_by: 1, behind_by: 0}));
    const result = await check();
    expect(fetch.mock.calls[0][0]).toBe('https://api.github.com/repos/looperlands/looperlands/commits/main');
    expect(result.commands).toEqual(['git fetch upstream main', 'git merge upstream/main']);
});

test('non-GitHub remotes use the public canonical repository without exposing remote credentials', async () => {
    const original = runGit.getMockImplementation();
    runGit.mockImplementation(args => args[0] === 'remote' ? Promise.resolve('https://secret:password@private.invalid/repository') : original(args));
    fetch.mockResolvedValueOnce(response({ahead_by: 1, behind_by: 0}));
    const result = await check();
    expect(fetch.mock.calls[0][0]).toBe('https://api.github.com/repos/looperlands/looperlands/commits/main');
    expect(result.commands).toEqual(['git fetch https://github.com/looperlands/looperlands.git main', 'git merge FETCH_HEAD']);
    expect(JSON.stringify(result)).not.toMatch(/secret|password|private.invalid/);
});

test('invalid comparison counts cannot become a merge recommendation', async () => {
    fetch.mockResolvedValueOnce(response({ahead_by: -1, behind_by: 0}));
    const result = await check();
    expect(result.status).toBe('unknown');
    expect(result.behind).toBeUndefined();
    expect(result.commands).toBeUndefined();
});

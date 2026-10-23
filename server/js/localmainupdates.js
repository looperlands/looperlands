const {execFile} = require('child_process');

const canonicalRepository = {owner: 'looperlands', name: 'looperlands'};
const shaPattern = /^[a-f0-9]{40}$/i;

function readGit(root, args) {
    return new Promise((resolve, reject) => {
        execFile('git', ['-c', 'safe.directory=' + root, '-C', root, ...args], {
            encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 65536,
            env: {...process.env, GIT_OPTIONAL_LOCKS: '0'}
        }, (error, stdout) => error ? reject(error) : resolve(stdout.trim()));
    });
}

function githubRepository(remote) {
    if (typeof remote !== 'string') return null;
    const value = remote.trim();
    let pathname;
    const scp = value.match(/^git@github\.com:([^\s]+)$/i);
    if (scp) pathname = scp[1];
    else {
        try {
            const url = new URL(value);
            if (url.hostname.toLowerCase() !== 'github.com' || !['https:', 'http:', 'ssh:', 'git:'].includes(url.protocol)) return null;
            pathname = url.pathname.replace(/^\//, '');
        } catch (_) {return null;}
    }
    const match = pathname.replace(/\.git\/?$/i, '').replace(/\/$/, '').match(/^([a-z0-9][a-z0-9_.-]*)\/([a-z0-9][a-z0-9_.-]*)$/i);
    return match ? {owner: match[1], name: match[2]} : null;
}

async function checkMainUpdates(options = {}) {
    const root = options.root;
    const fetch = options.fetch || global.fetch;
    const git = options.runGit || (args => readGit(root, args));
    const unknown = (message, details = {}) => ({status: 'unknown', ...details, message});
    if (typeof root !== 'string' || !root) return unknown('The source checkout is unavailable. Open this toolbox from a Git checkout to check main.');

    const results = await Promise.allSettled([
        git(['rev-parse', 'HEAD']), git(['branch', '--show-current']),
        git(['status', '--porcelain', '--untracked-files=normal']),
        git(['remote', 'get-url', 'upstream']), git(['remote', 'get-url', 'origin'])
    ]);
    if (results[0].status !== 'fulfilled' || !shaPattern.test(results[0].value)) {
        return unknown('The source Git checkout could not be read. If this is a linked worktree in Docker, use a regular checkout or check main in your host terminal.');
    }
    const localCommit = results[0].value;
    const localBranch = results[1].status === 'fulfilled' && results[1].value ? results[1].value : 'detached HEAD';
    const details = {localBranch, localCommit};
    if (results[2].status !== 'fulfilled') return unknown('Git could not check your working files. Check the checkout permissions, then try again.', details);
    details.dirty = Boolean(results[2].value.trim());
    const dirtyAdvice = details.dirty ? ' Commit or stash your local changes before merging.' : '';
    let repository, remote;
    for (const [index, name] of [[3, 'upstream'], [4, 'origin']]) {
        const candidate = results[index].status === 'fulfilled' ? githubRepository(results[index].value) : null;
        if (candidate) {repository = candidate; remote = name; break;}
    }
    repository ||= canonicalRepository;
    const source = remote || `https://github.com/${repository.owner}/${repository.name}.git`;
    const commands = [`git fetch ${source} main`, `git merge ${remote ? remote + '/main' : 'FETCH_HEAD'}`];
    const manualAdvice = ' You can fetch main and review the suggested merge in your checkout.' + dirtyAdvice;
    const api = 'https://api.github.com/repos/' + encodeURIComponent(repository.owner) + '/' + encodeURIComponent(repository.name);
    const request = async route => fetch(api + route, {headers: {Accept: 'application/vnd.github+json', 'User-Agent': 'LooperLands-Mapmaker-Toolbox'},
        signal: AbortSignal.timeout(15000)});
    const unavailable = (response, fallback) => {
        if (response.status === 403 || response.status === 429) return 'GitHub is limiting this update check. Try again later.';
        return fallback;
    };
    try {
        const mainResponse = await request('/commits/main');
        if (!mainResponse.ok) return unknown(unavailable(mainResponse, 'The current main commit could not be read from GitHub.') + manualAdvice, {...details, commands});
        const main = await mainResponse.json();
        if (!shaPattern.test(main?.sha)) return unknown('GitHub returned an invalid main commit. Try the update check again later.' + dirtyAdvice, details);
        details.mainCommit = main.sha;
        if (main.sha.toLowerCase() === localCommit.toLowerCase()) {
            return {status: 'up-to-date', ...details, behind: 0, ahead: 0, message: 'Your checkout matches the latest main.' + dirtyAdvice};
        }
        const comparison = await request('/compare/' + localCommit + '...' + main.sha);
        if (!comparison.ok) {
            const message = comparison.status === 404
                ? 'GitHub cannot compare this local commit with main. It may include work that has not been pushed; its update status is unknown.'
                : unavailable(comparison, 'GitHub could not compare this checkout with main.');
            return unknown(message + manualAdvice, {...details, commands});
        }
        const data = await comparison.json();
        // The comparison is local...main: GitHub's ahead count belongs to main.
        const behind = data.ahead_by, ahead = data.behind_by;
        if (![behind, ahead].every(value => Number.isSafeInteger(value) && value >= 0)) {
            return unknown('GitHub returned an incomplete comparison. Try the update check again later.' + dirtyAdvice, details);
        }
        const status = behind ? (ahead ? 'diverged' : 'behind') : (ahead ? 'ahead' : 'up-to-date');
        let message;
        if (status === 'behind') message = `Main has ${behind} new commit${behind === 1 ? '' : 's'}. Merge main to update your checkout.`;
        else if (status === 'diverged') message = `Main has ${behind} new commit${behind === 1 ? '' : 's'} and your branch has ${ahead} of its own. Merge main and resolve any conflicts.`;
        else if (status === 'ahead') message = `Your checkout includes the latest main and has ${ahead} additional commit${ahead === 1 ? '' : 's'}.`;
        else message = 'Your checkout includes the latest main.';
        return {status, ...details, behind, ahead, message: message + dirtyAdvice,
            ...(behind ? {commands} : {})};
    } catch (_) {
        return unknown('GitHub could not be reached to check main. Try again when you are online.' + manualAdvice, {...details, commands});
    }
}

module.exports = {checkMainUpdates};

const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

let fixture;

beforeEach(() => {
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-local-session-'));
    fs.writeFileSync(path.join(fixture, 'curl'), `#!${process.execPath}
const fs = require('fs');
const args = process.argv.slice(2);
fs.writeFileSync(process.env.REQUEST_FILE, JSON.stringify(args));
process.stdout.write(process.env.RESPONSE_BODY);
if (args.includes('--write-out')) process.stdout.write('\\n' + process.env.RESPONSE_STATUS);
process.exit(Number(process.env.CURL_EXIT || 0));
`, {mode: 0o755});
    fs.writeFileSync(path.join(fixture, 'open'), `#!${process.execPath}
require('fs').writeFileSync(process.env.OPEN_FILE, process.argv[2]);
`, {mode: 0o755});
});

afterEach(() => fs.rmSync(fixture, {recursive: true, force: true}));

function run(status, body, options = {}) {
    return spawnSync('bash', [path.join(__dirname, '../local-session.sh'),
        'wallet', 'avatar', 'duckville', '1', '10000'], {
        encoding: 'utf8', timeout: 10000,
        env: {...process.env, PATH: fixture + path.delimiter + process.env.PATH,
            LOCAL_IP: '127.0.0.1', LOOPWORMS_API_KEY: 'local-test-key',
            RESPONSE_STATUS: String(status), RESPONSE_BODY: JSON.stringify(body),
            REQUEST_FILE: path.join(fixture, 'request.json'), OPEN_FILE: path.join(fixture, 'opened'),
            ...options}
    });
}

test('failed ownership reports the server error without opening an invalid session', () => {
    const result = run(401, {error: 'Your wallet does not own the avatar you are trying to play with'});
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('401');
    expect(result.stderr).toContain('Your wallet does not own the avatar');
    expect(result.stdout).not.toContain('?sessionId=');
    expect(fs.existsSync(path.join(fixture, 'opened'))).toBe(false);
});

test.each([{}, {sessionId: null}, {sessionId: ''}, {sessionId: 42}])('missing session ID %j never opens the browser', body => {
    const result = run(200, body);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('session ID');
    expect(fs.existsSync(path.join(fixture, 'opened'))).toBe(false);
});

test('connection failure never opens the browser', () => {
    const result = run('000', {}, {CURL_EXIT: '7'});
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Could not reach');
    expect(fs.existsSync(path.join(fixture, 'opened'))).toBe(false);
});

test('successful creation opens its session and sends the expected map and API key', () => {
    const sessionId = 'a'.repeat(40);
    const result = run(200, {sessionId});
    expect(result.status).toBe(0);
    const url = 'http://127.0.0.1:8000/?sessionId=' + sessionId;
    expect(result.stdout).toContain(url);
    expect(fs.readFileSync(path.join(fixture, 'opened'), 'utf8')).toBe(url);
    const args = JSON.parse(fs.readFileSync(path.join(fixture, 'request.json'), 'utf8'));
    expect(args).toContain('x-api-key: local-test-key');
    expect(JSON.parse(args[args.indexOf('--data') + 1])).toMatchObject({
        walletId: 'wallet', nftId: 'avatar', mapId: 'duckville', checkpointId: '1', xp: 10000
    });
});


test('LAN sessions use the same configured address for creation and the browser', () => {
    const sessionId = 'b'.repeat(40);
    const result = run(200, {sessionId}, {LOCAL_IP: '192.0.2.8'});
    expect(result.status).toBe(0);
    const args = JSON.parse(fs.readFileSync(path.join(fixture, 'request.json'), 'utf8'));
    expect(args).toContain('http://192.0.2.8:8000/session');
    expect(fs.readFileSync(path.join(fixture, 'opened'), 'utf8')).toBe('http://192.0.2.8:8000/?sessionId=' + sessionId);
});

const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

let fixture, repository, log;
beforeEach(() => {
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands launcher '));
    repository = path.join(fixture, 'repository with spaces');
    log = path.join(fixture, 'calls');
    fs.mkdirSync(repository);
    fs.mkdirSync(path.join(fixture, 'bin'));
    fs.copyFileSync(path.join(__dirname, '../start-local.command'), path.join(repository, 'start-local.command'));
    const stub = (name, body) => fs.writeFileSync(path.join(fixture, 'bin', name), '#!/bin/bash\n' + body, {mode: 0o755});
    stub('docker', 'printf "docker|%s|%s|%s|%s\\n" "$PWD" "$*" "$LOCAL_IP" "$DOCKER_DEFAULT_PLATFORM" >> "$LAUNCHER_TEST_LOG"\n' +
        'if [[ "$LAUNCHER_TEST_MODE" == daemon-failure && "$*" == info ]]; then exit 1; fi\n' +
        'if [[ "$LAUNCHER_TEST_MODE" == build-failure && "$*" == "compose -f docker-compose-local.yml up --build -d" ]]; then exit 1; fi\n' +
        'exit 0\n');
    stub('curl', 'printf "curl|%s\\n" "$*" >> "$LAUNCHER_TEST_LOG"\n[[ "$LAUNCHER_TEST_MODE" != readiness-failure ]]\n');
    stub('open', 'printf "open|%s\\n" "$*" >> "$LAUNCHER_TEST_LOG"\nexit 0\n');
    stub('sleep', 'exit 0\n');
});
afterEach(() => fs.rmSync(fixture, {recursive: true, force: true}));

function launch(mode = '') {
    const result = spawnSync('/bin/bash', [path.join(repository, 'start-local.command')], {
        cwd: os.tmpdir(), encoding: 'utf8', timeout: 10000,
        env: {...process.env, PATH: path.join(fixture, 'bin') + ':/usr/bin:/bin',
            LAUNCHER_TEST_LOG: log, LAUNCHER_TEST_MODE: mode, LOCAL_IP: '192.0.2.1'}
    });
    if (result.error) throw result.error;
    return {...result, calls: fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : ''};
}

test('macOS launcher builds from a path with spaces and opens the ready local page', () => {
    const result = launch();
    expect(result.status).toBe(0);
    expect(result.calls).toContain('docker|' + repository + '|compose -f docker-compose-local.yml up --build -d|127.0.0.1|linux/amd64');
    expect(result.calls).toContain('http://127.0.0.1:8010/local/api/catalog');
    expect(result.calls).toContain('open|http://127.0.0.1:8010/local/');
    expect(result.calls).not.toMatch(/docker\|[^\n]*\b(?:down|rm|kill)\b/);
});

test('a stopped Docker engine gives the next action without building or opening a browser', () => {
    const result = launch('daemon-failure');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Start Docker Desktop and wait until its engine is running');
    expect(result.calls).not.toContain('up --build');
    expect(result.calls).not.toContain('open|');
});

test('a failed build leaves the error visible and never opens the game', () => {
    const result = launch('build-failure');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('The local build failed');
    expect(result.calls).not.toContain('curl|');
    expect(result.calls).not.toContain('open|');
});

test('readiness polling is bounded and prints game logs when startup fails', () => {
    const result = launch('readiness-failure');
    expect(result.status).toBe(1);
    expect(result.calls.match(/^curl\|/gm)).toHaveLength(60);
    expect(result.calls).toContain('compose -f docker-compose-local.yml logs --tail=40 gameserver');
    expect(result.stderr).toContain('The local game did not become ready');
    expect(result.calls).not.toContain('open|');
});

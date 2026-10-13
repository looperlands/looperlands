const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

test('startup resolves a shared dialogue dependency before loading the game bundle', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-client-boot-'));
    const scripts = path.join(fixture, 'client/js');
    fs.mkdirSync(path.join(scripts, 'lib'), {recursive: true});
    const modules = {
        'lib/require-jquery': 'define(function () { return {}; });',
        home: 'define(function () { require(["main"]); });',
        main: 'define(["app"], function (App) { return {App: App, loadGame: function (callback) { require(["game"], callback); }}; });',
        app: 'define(["jquery", "dialoguetext"], function ($, DialogueText) { return {DialogueText: DialogueText}; });',
        dialoguetext: 'define(function () { return function DialogueText() {}; });',
        timer: 'define(function () { return {}; });',
        bubble: 'define(["jquery", "timer", "dialoguetext"], function ($, Timer, DialogueText) { return {DialogueText: DialogueText}; });',
        game: 'define(["bubble"], function (Bubble) { return Bubble; });',
    };
    for (const [name, source] of Object.entries(modules)) {
        fs.writeFileSync(path.join(scripts, name + '.js'), source);
    }

    // Use the production layer configuration and optimizer, then apply the same
    // pruning as build.sh: only home, game, and the jquery loader remain.
    const buildScript = `
        const fs = require('fs'), path = require('path'), vm = require('vm');
        const requirejs = require(process.argv[1]);
        const config = vm.runInNewContext(fs.readFileSync(process.argv[2], 'utf8'));
        config.appDir = path.join(process.argv[3], 'client');
        config.baseUrl = 'js';
        config.dir = path.join(process.argv[3], 'built');
        config.modules.find(module => module.name === 'home').include = ['main'];
        requirejs.optimize(config, () => {
            const scripts = path.join(config.dir, 'js');
            for (const name of ['main', 'app', 'dialoguetext', 'timer', 'bubble']) {
                fs.unlinkSync(path.join(scripts, name + '.js'));
            }
        }, error => { console.error(error); process.exitCode = 1; });
    `;
    // The optimizer patches its loader for dependency tracing, so boot with a
    // fresh RequireJS instance, as the browser does after receiving the build.
    const bootScript = `
        const requirejs = require(process.argv[1]);
        requirejs.config({baseUrl: process.argv[2], paths: {jquery: 'lib/require-jquery'}});
        requirejs.onError = error => { console.error(error); process.exitCode = 1; };
        requirejs(['home'], () => requirejs(['main'], main => {
            if (typeof main.App.DialogueText !== 'function') throw new Error('Startup dialogue dependency is unavailable');
            main.loadGame(game => {
                if (game.DialogueText !== main.App.DialogueText) throw new Error('Game did not reuse the startup dialogue dependency');
                console.log('Startup and deferred game load completed');
            });
        }));
    `;
    try {
        const build = spawnSync(process.execPath, ['-e', buildScript,
            path.join(__dirname, 'r.js'), path.join(__dirname, '../client/js/build.js'), fixture,
        ], {encoding: 'utf8', timeout: 15000});
        expect(build.error).toBeUndefined();
        expect(build.stderr).toBe('');
        expect(build.status).toBe(0);
        const result = spawnSync(process.execPath, ['-e', bootScript,
            path.join(__dirname, 'r.js'), path.join(fixture, 'built/js'),
        ], {encoding: 'utf8', timeout: 15000});
        expect(result.error).toBeUndefined();
        expect(result.stderr).toBe('');
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Startup and deferred game load completed');
    } finally {
        fs.rmSync(fixture, {recursive: true, force: true});
    }
});

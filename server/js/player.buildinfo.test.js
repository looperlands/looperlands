const fs = require('fs');
const vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');

function setup(manifest, environment = {}) {
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve('./player'), 'utf8'), {
        module, process: {env: environment}, Character: {extend: methods => methods},
        require: name => {
            if (name === '../../shared/js/gametypes') return Types;
            if (name === './hotreload') return {current: () => manifest && {manifest}};
            if (name === './looperlandsplatformclient.js') return {LooperLandsPlatformClient: function () {}};
            return {};
        }
    });
    const player = module.exports;
    player.connection = {send: jest.fn()};
    return player;
}

const welcome = [Types.Messages.WELCOME, 42, 'Player', 16, 210, 41, '', 1000];

test('welcome appends current HMR release metadata without changing legacy fields or input', () => {
    const manifest = {builtAt: '2026-10-20T23:30:00Z', revision: 'a'.repeat(40)};
    const player = setup(manifest, {GAME_BUILD_DATE: '2026-10-19T10:00:00Z'});
    player.send(welcome);
    expect(player.connection.send).toHaveBeenLastCalledWith([...welcome, manifest]);
    manifest.builtAt = '2026-10-21T00:00:00Z';
    manifest.revision = 'b'.repeat(40);
    player.send(welcome);
    expect(player.connection.send).toHaveBeenLastCalledWith([...welcome, manifest]);
    expect(welcome).toHaveLength(8);
});

test('freshly recreated servers use the persisted image build date', () => {
    const player = setup({revision: 'a'.repeat(40)}, {GAME_BUILD_DATE: '2026-10-20T23:30:00Z'});
    player.send(welcome);
    expect(player.connection.send).toHaveBeenCalledWith([...welcome, {builtAt: '2026-10-20T23:30:00Z', revision: 'a'.repeat(40)}]);
});

test('development welcomes and other packets retain their existing representation', () => {
    const player = setup();
    player.send(welcome);
    expect(player.connection.send).toHaveBeenLastCalledWith(welcome);
    const message = {serialize: () => [Types.Messages.HEALTH, 41]};
    player.send(message);
    expect(player.connection.send).toHaveBeenLastCalledWith(message);
});

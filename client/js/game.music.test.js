const fs = require('fs');
const vm = require('vm');

function setup() {
    let definition;
    const maps = [];
    function Mapx(unscaled, game, mapId) {
        Object.assign(this, {
            mapId, tilesets: [mapId], stopStreamCheck: jest.fn(),
            _initStreamCheck: jest.fn(), updateStreamMusic: jest.fn(),
            ready: callback => {this.onReady = callback;},
        });
        maps.push(this);
    }
    function AudioManager() {this.destroy = jest.fn();}
    const dependencies = {map: Mapx, audio: AudioManager};
    vm.runInNewContext(fs.readFileSync(require.resolve('./game'), 'utf8'), {
        Class: {extend: value => value}, console: {log: jest.fn()},
        define: (names, factory) => {definition = factory(...names.map(name => dependencies[name] || {}));},
    });
    const game = Object.assign(Object.create(definition), {
        combatFeedback: {clear: jest.fn()}, toolImpactFeedback: {clear: jest.fn()},
        infoManager: {clear: jest.fn()}, storage: {setMapId: jest.fn()},
        renderer: {upscaledRendering: false, scale: 1, setTileset: jest.fn()},
        audioManager: {playStreamMusic: jest.fn(), destroy: jest.fn()},
        app: {settings: {setSettings: jest.fn()}},
    });
    return {game, maps};
}

test('loading a new map stops old polling and only the current ready callback can start a stream check', () => {
    const {game, maps} = setup();
    game.loadMap('first');
    game.loadMap('second');
    expect(maps[0].stopStreamCheck).toHaveBeenCalledTimes(1);
    expect(game.audioManager.playStreamMusic).toHaveBeenCalledWith(null);
    maps[0].onReady();
    expect(game.renderer.setTileset).not.toHaveBeenCalled();
    expect(maps[0]._initStreamCheck).not.toHaveBeenCalled();
    expect(maps[1]._initStreamCheck).not.toHaveBeenCalled();
    maps[1].onReady();
    expect(game.renderer.setTileset).toHaveBeenCalledWith('second');
    expect(maps[1]._initStreamCheck).toHaveBeenCalledTimes(1);
});

test('reinitializing audio destroys old listeners before restoring the current stream and preferences', () => {
    const {game} = setup();
    game.loadMap('first');
    const previous = game.audioManager;
    game.map.updateStreamMusic.mockImplementation(() => {
        expect(previous.destroy).toHaveBeenCalledTimes(1);
        expect(game.audioManager).not.toBe(previous);
    });
    game.loadAudio();
    expect(game.map.updateStreamMusic).toHaveBeenCalledTimes(1);
    expect(game.app.settings.setSettings).toHaveBeenCalledTimes(1);
});

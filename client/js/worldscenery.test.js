const fs = require('fs'), vm = require('vm');
function setup() {let scenery; vm.runInNewContext(fs.readFileSync(require.resolve('./worldscenery'), 'utf8'), {define: factory => {scenery = factory();}}); return scenery;}
test('renderer descriptors load external scripts, reject invalid names and clear removed scenery', () => {
    const scenery = setup(), renderer = {registerExtension: jest.fn(), setExtensionData: jest.fn()};
    scenery.update(renderer, {rendererExtensions: [{id: 'first', script: 'first-worker.js', data: {frame: 1}}, {id: 'second', script: 'second-worker.js', data: {frame: 2}}, {id: 'bad', script: '../escape-worker.js'}]});
    expect(renderer.registerExtension.mock.calls.map(call => call[0])).toEqual(['first-worker.js', 'second-worker.js']);
    scenery.update(renderer, {rendererExtensions: [{id: 'second', script: 'second-worker.js', data: {frame: 3}}]});
    expect(renderer.setExtensionData).toHaveBeenCalledWith('first', null); scenery.update(renderer, null);
    expect(renderer.setExtensionData).toHaveBeenCalledWith('second', null);
});
test('registered music is replaced and cleared without disturbing map music', () => {
    const scenery = setup(), renderer = {registerExtension: jest.fn(), setExtensionData: jest.fn()};
    const original = {track: 'map'}, audio = {areas: [original], addArea(...args) {this.areas.push({args});}, updateMusic: jest.fn()}, game = {audioManager: audio};
    scenery.update(renderer, {musicAreas: [{x: 1, y: 2, width: 3, height: 4, track: 'music'}]}, game);
    expect(audio.areas).toHaveLength(2); scenery.update(renderer, null, game); expect(audio.areas).toEqual([original]);
    expect(audio.updateMusic).toHaveBeenCalledTimes(2);
});

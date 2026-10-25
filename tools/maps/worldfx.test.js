const fs = require('fs'), vm = require('vm');
global.Types = {};
const processMap = require('./processmap');
function input(properties) {
    return {map: {width: 4, height: 4, tilewidth: 16, tileset: [], layer: [],
        objectgroup: [{name: 'scenes', object: [{id: 1, name: 'Forest', x: 0, y: 0, width: 64, height: 64,
            properties: {property: Object.entries(properties).map(([name, value]) => ({name, value}))}}]}]}};
}
beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());
test.each(['client', 'server'])('Tiled String properties export validated scene FX for %s', mode => {
    const fx = {enabled: {heat: true}, fires: [{x: 16, y: 32, width: 16, height: 16}]};
    const map = processMap(input({ambience: 'forest', fx: JSON.stringify(fx)}), {mode});
    expect(map.scenes[0]).toMatchObject({ambience: [{type: 'leaves', count: 9}, {type: 'pollen', count: 4}], fx});
});
test.each(['client','server'])('custom ambience survives %s map export',mode=>{
    const effect={type:'custom',count:6,design:require('../../client/js/worldfxconfig').custom({shape:'star',glow:10})};
    expect(processMap(input({ambience:JSON.stringify([effect])}),{mode}).scenes[0].ambience).toEqual([effect]);
});
test.each([{ambience: 'unknown'}, {ambience: '[{"type":"leaves","count":900}]'}, {fx: '{broken'}, {fx: '{"enabled":{"rain":true}}'}])('map export rejects invalid FX authoring data: %j', properties => {
    expect(() => processMap(input(properties), {mode: 'client'})).toThrow();
});
test('client scene areas retain authored ambience and FX without an NPC schedule', () => {
    let methods;
    vm.runInNewContext(fs.readFileSync(require.resolve('../../client/js/map'), 'utf8'), {
        Class: {extend: value => value}, _: require('underscore'),
        define: (_, factory) => { methods = factory(null, class Area {
            constructor(x, y, width, height) { Object.assign(this, {x, y, width, height}); }
        }); },
    });
    const scene = {id: 1, x: 0, y: 0, w: 4, h: 4, ambience: 'forest', fx: {enabled: {heat: false}}};
    expect(methods._getScenes({scenes: [scene]})[1]).toMatchObject({ambience: 'forest', fx: scene.fx});
});

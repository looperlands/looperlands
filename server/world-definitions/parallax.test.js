// Game messages use the legacy sloppy-mode inheritance helper.
global.Types = {};
jest.mock('../js/lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('../js/lib/class'), 'utf8'), {exports});
    return exports;
});
const {createParallaxScene} = require('./parallax');
const definitions = require('../../tools/worlds/main.json').atmosphere.map(row => ({sceneId: Number(row.sceneId), ...row.parallax}));
const main = require('../js/localworldauthoring').applyAtmosphere(require('../maps/world_server_main.json'), require('../../tools/worlds/main.json').atmosphere);

test('main examples resolve real map scene IDs and package all renderer planes', () => {
    const scene = createParallaxScene({map: main}, definitions);
    const extensions = scene.packet().rendererExtensions;
    expect(extensions.map(entry => entry.id)).toEqual(['parallax-background', 'parallax-ground', 'parallax-entities', 'parallax-foreground']);
    expect(extensions[0].data.scenes.map(scene => scene.id)).toEqual([624, 627, 628, 629, 630, 631, 633, 638, 639]);
    for (const scene of extensions[0].data.scenes) {
        const original = main.scenes.find(entry => entry.id === scene.id);
        expect(scene).toMatchObject({x: original.x, y: original.y, w: original.w, h: original.h});
        for (const layer of scene.layers) {
            expect(require('fs').existsSync(require('path').join(__dirname, '../../client', layer.image))).toBe(true);
        }
    }
});

test('DreamLand resolves the sky-island scene on m88n with slower clouds beneath terrain', () => {
    const map = require('../js/localworldauthoring').applyAtmosphere(require('../maps/world_server_m88n.json'), require('../../tools/worlds/m88n.json').atmosphere);
    const packet = createParallaxScene({map}, definitions).packet();
    const [scene] = packet.rendererExtensions[0].data.scenes;
    expect(scene).toMatchObject({id: 1943, x: 0, y: 120, w: 126, h: 60, cutoutColors: [[72,196,248]]});
    expect(scene.layers.every(layer => layer.plane === 'background' && layer.factorX < 1 && layer.factorY < 1)).toBe(true);
});

test('scene edits and removals are reflected without retaining stale geometry', () => {
    const world = {map: {scenes: [{id: 627, x: 1, y: 2, w: 3, h: 4, parallax: definitions[0]}]}};
    const scene = createParallaxScene(world, definitions);
    expect(scene.packet().rendererExtensions[0].data.scenes[0].x).toBe(1);
    world.map.scenes[0].x = 9;
    expect(scene.packet().rendererExtensions[0].data.scenes[0].x).toBe(9);
    world.map.scenes = [];
    expect(scene.packet().rendererExtensions[0].data.scenes).toEqual([]);
});

test('forest replaces tiled trees with rooted, depth-sorted assemblies and three canopy heights', () => {
    const forest = definitions.find(scene => scene.sceneId === 628);
    expect(forest.placements).toHaveLength(45);
    expect(forest.layers.filter(layer => layer.placed && layer.plane === 'foreground')).toHaveLength(3);
    expect(forest.layers.filter(layer => layer.placed).every(layer => layer.opacity === 1 && !layer.playerClearance)).toBe(true);
    expect(forest.layers.some(layer => layer.placed && layer.plane === 'entities')).toBe(true);
    const client = require('../../client/maps/world_client_main.json');
    const treeTiles = new Set([213,214,215,216,233,234,235,236,253,254,255,256,273,274,275,276,293,294,295,296,314,315]);
    for (let y = 141; y < 193; y++) for (let x = 0; x < 93; x++) {
        expect([].concat(client.data[y * client.width + x]).some(tile => treeTiles.has(tile))).toBe(false);
    }
    for (const placement of forest.placements) {
        const x = placement.x / 16 - 1, y = placement.y / 16 + 141 + 0.5;
        const footprint = [(y - 2) * main.width + x, (y - 2) * main.width + x + 1,
            (y - 1) * main.width + x, (y - 1) * main.width + x + 1];
        expect(footprint.some(index => main.collisions.includes(index) && client.blocking.includes(index))).toBe(true);
    }
});

test('clouds and mist have gentle, distinct autonomous drift even with a stationary camera', () => {
    const cloud = definitions.find(scene => scene.sceneId === 627).layers.filter(layer => layer.image.endsWith('clouds.png'));
    const mist = definitions.find(scene => scene.sceneId === 629).layers.filter(layer => layer.image.endsWith('mist.png'));
    expect(cloud.every(layer => layer.driftX > 0 && layer.driftY > 0)).toBe(true);
    expect(mist[0].driftX).toBeLessThan(0);
    expect(mist[1].driftY).toBeLessThan(0);
    expect(new Set([...cloud, ...mist].map(layer => [layer.driftX, layer.driftY].join(','))).size).toBe(4);
    for (const layer of [...cloud, ...mist]) expect(Math.hypot(layer.driftX, layer.driftY)).toBeLessThan(1.5);
});


test('scene presentation is delivered and updated without the NPC behavior engine', () => {
    const {WorldScenes} = require('../js/worlddefinitions');
    const player = {id: 1}, world = {players: {1: player}, map: main, pushToPlayer: jest.fn()};
    const scene = createParallaxScene(world, definitions);
    const scenes = new WorldScenes([{id: 'parallax', scene}]);
    scenes.sync(world); scenes.sync(world);
    expect(world.pushToPlayer).toHaveBeenCalledTimes(1);
    const serialized = world.pushToPlayer.mock.calls[0][1].serialize();
    expect(serialized[1].rendererExtensions[0].data.scenes).toHaveLength(9);
    world.map = {scenes: []}; scenes.sync(world);
    expect(world.pushToPlayer).toHaveBeenCalledTimes(2);
    expect(world.pushToPlayer.mock.calls[1][1].serialize()[1].rendererExtensions[0].data.scenes).toEqual([]);
    world.players = {}; scenes.sync(world);
    expect(world.pushToPlayer).toHaveBeenCalledTimes(2);
});

test('overlapping scenes exclude earlier regions even when they have no parallax', () => {
    const world={map:{scenes:[{id:'room',x:2,y:2,w:3,h:3},{id:'outside',x:0,y:0,w:20,h:20,parallax:{layers:[]}}]}};
    const scene=createParallaxScene(world).packet().rendererExtensions[0].data.scenes[0];
    expect(scene.exclude).toEqual([{x:32,y:32,w:48,h:48}]);
    world.map.scenes.reverse();
    expect(createParallaxScene(world).packet().rendererExtensions[0].data.scenes[0].exclude).toEqual([]);
});

test('flying shadows belong only to authored outdoor regions, never caves or interiors', () => {
    for (const [mapId, asset, expected] of [
        ['main', 'bird-shadow', [624,627,628,629,630,631,633]],
        ['duckville', 'dragon-shadow', [740]]
    ]) {
        const doc = require('../../tools/worlds/' + mapId + '.json');
        const {applyScenes} = require('../js/localworldscenes');
        const map = require('../js/localworldauthoring').applyAtmosphere(
            applyScenes(require('../maps/world_server_' + mapId + '.json'), doc.scenes), doc.atmosphere);
        const scenes = createParallaxScene({map}).packet().rendererExtensions[0].data.scenes;
        const shadows = scenes.filter(scene => scene.layers.some(layer => layer.image.endsWith(asset + '.png')));
        expect(shadows.map(scene => Number(scene.id)).sort((a,b) => a-b)).toEqual(expected.slice().sort((a,b) => a-b));
        for (const scene of shadows) {
            const layer = scene.layers.find(layer => layer.image.endsWith(asset + '.png'));
            expect(layer).toMatchObject({plane: 'ground', factorX: 1, factorY: 1, activeSceneOnly: true});
            expect(layer.spacingY).toBeGreaterThan(layer.height * 4);
            for (const kind of ['client','server']) {
                expect(require('../../' + kind + '/maps/world_' + kind + '_' + mapId + '.json').scenes.find(s => String(s.id) === String(scene.id)).parallax).toEqual(doc.atmosphere.find(row => row.sceneId === String(scene.id)).parallax);
            }
        }
        expect(shadows.some(scene => /cave|cavern|house|shop|gauntlet/i.test(map.scenes.find(s => String(s.id) === String(scene.id)).name))).toBe(false);
    }
});

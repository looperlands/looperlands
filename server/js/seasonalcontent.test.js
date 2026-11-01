global.Types = {};
const path = require('path');
const Content = require('./seasonalcontent');
const root = path.resolve(__dirname, '../..');
const document = () => structuredClone(require('../../tools/seasons/main.json'));
const tile = () => ({x: 33, y: 202, from: 213, colorShift: {colorDifference: {r: 0, g: 0, b: 0}, progress: 1}});
const sound = () => ({id: 'test', name: 'Test sound', preset: 'water', x: 46, y: 297, radius: 6, volume: .25});

test('the migrated source validates against the map and feeds all existing adapters unchanged', () => {
    const source = Content.validate(root, 'main'), event = source.events[0];
    expect(require('../world-definitions/halloween-actors').placements).toEqual(event.actors);
    expect(require('../world-definitions/halloween-scenery')).toEqual({decorations: event.decorations, tiles: event.tiles, ambientSounds: event.ambientSounds});
    expect(require('../world-definitions/halloween-season').availability).toEqual({...event.availability, enabled: event.enabled});
    const scenes = Content.context(root, 'main').client.scenes;
    const parallax = require('../world-definitions/halloween-parallax').createParallax(scenes);
    expect(parallax.scenes.map(({id, layers}) => ({sceneId: String(id), layers}))).toEqual(event.parallax.map(row => ({...row, sceneId: String(row.sceneId)})));
});

test.each([
    ['unknown fields', event => {event.runCode = 'no';}],
    ['enabled type', event => {event.enabled = 'false';}],
    ['two enabled owners', event => {event.availability.enabled = false;}],
    ['invalid annual date', event => {event.availability.annual.start = '02-30';}],
    ['unknown NPC', event => {event.actors[0].kind = 'not-an-npc';}],
    ['duplicate actor identity', event => {event.actors[1].key = event.actors[0].key;}],
    ['foreign actor identity', event => {event.actors[0].key = 'other:witch';}],
    ['image traversal', event => {event.decorations[0].image = '/img/1/../../config.png';}],
    ['scripted label', event => {event.actors[0].label = '<script>bad</script>';}],
    ['invalid color', event => {event.tiles = [tile()]; event.tiles[0].colorShift.colorDifference.r = 256;}],
    ['unsupported parallax plane', event => {event.parallax[0].layers[0].plane = 'background';}],
    ['unsupported placed layer', event => {event.parallax[0].layers[0].placed = true;}],
    ['duplicate scene layers', event => {event.parallax.push(event.parallax[0]);}],
    ['invalid audio', event => {event.ambientSounds = [{...sound(), preset: 'unknown'}];}],
    ['oversized text values', event => {event.textOverrides = {test: 'x'.repeat(6001)};}]
])('strict source schema rejects %s', (label, change) => {
    const source = document(); change(source.events[0]);
    expect(() => Content.validateDocument(source)).toThrow();
});

test.each([
    ['blocked actor', event => {event.actors[0].x = 0;}, /walkable/],
    ['overlapping actors', event => {Object.assign(event.actors[1], {x: event.actors[0].x, y: event.actors[0].y});}, /share arrival/],
    ['occupied procession destination', event => {const ghosts = event.actors.filter(actor => actor.route); Object.assign(ghosts[0].route[0], {x: ghosts[1].x, y: ghosts[1].y});}, /separate arrival/],
    ['routine outside map', event => {const ghost = event.actors.find(actor => actor.route); ghost.area.x = 999;}, /routine/i],
    ['missing image', event => {event.decorations[0].image = '/img/1/not-a-seasonal-image.png';}, /Missing seasonal image/],
    ['oversized image crop', event => {event.decorations[0].frame = {x: 0, y: 0, width: 256, height: 256};}, /frame must fit/],
    ['outdated tile guard', event => {event.tiles = [{...tile(), from: 999999}];}, /no longer matches/],
    ['missing scene', event => {event.parallax[0].sceneId = 'removed-scene';}, /missing scene/],
    ['missing custom sound', event => {event.ambientSounds = [{...sound(), preset: 'upload:gone--' + 'a'.repeat(64) + '.wav'}];}, /missing/i]
])('map and asset validation rejects %s', (label, change, error) => {
    const source = document(); change(source.events[0]);
    expect(() => Content.validate(root, 'main', source)).toThrow(error);
});

test('parallax follows edited scene bounds without storing a second copy of geometry', () => {
    const create = require('../world-definitions/halloween-parallax').createParallax;
    const scene = {id: '624', x: 3, y: 4, w: 5, h: 6};
    expect(create([scene]).scenes[0]).toMatchObject(scene);
    const first = create([scene]); first.scenes[0].layers[0].opacity = 0;
    expect(create([scene]).scenes[0].layers[0].opacity).not.toBe(0);
});

test('combined event budgets cannot silently overflow shared renderer limits', () => {
    const source = document(), first = source.events[0];
    const extra = {id: 'extra', name: 'Extra', enabled: false, availability: {annual: {start: '01-01', end: '02-01'}},
        actors: [], decorations: [], tiles: [], ambientSounds: [], parallax: []};
    source.events.push(extra);
    extra.decorations = Array.from({length: 512}, () => first.decorations[0]);
    expect(() => Content.validateDocument(source)).toThrow(/512 decorations across/);
    extra.decorations = [];
    first.tiles = [tile()]; extra.tiles = Array.from({length: 512}, (_, x) => ({...tile(), x}));
    expect(() => Content.validateDocument(source)).toThrow(/512 tile appearances across/);
    extra.tiles = [];
    extra.parallax = [{sceneId: first.parallax[0].sceneId, layers: Array(8).fill(first.parallax[0].layers[0])}];
    expect(() => Content.validateDocument(source)).toThrow(/eight seasonal layers per scene/);
});

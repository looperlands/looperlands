global.Types = {};
const processMap = require('./processmap');

const properties = values => ({property: Object.entries(values).map(([name, value]) => ({name, value}))});

function exportMap(mode, groups) {
    return processMap({map: {width: 172, height: 500, tilewidth: 16, tileset: [], layer: [],
        objectgroup: Object.entries(groups).map(([name, object]) => ({name, object}))}}, {mode});
}

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

test('chests, rewards and entrances snap to whole tiles during export', () => {
    const groups = {
        chests: {id: 801, x: 1456, y: 1798, properties: properties({items: 'flask', delay: '480'})},
        chestareas: {id: 802, x: 32, y: 48, width: 32, height: 48, properties: properties({x: '3.75', y: '6.2', items: 'flask'})},
        doors: {id: 803, x: '39.5', y: 57, properties: properties({x: '2.7', y: '4.2', cx: '6.5', cy: '8.4', map: 'destination'})},
        lights: {id: 804, x: 20, y: 21, width: 17, height: 17, ellipse: {}},
    };
    const server = exportMap('server', groups);
    const client = exportMap('client', groups);

    expect(server.staticChests).toEqual([expect.objectContaining({x: 91, y: 112, d: 480000})]);
    expect(server.chestAreas).toEqual([expect.objectContaining({tx: 4, ty: 6})]);
    expect(server.doors).toEqual([expect.objectContaining({x: 2, y: 4, p: 0, tx: 3, ty: 4, tcx: 7, tcy: 8, tmap: 'destination'})]);
    expect(client.doors).toEqual(server.doors);
    expect(client.lights).toEqual([expect.objectContaining({x: 28.5, y: 29.5})]);
});

test('fractional map rectangles keep their original set of whole tiles', () => {
    const bounds = {x: '34.5', y: 55, width: '36.5', height: 28};
    const groups = {
        roaming: {...bounds, id: 1, type: 'rat', properties: properties({nb: 2})},
        checkpoints: {...bounds, id: 2},
        triggers: {...bounds, id: 3, properties: properties({trigger: 'enter', promptAnchor: '3.5,4'})},
        fishing: {...bounds, id: 4, properties: properties({scope: 'closed'})},
        music: {...bounds, id: 5, properties: properties({music: 'forest'})},
        pvpzones: {...bounds, id: 6},
        eventBoards: {...bounds, id: 7},
    };
    const server = exportMap('server', groups);
    const client = exportMap('client', groups);
    const expectedBounds = {x: 3, y: 4, w: 2, h: 2};

    expect(server.roamingAreas).toEqual([expect.objectContaining({x: 3, y: 4, width: 2, height: 2, nb: 2})]);
    expect(server.checkpoints).toEqual([expect.objectContaining(expectedBounds)]);
    expect(client.checkpoints).toEqual([expect.objectContaining(expectedBounds)]);
    expect(server.triggers).toEqual([expect.objectContaining({...expectedBounds, promptAnchor: '3.5,4'})]);
    expect(client.triggers).toEqual(server.triggers);
    expect(server.fishingAreas).toEqual([expect.objectContaining({x: 3, y: 4, width: 2, height: 2})]);
    expect(client.fishingAreas).toEqual(server.fishingAreas);
    for (const group of ['musicAreas', 'pvpZones', 'eventBoards']) {
        expect(server[group]).toEqual([expect.objectContaining(expectedBounds)]);
        expect(client[group]).toEqual(server[group]);
    }
});

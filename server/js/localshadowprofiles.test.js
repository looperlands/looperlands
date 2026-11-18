const fs = require('fs');
const os = require('os');
const path = require('path');
const {EventEmitter} = require('events');
const {install} = require('./localshadowprofiles');
const {MapmakerToolbox} = require('../../bin/local-mapmaker');

const endpoint = '/local/api/shadow-profiles';
const atlasDir = 'client/img/common/height-proxies/';
const body = {name: 'Post', bounds: [4, 2, 16, 20], shape: 'wall', front: 10, slope: .5, depth: 3};
const paint = [[0,20,24,32]];
const outdoor = {x: 2, y: 2, width: 2, height: 3};
const art = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAT0lEQVR4nGNgGOmAEV0gPsD8PykGLNxwEsMMUgATJZqpAUYdMOqAUQeMOmDUAaMOGHXAqAOQWzM2FJhzhFyNAx4Cow4YdcCAO2AUjIIBBwBfZwUxJOiRUQAAAABJRU5ErkJggg==', 'base64');
let root, toolbox, routes;

function write(file, data) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), data);
}
function pngSize(data) {return [data.readUInt32BE(16), data.readUInt32BE(20)];}
const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
async function request(method, suffix = '', data = {}) {
    const response = Object.assign(new EventEmitter(), {code: 200, status(code) {this.code = code; return this;}, type(mime) {this.mime = mime; return this;},
        json(value) {this.value = value;}, send(value) {this.value = value;}});
    await routes.get(method + endpoint + suffix)({query: data, body: data}, response);
    return response;
}
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'shadow-tool-test-'));
    write('server/config.json', JSON.stringify({maps: ['oa', 'oadungeon']}));
    for (const mapId of ['oa','oadungeon']) write('client/maps/world_client_' + mapId + '.json', JSON.stringify({width: 8, height: 8, data: Array(64).fill(1)}));
    write('client/img/1/tilesheet_oa.png', art);
    write('tools/maps/height_profiles/oa.json', JSON.stringify({fullHeight: true, bodies: [], outdoors: {oa: [outdoor]}}));
    write('tools/maps/generate_main_height_proxies.py', fs.readFileSync(path.resolve(__dirname, '../../tools/maps/generate_main_height_proxies.py')));
    write(atlasDir + 'catalog.json', JSON.stringify({other: {height: 'other.png'}}));
    toolbox = new MapmakerToolbox({root});
    routes = new Map();
    install({get: (url, h) => routes.set('GET' + url, h), post: (url, h) => routes.set('POST' + url, h)}, toolbox);
});
afterEach(() => fs.rmSync(root, {recursive:true, force:true}));

test('a native PNG preview is cropped to the draft body and leaves the shared map profile untouched', async () => {
    const maps = await request('GET');
    expect(maps.value.maps).toEqual([{id: 'oa', name: 'oa', tileset: 'oa'}, {id: 'oadungeon', name: 'oadungeon', tileset: 'oa'}]);
    const details = (await request('GET', '', {mapId: 'oadungeon'})).value;
    expect(details).toMatchObject({mapId:'oadungeon', tileset:'oa', artWidth:32, artHeight:32, mapWidth:8, mapHeight:8, bodies:[], outdoors:[]});
    const preview = await request('POST', '/preview', {mapId:'oadungeon', body});
    expect(preview.mime).toBe('png');
    expect(pngSize(preview.value)).toEqual([12,18]);
    expect((await request('GET', '', {mapId:'oadungeon'})).value.revision).toBe(details.revision);
    expect(fs.existsSync(path.join(root, atlasDir, 'oa.png'))).toBe(false);
});

test('saving a shared tileset rebakes both source images and preserves the other map’s outdoor boundary', async () => {
    const details = (await request('GET', '', {mapId:'oadungeon'})).value;
    const input = {...details, bodies:[body], paint, outdoors:[{x:1,y:0,width:7,height:4}]};
    const installing = request('POST', '', input);
    expect(() => toolbox.startBuild('oadungeon')).toThrow('shadow profile save');
    expect((await request('POST', '', input)).code).toBe(409);
    const done = await installing;
    expect(done.code).toBe(200);
    expect(done.value.revision).not.toBe(input.revision);
    expect((await request('POST', '', input)).code).toBe(409);
    expect(read('tools/maps/height_profiles/oa.json')).toMatchObject({fullHeight:true, bodies:[body], paint,
        outdoors:{oa:[outdoor], oadungeon:input.outdoors}});
    expect(pngSize(fs.readFileSync(path.join(root, atlasDir, 'oa.png')))).toEqual([32,32]);
    expect(read(atlasDir + 'catalog.json')).toEqual({other:{height:'other.png'},
        oa:{height:'oa.png',paint:'oa-baked-shadows.png',outdoors:{oa:[outdoor],oadungeon:input.outdoors}}});
    expect(fs.existsSync(path.join(root, atlasDir, 'oa-baked-shadows.png'))).toBe(true);
    const disable = await request('POST', '', {...done.value,bodies:[],paint:[],outdoors:[]});
    expect(disable.code).toBe(200);
    expect(read(atlasDir + 'catalog.json')).toEqual({other:{height:'other.png'}});
    expect(read('tools/maps/height_profiles/oa.json').outdoors).toEqual({oa:[outdoor]});
    for (const name of ['oa.png','oa-baked-shadows.png']) expect(fs.existsSync(path.join(root, atlasDir, name))).toBe(false);
});

test('invalid drafts, build conflicts and failed bakes leave the last published files intact', async () => {
    const details = (await request('GET', '', {mapId:'oa'})).value;
    expect((await request('GET', '', {mapId:'../oa'})).code).toBe(400);
    expect((await request('POST', '/preview', {mapId:'oa', body:{...body,bounds:[-1,0,2,3]}})).code).toBe(400);
    expect((await request('POST', '', {...details,outdoors:[{x:8,y:0,width:1,height:2}]})).code).toBe(400);
    toolbox.job = {status:'running'};
    expect((await request('POST', '', {...details,bodies:[body]})).code).toBe(409);
    toolbox.job = null;
    const error = await request('POST', '', {...details,bodies:[{...body,shape:'unsupported'}]});
    expect(error.code).toBe(422);
    expect(error.value.error).toContain('Post');
    expect((await request('GET', '', {mapId:'oa'})).value.revision).toBe(details.revision);
    expect(read(atlasDir + 'catalog.json')).toEqual({other:{height:'other.png'}});
});

test('a failed catalog replacement restores the prior profile and both PNGs', async () => {
    const existing = (await request('GET', '', {mapId:'oa'})).value;
    const original = await request('POST', '', {...existing, bodies:[body], paint});
    const files = ['tools/maps/height_profiles/oa.json', ...['catalog.json','oa.png','oa-baked-shadows.png'].map(name => atlasDir + name)];
    const readFiles = () => files.map(file => fs.readFileSync(path.join(root, file)));
    const published = readFiles(), rename = fs.renameSync;
    let attempted = false;
    const spy = jest.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
        if (to === path.join(root, atlasDir, 'catalog.json') && !attempted) {
            attempted = true;
            throw new Error('Cannot publish catalog');
        }
        return rename(from, to);
    });
    try {
        const rejected = await request('POST', '', {...original.value, bodies:[{...body, depth:1}], paint:[]});
        expect(rejected.code).toBe(500);
        expect(rejected.value.error).toBe('Cannot publish catalog');
        expect(readFiles()).toEqual(published);
        expect((await request('GET', '', {mapId:'oa'})).value.revision).toBe(original.value.revision);
    } finally { spy.mockRestore(); }
});

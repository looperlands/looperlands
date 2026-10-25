const fs = require('fs');
const os = require('os');
const path = require('path');
global.Types = {};
const {analyze, grid, reachable, install} = require('./localmapanalysis');
let root;
function write(file, value) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
}
function map(overrides = {}) {
    return {width: 8, height: 8, collisions: [], staticEntities: {'18': 'villager', '19': 'flask'}, checkpoints: [{id: 1, x: 1, y: 1, w: 1, h: 1}], doors: [], ...overrides};
}
const sources = () => ({readDoors: async () => ({doors: []}), readBehavior: () => ({config: {npcs: []}}), readQuests: () => ({quests: [], existingQuests: []})});
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'map-analysis-'));
    write('server/config.json', {maps: ['one', 'two']});
    write('tools/maps/tmx/one.tmx', '<map/>');
    for (const id of ['one', 'two']) {
        write('server/maps/world_server_' + id + '.json', map());
        write('client/maps/world_client_' + id + '.json', {...map(), data: [1, [2, 3]], tilesize: 16});
    }
    for (const id of ['villager', 'item-flask']) {
        write('client/sprites/' + id + '.json', {});
        write('client/img/1/' + id + '.png', 'fixture');
    }
});
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));
test('maps runtime entity coordinates and editor links without writing source files', async () => {
    const file = path.join(root, 'server/maps/world_server_one.json'), before = fs.readFileSync(file);
    const report = await analyze(root, 'one', sources());
    expect(report.objects.find(o => o.type === 'npc')).toMatchObject({id: 'npc:18', x: 2, y: 2, editor: '#npcs/?asset=villager'});
    expect(report.objects.find(o => o.type === 'item')).toMatchObject({x: 3, y: 2, editor: '#items/?asset=flask'});
    expect(report.summary.errors).toBe(0);
    expect(report.tiles).toEqual([1, [2, 3]]);
    expect(fs.readFileSync(file)).toEqual(before);
});
test('chest and encounter findings open the exact Tiled object in the editor',async()=>{
    write('server/maps/world_server_one.json',map({collisions:[18],roamingAreas:[{id:0,objectId:81,x:3,y:3,width:2,height:2,type:'rat',nb:1}]}));
    const options=sources();options.readEncounters=async()=>({objects:[
        {id:'80',kind:'chest',x:2,y:2,loot:[{item:'missing',weight:0}]},
        {id:'81',kind:'encounter',x:3,y:3,width:2,height:2,mob:'rat'},
        {id:'82',kind:'reward',x:5,y:5,width:1,height:1,rewardX:2,rewardY:2,loot:[]}
    ]});
    const report=await analyze(root,'one',options);
    expect(report.objects.find(o=>o.type==='spawn').editor).toBe('#encounters/?map=one&object=81');
    expect(report.findings.find(o=>o.code==='chest-item').editor).toBe('#encounters/?map=one&object=80');
    expect(report.findings.map(o=>o.code)).toEqual(expect.arrayContaining(['chest-position','chest-weight','chest-loot','reward-members']));
});
test('checks playable bounds, blocked spawns, missing assets and disconnected NPCs', async () => {
    write('server/maps/world_server_one.json', map({collisions: [19, ...Array.from({length: 8}, (_, y) => y * 8 + 4)], staticEntities: {'19': 'flask', '23': 'villager', '24': 'nonexistent'}, roamingAreas: [{id: 3, x: 0, y: 0, width: 1, height: 1, type: 'rat'}]}));
    fs.unlinkSync(path.join(root, 'client/img/1/item-flask.png'));
    const report = await analyze(root, 'one', sources());
    expect(report.findings.map(f => f.code)).toEqual(expect.arrayContaining(['blocked-entity', 'unknown-entity', 'missing-artwork', 'blocked-spawn', 'spawn-bounds', 'unreachable-entity']));
});
test('checks current Tiled entrance IDs and destination maps, tiles and item identifiers', async () => {
    const options = sources();
    options.readDoors = async () => ({doors: [
        {id: '99', tileX: 2, tileY: 3, type: 'portal', properties: {map: 'two', x: '0', y: '2', item: 'missing', level: '4', tid: 'bridge'}},
        {id: '100', tileX: 3, tileY: 3, properties: {map: 'missing'}}
    ]});
    const report = await analyze(root, 'one', options);
    expect(report.objects.find(o => o.id === 'door:99')).toMatchObject({x: 2, y: 3, editor: '#doors/?map=one&object=99'});
    expect(report.findings.map(f => f.code)).toEqual(expect.arrayContaining(['door-destination', 'door-map', 'door-item', 'door-priority', 'door-trigger']));
    expect(report.findings.find(f => f.code === 'door-destination').editor).toBe('#doors/?map=one&object=99');
});
test('flood fill includes explicit same-map portals, never cross-map portals or collisions', () => {
    const data = map({collisions: Array.from({length: 8}, (_, y) => y * 8 + 4), doors: [{x: 2, y: 2, tx: 6, ty: 2, tmap: 'one'}]});
    expect(reachable(data, grid(data), 'one').has({x: 6, y: 3})).toBe(true);
    data.doors[0].tmap = 'two';
    const result = reachable(data, grid(data), 'one');
    expect(result.has({x: 6, y: 3})).toBe(false);
    expect(result.has({x: 4, y: 3})).toBe(false);
});
test('reports quest and NPC source failures instead of presenting an all-clear', async () => {
    const options = sources();
    options.readBehavior = () => {throw new Error('Invalid route');};
    options.readQuests = () => ({validationError: 'Unknown prerequisite', quests: [{id: 'test', npc: 'guard', reward: {item: 'missing'}}], existingQuests: []});
    const report = await analyze(root, 'one', options);
    expect(report.findings.map(f => f.code)).toEqual(expect.arrayContaining(['npc-source', 'quest-validation', 'quest-npc', 'quest-item']));
});
test('reports stale and incomplete exports with a build link', async () => {
    fs.utimesSync(path.join(root, 'tools/maps/tmx/one.tmx'), new Date(), new Date(Date.now() + 5000));
    fs.unlinkSync(path.join(root, 'client/maps/world_client_one.json'));
    const report = await analyze(root, 'one', sources());
    expect(report.findings.find(f => f.code === 'stale-build').editor).toBe('#build/?map=one');
    expect(report.findings.map(f => f.code)).toContain('client-map');
});
test.each(['../one', 'unknown', undefined, ['one']])('rejects unconfigured or unsafe map IDs %j', async id => {
    await expect(analyze(root, id, sources())).rejects.toMatchObject({status: 400});
});
test('rejects symlink exports and oversized maps before allocating a grid', async () => {
    const file = path.join(root, 'server/maps/world_server_one.json');
    fs.unlinkSync(file); fs.symlinkSync(path.join(root, 'server/config.json'), file);
    await expect(analyze(root, 'one', sources())).rejects.toThrow('symbolic');
    expect(() => grid({width: 2000001, height: 1})).toThrow('2 million');
});
test('API lists maps, rejects builds in progress and omits large tile data from validator responses', async () => {
    const routes = {}, toolbox = {root, job: {status: 'running'}};
    install({get: (url, handler) => {routes[url] = handler;}}, toolbox);
    let body, status = 200;
    const res = {json: value => {body = value;}, status: value => {status = value; return res;}};
    await routes['/local/api/map-validation']({query: {}}, res);
    expect(body.maps).toEqual(['one', 'two']);
    await routes['/local/api/map-inspector']({query: {mapId: 'one'}}, res);
    expect(status).toBe(409);
    toolbox.job = null;
    // Missing authored sources become explicit findings; the API still returns geometry.
    await routes['/local/api/map-validation']({query: {mapId: 'one'}}, res);
    expect(body.mapId).toBe('one');
    expect(body).not.toHaveProperty('tiles');
    expect(body).not.toHaveProperty('collisions');
});
test('inspector serves original artwork independently of the built client and rejects unsafe paths', async () => {
    const routes={},res={type:jest.fn().mockReturnThis(),send:jest.fn(),json:jest.fn(),status:jest.fn().mockReturnThis()};
    write('client/img/1/tilesheet_one.png','original artwork');
    install({get:(url,handler)=>{routes[url]=handler;}},{root});
    await routes['/local/api/map-artwork']({query:{mapId:'one'}},res);
    expect(res.type).toHaveBeenCalledWith('png');expect(res.send).toHaveBeenCalledWith(Buffer.from('original artwork'));
    await routes['/local/api/map-artwork']({query:{mapId:'../one'}},res);expect(res.status).toHaveBeenCalledWith(400);
    fs.unlinkSync(path.join(root,'client/img/1/tilesheet_one.png'));fs.symlinkSync(path.join(root,'server/config.json'),path.join(root,'client/img/1/tilesheet_one.png'));
    await routes['/local/api/map-artwork']({query:{mapId:'one'}},res);expect(res.json).toHaveBeenLastCalledWith({error:expect.stringContaining('symbolic')});
});

const fs = require('fs'), os = require('os'), path = require('path');
const {execFileSync} = require('child_process');
global.Types = {};
const {readEncounters, saveObject, install, catalog} = require('./localencounterbuilder');
const Types = require('../../shared/js/gametypes');
global.Types = Types;
const processMap = require('../../tools/maps/processmap');
let root, file;
const xml = `<?xml version="1.0"?><map width="40" height="30" tilewidth="16" tileheight="16" nextobjectid="30" nextlayerid="9">
 <!-- Outside: café &amp; unchanged -->
 <tileset firstgid="1" name="tiles" tilewidth="16" tileheight="16"/>
 <layer id="1" name="tiles"><data><tile gid="0"/></data></layer>
 <objectgroup id="2" name="chests"><object id="7" name="Old chest" x="32" y="48" custom="retain"><!-- keep note --><properties><property name="items" value="GOLD,GOLD,flask"/><property name="future" value="keep"/></properties></object></objectgroup>
 <objectgroup id="3" name="roaming"/>
 <objectgroup id="4" name="doors"><object id="20" x="0" y="0"/></objectgroup>
</map>\n`;
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-encounters-'));
    for(const dir of ['server/maps','tools/maps/tmx'])fs.mkdirSync(path.join(root,dir),{recursive:true});
    fs.writeFileSync(path.join(root,'server/config.json'),JSON.stringify({maps:['one']}));
    fs.writeFileSync(path.join(root,'server/maps/world_server_one.json'),JSON.stringify({width:40,height:30,collisions:[205]}));
    file = path.join(root,'tools/maps/tmx/one.tmx');fs.writeFileSync(file,xml.replaceAll('\n','\r\n'));
});
afterEach(() => fs.rmSync(root,{recursive:true,force:true}));
const object = (kind, extra = {}) => ({kind,name:'Treasure',x:6,y:6,width:4,height:3,mob:'rat',count:3,loot:[{item:'GOLD',weight:.25},{item:'flask',weight:.75}],lootMode:'weighted',respawnSeconds:75,rewardX:12,rewardY:9,...extra});
async function add(kind, extra = {}, data) {data ||= await readEncounters(root,'one');return saveObject(root,{mapId:'one',revision:data.revision,operation:'add',object:object(kind,extra)});}
test('reads legacy duplicate items as equivalent weighted loot',async()=>{
    const data=await readEncounters(root,'one');expect(data.objects[0]).toMatchObject({id:'7',x:2,y:3,lootMode:'weighted',loot:[{item:'GOLD',weight:2},{item:'flask',weight:1}]});
    expect(catalog().mobs.some(row=>row.id==='rat')).toBe(true);
});
test('updates only one object, retaining unknown properties, comments, attributes and CRLF',async()=>{
    const data=await readEncounters(root,'one'), before=fs.readFileSync(file,'utf8');
    const saved=await saveObject(root,{mapId:'one',revision:data.revision,operation:'update',objectId:'7',object:{...data.objects[0],name:'Chest & "gate"',respawnSeconds:75}});
    const after=fs.readFileSync(file,'utf8'), start=before.indexOf('<object id="7"'), end=before.indexOf('</object>',start)+9,newEnd=after.indexOf('</object>',start)+9;
    expect(after.slice(0,start)).toBe(before.slice(0,start));expect(after.slice(newEnd)).toBe(before.slice(end));
    expect(after).toContain('custom="retain"');expect(after).toContain('<!-- keep note -->');expect(after).toContain('name="future" value="keep"');expect(after).not.toMatch(/(?<!\r)\n/);
    expect(saved.objects[0]).toMatchObject({name:'Chest & "gate"',respawnSeconds:75});
});
test('creates missing/self-closing layers, unique IDs, equal loot and removes objects',async()=>{
    let data=await add('encounter');expect(data.objects.find(r=>r.kind==='encounter')).toMatchObject({id:'30',mob:'rat',count:3});
    data=await add('reward',{},data);expect(data.objects.find(r=>r.kind==='reward')).toMatchObject({id:'31',rewardX:12,rewardY:9});
    data=await add('chest',{x:16,y:12,lootMode:'uniform'},data);const row=data.objects.find(r=>r.id==='32');expect(row.lootMode).toBe('uniform');
    data=await saveObject(root,{mapId:'one',revision:data.revision,operation:'remove',objectId:row.id});expect(data.objects).toHaveLength(3);
    const weighted=data.objects.find(r=>r.kind==='reward');
    data=await saveObject(root,{mapId:'one',revision:data.revision,operation:'update',objectId:weighted.id,object:{...weighted,lootMode:'uniform'}});
    expect(data.objects.find(r=>r.kind==='reward').lootMode).toBe('uniform');
});
test('normal TMX converter and production map exporter preserve gameplay fields',async()=>{
    let data=await add('encounter');data=await add('reward',{},data);data=await add('chest',{x:16,y:12},data);
    const json=path.join(root,'converted.json'), converter=fs.readFileSync(path.resolve(__dirname,'../../tools/maps/tmx2json.py'),'utf8').replace('from lxml import etree','import xml.etree.ElementTree as etree');
    execFileSync('python3',['-c',converter,file,json]);
    const log=jest.spyOn(console,'log').mockImplementation(()=>{});let built;
    try {built=processMap(JSON.parse(fs.readFileSync(json)),{mode:'server'});}finally{log.mockRestore();}
    expect(built.roamingAreas).toEqual([expect.objectContaining({objectId:30,type:'rat',nb:3,x:6,y:6,width:4,height:3})]);
    expect(built.chestAreas).toEqual([expect.objectContaining({id:31,tx:12,ty:9,i:[Types.Entities.GOLD,Types.Entities.FLASK],c:{[Types.Entities.GOLD]:.25,[Types.Entities.FLASK]:.75}})]);
    expect(built.staticChests.find(row=>row.objectId===32)).toMatchObject({x:16,y:12,d:75000,c:{[Types.Entities.GOLD]:.25}});
});
test.each([
    ['chest',{x:5,y:5},/blocked/],['chest',{x:2,y:3},/Another chest/],['chest',{loot:[]},/loot items/],
    ['chest',{loot:[{item:'missing-item',weight:1}]},/registered loot/],['chest',{loot:[{item:'GOLD',weight:0}]},/weights/],
    ['encounter',{mob:'flask'},/registered mob/],['encounter',{count:0},/population/],['encounter',{width:100},/Width/],
    ['chest',{x:1.5},/whole number/],['reward',{rewardX:5,rewardY:5},/blocked/]
])('rejects invalid %s %j without changing source',async(kind,extra,error)=>{const before=fs.readFileSync(file);await expect(add(kind,extra)).rejects.toThrow(error);expect(fs.readFileSync(file)).toEqual(before);});
test('stale and simultaneous saves never overwrite a competing change',async()=>{
    const data=await readEncounters(root,'one'), results=await Promise.allSettled([add('encounter',{},data),add('reward',{},data)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected').reason.status).toBe(409);
    await expect(add('chest',{},data)).rejects.toMatchObject({status:409});
});
test('rejects DTD, symbolic links and duplicate IDs',async()=>{
    fs.writeFileSync(file,'<!DOCTYPE map [<!ENTITY test "x">]>'+xml);await expect(readEncounters(root,'one')).rejects.toThrow(/DTD/);
    fs.writeFileSync(file,xml.replace('id="20"','id="7"'));await expect(readEncounters(root,'one')).rejects.toThrow(/unique/);
    fs.renameSync(file,file+'.backup');fs.symlinkSync(file+'.backup',file);await expect(readEncounters(root,'one')).rejects.toThrow(/symbolic/);
});
test('build and shutdown guards reject source writes',async()=>{
    const routes={}, app={get(){},post(url,handler){routes[url]=handler;}}, toolbox={root,job:{status:'running'}};install(app,toolbox);
    const res={status:jest.fn().mockReturnThis(),json:jest.fn()};await routes['/local/api/encounters']({body:{}},res);expect(res.status).toHaveBeenCalledWith(409);
    toolbox.job=null;toolbox.closed=true;await routes['/local/api/encounters']({body:{}},res);expect(res.status).toHaveBeenCalledWith(503);
});

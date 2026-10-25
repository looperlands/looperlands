const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
global.Types={};const Types=require('../../shared/js/gametypes');global.Types=Types;
const B=require('./localfishingbuilder'),Areas=require('./fishingareas'),Lakes=require('./lakes'),F=require('../../shared/js/fishingauthoring'),processMap=require('../../tools/maps/processmap');
let root,file;
const xml=`<?xml version="1.0"?><map width="20" height="15" tilewidth="16" tileheight="16" nextobjectid="30" nextlayerid="4">
 <!-- untouched café -->
 <tileset firstgid="1" name="tilesheet"><tile id="0"><properties><property name="lake" value="cobFarmLake"/></properties></tile></tileset>
 <layer id="1" name="tiles"><data encoding="csv">0,1,0,0</data></layer>
 <objectgroup id="2" name="doors"><object id="7" x="16" y="32"/></objectgroup>
</map>\n`;
const area=(extra={})=>({id:null,kind:'fishing',name:'Pond',x:4,y:4,width:3,height:2,scope:'area',sourceLake:'',level:3,fish:[{item:'cobguppy',rarity:'common'},{item:'cobgoldfish',rarity:'epic'}],editable:true,...extra});
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'mapmaker-fishing-'));for(const folder of ['server/maps','client/maps','tools/maps/tmx'])fs.mkdirSync(path.join(root,folder),{recursive:true});fs.writeFileSync(path.join(root,'server/config.json'),'{"maps":["one"]}');const map={width:20,height:15,collisions:[],fishingTiles:{84:'cobFarmLake',85:'cobFarmLake'}};for(const [dir,type]of [['client','client'],['server','server']])fs.writeFileSync(path.join(root,dir+'/maps/world_'+type+'_one.json'),JSON.stringify(map));file=path.join(root,'tools/maps/tmx/one.tmx');fs.writeFileSync(file,xml.replaceAll('\n','\r\n'));});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
async function save(objects,data){data ||= await B.readFishing(root,'one');return B.saveObjects(root,{mapId:'one',revision:data.revision,operations:objects});}
const add=object=>({operation:'add',object});
test('atomic save/readback preserves unrelated Tiled data, supports multiple changes and stale rejection',async()=>{
    const first=await B.readFishing(root,'one');expect(first.waters).toEqual([{id:'cobFarmLake',count:2,x:4,y:4,width:2,height:1}]);
    const result=await save([add(area()),add(area({x:10}))],first);expect(result.objects).toHaveLength(2);expect(result.objects[0]).toMatchObject({id:'30',level:3,fish:area().fish});
    expect(fs.readFileSync(file,'utf8')).toContain('<!-- untouched café -->\r\n');expect(fs.readFileSync(file,'utf8')).toContain('<object id="7" x="16" y="32"/>');
    const next=await save([{operation:'update',objectId:'30',object:{...result.objects[0],level:5}},{operation:'remove',objectId:'31'}],result);expect(next.objects).toHaveLength(1);expect(next.objects[0].level).toBe(5);
    await expect(save([add(area())],first)).rejects.toMatchObject({status:409});
});
test.each([
    [{fish:[]},/1 and 100/],[{fish:[{item:'flask',rarity:'common'}]},/registered catches/],
    [{fish:[{item:'cobguppy',rarity:'legendary'}]},/common/],[{level:0},/rod level/],
    [{x:19},/inside the map/],[{scope:'existing',sourceLake:'cobFarmRiver'},/no matching/],
    [{fish:[{item:'cobguppy',rarity:'common'},{item:'cobguppy',rarity:'rare'}]},/unique/]
])('rejects invalid configuration %j without writing',async(extra,pattern)=>{const before=fs.readFileSync(file);await expect(save([add(area(extra))])).rejects.toThrow(pattern);expect(fs.readFileSync(file)).toEqual(before);});
test('overlaps reject whole batch; disjoint existing waters can share rectangle bounds',async()=>{
    const before=fs.readFileSync(file);await expect(save([add(area()),add(area({x:5}))])).rejects.toThrow(/same tile/);expect(fs.readFileSync(file)).toEqual(before);
    const map={width:20,height:15,baseFishingTiles:{84:'cobFarmLake',85:'cobFarmRiver'}};
    expect(Areas.validate([area({id:'1',scope:'existing',sourceLake:'cobFarmLake'}),area({id:'2',scope:'existing',sourceLake:'cobFarmRiver'})],map)).toHaveLength(2);
});
test('normal Tiled converter exports matching server/client water and runtime tables without changing canonical buffs',async()=>{
    const data=await save([add(area())]),output=path.join(root,'converted.json');
    const converter=fs.readFileSync(path.resolve(__dirname,'../../tools/maps/tmx2json.py'),'utf8').replace('from lxml import etree','import xml.etree.ElementTree as etree');execFileSync('python3',['-c',converter,file,output]);
    const input=JSON.parse(fs.readFileSync(output)),log=jest.spyOn(console,'log').mockImplementation(()=>{});let client,server;try{client=processMap(input,{mode:'client'});server=processMap(input,{mode:'server'});}finally{log.mockRestore();}
    expect(server.fishingTiles).toEqual(client.fishingTiles);expect(client.baseFishingTiles[1]).toBe('cobFarmLake');
    const id=Areas.id(data.objects[0]);expect(client.fishingTiles[84]).toBe(id);expect(client.fishingTiles[107]).toBeUndefined();
    fs.writeFileSync(path.join(root,'server/maps/world_server_one.json'),JSON.stringify(server));const buff=Lakes.getBuffByFish('cobgoldfish');
    Areas.installDefinitions(root);try{expect(Lakes[id]).toEqual({level:3,fish:{cobguppy:'common',cobgoldfish:'epic'}});expect(Lakes.calculateFishExp('cobgoldfish',id)).toBe(F.experience(3,'epic'));expect(Lakes.getBuffByFish('cobgoldfish')).toEqual(buff);}finally{delete Lakes[id];}
});
test('existing overrides touch lake-tagged cells only, closed water removes casts, deletion restores base',()=>{
    const map={width:20,height:15,baseFishingTiles:{84:'cobFarmLake',85:'cobFarmRiver',104:'cobFarmLake'}};
    const override=area({scope:'existing',sourceLake:'cobFarmLake'}),closed=area({scope:'closed',sourceLake:'cobFarmRiver'});
    expect(Areas.apply(map,[override]).fishingTiles).toEqual({84:Areas.id(override),85:'cobFarmRiver',104:Areas.id(override)});
    expect(Areas.apply(map,[closed]).fishingTiles).toEqual({84:'cobFarmLake',104:'cobFarmLake'});
    expect(Areas.apply(Areas.apply(map,[override]),[]).fishingTiles).toEqual(map.baseFishingTiles);
});
test('rejects DTD, symlinks, offsets and concurrent stale saves',async()=>{
    fs.writeFileSync(file,'<!DOCTYPE map [<!ENTITY test "x">]>'+xml);await expect(B.readFishing(root,'one')).rejects.toThrow(/DTD/);
    fs.writeFileSync(file,xml.replace('</map>','<objectgroup name="fishing" offsetx="16"/></map>'));await expect(B.readFishing(root,'one')).rejects.toThrow(/offsets/);
    fs.writeFileSync(file,xml);const data=await B.readFishing(root,'one'),results=await Promise.allSettled([save([add(area())],data),save([add(area({x:10}))],data)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected').reason.status).toBe(409);
    fs.renameSync(file,file+'.backup');fs.symlinkSync(file+'.backup',file);await expect(B.readFishing(root,'one')).rejects.toThrow(/symbolic/);
});
test('chance preview accounts for missing tiers, multiple common fish and lucky rerolls',()=>{
    const fish=[{item:'one',rarity:'common'},{item:'two',rarity:'common'},{item:'three',rarity:'rare'}];
    expect(F.chances(fish).map(r=>r.chance)).toEqual([.48,.48,.04]);const lucky=F.chances(fish,true);expect(lucky[2].chance).toBeCloseTo(.0784);expect(lucky.reduce((sum,r)=>sum+r.chance,0)).toBeCloseTo(1);
});

test('the visual catch catalog uses real fish sprite frames',()=>{
    const dir=path.join(root,'client/sprites');fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(root,'client/img/1'),{recursive:true});
    fs.writeFileSync(path.join(dir,'cobguppy.json'),JSON.stringify({width:16,height:16}));fs.writeFileSync(path.join(root,'client/img/1/cobguppy.png'),'fixture');
    expect(B.catalog(root).items.find(row=>row.id==='cobguppy').preview).toEqual({width:16,height:16,row:0,url:'./api/fishing-sprites/cobguppy'});
});
test('updating fishing preserves unknown properties and comments on its Tiled object',async()=>{
    let saved=await save([add(area())]);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('name="scope"','name="future" value="keep"/><property name="scope"').replace('<properties>','<properties><!-- future note -->'));
    saved=await B.readFishing(root,'one');await save([{operation:'update',objectId:saved.objects[0].id,object:{...saved.objects[0],name:'Renamed'}}],saved);
    const text=fs.readFileSync(file,'utf8');expect(text).toContain('name="future" value="keep"');expect(text).toContain('<!-- future note -->');
});

const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');
global.Types={};const Types=require('../../shared/js/gametypes');global.Types=Types;
const B=require('./localzonebuilder'),processMap=require('../../tools/maps/processmap');
let root,file;
const xml=`<?xml version="1.0"?><map width="20" height="20" tilewidth="16" tileheight="16" nextobjectid="12" nextlayerid="7">
 <!-- outside café -->
 <tileset name="tilesheet" firstgid="1"><tile id="0"/></tileset><layer name="tiles"><data encoding="csv">0,0</data></layer>
 <objectgroup id="2" name="checkpoints"><object id="4" name="Arrival" type="start" x="32" y="32" width="32" height="32"><properties><property name="future" value="keep"/></properties><!-- keep note --></object><object id="7" name="Inn" x="112" y="32" width="16" height="16"/></objectgroup>
 <objectgroup id="3" name="doors"><object id="11" name="door" x="80" y="80"/></objectgroup>
</map>\n`;
const row=(kind,extra={})=>({id:null,kind,name:'Test '+kind,x:10,y:10,width:2,height:2,checkpointId:null,stableId:false,starting:false,trigger:'test-switch',delaySeconds:1.5,playerMessage:'Hello',message:'General',minigame:'spaceowls',offsetX:1,offsetY:-1,music:'village',editable:true,...extra});
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'mapmaker-zones-'));for(const dir of ['tools/maps/tmx','server/maps','client/js','client/audio/music'])fs.mkdirSync(path.join(root,dir),{recursive:true});fs.writeFileSync(path.join(root,'server/config.json'),'{"maps":["one"]}');fs.writeFileSync(path.join(root,'server/maps/world_server_one.json'),JSON.stringify({width:20,height:20,collisions:[105]}));fs.writeFileSync(path.join(root,'client/js/audio.js'),'this.musicNames = ["village","missing"];');fs.writeFileSync(path.join(root,'client/audio/music/village.mp3'),'fixture');file=path.join(root,'tools/maps/tmx/one.tmx');fs.writeFileSync(file,xml.replaceAll('\n','\r\n'));});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
async function save(changes,data){data ||= await B.readZones(root,'one');return B.saveObjects(root,{mapId:'one',revision:data.revision,operations:changes});}
const add=object=>({operation:'add',object});
function exported(mode){const output=path.join(root,'converted.json'),converter=fs.readFileSync(path.resolve(__dirname,'../../tools/maps/tmx2json.py'),'utf8').replace('from lxml import etree','import xml.etree.ElementTree as etree');execFileSync('python3',['-c',converter,file,output]);const log=jest.spyOn(console,'log').mockImplementation(()=>{});try{return processMap(JSON.parse(fs.readFileSync(output)),{mode});}finally{log.mockRestore();}}
test('removing an earlier checkpoint freezes retained runtime IDs, preserves XML and never reuses retired IDs',async()=>{
    const first=await B.readZones(root,'one');expect(first.objects.map(r=>r.checkpointId)).toEqual([1,2]);
    const saved=await save([{operation:'remove',objectId:'4'},add(row('checkpoint'))],first);expect(saved.objects.map(r=>[r.id,r.checkpointId])).toEqual([['7',2],['12',12]]);expect(saved.objects.every(r=>r.stableId)).toBe(true);
    const text=fs.readFileSync(file,'utf8');expect(text).toContain('<!-- outside café -->\r\n');expect(text).toContain('<object id="11" name="door" x="80" y="80"/>');
    let next=await save([{operation:'remove',objectId:'12'}],saved);next=await save([add(row('checkpoint'))],next);expect(next.objects.at(-1).checkpointId).toBeGreaterThan(12);
    expect(exported('server').checkpoints.map(c=>c.id)).toEqual([2,13]);
});
test('explicit high IDs reserve the Tiled counter even when deleting without adding',async()=>{
    fs.writeFileSync(file,xml.replace('name="future" value="keep"','name="checkpointId" value="1000"'));let data=await B.readZones(root,'one');data=await save([{operation:'remove',objectId:'4'}],data);data=await save([add(row('checkpoint'))],data);expect(data.objects.at(-1).checkpointId).toBe(1001);
});
test('one atomic batch saves all five zone kinds into matching client/server exports',async()=>{
    let data=await save(['checkpoint','trigger','pvp','music','eventboard'].map((kind,index)=>add(row(kind,{x:10,y:10+index*2}))));
    const server=exported('server'),client=exported('client');expect(server.checkpoints.map(c=>c.id)).toEqual([1,2,12]);expect(client.checkpoints.map(c=>c.id)).toEqual([1,2,12]);expect(server.checkpoints[0].s).toBe(1);
    expect(server.triggers[0]).toMatchObject({id:13,trigger:'test-switch',delay:1500,minigame:'spaceowls',offset:'1,-1',player_message:'Hello'});expect(client.triggers).toEqual(server.triggers);expect(server.musicAreas[0]).toMatchObject({objectId:15,id:'village'});expect(client.musicAreas).toEqual(server.musicAreas);expect(client.pvpZones).toEqual(server.pvpZones);expect(client.eventBoards).toEqual(server.eventBoards);
    const old=data.objects.find(r=>r.id==='4');data=await save([{operation:'update',objectId:'4',object:{...old,name:'Renamed',starting:false}}],data);expect(exported('server').checkpoints[0].s).toBe(0);expect(fs.readFileSync(file,'utf8')).toContain('name="future" value="keep"');expect(fs.readFileSync(file,'utf8')).toContain('<!-- keep note -->');
});
test.each([
    ['checkpoint',{x:5,y:5,width:2,height:1},/Every checkpoint tile/],['checkpoint',{x:2,y:2},/overlap/],
    ['pvp',{x:0},/playable bounds/],['trigger',{delaySeconds:-1},/delay/],['trigger',{minigame:'unbundled'},/bundled minigame/],['trigger',{offsetX:101},/offsets/],['music',{music:'missing'},/music track/]
])('rejects invalid %s %j without touching Tiled',async(kind,extra,error)=>{const before=fs.readFileSync(file);await expect(save([add(row(kind,extra))])).rejects.toThrow(error);expect(fs.readFileSync(file)).toEqual(before);});
test('preserves drafts on stale writes and rejects removal of the last checkpoint or type changes',async()=>{
    const data=await B.readZones(root,'one');await save([add(row('pvp'))],data);await expect(save([add(row('pvp'))],data)).rejects.toMatchObject({status:409});
    const current=await B.readZones(root,'one');await expect(save([{operation:'remove',objectId:'4'},{operation:'remove',objectId:'7'}],current)).rejects.toThrow(/at least one/);await expect(save([{operation:'update',objectId:'4',object:row('pvp')}],current)).rejects.toThrow(/Keep the zone type/);
});
test('rejects duplicate checkpoint IDs and same-kind trigger/music overlap; PvP unions remain allowed',async()=>{
    fs.writeFileSync(file,xml.replace('name="future" value="keep"','name="checkpointId" value="2"'));await expect(save([add(row('pvp'))])).rejects.toThrow(/IDs must be unique/);fs.writeFileSync(file,xml);
    await expect(save([add(row('trigger')),add(row('trigger'))])).rejects.toThrow(/overlap/);await expect(save([add(row('music')),add(row('music'))])).rejects.toThrow(/overlap/);expect((await save([add(row('pvp')),add(row('pvp'))])).objects.filter(r=>r.kind==='pvp')).toHaveLength(2);
});
test('rejects XML DTDs, source symlinks and gameplay layer offsets',async()=>{
    fs.writeFileSync(file,'<!DOCTYPE map [<!ENTITY test "x">]>'+xml);await expect(B.readZones(root,'one')).rejects.toThrow(/DTD/);fs.writeFileSync(file,xml.replace('name="checkpoints"','name="checkpoints" offsetx="16"'));await expect(B.readZones(root,'one')).rejects.toThrow(/offsets/);fs.writeFileSync(file,xml);fs.renameSync(file,file+'.backup');fs.symlinkSync(file+'.backup',file);await expect(B.readZones(root,'one')).rejects.toThrow(/symbolic/);
});

test('legacy overlapping music keeps its geometry while a track is edited',async()=>{
    fs.writeFileSync(file,xml.replace('</map>','<objectgroup id="4" name="music"><object id="12" x="160" y="160" width="48" height="48"><properties><property name="id" value="0"/></properties></object><object id="13" x="176" y="176" width="16" height="16"><properties><property name="id" value="0"/></properties></object></objectgroup></map>'));
    let data=await B.readZones(root,'one');const track=data.objects.find(row=>row.id==='12');data=await save([{operation:'update',objectId:'12',object:{...track,music:'village'}}],data);expect(data.objects.find(row=>row.id==='12').music).toBe('village');await expect(save([{operation:'update',objectId:'12',object:{...track,width:4}}],data)).rejects.toThrow(/overlap/);
});

const fs=require('fs'),os=require('os'),path=require('path');
global.Types={};
const {readDoors,saveDoor,validateChanges}=require('./localdoorbuilder');
const processMap=require('../../tools/maps/processmap');
let root,file;
const xml=`<?xml version="1.0" encoding="UTF-8"?>
<map width="40" height="30" tilewidth="16" tileheight="16">
 <!-- Outside: café &amp; preserved -->
 <layer name="tiles"><data encoding="csv">1,2,3</data></layer>
 <objectgroup name="doors">
  <object id="7" name="Gate &amp; bridge" type="portal" x="32" y="48" custom="retain">
   <!-- Keep this note -->
   <properties>
    <property name="x" value="12"/>
    <property name="y" value="14"/>
    <property name="collection" value="Zombie Townies"/>
    <property name="message" value="Original message"/>
    <property name="future" type="color" value="#ff0011"/>
   </properties>
  </object>
  <object id="8" x="48" y="64"><properties><property name="level" type="int" value="12"/></properties></object>
  <object id="9" class="portal" x="64" y="64"/>
 </objectgroup>
 <objectgroup name="scenes"><object id="10" x="1" y="2"/></objectgroup>
</map>\n`;
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'looperlands-doors-'));fs.mkdirSync(path.join(root,'server'),{recursive:true});fs.writeFileSync(path.join(root,'server/config.json'),JSON.stringify({maps:['one','empty']}));fs.mkdirSync(path.join(root,'tools/maps/tmx'),{recursive:true});file=path.join(root,'tools/maps/tmx/one.tmx');fs.writeFileSync(file,xml.replaceAll('\n','\r\n'));fs.writeFileSync(path.join(root,'tools/maps/tmx/empty.tmx'),'<map width="1" height="1" tilewidth="16" tileheight="16"/>');});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
test('reads Tiled object IDs, exact condition identifiers, multiline text and tile coordinates without building',async()=>{const data=await readDoors(root,'one');expect(data.doors).toHaveLength(3);expect(data.doors[0]).toMatchObject({id:'7',name:'Gate & bridge',type:'portal',tileX:2,tileY:3,properties:{collection:'Zombie Townies'},activeGates:['collection']});expect((await readDoors(root,'empty')).doors).toEqual([]);});
test('patches one object, escapes messages, keeps unknown fields/comments and preserves every outside byte',async()=>{const before=fs.readFileSync(file,'utf8'),current=await readDoors(root,'one');const saved=await saveDoor(root,{mapId:'one',doorId:'7',revision:current.revision,changes:{collection:null,level:20,message:'Bring a key & say "hello".',time_range:'22:00-06:00',tid:'!bridge'}});expect(saved.revision).not.toBe(current.revision);expect(saved.doors[0]).toMatchObject({activeGates:['level'],properties:{level:'20',message:'Bring a key & say "hello".',future:'#ff0011',tid:'!bridge'}});const after=fs.readFileSync(file,'utf8');const start=before.indexOf('<object id="7"'),end=before.indexOf('</object>',start)+9;const newEnd=after.indexOf('</object>',start)+9;expect(after.slice(0,start)).toBe(before.slice(0,start));expect(after.slice(newEnd)).toBe(before.slice(end));expect(after).toContain('custom="retain"');expect(after).toContain('<!-- Keep this note -->');expect((await readDoors(root,'one')).doors[0].properties.message).toBe('Bring a key & say "hello".');expect(after).toContain('type="int" value="20"');expect(after).not.toMatch(/(?<!\r)\n/);});
test('adds properties to a self-closing object and removes a single property without dropping the object',async()=>{let data=await readDoors(root,'one');data=await saveDoor(root,{mapId:'one',doorId:'9',revision:data.revision,changes:{message:'New message'}});expect(data.doors[2].properties.message).toBe('New message');data=await saveDoor(root,{mapId:'one',doorId:'8',revision:data.revision,changes:{level:null}});expect((await readDoors(root,'one')).doors.find(door=>door.id==='8').properties).toEqual({});});
test('stale revisions and simultaneous saves cannot overwrite another change',async()=>{const data=await readDoors(root,'one');const payload={mapId:'one',doorId:'7',revision:data.revision,changes:{message:'First'}};const results=await Promise.allSettled([saveDoor(root,payload),saveDoor(root,{...payload,changes:{message:'Second'}})]);expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);expect(results.find(result=>result.status==='rejected').reason.status).toBe(409);fs.appendFileSync(file,'\n');await expect(saveDoor(root,payload)).rejects.toMatchObject({status:409});});
test('empty changes do not rewrite the map',async()=>{const before=fs.readFileSync(file),data=await readDoors(root,'one');await saveDoor(root,{mapId:'one',doorId:'7',revision:data.revision,changes:{}});expect(fs.readFileSync(file)).toEqual(before);});
test.each(['../one','one.tmx','missing',null])('rejects paths outside configured sources: %j',async mapId=>{await expect(readDoors(root,mapId)).rejects.toMatchObject({status:400});});
test('rejects symlink sources and XML entities without exposing file contents',async()=>{fs.unlinkSync(file);fs.symlinkSync(path.join(root,'server/config.json'),file);await expect(readDoors(root,'one')).rejects.toThrow('symbolic');fs.unlinkSync(file);fs.writeFileSync(file,'<!DOCTYPE map [<!ENTITY secret SYSTEM "file:///etc/passwd">]><map width="1" height="1"/>');await expect(readDoors(root,'one')).rejects.toThrow('DTD');});
test('message-only changes preserve legacy mixed gates; changing gate rules must leave just one',()=>{expect(validateChanges({message:'Come back later.'},{nft:'token',level:'12'})).toEqual({message:'Come back later.'});expect(()=>validateChanges({level:15},{nft:'token',level:'12'})).toThrow('one main');expect(validateChanges({nft:null,level:15},{nft:'token',level:'12'})).toMatchObject({nft:null,level:15});});
test.each([{x:5},{level:0},{weapon_level:1.5},{time_range:'25:00-06:00'},{message:'<script>bad()</script>'},{item:'wood/other'},{http_redirect:'javascript:alert(1)'},{http_redirect:'https://user:pass@example.com'}])('rejects unsupported or invalid changes %j',changes=>{expect(()=>validateChanges(changes,{})).toThrow();});
test.each(['08:00-18:00','22:00-06:00','01:00-02:00','00:00-00:00'])('accepts runtime opening range %s',range=>{expect(validateChanges({time_range:range},{})).toEqual({time_range:range});});
test.each(['client','server'])('normal exporter keeps single-property and modern portal objects for %s',mode=>{const log=jest.spyOn(console,'log').mockImplementation(()=>{});try{const map=processMap({map:{width:40,height:30,tilewidth:16,tileset:[],layer:[],objectgroup:[{name:'doors',object:[{id:1,x:32,y:48,class:'portal',properties:{property:{name:'message',value:'Closed'}}},{id:2,x:16,y:16}]}]}},{mode});expect(map.doors).toEqual([{x:2,y:3,p:1,tmessage:'Closed'},{x:1,y:1,p:0}]);}finally{log.mockRestore();}});
test('local API exposes sources, enforces origin/build locks and prevents starting a build during an entrance save',async()=>{const {createToolboxApp,MapmakerToolbox}=require('../../bin/local-mapmaker');const toolbox=new MapmakerToolbox({root});const server=createToolboxApp(toolbox).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port,headers={'Content-Type':'application/json',Origin:base};try{expect(await(await fetch(base+'/local/api/doors')).json()).toEqual({maps:['one','empty']});const data=await(await fetch(base+'/local/api/doors?mapId=one')).json();const body=JSON.stringify({mapId:'one',doorId:'7',revision:data.revision,changes:{message:'Saved'}});expect((await fetch(base+'/local/api/doors',{method:'POST',headers:{...headers,Origin:'https://other.example'},body})).status).toBe(403);toolbox.job={status:'running'};expect((await fetch(base+'/local/api/doors',{method:'POST',headers,body})).status).toBe(409);toolbox.job=null;toolbox.doorSaveCount=1;expect(()=>toolbox.startBuild('one')).toThrow('entrance save');toolbox.doorSaveCount=0;const response=await fetch(base+'/local/api/doors',{method:'POST',headers,body});expect(response.status).toBe(200);expect((await response.json()).doors[0].properties.message).toBe('Saved');}finally{await new Promise(resolve=>server.close(resolve));}});

test('styled entrance messages round-trip through Tiled XML without changing markup', async () => {
    const current = await readDoors(root, 'one');
    const message = 'Bring <span class="dialogue-item">a key & coin</span>. <span class="dialogue-danger dialogue-shake">Closed!</span>';
    await saveDoor(root, {mapId: 'one', doorId: '7', revision: current.revision, changes: {message}});
    expect((await readDoors(root, 'one')).doors[0].properties.message).toBe(message);
    for (const text of ['{{remaining}}', '<span class="dialogue-wave" style="color:red">Hi</span>']) {
        expect(() => validateChanges({message: text}, {})).toThrow();
    }
});

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const {readPlacements, savePlacement, overlay, library, install} = require('./localentitybuilder');
let root;
function write(file, value) {const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value));}
const source = (extra='') => '<?xml version="1.0"?>\r\n<map width="8" height="8" tilewidth="16" tileheight="16" nextobjectid="10" nextlayerid="4">\r\n <tileset firstgid="100" name="Mobs"><tile id="0"><properties><property name="type" value="rat"/></properties></tile></tileset>\r\n <layer id="1" name="entities"><data encoding="csv">0,0,0,0,0,0,0,0,0,100</data></layer>\r\n <!-- untouched artwork and doors -->\r\n <objectgroup id="2" name="doors"><object id="7" x="32" y="48"><properties><property name="message" value="Hello &amp; goodbye"/></properties></object></objectgroup>\r\n'+extra+'</map>\r\n';
beforeEach(()=>{
    root=fs.mkdtempSync(path.join(os.tmpdir(),'entity-builder-'));
    write('server/config.json',{maps:['one']});write('server/maps/world_server_one.json',{width:8,height:8,collisions:[27]});
    write('tools/maps/tmx/one.tmx',source());write('shared/js/mapmakerentities.json',[]);
    write('shared/js/gametypes.js',fs.readFileSync(path.resolve(__dirname,'../../shared/js/gametypes.js'),'utf8'));
    for(const id of ['rat','guard','item-flask']){write('client/sprites/'+id+'.json',{width:16,height:16,animations:{idle:{row:0,length:1}}});write('client/img/1/'+id+'.png','image');}
});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
async function add(kind='rat',position={x:2,y:3}){const before=await readPlacements(root,'one');return savePlacement(root,{mapId:'one',revision:before.revision,operation:'add',kind,position});}
test('add, reload, move and remove preserve other TMX bytes and allocate unique IDs',async()=>{
    const original=source(),saved=await add();expect(saved.placements).toEqual([{id:'10',kind:'rat',x:2,y:3}]);
    const raw=fs.readFileSync(path.join(root,'tools/maps/tmx/one.tmx'),'utf8');
    expect(raw).toContain(original.slice(original.indexOf(' <tileset'),original.indexOf('</map>')));
    expect(raw).toContain('nextobjectid="11"');expect(raw).toContain('nextlayerid="5"');expect(raw).toContain('<point');
    const moved=await savePlacement(root,{mapId:'one',revision:saved.revision,operation:'move',id:'10',position:{x:4,y:4}});
    expect(moved.placements[0]).toMatchObject({id:'10',x:4,y:4});
    const removed=await savePlacement(root,{mapId:'one',revision:moved.revision,operation:'remove',id:'10'});
    expect(removed.placements).toEqual([]);expect((await add('guard')).placements[0].id).toBe('11');
});
test.each([
    ['rat',{x:3,y:3}],['rat',{x:1,y:1}],['missing',{x:2,y:2}],
    ['rat',{x:0,y:2}],['rat',{x:2,y:0}],['rat',{x:8,y:2}]
])('rejects invalid placement %s at %p without writing',async(kind,position)=>{
    const before=fs.readFileSync(path.join(root,'tools/maps/tmx/one.tmx'));
    await expect(add(kind,position)).rejects.toThrow();
    expect(fs.readFileSync(path.join(root,'tools/maps/tmx/one.tmx'))).toEqual(before);
});
test('rejects a duplicate entity point without writing',async()=>{
    await add();const before=fs.readFileSync(path.join(root,'tools/maps/tmx/one.tmx'));
    await expect(add('guard')).rejects.toThrow('already contains');
    expect(fs.readFileSync(path.join(root,'tools/maps/tmx/one.tmx'))).toEqual(before);
});
test('concurrent saves accept only one request with the same revision and stale revisions stay rejected',async()=>{
    const {revision}=await readPlacements(root,'one');const input={mapId:'one',revision,operation:'add',kind:'rat',position:{x:2,y:3}};
    const result=await Promise.allSettled([savePlacement(root,input),savePlacement(root,{...input,position:{x:4,y:4}})]);
    expect(result.map(r=>r.status).sort()).toEqual(['fulfilled','rejected']);expect(result.find(r=>r.status==='rejected').reason.status).toBe(409);
});
test('streams source files larger than 64 MB and keeps untouched content during a placement save',async()=>{
    const file=path.join(root,'tools/maps/tmx/one.tmx'),fd=fs.openSync(file,'w');
    fs.writeSync(fd,source().replace('</map>\r\n','<!--'));
    const chunk=' preserved terrain '.repeat(60000);
    for(let i=0;i<66;i++)fs.writeSync(fd,chunk);
    fs.writeSync(fd,'--></map>\r\n');fs.closeSync(fd);
    const before=fs.statSync(file).size;expect(before).toBeGreaterThan(64*1024*1024);
    expect((await add()).placements[0]).toMatchObject({kind:'rat',x:2,y:3});expect(fs.statSync(file).size).toBeGreaterThan(before);
},30000);
test('supports custom definitions and their exact gameplay kind through the real map exporter',async()=>{
    write('shared/js/mapmakerentities.json',[{id:'test_guard',name:'Test guard',kind:40000,type:'npc'}]);write('client/sprites/test_guard.json',{width:48,height:48,animations:{idle_down:{row:2,length:1}}});
    const result=await add('test_guard');expect(result.placements[0].kind).toBe('test_guard');
    const output=execFileSync('node',['-e',`global.Types={};const T=require('./shared/js/gametypes');T.registerMapmakerEntities([{id:'test_guard',kind:40000,type:'npc'}]);const processMap=require('./tools/maps/processmap');const m=processMap({map:{width:8,height:8,tilewidth:16,tileset:[],layer:[],objectgroup:[{name:'mapmaker-entities',object:[{id:10,name:'test_guard',x:32,y:48}]}]}},{mode:'server'});process.stdout.write(JSON.stringify(m.staticEntities));`],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8'});
    expect(output).toContain('"26":"test_guard"');expect(library(root).entries.find(e=>e.id==='test_guard').preview.row).toBe(2);
});
test('rejects unsafe maps, symlink sources and DTD declarations',async()=>{
    await expect(readPlacements(root,'../one')).rejects.toThrow('configured');
    write('tools/maps/tmx/one.tmx','<!DOCTYPE map [<!ENTITY x "test">]>'+source());await expect(readPlacements(root,'one')).rejects.toThrow('DTD');
    fs.unlinkSync(path.join(root,'tools/maps/tmx/one.tmx'));fs.symlinkSync(path.join(root,'server/config.json'),path.join(root,'tools/maps/tmx/one.tmx'));
    await expect(readPlacements(root,'one')).rejects.toThrow('symbolic');
});
test('source overlay replaces stale built points and preserves findings and exact editor links',()=>{
    const report={width:8,objects:[{id:'npc:26',type:'npc',kind:'guard',x:2,y:3},{id:'door:7',type:'door',x:2,y:4}],findings:[{objectId:'npc:26',severity:'warning'}],summary:{errors:0,warnings:1}};
    const result=overlay(report,{legacy:[],placements:[{id:'10',kind:'guard',x:2,y:3}],entries:[{id:'guard',type:'npc'}]});
    expect(result.objects.find(o=>o.id==='placement:10')).toMatchObject({placementId:'10',editor:'#npcs/?asset=guard'});expect(result.findings[0].objectId).toBe('placement:10');
    const moved=overlay(report,{legacy:[],placements:[{id:'10',kind:'guard',x:4,y:4}],entries:[{id:'guard',type:'npc'}]});expect(moved.objects.some(o=>o.x===2&&o.y===3)).toBe(false);
});
test('API blocks a build, reports in-flight saves and rejects writes during shutdown',async()=>{
    const routes={},toolbox={root,job:{status:'running'}},res={status:jest.fn().mockReturnThis(),json:jest.fn()};
    install({get:()=>{},post:(url,handler)=>routes[url]=handler},toolbox);
    const handler=routes['/local/api/entity-placements'];await handler({body:{}},res);expect(res.status).toHaveBeenCalledWith(409);
    toolbox.job=null;const {revision}=await readPlacements(root,'one');const work=handler({body:{mapId:'one',revision,operation:'add',kind:'rat',position:{x:2,y:3}}},res);
    expect(toolbox.entitySaveCount).toBe(1);await work;expect(toolbox.entitySaveCount).toBe(0);expect(res.json).toHaveBeenCalledWith(expect.objectContaining({placements:[expect.objectContaining({kind:'rat'})]}));
});

test('batch additions, swaps, removals and moves save together with unique IDs', async () => {
    const initial = await readPlacements(root,'one');
    const added = await savePlacement(root,{mapId:'one',revision:initial.revision,operations:[
        {operation:'add',kind:'rat',position:{x:2,y:3}}, {operation:'add',kind:'guard',position:{x:4,y:4}}
    ]});
    expect(added.placements.map(row=>row.id)).toEqual(['10','11']);
    const swapped = await savePlacement(root,{mapId:'one',revision:added.revision,operations:[
        {operation:'move',id:'10',position:{x:4,y:4}}, {operation:'move',id:'11',position:{x:2,y:3}}
    ]});
    expect(swapped.placements).toEqual([{id:'10',kind:'rat',x:4,y:4},{id:'11',kind:'guard',x:2,y:3}]);
    const final = await savePlacement(root,{mapId:'one',revision:swapped.revision,operations:[
        {operation:'remove',id:'10'}, {operation:'move',id:'11',position:{x:5,y:4}}, {operation:'add',kind:'rat',position:{x:4,y:4}}
    ]});
    expect(final.placements.map(row=>row.id)).toEqual(['11','12']);
    expect(fs.readFileSync(path.join(root,'tools/maps/tmx/one.tmx'),'utf8')).toContain('<!-- untouched artwork and doors -->');
});
test('one invalid batch placement or duplicate position writes nothing and stale batches stay rejected', async () => {
    const data=await readPlacements(root,'one'),file=path.join(root,'tools/maps/tmx/one.tmx'),before=fs.readFileSync(file);
    const operations=[{operation:'add',kind:'rat',position:{x:2,y:3}},{operation:'add',kind:'guard',position:{x:2,y:3}}];
    await expect(savePlacement(root,{mapId:'one',revision:data.revision,operations})).rejects.toThrow('already contains');
    expect(fs.readFileSync(file)).toEqual(before);
    operations[1].position={x:5,y:4};await savePlacement(root,{mapId:'one',revision:data.revision,operations});
    await expect(savePlacement(root,{mapId:'one',revision:data.revision,operations})).rejects.toThrow('changed');
});
test('different TMX editors serialize batches so a stale second save cannot overwrite the first', async () => {
    const data=await readPlacements(root,'one'), lights=require('./locallightingbuilder');
    const result=await Promise.allSettled([
        savePlacement(root,{mapId:'one',revision:data.revision,operations:[{operation:'add',kind:'rat',position:{x:2,y:3}}]}),
        lights.saveObject(root,{mapId:'one',revision:data.revision,operations:[{operation:'add',object:require('../../shared/js/mapmakerlighting').preset('lamp',4,4)}]})
    ]);
    expect(result.map(row=>row.status)).toEqual(['fulfilled','rejected']);expect(result[1].reason.status).toBe(409);
    expect((await readPlacements(root,'one')).placements).toHaveLength(1);
});

const fs=require('fs'),os=require('os'),path=require('path');
global.Types={};
const B=require('./localtilebuilder');
let root;const stage=(id='work',next='')=>({id,name:'Work',duration:0,waitSeconds:0,level:1,tool:'',quest:'',costs:[],rewards:[],xp:0,tile:0,successChance:1,next,failureNext:'',message:'',failureMessage:'',trigger:''});
const doc=()=>({version:1,actions:{repair:{type:'sequence',name:'Repair',start:'work',stages:[stage()]}},placements:[{x:3,y:4,width:2,height:1,action:'repair'}]});
const write=(p,d)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(d));};
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'tilebuilder-'));write('server/config.json',{maps:['one']});write('client/maps/world_client_one.json',{width:10,height:10,data:Array(100).fill(1),collisions:[22],doors:[],stagedTiles:{}});});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
test('saves placements and stage sequences with revision protection and immutable map overlays',()=>{const before=B.readTool(root,'one'),saved=B.save(root,{mapId:'one',revision:before.revision,document:doc()});expect(saved.document.actions.repair.stages[0].id).toBe('work');expect(()=>B.save(root,{mapId:'one',revision:before.revision,document:doc()})).toThrow('changed');const map=B.readMap(root,'one'),overlay=B.applyMap(map,saved.document);expect(overlay.authoringActions['4.4']).toEqual({action:'repair'});expect(map).not.toHaveProperty('authoringActions');expect(B.actionAt(root,'one',4,4)).toBe('repair');});
test('rejects unreachable/broken stages, collisions, overlapping placements and invalid quantities',()=>{const map=B.readMap(root,'one');for(const change of [d=>d.actions.repair.stages.push(stage('lost')),d=>d.actions.repair.stages[0].next='missing',d=>{d.placements[0].x=2;d.placements[0].y=2;},d=>d.placements.push({...d.placements[0]}),d=>d.actions.repair.stages[0].successChance=2]){const d=doc();change(d);expect(()=>B.validate(d,map)).toThrow();}});
test('source paths reject unknown maps and symbolic links',()=>{expect(()=>B.document(root,'../one')).toThrow();fs.mkdirSync(path.join(root,'tools/tiles'),{recursive:true});fs.symlinkSync(path.join(root,'server/config.json'),path.join(root,'tools/tiles/one.json'));expect(()=>B.document(root,'one')).toThrow('symbolic');});
test('all bundled farming definitions retain valid stage groups and registered yield items',()=>{const project=path.resolve(__dirname,'../..');expect(()=>B.validate({version:1,actions:B.base(project,'duckville'),placements:[]},B.readMap(project,'duckville'))).not.toThrow();});

test('new interactions are shared across maps while placements, artwork and legacy source stay separate',()=>{
    write('server/config.json',{maps:['one','two']});write('client/maps/world_client_two.json',B.readMap(root,'one'));
    const legacy=doc();write('tools/tiles/one.json',legacy);
    const before=JSON.stringify(legacy),first=B.readTool(root,'one');
    first.document.actions.chest=require('../../shared/js/interactiontemplates').create('chest');
    first.document.actions.chest.appearances={one:{initialTile:1,stages:{use:2}},two:{initialTile:3,stages:{use:4}}};
    first.document.placements.push({x:6,y:6,width:1,height:1,action:'chest'});
    B.save(root,{mapId:'one',revision:first.revision,document:first.document});
    expect(JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'tools/tiles/one.json'))))).toBe(before);
    const second=B.readTool(root,'two');expect(second.libraryIds).toContain('chest');
    second.document.placements.push({x:3,y:4,width:1,height:1,action:'chest'});
    B.save(root,{mapId:'two',revision:second.revision,document:second.document});
    const read=B.readTool(root,'one');expect(read.usage.chest.map(p=>p.mapId)).toEqual(['one','two']);
    read.document.actions.chest.name='Reusable chest';B.save(root,{mapId:'one',revision:read.revision,document:read.document});
    expect(B.definitions(root,'two').chest.name).toBe('Reusable chest');
    expect(B.withAppearance(B.definitions(root,'two').chest,'two').stages[0].tile).toBe(4);
    expect(B.actionAt(root,'one',3,4)).toBe('repair');expect(B.actionAt(root,'two',3,4)).toBe('chest');
    expect(()=>B.save(root,{mapId:'two',revision:second.revision,document:second.document})).toThrow('changed');
    const remove=B.readTool(root,'one');delete remove.document.actions.chest;remove.document.placements=remove.document.placements.filter(p=>p.action!=='chest');
    expect(()=>B.save(root,{mapId:'one',revision:remove.revision,document:remove.document})).toThrow('another map');
});

test('templates validate generic inventory requirements and reject unsupported repeat, duration and personal map effects',()=>{
    const Templates=require('../../shared/js/interactiontemplates'),map=B.readMap(root,'one');
    for(const template of Templates.templates)expect(()=>B.validate({version:1,actions:{interaction:Templates.create(template.id)},placements:[]},map)).not.toThrow();
    for(const change of [a=>a.repeat='sometimes',a=>a.scope='anyone',a=>a.cooldownSeconds=0,a=>a.stages[0].duration=31,a=>{a.scope='player';a.stages[0].trigger='gate';}]) {
        const action=Templates.create('resource');change(action);expect(()=>B.validate({version:1,actions:{interaction:action},placements:[]},map)).toThrow();
    }
});

test('the HTTP editor loads catalog metadata, saves item costs and rejects stale or build-time writes', async () => {
    const express = require('express'), app = express();
    app.use(express.json());
    const toolbox = {root};
    B.install(app, toolbox);
    write('client/maps/world_client_one.json', {width:10,height:10,data:Array(100).fill(1),collisions:[],
        stagedTiles:{10:{groupName:'test-crop',stages:2}},actionTiles:{1:{action:'repair'}}});
    const server = await new Promise(resolve => {
        const listening = app.listen(0,'127.0.0.1',()=>resolve(listening));
    });
    const url = 'http://127.0.0.1:'+server.address().port+'/local/api/tile-authoring';
    const post = body => fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    try {
        expect(await (await fetch(url)).json()).toEqual({maps:['one']});
        const loaded = await (await fetch(url+'?mapId=one')).json();
        expect(loaded.catalog.groups).toContainEqual({tile:10,groupName:'test-crop',stages:2});
        expect(loaded.existing).toEqual([{tile:1,action:'repair'}]);
        const document = doc();
        document.actions.repair.stages[0].costs = [{item:'35',amount:2}];
        const payload = {mapId:'one',revision:loaded.revision,document};
        const saved = await post(payload);
        expect(saved.status).toBe(200);
        expect((await saved.json()).document).toEqual(document);
        expect(JSON.parse(fs.readFileSync(path.join(root,'tools/tiles/one.json')))).toEqual(document);
        expect((await post(payload)).status).toBe(409);
        toolbox.job = {status:'running'};
        expect((await post(payload)).status).toBe(409);
        expect((await fetch(url+'?mapId=unknown')).status).toBe(400);
    } finally {
        await new Promise(resolve=>server.close(resolve));
    }
});

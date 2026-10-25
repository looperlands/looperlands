const fs=require('fs'),os=require('os'),path=require('path');
global.Types={};
const W=require('./localworldauthoring'),C=require('../../shared/js/mapmakerauthoring');
let root;
function write(file,value){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,typeof value==='string'?value:JSON.stringify(value));}
const rule=(id='boss_gate')=>({id,name:'Boss opens gate',enabled:true,when:{type:'player.killed_mob',options:{mob:13}},conditions:[{type:'has.level',options:{level:3},not:false}],actions:[{type:'trigger.activate',options:{trigger:'boss-clear'}},{type:'send_notification',options:{message:'The path is open.'}}]});
const tree=()=>({id:'guard_talk',name:'Gate guard',npc:40,key:'',start:'welcome',nodes:{welcome:{text:'Hello, friend.',options:[{text:'Help',goto:'job',conditions:[{if_not:'quest_completed',quest:'KING_QUEST_1'}]},{text:'Goodbye',goto:'bye',conditions:[]}],actions:[]},job:{text:'I have a job.',goto:'bye',options:[],actions:[{type:'handout_quest',quest:'KING_QUEST_1'}]},bye:{text:'Safe travels.',options:[],actions:[{type:'record_choice',choice:'guard:talked'}]}}});
const atmosphere=(sceneId='*')=>({sceneId,cycle:true,dayDarkness:0,nightDarkness:0.8,color:'#142438',music:'forest',particles:[{type:'fireflies',count:12}]});
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'world-authoring-'));write('server/config.json',{maps:['one','other']});for(const id of ['one','other']){const map={width:20,height:20,tilesize:16,data:Array(400).fill(1),collisions:[],staticEntities:{'42':'guard','43':'boss'},triggers:[],doors:[],scenes:[{id:1,name:'Forest',x:1,y:1,w:10,h:10}],checkpoints:[]};write('server/maps/world_server_'+id+'.json',map);write('client/maps/world_client_'+id+'.json',map);write('tools/maps/tmx/'+id+'.tmx','<map width="20" height="20" tilewidth="16" tileheight="16"><objectgroup name="doors"><object id="7" x="32" y="48"><properties><property name="x" value="3"/><property name="y" value="3"/><property name="tid" value="boss-clear"/></properties></object></objectgroup></map>');}write('client/js/audio.js',"this.musicNames = ['forest'];this.soundNames = ['npc'];");write('client/audio/music/forest.mp3','');write('client/audio/sounds/npc.mp3','');});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
test('all tools read local sources with NPC, quest, scene, audio and exact gate catalogues',async()=>{for(const tool of ['events','dialogues','atmosphere']){const data=await W.readTool(root,'one',tool);expect(data.entries).toEqual([]);expect(data.catalog).toMatchObject({doors:[{id:'7',trigger:'boss-clear',x:2,y:3}],scenes:[{id:1,name:'Forest'}],music:[{id:'forest'}]});expect(data.source).toBe('tools/worlds/one.json');}});
test('saving separate sections preserves the latest other sections and reloads executable flows',async()=>{const events=await W.readTool(root,'one','events'),dialogues=await W.readTool(root,'one','dialogues');await W.saveTool(root,{mapId:'one',tool:'dialogues',revision:dialogues.revision,entries:[tree()]});const saved=await W.saveTool(root,{mapId:'one',tool:'events',revision:events.revision,entries:[rule()]});expect(saved.entries[0].id).toBe('boss_gate');expect(W.readDocument(root,'one').dialogues).toHaveLength(1);const flow=W.loadFlows(root,'world_one');expect(flow.handlers[0]).toMatchObject({type:'player.killed_mob',options:{mob:13}});expect(flow.handlers[0].then[0]).toMatchObject({type:'has.level',true:[{type:'trigger.activate',then:[{type:'send_notification'}]}]});});
test('stale and concurrent saves do not overwrite a newer section',async()=>{const base=await W.readTool(root,'one','events'),input={mapId:'one',tool:'events',revision:base.revision,entries:[rule()]};const results=await Promise.allSettled([W.saveTool(root,input),W.saveTool(root,{...input,entries:[rule('other_rule')]})]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected').reason.status).toBe(409);const before=fs.readFileSync(path.join(root,'tools/worlds/one.json'));await expect(W.saveTool(root,input)).rejects.toMatchObject({status:409});expect(fs.readFileSync(path.join(root,'tools/worlds/one.json'))).toEqual(before);});
test('build lock is checked immediately before writing after asynchronous catalogue loading',async()=>{const base=await W.readTool(root,'one','events');await expect(W.saveTool(root,{mapId:'one',tool:'events',revision:base.revision,entries:[rule()]},()=>{throw Object.assign(new Error('Build started'),{status:409});})).rejects.toMatchObject({status:409});expect(fs.existsSync(path.join(root,'tools/worlds/one.json'))).toBe(false);});
test('trigger feedback loops are rejected, while disabled rules do not form active cycles',()=>{const a=rule('a'),b=rule('b');a.when={type:'trigger.activated',options:{trigger:'a'}};a.actions=[{type:'trigger.deactivate',options:{trigger:'b'}}];b.when={type:'trigger.deactivated',options:{trigger:'b'}};b.actions=[{type:'trigger.activate',options:{trigger:'a'}}];expect(()=>W.validateRules([a,b])).toThrow('cycle');b.enabled=false;expect(()=>W.validateRules([a,b])).not.toThrow();});
test('unsupported blocks, duplicate IDs, invalid references and oversized chains fail validation',()=>{expect(()=>W.validateRules([rule(),rule()])).toThrow('unique');const r=rule();r.when.type='constructor';expect(()=>W.validateRules([r])).toThrow('supported');const unknown=rule();expect(()=>W.validateRules([unknown],{mobs:[]})).toThrow('Unknown Mob');const long=rule();long.actions=Array(21).fill(long.actions[0]);expect(()=>W.validateRules([long])).toThrow('20');});
test('dialogues reject broken links, unreachable nodes and duplicate NPC scopes',()=>{const valid=tree();expect(()=>W.validateDialogues([valid])).not.toThrow();const broken=tree();broken.nodes.welcome.options[0].goto='missing';expect(()=>W.validateDialogues([broken])).toThrow('missing node');const unreachable=tree();unreachable.nodes.lost={text:'Lost'};expect(()=>W.validateDialogues([unreachable])).toThrow('unreachable');expect(()=>W.validateDialogues([tree(),{...tree(),id:'another'}])).toThrow('same NPC');});
test('dialogue text and actions accept game styles but reject scripts, arbitrary actions and progress tags',()=>{const valid=tree();valid.nodes.welcome.text='<span class="dialogue-item">Hello</span>';expect(()=>W.validateDialogues([valid])).not.toThrow();for(const text of ['<img src="x" onerror="alert(1)">','<script>bad()</script>','{{remaining}}']){const t=tree();t.nodes.welcome.text=text;expect(()=>W.validateDialogues([t])).toThrow();}const invalid=tree();invalid.nodes.welcome.actions=[{type:'run_code',code:'x'}];expect(()=>W.validateDialogues([invalid])).toThrow('supported');});
test('conversation preview filters choices and simulates actions in a cloned player state',()=>{const t=tree(),state={level:1,items:{},kills:{},openQuests:[],completedQuests:['KING_QUEST_1'],choices:[]};const first=C.previewNode(t,'welcome',state);expect(first.node.options.map(o=>o.text)).toEqual(['Goodbye']);const last=C.previewNode(t,'bye',first.state);expect(last.state.choices).toEqual(['guard:talked']);expect(state.choices).toEqual([]);expect(C.previewNode(t,'job',{...state,completedQuests:[]}).state.openQuests).toEqual(['KING_QUEST_1']);});
test.each(['production','development'])('saved dialogues override bundled trees in %s',environment=>{write('tools/worlds/one.json',{version:1,rules:[],dialogues:[tree()],atmosphere:[]});const {WorldDefinitions}=require('./worlddefinitions'),target=new WorldDefinitions();target.register('one',{id:'original',dialogues:[{npc:40,start:'old',nodes:{old:{text:'Old'}}}]});const before=process.env.NODE_ENV;try{process.env.NODE_ENV=environment;W.registerDialogues(root,target);expect(target.dialogues('one')).toHaveLength(2);expect(target.dialogues('one')[0]).toMatchObject({id:'guard_talk',localBuilder:true});}finally{if(before===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=before;}});
test('atmosphere overrides preserve geometry, prefer a specific scene, and expose correct music IDs',()=>{const map={width:20,height:20,data:[1],scenes:[{id:1,x:1,y:2,w:5,h:6,name:'Forest'},{id:2,x:10,y:10,w:5,h:5,name:'Cave'}],musicAreas:[{id:'old',x:0,y:0,w:20,h:20}]},before=JSON.stringify(map);const specific={...atmosphere('2'),cycle:false,dayDarkness:0.5,music:''},result=W.applyAtmosphere(map,[atmosphere(),specific]);expect(JSON.stringify(map)).toBe(before);expect(result.data).toBe(map.data);expect(result.scenes[1]).toMatchObject({id:2,authoringAtmosphere:{cycle:false,dayDarkness:0.5},ambience:[{type:'fireflies',count:12}]});expect(result.scenes.slice(0,2).map(s=>s.authoringMusic)).toEqual(['forest','']);expect(result.musicAreas.map(a=>a.id)).toEqual(['old']);});
test('atmosphere validates unique scenes, lighting ranges, color and particle budget',()=>{expect(()=>W.validateAtmosphere([atmosphere(),atmosphere()])).toThrow('unique');for(const change of [{dayDarkness:2},{color:'red'},{particles:[{type:'mist',count:24},{type:'leaves',count:1}]}])expect(()=>W.validateAtmosphere([{...atmosphere(),...change}])).toThrow();expect(()=>W.validateAtmosphere([atmosphere('deleted')],{scenes:[]})).toThrow('no longer exists');});
test.each(['../one','one.json','unknown',null])('rejects unsafe map %j',mapId=>expect(()=>W.readDocument(root,mapId)).toThrow('configured'));
test('symlink paths and malformed authoring files cannot be silently replaced',()=>{fs.mkdirSync(path.join(root,'tools/worlds'),{recursive:true});fs.symlinkSync(path.join(root,'server/config.json'),path.join(root,'tools/worlds/one.json'));expect(()=>W.readDocument(root,'one')).toThrow('symbolic');fs.unlinkSync(path.join(root,'tools/worlds/one.json'));write('tools/worlds/one.json','{broken');expect(()=>W.readDocument(root,'one')).toThrow('invalid JSON');});
test('local map transport applies atmosphere to JSON and worker JS, without rewriting map exports',async()=>{write('tools/worlds/one.json',{...W.readDocument(root,'one'),atmosphere:[atmosphere()]});const app=require('express')();W.installRuntime(app,root);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));try{const url='http://127.0.0.1:'+server.address().port+'/maps/world_client_one';const json=await(await fetch(url+'.json')).json();expect(json.scenes[0].authoringAtmosphere.nightDarkness).toBe(.8);const js=await(await fetch(url+'.js')).text();const context={};require('vm').runInNewContext(js,context);expect(context.mapData.scenes[0].ambience[0].type).toBe('fireflies');expect(JSON.parse(fs.readFileSync(path.join(root,'client/maps/world_client_one.json'))).scenes[0]).not.toHaveProperty('authoringAtmosphere');}finally{await new Promise(r=>server.close(r));}});

test('scene manager migrates existing atmosphere, saves a combined draft and preserves rules/dialogues and Tiled properties',async()=>{
    write('tools/worlds/one.json',{version:1,rules:[rule()],dialogues:[tree()],atmosphere:[atmosphere('1')]});
    const file='client/maps/world_client_one.json',built=JSON.parse(fs.readFileSync(path.join(root,file)));
    built.scenes[0].message='Welcome';built.scenes[0].fx={enabled:['water']};write(file,built);
    const base=await W.readTool(root,'one','scenes');
    expect(base.entries[1]).toMatchObject({sceneId:'1',name:'Forest',atmosphere:{sceneId:'1',music:'forest'}});
    const added={sceneId:'scene_1',name:'Lantern clearing',x:2,y:2,w:5,h:5,atmosphere:atmosphere('scene_1')};
    base.entries.splice(1,0,added);base.entries[2].x=0;
    const saved=await W.saveTool(root,{mapId:'one',tool:'scenes',revision:base.revision,entries:base.entries});
    expect(saved.entries).toEqual(base.entries);
    const doc=W.readDocument(root,'one');expect(doc.rules).toEqual([rule()]);expect(doc.dialogues).toEqual([tree()]);
    const map=require('./localworldscenes').applyScenes(built,doc.scenes);
    expect(map.scenes.map(s=>s.name)).toEqual(['Lantern clearing','Forest']);
    expect(map.scenes[1]).toMatchObject({x:0,message:'Welcome',fx:{enabled:['water']}});
    expect(built.scenes[0].x).toBe(1);
    expect(require('./localquestbuilder').buildCatalog(root,'one').areas).toContainEqual({id:'Lantern clearing',name:'Lantern clearing'});
});

test('scene geometry, atmosphere references and combined revisions reject invalid and stale changes',async()=>{
    const base=await W.readTool(root,'one','scenes');
    const save=entries=>W.saveTool(root,{mapId:'one',tool:'scenes',revision:base.revision,entries});
    for(const patch of [{x:-1},{w:100},{h:0},{y:1.5},{sceneId:'__proto__'},{name:'<script>'}]) {
        const entries=JSON.parse(JSON.stringify(base.entries));Object.assign(entries[1],patch);await expect(save(entries)).rejects.toHaveProperty('status',400);
    }
    await expect(save([...base.entries,base.entries[1]])).rejects.toThrow('unique');
    const mismatched=JSON.parse(JSON.stringify(base.entries));mismatched[1].atmosphere=atmosphere('other');await expect(save(mismatched)).rejects.toThrow('belong');
    const old=await W.readTool(root,'one','atmosphere');await W.saveTool(root,{mapId:'one',tool:'atmosphere',revision:old.revision,entries:[atmosphere('1')]});
    await expect(save(base.entries)).rejects.toHaveProperty('status',409);
    const current=await W.readTool(root,'one','scenes');
    write('client/maps/world_client_one.json',{...JSON.parse(fs.readFileSync(path.join(root,'client/maps/world_client_one.json'))),scenes:[]});
    await expect(W.saveTool(root,{mapId:'one',tool:'scenes',revision:current.revision,entries:current.entries})).rejects.toHaveProperty('status',409);
});

test('concurrent scene saves have one winner and stale atmosphere saves cannot undo scene changes',async()=>{
    const base=await W.readTool(root,'one','scenes'),old=await W.readTool(root,'one','atmosphere');
    base.entries[1].atmosphere=atmosphere('1');
    const input={mapId:'one',tool:'scenes',revision:base.revision,entries:base.entries};
    const results=await Promise.allSettled([W.saveTool(root,input),W.saveTool(root,input)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.find(r=>r.status==='rejected').reason.status).toBe(409);
    await expect(W.saveTool(root,{mapId:'one',tool:'atmosphere',revision:old.revision,entries:[]})).rejects.toHaveProperty('status',409);
});

test('a removed scene stays removed after reload and both client transports share server geometry and overlap priority',async()=>{
    const doc={...W.readDocument(root,'one'),scenes:[{id:'scene_1',name:'Lantern clearing',x:2,y:2,w:4,h:4},{id:'1',name:'Forest',x:0,y:0,w:20,h:20}],atmosphere:[atmosphere('scene_1')]};
    write('tools/worlds/one.json',doc);
    const world={map:{scenes:[]}},app=require('express')();W.installRuntime(app,root,()=>({one:world}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    try {
        const url='http://127.0.0.1:'+server.address().port+'/maps/world_client_one';
        const json=await(await fetch(url+'.json')).json(),context={};require('vm').runInNewContext(await(await fetch(url+'.js')).text(),context);
        expect(JSON.parse(JSON.stringify(context.mapData.scenes))).toEqual(json.scenes);
        expect(json.scenes[0]).toMatchObject({name:'Lantern clearing',authoringMusic:'forest'});expect(world.map.scenes).toEqual(json.scenes);
        const map=Object.create(require('./map').prototype);map.scenes=require('./localworldscenes').applyScenes({width:20,height:20,scenes:[]},doc.scenes).scenes;
        expect(map.getSceneAt(2,2).name).toBe('Lantern clearing');expect(map.getSceneAt(6,2).name).toBe('Forest');
        doc.scenes=[];doc.atmosphere=[];write('tools/worlds/one.json',doc);
        expect((await W.readTool(root,'one','scenes')).entries).toEqual([{sceneId:'*',atmosphere:null}]);
        expect((await(await fetch(url+'.json')).json()).scenes).toEqual([]);expect(world.map.scenes).toEqual([]);
        expect(JSON.parse(fs.readFileSync(path.join(root,'client/maps/world_client_one.json'))).scenes).toHaveLength(1);
    } finally {await new Promise(r=>server.close(r));}
});

test('styled player choices survive save and simulation, and do not accept quest counters', async () => {
    const entries = [tree()];
    entries[0].nodes.welcome.options[0].text = '<span class="dialogue-wave">Help</span>';
    const before = await W.readTool(root, 'one', 'dialogues');
    const saved = await W.saveTool(root, {mapId: 'one', tool: 'dialogues', revision: before.revision, entries});
    expect(saved.entries).toEqual(entries);
    const step = C.previewNode(entries[0], 'welcome', {completedQuests: []});
    expect(step.node.options[0].text).toBe(entries[0].nodes.welcome.options[0].text);
    entries[0].nodes.welcome.options[0].text = '{{remaining}}';
    expect(() => W.validateDialogues(entries)).toThrow('no quest-progress counters');
});

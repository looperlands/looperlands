const fs = require('fs'), path = require('path'), {execFile} = require('child_process');
const Z = require('../../shared/js/gameplayzones');
const {operations, saves} = require('./localobjectbatch');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const maps = root => JSON.parse(fs.readFileSync(path.join(root,'server/config.json'),'utf8')).maps;
const source = (root, id) => require('./localdoorbuilder').mapFile(root,id);
function catalog(root) {
    const audio = require('./localtilebuilder').safe(root,'client/js/audio.js');
    const names = (fs.existsSync(audio)?fs.readFileSync(audio,'utf8'):'').match(/this\.musicNames\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
    const music = [...names.replace(/\/\/[^\n]*/g,'').matchAll(/["']([^"']+)["']/g)].map(match=>match[1]);
    const available = music.filter(id=>['mp3','ogg'].some(ext=>fs.existsSync(path.join(root,'client/audio/music',id+'.'+ext))));
    return {music:available.map(id=>({id,name:id})), musicOrder:music, minigames:['spaceowls','luckyfunkz','JackAce']};
}
function run(root, id, input = {}) {
    return new Promise((resolve,reject)=>{
        const child = execFile('python3',['-B',path.resolve(__dirname,'../../tools/maps/editzones.py'),source(root,id)],{timeout:30000,maxBuffer:8*1024*1024,encoding:'utf8'},(error,stdout)=>{
            let data;try {data=JSON.parse(stdout);} catch (_) {return reject(Object.assign(new Error('Check Python 3 and the Tiled XML, then reload zones.'),{status:503}));}
            if(error||data.error)return reject(Object.assign(new Error(data.error||'Zones could not be saved.'),{status:data.status||500}));resolve(data);
        });child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(input));
    });
}
function decorate(data, root, mapId) {
    const d=data.dimensions, audio=catalog(root);let index=0;
    const objects=data.objects.map(raw=>{
        const p=raw.properties, checkpointId=raw.kind==='checkpoint'?Number(p.checkpointId??++index):null;
        // Legacy IDs are positional, including when an earlier object already has an explicit ID.
        if(raw.kind==='checkpoint'&&p.checkpointId!=null)index++;
        const offset=String(p.offset||'0,0').split(',').map(Number), music=p.music??Object.values(p)[0]??'';
        return {id:raw.id,kind:raw.kind,name:raw.name,x:raw.x/d.tilewidth,y:raw.y/d.tileheight,width:raw.width/d.tilewidth,height:raw.height/d.tileheight,
            checkpointId,stableId:p.checkpointId!=null,starting:p.starting==null?!!raw.objectType&&raw.objectType!=='0':['true','1'].includes(String(p.starting)),
            trigger:String(p.trigger??''),delaySeconds:Number(p.delay||0)/1000,playerMessage:String(p.player_message??''),message:String(p.message??''),
            minigame:String(p.minigame??''),offsetX:offset[0],offsetY:offset[1],music:/^\d+$/.test(String(music))?(audio.musicOrder[Number(music)]??String(music)):String(music),
            editable:!raw.rotation&&raw.shape==='rectangle'};
    });
    return {...data,objects,mapId,source:'tools/maps/tmx/'+mapId+'.tmx',nextObjectId:Math.max(data.nextObjectId||1,...objects.filter(row=>row.kind==='checkpoint').map(row=>row.checkpointId+1))};
}
async function readZones(root,id) {return decorate(await require('./localtmxcache').readTmx(source(root,id),'zones',()=>run(root,id)),root,id);}
function validate(row, map, choices, placement = true) {
    if(!row||!Object.hasOwn(Z.kinds,row.kind)||Object.keys(row).some(key=>!['id','kind','name','x','y','width','height','checkpointId','stableId','starting','trigger','delaySeconds','playerMessage','message','minigame','offsetX','offsetY','music','editable'].includes(key)))fail('Choose a checkpoint or supported gameplay zone.');
    if(typeof row.name!=='string'||row.name.length>120||/[<>\u0000-\u001f]/.test(row.name))fail('Use a plain-text name up to 120 characters.');
    if(!['x','y','width','height'].every(key=>Number.isSafeInteger(row[key]))||row.x<1||row.y<1||row.width<1||row.height<1||row.x+row.width>map.width||row.y+row.height>map.height||row.width*row.height>250000)fail('Draw a whole-tile area inside playable bounds, after the first row and column, up to 250000 tiles.');
    if(row.kind==='checkpoint') {
        if(!Number.isSafeInteger(row.checkpointId)||row.checkpointId<1||row.checkpointId>1000000000||typeof row.starting!=='boolean')fail('Use a valid checkpoint ID and starting-area setting.');
    }
    if(row.kind==='trigger') {
        if(typeof row.trigger!=='string'||!/^[-A-Za-z0-9_:.]{0,100}$/.test(row.trigger))fail('Trigger ID must use at most 100 letters, numbers, dashes, underscores, colons or periods.');
        for(const key of ['playerMessage','message'])if(typeof row[key]!=='string'||row[key].length>500||/[<>\u0000-\u0008\u000b-\u001f]/.test(row[key]))fail('Use plain-text messages up to 500 characters.');
        if(!Number.isFinite(row.delaySeconds)||row.delaySeconds<0||row.delaySeconds>86400||!Number.isSafeInteger(row.delaySeconds*1000))fail('Deactivation delay must be 0–86400 seconds, in whole milliseconds.');
        if(!choices.minigames.includes(row.minigame)&&row.minigame!=='')fail('Choose a bundled minigame or None.');
        if(!['offsetX','offsetY'].every(key=>Number.isSafeInteger(row[key])&&Math.abs(row[key])<=100))fail('Prompt offsets must be whole tiles from -100 to 100.');
    }
    if(row.kind==='music'&&!choices.music.some(track=>track.id===row.music))fail('Choose a registered music track with bundled audio.');
    if(placement) {
        const blocked=new Set(map.collisions||[]);let free=0;
        for(let y=row.y;y<row.y+row.height;y++)for(let x=row.x;x<row.x+row.width;x++)if(!blocked.has(y*map.width+x))free++;
        if(row.kind==='checkpoint'&&free!==row.width*row.height)fail('Every checkpoint tile must be walkable. Move or shrink the spawn area away from collisions.');
        if(!free)fail('This zone has no walkable tiles. Move it to playable ground.');
    }
    return row;
}
function properties(row) {
    if(row.kind==='checkpoint')return {checkpointId:String(row.checkpointId),starting:String(row.starting)};
    if(row.kind==='music')return {music:row.music};
    if(row.kind==='trigger')return {trigger:row.trigger||null,delay:String(Math.round(row.delaySeconds*1000)),player_message:row.playerMessage||null,message:row.message||null,minigame:row.minigame||null,offset:row.offsetX+','+row.offsetY};
    return {};
}
async function saveObjects(root,input,beforeWrite=()=>{}) {
    const file=source(root,input?.mapId);
    const work=(saves.get(file)||Promise.resolve()).catch(()=>{}).then(async()=>{
        const changes=operations(input),data=await readZones(root,input.mapId);
        if(data.revision!==input.revision)fail('This map changed in Tiled or another tab. Keep the draft and reload before saving.',409);
        const map=require('./localmapfiles').readJson(require('./localtilebuilder').safe(root,'server/maps/world_server_'+input.mapId+'.json'));
        if(map.width!==data.dimensions.width||map.height!==data.dimensions.height)fail('Map dimensions changed. Build this map before placing zones.');
        const choices=catalog(root),edited=new Set(changes.filter(c=>c.operation!=='add').map(c=>String(c.objectId)));let next=data.nextObjectId;
        const final=data.objects.filter(row=>!edited.has(row.id)),batch=[];
        for(const change of changes) {
            const old=data.objects.find(row=>row.id===String(change.objectId));
            if(change.operation!=='add'&&!old)fail('A checkpoint or zone was removed. Reload before saving.',404);
            if(change.operation==='remove'){batch.push(change);continue;}
            if(old&&(old.kind!==change.object?.kind||!old.editable))fail('Keep the zone type. Edit unsupported shapes or rotations in Tiled.');
            const row={...change.object,id:old?.id||String(next++)};
            if(row.kind==='checkpoint'){if(old&&row.checkpointId!==old.checkpointId)fail('Existing checkpoint IDs cannot change.');if(!old)row.checkpointId=Number(row.id);}
            validate(row,map,choices);final.push(row);const d=data.dimensions;
            batch.push({...change,object:{kind:row.kind,name:row.name,x:row.x*d.tilewidth,y:row.y*d.tileheight,width:row.width*d.tilewidth,height:row.height*d.tileheight,properties:properties(row)}});
        }
        const checkpoints=final.filter(row=>row.kind==='checkpoint'),ids=new Set();
        for(const row of checkpoints){if(ids.has(row.checkpointId)||!Number.isSafeInteger(row.checkpointId)||row.checkpointId<1)fail('Checkpoint IDs must be unique positive whole numbers. Repair them in Tiled.');ids.add(row.checkpointId);}
        const originals=new Map(data.objects.map(row=>[row.id,row]));
        const sameBounds=(a,b)=>b&&['x','y','width','height'].every(key=>a[key]===b[key]);
        for(let i=0;i<final.length;i++)for(let j=i+1;j<final.length;j++) {
            const a=final[i],b=final[j],legacyBounds=sameBounds(a,originals.get(a.id))&&sameBounds(b,originals.get(b.id));
            if(a.kind===b.kind&&['checkpoint','trigger','music'].includes(a.kind)&&!legacyBounds&&a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height)fail(Z.kinds[a.kind].label+' areas overlap: '+(a.name||'#'+a.id)+' and '+(b.name||'#'+b.id)+'. Move or resize them.');
        }
        if(!checkpoints.length&&data.objects.some(row=>row.kind==='checkpoint'))fail('Keep at least one checkpoint so players can spawn and revive.');
        // Pin unchanged positional IDs before any deletion can shift their meaning.
        for(const old of data.objects.filter(row=>row.kind==='checkpoint'&&!row.stableId&&!edited.has(row.id))) {
            const d=data.dimensions;batch.push({operation:'update',objectId:old.id,object:{kind:old.kind,name:old.name,x:old.x*d.tilewidth,y:old.y*d.tileheight,width:old.width*d.tilewidth,height:old.height*d.tileheight,properties:properties(old)}});
        }
        beforeWrite();return decorate(await run(root,input.mapId,{revision:input.revision,operations:batch,minimumObjectId:data.nextObjectId}),root,input.mapId);
    });
    saves.set(file,work);try{return await work;}finally{if(saves.get(file)===work)saves.delete(file);}
}
function install(app,toolbox) {
    app.get('/local/api/zones',async(req,res)=>{try{res.json(req.query.mapId===undefined?{maps:maps(toolbox.root),catalog:catalog(toolbox.root)}:await readZones(toolbox.root,req.query.mapId));}catch(e){res.status(e.status||500).json({error:e.message});}});
    app.get('/local/zone-music/:id',(req,res)=>{try{const id=req.params.id;if(!catalog(toolbox.root).music.some(track=>track.id===id))return res.status(404).end();const file=['mp3','ogg'].map(ext=>require('./localtilebuilder').safe(toolbox.root,'client/audio/music/'+id+'.'+ext)).find(file=>fs.existsSync(file));res.sendFile(file);}catch(e){res.status(e.status||400).json({error:e.message});}});
    app.post('/local/api/zones',async(req,res)=>{
        const available=()=>{if(toolbox.closed)fail('The toolbox is shutting down.',503);if(toolbox.job?.status==='running')fail('Wait for the map build to finish before saving.',409);};
        try{available();toolbox.zoneSaveCount=(toolbox.zoneSaveCount||0)+1;try{res.json(await saveObjects(toolbox.root,req.body,available));}finally{toolbox.zoneSaveCount--;}}catch(e){res.status(e.status||500).json({error:e.message});}
    });
}
module.exports={catalog,readZones,saveObjects,validate,install};

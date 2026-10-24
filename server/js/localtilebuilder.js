const fs = require('fs'), path = require('path'), crypto = require('crypto');
const Types = require('../../shared/js/gametypes');
const fail = (message,status=400) => {throw Object.assign(new Error(message),{status});};
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function maps(root) {return JSON.parse(fs.readFileSync(path.join(root,'server/config.json'))).maps;}
function safe(root,relative) {
    root=path.resolve(root); const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)) fail('Invalid tile source path.');
    for(let p=file;p!==root;p=path.dirname(p)) if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink()) fail('Tile sources must not contain symbolic links.');
    return file;
}
function source(root,id) {if(!maps(root).includes(id)||!/^[\w-]+$/.test(id))fail('Choose a configured map.');return safe(root,'tools/tiles/'+id+'.json');}
function document(root,id) {const file=source(root,id);if(!fs.existsSync(file))return {version:1,actions:{},placements:[]};const d=JSON.parse(fs.readFileSync(file));if(d.version!==1||!d.actions||Array.isArray(d.actions)||!Array.isArray(d.placements))fail('Invalid tile authoring source.');return d;}
function base(root,id) {const p=safe(root,'client/tileActions/'+id+'.json');return fs.existsSync(p)?JSON.parse(fs.readFileSync(p)):{};}
function definitions(root,id) {return {...base(root,id),...document(root,id).actions};}
function readMap(root,id) {source(root,id);const map=JSON.parse(fs.readFileSync(safe(root,'client/maps/world_client_'+id+'.json')));const sheet=safe(root,'client/img/1/tilesheet_'+(['oadungeon','oaoverworld'].includes(id)?'oa':id)+'.png');if(fs.existsSync(sheet)){const header=Buffer.alloc(24),fd=fs.openSync(sheet,'r');try{fs.readSync(fd,header,0,24,0);}finally{fs.closeSync(fd);}if(header.toString('ascii',1,4)==='PNG')map.tileCount=header.readUInt32BE(16)/(map.tilesize||16)*header.readUInt32BE(20)/(map.tilesize||16);}return map;}
function item(id,label) {if(!Number.isSafeInteger(Number(id))||(!Types.isItem(Number(id))||Types.getKindAsString(Number(id))?.startsWith('NFT_')))fail('Choose a registered '+label+'.');}
function integer(v,min,max,label) {if(!Number.isSafeInteger(v)||v<min||v>max)fail(label+' must be a whole number from '+min+' to '+max+'.');}
function number(v,min,max,label) {if(!Number.isFinite(v)||v<min||v>max)fail(label+' must be from '+min+' to '+max+'.');}
function text(v,label,max=240) {if(typeof v!=='string'||!v.trim()||v.length>max||/[<>\x00-\x08]/.test(v))fail('Use short plain text for '+label+'.');}
function rows(rows,label) {if(!Array.isArray(rows)||rows.length>20)fail('Use at most 20 '+label+'.');const ids=new Set();for(const r of rows){item(r.item,label);integer(r.amount,1,100000,label+' amount');if(ids.has(r.item))fail('Use unique '+label+'.');ids.add(r.item);}}
function validate(doc,map,available={}) {
    if(doc.version!==1||!doc.actions||Array.isArray(doc.actions)||!Array.isArray(doc.placements)||Object.keys(doc.actions).length>100||doc.placements.length>1000)fail('Use at most 100 actions and 1000 placement regions.');
    for(const [id,a] of Object.entries(doc.actions)) {
        if(!/^[a-z][a-zA-Z0-9_-]{0,79}$/.test(id)||['constructor','prototype','__proto__'].includes(id))fail('Use a safe action ID.');
        if(a.type==='sequence') {
            text(a.name,'action name');if(!Array.isArray(a.stages)||!a.stages.length||a.stages.length>50)fail('Use 1–50 stages.');
            const ids=new Set(a.stages.map(s=>s.id));if(ids.size!==a.stages.length||!ids.has(a.start))fail('Stage IDs must be unique and include the starting stage.');
            for(const s of a.stages) {
                if(!/^[a-z][a-z0-9_-]{0,79}$/.test(s.id))fail('Use a safe stage ID.');text(s.name,'stage name');
                number(s.duration,0,60,'Animation duration');number(s.waitSeconds,0,604800,'Wait time');integer(s.level,1,1000,'Level');integer(s.xp,0,100000,'XP');number(s.successChance,0,1,'Success chance');
                if(s.tool){item(s.tool,'tool');if(!Types.isTool(Number(s.tool)))fail('Choose an inventory tool.');}
                if(s.quest && available.quests && !available.quests.includes(s.quest))fail('Choose an existing quest.');
                for(const dest of [s.next,s.failureNext])if(dest&&!ids.has(dest))fail('Stage '+s.id+' points to missing stage '+dest+'.');
                rows(s.costs,'cost items');rows(s.rewards,'reward items');integer(s.tile,0,map.tileCount||1000000,'Tile ID');
                if(s.message)text(s.message,'success message',2000);if(s.failureMessage)text(s.failureMessage,'failure message',2000);
                if(s.trigger && !/^[^<>\x00-\x1f]{1,100}$/.test(s.trigger))fail('Use a plain trigger ID.');
            }
            const seen=new Set(),visit=id=>{if(!id||seen.has(id))return;seen.add(id);const s=a.stages.find(s=>s.id===id);visit(s.next);visit(s.failureNext);};visit(a.start);if(seen.size!==ids.size)fail('Every stage must be reachable from the start.');
        } else {
            if(a.harvestAccess!==undefined&&!['owner','shared'].includes(a.harvestAccess))fail('Choose supported harvest access.');integer(a.minLevel,1,1000,'Farm level');if(!a.prepare||!a.water||!a.crops||!Object.keys(a.crops).length)fail('A farming action needs preparation, watering and crops.');
            for(const stage of [a.prepare,a.water]){if(!Types.isTool(Types.Entities[stage.tool]))fail('Choose a registered farming tool.');number(stage.duration,.1,60,'Tool duration');integer(stage.xp,0,100000,'Stage XP');}
            integer(a.prepare.tile,1,map.tileCount||1000000,'Prepared tile');if(!Types.isItem(Types.Entities[a.seedItem]))fail('Choose a registered seed item.');
            for(const b of a.careBoosts||[]){if(!Types.isItem(Types.Entities[b.item]))fail('Choose a care boost item.');text(b.name,'care boost name');for(const key of ['quality','yieldBonus'])integer(b[key]||0,0,100,'Care boost '+key);number(b.rareChanceBonus||0,0,1,'Rare chance bonus');integer(b.maxUses,1,100,'Care boost max uses');}
            const groups=new Map(Object.values(map.stagedTiles||{}).map(g=>[g.groupName,g]));
            for(const [crop,c]of Object.entries(a.crops)) {
                if(!/^[A-Z][A-Z0-9_]{0,79}$/.test(crop)||!Types.isItem(Types.Entities[c.yieldItem||crop]))fail('Choose registered crop and yield items.');
                text(c.displayName||c.name,'crop name');integer(c.level,1,1000,'Crop level');integer(c.seedCost,1,100000,'Seed cost');number(c.growSeconds,1,604800,'Growth duration');integer(c.xp,0,100000,'Crop XP');
                if(!groups.has(c.tileGroup))fail('Missing staged tile group '+c.tileGroup+'. Add it in Tiled and build first.');
                integer(c.stages,1,groups.get(c.tileGroup).stages,'Visual stages');integer(c.yield?.min,1,100000,'Minimum yield');integer(c.yield?.max,c.yield.min,100000,'Maximum yield');number(c.seedReturnChance||0,0,1,'Seed return chance');
                for(const r of c.rareDrops||[]){if(!Types.isItem(Types.Entities[r.item]))fail('Choose registered rare drops.');number(r.chance,0,1,'Rare drop chance');integer(r.amount,1,100000,'Rare drop amount');}
            }
        }
    }
    const occupied=new Set(),blocked=new Set(map.collisions||[]),all={...available.base,...doc.actions};
    for(const p of doc.placements) {
        if(!Object.hasOwn(all,p.action))fail('Placement references an unknown action.');
        integer(p.x,1,map.width-1,'Placement X');integer(p.y,1,map.height-1,'Placement Y');integer(p.width,1,100,'Region width');integer(p.height,1,100,'Region height');if(p.x+p.width>map.width||p.y+p.height>map.height)fail('Placement extends beyond the map.');
        for(let y=p.y;y<p.y+p.height;y++)for(let x=p.x;x<p.x+p.width;x++){const key=x+','+y;if(occupied.has(key))fail('Placement regions overlap.');if(blocked.has(y*map.width+x))fail('Tile '+key+' is blocked.');occupied.add(key);}
    }
    if(occupied.size>10000)fail('Use at most 10000 placed action tiles.');return doc;
}
function actionAt(root,id,x,y) {const d=document(root,id);return [...d.placements].reverse().find(p=>x>=p.x&&y>=p.y&&x<p.x+p.width&&y<p.y+p.height)?.action;}
function applyMap(map,doc) {const authoringActions={};for(const p of doc.placements)for(let y=p.y;y<p.y+p.height;y++)for(let x=p.x;x<p.x+p.width;x++)authoringActions[x+'.'+y]={action:p.action};return {...map,authoringActions};}
function questCatalog(root) {
    const {WorldDefinitions}=require('./worlddefinitions');
    const quests=require('../world-definitions').register(new WorldDefinitions(),{local:false}).quests.map(q=>({id:q.id,name:q.name||q.id}));
    for(const id of maps(root)){const file=safe(root,'tools/quests/'+id+'.json');if(fs.existsSync(file)){try{for(const q of JSON.parse(fs.readFileSync(file)).quests||[])quests.push({id:q.id,name:q.name||q.id});}catch(_){/* Quest builder reports invalid quest source. */}}}
    return [...new Map(quests.map(q=>[q.id,q])).values()];
}
function readTool(root,id) {
    const doc=document(root,id),bundled=base(root,id),map=readMap(root,id);
    const items=Object.entries(Types.Entities).filter(([name,n])=>Types.isItem(n)&&!name.startsWith('NFT_')).map(([name,id])=>({name,id}));
    return {mapId:id,document:doc,base:bundled,revision:hash({doc,bundled}),source:'tools/tiles/'+id+'.json',width:map.width,height:map.height,
        catalog:{items,tools:items.filter(i=>Types.isTool(i.id)),groups:Object.entries(map.stagedTiles||{}).map(([tile,g])=>({tile:Number(tile),...g})),quests:questCatalog(root)},
        existing:Object.entries(map.actionTiles||{}).map(([tile,a])=>({tile:Number(tile),...a}))};
}
function save(root,input) {
    const current=readTool(root,input.mapId);if(input.revision!==current.revision)fail('Tile actions changed. Reload before saving.',409);
    if(Buffer.byteLength(JSON.stringify(input.document))>512000)fail('Tile authoring source exceeds 500 KB.');
    validate(input.document,readMap(root,input.mapId),{base:current.base,quests:current.catalog.quests.map(q=>q.id)});
    const file=source(root,input.mapId);fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(input.document,null,2)+'\n',{flag:'wx'});fs.renameSync(temp,file);}finally{fs.rmSync(temp,{force:true});}return readTool(root,input.mapId);
}
function install(app,toolbox) {
    app.get('/local/api/tile-authoring',(req,res)=>{try{res.json(req.query.mapId?readTool(toolbox.root,req.query.mapId):{maps:maps(toolbox.root)});}catch(e){res.status(e.status||400).json({error:e.message});}});
    app.post('/local/api/tile-authoring',(req,res)=>{try{if(toolbox.closed||toolbox.job?.status==='running')fail('Wait for the build to finish before saving.',409);res.json(save(toolbox.root,req.body));}catch(e){res.status(e.status||400).json({error:e.message});}});
}
module.exports={maps,safe,document,base,definitions,readMap,readTool,save,validate,actionAt,applyMap,install,hash};

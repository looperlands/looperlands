const fs = require('fs');
const path = require('path');
const Types = require('../../shared/js/gametypes');
const {readDoors, gates} = require('./localdoorbuilder');
const {readBehavior, validateRoutine} = require('./localnpcbuilder');
const {readQuests} = require('./localquestbuilder');
const properties = require('./properties');
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
const link = (screen, values = {}) => '#' + screen + '/?' + new URLSearchParams(values);
function maps(root) {return JSON.parse(fs.readFileSync(path.join(root, 'server/config.json'), 'utf8')).maps;}
function safe(root, relative) {
    const file = path.resolve(root, relative);
    for (let p = file; p !== path.resolve(root); p = path.dirname(p)) {
        if (!p.startsWith(path.resolve(root) + path.sep)) fail('Invalid map path.');
        if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) fail('Map analysis does not follow symbolic links.');
    }
    return file;
}
function read(root, relative) {return JSON.parse(fs.readFileSync(safe(root, relative), 'utf8'));}
function grid(map) {
    if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width < 1 || map.height < 1 || map.width * map.height > 2000000) fail('Map dimensions must contain at most 2 million tiles.');
    const blocked = new Set(map.collisions || []);
    return {blocked, inside: p => Number.isInteger(p?.x) && Number.isInteger(p?.y) && p.x > 0 && p.y > 0 && p.x < map.width && p.y < map.height,
        walkable(p) {return this.inside(p) && !blocked.has(p.y * map.width + p.x);}};
}
function reachable(map, terrain, mapId) {
    const seen = new Uint8Array(map.width * map.height), queue = new Int32Array(seen.length); let head = 0, tail = 0;
    function add(x,y) {const p={x,y};if (!terrain.walkable(p)) return; const i=y*map.width+x;if(!seen[i]) {seen[i]=1;queue[tail++]=i;}}
    for (const c of map.checkpoints || []) for (let y=Math.max(1,c.y);y<Math.min(map.height,c.y+(c.h||1));y++) for(let x=Math.max(1,c.x);x<Math.min(map.width,c.x+(c.w||1));x++) add(x,y);
    const portals = new Map();
    for (const d of map.doors || []) if ((!d.tmap || d.tmap === mapId) && !d.thttp_redirect && terrain.inside(d) && terrain.inside({x:d.tx,y:d.ty})) {const i=d.y*map.width+d.x;const list=portals.get(i)||[];list.push(d);portals.set(i,list);}
    while(head<tail) {const i=queue[head++],x=i%map.width,y=Math.floor(i/map.width);add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);for(const d of portals.get(i)||[])add(d.tx,d.ty);}
    return {seen, count:tail, has: p => terrain.inside(p) && !!seen[p.y*map.width+p.x]};
}
async function analyze(root, mapId, options = {}) {
    const configured = maps(root);
    if (typeof mapId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(mapId) || !configured.includes(mapId)) fail('Choose a configured map.');
    const serverPath='server/maps/world_server_'+mapId+'.json', clientPath='client/maps/world_client_'+mapId+'.json', tiledPath='tools/maps/tmx/'+mapId+'.tmx';
    let map;try {map=read(root,serverPath);}catch(error){fail('Build '+mapId+' first: its server map is missing or invalid. '+error.message,404);}
    const terrain=grid(map), objects=[], findings=[], checks=[];
    const finding=(severity,code,message,object,editor,details) => findings.push({id:code+':'+findings.length,severity,code,message,objectId:object?.id,x:object?.x,y:object?.y,editor:editor||object?.editor,details});
    const add=(type,id,name,p,extra={})=>{const row={type,id:type+':'+id,name,x:p.x,y:p.y,width:p.width||p.w||1,height:p.height||p.h||1,...extra};objects.push(row);return row;};
    let client=null;try{client=read(root,clientPath);}catch(_){finding('error','client-map','The built client map is missing or invalid.',null,link('build',{map:mapId}));}
    if(client && (client.width!==map.width||client.height!==map.height))finding('error','map-dimensions','Client and server map dimensions differ. Rebuild this map.',null,link('build',{map:mapId}));
    const sources={server:serverPath,client:clientPath,tiled:tiledPath,stale:false};
    try {sources.stale=fs.statSync(safe(root,tiledPath)).mtimeMs>Math.min(fs.statSync(safe(root,serverPath)).mtimeMs,client?fs.statSync(safe(root,clientPath)).mtimeMs:0)+1000;
        if(sources.stale)finding('warning','stale-build','The Tiled source is newer than its map exports. Build before relying on collision and placement checks.',null,link('build',{map:mapId}));}
    catch(_){finding('warning','tiled-missing','The Tiled source is unavailable. Built map geometry can still be inspected.',null,link('build',{map:mapId}));}
    const manifestFile=safe(root,'shared/js/mapmakerentities.json');const custom=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):[];
    Types.registerMapmakerEntities(custom);
    const kind=value=>typeof value==='number'?value:Types.getKindFromString(value);
    const idFor=value=>Types.getKindAsString(kind(value))||String(value);
    const usedMobs=new Map();
    for(const [index,value]of Object.entries(map.staticEntities||{})) {
        const i=Number(index)-1, k=kind(value), id=idFor(value), type=Types.isNpc(k)?'npc':Types.isMob(k)?'mob':Types.isItem(k)?'item':'entity';
        const row=add(type,index,id,{x:i%map.width+1,y:Math.floor(i/map.width)},{kind:id,editor:['npc','mob','item'].includes(type)?link(type==='npc'?'npcs':type==='mob'?'mobs':'items',{asset:id}):null,tiledLayer:'entity / mapmaker-entities'});
        if(k===undefined)finding('error','unknown-entity','Unknown gameplay type: '+id,row);
        else {
            const sprite=(type==='item'?'item-':'')+id;
            if(['npc','mob','item'].includes(type) && !fs.existsSync(safe(root,'client/sprites/'+sprite+'.json')))finding('error','missing-sprite','Missing sprite definition for '+id+'.',row);
            if(['npc','mob','item'].includes(type) && !fs.existsSync(safe(root,'client/img/1/'+sprite+'.png')))finding('error','missing-artwork','Missing 1× artwork for '+id+'.',row);
        }
        if(!terrain.walkable(row))finding('error','blocked-entity','Entity spawn is outside playable bounds or on a collision tile.',row);
        if(type==='mob')usedMobs.set(id,row);
    }
    for(const area of map.roamingAreas||[]) {
        const id=idFor(area.type), row=add('spawn',area.id,id+' spawn area',area,{kind:id,editor:link('mobs',{asset:id}),tiledLayer:'roaming'});
        if(!Types.isMob(kind(area.type)))finding('error','unknown-spawn','Spawn area does not reference a registered mob: '+id,row);
        usedMobs.set(id,row);
        let free=false; for(let y=Math.max(1,area.y);y<Math.min(map.height,area.y+area.height)&&!free;y++)for(let x=Math.max(1,area.x);x<Math.min(map.width,area.x+area.width);x++)if(terrain.walkable({x,y})){free=true;break;}
        if(!free)finding('error','blocked-spawn','Spawn area has no walkable tiles.',row);
        if(!terrain.inside(row)||area.x+area.width>map.width||area.y+area.height>map.height)finding('warning','spawn-bounds','Spawn area extends beyond playable map bounds.',row);
    }
    for(const c of map.checkpoints||[]) {
        const row=add('checkpoint',c.id,'Checkpoint '+c.id,c,{tiledLayer:'checkpoints'});let free=false;
        for(let y=Math.max(1,c.y);y<Math.min(map.height,c.y+(c.h||1))&&!free;y++)for(let x=Math.max(1,c.x);x<Math.min(map.width,c.x+(c.w||1));x++)if(terrain.walkable({x,y})){free=true;break;}
        if(!free)finding('error','blocked-checkpoint','Checkpoint has no walkable spawn tiles.',row);
    }
    if(!map.checkpoints?.length)finding('warning','no-checkpoints','No checkpoints are exported. Reachability checks cannot establish a player starting area.',null,link('build',{map:mapId}));
    for(const t of map.triggers||[])add('trigger',t.id,'Trigger '+(t.trigger||t.id),t,{tiledLayer:'triggers',properties:t});
    for(const s of client?.scenes||map.scenes||[])add('scene',s.id,s.name||'Scene '+s.id,s,{tiledLayer:'scenes'});
    let sourceDoors;
    try{sourceDoors=await (options.readDoors||readDoors)(root,mapId);}catch(error){finding('warning','door-source','Entrance source checks are unavailable: '+error.message,null,link('doors',{map:mapId}));}
    const doors=sourceDoors?sourceDoors.doors.map(d=>({id:d.id,x:d.tileX,y:d.tileY,portal:d.type==='portal',properties:d.properties})): (map.doors||[]).map((d,i)=>({id:'built-'+i,x:d.x,y:d.y,portal:!!d.p,properties:Object.fromEntries(Object.entries(d).filter(([k])=>k.startsWith('t')).map(([k,v])=>[k.slice(1),v]))}));
    const destinations=new Map([[mapId,terrain]]);
    for(const d of doors) {
        const p=d.properties,row=add('door',d.id,(d.portal?'Portal #':'Door #')+d.id,d,{properties:p,tiledLayer:'doors',editor:sourceDoors?link('doors',{map:mapId,object:d.id}):null,source:sourceDoors?'Tiled source':'Built map'});
        if(!terrain.inside(row))finding('error','door-bounds','Entrance is outside playable map bounds.',row);
        if(p.item&&!Types.isItem(kind(p.item)))finding('error','door-item','Entrance requires an unknown item: '+p.item,row);
        if(p.http_redirect)continue;
        const target=p.map||mapId;
        if(!configured.includes(target)){finding('error','door-map','Destination map is not configured: '+target,row);continue;}
        try {if(!destinations.has(target))destinations.set(target,grid(read(root,'server/maps/world_server_'+target+'.json')));const other=destinations.get(target), dest={x:Number(p.x),y:Number(p.y)};
            if(p.x===undefined||p.y===undefined||!other.walkable(dest))finding('error','door-destination','Destination '+target+' at '+p.x+', '+p.y+' is missing, blocked or outside playable bounds.',row);
        }catch(error){finding('error','door-map-file','Destination map could not be checked: '+target,row);}
        if(gates.filter(k=>Object.hasOwn(p,k)).length>1)finding('warning','door-priority','Several main conditions are set; only the first condition in runtime priority applies.',row);
        const tid=String(p.tid||'').replace(/^!/, '');if(tid&&!(map.triggers||[]).some(t=>String(t.trigger)===tid))finding('warning','door-trigger','No exported trigger matches '+tid+'. It may be set by a scripted flow.',row);
    }
    checks.push('Built map bounds, collision tiles, checkpoints, entity assets, spawn areas and entrance destinations');
    const reach=reachable(map,terrain,mapId);
    if(reach.count)for(const row of objects.filter(o=>['npc','item'].includes(o.type))) {
        const near=row.type==='npc'?[row,{x:row.x-1,y:row.y},{x:row.x+1,y:row.y},{x:row.x,y:row.y-1},{x:row.x,y:row.y+1}]:[row];
        if(!near.some(p=>reach.has(p)))finding('warning','unreachable-entity','No base-collision route from a checkpoint reaches '+row.name+'. Dynamic layers and scripted travel are not simulated.',row);
    }
    try {const behavior=(options.readBehavior||readBehavior)(root,mapId);for(const routine of behavior.config.npcs){const row=add('routine',routine.key,routine.label,routine.origin,{kind:routine.kind,editor:link('npcs/behaviour',{map:mapId,routine:routine.key}),tiledLayer:'NPC routine origin'});try{validateRoutine(routine,behavior.config,map);}catch(error){finding('error','npc-routine',error.message,row);}}checks.push('NPC placements, route tiles, schedule areas and public building door pairs');}
    catch(error){finding('warning','npc-source','NPC routines could not be fully checked: '+error.message,null,link('npcs/behaviour',{map:mapId}));}
    try {const data=(options.readQuests||readQuests)(root,mapId);
        if(data.validationError)finding('error','quest-validation',data.validationError,null,link('quests',{map:mapId}));
        for(const q of [...data.quests,...data.existingQuests.map(q=>q.effective)]) {
            const npc=objects.find(o=>o.type==='npc'&&kind(o.kind)===kind(q.npc)), editor=link('quests',{map:mapId,quest:q.id});
            const row=npc?add('quest',q.id,q.name||q.id,npc,{editor,kind:q.id}):null;
            if(q.npc!==undefined&&!npc)finding('warning','quest-npc','Quest '+q.id+' has no matching placed NPC on this map. It may use a scripted spawn.',row,editor);
            if(q.reward?.item!==undefined&&!Types.isItem(kind(q.reward.item)))finding('error','quest-item','Quest '+q.id+' references an unknown reward item.',row,editor);
        }checks.push('Authored quest validation, prerequisites, quest NPCs and reward item references');
    }catch(error){finding('error','quest-source','Quest source could not be checked: '+error.message,null,link('quests',{map:mapId}));}
    for(const [id,row]of usedMobs){const drops=custom.find(e=>e.id===id)?.gameplay?.drops||properties[id]?.drops||{};let total=0;for(const [item,chance]of Object.entries(drops)){if(!Types.isItem(kind(item)))finding('error','drop-item','Drop table references an unknown item: '+item,row);if(!Number.isFinite(chance)||chance<0||chance>100)finding('error','drop-chance','Invalid drop chance for '+item+'.',row);total+=chance;}if(total>100)finding('error','drop-total','Drop chances total more than 100%.',row);}
    return {mapId,width:map.width,height:map.height,collisions:map.collisions||[],tiles:client?.data||[],tilesize:client?.tilesize||16,tileset:'/img/1/tilesheet_'+(['oadungeon','oaoverworld'].includes(mapId)?'oa':mapId)+'.png',objects,findings,checks,sources,
        checkedAt:new Date().toISOString(),summary:{errors:findings.filter(f=>f.severity==='error').length,warnings:findings.filter(f=>f.severity==='warning').length,objects:objects.length},
        limitations:'Checks use built base collisions and current Tiled entrance properties. Dynamic layers, runtime events, ownership and scripted spawns are not simulated. A clean report does not replace a playtest.'};
}
function install(app,toolbox){for(const route of ['map-inspector','map-validation'])app.get('/local/api/'+route,async(req,res)=>{try{if(req.query.mapId===undefined)return res.json({maps:maps(toolbox.root)});if(toolbox.job?.status==='running')fail('Wait for the map build to finish, then refresh analysis.',409);const result=await analyze(toolbox.root,req.query.mapId);if(route==='map-validation'){const {tiles,collisions,tileset,...report}=result;return res.json(report);}res.json(result);}catch(error){res.status(error.status||500).json({error:error.message});}});}
module.exports={analyze,grid,reachable,link,install};

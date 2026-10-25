const fs=require('fs'),path=require('path');
const {readDoors}=require('./localdoorbuilder');
const {maps,safe,readMap}=require('./localtilebuilder');
const link=(tool,args)=>'#'+tool+'/?'+new URLSearchParams(args);
async function readConnections(root,options={}) {
    const ids=maps(root),nodes=[],edges=[],warnings=[],builtMaps=new Map();
    // Limit Python readers: large worlds need bounded memory and process counts.
    let cursor=0;await Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{while(cursor<ids.length){const id=ids[cursor++];let map;try{map=require('./localmapfiles').readJson(safe(root,'server/maps/world_server_'+id+'.json'));}catch(e){warnings.push({mapId:id,message:'Built map unavailable. Build this map.',editor:link('build',{map:id})});}
        if(map)builtMaps.set(id,map);
        nodes.push({id,width:map?.width,height:map?.height,built:!!map});
        try{const source=await(options.readDoors||readDoors)(root,id);for(const d of source.doors){const p=d.properties,target=p.map||id;edges.push({id:id+':'+d.id,objectId:d.id,source:id,target,x:d.tileX,y:d.tileY,tx:Number(p.x),ty:Number(p.y),external:p.http_redirect||null,name:d.name||d.type+' #'+d.id,conditions:Object.fromEntries(Object.entries(p).filter(([k])=>['nft','item','quest','collection','level','weapon_level','tid','time_range'].includes(k))),editor:link('doors',{map:id,object:d.id}),inspector:link('inspector',{map:id,object:'door:'+d.id})});}}catch(e){warnings.push({mapId:id,message:e.message,editor:link('doors',{map:id})});}
    }}));
    nodes.sort((a,b)=>a.id.localeCompare(b.id));edges.sort((a,b)=>a.id.localeCompare(b.id));
    const known=new Map(nodes.map(n=>[n.id,n])),out=id=>edges.filter(e=>e.source===id&&!e.external&&known.has(e.target));
    const reachable=(start,end)=>{const seen=new Set([start]),queue=[start];for(let i=0;i<queue.length;i++){if(queue[i]===end)return true;for(const e of out(queue[i]))if(!seen.has(e.target)){seen.add(e.target);queue.push(e.target);}}return false;};
    for(const e of edges) {
        e.problems=[];if(e.external)continue;const target=known.get(e.target);
        if(!target)e.problems.push('Destination map is not configured.');
        else if(!target.built)e.problems.push('Destination map has no built geometry.');
        else if(!Number.isInteger(e.tx)||!Number.isInteger(e.ty)||e.tx<1||e.ty<1||e.tx>=target.width||e.ty>=target.height)e.problems.push('Destination is outside playable map bounds.');
        else {const targetMap=builtMaps.get(e.target);if(targetMap.collisions?.includes(e.ty*targetMap.width+e.tx))e.problems.push('Destination is on a collision tile.');}
        if(e.source!==e.target&&target&&!reachable(e.target,e.source))e.problems.push(warnings.length?'No return route could be verified; some entrance sources are unavailable.':'No configured door/portal route returns to the source map.');
    }
    return {nodes,edges,warnings,checkedAt:new Date().toISOString(),limitations:'Connections use current Tiled sources; destination collisions use the last build. Reachability ignores gate conditions, dynamic layers, scripted travel and external redirects. A return route may have additional requirements.'};
}
function canvas(root,id) {const map=readMap(root,id);return {mapId:id,width:map.width,height:map.height,tiles:map.data,tilesize:map.tilesize||16,collisions:map.collisions||[],doors:map.doors||[],tileset:require('./localmappreview').readPreview(root,id,1,1).tileset,stagedTiles:map.stagedTiles||{}};}
function install(app,toolbox) {
    app.get('/local/api/world-connections',async(req,res)=>{try{res.json(await readConnections(toolbox.root));}catch(e){res.status(e.status||500).json({error:e.message});}});
    app.get('/local/api/map-canvas',(req,res)=>{try{res.json(canvas(toolbox.root,req.query.mapId));}catch(e){res.status(e.status||400).json({error:e.message});}});
}
module.exports={readConnections,canvas,install};

const path = require('path');
const fs = require('fs');
function validateDefinitions(root,mapId,entries,registry) {
    if(!entries.length)return;
    const Types=require('../../shared/js/gametypes'),catalog={items:[],mobs:[],npcs:[],quests:registry.quests.map(q=>({id:q.id}))};
    Types.forEachKind((kind,id)=>{for(const [source,predicate] of [['items',Types.isItem],['mobs',Types.isMob],['npcs',Types.isNpc]])if(predicate(kind))catalog[source].push({id:kind});});
    const {readOverrides,mergeBehavior}=require('./npcbehaviorfiles'),config=mergeBehavior(registry.behavior(mapId),readOverrides(root,mapId));
    catalog.routines=(config?.npcs||[]).map(n=>({id:n.key}));
    const map=require('./localmapfiles').readJson(path.join(root,'server/maps/world_server_'+mapId+'.json'));
    Object.assign(catalog,{width:map.width,height:map.height,collisions:map.collisions||[]});
    const audio=fs.readFileSync(path.join(root,'client/js/audio.js'),'utf8');
    for(const folder of ['music','sounds']){
        const name=folder==='music'?'musicNames':'soundNames',match=audio.match(new RegExp('this\\.'+name+' = \\[([\\s\\S]*?)\\];'));
        const names=(match?.[1].replace(/\/\/[^\n]*/g,'').match(/["'][^"']+["']/g)||[]).map(s=>s.slice(1,-1));
        catalog[folder]=names.filter(id=>['mp3','ogg'].some(ext=>fs.existsSync(path.join(root,'client/audio',folder==='sounds'?'sounds':'music',id+'.'+ext)))).map(id=>({id}));
    }
    require('./scriptedsequenceconfig').validate(entries,catalog);
}
function register(root,target) {
    const W=require('./localworldauthoring'),{SequenceDirector}=require('./scriptedsequence');
    const maps=require('fs').readFileSync(path.join(root,'server/config.json'),'utf8');
    for(const mapId of JSON.parse(maps).maps) {
        const entries=W.readDocument(root,mapId).sequences;require('./scriptedsequenceconfig').validate(entries);
        validateDefinitions(root,mapId,entries,target);
        if(entries.length)target.register(mapId,{id:'mapmaker-sequences',createScene:world=>new SequenceDirector(world,entries)});
    }
}
module.exports={register,validateDefinitions};

const crypto=require('crypto'),fs=require('fs'),path=require('path');
const F=require('../../shared/js/fishingauthoring');
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
function id(area){return 'toolbox-fishing-'+crypto.createHash('sha256').update(JSON.stringify([area.level,[...area.fish].sort((a,b)=>a.item.localeCompare(b.item))])).digest('hex').slice(0,24);}
function cells(area,map){const result=[];for(let y=area.y;y<area.y+area.height;y++)for(let x=area.x;x<area.x+area.width;x++){const i=y*map.width+x;if(area.scope==='area'||!area.sourceLake||map.baseFishingTiles?.[i]===area.sourceLake)result.push(i);}return result;}
function validate(areas,map,lakes=require('./lakes')){
    if(!Array.isArray(areas)||areas.length>100)fail('Use at most 100 fishing areas.');const ids=new Set(),occupied=new Set();
    for(const area of areas){
        if(!area||typeof area!=='object'||Object.keys(area).some(k=>!['id','kind','name','x','y','width','height','scope','sourceLake','level','fish','editable'].includes(k)))fail('Fishing area contains unsupported settings.');
        if(ids.has(area.id))fail('Fishing area IDs must be unique.');ids.add(area.id);
        if(area.kind!=='fishing'||!Array.isArray(area.fish))fail('Use a fishing area with a catch table.');
        if(typeof area.name!=='string'||area.name.length>120||/[<>\u0000-\u001f]/.test(area.name))fail('Use a fishing area name up to 120 plain-text characters.');
        if(!['area','existing','closed'].includes(area.scope))fail('Choose a fishing area, existing water override or closed water.');
        if(!['x','y','width','height'].every(k=>Number.isSafeInteger(area[k]))||area.x<0||area.y<0||area.width<1||area.height<1||area.x+area.width>map.width||area.y+area.height>map.height||area.width*area.height>250000)fail('Fishing bounds must use whole tiles inside the map, up to 250000 tiles.');
        if(typeof area.sourceLake!=='string'||(area.sourceLake&&!lakes[area.sourceLake]?.fish))fail('Choose a registered source lake.');
        if(area.scope==='existing'&&!area.sourceLake)fail('Choose the existing water to override.');
        if(area.scope!=='closed'){
            if(!Number.isSafeInteger(area.level)||area.level<1||area.level>100)fail('Required rod level must be a whole number from 1 to 100.');
            if(!Array.isArray(area.fish)||!area.fish.length||area.fish.length>100)fail('Add between 1 and 100 catches.');
            const fish=new Set();for(const row of area.fish){if(!row||typeof row.item!=='string'||Object.keys(row).some(key=>!['item','rarity'].includes(key))||!lakes.isFish(row.item)||!Object.hasOwn(F.rarities,row.rarity)||fish.has(row.item))fail('Choose unique registered catches and supported rarities.');fish.add(row.item);}
            if(!area.fish.some(row=>row.rarity==='common'))fail('Keep at least one common catch for missing-rarity fallback.');
        }
        const targets=cells(area,map);if(!targets.length)fail('This area contains no matching source-water tiles.');
        for(const tile of targets){if(occupied.has(tile))fail('Fishing areas affect the same tile. Move or resize them so their affected tiles do not overlap.');occupied.add(tile);}
    }
    return areas;
}
function apply(map,areas=map.fishingAreas||[]){
    const base={...(map.baseFishingTiles||map.fishingTiles||{})},next={...base};
    const normalized={...map,baseFishingTiles:base};
    for(const area of areas)for(const tile of cells(area,normalized)){if(area.scope==='closed')delete next[tile];else next[tile]=id(area);}
    return {...normalized,fishingAreas:areas,fishingTiles:next};
}
function installDefinitions(root,lakes=require('./lakes')){
    const maps=JSON.parse(fs.readFileSync(path.join(root,'server/config.json'))).maps;
    for(const mapId of maps){const map=JSON.parse(fs.readFileSync(path.join(root,'server/maps/world_server_'+mapId+'.json')));if(!map.fishingAreas?.length)continue;
        validate(map.fishingAreas,{...map,baseFishingTiles:map.baseFishingTiles||map.fishingTiles||{}},lakes);
        for(const area of map.fishingAreas)if(area.scope!=='closed')lakes[id(area)]={level:area.level,fish:Object.fromEntries(area.fish.map(row=>[row.item,row.rarity]))};
    }
}
module.exports={id,cells,validate,apply,installDefinitions};

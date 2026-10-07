const {buildActivityCatalog} = require('./activitycatalog');
global.Types = {};
const GameTypes = require('../../shared/js/gametypes');
const definitions = require('../../client/tileActions/duckville.json');
test('catalog values match the live kind registry and actual crop keys',()=>{
 const catalog=buildActivityCatalog(GameTypes,{duckville:definitions},['main']);
 expect(catalog.mobs.find(entry=>entry.kind==='boss').value).toBe(String(GameTypes.Entities.BOSS));
 expect(catalog.items.every(entry=>GameTypes.isItem(GameTypes.getKindFromString(entry.kind)))).toBe(true);
 expect(catalog.tileActions.find(entry=>entry.action==='farm').targets.map(entry=>entry.value)).toEqual(Object.keys(definitions.farm.crops));
 expect(catalog.maps).toEqual(['duckville','main']);
});
test('new registry content appears without changing a separate list',()=>{
 const registry=[{id:42,name:'new_enemy',mob:true}];
 const types={forEachKind:callback=>registry.forEach(entry=>callback(entry.id,entry.name)),isMob:id=>registry.some(entry=>entry.id===id&&entry.mob),isItem:id=>registry.some(entry=>entry.id===id&&!entry.mob)};
 const before=buildActivityCatalog(types,{});registry.push({id:43,name:'new_item',mob:false});
 const after=buildActivityCatalog(types,{});expect(before.items).toEqual([]);expect(after.items[0]).toMatchObject({value:'43',kind:'new_item'});
});

test('fish and lake options derive from the real lake definitions and display names',()=>{
 global.generateFishDataMap=undefined;
 const lakes=require('./lakes');const names=require('../../shared/js/altnames');
 const catalog=buildActivityCatalog(GameTypes,{},[],lakes,names.getName);
 expect(catalog.fish.find(fish=>fish.value==='cobguppy')).toMatchObject({lake:'cobFarmLake',label:names.getName('cobguppy'),rarity:lakes.cobFarmLake.fish.cobguppy});
 expect(catalog.lakes.map(lake=>lake.value)).toEqual(expect.arrayContaining(Object.entries(lakes).filter(([,definition])=>definition?.fish).map(([key])=>key)));
 expect(catalog.lakes.every(lake=>typeof lakes[lake.value]==='object')).toBe(true);
 const added=buildActivityCatalog(GameTypes,{},[],{newLake:{fish:{newFish:'rare'}}},value=>'New fish');
 expect(added.fish).toEqual([{value:'newFish',label:'New fish',lake:'newLake',rarity:'rare'}]);
});

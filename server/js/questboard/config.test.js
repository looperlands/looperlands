const {validateConfig,DEFAULTS}=require('./config');
const {occurrences,localInstant}=require('./schedule');
const raw=()=>({schemaVersion:1,mapId:'map',boards:[{id:'board',label:'Town work',bounds:{x:1,y:2,width:2,height:1},questIds:['Q']}],handInLocations:[{id:'crate',kind:'object',label:'Supply crate',bounds:{x:5,y:2,width:1,height:1}}],schedules:[{id:'daily',repeat:{frequency:'daily'},completeAt:'nextOpening'}],quests:[{id:'Q',name:'Supplies',category:'requests',scheduleId:'daily',objectives:[{id:'basket',eventType:'DELIVER_ITEMS',recipientId:'crate',items:[{item:'ORE',amount:3}]}],rewards:{xp:100}}]});
const catalog={resolveEntity:(v)=>v==='ORE'?42:null};
test('one map JSON resolves generic baskets and inspectable defaults without source requirements',()=>{
 const c=validateConfig(raw(),'map',catalog);expect(c.quests[0].objectives[0].items).toEqual([{item:'42',amount:3}]);expect(c.defaults).toEqual(DEFAULTS);expect(c.quests[0].policy.withdrawal.retainProgress).toBe(true);
});
test.each([
 ['unknown root field',v=>v.future=true],['unsupported community policy',v=>v.defaults={participation:'community'}],['missing recipient',v=>v.handInLocations=[]],
 ['unknown item',v=>v.quests[0].objectives[0].items[0].item='FAKE'],['quantity zero',v=>v.quests[0].objectives[0].items[0].amount=0],
 ['later acceptance',v=>{v.schedules[0]={id:'daily',repeat:{frequency:'daily'},acceptanceWindowHours:25,completionWindowHours:24};}],
 ['missing schedule',v=>delete v.quests[0].scheduleId],['duplicate quest',v=>v.quests.push(v.quests[0])],['unknown timezone',v=>v.schedules[0].timezone='Not/A_Zone'],
 ['unfunded reward',v=>v.quests[0].rewards.items=[{item:'ORE',amount:1}]],['source restricted basket',v=>v.quests[0].objectives[0].stage='harvest']
])('rejects %s before publishing',(_,mutate)=>{const v=raw();mutate(v);expect(()=>validateConfig(v,'map',catalog)).toThrow();});
test('tile action selects registered stage, target and produced quantity independently of item hand-in',()=>{
 const v=raw();v.quests[0].objectives=[{id:'mine',eventType:'TILE_ACTION',action:'quarry',stage:'extract',target:'ore',amount:6,measurement:'quantity'}];
 const cat={...catalog,tileActions:[{map:'map',action:'quarry',stages:['extract'],quantityStages:['extract'],targets:[{value:'ore'}]}]};
 expect(validateConfig(v,'map',cat).quests[0].objectives[0].measurement).toBe('quantity');v.quests[0].objectives[0].target='*';expect(()=>validateConfig(v,'map',cat)).toThrow('specific output');
});
test('deterministic windows preserve occurrence IDs across reward edits and restarts',()=>{
 const v=raw(),now=Date.parse('2026-10-11T12:00:00Z'),first=occurrences(validateConfig(v,'map',catalog),now);v.quests[0].rewards.xp=200;
 const next=occurrences(validateConfig(v,'map',catalog),now);expect(next.map(o=>o.id)).toEqual(first.map(o=>o.id));expect(first[0].snapshot.version).not.toEqual(next[0].snapshot.version);expect(first).toHaveLength(4);
});
test('DST skipped clock advances and repeated clock chooses earlier instant',()=>{
 expect(new Date(localInstant(Date.UTC(2026,2,29,2,30),'Europe/Amsterdam')).toISOString()).toBe('2026-03-29T01:00:00.000Z');
 expect(new Date(localInstant(Date.UTC(2026,9,25,2,30),'Europe/Amsterdam')).toISOString()).toBe('2026-10-25T00:30:00.000Z');
 const v=raw();v.schedules[0].timezone='Europe/Amsterdam';const out=occurrences(validateConfig(v,'map',catalog),Date.parse('2026-03-29T10:00:00Z'));
 expect(out[0].endsAt-out[0].opensAt).toBe(23*3600000);expect(out[0].acceptUntil).toBe(out[0].endsAt);
});
test('rotations select deterministically with repeat avoidance and explicit fallback',()=>{
 const v=raw();v.quests.push({...v.quests[0],id:'R'});v.boards[0].questIds.push('R');v.schedules[0].repeat.anchorDate='2026-10-01';v.schedules[0].rotation={pool:[{id:'Q'},{id:'R'}],count:1,avoidLast:1,fallback:'fewer'};
 const c=validateConfig(v,'map',catalog),a=occurrences(c,Date.parse('2026-10-11T12:00:00Z'));expect(a).toHaveLength(4);expect(a[0].questId).not.toBe(a[1].questId);expect(occurrences(c,Date.parse('2026-10-11T12:00:00Z'))).toEqual(a);
});

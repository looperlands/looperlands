const {validateConfig}=require('./config');
const {occurrences}=require('./schedule');
const {visibleRefill}=require('./generation');
const {QuestBoardService}=require('./service');
const now=Date.parse('2026-10-11T12:00:00Z');
const catalog={resolveEntity:(value,type)=>({item:{ORE:42,HIDE:43,SEED:44},mob:{RAT:2,BAT:3}}[type]?.[value] ?? (/^\d+$/.test(String(value))?value:null))};
function raw() {return {schemaVersion:1,mapId:'map',boards:[{id:'board',label:'Work',bounds:{x:1,y:1,width:2,height:2},questIds:['hunt','supplies','ore']}],handInLocations:[{id:'crate',kind:'object',label:'Supply crate',bounds:{x:5,y:5,width:1,height:1}}],schedules:[{id:'daily',repeat:{frequency:'daily',anchorDate:'2026-10-01'},completeAt:'nextOpening',previewHours:0,refill:{counts:{challenges:1,requests:2},limitPerCategory:6,avoidLast:1,pool:[{id:'hunt'},{id:'supplies',weight:3},{id:'ore'}]}}],quests:[
 {id:'hunt',name:'Hunt {hunt.amount} {hunt.target}',description:'A reward of {reward.xp} XP for keeping the roads safe.',category:'challenges',scheduleId:'daily',objectives:[{id:'hunt',label:'Defeat {hunt.amount} {hunt.target}',eventType:'KILL_MOB',target:'RAT',amount:1}],rewards:{xp:20},generation:{objectives:[{id:'hunt',amount:{min:3,max:9,step:2},targets:[{target:'RAT',label:'rats',weight:3},{target:'BAT',label:'bats'}]}],rewards:{xp:{base:20,perUnit:[{objectiveId:'hunt',xp:10}],max:100}}}},
 {id:'supplies',name:'Supplies',category:'requests',scheduleId:'daily',objectives:[{id:'basket',eventType:'DELIVER_ITEMS',recipientId:'crate',items:[{item:'ORE',amount:1}]}],rewards:{xp:10,items:[{item:'SEED',amount:1,fundingRef:'test'}]},generation:{objectives:[{id:'basket',items:{count:2,pool:[{item:'ORE',amount:{min:2,max:6,step:2}},{item:'HIDE',amount:{min:1,max:5}}]}}],rewards:{xp:{base:10,perUnit:[{objectiveId:'basket',item:'ORE',xp:10},{objectiveId:'basket',item:'HIDE',xp:20}],max:200},items:[{item:'SEED',amount:{min:1,max:3}}]}}},
 {id:'ore',name:'Ore',category:'requests',scheduleId:'daily',objectives:[{id:'basket',eventType:'DELIVER_ITEMS',recipientId:'crate',items:[{item:'ORE',amount:1}]}],rewards:{xp:10}}
]};}
const config=()=>validateConfig(raw(),'map',catalog);
const offers=()=>occurrences(config(),now);
const forCategory=(all,category)=>all.filter(o=>o.snapshot.category===category).sort((a,b)=>a.snapshot.refill.index-b.snapshot.refill.index);
const state=(all,attempts=[])=>({occurrences:structuredClone(all),attempts,inventory:{},serverTime:now});
const attempt=(o,status='completed',nftId='alice')=>({occurrenceId:o.id,nftId,status,occurrence:o});
test('generated terms stay within catalog-backed rules, render lore and scale capped rewards',()=>{
 const c=config(),before=JSON.stringify(c),all=occurrences(c,now);
 expect(all).toHaveLength(12);
 for (const o of all) {
  expect(o.snapshot.generation).toBeUndefined();
  if(o.snapshot.templateId==='hunt') {
   const goal=o.snapshot.objectives[0];expect([3,5,7,9]).toContain(goal.amount);expect(['2','3']).toContain(goal.target);
   expect(o.snapshot.name).toBe(`Hunt ${goal.amount} ${goal.target==='2'?'rats':'bats'}`);
   expect(o.snapshot.rewards.xp).toBe(Math.min(100,20+goal.amount*10));
   expect(o.snapshot.description).toContain(o.snapshot.rewards.xp+' XP');
  }
  if(o.snapshot.templateId==='supplies') {
   const basket=o.snapshot.objectives[0].items;expect(new Set(basket.map(i=>i.item)).size).toBe(2);
   for(const item of basket) expect(item.item==='42'?[2,4,6]:[1,2,3,4,5]).toContain(item.amount);
   expect(o.snapshot.rewards.xp).toBe(Math.min(200,10+basket.reduce((sum,i)=>sum+i.amount*(i.item==='42'?10:20),0)));
   expect(o.snapshot.rewards.items[0]).toMatchObject({item:'44',fundingRef:'test'});expect([1,2,3]).toContain(o.snapshot.rewards.items[0].amount);
  }
 }
 expect(JSON.stringify(c)).toBe(before);
});
test('shared streams survive restarts and request order; future windows vary',()=>{
 const a=offers(); jest.resetModules(); const restarted=require('./schedule').occurrences;
 expect(restarted(config(),now)).toEqual(a);
 const next=restarted(config(),now+86400000);expect(next.map(o=>o.id)).not.toEqual(a.map(o=>o.id));
 expect(next.map(o=>o.snapshot.objectives)).not.toEqual(a.map(o=>o.snapshot.objectives));
 expect(restarted(config(),now)).toEqual(a);
});
test('weighted pool selection and repeat avoidance have distinct observable behavior',()=>{
 const v=raw();v.schedules[0].refill.avoidLast=0;v.schedules[0].refill.pool.find(q=>q.id==='supplies').weight=100;
 const c=validateConfig(v,'map',catalog);let selected=[];
 for(let day=0;day<25;day++) selected.push(...forCategory(occurrences(c,now+day*86400000),'requests').map(o=>o.snapshot.templateId));
 expect(selected.filter(id=>id==='supplies').length).toBeGreaterThan(140);
 const alternating=forCategory(offers(),'requests').map(o=>o.snapshot.templateId);
 for(let i=1;i<alternating.length;i++) expect(alternating[i]).not.toBe(alternating[i-1]);
});
test('fixed category slots advance only on completion, independently for players',()=>{
 const all=offers(),requests=forCategory(all,'requests'),challenges=forCategory(all,'challenges');
 const initial=visibleRefill(state(all),{nftId:'alice'}).occurrences;
 expect(initial.map(o=>o.id)).toEqual(expect.arrayContaining([requests[0].id,requests[1].id,challenges[0].id]));expect(initial).toHaveLength(3);
 const saved=[attempt(requests[0]),attempt(challenges[0],'ready')];
 const next=visibleRefill(state(all,saved),{nftId:'alice'}).occurrences;
 expect(next.map(o=>o.id)).toEqual(expect.arrayContaining([requests[1].id,requests[2].id,challenges[0].id]));expect(next).toHaveLength(3);
 expect(visibleRefill(state(all),{nftId:'bob'}).occurrences).toEqual(initial);
 for(const status of ['accepted','withdrawn','ready']) expect(visibleRefill(state(all,[attempt(requests[0],status)]),{nftId:'alice'}).occurrences).toEqual(initial);
 expect(visibleRefill(state(all,all.map(o=>attempt(o))),{nftId:'alice'}).occurrences).toEqual([]);
});
test('wallet completion scope is shared across Loopers; looper scope and history summary stay independent',()=>{
 const all=offers(),first=forCategory(all,'challenges')[0];
 const data=state(all);data.refillCompletions=[{occurrenceId:first.id,nftId:'other'}];
 expect(visibleRefill(data,{nftId:'alice'}).occurrences.some(o=>o.id===first.id)).toBe(false);
 for(const o of data.occurrences) o.snapshot.policy.completionScope='looper';
 expect(visibleRefill(data,{nftId:'alice'}).occurrences.some(o=>o.id===first.id)).toBe(true);
 expect(visibleRefill(data,{nftId:'other'}).occurrences.some(o=>o.id===first.id)).toBe(false);
});
test('changing generation seeds or template weights cannot create another slot allowance',()=>{
 const v=raw(),a=offers();v.schedules[0].refill.seed='changed';v.quests[0].generation.seed='changed';v.quests[0].rewards.xp=200;
 const b=occurrences(validateConfig(v,'map',catalog),now);
 expect(b.map(o=>o.id).sort()).toEqual(a.map(o=>o.id).sort());expect(b.map(o=>o.questId).sort()).toEqual(a.map(o=>o.questId).sort());
 expect(b.map(o=>o.snapshot)).not.toEqual(a.map(o=>o.snapshot));
});
test.each([
 ['backwards range',v=>v.quests[0].generation.objectives[0].amount={min:9,max:3}],
 ['unreachable step',v=>v.quests[0].generation.objectives[0].amount={min:3,max:8,step:2}],
 ['unknown mob',v=>v.quests[0].generation.objectives[0].targets[0].target='MADEUP'],
 ['duplicate targets',v=>v.quests[0].generation.objectives[0].targets.push({target:'RAT'})],
 ['unknown objective',v=>v.quests[0].generation.objectives[0].id='fake'],
 ['invalid basket count',v=>v.quests[1].generation.objectives[0].items.count=3],
 ['unknown basket item',v=>v.quests[1].generation.objectives[0].items.pool[0].item='FAKE'],
 ['unknown text token',v=>v.quests[0].description='{missing.amount}'],
 ['too long generated title',v=>{v.quests[0].name='x'.repeat(136)+'{hunt.target}';v.quests[0].generation.objectives[0].targets[0].label='r'.repeat(100);}],
 ['unfunded generated reward',v=>v.quests[0].generation.rewards.items=[{item:'SEED',amount:1}]],
 ['invalid XP item selector',v=>v.quests[0].generation.rewards.xp.perUnit[0].item='ORE'],
 ['unknown XP objective',v=>v.quests[0].generation.rewards.xp.perUnit[0].objectiveId='missing'],
 ['XP outside ceiling',v=>v.quests[0].generation.rewards.xp.max=1001],
 ['XP target outside pool',v=>{v.quests[0].generation.objectives[0].targets=[{target:'RAT'}];v.quests[0].generation.rewards.xp.perUnit[0].target='BAT';}],
 ['empty counts',v=>v.schedules[0].refill.counts={}],
 ['unknown category',v=>v.schedules[0].refill.counts.farming=1],
 ['limit below slot count',v=>v.schedules[0].refill.limitPerCategory=1],
 ['unknown pool quest',v=>v.schedules[0].refill.pool[0].id='missing'],
 ['duplicate pool quest',v=>v.schedules[0].refill.pool.push({id:'hunt'})],
 ['missing category pool',v=>v.schedules[0].refill.counts.adventures=1],
 ['partial advertised stream',v=>v.boards[0].questIds.pop()],
 ['two selectors',v=>v.schedules[0].rotation={pool:[{id:'hunt'}]}],
 ['unbounded publication',v=>{v.schedules[0].previewHours=744;v.schedules[0].refill.limitPerCategory=50;}]
])('invalid %s fails at configuration time',(_,mutate)=>{const v=raw();mutate(v);expect(()=>validateConfig(v,'map',catalog)).toThrow();});
test('exhausted no-repeat pools use explicit fewer fallback without inventing offers',()=>{
 const v=raw();v.schedules[0].refill.fallback='fewer';
 const all=occurrences(validateConfig(v,'map',catalog),now);
 expect(forCategory(all,'challenges')).toHaveLength(1);expect(forCategory(all,'requests')).toHaveLength(6);
});
test('ordinary scheduled quests can generate terms without enabling refill',()=>{
 const v=raw();delete v.schedules[0].refill;
 const c=validateConfig(v,'map',catalog),all=occurrences(c,now);
 expect(all).toHaveLength(3);expect(all[0].snapshot.refill).toBeUndefined();expect(all.find(o=>o.questId==='hunt').snapshot.name).toMatch(/^Hunt [3579] (rats|bats)$/);
});
test('state service exposes only current slots and rejects retired templates while keeping attempts',async()=>{
 const c=config(),all=occurrences(c,now),first=forCategory(all,'challenges')[0];
 const data=state(all,[attempt(first)]),platform={questBoard:jest.fn(async op=>op==='state'?structuredClone(data):{})};
 const configs=new Map([['map',c]]),service=new QuestBoardService(configs,platform,{now:()=>now});
 const result=await service.state({wallet:'alice',nftId:'alice'},'map');expect(result.occurrences).toHaveLength(3);expect(result.attempts).toHaveLength(1);
 expect(platform.questBoard).toHaveBeenCalledWith('publish',expect.objectContaining({enabledQuestIds:expect.arrayContaining([first.questId])}));
 c.quests.find(q=>q.id==='hunt').enabled=false;
 expect((await service.state({wallet:'alice',nftId:'alice'},'map')).occurrences).toHaveLength(2);
});

test('pausing a template preserves accepted slot occupancy instead of revealing extra work',()=>{
 const c=config(),all=occurrences(c,now),first=forCategory(all,'requests')[0];
 c.quests.find(q=>q.id===first.snapshot.templateId).enabled=false;
 const saved=state(all,[attempt(first,'accepted')]);saved.occurrences.find(o=>o.id===first.id).enabled=false;
 const result=visibleRefill(saved,{nftId:'alice'},new Map([['map',c]]));
 expect(result.occurrences.filter(o=>o.snapshot.category==='requests')).toHaveLength(2);
 expect(result.occurrences.some(o=>o.id===first.id)).toBe(true);expect(result.attempts).toHaveLength(1);
});

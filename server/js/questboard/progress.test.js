const fs=require('fs'),os=require('os'),path=require('path');
const {QuestBoardProgress}=require('./progress');
let directory;beforeEach(()=>{directory=fs.mkdtempSync(path.join(os.tmpdir(),'quest-progress-'));});afterEach(()=>fs.rmSync(directory,{recursive:true,force:true}));
const player={walletId:'wallet',nftId:'avatar',mapId:'map',x:1,y:2};
function setup(platform={questBoard:jest.fn(async()=>({replayed:false}))}){return new QuestBoardProgress(platform,{file:path.join(directory,'events.jsonl'),timer:false,now:()=>10000});}
test('successful action is durable before record resolves and retries preserve exact ID and timestamp',async()=>{
 const client={questBoard:jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({})},p=setup(client);
 await p.record(player,'TILE_ACTION',{id:'stable-id',occurredAt:8000,action:'mine',stage:'extract',target:'ore',quantity:4});
 expect(JSON.parse(fs.readFileSync(p.file,'utf8')).event).toMatchObject({id:'stable-id',occurredAt:8000,type:'TILE_ACTION',quantity:4});
 await expect(p.flush()).rejects.toThrow('offline');await p.close();const restarted=setup(client);await restarted.flush();expect(client.questBoard.mock.calls[0]).toEqual(client.questBoard.mock.calls[1]);expect(fs.readFileSync(p.file,'utf8')).toBe('');
});
test('duplicate queued IDs and negative inventory mutations cannot multiply action progress',async()=>{
 const p=setup();await Promise.all([p.record(player,'KILL_MOB',{id:'same',target:3}),p.record(player,'KILL_MOB',{id:'same',target:3})]);
 await p.record(player,'LOOT_ITEM',{target:3,quantity:-2});await p.flush();expect(p.platform.questBoard).toHaveBeenCalledTimes(1);
});
test('broker adapts only authoritative qualifying activity and uses killed target coordinates',async()=>{
 const p=setup();await p.broker(player,'KILL_MOB',{mob:{kind:9,x:8,y:7}});await p.broker(player,'NPC_TALKED',{npc:12});await p.broker(player,'SPAWNED',{});await p.flush();
 expect(p.platform.questBoard.mock.calls[0][1].event).toMatchObject({type:'KILL_MOB',target:'9',x:8,y:7});expect(p.platform.questBoard).toHaveBeenCalledTimes(2);
});
test('terminal actor conflicts are durably quarantined without blocking other players',async()=>{
 const client={questBoard:jest.fn().mockRejectedValueOnce({response:{status:409,data:{code:'owned_looper_required'}}}).mockResolvedValue({})},p=setup(client);
 await p.record(player,'KILL_MOB',{id:'ineligible',target:9});await p.record({...player,nftId:'eligible'},'KILL_MOB',{id:'eligible',target:9});
 const warn=jest.spyOn(console,'warn').mockImplementation(()=>{});try{await p.flush();}finally{warn.mockRestore();}
 expect(client.questBoard).toHaveBeenCalledTimes(2);expect(fs.readFileSync(p.file,'utf8')).toBe('');expect(JSON.parse(fs.readFileSync(p.file+'.rejected.jsonl','utf8')).row.event.id).toBe('ineligible');
});
test('receipt events retain original map after asynchronous travel and authentication failures remain retryable',async()=>{
 const client={questBoard:jest.fn().mockRejectedValue({response:{status:403,data:{code:'auth'}}})},p=setup(client);
 await p.record({...player,mapId:'new-map'},'TILE_ACTION',{id:'original',mapId:'original-map',quantity:1});await expect(p.flush()).rejects.toMatchObject({response:{status:403}});
 expect(JSON.parse(fs.readFileSync(p.file,'utf8')).event.mapId).toBe('original-map');
});

const fs = require('fs');
const os = require('os');
const path = require('path');
const ActivityTracker = require('./activitytracker');
const player = {nftId:'looper-one',walletId:'0xABC',sessionId:'session-one',mapId:'duckville'};
let directory, now, tracker, client;
beforeEach(()=>{directory=fs.mkdtempSync(path.join(os.tmpdir(),'ll-activity-'));now=10000;client={storeActivity:jest.fn(async rows=>({accepted:rows.map(row=>row.id)}))};tracker=new ActivityTracker(client,{enabled:true,timer:false,now:()=>now,spool:path.join(directory,'activity.jsonl'),activeWindowMs:15000});});
afterEach(()=>{tracker.close();fs.rmSync(directory,{recursive:true,force:true});});
test('inactivity and resuming gameplay do not back-credit idle time',()=>{
 tracker.start(player);tracker.meaningful(player);now=40000;tracker.tick();
 expect(tracker.pending[0].data).toMatchObject({connectedSeconds:30,activeSeconds:15});
 now=50000;tracker.meaningful(player);expect(tracker.pending[1].data.activeSeconds).toBe(0);
 now=60000;tracker.tick();expect(tracker.pending[2].data.activeSeconds).toBe(10);
});
test('splits UTC midnight and excludes stalled process time',()=>{
 now=Date.parse('2026-10-07T23:59:50Z');tracker.start(player);tracker.meaningful(player);now+=30000;tracker.tick();
 expect(tracker.pending.map(row=>row.data.connectedSeconds)).toEqual([10,20]);
 expect(tracker.pending.map(row=>row.data.activeSeconds)).toEqual([10,5]);
 now+=3600000;tracker.tick();expect(tracker.pending.at(-1).data.connectedSeconds).toBe(30);expect(tracker.pending.at(-1).data.activeSeconds).toBe(0);
});
test('only one session per wallet is sampled within a server',()=>{
 tracker.start(player);tracker.meaningful(player);now+=10000;tracker.start({...player,nftId:'looper-two',sessionId:'session-two'});
 expect(tracker.sessions.size).toBe(1);expect(tracker.pending[0].nftId).toBe('looper-one');
 now+=10000;tracker.tick();expect(tracker.pending.at(-1).nftId).toBe('looper-two');
});
test('ambiguous responses and restarts retry the original IDs',async()=>{
 tracker.start(player);tracker.record(player,'tile',{action:'farm',stage:'harvest',target:'tomato',quantity:3});const id=tracker.pending[0].id;
 client.storeActivity.mockRejectedValueOnce(new Error('timeout'));await expect(tracker.flush()).rejects.toThrow('timeout');
 const resumed=new ActivityTracker(client,{enabled:true,timer:false,now:()=>now,spool:tracker.spool});
 expect(resumed.pending[0].id).toBe(id);await resumed.flush();expect(resumed.pending).toEqual([]);expect(fs.readFileSync(tracker.spool,'utf8')).toBe('');resumed.close();
});
test('partial receipts never remove unacknowledged events',async()=>{
 tracker.start(player);tracker.record(player,'kill',{target:'13',quantity:1});client.storeActivity.mockResolvedValueOnce({accepted:[]});
 await expect(tracker.flush()).rejects.toThrow('Incomplete');expect(tracker.pending).toHaveLength(1);
});
test('records appended during an in-flight flush remain durable',async()=>{
 tracker.start(player);tracker.record(player,'kill',{target:'13',quantity:1});let resolve;
 client.storeActivity.mockImplementationOnce(rows=>new Promise(done=>{resolve=()=>done({accepted:rows.map(row=>row.id)});}));
 const flushing=tracker.flush();tracker.record(player,'loot',{target:'22',quantity:2});resolve();await flushing;
 expect(tracker.pending).toHaveLength(1);expect(JSON.parse(fs.readFileSync(tracker.spool,'utf8').trim()).type).toBe('loot');
});
test('disabled tracking creates neither sessions nor spool files',()=>{
 const disabled=new ActivityTracker(client,{enabled:false,spool:path.join(directory,'disabled')});disabled.start(player);disabled.record(player,'kill',{});expect(disabled.sessions.size).toBe(0);expect(fs.existsSync(disabled.spool)).toBe(false);
});

test.each([undefined, 'true', 'false'])('runtime tracking flag %s controls tile uploads', async flag => {
 const original = process.env.ACTIVITY_TRACKING_ENABLED;
 let runtime;
 try {
  if (flag === undefined) delete process.env.ACTIVITY_TRACKING_ENABLED;
  else process.env.ACTIVITY_TRACKING_ENABLED = flag;
  const spool = path.join(directory, 'runtime.jsonl');
  runtime = new ActivityTracker(client, {timer:false, spool});
  runtime.start(player);
  runtime.record(player, 'tile', {action:'farm', stage:'prepare', target:'*', quantity:1});
  await runtime.flush();
  if (flag === 'false') {
   expect(client.storeActivity).not.toHaveBeenCalled();
   expect(fs.existsSync(spool)).toBe(false);
  } else {
   expect(client.storeActivity).toHaveBeenCalledWith([
    expect.objectContaining({type:'tile', data:{action:'farm', stage:'prepare', target:'*', quantity:1}})
   ]);
   expect(runtime.pending).toEqual([]);
  }
 } finally {
  runtime?.close();
  if (original === undefined) delete process.env.ACTIVITY_TRACKING_ENABLED;
  else process.env.ACTIVITY_TRACKING_ENABLED = original;
 }
});

test('corrupt spools disable telemetry without stopping gameplay or erasing the file',()=>{
 const spool=path.join(directory,'broken.jsonl');fs.writeFileSync(spool,'partial json');
 const log=jest.spyOn(console,'error').mockImplementation(()=>{});
 try {const broken=new ActivityTracker(client,{enabled:true,timer:false,spool});expect(broken.enabled).toBe(false);expect(()=>broken.start(player)).not.toThrow();expect(fs.readFileSync(spool,'utf8')).toBe('partial json');broken.close();}finally{log.mockRestore();}
});
test('spool write errors do not fail a successful game action',()=>{
 tracker.start(player);const log=jest.spyOn(console,'error').mockImplementation(()=>{});const append=jest.spyOn(fs,'appendFileSync').mockImplementation(()=>{throw new Error('disk full');});
 try{expect(()=>tracker.record(player,'kill',{target:'13',quantity:1})).not.toThrow();expect(tracker.enabled).toBe(false);expect(tracker.pending).toEqual([]);}finally{append.mockRestore();log.mockRestore();}
});

test('inventory consumption is not queued as loot and cannot block later scoring', async () => {
 tracker.start(player); tracker.record(player,'loot',{target:'22',quantity:-2}); tracker.record(player,'loot',{target:'22',quantity:0});
 tracker.record(player,'loot',{target:'22',quantity:3}); tracker.record(player,'kill',{target:'13',quantity:1});
 expect(tracker.pending.map(row=>[row.type,row.data.quantity])).toEqual([['loot',3],['kill',1]]);
 await tracker.flush(); expect(tracker.pending).toEqual([]);
});

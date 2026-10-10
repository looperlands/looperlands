const fs = require('fs');
const os = require('os');
const path = require('path');
const ActivityTracker = require('./activitytracker');
const player = {nftId:'looper-one',walletId:'0xABC',sessionId:'session-one',mapId:'duckville'};
let directory, now, tracker, client;
beforeEach(()=>{directory=fs.mkdtempSync(path.join(os.tmpdir(),'ll-activity-'));now=10000;client={storeActivity:jest.fn(async rows=>({accepted:rows.map(row=>row.id)}))};tracker=new ActivityTracker(client,{enabled:true,timer:false,now:()=>now,spool:path.join(directory,'activity.jsonl'),activeWindowMs:15000});});
afterEach(async()=>{await tracker.close();fs.rmSync(directory,{recursive:true,force:true});});
test('inactivity and resuming gameplay do not back-credit idle time',async()=>{
 tracker.start(player);tracker.meaningful(player);now=40000;tracker.tick();await tracker.storageQueue;
 expect(tracker.pending[0].data).toMatchObject({connectedSeconds:30,activeSeconds:15});
 now=50000;tracker.meaningful(player);await tracker.storageQueue;expect(tracker.pending[1].data.activeSeconds).toBe(0);
 now=60000;tracker.tick();await tracker.storageQueue;expect(tracker.pending[2].data.activeSeconds).toBe(10);
});
test('splits UTC midnight and excludes stalled process time',async()=>{
 now=Date.parse('2026-10-07T23:59:50Z');tracker.start(player);tracker.meaningful(player);now+=30000;tracker.tick();await tracker.storageQueue;
 expect(tracker.pending.map(row=>row.data.connectedSeconds)).toEqual([10,20]);
 expect(tracker.pending.map(row=>row.data.activeSeconds)).toEqual([10,5]);
 now+=3600000;tracker.tick();await tracker.storageQueue;expect(tracker.pending.at(-1).data.connectedSeconds).toBe(30);expect(tracker.pending.at(-1).data.activeSeconds).toBe(0);
});
test('only one session per wallet is sampled within a server',async()=>{
 tracker.start(player);tracker.meaningful(player);now+=10000;tracker.start({...player,nftId:'looper-two',sessionId:'session-two'});await tracker.storageQueue;
 expect(tracker.sessions.size).toBe(1);expect(tracker.pending[0].nftId).toBe('looper-one');
 now+=10000;tracker.tick();await tracker.storageQueue;expect(tracker.pending.at(-1).nftId).toBe('looper-two');
});
test('ambiguous responses and restarts retry the original IDs',async()=>{
 tracker.start(player);tracker.record(player,'tile',{action:'farm',stage:'harvest',target:'tomato',quantity:3});await tracker.storageQueue;const id=tracker.pending[0].id;
 client.storeActivity.mockRejectedValueOnce(new Error('timeout'));await expect(tracker.flush()).rejects.toThrow('timeout');
 const resumed=new ActivityTracker(client,{enabled:true,timer:false,now:()=>now,spool:tracker.spool});
 expect(resumed.pending[0].id).toBe(id);await resumed.flush();expect(resumed.pending).toEqual([]);expect(fs.readFileSync(tracker.spool,'utf8')).toBe('');await resumed.close();
});
test('partial receipts never remove unacknowledged events',async()=>{
 tracker.start(player);tracker.record(player,'kill',{target:'13',quantity:1});client.storeActivity.mockResolvedValueOnce({accepted:[]});
 await expect(tracker.flush()).rejects.toThrow('Incomplete');expect(tracker.pending).toHaveLength(1);
});
test('records appended during an in-flight flush remain durable',async()=>{
 tracker.start(player);tracker.record(player,'kill',{target:'13',quantity:1});let resolve;
 client.storeActivity.mockImplementationOnce(rows=>new Promise(done=>{resolve=()=>done({accepted:rows.map(row=>row.id)});}));
 const flushing=tracker.flush();await tracker.storageQueue;await Promise.resolve();tracker.record(player,'loot',{target:'22',quantity:2});resolve();await flushing;
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
  await runtime?.close();
  if (original === undefined) delete process.env.ACTIVITY_TRACKING_ENABLED;
  else process.env.ACTIVITY_TRACKING_ENABLED = original;
 }
});

test('corrupt spools disable telemetry without stopping gameplay or erasing the file',()=>{
 const spool=path.join(directory,'broken.jsonl');fs.writeFileSync(spool,'partial json');
 const log=jest.spyOn(console,'error').mockImplementation(()=>{});
 try {const broken=new ActivityTracker(client,{enabled:true,timer:false,spool});expect(broken.enabled).toBe(false);expect(()=>broken.start(player)).not.toThrow();expect(fs.readFileSync(spool,'utf8')).toBe('partial json');broken.close();}finally{log.mockRestore();}
});
test('spool write errors do not fail a successful game action',async()=>{
 tracker.start(player);const log=jest.spyOn(console,'error').mockImplementation(()=>{});const append=jest.spyOn(fs.promises,'appendFile').mockRejectedValue(new Error('disk full'));
 try{expect(()=>tracker.record(player,'kill',{target:'13',quantity:1})).not.toThrow();await tracker.storageQueue;await Promise.resolve();expect(tracker.enabled).toBe(false);expect(tracker.pending).toEqual([]);}finally{append.mockRestore();log.mockRestore();}
});

test('inventory consumption is not queued as loot and cannot block later scoring', async () => {
 tracker.start(player); tracker.record(player,'loot',{target:'22',quantity:-2}); tracker.record(player,'loot',{target:'22',quantity:0});
 tracker.record(player,'loot',{target:'22',quantity:3}); tracker.record(player,'kill',{target:'13',quantity:1});
 await tracker.storageQueue;expect(tracker.pending.map(row=>[row.type,row.data.quantity])).toEqual([['loot',3],['kill',1]]);
 await tracker.flush(); expect(tracker.pending).toEqual([]);
});

test('slow spool storage yields to gameplay and cannot upload an unwritten kill', async () => {
 tracker.start(player);
 const original = fs.promises.appendFile.bind(fs.promises);
 let release;
 const gate = new Promise(resolve => {release = resolve;});
 const append = jest.spyOn(fs.promises, 'appendFile').mockImplementationOnce(async (...args) => {
  await gate;
  return original(...args);
 });
 const syncAppend = jest.spyOn(fs, 'appendFileSync');
 try {
  tracker.record(player, 'kill', {target:'13', quantity:1});
  const flushing = tracker.flush();
  await new Promise(resolve => setImmediate(resolve));
  expect(append).toHaveBeenCalledTimes(1);
  expect(syncAppend).not.toHaveBeenCalled();
  expect(tracker.pending).toEqual([]);
  expect(client.storeActivity).not.toHaveBeenCalled();
  release(); await flushing;
  expect(client.storeActivity).toHaveBeenCalledWith([expect.objectContaining({type:'kill'})]);
 } finally {release(); await tracker.storageQueue; append.mockRestore(); syncAppend.mockRestore();}
});

test('an append during spool replacement is serialized after the atomic rename', async () => {
 tracker.start(player); tracker.record(player, 'kill', {target:'13', quantity:1});
 const original = fs.promises.writeFile.bind(fs.promises);
 let release, started;
 const gate = new Promise(resolve => {release = resolve;});
 const writing = new Promise(resolve => {started = resolve;});
 const write = jest.spyOn(fs.promises, 'writeFile').mockImplementationOnce(async (...args) => {
  started(); await gate; return original(...args);
 });
 try {
  const flushing = tracker.flush(); await writing;
  tracker.record(player, 'loot', {target:'22', quantity:2});
  release(); await flushing; await tracker.storageQueue;
  expect(tracker.pending).toHaveLength(1);
  expect(JSON.parse(fs.readFileSync(tracker.spool, 'utf8').trim())).toMatchObject({type:'loot', id:tracker.pending[0].id});
 } finally {release(); await tracker.storageQueue; write.mockRestore();}
});

test('failed compaction preserves acknowledged rows for an idempotent retry', async () => {
 tracker.start(player); tracker.record(player, 'kill', {target:'13', quantity:1});
 const rename = jest.spyOn(fs.promises, 'rename').mockRejectedValueOnce(new Error('rename failed'));
 try {
  await expect(tracker.flush()).rejects.toThrow('rename failed');
  const id = tracker.pending[0].id;
  expect(JSON.parse(fs.readFileSync(tracker.spool, 'utf8').trim()).id).toBe(id);
  await tracker.flush();
  expect(client.storeActivity.mock.calls[1][0][0].id).toBe(id);
  expect(tracker.pending).toEqual([]);
 } finally {rename.mockRestore();}
});

test('graceful close persists queued kills and the final playtime sample exactly once', async () => {
 tracker.start(player); tracker.meaningful(player);
 tracker.record(player, 'kill', {target:'13', quantity:1}); now += 10000;
 const closing = tracker.close(); expect(tracker.close()).toBe(closing); await closing;
 const rows = fs.readFileSync(tracker.spool, 'utf8').trim().split('\n').map(JSON.parse);
 expect(rows.map(row => row.type)).toEqual(['kill', 'playtime']);
 expect(rows[1].data).toMatchObject({connectedSeconds:10, activeSeconds:10});
});

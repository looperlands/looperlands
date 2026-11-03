global.Types = {};
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const {LocalPlatformClient:LocalPlatform}=require('./localplatformclient');
const Types=require('../../shared/js/gametypes');
let dir,client;
beforeEach(()=>{dir=fs.mkdtempSync(path.join(os.tmpdir(),'points-local-'));client=new LocalPlatform({dataDir:dir});});
afterEach(()=>fs.rmSync(dir,{recursive:true,force:true}));
const wallet='0xabc';
function fund(){client.change(state=>{client.wallet(state,wallet).dailyPlay={'2026-01-01':499};});}
const body=(productId,extra={})=>({requestId:crypto.randomUUID(),productId,...extra});
test('offline purchases persist across restarts and duplicate requests never spend twice',async()=>{
    fund();const request=body('emote-confetti');expect((await client.purchasePointsItem(wallet,request)).paid).toBe(250);
    client=new LocalPlatform({dataDir:dir});expect((await client.purchasePointsItem(wallet,request)).paid).toBe(250);
    const store=await client.getPointsStore(wallet);expect(store.balance).toEqual({earned:500,spent:250,available:250});expect(store.unlocks).toContain('emote:confetti');
    await expect(client.purchasePointsItem(wallet,{...request,productId:'emote-salute'})).rejects.toThrow('different purchase');
    await expect(client.purchasePointsItem(wallet,body('emote-confetti'))).rejects.toThrow('already own');
    await expect(client.purchasePointsItem(wallet,body('emote-lantern'))).rejects.toThrow('not sold');
});
test('owned title selection survives restarts without changing display name',async()=>{
    fund();await client.setPlayerTitle(wallet,'Ada');await client.purchasePointsItem(wallet,body('title-trailblazer'));await client.selectRewardTitle(wallet,'title:trailblazer');
    client=new LocalPlatform({dataDir:dir});expect((await client.getRewardUnlocks(wallet)).selectedTitle).toBe('title:trailblazer');expect(client.state.wallets[wallet].title).toBe('Ada');
    await expect(client.selectRewardTitle(wallet,'title:reel-deal')).rejects.toThrow('Unlock');expect((await client.selectRewardTitle(wallet,null)).selectedTitle).toBeNull();
});
test('activity retries and multiple avatars count only one daily payout and one weekly bonus',async()=>{
    jest.useFakeTimers().setSystemTime(new Date('2026-11-08T22:00:00Z'));
    try {
        let rows=[];for(const day of ['03','04','06','08'])for(let i=0;i<15;i++)rows.push({id:crypto.randomUUID(),actorWallet:wallet,nftId:i%2?'one':'two',occurredAt:'2026-11-'+day+'T12:00:00Z',type:'fishing',data:{quantity:2}});
        await client.storeActivity(rows);await client.storeActivity(rows);
        const store=await client.getPointsStore(wallet);expect(store.balance.earned).toBe(13);expect(store.objectives.weeklyDays).toBe(4);expect(store.objectives.daily[1].progress).toBe(15);expect(store.objectives.dailyCompleted).toBe(true);
    } finally {jest.useRealTimers();}
});
test('rerolls affect only traits and chosen classes retain levels and XP',async()=>{
    fund();client.change(state=>{client.wallet(state,wallet).dailyPlay={'2026-01-01':1999};});let weapon,avatar;Types.forEachKind((kind,name)=>{if(name.startsWith('NFT_')&&Types.isWeapon(kind)&&!weapon)weapon=name.replace('NFT_','0x');if(name.startsWith('NFT_')&&Types.isArmor(kind)&&!avatar)avatar=name.replace('NFT_','0x');});
    client.prepareSession({walletId:wallet,nftId:weapon,xp:5000,trait:'speed'});client.prepareSession({walletId:wallet,nftId:avatar,xp:6000,trait:'tank'});
    const rolled=await client.purchasePointsItem(wallet,body('weapon-reroll',{nftId:weapon}));expect(['crit','aoe']).toContain(rolled.trait);expect(client.state.assets[weapon].xp).toBe(5000);
    await client.purchasePointsItem(wallet,body('class-change',{nftId:avatar,choice:'rogue'}));expect(client.state.assets[avatar]).toMatchObject({xp:6000,trait:'rogue'});
    await expect(client.purchasePointsItem(wallet,body('class-change',{nftId:avatar,choice:'rogue'}))).rejects.toThrow('different valid');
});
test('invalid targets and insufficient balances leave the save unchanged',async()=>{
    const before=JSON.stringify(client.state);await expect(client.purchasePointsItem(wallet,body('weapon-reroll',{nftId:'borrowed'}))).rejects.toThrow('enough points');expect(JSON.stringify(client.state)).toBe(before);
    fund();await expect(client.purchasePointsItem(wallet,body('weapon-reroll',{nftId:'borrowed'}))).rejects.toThrow('eligible');expect((await client.getPointsStore(wallet)).balance.available).toBe(500);
});

test('older local saves rebuild already accepted objective activity once on restart',async()=>{
    const activity={id:crypto.randomUUID(),actorWallet:wallet,type:'kill',occurredAt:new Date().toISOString(),data:{quantity:1,enemyLevel:1}};
    client.change(state=>{state.activities[activity.id]=activity;});
    client=new LocalPlatform({dataDir:dir});expect((await client.getPointsStore(wallet)).objectives.daily[0].progress).toBe(1);
    client=new LocalPlatform({dataDir:dir});await client.storeActivity([activity]);expect((await client.getPointsStore(wallet)).objectives.daily[0].progress).toBe(1);
});

test('daily difficulty uses avatar level and stays fixed across avatars and level-ups',async()=>{
    const date=new Date().toISOString();
    expect((await client.getPointsStore(wallet,30)).objectives.daily.map(row=>row.target)).toEqual([100,15,20]);
    await client.storeActivity([{id:crypto.randomUUID(),actorWallet:wallet,type:'kill',occurredAt:date,data:{avatarLevel:30,enemyLevel:30}}]);
    await client.storeActivity([{id:crypto.randomUUID(),actorWallet:wallet,type:'kill',occurredAt:date,data:{avatarLevel:1,enemyLevel:1}}]);
    let overview=await client.getPointsStore(wallet,60);expect(overview.objectives.level).toBe(30);expect(overview.objectives.daily.map(row=>row.target)).toEqual([100,15,20]);expect(overview.objectives.daily[0].progress).toBe(1);
    expect(overview.objectives.dailyCompleted).toBe(false);
});

test('combat objectives count only enemies inside the fixed daily band',async()=>{
    const row=(enemyLevel)=>({id:crypto.randomUUID(),actorWallet:wallet,type:'kill',occurredAt:new Date().toISOString(),data:{avatarLevel:12,enemyLevel}});
    await client.storeActivity([row(9),row(undefined)]);let data=await client.getPointsStore(wallet,12);expect(data.objectives.daily[0].progress).toBe(0);expect(data.objectives.locked).toBe(false);
    await client.storeActivity([row(10),row(30),row(1)]);data=await client.getPointsStore(wallet,50);expect(data.objectives.daily[0]).toMatchObject({progress:1,minEnemyLevel:10,maxEnemyLevel:14,target:75});expect(data.objectives.daily[0].label).toContain('levels 10–14');
});

test('combat level bands cap at 100 for high-level avatars',async()=>{
    let data=await client.getPointsStore(wallet,150);expect(data.objectives.daily[0]).toMatchObject({minEnemyLevel:98,maxEnemyLevel:100});
    const row=enemyLevel=>({id:crypto.randomUUID(),actorWallet:wallet,type:'kill',occurredAt:new Date().toISOString(),data:{avatarLevel:150,enemyLevel}});
    await client.storeActivity([row(97),row(98),row(100),row(101)]);data=await client.getPointsStore(wallet,1);expect(data.objectives.daily[0].progress).toBe(2);expect(data.objectives.daily[0].label).toContain('98–100');
});

test('each of three daily challenges pays once and only one weekly day is counted',async()=>{
    const rows=[];for(const [type,count,data] of [['kill',50,{enemyLevel:1}],['fishing',15,{}],['tile',20,{stage:'harvest'}]])for(let i=0;i<count;i++)rows.push({id:crypto.randomUUID(),actorWallet:wallet,type,occurredAt:new Date().toISOString(),data});
    await client.storeActivity(rows);await client.storeActivity(rows);await client.storeActivity(rows.map(row=>({...row,id:crypto.randomUUID()})));
    const overview=await client.getPointsStore(wallet);expect(overview.objectives.weeklyDays).toBe(1);expect(overview.balance.earned).toBe(4);
});
test('trail ownership is required and selection survives restart without changing title',async()=>{
    fund();await expect(client.selectRewardTrail(wallet,'trail:golden-sparks')).rejects.toThrow('Unlock');
    await client.purchasePointsItem(wallet,body('trail-golden-sparks'));await client.selectRewardTrail(wallet,'trail:golden-sparks');
    client=new LocalPlatform({dataDir:dir});expect((await client.getRewardUnlocks(wallet)).selectedTrail).toBe('trail:golden-sparks');
    await expect(client.selectRewardTrail(wallet,'title:trailblazer')).rejects.toThrow('Unlock');
    expect((await client.selectRewardTrail(wallet,null)).selectedTrail).toBeNull();
});

test('fishing and harvest rewards require fixed action counts at every avatar level',async()=>{
    for(const level of [1,10,25,50,100,150])expect((await client.getPointsStore(wallet,level)).objectives.daily.slice(1).map(row=>row.target)).toEqual([15,20]);
    const rows=(type,count,data={})=>Array.from({length:count},()=>({id:crypto.randomUUID(),actorWallet:wallet,type,occurredAt:new Date().toISOString(),data:{avatarLevel:150,...data}}));
    await client.storeActivity([...rows('fishing',14),...rows('tile',19,{stage:'harvest'})]);
    expect((await client.getPointsStore(wallet)).objectives.dailyCompleted).toBe(false);
    await client.storeActivity([...rows('fishing',1),...rows('tile',1,{stage:'harvest'})]);
    const data=await client.getPointsStore(wallet);expect(data.objectives.daily.slice(1).map(row=>row.progress)).toEqual([15,20]);expect(data.balance.earned).toBe(3);
});

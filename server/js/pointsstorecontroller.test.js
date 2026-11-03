jest.mock('./discord',()=>({sendMessage:jest.fn()}));
jest.mock('./message',()=>({HitPoints:class {constructor(value){this.value=value;}serialize(){return [23,this.value];}},Health:class {constructor(value){this.value=value;}serialize(){return [10,this.value];}}}));
global.Types = {};
const Controller = require('./pointsstorecontroller');
const crypto = require('crypto');
const {merchant} = require('../world-definitions/points-exchange');
function setup() {
    const session={walletId:'0xabc',nftId:'avatar',mapId:'main',entityId:1,title:'Ada'};
    const cache={get:jest.fn(id=>id==='s'?session:undefined),set:jest.fn(),keys:()=>['s']};
    const player={id:1,walletId:session.walletId,nftId:'avatar',sessionId:'s',mapId:'main',hasEnteredGame:true,isDead:false,x:57,y:218,isBot:()=>false,
        send:jest.fn(),maxHitPoints:100,hitPoints:50,playerClassModifiers:{maxHp:1,reloadClass:jest.fn()},getNFTWeapon:()=>({nftId:'sword',trait:'speed'})};
    const world={npcs:{2:{x:merchant.x,y:merchant.y,behaviorState:{key:merchant.key}}},getPlayerById:()=>player,pushBroadcast:jest.fn()};
    const profile={unlocks:['title:trailblazer','emote:confetti'],selectedTitle:null,rewards:[{id:'title:trailblazer',type:'title',label:'Trailblazer'}]};
    const platform={getPointsStore:jest.fn(async()=>({...profile,balance:{available:100}})),getRewardUnlocks:jest.fn(async()=>profile),purchasePointsItem:jest.fn(async(wallet,body)=>({requestId:body.requestId,productId:body.productId,paid:100})),selectRewardTitle:jest.fn(async()=>profile),getNFT:jest.fn(async()=>({trait:'crit'}))};
    const controller=new Controller(cache,()=>({main:world}),platform,{broadcastPresence:jest.fn()});
    const req={params:{sessionId:'s'},body:{requestId:crypto.randomUUID(),productId:'weapon-reroll',nftId:'sword',confirmed:true}};
    const res={status:jest.fn().mockReturnThis(),json:jest.fn().mockReturnThis()};
    return {session,cache,player,world,platform,controller,req,res,profile};
}
test('wallet comes only from the active session and shop requires merchant proximity',async()=>{
    const f=setup();f.req.body.wallet='0xother';await f.controller.buy(f.req,f.res);
    expect(f.platform.purchasePointsItem).toHaveBeenCalledWith('0xabc',expect.objectContaining({nftId:'sword'}));
    f.player.x=2;await f.controller.buy(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(403);
    f.player.x=57;f.player.isDead=true;await f.controller.buy(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(401);
});
test.each([{confirmed:false},{requestId:'bad'},{nftId:{}},{productId:42}])('rejects invalid confirmation %p',async body=>{
    const f=setup();Object.assign(f.req.body,body);await f.controller.buy(f.req,f.res);expect(f.res.status).toHaveBeenCalledWith(400);expect(f.platform.purchasePointsItem).not.toHaveBeenCalled();
});
test('combat and fishing block build changes',async()=>{
    const f=setup();f.player.pendingFish={};await f.controller.buy(f.req,f.res);expect(f.res.status).toHaveBeenCalledWith(409);expect(f.platform.purchasePointsItem).not.toHaveBeenCalled();
});
test('uncertain result retains a retryable purchase while a rejection is definitive',async()=>{
    const f=setup();f.platform.purchasePointsItem.mockRejectedValueOnce(new Error('lost response'));await f.controller.buy(f.req,f.res);expect(f.res.json).toHaveBeenLastCalledWith(expect.objectContaining({uncertain:true}));
    f.platform.purchasePointsItem.mockRejectedValueOnce({response:{status:400,data:{error:'Not enough points'}}});await f.controller.buy(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(400);expect(f.res.json).toHaveBeenLastCalledWith({error:'Not enough points',uncertain:false});
});
test('simultaneous requests wait, confirmed purchases stay confirmed when refresh fails',async()=>{
    const f=setup();let finish;f.platform.purchasePointsItem.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const pending=f.controller.buy(f.req,f.res);
    await f.controller.buy(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(409);
    f.platform.getRewardUnlocks.mockRejectedValue(new Error('offline'));finish({paid:100});await pending;expect(f.res.json).toHaveBeenLastCalledWith({paid:100,refreshRequired:true});
});
test('only unlocked paid/event emotes can be sent; free emotes work offline',async()=>{
    const f=setup();expect(await f.controller.canEmote(f.player,'confetti')).toBe(true);expect(await f.controller.canEmote(f.player,'lantern')).toBe(false);expect(await f.controller.canEmote(f.player,'sing')).toBe(true);expect(await f.controller.canEmote(f.player,'madeup')).toBe(false);
    f.controller.rewardCache.clear();f.platform.getRewardUnlocks.mockRejectedValue(new Error('offline'));expect(await f.controller.canEmote(f.player,'confetti')).toBe(false);expect(await f.controller.canEmote(f.player,'sing')).toBe(true);
});
test('title is independent of the display name and refreshed for active sessions',async()=>{
    const f=setup();f.profile.selectedTitle='title:trailblazer';await f.controller.refreshPlayer(f.player);expect(f.session.title).toBe('Ada');expect(f.player.name).toBe('Ada · Trailblazer');expect(f.world.pushBroadcast).toHaveBeenCalledTimes(1);
    await f.controller.refreshPlayer(f.player);expect(f.world.pushBroadcast).toHaveBeenCalledTimes(1);
    f.profile.selectedTitle=null;f.controller.applyProfile('0xABC:ethereum',f.profile);expect(f.player.name).toBe('Ada');
});
test('overview exposes a stable wallet retry key and distinguishes remote browsing from purchasing',async()=>{
    const f=setup();f.player.x=1;await f.controller.list(f.req,f.res);expect(f.res.json).toHaveBeenCalledWith(expect.objectContaining({wallet:'0xabc',canPurchase:false}));
    f.platform.getPointsStore.mockRejectedValue(new Error('offline'));await f.controller.list(f.req,f.res);expect(f.res.status).toHaveBeenCalledWith(503);
});
test('equipped weapon traits refresh without overwriting unsaved XP',async()=>{
    const f=setup(),weapon={nftId:'sword',trait:'speed',experience:20000,accumulatedExperience:50};f.player.getNFTWeapon=()=>weapon;
    await f.controller.refreshAsset('0xabc','sword');expect(weapon).toEqual({nftId:'sword',trait:'crit',experience:20000,accumulatedExperience:50});
});
test('class readback updates modifier data and clamps health without healing',async()=>{
    const f=setup();f.platform.getNFT.mockResolvedValue({trait:'rogue'});f.player.playerClassModifiers.reloadClass.mockImplementation(async()=>{f.player.playerClassModifiers.maxHp=.4;});
    await f.controller.refreshAsset('0xabc','avatar');expect(f.session.trait).toBe('rogue');expect(f.player.maxHitPoints).toBe(40);expect(f.player.hitPoints).toBe(40);
});
test('reward title selection validates ownership in the platform and exposes failures',async()=>{
    const f=setup();f.req.body={title:'title:trailblazer'};await f.controller.title(f.req,f.res);expect(f.platform.selectRewardTitle).toHaveBeenCalledWith('0xabc','title:trailblazer');
    f.req.body={};await f.controller.title(f.req,f.res);expect(f.res.status).toHaveBeenCalledWith(400);
    f.req.body={title:'title:other'};f.platform.selectRewardTitle.mockRejectedValue({response:{status:400,data:{error:'Unlock this title'}}});await f.controller.title(f.req,f.res);expect(f.res.json).toHaveBeenLastCalledWith({error:'Unlock this title'});
    await f.controller.rewards(f.req,f.res);expect(f.res.json).toHaveBeenLastCalledWith(f.profile);
});

test('only owned trail selections broadcast and clearing removes the live trail',()=>{
    const f=setup();f.profile.rewards.push({id:'trail:golden-sparks',type:'trail'});f.profile.selectedTrail='trail:golden-sparks';
    f.controller.applyProfile('0xabc',f.profile);expect(f.player.selectedTrail).toBeUndefined();
    f.profile.unlocks.push('trail:golden-sparks');f.controller.applyProfile('0xabc',f.profile);expect(f.player.selectedTrail).toBe('trail:golden-sparks');
    expect(f.world.pushBroadcast.mock.calls.at(-1)[0].serialize()).toEqual([Types.Messages.PLAYER_TRAIL,f.player.id,'trail:golden-sparks']);
    f.profile.selectedTrail=null;f.controller.applyProfile('0xabc',f.profile);expect(f.player.selectedTrail).toBeNull();
});

test('hit style selection uses the authenticated wallet and only owned hit rewards reach combat',async()=>{
    const f=setup();f.platform.selectRewardHit=jest.fn(async()=>f.profile);
    f.profile.selectedHit='hit:frost';f.profile.rewards.push({id:'hit:frost',type:'hit'});
    f.controller.applyProfile('0xabc',f.profile);expect(f.player.selectedHit).toBeNull();
    f.profile.unlocks.push('hit:frost');f.req.body={hit:'hit:frost',wallet:'0xother'};
    await f.controller.hit(f.req,f.res);expect(f.platform.selectRewardHit).toHaveBeenCalledWith('0xabc','hit:frost');expect(f.player.selectedHit).toBe('hit:frost');
    f.profile.selectedHit=null;f.req.body={hit:null};await f.controller.hit(f.req,f.res);expect(f.player.selectedHit).toBeNull();
    f.req.body={hit:42};await f.controller.hit(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(400);
    f.player.isDead=true;await f.controller.hit(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(401);
});
test('a rejected or uncertain hit selection never invents a successful selection',async()=>{
    const f=setup();f.req.body={hit:'hit:frost'};f.platform.selectRewardHit=jest.fn().mockRejectedValue({response:{status:400,data:{error:'Unlock this hit'}}});
    await f.controller.hit(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(400);expect(f.res.json).toHaveBeenLastCalledWith({error:'Unlock this hit'});
    f.platform.selectRewardHit.mockRejectedValue(new Error('offline'));await f.controller.hit(f.req,f.res);expect(f.res.status).toHaveBeenLastCalledWith(503);expect(f.player.selectedHit).toBeUndefined();
});

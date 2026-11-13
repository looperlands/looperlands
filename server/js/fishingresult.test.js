global.Types = {};
jest.mock('./lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('./lib/class'), 'utf8'), {exports});
    return exports;
});
const {completeFishingCatch} = require('./fishingresult');
let player, dependencies;
beforeEach(() => {
    player = {
        name: 'Angler', mapId: 'cobsfarm', pendingFish: {name:'cobguppy', exp:10, double:false, lakeLvl:1, lakeName:'cobFarmLake'},
        playerEventBroker: {lootEvent:jest.fn().mockResolvedValue(undefined)},
        server: {server:{activity:{record:jest.fn()}},pushToPlayer:jest.fn()},
        incrementNFTSpecialItemExperience:jest.fn(), handleExperience:jest.fn()
    };
    dependencies = {lakes:{cobFarmLake:{fish:{cobguppy:'common'}}},messages:require('./message'),discord:{sendMessage:jest.fn()},names:{getName:name=>'Guppy'}};
});
test('awarded catches use the server-selected fish, lake and quantity',async()=>{
    const data=await completeFishingCatch(player,true,false,dependencies);
    expect(data).toEqual({target:'cobguppy',quantity:1,lake:'cobFarmLake',rarity:'common'});
    expect(player.playerEventBroker.lootEvent).toHaveBeenCalledWith({kind:'cobguppy'},1,{source:'catch'});
    expect(player.server.server.activity.record).toHaveBeenCalledWith(player,'fishing',data);
    expect(player.handleExperience).toHaveBeenCalledWith(10);
    expect(player.pendingFish).toBeNull();
    expect(player.server.pushToPlayer.mock.calls[0][1].serialize()).toEqual([
        require('../../shared/js/gametypes').Messages.FISHING_CATCH,
        {fish:'cobguppy',name:'Guppy',rarity:'common',quantity:1,experience:10,perfect:false,mapId:'cobsfarm',requiredLevel:1}
    ]);
});
test('failed catches consume the attempt without loot, XP or competition activity',async()=>{
    expect(await completeFishingCatch(player,false,false,dependencies)).toBeNull();
    expect(await completeFishingCatch(player,true,false,dependencies)).toBeNull();
    expect(player.playerEventBroker.lootEvent).not.toHaveBeenCalled();
    expect(player.server.server.activity.record).not.toHaveBeenCalled();
    expect(player.handleExperience).not.toHaveBeenCalled();
    expect(player.server.pushToPlayer).not.toHaveBeenCalled();
});
test('double catches record two fish while retaining bullseye experience',async()=>{
    player.pendingFish.double=true;
    expect((await completeFishingCatch(player,true,true,dependencies)).quantity).toBe(2);
    expect(player.handleExperience).toHaveBeenCalledWith(30);
    expect(player.playerEventBroker.lootEvent).toHaveBeenCalledWith({kind:'cobguppy'},2,{source:'catch'});
    expect(player.server.pushToPlayer.mock.calls[0][1].receipt).toMatchObject({quantity:2,experience:30,perfect:true});
});
test('duplicate results while the award is pending cannot grant another catch',async()=>{
    let finish;
    player.playerEventBroker.lootEvent.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    const pending=completeFishingCatch(player,true,false,dependencies);
    expect(await completeFishingCatch(player,true,false,dependencies)).toBeNull();
    expect(player.server.pushToPlayer).not.toHaveBeenCalled();
    finish();await pending;
    expect(player.playerEventBroker.lootEvent).toHaveBeenCalledTimes(1);
    expect(player.server.server.activity.record).toHaveBeenCalledTimes(1);
    expect(player.server.pushToPlayer).toHaveBeenCalledTimes(1);
});
test('failed inventory awards do not score or grant experience',async()=>{
    player.playerEventBroker.lootEvent.mockRejectedValue(new Error('award failed'));
    await expect(completeFishingCatch(player,true,false,dependencies)).rejects.toThrow('award failed');
    expect(player.server.server.activity.record).not.toHaveBeenCalled();
    expect(player.handleExperience).not.toHaveBeenCalled();
    expect(player.server.pushToPlayer).not.toHaveBeenCalled();
});
test('fish outside the selected lake definition cannot earn a catch score',async()=>{
    player.pendingFish.name='unknown_fish';
    expect(await completeFishingCatch(player,true,false,dependencies)).toBeNull();
    expect(player.server.server.activity.record).not.toHaveBeenCalled();
});

test.each(['expired','changed-map','dead'])('a %s attempt cannot award a catch',async state=>{
    Object.assign(player.pendingFish,{expiresAt:Date.now()+60000,mapId:'world_one'});player.server.id='world_one';
    if(state==='expired')player.pendingFish.expiresAt=Date.now()-1;
    if(state==='changed-map')player.server.id='world_two';
    if(state==='dead')player.isDead=true;
    expect(await completeFishingCatch(player,true,false,dependencies)).toBeNull();
    expect(player.playerEventBroker.lootEvent).not.toHaveBeenCalled();
});

test('a delayed catch award credits and flushes the casting rod after the weapon was restored', async () => {
    let finish;
    const rod = {syncExperience: jest.fn().mockResolvedValue()};
    const sword = {};
    player.nftWeapon = rod; player.getNFTWeapon = () => player.nftWeapon;
    player.playerEventBroker.lootEvent.mockImplementation(() => new Promise(resolve => {finish = resolve;}));
    const pending = completeFishingCatch(player, true, false, dependencies);
    player.nftWeapon = sword;
    player.mapId = 'm88n2';
    finish(); await pending;
    expect(player.incrementNFTSpecialItemExperience).toHaveBeenCalledWith(10, rod);
    expect(rod.syncExperience).toHaveBeenCalledTimes(1);
    expect(player.server.pushToPlayer.mock.calls[0][1].receipt.mapId).toBe('cobsfarm');
});

test('the reveal uses the caught water rarity even when that fish is common elsewhere', async () => {
    dependencies.lakes.cobFarmLake.fish.cobguppy = 'epic';
    dependencies.lakes.otherWater = {fish:{cobguppy:'common'}};
    await completeFishingCatch(player, true, false, dependencies);
    expect(player.server.pushToPlayer.mock.calls[0][1].receipt.rarity).toBe('epic');
});

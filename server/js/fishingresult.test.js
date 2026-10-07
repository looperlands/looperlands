const {completeFishingCatch} = require('./fishingresult');
let player, dependencies;
beforeEach(() => {
    player = {
        name: 'Angler', pendingFish: {name:'cobguppy', exp:10, double:false, lakeLvl:1, lakeName:'cobFarmLake'},
        playerEventBroker: {lootEvent:jest.fn().mockResolvedValue(undefined)},
        server: {server:{activity:{record:jest.fn()}},pushToPlayer:jest.fn()},
        incrementNFTSpecialItemExperience:jest.fn(), handleExperience:jest.fn()
    };
    dependencies = {lakes:{cobFarmLake:{fish:{cobguppy:'common'}}},messages:{Kill:jest.fn()},discord:{sendMessage:jest.fn()},names:{getName:name=>'Guppy'}};
});
test('awarded catches use the server-selected fish, lake and quantity',async()=>{
    const data=await completeFishingCatch(player,true,false,dependencies);
    expect(data).toEqual({target:'cobguppy',quantity:1,lake:'cobFarmLake',rarity:'common'});
    expect(player.playerEventBroker.lootEvent).toHaveBeenCalledWith({kind:'cobguppy'},1);
    expect(player.server.server.activity.record).toHaveBeenCalledWith(player,'fishing',data);
    expect(player.handleExperience).toHaveBeenCalledWith(10);
    expect(player.pendingFish).toBeNull();
});
test('failed catches consume the attempt without loot, XP or competition activity',async()=>{
    expect(await completeFishingCatch(player,false,false,dependencies)).toBeNull();
    expect(await completeFishingCatch(player,true,false,dependencies)).toBeNull();
    expect(player.playerEventBroker.lootEvent).not.toHaveBeenCalled();
    expect(player.server.server.activity.record).not.toHaveBeenCalled();
    expect(player.handleExperience).not.toHaveBeenCalled();
});
test('double catches record two fish while retaining bullseye experience',async()=>{
    player.pendingFish.double=true;
    expect((await completeFishingCatch(player,true,true,dependencies)).quantity).toBe(2);
    expect(player.handleExperience).toHaveBeenCalledWith(30);
    expect(player.playerEventBroker.lootEvent).toHaveBeenCalledWith({kind:'cobguppy'},2);
});
test('duplicate results while the award is pending cannot grant another catch',async()=>{
    let finish;
    player.playerEventBroker.lootEvent.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    const pending=completeFishingCatch(player,true,false,dependencies);
    expect(await completeFishingCatch(player,true,false,dependencies)).toBeNull();
    finish();await pending;
    expect(player.playerEventBroker.lootEvent).toHaveBeenCalledTimes(1);
    expect(player.server.server.activity.record).toHaveBeenCalledTimes(1);
});
test('failed inventory awards do not score or grant experience',async()=>{
    player.playerEventBroker.lootEvent.mockRejectedValue(new Error('award failed'));
    await expect(completeFishingCatch(player,true,false,dependencies)).rejects.toThrow('award failed');
    expect(player.server.server.activity.record).not.toHaveBeenCalled();
    expect(player.handleExperience).not.toHaveBeenCalled();
});
test('fish outside the selected lake definition cannot earn a catch score',async()=>{
    player.pendingFish.name='unknown_fish';
    expect(await completeFishingCatch(player,true,false,dependencies)).toBeNull();
    expect(player.server.server.activity.record).not.toHaveBeenCalled();
});

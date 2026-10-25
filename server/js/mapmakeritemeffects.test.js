const fs=require('fs'),path=require('path'),vm=require('vm');
const effects=require('../../shared/js/itemeffects');
const source=path.resolve(__dirname,'../..');
function runtime(entries){
    const context={module:{exports:{}},console,exports:{},require:()=>entries};
    vm.runInNewContext(fs.readFileSync(path.join(source,'shared/js/gametypes.js'),'utf8'),context);
    const Types=context.module.exports;
    const properties={module:{exports:{}},Types,require:name=>name==='../../shared/js/gametypes'?Types:effects};
    vm.runInNewContext(fs.readFileSync(path.join(source,'server/js/properties.js'),'utf8'),properties);
    const Properties=properties.module.exports,collectables={module:{exports:{}},require:name=>name==='./properties.js'?Properties:name==='../../shared/js/gametypes'?Types:new Proxy({}, {get:()=>()=>false})};
    vm.runInNewContext(fs.readFileSync(path.join(source,'server/js/collectables.js'),'utf8'),collectables);
    return {Types,Properties,Collectables:collectables.module.exports};
}
test('consumption applies authored healing and timed multipliers through the existing server methods',()=>{
    const entry={id:'moon_shard',kind:1800000000,type:'item',gameplay:{collectable:true,consumable:true,consumeEffects:[{type:'heal',amount:50},{type:'modifier',stat:'xp',multiplier:2,duration:30000}]}};
    const {Properties}=runtime([entry]);const player={regenHealthBy:jest.fn(),playerClassModifiers:{applyTemporaryModifierWithTimeout:jest.fn()}};
    Properties.consume(entry.kind,player);
    expect(Properties.isConsumable(entry.kind)).toBe(true);expect(player.regenHealthBy).toHaveBeenCalledWith(50);
    expect(player.playerClassModifiers.applyTemporaryModifierWithTimeout).toHaveBeenCalledWith('xp',2,30000);
    expect(Properties.getEffectDescription(entry.kind)).toBe('Restores 50 HP; XP ×2 for 30s');
});
test('configured effects replace a built-in script and null restores its original behavior',()=>{
    const entry={id:'cpotion_s',kind:0,type:'item',builtin:true,gameplay:{consumeEffects:[{type:'heal',amount:125}],effectDescription:''}};
    const kept=runtime([]),kind=kept.Types.Entities.CPOTION_S;entry.kind=kind;
    const changed=runtime([entry]);const player={regenHealthBy:jest.fn()};
    changed.Properties.consume(kind,player);expect(player.regenHealthBy).toHaveBeenCalledTimes(1);expect(player.regenHealthBy).toHaveBeenLastCalledWith(125);
    const restored=runtime([{...entry,gameplay:{consumeEffects:null}}]);
    restored.Properties.consume(kind,player);expect(player.regenHealthBy).toHaveBeenLastCalledWith(75);
    expect(restored.Properties.getEffectDescription(kind)).toBe('Adds 75 HP');
});
test('client factory applies the authored sparks setting and preserves built-in construction',()=>{
    const entries=[{id:'moon_shard',kind:1800000000,type:'item',name:'Moon shard',client:{showSparks:false}},{id:'cake',kind:6,type:'item',builtin:true,name:'Cake',client:{showSparks:true}}];
    const Base=class {constructor(id,kind,type){Object.assign(this,{id,kind,type});}},noop=new Proxy({}, {get:()=>Base});let factory;
    const Types={Entities:{CAKE:6},mapmakerEntities:entries};
    vm.runInNewContext(fs.readFileSync(path.join(source,'client/js/entityfactory.js'),'utf8'),{Types,console,_:{isFunction:value=>typeof value==='function'},define:(deps,callback)=>{factory=callback(noop,noop,noop,Base,Base,noop,Base,Base,Base);}});
    expect(factory.createEntity(entries[0].kind,'entity').nosparks).toBe(true);
    expect(factory.createEntity(entries[1].kind,'entity').nosparks).toBe(false);
});
test('the inventory API returns consumable resources with tooltips and preserves authoritative quantities',async()=>{
    const entry={id:'moon_shard',kind:1800000000,type:'item',gameplay:{resource:true,collectable:true,consumable:true,consumeEffects:[{type:'heal',amount:50}],inventoryDescription:'Moon shard',cooldown:{group:'moon',duration:5000}}};
    const {Types,Properties,Collectables}=runtime([entry]),sourceText=fs.readFileSync(path.join(source,'server/js/ws.js'),'utf8');
    const start=sourceText.indexOf('        app.get("/session/:sessionId/inventory"'),end=sourceText.indexOf('        app.get("/session/:sessionId/quests"',start);
    const data={mapId:'main',gameData:{items:{[entry.kind]:3,[Types.Entities.GOLD]:10}}};let handler;
    const res={status:jest.fn().mockReturnThis(),json:jest.fn()};
    vm.runInNewContext(sourceText.slice(start,end),{app:{get:(url,callback)=>{handler=callback;}},cache:{get:()=>data},Types,Properties,Collectables,
        dao:{getInventory:async()=>null},_ : require('underscore'),getConsumableEffects:()=>({effects:[]}),self:{worldsMap:{main:{getPlayerById:()=>null,getConsumeGroupCooldown:()=>12345}}}});
    await handler({params:{sessionId:'local'}},res);
    const response=res.json.mock.calls[0][0];
    expect(response.resources).toEqual({[entry.kind]:3,[Types.Entities.GOLD]:10});
    expect(response.items[entry.kind]).toMatchObject({qty:3,consumable:true,description:'Moon shard',effect:'Restores 50 HP',cooldown:12345});
    expect(response.items[Types.Entities.GOLD]).toBeUndefined();expect(data.gameData.items).toEqual({[entry.kind]:3,[Types.Entities.GOLD]:10});
});
test('using a configured resource consumes one unit, applies effects and respects the shared cooldown',()=>{
    const entry={id:'moon_shard',kind:1800000000,type:'item',gameplay:{resource:true,collectable:true,consumable:true,consumeEffects:[{type:'heal',amount:50}],cooldown:{group:'moon',duration:5000}}};
    const {Types,Collectables}=runtime([entry]),data={gameData:{items:{[entry.kind]:2}}},dao={saveConsumable:jest.fn()};
    const messages={Resource:function(kind,qty){Object.assign(this,{kind,qty});}};
    const moduleWithMessages={exports:{}};
    vm.runInNewContext(fs.readFileSync(path.join(source,'server/js/player.js'),'utf8'),{module:moduleWithMessages,process:{env:{}},Character:{extend:methods=>methods},
        require:name=>name==='../../shared/js/gametypes'?Types:name==='./collectables.js'?Collectables:name==='./dao.js'?dao:name==='./message'?messages:name==='./looperlandsplatformclient.js'?{LooperLandsPlatformClient:class {}}:{}});
    const player={...moduleWithMessages.exports,nftId:'avatar',sessionId:'local',regenHealthBy:jest.fn(),getFishBuff:jest.fn(),checkCooldown:jest.fn(()=>false),applyCooldown:jest.fn(),
        server:{pushToPlayer:jest.fn(),server:{cache:{get:()=>data,set:jest.fn()}}}};
    expect(player.consumeItem(String(entry.kind))).toBe(true);expect(data.gameData.items[entry.kind]).toBe(1);
    expect(player.regenHealthBy).toHaveBeenCalledWith(50);expect(player.applyCooldown).toHaveBeenCalledWith('moon',5000);
    expect(player.server.pushToPlayer).toHaveBeenCalledWith(player,expect.objectContaining({kind:entry.kind,qty:1}));
    player.checkCooldown.mockReturnValue(true);
    expect(player.consumeItem(String(entry.kind))).toBe(false);expect(player.regenHealthBy).toHaveBeenCalledTimes(1);expect(dao.saveConsumable).toHaveBeenCalledTimes(1);
});

function playerMethods(Types, Collectables) {
    const module={exports:{}};
    vm.runInNewContext(fs.readFileSync(path.join(source,'server/js/player.js'),'utf8'),{module,Date,setTimeout:(...args)=>setTimeout(...args),clearTimeout:timer=>clearTimeout(timer),process:{env:{}},Character:{extend:methods=>methods},
        require:name=>name==='../../shared/js/gametypes'?Types:name==='./collectables.js'?Collectables:name==='./looperlandsplatformclient.js'?{LooperLandsPlatformClient:class {}}:{}});
    return module.exports;
}
function worldMethods(Types, Properties, random=()=>99) {
    const module={exports:{}};
    vm.runInNewContext(fs.readFileSync(path.join(source,'server/js/worldserver.js'),'utf8'),{module,Date,
        require:name=>name==='./lib/class'?{Class:{extend:methods=>methods}}:name==='../../shared/js/gametypes'?Types:name==='./properties'?Properties:name==='./utils'?{random}:name==='../../shared/js/itemeffects'?effects:{}});
    return module.exports;
}
test('drop percentages use exact fractional boundaries, skip zero weights and leave the remainder as no drop',()=>{
    const drops={wood:0,ore:12.5,cpotion_s:37.5};
    expect(effects.rollDrop(drops,()=>0)).toBe('ore');
    expect(effects.rollDrop(drops,()=>0.12499)).toBe('ore');
    expect(effects.rollDrop(drops,()=>0.125)).toBe('cpotion_s');
    expect(effects.rollDrop(drops,()=>0.5)).toBeNull();
    expect(effects.rollDrop({wood:100},()=>0.99999)).toBe('wood');
});
test('the authored loot table only affects the consuming player and matching mob, then expires',()=>{
    jest.useFakeTimers();jest.setSystemTime(1000);
    try {
        const entry={id:'loot_potion',kind:1800000000,type:'item',gameplay:{consumeEffects:[{type:'drops',mob:'rat',drops:{wood:100},duration:30000}]}};
        const {Types,Properties,Collectables}=runtime([entry]),player=playerMethods(Types,Collectables);
        const methods=worldMethods(Types,Properties),world={...methods,createItem:jest.fn((kind,x,y)=>({kind,x,y})),addItem:jest.fn(item=>item)};
        const rat={kind:Types.Entities.RAT,x:2,y:3},skeleton={...rat,kind:Types.Entities.SKELETON};
        Properties.consume(entry.kind,player);
        expect(world.getDroppedItem(rat,player)).toEqual({kind:Types.Entities.WOOD,x:2,y:3});
        expect(world.getDroppedItem(skeleton,player)).toBeNull();
        expect(world.getDroppedItem(rat,{})).toBeNull();
        expect(Properties.rat.drops).not.toEqual({wood:100});
        jest.advanceTimersByTime(30000);expect(player.dropTableOverride).toBeUndefined();
        expect(world.getDroppedItem(rat,player)).toBeNull();
    } finally {jest.useRealTimers();}
});
test('refreshing and switching loot effects cancels previous expirations',()=>{
    jest.useFakeTimers();jest.setSystemTime(1000);
    try {
        const {Types,Collectables}=runtime([]),player=playerMethods(Types,Collectables);
        player.setDropTableOverride({wood:50},10000,null);jest.advanceTimersByTime(5000);
        player.setDropTableOverride({ore:75},20000,null);jest.advanceTimersByTime(5000);
        expect(player.dropTableOverride.drops).toEqual({ore:75});
        player.setDropOverride(Types.Entities.GOLD,10000);expect(player.dropTableOverride).toBeUndefined();
        player.setDropTableOverride({wood:100},20000,null);expect(player.dropOverride).toBeUndefined();
        jest.advanceTimersByTime(10000);expect(player.dropTableOverride.drops).toEqual({wood:100});
        jest.advanceTimersByTime(10000);expect(player.dropTableOverride).toBeUndefined();
    } finally {jest.useRealTimers();}
});
test('loot effects restore their remaining duration after a client reload and report it to the HUD',()=>{
    jest.useFakeTimers();jest.setSystemTime(1000);
    try {
        const {Types,Collectables}=runtime([]),player={...playerMethods(Types,Collectables),maxHitPoints:100,server:{consumeCooldowns:{}},nftId:'avatar',getBot:()=>null};
        player.restoreClientState({hp:90,dropTableOverride:{mob:Types.Entities.RAT,drops:{wood:75},expiresAt:11000}});
        expect(player.dropTableOverride).toEqual({mob:Types.Entities.RAT,drops:{wood:75},expiresAt:11000});
        const module={exports:{}};
        vm.runInNewContext(fs.readFileSync(path.join(source,'server/js/consumableeffects.js'),'utf8'),{module,Date,require:name=>name==='../../shared/js/gametypes'?Types:{}});
        expect(module.exports.getConsumableEffects(player)).toMatchObject({effects:[{id:'drops',label:'Custom loot: rat',expiresAt:11000}]});
        jest.advanceTimersByTime(10000);expect(module.exports.getConsumableEffects(player).effects).toEqual([]);
    } finally {jest.useRealTimers();}
});
test('configured spawns use the real player/world callbacks and normal entity lifecycles',()=>{
    jest.useFakeTimers();
    try {
        const entry={id:'spawn_potion',kind:1800000000,type:'item',gameplay:{consumeEffects:[
            {type:'spawn',entityType:'mob',entity:'rat',amount:2},
            {type:'spawn',entityType:'item',entity:'wood',amount:3},
            {type:'spawn',entityType:'npc',entity:'guard',amount:1,duration:20000}]}};
        const {Types,Properties,Collectables}=runtime([entry]),player={...playerMethods(Types,Collectables),x:5,y:6,broadcast:jest.fn()};
        let next=0;const world={nextMobId:()=>++next,addMob:jest.fn(),findPositionNextTo:()=>({x:6,y:6}),moveEntity:jest.fn(),
            addNpc:jest.fn(()=>({despawn:()=>['npc-despawn']})),removeEntity:jest.fn(),createItem:jest.fn(kind=>({kind})),addItem:jest.fn(),handleItemDespawn:jest.fn()};
        player.drop=item=>item;
        class Mob {constructor(id,kind,x,y){Object.assign(this,{id,kind,x,y});}}
        const text=fs.readFileSync(path.join(source,'server/js/worldserver.js'),'utf8'),start=text.indexOf('            player.onReleaseMob'),end=text.indexOf('            if (self.added_callback)',start);
        vm.runInNewContext(text.slice(start,end),{player,self:world,Mob,setTimeout:(...args)=>setTimeout(...args)});
        Properties.consume(entry.kind,player);
        expect(world.addMob).toHaveBeenCalledTimes(2);expect(world.addMob.mock.calls[0][0]).toMatchObject({kind:Types.Entities.RAT,x:5,y:6});
        expect(world.addMob.mock.calls[0][0].handleRespawn()).toBeUndefined();
        expect(world.createItem).toHaveBeenCalledTimes(3);expect(world.createItem).toHaveBeenCalledWith(Types.Entities.WOOD,5,6);
        expect(world.handleItemDespawn).toHaveBeenCalledTimes(3);expect(world.addNpc).toHaveBeenCalledWith(Types.Entities.GUARD,5,6,player);
        expect(world.removeEntity).not.toHaveBeenCalled();jest.advanceTimersByTime(20000);expect(world.removeEntity).toHaveBeenCalledTimes(1);
    } finally {jest.useRealTimers();}
});
test('tooltips describe spawn quantities, NPC lifetime, drop chances and duration',()=>{
    expect(effects.describe([{type:'spawn',entityType:'npc',entity:'guard',amount:2,duration:20000},{type:'drops',mob:'rat',drops:{wood:25,ore:50},duration:60000}]))
        .toBe('Spawns 2 × guard for 20s; Loot from your rat kills: wood 25%, ore 50% for 60s');
});

process.env.GAMESERVER_NAME='test';
jest.mock('./message',()=>({TileStage:class{constructor(value){this.value=value;}}}));jest.mock('./dao',()=>({}));jest.mock('./formulas',()=>({level:()=>1}));jest.mock('./quests/quests',()=>({hasCompletedQuest:jest.fn(()=>false)}));
global.Types={};const fs=require('fs'),os=require('os'),path=require('path'),Types=require('../../shared/js/gametypes');
const Local=require('./localplatformclient').LocalPlatformClient,Controller=require('./tileactionscontroller');
let root,platform,cache,world,controller,player,now;
const stage=(id,next='')=>({id,name:id,duration:0,waitSeconds:0,level:1,tool:'',quest:'',costs:[],rewards:[],xp:0,tile:0,successChance:1,next,failureNext:'',message:'',failureMessage:'',trigger:''});
beforeEach(()=>{root=fs.mkdtempSync(path.join(os.tmpdir(),'tile-runtime-'));const write=(p,d)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(d));};write('server/config.json',{maps:['one']});const first={...stage('work','finish'),costs:[{item:String(Types.Entities.GOLD),amount:5}],rewards:[{item:String(Types.Entities.FLASK),amount:1}],xp:2,trigger:'gate',tile:1};write('tools/tiles/one.json',{version:1,actions:{repair:{type:'sequence',name:'Repair',start:'work',stages:[first,{...stage('finish'),waitSeconds:10}]}},placements:[{x:3,y:4,width:1,height:1,action:'repair'}]});platform=new Local({root,dataDir:path.join(root,'data')});platform.change(s=>{platform.asset(s,'avatar').items[String(Types.Entities.GOLD)]=10;});cache=new Map([['session',{nftId:'avatar',mapId:'one',xp:0,gameData:{items:{[Types.Entities.GOLD]:10}}}]]);now=1000;player={id:1,nftId:'avatar',sessionId:'session',hasEnteredGame:true,x:2,y:4,getLevel:()=>1,applyPersistedExperience:jest.fn(),playerEventBroker:{tileAction:jest.fn()}};world={players:{1:player},map:{tileStages:{}},sendNotifications:jest.fn(),checkTriggerActive:()=>false,activateTrigger:jest.fn(),placeStagedTile:(x,y,tile)=>{world.map.tileStages[x+'.'+y]={tile};},clearStagedTile:(x,y)=>{delete world.map.tileStages[x+'.'+y];},pushBroadcast:jest.fn()};controller=new Controller(cache,platform,{root,duckvilleController:{stageDefinitions:{}},dao:{commitTileSequence:t=>platform.commitTileSequence(t)},now:()=>now,random:()=>0});});
afterEach(()=>fs.rmSync(root,{recursive:true,force:true}));
const tile={name:'forged',gridX:3,gridY:4};
function useTemplate(name) {
    const action=require('../../shared/js/interactiontemplates').create(name);
    action.stages[0].duration=0;
    action.stages[0].rewards=[{item:String(Types.Entities.FLASK),amount:2}];
    const file=path.join(root,'tools/tiles/one.json');
    const doc=JSON.parse(fs.readFileSync(file));doc.actions.repair=action;fs.writeFileSync(file,JSON.stringify(doc));
    controller.localSequences.definitions.one.repair=action;
    return action;
}
test('placed definitions select authoritative action and persist stage, costs, rewards and XP atomically',async()=>{const current=await controller.findCurrentStage('avatar','one',tile,world);expect(current).toMatchObject({key:'work',revision:0});const result=await controller.executeStage('avatar','one',tile,null,world,'work',0);expect(result.success).toBe(true);expect(platform.readAsset('avatar').items).toMatchObject({[Types.Entities.GOLD]:5,[Types.Entities.FLASK]:1});expect(platform.readAsset('avatar').xp).toBe(2);expect(world.activateTrigger).toHaveBeenCalledWith('gate');expect(player.playerEventBroker.tileAction).toHaveBeenCalledTimes(1);expect(await controller.findCurrentStage('avatar','one',tile,world)).toMatchObject({waiting:true,revision:1});const restarted=new Local({root,dataDir:path.join(root,'data')});expect(Object.values(restarted.state.tileSequences)[0].stage).toBe('finish');now+=11000;expect(await controller.findCurrentStage('avatar','one',tile,world)).toMatchObject({key:'finish',revision:1});});
test('concurrent attempts commit once and do not duplicate quest progress or rewards',async()=>{const results=await Promise.all([controller.executeStage('avatar','one',tile,null,world,'work',0),controller.executeStage('avatar','one',tile,null,world,'work',0)]);expect(results.filter(r=>r.activity)).toHaveLength(1);expect(platform.readAsset('avatar').items[Types.Entities.FLASK]).toBe(1);expect(player.playerEventBroker.tileAction).toHaveBeenCalledTimes(1);});
test('stale, forged, distant, insufficient-item and quest-gated attempts fail without mutation',async()=>{const before=JSON.stringify(platform.state);expect((await controller.executeStage('avatar','one',{...tile,gridX:4},null,world,'work',0)).success).toBe(false);expect((await controller.executeStage('avatar','one',tile,null,world,'work',9)).success).toBe(false);player.x=8;expect((await controller.executeStage('avatar','one',tile,null,world,'work',0)).success).toBe(false);player.x=2;controller.localSequences.definitions.one.repair.stages[0].quest='missing';expect((await controller.executeStage('avatar','one',tile,null,world,'work',0)).success).toBe(false);expect(JSON.stringify(platform.state)).toBe(before);});
test('a failed stage consumes its costs but gives no rewards, XP, trigger or quest progress',async()=>{controller.localSequences.random=()=>1;const result=await controller.executeStage('avatar','one',tile,null,world,'work',0);expect(result.activity.failed).toBe(true);expect(platform.readAsset('avatar').items[Types.Entities.GOLD]).toBe(5);expect(platform.readAsset('avatar').items[Types.Entities.FLASK]).toBeUndefined();expect(world.activateTrigger).not.toHaveBeenCalled();expect(player.playerEventBroker.tileAction).not.toHaveBeenCalled();});

test('authoritative inventory rejects a cost even when the session cache still reports enough items',async()=>{
    platform.change(s=>{platform.asset(s,'avatar').items[String(Types.Entities.GOLD)]=0;});
    const before=JSON.stringify(platform.state);
    const result=await controller.executeStage('avatar','one',tile,null,world,'work',0);
    expect(result.success).toBe(false);expect(JSON.stringify(platform.state)).toBe(before);
    expect(player.playerEventBroker.tileAction).not.toHaveBeenCalled();
});

test('a replay after a lost reply publishes committed XP, tile and quest activity once', async () => {
    const commit = platform.commitTileSequence.bind(platform);
    controller.localSequences.dao.commitTileSequence = async transaction => {
        await commit(transaction);
        return commit(transaction);
    };
    const result = await controller.executeStage('avatar', 'one', tile, null, world, 'work', 0);
    expect(result.activity.failed).toBe(false);
    expect(player.applyPersistedExperience).toHaveBeenCalledWith(2);
    expect(world.map.tileStages['3.4']).toEqual({tile: 1});
    expect(player.playerEventBroker.tileAction).toHaveBeenCalledTimes(1);
});

test('a resource restores automatically without a player action, advances its revision and cannot replay old rewards',async()=>{
    const action=useTemplate('resource');action.cooldownSeconds=5;
    action.appearances={one:{initialTile:2,stages:{use:3}}};
    expect(await controller.findCurrentStage('avatar','one',tile,world)).toMatchObject({key:'use',revision:0});
    const result=await controller.executeStage('avatar','one',tile,null,world,'use',0);
    expect(result.activity.quantity).toBe(2);
    expect(world.map.tileStages['3.4'].tile).toBe(2);
    expect(await controller.findCurrentStage('avatar','one',tile,world)).toMatchObject({waiting:true,revision:1});
    now+=5001;await controller.localSequences.tick(world);
    expect(world.map.tileStages['3.4'].tile).toBe(1);
    expect(await controller.findCurrentStage('avatar','one',tile,world)).toMatchObject({key:'use',revision:2});
    expect((await controller.executeStage('avatar','one',tile,null,world,'use',0)).success).toBe(false);
    expect(platform.readAsset('avatar').items[Types.Entities.FLASK]).toBe(2);
    await controller.executeStage('avatar','one',tile,null,world,'use',2);
    expect(platform.readAsset('avatar').items[Types.Entities.FLASK]).toBe(4);
});

test('expired cooldowns recover after restarting the provider and runtime',async()=>{
    const action=useTemplate('resource');action.cooldownSeconds=5;
    await controller.executeStage('avatar','one',tile,null,world,'use',0);
    now+=6000;
    const restarted=new Local({root,dataDir:path.join(root,'data')});
    const Runtime=require('./localtilesequences');
    const runtime=new Runtime(cache,restarted,{root,now:()=>now,dao:{commitTileSequence:t=>restarted.commitTileSequence(t)}});
    // The same definition is restored from disk; no receipt or reward is generated by hydration.
    runtime.definitions.one.repair=action;
    await runtime.loadPersistedPlots('one',world);
    expect(await runtime.findCurrentStage('avatar','one',tile,world)).toMatchObject({key:'use',revision:2});
    expect(restarted.readAsset('avatar').items[Types.Entities.FLASK]).toBe(2);
});

test('each player can open a chest once and receives only their own artwork',async()=>{
    const action=useTemplate('chest');action.appearances={one:{initialTile:1,stages:{use:2}}};
    const other={...player,id:2,nftId:'other',sessionId:'other-session'};
    world.players[2]=other;world.pushToPlayer=jest.fn();world.placeStagedTile=jest.fn();world.clearStagedTile=jest.fn();
    cache.set('other-session',{nftId:'other',mapId:'one',gameData:{items:{}}});
    await controller.executeStage('avatar','one',tile,null,world,'use',0);
    expect(await controller.findCurrentStage('avatar','one',tile,world)).toMatchObject({key:'done',waiting:true});
    expect(await controller.findCurrentStage('other','one',tile,world)).toMatchObject({key:'use',revision:0});
    expect(world.placeStagedTile).not.toHaveBeenCalled();expect(world.clearStagedTile).not.toHaveBeenCalled();
    expect(world.pushToPlayer.mock.calls.filter(([p,message])=>p.nftId==='avatar'&&!message.value.particlesOnly).every(([,message])=>message.value.tile===1)).toBe(true);
    expect(world.pushToPlayer.mock.calls.filter(([p,message])=>p.nftId==='other'&&!message.value.particlesOnly).every(([,message])=>message.value.tile===0)).toBe(true);
    await controller.executeStage('other','one',tile,null,world,'use',0);
    expect(platform.readAsset('avatar').items[Types.Entities.FLASK]).toBe(2);
    expect(platform.readAsset('other').items[Types.Entities.FLASK]).toBe(2);
    expect((await controller.executeStage('avatar','one',tile,null,world,'use',0)).success).toBe(false);
});

test.each(['shared', 'player'])('chosen artwork reaches the renderer without a tile shift for %s progress', async scope => {
    const action = useTemplate(scope === 'player' ? 'chest' : 'repair');
    action.appearances = {one: {initialTile: 1, stages: {use: 17}}};
    world.pushToPlayer = jest.fn();
    const published = () => scope === 'player' ? world.pushToPlayer.mock.calls.filter(([,message])=>!message.value.particlesOnly).at(-1)[1].value : world.map.tileStages['3.4'];
    const runtime = controller.localSequences;
    await runtime[scope === 'player' ? 'loadPlayerStates' : 'loadPersistedPlots']('one', world, 'avatar');
    expect(published().tile).toBe(0); // The first tile is artwork, not the clear-overlay sentinel.
    await controller.executeStage('avatar', 'one', tile, null, world, 'use', 0);
    expect(published().tile).toBe(16);
    expect(Object.values(platform.state.tileSequences)[0].tile).toBe(17);

    // Exercise the real client renderer's source coordinates, rather than only the server's message shape.
    let renderer;
    require('vm').runInNewContext(fs.readFileSync(require.resolve('../../client/js/renderer'), 'utf8'), {
        Class: {extend: methods => methods}, _: {forEach: (values, run) => values.forEach(run)},
        define: (dependencies, factory) => {renderer = factory();}
    });
    const game = {tileStages: {sample: {...published(), x: 3, y: 4, stage: 0}},
        map: {width: 10, GridPositionToTileIndex: (x, y) => y * 10 + x + 1, isHighTile: () => false, isAnimatedTile: () => false}};
    const view = {game, tileset: {width: 256, height: 32}, tilesize: 16, drawScaledImage: jest.fn()};
    const rendered = renderer.drawTileStages.call(view, [], false, false)[0];
    renderer.drawTile.call(view, {}, rendered.tileid, view.tileset, 16, 2, 10, rendered.cellid, 1, 0, 0);
    expect(view.drawScaledImage.mock.calls[0].slice(2, 6)).toEqual([0, 16, 16, 16]);

    // Rejoining must not subtract again from persisted Tiled IDs.
    await runtime[scope === 'player' ? 'loadPlayerStates' : 'loadPersistedPlots']('one', world, 'avatar');
    expect(published().tile).toBe(16);
    runtime.publish(world, runtime.resolve('one', tile, 'avatar'), {tile: 0});
    if (scope === 'player') expect(published()).toMatchObject({clear: true});
    else expect(published()).toBeUndefined();
});

test('a switch can turn a trigger on and off repeatedly and restores its last effect after hydration',async()=>{
    const action=useTemplate('switch'),triggers={};
    world.checkTriggerActive=id=>!!triggers[id];
    world.activateTrigger=id=>{triggers[id]=true;};world.deactivateTrigger=id=>{triggers[id]=false;};
    for(const s of action.stages)s.trigger='gate';
    await controller.executeStage('avatar','one',tile,null,world,'use',0);expect(triggers.gate).toBe(true);
    await controller.executeStage('avatar','one',tile,null,world,'turn_off',1);expect(triggers.gate).toBe(false);
    await controller.executeStage('avatar','one',tile,null,world,'use',2);expect(triggers.gate).toBe(true);
    triggers.gate=false;await controller.localSequences.loadPersistedPlots('one',world);expect(triggers.gate).toBe(true);
});

test('editing names or messages preserves completed progress and costs are checked together with the required item',async()=>{
    const action=useTemplate('repair');
    const s=action.stages[0];s.tool=String(Types.Entities.GOLD);s.costs=[{item:s.tool,amount:10}];
    await controller.executeStage('avatar','one',tile,null,world,'use',0);
    expect(platform.readAsset('avatar').items[Types.Entities.GOLD]).toBe(0);
    action.name='Renamed repair';s.name='Fix';s.message='Well done';
    expect(await controller.findCurrentStage('avatar','one',tile,world)).toMatchObject({key:'done',revision:1});
});

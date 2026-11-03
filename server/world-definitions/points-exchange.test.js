global.Types={};
const Types=require('../../shared/js/gametypes');
const {register,merchant}=require('./points-exchange');
const {WorldDefinitions}=require('../js/worlddefinitions');
const map=require('../maps/world_server_main.json');
test('main-map merchant stands on an accessible tile beside the event board',()=>{
    expect(map.collisions).not.toContain(merchant.y*map.width+merchant.x);
    expect(map.eventBoards.some(board=>Math.max(board.x-merchant.x,0,merchant.x-board.x-board.w+1)+Math.max(board.y-merchant.y,0,merchant.y-board.y-board.h+1)<=3)).toBe(true);
    const definitions=new WorldDefinitions();register(definitions);
    const entry=definitions.maps.get('main')[0],npc={};
    const world={entities:{},isValidPosition:()=>true,addNpc:jest.fn(()=>npc)};
    const scene=entry.createScene(world);scene.tick();scene.tick();
    expect(world.addNpc).toHaveBeenCalledTimes(1);expect(world.addNpc).toHaveBeenCalledWith(Types.getKindFromString('shopowner'),merchant.x,merchant.y);
    expect(npc.behaviorState.key).toBe(merchant.key);expect(entry.dialogues[0].nodes.welcome.pointsStore).toBe(true);
});
test('merchant waits for its tile to become free rather than overlapping another entity',()=>{
    const definitions=new WorldDefinitions();register(definitions);const world={entities:{1:{x:merchant.x,y:merchant.y}},isValidPosition:()=>true,addNpc:jest.fn(()=>({}))};
    const scene=definitions.maps.get('main')[0].createScene(world);scene.tick();expect(world.addNpc).not.toHaveBeenCalled();world.entities={};scene.tick();expect(world.addNpc).toHaveBeenCalledTimes(1);
});

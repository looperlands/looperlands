const fs = require('fs'), vm = require('vm'), _ = require('underscore');
global.Types = {};
jest.mock('node-cron', () => ({schedule: jest.fn()}));
jest.mock('./discord', () => ({}));
jest.mock('./lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('./lib/class'), 'utf8'), {exports});
    return exports;
});
const GameTypes = require('../../shared/js/gametypes');
require('./entity');require('./character');require('./item');
const ChestEntity = require('./chest'), RewardArea = require('./chestarea'), RoamingArea = require('./mobarea'), MobEntity = require('./mob');
const Utils = require('./utils');
const moduleStub = {exports:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('./worldserver'),'utf8'),{module:moduleStub,require:name=>name==='./lib/class'?{Class:{extend:methods=>methods}}:name==='underscore'?_: {}});
beforeEach(()=>jest.useFakeTimers());
afterEach(()=>{jest.restoreAllMocks();jest.clearAllTimers();jest.useRealTimers();});
test('weighted chest draws support fractional weights and exact range boundaries',()=>{
    const chest=new ChestEntity(1,2,3), gold=GameTypes.Entities.GOLD, flask=GameTypes.Entities.FLASK;
    chest.setChances({[gold]:.25,[flask]:.75});
    const random=jest.spyOn(Math,'random');random.mockReturnValue(0);expect(chest.getRandomItem()).toBe(flask);
    random.mockReturnValue(.74999);expect(chest.getRandomItem()).toBe(flask);
    random.mockReturnValue(.75);expect(chest.getRandomItem()).toBe(gold);
    random.mockReturnValue(.9999);expect(chest.getRandomItem()).toBe(gold);
});
test('configured placed-chest respawn delay is respected',()=>{
    const chest=new ChestEntity(1,2,3), respawn=jest.fn();chest.isStatic=true;chest.setDelay(75000);chest.onRespawn(respawn);chest.destroy();
    jest.advanceTimersByTime(74999);expect(respawn).not.toHaveBeenCalled();jest.advanceTimersByTime(1);expect(respawn).toHaveBeenCalledTimes(1);
});
test('roaming mobs keep their owner and reward membership across consecutive clear cycles',()=>{
    const world={isValidPosition:()=>true,onMobMoveCallback(){},onMobExitCombatCallback(){},getPlayerCount:()=>0,addMob(mob){moduleStub.exports.tryAddingMobToChestArea.call(this,mob);}};
    const area=new RewardArea(1,2,2,4,3,8,8,[GameTypes.Entities.GOLD],world), reward=jest.fn();area.onEmpty(reward);world.chestAreas=[area];
    const roaming=new RoamingArea(1,2,'rat',2,2,4,3,world);roaming.spawnMobs();area.setNumberOfEntities(2);
    const [one,two]=roaming.entities.slice();expect(one.area).toBe(roaming);expect(area.entities).toHaveLength(2);
    for(let cycle=1;cycle<=2;cycle++) {
        one.x=20;one.y=20;one.isDead=true;one.handleRespawn();expect(reward).toHaveBeenCalledTimes(cycle-1);
        two.isDead=true;two.handleRespawn();expect(reward).toHaveBeenCalledTimes(cycle);
        expect(area.entities).toHaveLength(0);expect(roaming.entities).toHaveLength(0);
        jest.advanceTimersByTime(40001);expect(area.entities).toHaveLength(2);expect(new Set(area.entities).size).toBe(2);
        expect(one.area).toBe(roaming);expect(one.chestAreas.has(area)).toBe(true);
    }
});
test('static mobs can belong to overlapping rewards without stealing respawn ownership',()=>{
    const world={chestAreas:[]}, a=new RewardArea(1,1,1,5,5,8,8,[],world), b=new RewardArea(2,1,1,5,5,9,9,[],world), mob=new MobEntity(1,GameTypes.Entities.RAT,3,3);
    world.chestAreas=[a,b];const callbacks=[jest.fn(),jest.fn()];a.onEmpty(callbacks[0]);b.onEmpty(callbacks[1]);
    moduleStub.exports.tryAddingMobToChestArea.call(world,mob);a.setNumberOfEntities(1);b.setNumberOfEntities(1);
    expect(mob.area).toBeUndefined();mob.isDead=true;mob.handleRespawn();callbacks.forEach(callback=>expect(callback).toHaveBeenCalledTimes(1));
    mob.isDead=false;moduleStub.exports.tryAddingMobToChestArea.call(world,mob);expect(a.entities).toHaveLength(1);expect(b.entities).toHaveLength(1);
});
test('roaming positions never extend beyond the Tiled rectangle',()=>{
    jest.spyOn(Utils,'random').mockImplementation(max=>max-1);
    const area=new RoamingArea(1,1,'rat',2,3,1,1,{isValidPosition:(x,y)=>x===2&&y===3,getPlayerCount:()=>0});
    expect(area._getRandomPositionInsideArea()).toEqual({x:2,y:3});
});
test('a cleared area creates a temporary chest at the configured destination with its loot weights',()=>{
    const chest={}, world={createChest:jest.fn(()=>chest),addItem:jest.fn(value=>value),handleItemDespawn:jest.fn()}, area={chestX:9,chestY:10,items:[1],chances:{1:.5}};
    moduleStub.exports.handleEmptyChestArea.call(world,area);
    expect(world.createChest).toHaveBeenCalledWith(9,10,[1],{1:.5});expect(world.handleItemDespawn).toHaveBeenCalledWith(chest);
});

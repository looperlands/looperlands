const fs = require('fs');
const vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');

function setup(trait) {
    const moduleStub = {exports: {}};
    const methods = {};
    function PlayerClass() {}
    vm.runInNewContext(fs.readFileSync(require.resolve('./player'), 'utf8'), {
        module: moduleStub, process: {env: {}}, FormatChecker: function () {},
        Character: {extend: value => { Object.assign(methods, value); return PlayerClass; }},
        require: name => {
            if (name === '../../shared/js/gametypes') return Types;
            if (name === './message') return {Teleport:function(player){this.id=player.id;}};
            if (name === './properties') return {rat:{friendly:false}};
            if (name === './utils') return {distanceTo:()=>1};
            if (name === './format') return {check: () => true};
            if (name === './formulas') return {dmg: () => 10, getSpeedTraitBonus: () => 100};
            if (name === './quests/playereventbroker.js') return {PlayerEventBroker: function () {}};
            if (name === './looperlandsplatformclient.js') return {LooperLandsPlatformClient: function () {}};
            return {};
        },
    });
    const player = Object.assign(new PlayerClass(), methods);
    const connection = {id: 1, listen: jest.fn(), onClose: jest.fn(), close: jest.fn(), sendUTF8: jest.fn()};
    const mob = {id: 7, armorLevel: 1, receiveDamage: jest.fn()};
    const world = {getEntityById: () => mob, handleMobHate: jest.fn(), handleHurtEntity: jest.fn()};
    player._super = () => {};
    player.init(connection, world);
    Object.assign(player, {id: connection.id, hasEnteredGame: true, resetTimeout: jest.fn(), getNFTWeapon: () => undefined,
        getLevel: () => 1, getWeaponLevel: () => 1, getActiveBuff: () => undefined,
        getNFTWeaponActiveTrait: () => trait, incrementNFTWeaponExperience: jest.fn(),
        playerClassModifiers: {meleeDamageDealt: 2, hate: 1}});
    return {player, mob, world, receive: connection.listen.mock.calls[0][0]};
}

test.each([['crit', 60, true], ['speed', 20, false], [undefined, 20, false]])(
    'the %s trait reports critical status without changing damage or experience', async (trait, amount, critical) => {
        const {player, mob, world, receive} = setup(trait);
        await receive([Types.Messages.HIT, mob.id]);
        expect(mob.receiveDamage).toHaveBeenCalledWith(amount, 1);
        expect(world.handleHurtEntity).toHaveBeenCalledWith(mob, player, amount, critical);
        expect(player.incrementNFTWeaponExperience).toHaveBeenCalledWith(amount);
    }
);


test('AoE damages ordinary targets but cannot farm trainer damage, weapon XP or cleave healing', async () => {
    const {player,mob,world,receive}=setup('aoe');
    Object.assign(mob,{type:'mob',kind:Types.Entities.RAT,x:1,y:1});
    const trainer={...mob,id:8,receiveDamage:jest.fn()};
    const splash={...mob,id:9,receiveDamage:jest.fn()};
    Object.assign(world,{combatPrototype:{mobIds:new Set([8])},
        groups:{test:{entities:{7:mob,8:trainer,9:splash}}},pushToPlayer:jest.fn()});
    Object.assign(player,{group:'test',x:1,y:1,hitPoints:50,maxHitPoints:100,health:()=>({})});
    await receive([Types.Messages.HIT,mob.id]);
    expect(mob.receiveDamage).toHaveBeenCalledWith(20,1);
    expect(splash.receiveDamage).toHaveBeenCalledWith(16,1);
    expect(trainer.receiveDamage).not.toHaveBeenCalled();
    expect(world.handleHurtEntity).toHaveBeenCalledTimes(2);
    expect(player.incrementNFTWeaponExperience.mock.calls.map(([xp])=>xp)).toEqual([20,16]);
    expect(player.hitPoints).toBe(54);
});

// Use the actual teleport handler, including its destination/trigger validation.
test.each([true,false])('door travel ends practice only when the teleport is accepted: %s',allowed=>{
    const {player,world,receive}=setup();
    Object.assign(world,{map:{getRequiredNFT:()=>undefined,getDoorTrigger:()=>1},
        checkTriggerActive:()=>allowed,isValidPosition:()=>true,
        combatPrototype:{disable:jest.fn()},handlePlayerVanish:jest.fn(),pushRelevantEntityListTo:jest.fn()});
    Object.assign(player,{x:10,y:10,hitPoints:42,setPosition(x,y){this.x=x;this.y=y;},clearTarget:jest.fn(),broadcast:jest.fn()});
    receive([Types.Messages.TELEPORT,150,50]);
    expect([player.x,player.y]).toEqual(allowed?[150,50]:[10,10]);
    expect(player.hitPoints).toBe(42);
    if(allowed){
        expect(world.combatPrototype.disable).toHaveBeenCalledWith(player,false);
        expect(world.pushRelevantEntityListTo).toHaveBeenCalledWith(player);
    }else expect(world.combatPrototype.disable).not.toHaveBeenCalled();
});

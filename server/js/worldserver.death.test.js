const fs = require('fs');
const vm = require('vm');
const _ = require('underscore');

const moduleStub = {exports: {}};
vm.runInNewContext(fs.readFileSync(require.resolve('./worldserver'), 'utf8'), {
    module: moduleStub,
    require: name => {
        if (name === './lib/class') return {Class: {extend: methods => methods}};
        if (name === 'underscore') return _;
        if (name === './properties') return {rat: {}};
        if (name === './message') return {Damage: function (entity, points, critical) {Object.assign(this, {entity, points, critical});}};
        if (name === '../../shared/js/gametypes') return {getKindAsString: () => 'rat', Entities: {}};
        return {};
    },
});

test.each([false, true])('critical=%s survives the world notification boundary', critical => {
    const world = Object.create(moduleStub.exports);
    world.pushToPlayer = jest.fn();
    const mob = {id: 7, type: 'mob', hitPoints: 100};
    const attacker = {id: 1, type: 'player'};
    world.handleHurtEntity(mob, attacker, 20, critical);
    expect(world.pushToPlayer).toHaveBeenCalledWith(attacker, expect.objectContaining({entity: mob, points: 20, critical}));
});

test('an enemy death reaches its own and adjacent groups once, before loot', () => {
    const delivered = {own: [], adjacent: []};
    const world = Object.create(moduleStub.exports);
    world.map = {forEachAdjacentGroup: (_, callback) => ['own', 'adjacent'].forEach(callback)};
    world.pushToGroup = (group, message) => delivered[group].push(message);
    world.getDroppedItem = () => ({id: 'loot'});
    for (const name of ['handleRedPacket', 'handleItemDespawn', 'distributeExp', 'handleExpMultiplierOnDeath', 'removeEntity']) world[name] = jest.fn();
    const mob = {type: 'mob', kind: 1, hitPoints: 0, group: 'own', despawn: () => 'death', drop: () => 'loot'};
    world.handleHurtEntity(mob, {type: 'mob'}, 1);
    expect(delivered.own).toEqual(['death', 'loot']);
    expect(delivered.adjacent).toEqual(['death', 'loot']);
    expect(world.removeEntity).toHaveBeenCalledWith(mob);
});

test('a fixed loot override creates one item and skips the normal loot roll',()=>{
    const world=Object.create(moduleStub.exports);
    for(const name of ['pushToPlayer','pushToAdjacentGroups','handleRedPacket','handleItemDespawn','distributeExp','handleExpMultiplierOnDeath','removeEntity'])world[name]=jest.fn();
    world.getDroppedItem=jest.fn();world.createItem=jest.fn(kind=>({kind}));world.addItem=jest.fn(item=>item);
    const mob={type:'mob',kind:1,hitPoints:0,group:'own',x:3,y:4,dmgTakenArray:[],despawn:()=>['death'],drop:item=>item};
    world.handleHurtEntity(mob,{type:'player',dropOverride:99},1);
    expect(world.getDroppedItem).not.toHaveBeenCalled();expect(world.createItem).toHaveBeenCalledTimes(1);
    expect(world.createItem).toHaveBeenCalledWith(99,3,4);expect(world.handleItemDespawn).toHaveBeenCalledTimes(1);
});

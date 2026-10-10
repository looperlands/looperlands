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
        if (name === '../../shared/js/gametypes') return {getKindAsString: () => 'rat', Entities: {}};
        return {};
    },
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

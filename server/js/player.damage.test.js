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

const fs = require('fs');
const vm = require('vm');

function loadMethods(filename, dependencies) {
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(require.resolve(filename), 'utf8'), {
        module, process: {env: {}}, Character: {extend: methods => methods},
        setTimeout: jest.fn(),
        require: name => name === './lib/class' ? {Class: {extend: methods => methods}} : dependencies[name] || {}
    });
    return module.exports;
}

test('kill rewards round up after class modifiers and combat bonuses, matching the packet', () => {
    const methods = loadMethods('./worldserver', {
        './formulas': {xp: () => 10, xpShare: xp => xp},
        './message': {Kill: function (mob, xp) {this.xp = xp;}}
    });
    const player = {type: 'player', getLevel: () => 1, getActiveBuff: () => null,
        playerClassModifiers: {xp: 1.25}, handleExperience: jest.fn()};
    const mob = {level: 1, dmgTakenArray: [{id: 1, dmg: 10}]};
    const world = {getEntityById: () => player, pushToPlayer: jest.fn(),
        combat: {killExperience: jest.fn((mob, player, killer, xp) => xp + 3)}};
    methods.distributeExp.call(world, mob, player);
    expect(world.combat.killExperience).toHaveBeenCalledWith(mob, player, player, 12.5);
    expect(player.handleExperience).toHaveBeenCalledWith(16);
    expect(world.pushToPlayer).toHaveBeenCalledWith(player, expect.objectContaining({xp: 16}));
});

test('quest rewards use the same rounded XP for credit, notification, and event', () => {
    const methods = loadMethods('./player', {
        './looperlandsplatformclient.js': {LooperLandsPlatformClient: class {}},
        './formulas': {xpPercentageOfLevel: () => 10},
        './message': {QuestComplete: function (name, text, xp) {this.xp = xp;}}
    });
    const player = {playerClassModifiers: {xp: 1.25}, handleExperience: jest.fn(),
        server: {pushToPlayer: jest.fn()}, playerEventBroker: {questCompleteEvent: jest.fn()}};
    const quest = {id: 1, level: 1, name: 'Quest'};
    methods.handleCompletedQuests.call(player, [quest]);
    expect(player.handleExperience).toHaveBeenCalledWith(13);
    expect(player.server.pushToPlayer).toHaveBeenCalledWith(player, expect.objectContaining({xp: 13}));
    expect(player.playerEventBroker.questCompleteEvent).toHaveBeenCalledWith(quest, 13);
});

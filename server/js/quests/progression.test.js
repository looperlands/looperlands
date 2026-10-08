global.Types = {}; global.quests = [];
jest.mock('../dao', () => ({setQuestStatus: jest.fn(), updateResourceBalance: jest.fn(), saveLootEvent: jest.fn(), saveMobKillEvent: jest.fn()}));
jest.mock('../formulas', () => ({level: xp => xp}));
jest.mock('../looperlandsplatformclient', () => ({LooperLandsPlatformClient: class {getFreeRental = jest.fn();}}));
jest.mock('../collectables', () => ({isCollectable: kind => kind === 999, getCollectItem: () => 5, getCollectAmount: () => 2}));
jest.mock('../message', () => ({}));
jest.mock('./main', () => ({quests: [
    {id: 'fixture-kill', name: 'Gate patrol', npc: 40, eventType: 'KILL_MOB', target: 2, amount: 2, needToReturn: true,
        startText: 'Check the gate.', inProgressText: ['{{remaining}} left.', 'Patrol {{done}}/{{amount}}.'], endText: 'Gate checked.'},
    {id: 'fixture-item', name: 'Market supplies', npc: 40, requiredQuest: 'fixture-kill', eventType: 'LOOT_ITEM', target: require('../../../shared/js/gametypes').Entities.GOLD, amount: 3,
        startText: 'Bring supplies.', endText: 'Supplies received.', reward: {item: 6, amount: 4}},
    {id: 'fixture-return', name: 'Road report', npc: 41, returnToNpc: 42, eventType: 'KILL_MOB', target: 2, amount: 3,
        startText: 'Report to the watcher.', inProgressText: '{{remaining}} remain.', endText: 'Report received.'},
    {id: 'fixture-level', name: 'Senior patrol', npc: 43, eventType: 'KILL_MOB', target: 2, amount: 8, requiredLevel: 7,
        startText: 'Senior patrol.', endText: 'Senior report.'}
]}));
const Types = require('../../../shared/js/gametypes');
const registry = require('./quests'), dao = require('../dao');
const {PlayerEventBroker} = require('./playereventbroker');
const {PlayerQuestEventConsumer} = require('./playerquesteventconsumer');
function setup(id = 'one') {
    const session = {nftId: id, walletId: id, xp: 1, gameData: {quests: {}, items: {}, mobKills: {}}};
    const store = new Map([[id, session]]), cache = {get: k => store.get(k), set: (k, v) => store.set(k, v)};
    const npcBehavior = {react: jest.fn()};
    const player = {nftId: id, sessionId: id, server: {server: {cache}, npcBehavior}, handleCompletedQuests: jest.fn()};
    const broker = new PlayerEventBroker(player); broker.setPlayer(player);
    return {session, cache, player, broker, talk: npc => registry.handleNPCClick(cache, id, npc)};
}
beforeEach(() => {jest.clearAllMocks(); PlayerEventBroker.playerEventBrokers = {};});
test('return quests show progress independently and require a personal completed patrol', async () => {
    const one = setup(), two = setup('two');
    // The broker cache is shared in production; use both sessions in one map here too.
    const cache = new Map([['one', one.session], ['two', two.session]]); PlayerEventBroker.cache = cache;
    expect(one.talk(40).quest.id).toBe('fixture-kill'); expect(two.talk(40).quest.id).toBe('fixture-kill');
    await one.broker.killMobEvent({kind: Types.Entities.RAT});
    expect(one.talk(40).text).toEqual(['1 left.', 'Patrol 1/2.']);
    expect(two.talk(40).text).toEqual(['2 left.', 'Patrol 0/2.']);
    await one.broker.killMobEvent({kind: Types.Entities.RAT});
    expect(one.talk(40).text).toBe('Gate checked.');
    expect(one.player.handleCompletedQuests).toHaveBeenCalledTimes(1);
    expect(registry.hasCompletedQuest('fixture-kill', one.session)).toBe(true);
    expect(registry.hasCompletedQuest('fixture-kill', two.session)).toBe(false);
    expect(registry.questsByID['fixture-kill'].done).toBeUndefined();
});
test('loot completion persists debits and rewards once, with the completed entry removed from active quests', async () => {
    const one = setup(); one.session.gameData.quests.COMPLETED = [{questKey: 'fixture-kill'}];
    expect(one.talk(40).quest.id).toBe('fixture-item');
    await one.broker.lootEvent({kind: Types.Entities.GOLD}, 3);
    expect(one.session.gameData.items[Types.Entities.GOLD]).toBe(0);
    expect(one.session.gameData.items[6]).toBe(4);
    expect(dao.updateResourceBalance).toHaveBeenCalledWith('one', Types.Entities.GOLD, -3);
    expect(dao.updateResourceBalance).toHaveBeenCalledWith('one', 6, 4);
    const complete = new PlayerQuestEventConsumer(); complete.completeQuest(one.session, 'fixture-item', registry.questsByID['fixture-item']);
    expect(dao.updateResourceBalance).toHaveBeenCalledTimes(2);
    expect(one.session.gameData.quests.IN_PROGRESS).toEqual([]);
});
test('a different return NPC cannot hand out or finish the report early', async () => {
    const one = setup(); one.talk(41);
    expect(one.talk(42)).toBe('');
    expect(one.talk(41).text).toBe('3 remain.');
    for (let n = 0; n < 3; n++) await one.broker.killMobEvent({kind: Types.Entities.RAT});
    expect(one.talk(42).text).toBe('Report received.');
    expect(registry.hasCompletedQuest('fixture-return', one.session)).toBe(true);
});
test('level and prerequisite indicators change only for the eligible character', () => {
    const one = setup();
    expect(registry.npcHasQuest(one.cache, 'one', 43)).toBe(false);
    expect(one.talk(43)).toBe('');
    one.session.xp = 7;
    expect(registry.npcHasQuest(one.cache, 'one', 43)).toBe(true);
    one.talk(43);
    expect(registry.npcHasOpenQuest(one.cache, 'one', 43)).toBe(true);
    registry.completeQuest(one.cache, 'one', 'fixture-level');
    expect(registry.npcHasOpenQuest(one.cache, 'one', 43)).toBe(false);
    expect(registry.npcHasQuest(one.cache, 'one', 99999)).toBe(false);
});
test('collectables, area transitions and recognition use the correct character and event data', async () => {
    const one = setup();
    await one.broker.lootEvent({kind: 999}, 2);
    await one.broker.lootEvent({kind: 999});
    expect(one.session.gameData.items[5]).toBe(6);
    expect(dao.saveLootEvent).toHaveBeenCalledWith('one', 5, 4);
    await one.broker.spawnEvent(one.player, 'Town');
    await one.broker.enteredArea({name: 'Town'});
    await one.broker.leftArea({name: 'Town'});
    await one.broker.deathEvent(one.player, {x: 20, y: 22});
    await one.broker.questCompleteEvent({id: 'fixture-item'}, 5);
    expect(one.player.server.npcBehavior.react).toHaveBeenCalledWith('quest', one.player, {quest: {id: 'fixture-item'}});
    one.broker.destroy();
    expect(PlayerEventBroker.playerEventBrokers.one).toBeUndefined();
});

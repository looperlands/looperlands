global.Types = {}; global.quests = [];
jest.mock('../message', () => ({}));
jest.mock('../dao', () => ({setQuestStatus: jest.fn(), updateResourceBalance: jest.fn(), saveLootEvent: jest.fn(), saveMobKillEvent: jest.fn(), registerChoice: jest.fn(async () => ({}))}));
jest.mock('../formulas', () => ({level: xp => xp}));
jest.mock('../looperlandsplatformclient', () => ({LooperLandsPlatformClient: class {getFreeRental = jest.fn();}}));
jest.mock('../collectables', () => ({isCollectable: kind => kind === 999, getCollectItem: () => 5, getCollectAmount: () => 2}));
const mockQuestDefinitions = {quests: [{id: 'meeting', name: 'Meeting', npc: 40, startText: 'Help a friend.', endText: 'Thank you.',
    objectives: [{id: 'talk', label: 'Talk to a friend', eventType: 'NPC_TALKED', target: 41, npcKey: 'friend'},
        {id: 'visit', label: 'Visit Forest', eventType: 'AREA_ENTERED', target: 'Forest'},
        {id: 'kill', label: 'Defeat two rats here', eventType: 'KILL_MOB', target: 2, amount: 2, area: {x: 5, y: 5, width: 5, height: 5}},
        {id: 'collect', label: 'Collect supplies', eventType: 'LOOT_ITEM', target: 5, amount: 3},
        {id: 'deliver', label: 'Bring supplies to your friend', eventType: 'DELIVER_ITEM', target: 5, amount: 3, recipient: {npc: 41, npcKey: 'friend'}}]}]};
jest.mock('./main', () => mockQuestDefinitions);
// Support both direct legacy loading and the independently registered engine.
jest.mock('../worlddefinitions', () => ({definitions: {quests: mockQuestDefinitions.quests, subscribe: jest.fn()}}), {virtual: true});
const quests = require('./quests'), objective = require('./objectives'), dao = require('../dao');
const {PlayerEventBroker} = require('./playereventbroker');
const {PlayerQuestEventConsumer} = require('./playerquesteventconsumer');
function setup(id = 'one') {
    const data = {nftId: id, walletId: id, xp: 1, gameData: {quests: {}, choices: [], items: {}, mobKills: {2: 100}}};
    const cache = new Map([[id, data]]);
    const player = {nftId: id, sessionId: id, server: {server: {cache}, npcBehavior: {react: jest.fn()}}, handleCompletedQuests: jest.fn()};
    const broker = new PlayerEventBroker(player); broker.setPlayer(player);
    return {data, cache, player, broker, accept: () => quests.newQuest(cache, id, 'meeting')};
}
const progress = s => objective.progress(s.data.gameData, quests.questsByID.meeting);
async function advance(s) {
    s.accept(); await s.broker.npcTalked(41, '', 'friend'); await s.broker.enteredArea({name: 'Forest'});
    await s.broker.killMobEvent({kind: 2, x: 5, y: 5}); await s.broker.killMobEvent({kind: 2, x: 6, y: 6});
    await s.broker.lootEvent({kind: 5}, 3);
}
beforeEach(() => {jest.clearAllMocks(); dao.registerChoice.mockImplementation(async () => ({})); PlayerEventBroker.pending.clear(); PlayerEventBroker.playerEventBrokers = {};});
test('an ordered quest uses existing talks, area visits, combat and inventory for one real delivery', async () => {
    const s = setup(); await advance(s); expect(progress(s).map(o => o.done)).toEqual([true, true, true, true, false]);
    expect(s.data.gameData.items[5]).toBe(3); expect(quests.completeQuest(s.cache, 'one', 'meeting')).toBe(false);
    await s.broker.npcTalked(41, '', 'friend'); expect(quests.hasCompletedQuest('meeting', s.data)).toBe(true);
    expect(s.data.gameData.items[5]).toBe(0); expect(dao.updateResourceBalance).toHaveBeenCalledWith('one', 5, -3);
    await s.broker.npcTalked(41, '', 'friend'); expect(dao.updateResourceBalance).toHaveBeenCalledTimes(1);
    expect(s.player.handleCompletedQuests).toHaveBeenCalledTimes(1);
});
test('pre-acceptance and out-of-order visits/kills/talks do not count', async () => {
    const s = setup(); await s.broker.npcTalked(41, '', 'friend'); s.accept();
    await s.broker.enteredArea({name: 'Forest'}); await s.broker.killMobEvent({kind: 2, x: 5, y: 5});
    await s.broker.npcTalked(41, '', 'different-friend'); expect(progress(s).every(o => !o.done)).toBe(true);
    await s.broker.npcTalked(41, '', 'friend'); await s.broker.enteredArea({name: 'Forest'});
    await s.broker.killMobEvent({kind: 2, x: 10, y: 5}); await s.broker.killMobEvent({kind: 2, x: 5, y: 4});
    await s.broker.killMobEvent({kind: 3, x: 5, y: 5}); expect(progress(s)[2].count).toBe(0);
});
test('partial progress survives backend-style reload and remains personal', async () => {
    const one = setup(), two = setup('two');
    const cache = new Map([['one', one.data], ['two', two.data]]); one.player.server.server.cache = cache; two.player.server.server.cache = cache;
    one.broker.cache = cache; two.broker.cache = cache; PlayerEventBroker.cache = cache;
    one.accept(); two.accept(); await one.broker.npcTalked(41, '', 'friend');
    expect(progress(two)[0].done).toBe(false);
    const reloaded = JSON.parse(JSON.stringify(one.data)); cache.set('one', reloaded); one.data = reloaded;
    await one.broker.enteredArea({name: 'Forest'}); await one.broker.killMobEvent({kind: 2, x: 5, y: 5});
    expect(progress(one)[2].count).toBe(1); expect(progress(two)[2].count).toBe(0);
});
test('simultaneous events serialize durable progress instead of losing a kill', async () => {
    const s = setup(); s.accept(); await s.broker.npcTalked(41, '', 'friend'); await s.broker.enteredArea({name: 'Forest'});
    await Promise.all([s.broker.killMobEvent({kind: 2, x: 5, y: 5}), s.broker.killMobEvent({kind: 2, x: 6, y: 5})]);
    expect(progress(s)[2].count).toBe(2); expect(PlayerEventBroker.pending.size).toBe(0);
});
test('failed durable writes do not advance progress and the next event can retry', async () => {
    const s = setup(); s.accept(); dao.registerChoice.mockResolvedValueOnce(undefined);
    await expect(s.broker.npcTalked(41, '', 'friend')).rejects.toThrow('Could not save'); expect(progress(s)[0].done).toBe(false);
    await s.broker.npcTalked(41, '', 'friend'); expect(progress(s)[0].done).toBe(true);
});
test('delivery requires actual inventory and the configured recipient', async () => {
    const s = setup(); await advance(s); await s.broker.npcTalked(42, '', 'friend'); expect(progress(s)[4].done).toBe(false);
    s.data.gameData.items[5] = 0; await s.broker.npcTalked(41, '', 'friend'); expect(progress(s)[4].done).toBe(false);
    s.data.gameData.items[5] = 3; await s.broker.npcTalked(41, '', 'friend'); expect(s.data.gameData.items[5]).toBe(0);
});
test('place delivery uses server area events; unordered non-delivery objectives can advance independently', async () => {
    const s = setup(); const definition = quests.questsByID.meeting;
    const copy = {...definition, id: 'place', objectives: [{id: 'gift', eventType: 'DELIVER_ITEM', target: 5, amount: 2, recipient: {area: 'Town'}}]};
    objective.validate(copy); s.data.gameData.items[5] = 2;
    expect(await objective.consume(copy, {eventType: 'AREA_ENTERED', data: {area: {name: 'Forest'}}, playerCache: s.data})).toBe(false);
    expect(await objective.consume(copy, {eventType: 'AREA_ENTERED', data: {area: {name: 'Town'}}, playerCache: s.data})).toBe(true);
    const unordered = {...definition, id: 'unordered', ordered: false, objectives: definition.objectives.slice(0, 2)};
    await objective.consume(unordered, {eventType: 'AREA_ENTERED', data: {area: {name: 'Forest'}}, playerCache: s.data});
    expect(objective.progress(s.data.gameData, unordered)[1].done).toBe(true);
});
test('return-to-NPC completion checks all objectives and inventory before handing in', async () => {
    const s = setup(), definition = quests.questsByID.meeting; definition.needToReturn = true;
    try {await advance(s); await s.broker.npcTalked(41, '', 'friend'); expect(quests.hasCompletedQuest('meeting', s.data)).toBe(false);
        expect(quests.completeQuest(s.cache, 'one', 'meeting')).toBe('Thank you.'); expect(s.data.gameData.items[5]).toBe(0);
    } finally {delete definition.needToReturn;}
});
test('legacy kill/loot behavior still completes alongside a new objective quest', async () => {
    const s = setup(); s.accept(); quests.questsByID.legacy = {id: 'legacy', eventType: 'KILL_MOB', target: 2, amount: 1};
    s.data.gameData.quests.IN_PROGRESS.push({questKey: 'legacy'}); await s.broker.killMobEvent({kind: 2, x: 1, y: 1});
    expect(quests.hasCompletedQuest('legacy', s.data)).toBe(true); expect(progress(s)[2].count).toBe(0);
    delete quests.questsByID.legacy;
});
test.each([{objectives: []}, {objectives: [{id: 'x', eventType: 'UNKNOWN', target: 1}]}, {objectives: [{id: 'x', eventType: 'KILL_MOB', target: 2, amount: -1}]},
    {objectives: [{id: 'x', eventType: 'KILL_MOB', target: 2, area: {x: 0, y: 0, width: 0, height: 4}}]},
    {objectives: [{id: 'x', eventType: 'DELIVER_ITEM', target: 5, recipient: {npc: 4}}, {id: 'y', eventType: 'NPC_TALKED', target: 4}]},
    {ordered: false, objectives: [{id: 'x', eventType: 'DELIVER_ITEM', target: 5, recipient: {npc: 4}}]},
    {objectives: [{id: 'x', eventType: 'AREA_ENTERED', target: 'Town'}, {id: 'x', eventType: 'NPC_TALKED', target: 4}]}])('invalid objectives are rejected: %j', overrides => {
    expect(() => objective.validate({id: 'invalid', ...overrides})).toThrow();
});


test('an event queued before acceptance cannot count after the quest starts', async () => {
    const s = setup(); const pending = s.broker.npcTalked(41, '', 'friend'); s.accept(); await pending;
    expect(progress(s)[0].done).toBe(false);
    const talk = s.broker.npcTalked(41, '', 'friend'); const arrival = s.broker.enteredArea({name: 'Forest'}); await Promise.all([talk, arrival]);
    expect(progress(s)[0].done).toBe(true); expect(progress(s)[1].done).toBe(false);
});
test('place observation uses server positions and distant trigger reports cannot advance a quest', async () => {
    const s = setup(); s.accept(); await s.broker.npcTalked(41, '', 'friend');
    s.player.x = 1; s.player.y = 1; const scene = {id: 2, name: 'Forest', x: 5, y: 5, w: 5, h: 5};
    await s.broker.enteredArea(scene); expect(progress(s)[1].done).toBe(false);
    s.player.x = 6; s.player.y = 6; s.player.server.map = {getSceneAt: () => scene};
    await s.broker.observePlace(); expect(progress(s)[1].done).toBe(true); const writes = dao.registerChoice.mock.calls.length;
    await s.broker.observePlace(); expect(dao.registerChoice).toHaveBeenCalledTimes(writes);
});


test('a cloned cache keeps quests, choices, inventory and dialogue changed during a progress write', async () => {
    const s = setup(); const store = new Map([['one', structuredClone(s.data)]]);
    s.cache.get = id => structuredClone(store.get(id)); s.cache.set = (id, value) => store.set(id, structuredClone(value)); s.accept();
    dao.registerChoice.mockImplementationOnce(async () => {
        const latest = store.get('one'); latest.currentNode = 'new-dialogue'; latest.gameData.choices.push('friendship-choice');
        latest.gameData.quests.IN_PROGRESS.push({questKey: 'another-quest'}); latest.gameData.items[5] = 9; return {};
    });
    await s.broker.npcTalked(41, '', 'friend'); const saved = store.get('one');
    expect(saved.currentNode).toBe('new-dialogue'); expect(saved.gameData.items[5]).toBe(9); expect(saved.gameData.choices).toContain('friendship-choice');
    expect(saved.gameData.quests.IN_PROGRESS).toContainEqual({questKey: 'another-quest'}); expect(objective.progress(saved.gameData, quests.questsByID.meeting)[0].done).toBe(true);
});

global.Types = {};
jest.mock('../dao', () => ({setQuestStatus: jest.fn(), updateResourceBalance: jest.fn(), registerChoice: jest.fn(async () => ({}))}));
jest.mock('../formulas', () => ({level: () => 1}));
jest.mock('../message', () => ({}));
jest.mock('../looperlandsplatformclient', () => ({LooperLandsPlatformClient: class {}}));
const mockWindow = {annual: {start: '10-15', end: '11-09'}};
jest.mock('../worlddefinitions', () => ({definitions: {subscribe: jest.fn(), quests: [
    {id: 'seasonal-patrol', npc: 40, mapId: 'main', startText: 'Investigate.', endText: 'Solved.', availability: mockWindow,
        eventType: 'KILL_MOB', target: 2, amount: 1, returnToNpc: 40, reward: {item: 5, amount: 2}},
    {id: 'seasonal-clues', npc: 41, mapId: 'main', startText: 'Find clues.', endText: 'Clues found.', availability: mockWindow,
        reward: {item: 6, amount: 1}, objectives: [{id: 'clue', eventType: 'NPC_TALKED', target: 42, amount: 2}]},
    {id: 'ordinary-patrol', npc: 43, mapId: 'main', startText: 'Regular patrol.', endText: 'All clear.',
        eventType: 'KILL_MOB', target: 2, amount: 1}
]}}));
require('../../../shared/js/gametypes');
const quests = require('./quests'), dao = require('../dao'), objectives = require('./objectives');
const {PlayerEventBroker} = require('./playereventbroker');
const {PlayerQuestEventConsumer} = require('./playerquesteventconsumer');

function fixture() {
    const data = {mapId: 'main', nftId: 'avatar', gameData: {quests: {}, choices: [], items: {}, mobKills: {2: 1}}};
    const cache = new Map([['session', data]]), player = {handleCompletedQuests: jest.fn()};
    PlayerEventBroker.playerEventBrokers.session = {player};
    const consumer = new PlayerQuestEventConsumer();
    return {data, cache, player, consumer,
        talk: npc => quests.handleNPCClick(cache, 'session', npc),
        accept: id => quests.newQuest(cache, 'session', id),
        complete: id => quests.completeQuest(cache, 'session', id),
        event: () => ({eventType: 'NPC_TALKED', data: {npc: 42}, playerCache: data})};
}
beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-15T00:00:00Z'));
});
afterEach(() => {jest.useRealTimers(); delete PlayerEventBroker.playerEventBrokers.session;});

test('seasonal acceptance and NPC indicators open at the start, without affecting ordinary quests', () => {
    const s = fixture();
    jest.setSystemTime(new Date('2026-10-14T23:59:59.999Z'));
    expect(s.accept('seasonal-patrol')).toBe('');
    expect(s.talk(40)).toBe('');
    expect(quests.npcHasQuest(s.cache, 'session', 40)).toBe(false);
    expect(s.accept('ordinary-patrol')).toBe('Regular patrol.');
    jest.setSystemTime(new Date('2026-10-15T00:00:00Z'));
    expect(quests.npcHasQuest(s.cache, 'session', 40)).toBe(true);
    expect(s.talk(40).quest.id).toBe('seasonal-patrol');
    expect(quests.npcHasOpenQuest(s.cache, 'session', 40)).toBe(true);
});

test('expired accepted quests cannot progress, complete, pay rewards or show an NPC indicator', async () => {
    const s = fixture(); s.accept('seasonal-patrol'); s.accept('seasonal-clues');
    jest.setSystemTime(new Date('2026-11-09T00:00:00Z'));
    dao.setQuestStatus.mockClear();
    expect(s.talk(40)).toBe('');
    expect(s.complete('seasonal-patrol')).toBe(false);
    expect(s.consumer.completeQuest(s.data, 'seasonal-patrol', quests.questsByID['seasonal-patrol'])).toBe(false);
    expect(quests.npcHasOpenQuest(s.cache, 'session', 40)).toBe(false);
    await s.consumer.consume(s.event());
    expect(await objectives.consume(quests.questsByID['seasonal-clues'], s.event())).toBe(false);
    expect(dao.registerChoice).not.toHaveBeenCalled();
    expect(dao.setQuestStatus).not.toHaveBeenCalled();
    expect(dao.updateResourceBalance).not.toHaveBeenCalled();
    expect(s.player.handleCompletedQuests).not.toHaveBeenCalled();
    expect(s.data.gameData.quests.IN_PROGRESS).toHaveLength(2);
});

test('legacy event completion also stops at expiry without any custom objective quest', () => {
    const s = fixture(); s.accept('seasonal-patrol');
    jest.setSystemTime(new Date('2026-11-09T00:00:00Z'));
    const result = s.consumer.consume({eventType: 'KILL_MOB', playerCache: s.data, data: {mob: {kind: 2}}});
    expect(result.changedQuests).toEqual([]);
    expect(s.data.gameData.quests.IN_PROGRESS[0].completed).toBeUndefined();
});

test('unfinished personal progress resumes next year and completed rewards never reset', async () => {
    const s = fixture(); s.accept('seasonal-clues');
    await s.consumer.consume(s.event());
    expect(objectives.progress(s.data.gameData, quests.questsByID['seasonal-clues'])[0].count).toBe(1);
    jest.setSystemTime(new Date('2026-11-09T00:00:00Z'));
    await s.consumer.consume(s.event());
    expect(objectives.progress(s.data.gameData, quests.questsByID['seasonal-clues'])[0].count).toBe(1);
    jest.setSystemTime(new Date('2027-10-15T00:00:00Z'));
    const result = await s.consumer.consume(s.event());
    expect(result.changedQuests.map(quest => quest.id)).toEqual(['seasonal-clues']);
    expect(s.data.gameData.items[6]).toBe(1);
    jest.setSystemTime(new Date('2028-10-15T00:00:00Z'));
    expect(s.accept('seasonal-clues')).toBe('');
    expect(s.complete('seasonal-clues')).toBe(false);
    expect(s.data.gameData.items[6]).toBe(1);
});

test('an objective write crossing the end boundary does not dispatch completion or reward effects', async () => {
    const s = fixture(); s.accept('seasonal-clues');
    await s.consumer.consume(s.event());
    dao.registerChoice.mockImplementationOnce(async () => {
        jest.setSystemTime(new Date('2026-11-09T00:00:00Z'));
        return {};
    });
    const result = await s.consumer.consume(s.event());
    expect(result.changedQuests).toEqual([]);
    expect(quests.hasCompletedQuest('seasonal-clues', s.data)).toBe(false);
    expect(dao.updateResourceBalance).not.toHaveBeenCalled();
});

test('direct completion of an unaccepted quest cannot dispatch XP or celebration', () => {
    const s = fixture();
    expect(s.complete('seasonal-patrol')).toBe(false);
    expect(s.player.handleCompletedQuests).not.toHaveBeenCalled();
});

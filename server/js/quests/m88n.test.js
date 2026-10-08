jest.mock('../dao.js', () => ({
    setQuestStatus: jest.fn(),
    updateResourceBalance: jest.fn(),
}));
jest.mock('../formulas.js', () => ({level: () => 1}));
jest.mock('../looperlandsplatformclient.js', () => ({LooperLandsPlatformClient: jest.fn()}));
jest.mock('../collectables.js', () => ({}));
jest.mock('../message.js', () => ({}));

// Legacy quest definitions assign these globals when loaded.
global.Types = {};
global.quests = [];
const Types = require('../../../shared/js/gametypes');
require('../../world-definitions').register();
const quests = require('./quests');
const dao = require('../dao');
const {PlayerEventBroker} = require('./playereventbroker');

function setup() {
    const sessionData = {nftId: 'test-avatar', xp: 0, gameData: {quests: {}, items: {}}};
    const cache = {get: () => sessionData, set: jest.fn()};
    const player = {sessionId: 'test-session', server: {server: {cache}}, handleCompletedQuests: jest.fn()};
    const broker = new PlayerEventBroker(player);
    broker.setPlayer(player);
    const talk = async npcId => {
        const response = quests.handleNPCClick(cache, player.sessionId, npcId);
        if (response) await broker.npcTalked(String(npcId), response.text);
        return response;
    };
    return {sessionData, player, broker, talk};
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => { PlayerEventBroker.playerEventBrokers = {}; });

test('meeting the Townies completes the welcome quest once and unlocks the m88nshiner', async () => {
    const {sessionData, player, talk} = setup();
    const welcome = quests.questsByID.WELCOME_QUEST;
    expect((await talk(Types.Entities.NEXAN39)).quest.id).toBe(welcome.id);

    expect(await talk(Types.Entities.M88NTOWNIES)).toEqual({text: welcome.npcText});
    expect(quests.hasCompletedQuest(welcome.id, sessionData)).toBe(true);
    expect(sessionData.gameData.quests.IN_PROGRESS).toEqual([]);
    expect(dao.setQuestStatus).toHaveBeenCalledWith(sessionData.nftId, welcome.id, 'COMPLETED');
    expect(sessionData.gameData.items[Types.Entities.M88NGEM]).toBe(1);
    expect(dao.updateResourceBalance).toHaveBeenCalledWith(sessionData.nftId, Types.Entities.M88NGEM, 1);
    expect(player.handleCompletedQuests).toHaveBeenCalledWith([welcome]);

    await talk(Types.Entities.M88NTOWNIES);
    expect(dao.updateResourceBalance).toHaveBeenCalledTimes(1);
    expect(player.handleCompletedQuests).toHaveBeenCalledTimes(1);
    expect((await talk(Types.Entities.NEXAN39)).quest.id).toBe('WELCOME_QUEST_2');
});

test('talking to another NPC or the Townies before accepting does not complete the welcome quest', async () => {
    const {sessionData, player, talk} = setup();
    await talk(Types.Entities.M88NTOWNIES);
    expect(quests.hasCompletedQuest('WELCOME_QUEST', sessionData)).toBe(false);

    await talk(Types.Entities.NEXAN39);
    await talk(Types.Entities.NEXAN48);
    expect(quests.hasCompletedQuest('WELCOME_QUEST', sessionData)).toBe(false);
    expect(sessionData.gameData.quests.IN_PROGRESS).toContainEqual({questKey: 'WELCOME_QUEST', status: 'IN_PROGRESS'});
    expect(dao.updateResourceBalance).not.toHaveBeenCalled();
    expect(player.handleCompletedQuests).not.toHaveBeenCalled();
});

test('an already accepted welcome quest completes on the next Townies interaction', async () => {
    const {sessionData, talk} = setup();
    sessionData.gameData.quests.IN_PROGRESS = [{questKey: 'WELCOME_QUEST', status: 'IN_PROGRESS'}];

    await talk(Types.Entities.M88NTOWNIES);

    expect(quests.hasCompletedQuest('WELCOME_QUEST', sessionData)).toBe(true);
    expect(sessionData.gameData.items[Types.Entities.M88NGEM]).toBe(1);
});

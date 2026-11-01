global.Types = {};
jest.mock('../js/dao', () => ({setQuestStatus: jest.fn(), updateResourceBalance: jest.fn(), registerChoice: jest.fn(async () => ({}))}));
jest.mock('../js/discord', () => ({sendToDevChannel: jest.fn()}));
jest.mock('../js/formulas', () => ({level: () => 1}));
jest.mock('../js/message', () => ({}));
jest.mock('../js/looperlandsplatformclient', () => ({LooperLandsPlatformClient: class {}}));
const Types = require('../../shared/js/gametypes');
const story = require('./halloween-story');
const {definitions} = require('../js/worlddefinitions');
definitions.register('main', {id: 'halloween-test-story', quests: story.quests, dialogues: story.dialogues});
const quests = require('../js/quests/quests');
const objective = require('../js/quests/objectives');
const {PlayerEventBroker} = require('../js/quests/playereventbroker');
const DialogueController = require('../js/dialoguecontroller');
const dao = require('../js/dao');
let cache;
function fixture(id = 'one') {
    cache.set(id, {nftId: id, mapId: 'main', xp: 1, gameData: {quests: {}, choices: [], items: {}, mobKills: {}}});
    const player = {nftId: id, sessionId: id, server: {server: {cache}, npcBehavior: {react: jest.fn()}}, handleCompletedQuests: jest.fn()};
    const broker = new PlayerEventBroker(player); broker.setPlayer(player);
    const controller = new DialogueController(cache, {});
    const actor = key => story.actors.find(actor => actor.key === 'halloween:' + key);
    const talk = async key => {
        const npc = actor(key); await broker.npcTalked(npc.kind, '', npc.key);
        return controller.processDialogueTree('main', npc.kind, cache, id, npc.key);
    };
    const choose = async (key, node) => {
        const npc = actor(key);
        expect(controller.goto('main', npc.kind, node, cache, id, npc.key)).toBe(true);
        return talk(key);
    };
    return {id, player, broker, controller, actor, talk, choose, data: () => cache.get(id)};
}
async function intro(s) {
    await s.talk('witch'); await s.choose('witch', 'accept-intro'); await s.choose('witch', 'finish-intro'); await s.choose('witch', 'hub');
}
async function accept(s, mystery) {
    await s.talk('witch'); await s.choose('witch', mystery + '-case'); return s.choose('witch', 'accept-' + mystery);
}
async function report(s, mystery) {
    await s.talk('witch'); await s.choose('witch', mystery + '-case'); return s.choose('witch', 'finish-' + mystery);
}
async function freeShadow(s) {
    await s.talk('footprints'); await s.talk('pumpkin'); await s.choose('pumpkin', 'release');
}
beforeEach(() => {
    jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(new Date('2026-10-31T18:00:00Z'));
    const store = new Map();
    // NodeCache clones sessions in production; exercise that boundary here too.
    cache = {get: id => structuredClone(store.get(id)), set: (id, data) => store.set(id, structuredClone(data))};
    PlayerEventBroker.playerEventBrokers = {}; PlayerEventBroker.pending.clear();
});
afterEach(() => {jest.useRealTimers();});

test('three distinct mysteries can be solved through real dialogue transitions and award each reward once', async () => {
    const s = fixture(); await intro(s);
    expect(s.data().gameData.items[Types.Entities.GOLD]).toBe(10);
    await accept(s, 'shadow'); await freeShadow(s); await report(s, 'shadow');
    expect(quests.hasCompletedQuest(story.SHADOW, s.data())).toBe(true);
    expect(s.data().gameData.items[Types.Entities.M88NPUMPKIN]).toBe(3);

    await s.choose('witch', 'hub'); await accept(s, 'grave');
    await s.talk('gravedigger-right'); await s.talk('memorial'); await s.talk('gravedigger-left');
    expect(objective.progress(s.data().gameData, quests.questsByID[story.GRAVEDIGGER]).map(o => o.done)).toEqual([true, true, false]);
    await s.talk('witch'); await s.choose('witch', 'grave-case'); await s.choose('witch', 'grave-decision');
    await s.choose('witch', 'wrong-grave');
    expect(quests.hasCompletedQuest(story.GRAVEDIGGER, s.data())).toBe(false);
    expect(objective.ready(s.data().gameData, quests.questsByID[story.GRAVEDIGGER])).toBe(false);
    await s.choose('witch', 'grave-decision'); await s.choose('witch', 'finish-grave');
    expect(s.data().gameData.items[Types.Entities.WOOD]).toBe(6);
    expect((await s.talk('gravedigger-left')).text).toMatch(/Thank you for helping Rowan/);
    expect((await s.talk('gravedigger-right')).text).toMatch(/watch the lanterns from here/);

    await accept(s, 'well');
    await s.talk('well'); await s.choose('well', 'listen'); await s.talk('keepsake'); await s.choose('keepsake', 'take');
    await s.talk('well'); await s.choose('well', 'restore'); await report(s, 'well');
    expect(s.data().gameData.items[Types.Entities.ORE]).toBe(3);
    expect(s.data().gameData.quests.COMPLETED.map(quest => quest.questKey)).toEqual([story.INTRO, story.SHADOW, story.GRAVEDIGGER, story.WELL]);
    expect(s.player.handleCompletedQuests).toHaveBeenCalledTimes(4);
    expect(dao.updateResourceBalance).toHaveBeenCalledTimes(4);

    const shop = await s.choose('witch', 'cauldron');
    expect(shop.shop).toEqual({id: 'halloween-cauldron', name: 'The Unreliable Cauldron'});
    for (const quest of story.quests) expect(quests.completeQuest(cache, s.id, quest.id)).toBe(false);
    expect(dao.updateResourceBalance).toHaveBeenCalledTimes(4);
});

test('talking to evidence is not enough: completion also requires the authored solution choices', async () => {
    const s = fixture(); await intro(s); await accept(s, 'shadow');
    await s.talk('pumpkin');
    expect(objective.progress(s.data().gameData, quests.questsByID[story.SHADOW]).every(o => !o.done)).toBe(true);
    expect(s.controller.goto('main', s.actor('pumpkin').kind, 'release', cache, s.id, s.actor('pumpkin').key)).toBe(false);
    await s.talk('footprints'); await s.talk('pumpkin');
    expect(objective.progress(s.data().gameData, quests.questsByID[story.SHADOW]).map(o => o.done)).toEqual([true, false]);
    expect(quests.completeQuest(cache, s.id, story.SHADOW)).toBe(false);
    expect(s.data().gameData.items[Types.Entities.M88NPUMPKIN]).toBeUndefined();
    await s.choose('pumpkin', 'release'); await report(s, 'shadow');
    expect(quests.hasCompletedQuest(story.SHADOW, s.data())).toBe(true);
});

test('the well Journal follows listening, taking and returning the ring rather than visits', async () => {
    const s = fixture(); await intro(s); await accept(s, 'well');
    const progress = () => objective.progress(s.data().gameData, quests.questsByID[story.WELL]).map(o => o.done);
    await s.talk('well'); await s.choose('well', 'leave'); await s.talk('keepsake');
    expect(progress()).toEqual([false, false, false]);
    expect(s.controller.goto('main', s.actor('keepsake').kind, 'take', cache, s.id, s.actor('keepsake').key)).toBe(false);
    const reminder = await s.talk('keepsake');
    expect(reminder.text).toMatch(/choose to listen/);
    await s.talk('well'); await s.choose('well', 'listen');
    expect(progress()).toEqual([true, false, false]);
    await s.talk('keepsake'); await s.choose('keepsake', 'leave'); await s.talk('well');
    expect(progress()).toEqual([true, false, false]);
    expect(quests.completeQuest(cache, s.id, story.WELL)).toBe(false);
    await s.talk('keepsake'); await s.choose('keepsake', 'take');
    expect(progress()).toEqual([true, true, false]);
    const waiting = await s.talk('well');
    expect(waiting.text).toMatch(/waiting for you to lower/);
    await s.choose('well', 'leave');
    expect(progress()).toEqual([true, true, false]);
    await s.talk('well'); await s.choose('well', 'restore');
    expect(progress()).toEqual([true, true, true]);
    expect(quests.questsByID[story.WELL].inProgressText).toMatch(/Return to Whispy/);
    const returned = await s.talk('keepsake');
    expect(returned.text).toMatch(/returned the ring/);
    await report(s, 'well');
    expect(quests.hasCompletedQuest(story.WELL, s.data())).toBe(true);
    expect(s.data().gameData.items[Types.Entities.ORE]).toBe(3);
});

test('finding evidence before accepting its mystery explains who can start it without saving progress', async () => {
    const s = fixture();
    for (const key of ['footprints', 'pumpkin', 'gravedigger-left', 'gravedigger-right', 'memorial', 'well', 'keepsake']) {
        const clue = await s.talk(key);
        expect(clue.text).toMatch(/Whispy/);
        expect(clue.text).toMatch(/Town notice board/);
    }
    expect(s.data().gameData.choices).toEqual([]);
    expect(dao.registerChoice).not.toHaveBeenCalled();
    expect(dao.updateResourceBalance).not.toHaveBeenCalled();
});

test('accepted and resumed clues guide players through the Forest, Graveyard and Beach', async () => {
    const s = fixture();
    expect((await s.talk('witch')).text).toMatch(/Forest.*Graveyard.*Beach/);
    await intro(s);
    const shadowRoute = await accept(s, 'shadow');
    expect(shadowRoute.text).toMatch(/northern river bridge into the Forest/);
    expect(shadowRoute.text).toMatch(/fork.*west.*campfire south of the tent/);
    const pumpkinFirst = await s.talk('pumpkin');
    expect(pumpkinFirst.text).toMatch(/east to the main road.*south toward the river bridge/);
    const shoes = await s.talk('footprints');
    expect(shoes.text).toMatch(/note.*campfire.*south of the tent/);
    expect(shoes.text).toMatch(/north to the fork.*west/);

    const graveRoute = await accept(s, 'grave');
    expect(graveRoute.text).toMatch(/north through the Forest into the Graveyard/);
    expect(graveRoute.text).toMatch(/northern wooden crypts, west of the main road/);
    expect((await s.talk('gravedigger-left')).text).toMatch(/Town notice board last spring/);
    expect((await s.talk('gravedigger-right')).text).toMatch(/notice board in Town.*Town has never had one/);
    expect((await s.talk('memorial')).text).toMatch(/Town notice board going up last spring/);

    const beachRoute = await accept(s, 'well');
    expect(beachRoute.text).toMatch(/south from Town to the Beach shoreline/);
    expect(beachRoute.text).toMatch(/basin just east.*central palm/);
    expect((await s.talk('keepsake')).text).toMatch(/First choose to listen.*shoreline east.*central palm/);
    await s.talk('well');
    expect((await s.choose('well', 'listen')).text).toMatch(/sea washed my ring ashore beneath the western palm.*shoreline west/);
    await s.talk('keepsake');
    expect((await s.talk('well')).text).toMatch(/shoreline west.*western palm.*east.*back here/);
    await s.talk('keepsake');
    expect((await s.choose('keepsake', 'take')).text).toMatch(/shoreline east.*basin beside the central palm/);
    await s.talk('well');
    expect((await s.talk('keepsake')).text).toMatch(/shoreline east.*basin beside the central palm/);
});

test('returning to reward conversations resumes the hub without repeating a payment promise', async () => {
    const s = fixture();
    await s.talk('witch'); await s.choose('witch', 'accept-intro'); await s.choose('witch', 'finish-intro');
    const hub = story.dialogues.find(d => d.key === 'halloween:witch').nodes.hub.text;
    expect((await s.talk('witch')).text).toBe(hub);
    expect(dao.updateResourceBalance).toHaveBeenCalledTimes(1);
    await accept(s, 'shadow'); await freeShadow(s);
    await s.talk('witch');
    expect((await s.choose('witch', 'shadow-case')).text).toMatch(/You freed Adam/);
    const reward = await s.choose('witch', 'finish-shadow');
    expect(reward.options.some(o => o.goto === 'cauldron')).toBe(true);
    expect((await s.talk('witch')).text).toBe(hub);
    expect(dao.updateResourceBalance).toHaveBeenCalledTimes(2);
});

test('one player solving a haunting leaves the evidence and rewards available to another', async () => {
    const one = fixture('one'), two = fixture('two');
    await intro(one); await intro(two); await accept(one, 'shadow'); await freeShadow(one); await report(one, 'shadow');
    expect(two.data().gameData.choices).not.toContain(story.choices.shadow);
    await accept(two, 'shadow'); await freeShadow(two); await report(two, 'shadow');
    expect(one.data().gameData.items[Types.Entities.M88NPUMPKIN]).toBe(3);
    expect(two.data().gameData.items[Types.Entities.M88NPUMPKIN]).toBe(3);
    expect(story.dialogues.find(dialogue => dialogue.key === 'halloween:pumpkin').nodes.pumpkin.options).toHaveLength(3);
});

test('the annual closing boundary rejects an already offered turn-in and preserves progress for next year', async () => {
    const s = fixture(); await intro(s); await accept(s, 'shadow'); await freeShadow(s);
    await s.talk('witch'); await s.choose('witch', 'shadow-case');
    jest.setSystemTime(new Date('2026-11-09T00:00:00Z'));
    expect(s.controller.goto('main', s.actor('witch').kind, 'finish-shadow', cache, s.id, s.actor('witch').key)).toBeUndefined();
    expect(quests.completeQuest(cache, s.id, story.SHADOW)).toBe(false);
    expect(await s.talk('witch')).toBeNull();
    expect(s.data().gameData.choices).toContain(story.choices.shadow);
    jest.setSystemTime(new Date('2027-10-15T00:00:00Z'));
    await s.talk('footprints'); await report(s, 'shadow');
    expect(s.data().gameData.items[Types.Entities.M88NPUMPKIN]).toBe(3);
});

test('authored actors, objectives and choices are registered and all menu transitions exist', () => {
    for (const actor of story.actors) expect(Types.isNpc(actor.kind)).toBe(true);
    for (const quest of story.quests) {
        expect(quest.availability).toBe(require('./halloween-season').availability);
        require('../js/quests/queststate').validateRequiredChoices(quest.requiredChoices);
        objective.validate(quest);
        for (const step of quest.objectives || []) expect(story.actors.some(actor => actor.key === step.npcKey && actor.kind === step.target)).toBe(true);
    }
    for (const dialogue of story.dialogues) {
        for (const node of Object.values(dialogue.nodes)) {
            expect(node.options?.length || 0).toBeLessThanOrEqual(6);
            for (const option of node.options || []) expect(dialogue.nodes[option.goto]).toBeDefined();
        }
    }
});

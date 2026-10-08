jest.mock('../js/dao', () => ({setQuestStatus: jest.fn(), registerChoice: jest.fn(), updateResourceBalance: jest.fn()}));
jest.mock('../js/discord', () => ({sendToDevChannel: jest.fn()}));
jest.mock('../js/formulas', () => ({level: () => 1}));
jest.mock('../js/looperlandsplatformclient', () => ({LooperLandsPlatformClient: class {}}));
jest.mock('../js/lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('../js/lib/class'), 'utf8'), {exports});
    return exports;
});
global.Types = {};
global.dialogues = [];
global.quests = [];
const Types = require('../../shared/js/gametypes');
const DialogueController = require('../js/dialoguecontroller');
require('../world-definitions').register();
const registry = require('../js/quests/quests');
const picnic = require('./lantern-picnic');
picnic.install();

function setup(saved) {
    const records = new Map([['one', saved || {nftId: 'local-test-avatar', xp: 100,
        gameData: {quests: {}, choices: [], mobKills: {}, items: {}}}]]);
    const cache = {get: key => records.get(key), set: (key, data) => records.set(key, data)};
    const dialogue = new DialogueController(cache, {});
    const talk = npc => dialogue.processDialogueTree('main', npc, cache, 'one');
    const choose = (npc, node) => { dialogue.goto('main', npc, node, cache, 'one'); return talk(npc); };
    const data = records.get('one');
    return {data, cache, talk, choose};
}

test.each([[picnic.SHARE, 'share', 'shared', picnic.QUIET, 'quiet'],
    [picnic.RETURN, 'return', 'returned', picnic.MUSIC, 'music']])(
    'the existing engine drives all three quests for basket choice %s',
    (basketChoice, basketNode, reportNode, picnicChoice, inviteNode) => {
        const {data, talk, choose} = setup();
        const adam = Types.Entities.VILLAGER, bstrat = Types.Entities.VILLAGEGIRL, watch = Types.Entities.GUARD;
        expect(talk(bstrat).text).toContain('start by speaking to Ordinary Adam');
        expect(talk(watch).text.join(' ')).toContain('Help Adam first');
        talk(adam); choose(adam, 'accept');
        expect(registry.hasQuest(picnic.BASKET, data)).toBe(true);
        expect(talk(bstrat).options).toHaveLength(2);
        choose(bstrat, basketNode);
        expect(data.gameData.choices).toContain(basketChoice);
        expect(talk(adam).options).toHaveLength(1);
        choose(adam, reportNode);
        expect(registry.hasCompletedQuest(picnic.BASKET, data)).toBe(true);
        expect(data.gameData.quests.IN_PROGRESS).toHaveLength(0);
        expect(data.gameData.quests.COMPLETED.filter(quest => quest.questKey === picnic.BASKET)).toHaveLength(1);
        expect(talk(watch).options[0].goto).toBe('accept');
        choose(watch, 'accept');
        data.gameData.mobKills[Types.Entities.RAT] = 2;
        expect(talk(watch).options).toBeUndefined();
        data.gameData.mobKills[Types.Entities.RAT] = 3;
        expect(talk(watch).options[0].goto).toBe('finish');
        choose(watch, 'finish');
        expect(registry.hasCompletedQuest(picnic.SAFETY, data)).toBe(true);
        expect(talk(bstrat).options).toHaveLength(2);
        choose(bstrat, inviteNode);
        expect(registry.hasCompletedQuest(picnic.INVITE, data)).toBe(true);
        expect(data.gameData.choices).toContain(picnicChoice);
        expect(picnic.progress(data.gameData)).toContain('Picnic ready');
        const returning = setup(JSON.parse(JSON.stringify(data)));
        expect(returning.talk(watch).text).toContain(picnicChoice === picnic.QUIET ? 'quiet picnic' : 'join the songs');
        expect(returning.talk(adam).text).toContain(basketChoice === picnic.SHARE ? 'sharing idea' : 'return my basket');
        expect(returning.data.gameData.quests.COMPLETED).toHaveLength(3);
        expect(setup().talk(watch).text.join(' ')).toContain('Help Adam first');
    });

test('story guidance explains the next action and rat count for each stage', () => {
    expect(picnic.progress()).toContain('Start with Ordinary Adam');
    expect(picnic.progress({quests: {IN_PROGRESS: [{questKey: picnic.SAFETY}]}, mobKills: {[Types.Entities.RAT]: 2}})).toContain('2/3');
});

test('choice questions include the reasons as well as the question in the existing popup', () => {
    for (const dialogue of picnic.dialogues) {
        for (const node of Object.values(dialogue.nodes)) {
            if (node.options) expect(typeof node.text).toBe('string');
        }
    }
    expect(picnic.dialogues[0].nodes.welcome.text).toContain('That is why I keep walking');
    expect(picnic.dialogues[1].nodes.basket.text).toContain('blankets');
});

test('quest completion is idempotent and finished quests do not get offered again', () => {
    const {data, cache, talk, choose} = setup();
    talk(Types.Entities.VILLAGER);
    choose(Types.Entities.VILLAGER, 'accept');
    registry.completeQuest(cache, 'one', picnic.BASKET);
    registry.completeQuest(cache, 'one', picnic.BASKET);
    expect(data.gameData.quests.COMPLETED).toHaveLength(1);
    expect(data.gameData.quests.IN_PROGRESS).toHaveLength(0);
    data.gameData.quests.FINISHED = data.gameData.quests.COMPLETED;
    data.gameData.quests.COMPLETED = [];
    expect(registry.hasCompletedQuest(picnic.BASKET, data)).toBe(true);
    expect(registry.newQuest(cache, 'one', picnic.BASKET)).toBe('');
});

test('other guards do not inherit the placed watch dialogue', () => {
    const controller = new DialogueController(new Map(), {});
    expect(controller.findDialogueTree('main', Types.Entities.GUARD, 'placed:other')).toBeNull();
    expect(controller.findDialogueTree('main', Types.Entities.GUARD, 'town-watch').key).toBe('town-watch');
});

test('forged nodes cannot finish the picnic or record choices', () => {
    const {data, cache} = setup();
    const controller = new DialogueController(cache, {});
    controller.processDialogueTree('main', Types.Entities.VILLAGEGIRL, cache, 'one', 'town-neighbour');
    expect(controller.goto('main', Types.Entities.VILLAGEGIRL, 'music', cache, 'one', 'town-neighbour')).toBe(false);
    expect(controller.goto('main', Types.Entities.VILLAGER, 'accept', cache, 'one', 'town-gardener')).toBe(false);
    expect(data.gameData.choices).toEqual([]);
    expect(data.gameData.quests).toEqual({});
});

test('one player returning a quest never mutates a shared definition or another player', () => {
    const Consumer = require('../js/quests/playerquesteventconsumer').PlayerQuestEventConsumer;
    const consumer = new Consumer();
    const first = {nftId: 'one', gameData: {mobKills: {[Types.Entities.RAT]: 3}, quests: {IN_PROGRESS: [{questKey: picnic.SAFETY}]}}};
    const second = {nftId: 'two', gameData: {mobKills: {}, quests: {IN_PROGRESS: [{questKey: picnic.SAFETY}]}}};
    consumer.consume({eventType: 'KILL_MOB', playerCache: first});
    consumer.consume({eventType: 'KILL_MOB', playerCache: second});
    expect(first.gameData.quests.IN_PROGRESS[0].completed).toBe(true);
    expect(second.gameData.quests.IN_PROGRESS[0].completed).toBeUndefined();
    expect(registry.questsByID[picnic.SAFETY].completed).toBeUndefined();
    expect(registry.questsByID[picnic.SAFETY].done).toBeUndefined();
});

test('the production cloning cache preserves all picnic progress across dialogue transitions and reconnects', () => {
    const NodeCache = require('node-cache');
    const cache = new NodeCache();
    cache.set('saved', {nftId: 'saved-avatar', xp: 100, gameData: {quests: {}, choices: [], mobKills: {}, items: {}}});
    const controller = new DialogueController(cache, {});
    const talk = (kind, key) => controller.processDialogueTree('main', kind, cache, 'saved', key);
    const choose = (kind, key, node) => {
        expect(controller.goto('main', kind, node, cache, 'saved', key)).toBe(true);
        return talk(kind, key);
    };
    const adam = Types.Entities.VILLAGER, girl = Types.Entities.VILLAGEGIRL, guard = Types.Entities.GUARD;
    talk(adam, 'town-gardener'); choose(adam, 'town-gardener', 'accept');
    expect(registry.hasQuest(picnic.BASKET, cache.get('saved'))).toBe(true);
    talk(girl, 'town-neighbour'); choose(girl, 'town-neighbour', 'share');
    talk(adam, 'town-gardener'); choose(adam, 'town-gardener', 'shared');
    talk(guard, 'town-watch'); choose(guard, 'town-watch', 'accept');
    const session = cache.get('saved'); session.gameData.mobKills[Types.Entities.RAT] = 3; cache.set('saved', session);
    talk(guard, 'town-watch'); choose(guard, 'town-watch', 'finish');
    talk(girl, 'town-neighbour'); choose(girl, 'town-neighbour', 'quiet');
    const saved = cache.get('saved');
    expect(saved.gameData.quests.COMPLETED.map(q => q.questKey)).toEqual([picnic.BASKET, picnic.SAFETY, picnic.INVITE]);
    expect(saved.gameData.quests.IN_PROGRESS).toEqual([]);
    expect(saved.gameData.choices).toEqual(expect.arrayContaining([picnic.SHARE, picnic.FOUND, picnic.QUIET]));
    saved.currentNpc = null; saved.currentNode = null; cache.set('saved', saved);
    expect(talk(guard, 'town-watch').text).toContain('quiet picnic');
});

global.Types = {}; global.quests = [];
jest.mock('../js/message', () => ({}));
jest.mock('../js/discord', () => ({sendToDevChannel: jest.fn()}));
jest.mock('../js/dao', () => ({setQuestStatus: jest.fn(), updateResourceBalance: jest.fn(), saveLootEvent: jest.fn(), saveMobKillEvent: jest.fn(), registerChoice: jest.fn(async () => ({}))}));
jest.mock('../js/formulas', () => ({level: xp => xp}));
jest.mock('../js/looperlandsplatformclient', () => ({LooperLandsPlatformClient: class {getFreeRental = jest.fn();}}));
jest.mock('../js/collectables', () => ({isCollectable: kind => kind === 999, getCollectItem: () => 50000010, getCollectAmount: () => 2}));
const {ids: Q, choices: C, actors: A, quests: definitions} = require('./lantern-friendship');
const {dialogues} = require('./lantern-friendship-dialogue');
const picnic = require('./lantern-picnic');
const registry = require('../js/worlddefinitions').definitions;
registry.register('main', {id: 'fixture', quests: [...picnic.quests, ...definitions], dialogues});
const quests = require('../js/quests/quests');
const objectives = require('../js/quests/objectives');
const dao = require('../js/dao');
const Dialogue = require('../js/dialoguecontroller');
const {PlayerEventBroker} = require('../js/quests/playereventbroker');
const WOOD = 50000010;
let cache;
function setup(id = 'one', history = true) {
    const data = {nftId: id, walletId: id, xp: 40, gameData: {quests: history ? {FINISHED: [{id: picnic.INVITE}]} : {}, choices: [], items: {}, mobKills: {7: 200}}};
    cache.set(id, data);
    const player = {nftId: id, sessionId: id, server: {server: {cache}, npcBehavior: {react: jest.fn()}}, handleCompletedQuests: jest.fn()};
    const broker = new PlayerEventBroker(player); broker.setPlayer(player);
    const dialogue = new Dialogue(cache);
    const tree = who => dialogues.find(d => d.key === A[who].npcKey);
    const session = () => cache.get(id);
    const action = (who, name) => {
        const node = tree(who).nodes['friendship:' + name];
        if (!node) throw new Error('Missing node ' + name);
        dialogue.handleNodeActions(node.actions || [], cache, id, session());
    };
    const home = who => {
        const current = session(); current.currentNode = null; cache.set(id, current);
        return dialogue.processDialogueTree('main', A[who].npc, cache, id, A[who].npcKey);
    };
    const reply = (who, pattern) => {
        const node = home(who), opt = node.options?.find(o => o.text.includes(pattern));
        if (!opt) throw new Error('Missing reply: ' + pattern + ' in ' + JSON.stringify(node));
        expect(dialogue.goto('main', A[who].npc, opt.goto, cache, id, A[who].npcKey)).toBe(true);
        return dialogue.processDialogueTree('main', A[who].npc, cache, id, A[who].npcKey);
    };
    return {id, session, dialogue, action, home, reply, broker, player,
        accept: q => quests.newQuest(cache, id, q), done: q => quests.hasCompletedQuest(q, session()),
        talk: who => broker.npcTalked(A[who].npc, '', A[who].npcKey), visit: name => broker.enteredArea({name})};
}
async function throughQ2(s, preference = 'listen') {
    s.reply('bstrat', 'Was Rowan'); await s.talk('adam'); await s.talk('watch'); await s.talk('bstrat');
    s.reply('bstrat', "I'll ask Rowan"); expect(s.done(Q.EMPTY_PLACE)).toBe(true);
    s.reply('bstrat', 'Where can I'); await s.visit('Forest'); await s.talk('rowan');
    s.reply('rowan', preference === 'listen' ? 'No errand' : 'Bstrat missed');
    s.reply('rowan', 'May I tell'); expect(s.done(Q.MESSENGER)).toBe(true);
}
async function parcel(s) {
    s.reply('rowan', 'What does your lantern'); s.reply('rowan', 'Tell me about');
    await s.visit('Beach'); await s.talk('jimi'); s.reply('jimi', 'Do you remember');
    await s.visit('Town'); await s.talk('adam'); s.reply('adam', 'Ask about the marked');
    s.action('adam', 'parcel-solved'); expect(s.done(Q.LIGHT)).toBe(true); expect(s.session().gameData.items[WOOD]).toBe(3);
}
async function wood(s) {
    s.reply('adam', 'Take the wood'); await s.visit('Forest'); await s.talk('rowan');
    expect(s.done(Q.SHORE)).toBe(false); s.reply('rowan', 'Give Rowan three wood');
    expect(s.done(Q.SHORE)).toBe(true); expect(s.session().gameData.items[WOOD]).toBe(0);
}
async function comparison(s, preference = 'apology') {
    s.reply('bstrat', 'Can we clear'); await s.talk('adam'); s.reply('adam', 'What did you assume');
    await s.talk('bstrat'); s.action('bstrat', 'covered'); await s.talk('watch'); s.action('watch', 'requested');
    await s.talk('bstrat'); s.action('bstrat', 'understood'); s.action('bstrat', preference); s.reply('bstrat', 'I will carry');
    expect(s.done(Q.NAME)).toBe(true);
}
beforeEach(() => {cache = new Map(); jest.clearAllMocks(); dao.registerChoice.mockResolvedValue({}); PlayerEventBroker.pending.clear(); PlayerEventBroker.playerEventBrokers = {};});
test.each(['id', 'questKey'])('historical %s saves and both completion states unlock the prologue gate', format => {
    for (const state of ['FINISHED', 'COMPLETED']) {
        const s = setup(state); s.session().gameData.quests = {[state]: [{[format]: picnic.INVITE}]};
        s.reply('bstrat', 'Was Rowan'); expect(quests.hasQuest(Q.EMPTY_PLACE, s.session())).toBe(true);
    }
});
test('new saves cannot hand out any chapter or mutate clues through direct/repeated actions', () => {
    const s = setup('new', false);
    for (const who of Object.keys(A)) for (const name of Object.keys(dialogues.find(d => d.key === A[who].npcKey).nodes).filter(n => n.startsWith('friendship:'))) s.action(who, name.slice(11));
    for (const q of definitions) s.accept(q.id);
    expect(s.session().gameData.quests).toEqual({}); expect(s.session().gameData.choices).toEqual([]); expect(dao.updateResourceBalance).not.toHaveBeenCalled();
    expect(s.home('bstrat').text).toContain('borrowed');
});
test.each([['listen', 'apology', 'apology'], ['direct', 'invite-first', 'invitation']])('full authored chain %s / %s uses personal real inventory and explicit acceptance', async (listening, invitation, answer) => {
    const s = setup(); await throughQ2(s, listening); await parcel(s); await wood(s); await comparison(s, invitation);
    s.reply('bstrat', 'I am ready'); await s.visit('Forest'); await s.talk('rowan'); await s.visit('Town'); await s.talk('bstrat');
    expect(s.home('bstrat').options.some(o => o.text.startsWith('Rowan says'))).toBe(false);
    s.action('rowan', 'accept-' + answer); s.reply('bstrat', 'Rowan says'); expect(s.done(Q.STAY)).toBe(true);
    expect(s.home('rowan').options.some(o => o.text === 'Are you glad you said yes?')).toBe(true);
    expect(s.session().gameData.quests.COMPLETED).toHaveLength(6);
    expect(dao.updateResourceBalance.mock.calls).toEqual([['one', WOOD, 3], ['one', WOOD, -3]]);
});
test('parcel requires all three clues, wrong answers change nothing, reward cannot repeat after reconnect', async () => {
    const s = setup(); await throughQ2(s); s.reply('rowan', 'What does your lantern');
    await s.visit('Beach'); await s.talk('jimi'); await s.visit('Town'); await s.talk('adam');
    s.action('adam', 'parcel-solved'); expect(s.done(Q.LIGHT)).toBe(false);
    s.action('rowan', 'project'); s.action('jimi', 'drawing'); s.action('adam', 'parcel');
    const before = JSON.stringify(s.session()); s.action('adam', 'basket'); s.action('adam', 'likeness'); expect(JSON.stringify(s.session())).toBe(before);
    await Promise.all([Promise.resolve().then(() => s.action('adam', 'parcel-solved')), Promise.resolve().then(() => s.action('adam', 'parcel-solved'))]);
    cache.set(s.id, JSON.parse(JSON.stringify(s.session()))); s.action('adam', 'parcel-solved');
    expect(s.session().gameData.items[WOOD]).toBe(3); expect(dao.updateResourceBalance).toHaveBeenCalledTimes(1);
});
test('hand-in rechecks spent wood, debits exactly once and never issues a replacement gift', async () => {
    const s = setup(); await throughQ2(s); await parcel(s); s.reply('adam', 'Take the wood'); await s.visit('Forest'); await s.talk('rowan');
    s.session().gameData.items[WOOD] = 1;
    const handin = Object.keys(dialogues.find(d => d.key === A.rowan.npcKey).nodes).find(n => n.includes('finish-' + Q.SHORE));
    s.action('rowan', handin.slice(11)); expect(s.done(Q.SHORE)).toBe(false); expect(s.session().gameData.items[WOOD]).toBe(1);
    await s.broker.lootEvent({kind: 999}, 1); expect(s.session().gameData.items[WOOD]).toBe(3);
    await Promise.all([Promise.resolve().then(() => s.action('rowan', handin.slice(11))), Promise.resolve().then(() => s.action('rowan', handin.slice(11)))]);
    expect(s.session().gameData.items[WOOD]).toBe(0); expect(dao.updateResourceBalance.mock.calls.filter(c => c[2] === -3)).toHaveLength(1);
});
test('ordered contacts need exact actors; early visits and failed progress writes do not advance', async () => {
    const s = setup(); await s.visit('Forest'); s.accept(Q.EMPTY_PLACE); await s.talk('watch');
    await s.broker.npcTalked(A.adam.npc, '', 'another-adam');
    expect(objectives.progress(s.session().gameData, definitions[0]).every(o => !o.done)).toBe(true);
    dao.registerChoice.mockResolvedValueOnce(undefined); await expect(s.talk('adam')).rejects.toThrow('Could not save');
    expect(objectives.progress(s.session().gameData, definitions[0])[0].done).toBe(false); await s.talk('adam');
    expect(objectives.progress(s.session().gameData, definitions[0])[0].done).toBe(true);
});
test('two avatars keep clues and locked preferences independent; contradictory flags display first authored choice', async () => {
    const one = setup(), two = setup('two'); await throughQ2(one); await throughQ2(two, 'direct');
    one.action('rowan', 'direct'); expect(one.session().gameData.choices).not.toContain(C['ask-directly']);
    expect(two.session().gameData.choices).not.toContain(C['listen-first']);
    one.session().gameData.choices.push(C['ask-directly'], C['apology-first'], C['invitation-first']);
    one.session().currentNode = 'friendship:coda-listening'; one.session().currentNpc = A.rowan.npc; one.session().currentNpcKey = A.rowan.npcKey;
    expect(one.dialogue.processDialogueTree('main', A.rowan.npc, cache, one.id, A.rowan.npcKey).text).toContain('gave me time');
});
test('cover, meeting, correct explanation and preference all gate Q5 even with completed contact objectives', async () => {
    const s = setup(); await throughQ2(s); await parcel(s); await wood(s); s.accept(Q.NAME);
    await s.talk('adam'); await s.talk('bstrat'); await s.talk('watch'); await s.talk('bstrat');
    for (const name of ['covered', 'understood', 'apology']) s.action('bstrat', name);
    s.action('watch', 'requested'); expect(s.session().gameData.choices).not.toContain(C['compare-requested']);
    s.action('adam', 'account'); s.action('bstrat', 'covered'); s.action('watch', 'requested');
    s.action('bstrat', 'lost'); s.action('bstrat', 'deliberate'); s.action('bstrat', 'apology'); expect(s.session().gameData.choices).not.toContain(C['apology-first']);
    s.action('bstrat', 'understood'); s.action('bstrat', 'apology'); s.action('bstrat', 'invite-first');
    expect(s.session().gameData.choices).not.toContain(C['invitation-first']); s.reply('bstrat', 'I will carry'); expect(s.done(Q.NAME)).toBe(true);
});
test('optional Beach kills and new wood collection stay outside the main prerequisites', async () => {
    const s = setup(); await throughQ2(s); await s.broker.killMobEvent({kind: 7, x: 70, y: 290}); s.accept(Q.SHORE_SPACE);
    await s.broker.killMobEvent({kind: 7, x: 70, y: 200}); expect(objectives.progress(s.session().gameData, definitions[6])[0].count).toBe(0);
    await Promise.all([s.broker.killMobEvent({kind: 7, x: 70, y: 290}), s.broker.killMobEvent({kind: 7, x: 70, y: 291})]);
    await s.talk('jimi'); s.reply('jimi', 'Report on'); expect(s.done(Q.SHORE_SPACE)).toBe(true);
    await parcel(s); await wood(s); s.accept(Q.SPARE_WOOD); await s.broker.lootEvent({kind: WOOD}, 2);
    expect(objectives.progress(s.session().gameData, definitions[7])[1].count).toBe(0); await s.visit('Forest'); await s.broker.lootEvent({kind: WOOD}, 2);
    await s.talk('adam'); expect(s.done(Q.SPARE_WOOD)).toBe(true); expect(s.session().gameData.items[WOOD]).toBe(2);
});
test('keyed Watch preserves the legacy NPC fallback, picnic nodes survive, and Jimi has a legacy quest escape', () => {
    const d = new Dialogue(cache); expect(d.findDialogueTree('main', A.watch.npc, 'another-watch')).toBeNull();
    expect(d.findDialogueTree('main', A.watch.npc, A.watch.npcKey).key).toBe(A.watch.npcKey);
    picnic.dialogues.forEach(p => {const tree = dialogues.find(d => d.key === p.key); Object.entries(p.nodes).forEach(([key, node]) => expect(tree.nodes[key]).toEqual(node));});
    expect(dialogues.find(d => d.key === A.jimi.npcKey).nodes['friendship:jobs']).toEqual({legacyQuests: true});
});

test('missing and contradictory historical choices keep neutral or first-authored private recall without changing saved flags', () => {
    const s = setup(); expect(s.home('bstrat').text).not.toContain('quiet picnic');
    s.session().gameData.choices = [picnic.MUSIC, picnic.QUIET, picnic.SHARE, picnic.RETURN];
    const before = [...s.session().gameData.choices];
    expect(s.home('bstrat').text).toContain('quiet picnic');
    expect(s.reply('bstrat', 'Remember the Lantern Picnic').text).toContain('quiet picnic');
    expect(s.home('adam').text).toContain('return my basket');
    expect(s.session().gameData.choices).toEqual(before);
});

test('the production cloning cache carries the complete friendship chain and inventory across replies', async () => {
    const NodeCache = require('node-cache'); cache = new NodeCache({checkperiod: 0});
    const s = setup(); await throughQ2(s); await parcel(s); await wood(s); await comparison(s);
    s.reply('bstrat', 'I am ready'); await s.visit('Forest'); await s.talk('rowan');
    s.action('rowan', 'accept-apology'); await s.visit('Town'); await s.talk('bstrat');
    s.reply('bstrat', 'Rowan says'); expect(s.done(Q.STAY)).toBe(true);
    expect(s.session().gameData.items[WOOD]).toBe(0);
    expect(s.session().gameData.choices).toEqual(expect.arrayContaining([C['listen-first'], C['apology-first'], C['rowan-accepted']]));
    cache.close();
});

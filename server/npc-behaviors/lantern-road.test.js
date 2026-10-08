global.Types = {}; global.quests = [];
jest.mock('../js/dao', () => ({setQuestStatus: jest.fn(), registerChoice: jest.fn(), updateResourceBalance: jest.fn()}));
jest.mock('../js/discord', () => ({sendToDevChannel: jest.fn()}));
jest.mock('../js/formulas', () => ({level: () => 1}));
jest.mock('../js/looperlandsplatformclient', () => ({LooperLandsPlatformClient: class {}}));
jest.mock('../js/lib/class', () => {
    const exports = {};
    require('vm').runInNewContext(require('fs').readFileSync(require.resolve('../js/lib/class'), 'utf8'), {exports});
    return exports;
});
const content = require('./lantern-road'), state = require('./lantern-road-state'), picnic = require('./lantern-picnic');
const Types = require('../../shared/js/gametypes');
const registry = require('../js/quests/quests'), dao = require('../js/dao');
const DialogueController = require('../js/dialoguecontroller');
const {LanternRoadController} = require('../js/lanternroadcontroller');
const {NpcBehavior} = require('../js/npcbehavior');
const {NpcMemory} = require('../js/npcmemory');
const ServerMap = require('../js/map');
const rawMap = require('../maps/world_server_main.json');
const clone = value => structuredClone(value);
function prologue(legacy = false, music = false) {
    return {quests: {[legacy ? 'FINISHED' : 'COMPLETED']: [picnic.BASKET, picnic.SAFETY, picnic.INVITE].map(id => legacy ? {id} : {questKey: id})},
        choices: [music ? picnic.MUSIC : picnic.QUIET, music ? picnic.RETURN : picnic.SHARE], items: {}, mobKills: {}};
}
function setup(saved = prologue(), extra = {}) {
    const sessions = new Map([['one', {nftId: 'avatar-one', xp: 100, gameData: clone(saved)}],
        ['two', {nftId: 'avatar-two', xp: 100, gameData: prologue(false, true)}]]);
    const cache = {get: id => sessions.has(id) ? clone(sessions.get(id)) : undefined, set: (id, value) => sessions.set(id, clone(value))};
    const persisted = new Map([...sessions.values()].map(session => [session.nftId, clone(session.gameData)]));
    dao.setQuestStatus.mockImplementation((nft, id, status) => {
        const data = persisted.get(nft); data.quests.IN_PROGRESS = (data.quests.IN_PROGRESS || []).filter(q => (q.questKey || q.id) !== id);
        data.quests[status] = [...(data.quests[status] || []).filter(q => (q.questKey || q.id) !== id), {questKey: id}];
        return Promise.resolve({success: true});
    });
    dao.registerChoice.mockImplementation((nft, flag) => {
        const data = persisted.get(nft); if (!data.choices.includes(flag)) data.choices.push(flag);
        return Promise.resolve({success: true});
    });
    const map = Object.create(ServerMap.prototype); map.initMap(clone(rawMap)); map.generateCollisionGrid();
    const npcs = {};
    for (const [tid, kind] of Object.entries(rawMap.staticEntities)) {
        if (Types.isNpc(Types.getKindFromString(kind))) {
            const pos = map.tileIndexToGridPosition(Number(tid));
            const id = '8' + (pos.x + 1) + pos.y;
            npcs[id] = {id, x: pos.x + 1, y: pos.y, kind: Types.getKindFromString(kind), type: 'npc'};
        }
    }
    const player = {id: 1, nftId: 'avatar-one', sessionId: 'one', x: 42, y: 216, hasEnteredGame: true, isBot: () => false,
        clearTarget: jest.fn(), broadcast: jest.fn(), setPosition(x, y) {this.x = x; this.y = y;}};
    const other = {...player, id: 2, nftId: 'avatar-two', sessionId: 'two'};
    const world = {id: 'world_main', map, npcs, players: {1: player, 2: other}, entities: {...npcs, 1: player, 2: other}, server: {cache},
        addNpc: (kind, x, y) => {const npc = {id: '8' + x + y, kind, x, y, type: 'npc'}; npcs[npc.id] = npc; world.entities[npc.id] = npc; return npc;},
        isValidPosition: (x, y) => !map.isOutOfBounds(x, y) && !map.isColliding(x, y),
        pushToPlayer: jest.fn(), pushToAdjacentGroups: jest.fn(), handlePlayerVanish: jest.fn(), pushRelevantEntityListTo: jest.fn(),
        ...extra};
    world.npcBehavior = new NpcBehavior(world, clone(picnic.behavior), new NpcMemory());
    const road = new LanternRoadController(world), dialogue = new DialogueController(cache, {});
    const talk = (q, session = 'one') => dialogue.processDialogueTree('main', q.npc, cache, session, q.npcKey);
    const choose = (q, node, session = 'one') => {
        expect(dialogue.goto('main', q.npc, node, cache, session, q.npcKey)).toBe(true);
        return talk(q, session);
    };
    return {sessions, cache, persisted, world, player, other, road, dialogue, talk, choose};
}
beforeEach(() => jest.clearAllMocks());

test.each([0, 1])('the complete campaign and optional stories resume from old picnic saves, route %s', async branch => {
    const fixture = setup(prologue(true, !!branch));
    const {cache, player, road, talk, choose, persisted} = fixture;
    expect(state.journal(cache.get('one').gameData).quests.map(q => q.id)).toEqual(expect.arrayContaining(['LANTERN_WRECK_LETTERS', 'LANTERN_FOREST_MARKERS']));
    for (const q of content.quests) {
        expect(state.unlocked(cache.get('one').gameData, q)).toBe(true);
        const menu = talk(q);
        expect(menu.options.some(o => o.goto === q.id + ':offer')).toBe(true);
        choose(q, q.id + ':offer'); choose(q, q.id + ':accept');
        expect(state.active(cache.get('one').gameData, q.id)).toBe(true);
        expect(road.packet(player).story.quests.some(entry => entry.id === q.id && entry.active)).toBe(true);
        expect(fixture.dialogue.goto('main', q.npc, q.id + ':finish:0', cache, 'one', q.npcKey)).toBe(false);
        for (const objective of state.progress(cache.get('one').gameData, q)) {
            player.x = objective.x; player.y = objective.y;
            const result = await road.inspect(player, q.id + ':' + objective.key);
            expect(result.text).toBe(objective.result);
            expect(road.packet(player).story.event).toBe(objective.result);
        }
        talk(q); const response = choose(q, q.id + ':progress');
        expect(response.options.some(o => o.goto === q.id + ':finish:' + (q.choices ? branch : 0))).toBe(true);
        choose(q, q.id + ':finish:' + (q.choices ? branch : 0));
        expect(state.done(cache.get('one').gameData, q.id)).toBe(true);
        expect(state.active(cache.get('one').gameData, q.id)).toBe(false);
        // Simulate a new backend-loaded session after every single quest.
        const session = cache.get('one'); session.gameData = clone(persisted.get(player.nftId)); session.currentNode = null; session.currentNpc = null; cache.set('one', session);
        expect(state.done(cache.get('one').gameData, q.id)).toBe(true);
    }
    const data = cache.get('one').gameData;
    expect(Object.values(data.quests).flat()).toHaveLength(35);
    expect(data.quests.FINISHED).toHaveLength(3);
    expect(state.journal(data).chapter).toBe('The road is open');
    expect(state.journal(data).quests).toEqual([]);
    expect(road.packet(player).finalePicnic).toMatchObject({longTable: true, golden: true, keepsake: true, watchRelief: true, music: !!branch});
    const callback = LanternRoadController.decorate({storyConclusion: 'LANTERN_LONG_TABLE', text: 'The table is ready.'}, cache.get('one'));
    expect(callback.text).toContain(branch ? 'Rowan taught new keepers' : 'Rowan returned as a keeper');
    expect(callback.text).toContain('relief patrol');
    expect(callback.text).toContain('private messages');
    expect(callback.text).toContain('personal invitation');
});

test('a completed coast alone does not unlock the graveyard; parallel forest progress is also required', () => {
    const {cache, dialogue, talk} = setup();
    const q = content.quests.find(q => q.id === 'LANTERN_STONE_NAMES');
    const session = cache.get('one'); session.gameData.quests.COMPLETED.push({questKey: 'LANTERN_COAST_SIGNAL'}); cache.set('one', session);
    expect(state.unlocked(session.gameData, q)).toBe(false);
    expect(registry.newQuest(cache, 'one', q.id)).toBe('');
    expect(talk(q).options.some(o => o.goto === q.id + ':offer')).toBe(false);
    expect(dialogue.goto('main', q.npc, q.id + ':accept', cache, 'one', q.npcKey)).toBe(false);
});

test('discoveries and personal repairs never leak into the other character or baseline map layers', async () => {
    const {cache, road, player, other, world} = setup();
    const q = content.quests[0], o = q.objectives[0];
    registry.newQuest(cache, 'one', q.id);
    await expect(road.inspect(other, q.id + ':' + o.key)).rejects.toThrow('not available');
    await expect(road.inspect(player, q.id + ':' + o.key)).rejects.toThrow('not available');
    player.x = o.x; player.y = o.y;
    await Promise.all([road.inspect(player, q.id + ':' + o.key), road.inspect(player, q.id + ':' + o.key)]);
    expect(dao.registerChoice).toHaveBeenCalledTimes(1);
    expect(state.ready(cache.get('one').gameData, q)).toBe(true);
    expect(state.ready(cache.get('two').gameData, q)).toBe(false);
    const first = cache.get('one'); first.gameData.quests.COMPLETED.push({questKey: 'LANTERN_COAST_SIGNAL'}); cache.set('one', first);
    expect(road.packet(player).storyScenery.some(o => o.label === 'Coastal signal restored')).toBe(true);
    expect(road.packet(other).storyScenery.some(o => o.label === 'Coastal signal restored')).toBe(false);
    expect(world.map.toggledLayers).toEqual({});
});

test('the wrong caravan branch and dead, disconnected or unauthorised discovery requests are rejected', async () => {
    const {cache, road, player, world} = setup();
    const q = content.quests.find(q => q.id === 'LANTERN_ROAD_WE_TAKE');
    const session = cache.get('one'); session.gameData.quests.IN_PROGRESS = [{questKey: q.id}]; session.gameData.choices.push('lantern:caravan-detour'); cache.set('one', session);
    player.x = 44; player.y = 77;
    await expect(road.inspect(player, q.id + ':direct')).rejects.toThrow();
    await expect(road.inspect(player, 'invented')).rejects.toThrow();
    player.isDead = true; await expect(road.inspect(player, q.id + ':detour')).rejects.toThrow('Enter the world');
    player.isDead = false; delete world.players[player.id]; await expect(road.inspect(player, q.id + ':detour')).rejects.toThrow('Enter the world');
});

test('a failed backend save leaves the discovery incomplete and a retry can save it', async () => {
    const {cache, road, player} = setup(); const q = content.quests[0], o = q.objectives[0];
    registry.newQuest(cache, 'one', q.id); player.x = o.x; player.y = o.y;
    dao.registerChoice.mockResolvedValueOnce(undefined);
    await expect(road.inspect(player, q.id + ':' + o.key)).rejects.toThrow('Could not save');
    expect(state.ready(cache.get('one').gameData, q)).toBe(false);
    await road.inspect(player, q.id + ':' + o.key);
    expect(state.ready(cache.get('one').gameData, q)).toBe(true);
});

test('main-map passages validate personal progress and server position, and update both ends of teleport transport', () => {
    const {road, player, other, world} = setup(); const gate = content.passages[0];
    expect(() => road.travel(player, gate.id)).toThrow('not available');
    player.x = gate.x; player.y = gate.y;
    expect(road.packet(player).story.passages.some(p => p.id === gate.id)).toBe(true);
    expect(road.travel(player, gate.id).text).toContain('main map');
    expect([player.x, player.y]).toEqual([gate.tx, gate.ty]);
    expect(world.pushToPlayer).toHaveBeenCalledWith(player, expect.anything());
    expect(player.broadcast).toHaveBeenCalled(); expect(world.handlePlayerVanish).toHaveBeenCalledWith(player);
    expect(world.pushRelevantEntityListTo).toHaveBeenCalledWith(player);
    other.x = gate.x; other.y = gate.y; other.isDead = true;
    expect(() => road.travel(other, gate.id)).toThrow();
    expect(() => road.travel(player, 'keeper-room')).toThrow();
});

test('journal packets are reused while unchanged, refresh on discoveries, and are removed on disconnect', () => {
    const {road, player, other} = setup();
    expect(road.packet(player)).toBe(road.packet(player));
    expect(road.packet(player)).not.toBe(road.packet(other));
    road.forget(player); expect(road.snapshots.has(player.id)).toBe(false);
    expect(state.journal({}).goal).toContain('Start with Ordinary Adam');
});

test('every authored objective and NPC is reachable on main without cross-map, event, NFT or collection gates', () => {
    const {world} = setup(); const width = world.map.width, height = world.map.height;
    const edges = new Map();
    const add = (x, y, tx, ty) => {const key = x + ',' + y; edges.set(key, [...(edges.get(key) || []), [tx, ty]]);};
    for (const door of rawMap.doors) if (!['tmap', 'ttid', 'tnft', 'tcollection', 'thttp_redirect'].some(k => door[k])) add(door.x, door.y, door.tx, door.ty);
    for (const p of content.passages) add(p.x, p.y, p.tx, p.ty);
    const seen = new Set(['42,215']), queue = [[42, 215]];
    for (let index = 0; index < queue.length; index++) {
        const [x, y] = queue[index];
        for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1], ...(edges.get(x+','+y) || [])]) {
            const key = nx + ',' + ny;
            if (nx > 0 && ny > 0 && nx < width && ny < height && !world.map.isColliding(nx, ny) && !seen.has(key)) {seen.add(key);queue.push([nx,ny]);}
        }
    }
    const unreachable = content.quests.flatMap(q => q.objectives.filter(o => !seen.has(o.x + ',' + o.y)).map(o => q.id + ':' + o.key + ' (' + o.x + ',' + o.y + ')'));
    expect(unreachable).toEqual([]);
    for (const npc of content.npcs) expect(seen.has(npc.x + ',' + npc.y)).toBe(true);
    expect(new Set([...picnic.quests, ...content.quests].map(q => q.id)).size).toBe(35);
    for (const q of content.quests) {
        expect(q.id.length).toBeLessThanOrEqual(100);
        for (const id of q.requiredQuests) expect(registry.questsByID[id]).toBeDefined();
    }
    expect(world.npcBehavior.routines.has('party-baker')).toBe(true);
});


test('Adam gives returning picnic players both onward leads, alongside their remembered choices', () => {
    const {talk} = setup();
    const node = talk({npc: Types.Entities.VILLAGER, npcKey: 'town-gardener'});
    expect(node.text).toContain('Jimi');
    expect(node.text).toContain('Mara');
    expect(node.text).toContain('either lead first');
    expect(node.text).toContain('Adam remembers your sharing idea');
});

test('coastal handoffs explain the next contact and the missing parallel forest report', () => {
    const {cache, talk} = setup();
    const first = content.quests[0];
    const data = cache.get('one').gameData;
    data.quests.COMPLETED.push({questKey: first.id});
    expect(state.handoff(data, first)).toContain('Windmill Scientist');
    expect(state.handoff(data, first)).toContain('The Mill Without a Light');
    const coast = content.quests.find(q => q.id === 'LANTERN_COAST_SIGNAL');
    data.quests.COMPLETED.push({questKey: coast.id});
    expect(state.handoff(data, coast)).toContain('Someone Is Still Waiting');
    expect(state.handoff(data, coast)).toContain('Mara');
    const session = cache.get('one'); session.gameData = data; cache.set('one', session);
    const vince = talk({npc: Types.Entities.PRIEST, npcKey: 'town-priest'});
    expect(vince.text).toContain('I am waiting for Someone Is Still Waiting');
    expect(vince.text).not.toContain('I am waiting for A Signal Across the Water');
    expect(vince.options.some(o => o.goto === 'LANTERN_STONE_NAMES:offer')).toBe(false);
    data.quests.COMPLETED.push({questKey: 'LANTERN_STILL_WAITING'});
    expect(state.handoff(data, coast)).toContain('Speak to Vince');
});

test('offers and remembered reactions respect each character\'s route and memorial choices', () => {
    const {cache, talk, choose} = setup();
    const q = content.quests.find(q => q.id === 'LANTERN_ROAD_WE_TAKE');
    const session = cache.get('one');
    session.gameData.quests.COMPLETED.push({questKey: 'LANTERN_LAST_DELIVERY'});
    session.gameData.choices.push('lantern:caravan-detour', 'lantern:private-memorial');
    cache.set('one', session);
    const menu = talk(q);
    expect(menu.text).toContain('choosing shelter');
    const offer = choose(q, q.id + ':offer');
    expect(offer.text).toContain(q.objectives[0].label);
    expect(offer.text).not.toContain(q.objectives[1].label);
    const vince = talk({npc: Types.Entities.PRIEST, npcKey: 'town-priest'});
    expect(vince.text).toContain('keep Elian\'s personal words private');
    expect(vince.text).not.toContain('explain the memorial names to visitors');
    const other = talk(q, 'two');
    expect(other.text).not.toContain('choosing shelter');
    expect(other.text).toContain('I am waiting for');
});

test('journal knowledge progresses without revealing the keeper\'s future early', () => {
    const data = prologue();
    expect(state.journal(data).known).not.toContain('regulator');
    const steps = [
        ['LANTERN_LAST_DELIVERY', 'dispatch'],
        ['LANTERN_MISSING_REGULATOR', 'Fitting it'],
        ['LANTERN_ROWAN_PROTECTED', 'Gauntlet'],
        ['LANTERN_KEEPER_CHOICE', 'shared watch'],
        ['LANTERN_LIGHT_SHARED', 'invitations'],
        ['LANTERN_LONG_TABLE', 'one table']
    ];
    for (const [id, fact] of steps) {
        data.quests.COMPLETED.push({questKey: id});
        expect(state.journal(data).known).toContain(fact);
    }
    data.quests.COMPLETED = data.quests.COMPLETED.filter(q => !['LANTERN_LIGHT_SHARED', 'LANTERN_LONG_TABLE'].includes(q.questKey));
    data.choices.push('lantern:rowan-handover');
    expect(state.journal(data).known).toContain('teach new keepers');
});


test('regional NPCs greet from saved evidence even on a server with no recognition memory', () => {
    const {world, cache, player, other} = setup();
    const q = content.quests.find(q => q.id === 'LANTERN_STILL_WAITING');
    const session = cache.get('one');
    session.gameData.quests.COMPLETED.push(...['LANTERN_FOREST_MARKERS', 'LANTERN_KEEPER_KNOTS', q.id].map(questKey => ({questKey})));
    cache.set('one', session);
    const mara = world.npcBehavior.routines.get('forest-caretaker');
    expect(mara).toBeDefined();
    expect(world.npcBehavior.memory.has('main', mara.definition.key, player, 'met')).toBe(false);
    expect(world.npcBehavior.line(mara, 'greeting', player)).toBe(q.conclusion);
    expect(world.npcBehavior.line(mara, 'greeting', other)).toContain('stopped sending invitations');
    const adam = world.npcBehavior.routines.get('town-gardener');
    expect(world.npcBehavior.line(adam, 'greeting', player)).toContain('quiet picnic');
    expect(world.npcBehavior.line(adam, 'greeting', other)).toContain('music');
    const response = LanternRoadController.decorate({storyMenu: 'forest-caretaker'}, cache.get('one'));
    expect(response.text).toContain('lantern you placed');
    expect(response.text).not.toContain('stopped sending invitations');
});

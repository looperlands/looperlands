global.Types = {};
jest.mock('./dao', () => ({setQuestStatus: jest.fn(), updateResourceBalance: jest.fn(), saveLootEvent: jest.fn(), saveMobKillEvent: jest.fn(), registerChoice: jest.fn(async () => ({}))}));
jest.mock('./formulas', () => ({level: () => 1}));
jest.mock('./discord', () => ({}));
jest.mock('./message', () => ({}));
jest.mock('./looperlandsplatformclient', () => ({LooperLandsPlatformClient: class {}}));
const fs = require('fs'), os = require('os'), path = require('path');
const Builder = require('./localquestbuilder');
const {WorldDefinitions, definitions} = require('./worlddefinitions');
const Types = require('../../shared/js/gametypes');
const engine = require('./quests/quests');
const {PlayerEventBroker} = require('./quests/playereventbroker');
const dao = require('./dao');
let root;
const event = () => ({id: 'autumn-market', name: 'Autumn market', enabled: true,
    availability: {annual: {start: '10-15', end: '11-09'}},
    actors: [{key: 'autumn-market:host', kind: 'halloween_ghost', label: 'Market host', x: 8, y: 8}],
    decorations: [], tiles: [], ambientSounds: [], parallax: []});
const quest = () => ({id: 'SEASONAL_BUILDER_QUEST', name: 'Market patrol', npc: Types.Entities.HALLOWEEN_GHOST,
    availabilityEvent: 'autumn-market', startText: 'Defeat a rat.', inProgressText: '{{remaining}} objectives remain.', endText: 'Thank you.',
    returnToNpc: Types.Entities.HALLOWEEN_GHOST, reward: {item: Types.Entities.GOLD, amount: 2},
    objectives: [{id: 'rat', eventType: 'KILL_MOB', target: Types.Entities.RAT}]});
function write(relative, value) {
    const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, JSON.stringify(value));
}
function save(value = quest()) {return Builder.saveQuests(root, {mapId: 'one', revision: Builder.readQuests(root, 'one').revision, quests: [value]});}
beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'seasonal-quests-'));
    write('server/config.json', {maps: ['one', 'two']});
    for (const mapId of ['one', 'two']) write('server/maps/world_server_' + mapId + '.json', {
        width: 20, height: 20, staticEntities: {1: 'guard', 2: 'rat'}, scenes: []});
    write('tools/seasons/one.json', {version: 1, events: [event()]});
    jest.clearAllMocks();
});
afterEach(() => {
    fs.rmSync(root, {recursive: true, force: true}); jest.useRealTimers();
    PlayerEventBroker.playerEventBrokers = {}; PlayerEventBroker.pending.clear();
});

test('all saved events and temporary NPC kinds remain authorable while disabled or out of season', () => {
    const source = event(); source.enabled = false;
    write('tools/seasons/one.json', {version: 1, events: [source]});
    const result = Builder.readQuests(root, 'one');
    expect(result.catalog.seasonalEvents).toEqual([{id: source.id, name: source.name, enabled: false, availability: source.availability}]);
    expect(result.catalog.npcs.map(row => row.id)).toContain(Types.Entities.HALLOWEEN_GHOST);
    expect(save().quests[0]).toEqual(quest());
    expect(JSON.parse(fs.readFileSync(path.join(root, 'tools/quests/one.json'))).quests[0]).not.toHaveProperty('availability');
});

test('references are same-map, cannot be combined with explicit windows and fail closed if removed from source', () => {
    const initial = Builder.readQuests(root, 'one');
    for (const availabilityEvent of ['missing', null, {mapId: 'one', eventId: event().id}]) {
        expect(() => save({...quest(), availabilityEvent})).toThrow('existing temporary event');
    }
    expect(() => save({...quest(), availability: event().availability})).toThrow('either an event');
    expect(() => Builder.saveQuests(root, {mapId: 'two', revision: Builder.readQuests(root, 'two').revision, quests: [quest()]})).toThrow('existing temporary event');
    expect(Builder.readQuests(root, 'one').revision).toBe(initial.revision);
    save(); write('tools/seasons/one.json', {version: 1, events: []});
    const registry = new WorldDefinitions(), warn = jest.fn();
    expect(() => Builder.registerLocalQuests(root, registry, {strict: true, warn})).toThrow('existing temporary event');
    expect(registry.quests).toEqual([]);
});

test('fresh runtime registration follows edited event windows and enabled state without rewriting the quest', () => {
    save(); const first = new WorldDefinitions(); Builder.registerLocalQuests(root, first, {strict: true});
    const changed = event(); changed.enabled = false; changed.availability = {startsAt: '2027-02-01T00:00:00Z', endsAt: '2027-02-03T00:00:00Z'};
    write('tools/seasons/one.json', {version: 1, events: [changed]});
    const second = new WorldDefinitions(); Builder.registerLocalQuests(root, second, {strict: true});
    expect(second.quests[0].availability).toEqual({...changed.availability, enabled: false});
    expect(first.quests[0].availability).toEqual({...event().availability, enabled: true});
    expect(Builder.readQuests(root, 'one').quests[0]).toEqual(quest());
    expect(Builder.readQuests(root, 'one').catalog.seasonalEvents[0].availability).toEqual(changed.availability);
});

test('deletion protects event links and the last seasonal giver kind, while persistent alternatives remain valid', () => {
    save();
    expect(() => Builder.validateSeasonalDependencies(root, 'one', [])).toThrow('still uses event');
    const noActor = event(); noActor.actors = [];
    expect(() => Builder.validateSeasonalDependencies(root, 'one', [noActor])).toThrow('still needs this seasonal NPC kind');
    const normal = {...quest(), npc: Types.Entities.GUARD, returnToNpc: Types.Entities.GUARD}; delete normal.availabilityEvent;
    save(normal);
    expect(() => Builder.validateSeasonalDependencies(root, 'one', [])).not.toThrow();
});

test('actor-key objective references cannot be orphaned even when another NPC shares their kind', () => {
    const source = event(); source.actors.push({...source.actors[0], key: 'autumn-market:second', x: 9});
    write('tools/seasons/one.json', {version: 1, events: [source]});
    save({...quest(), objectives: [{id: 'host', eventType: 'NPC_TALKED', target: Types.Entities.HALLOWEEN_GHOST, npcKey: 'autumn-market:host'}]});
    source.actors.shift();
    expect(() => Builder.validateSeasonalDependencies(root, 'one', [source])).toThrow('still refers to actor autumn-market:host');
});

test('the real quest engine gates acceptance, progress and completion using a resolved event reference', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-14T12:00:00Z'));
    save(); Builder.registerLocalQuests(root, definitions, {strict: true});
    const data = {nftId: 'seasonal-avatar', mapId: 'one', xp: 1, gameData: {quests: {}, choices: [], items: {}, mobKills: {}}};
    const cache = new Map([['seasonal-player', data]]);
    const player = {nftId: data.nftId, sessionId: 'seasonal-player', server: {server: {cache}, npcBehavior: {react: jest.fn()}}, handleCompletedQuests: jest.fn()};
    const broker = new PlayerEventBroker(player); broker.setPlayer(player);
    const talk = () => engine.handleMapmakerNPCClick(cache, player.sessionId, Types.Entities.HALLOWEEN_GHOST);
    const runtime = engine.questsByID[quest().id], progress = () => require('./quests/objectives').progress(data.gameData, runtime)[0].count;
    expect(talk()).toBe('');
    jest.setSystemTime(new Date('2026-10-15T00:00:00Z')); expect(talk().quest.id).toBe(quest().id);
    jest.setSystemTime(new Date('2026-11-09T00:00:00Z')); await broker.killMobEvent({kind: Types.Entities.RAT});
    expect(progress()).toBe(0); expect(engine.completeQuest(cache, player.sessionId, quest().id)).toBe(false);
    expect(dao.updateResourceBalance).not.toHaveBeenCalled();
    jest.setSystemTime(new Date('2027-10-15T00:00:00Z')); await broker.killMobEvent({kind: Types.Entities.RAT});
    expect(progress()).toBe(1);
    jest.setSystemTime(new Date('2027-11-09T00:00:00Z')); expect(talk()).toBe('');
    expect(engine.completeQuest(cache, player.sessionId, quest().id)).toBe(false);
    jest.setSystemTime(new Date('2028-10-15T00:00:00Z')); expect(talk()).toEqual({text: 'Thank you.'});
    expect(data.gameData.items[Types.Entities.GOLD]).toBe(2); expect(dao.updateResourceBalance).toHaveBeenCalledTimes(1);
});

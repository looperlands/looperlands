const fs = require('fs');
const os = require('os');
const path = require('path');
global.Types = {}; global.quests = [];
jest.mock('./dao', () => ({setQuestStatus: jest.fn(), updateResourceBalance: jest.fn(), saveLootEvent: jest.fn(), saveMobKillEvent: jest.fn(), registerChoice: jest.fn(async () => ({}))}));
jest.mock('./formulas', () => ({level: () => 1}));
jest.mock('./discord', () => ({}));
jest.mock('./message', () => ({}));
jest.mock('./looperlandsplatformclient', () => ({LooperLandsPlatformClient: class {}}));
const {definitions} = require('./worlddefinitions');
const engine = require('./quests/quests');
const {PlayerEventBroker} = require('./quests/playereventbroker');
const Types = require('../../shared/js/gametypes');
const dao = require('./dao');
const {registerLocalQuests} = require('./localquestbuilder');

test('a persisted builder quest is handed out, advanced only on its map, returned to its giver and rewarded once by the game engine', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-runtime-'));
    const originalNode = process.env.NODE_ENV, originalLocal = process.env.LOOPERLANDS_LOCAL_PLAYTEST;
    const write = (relative, data) => {const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, JSON.stringify(data));};
    try {
        write('server/config.json', {maps: ['builder_map']});
        write('server/maps/world_server_builder_map.json', {staticEntities: {1: 'guard', 2: 'rat'}});
        write('tools/quests/builder_map.json', {version: 1, quests: [{id: 'BUILDER_RUNTIME', name: 'Patrol', npc: Types.Entities.GUARD,
            startText: 'Defeat <span class="dialogue-danger">a rat</span>.', inProgressText: '<span class="dialogue-item">{{remaining}}</span> objectives remain.', endText: 'A safe road.', returnToNpc: Types.Entities.GUARD,
            reward: {item: Types.Entities.GOLD, amount: 2}, objectives: [{id: 'rat', eventType: 'KILL_MOB', target: Types.Entities.RAT}]}]});
        process.env.NODE_ENV = 'development'; process.env.LOOPERLANDS_LOCAL_PLAYTEST = '1';
        registerLocalQuests(root, definitions);
        const data = {nftId: 'avatar', walletId: 'wallet', mapId: 'another', xp: 1, gameData: {quests: {}, choices: [], items: {}, mobKills: {}}};
        const cache = new Map([['player', data]]);
        const player = {nftId: 'avatar', sessionId: 'player', server: {server: {cache}, npcBehavior: {react: jest.fn()}}, handleCompletedQuests: jest.fn()};
        const broker = new PlayerEventBroker(player); broker.setPlayer(player);
        expect(engine.handleMapmakerNPCClick(cache, 'player', Types.Entities.GUARD)).toBe('');
        expect(engine.npcHasQuest(cache, 'player', Types.Entities.GUARD)).toBe(false);
        cache.get('player').mapId = 'builder_map';
        expect(engine.handleMapmakerNPCClick(cache, 'player', Types.Entities.GUARD).quest.id).toBe('BUILDER_RUNTIME');
        expect(engine.handleMapmakerNPCClick(cache, 'player', Types.Entities.GUARD).text).toBe('<span class="dialogue-item">1</span> objectives remain.');
        cache.get('player').mapId = 'another';
        await broker.killMobEvent({kind: Types.Entities.RAT});
        expect(data.gameData.choices).toEqual([]);
        cache.get('player').mapId = 'builder_map';
        await broker.killMobEvent({kind: Types.Entities.RAT});
        expect(require('./quests/objectives').progress(cache.get('player').gameData, engine.questsByID.BUILDER_RUNTIME)[0].done).toBe(true);
        expect(player.handleCompletedQuests).not.toHaveBeenCalled();
        expect(engine.handleMapmakerNPCClick(cache, 'player', Types.Entities.GUARD)).toEqual({text: 'A safe road.'});
        expect(engine.hasCompletedQuest('BUILDER_RUNTIME', data)).toBe(true);
        expect(data.gameData.items[Types.Entities.GOLD]).toBe(2);
        expect(engine.handleMapmakerNPCClick(cache, 'player', Types.Entities.GUARD)).toBe('');
        expect(dao.updateResourceBalance).toHaveBeenCalledTimes(1);
        expect(player.handleCompletedQuests).toHaveBeenCalledTimes(1);
    } finally {
        PlayerEventBroker.playerEventBrokers = {}; PlayerEventBroker.pending.clear();
        if (originalNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNode;
        if (originalLocal === undefined) delete process.env.LOOPERLANDS_LOCAL_PLAYTEST; else process.env.LOOPERLANDS_LOCAL_PLAYTEST = originalLocal;
        fs.rmSync(root, {recursive: true, force: true});
    }
});

test('a built-in override retains lifetime progress and original handout/return behavior without changing source definitions or scripted routes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-legacy-runtime-'));
    const originalNode = process.env.NODE_ENV, originalLocal = process.env.LOOPERLANDS_LOCAL_PLAYTEST;
    const write = (relative, data) => {const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, JSON.stringify(data));};
    try {
        require('../world-definitions').register(definitions, {local: false});
        const source = require('./quests/main').quests.find(quest => quest.id === 'KING_QUEST_1');
        const before = JSON.parse(JSON.stringify(source));
        write('server/config.json', {maps: ['main']});
        write('server/maps/world_server_main.json', {staticEntities: {1: 'guard', 2: 'rat'}});
        write('tools/quests/main.json', {version: 1, quests: [], overrides: [
            {id: source.id, changes: {name: 'A local King request', amount: 1, reward: {item: Types.Entities.GOLD, amount: 2}}},
            {id: 'LANTERN_BASKET', changes: {name: 'A local picnic'}}
        ]});
        process.env.NODE_ENV = 'development'; process.env.LOOPERLANDS_LOCAL_PLAYTEST = '1';
        expect(registerLocalQuests(root, definitions)).toEqual([]);
        const effective = engine.questsByID[source.id];
        expect(effective).toMatchObject({...before, name: 'A local King request', amount: 1, reward: {item: Types.Entities.GOLD, amount: 2}});
        expect(effective.localBuilder).toBeUndefined(); expect(effective.mapId).toBeUndefined(); expect(effective.objectives).toBeUndefined();
        expect(source).toEqual(before);
        const data = {nftId: 'legacy-avatar', walletId: 'wallet', mapId: 'main', xp: 1, gameData: {quests: {}, choices: [], items: {}, mobKills: {[Types.Entities.RAT]: 1}}};
        const cache = new Map([['legacy-player', data]]);
        const player = {nftId: 'legacy-avatar', sessionId: 'legacy-player', server: {server: {cache}}, handleCompletedQuests: jest.fn()};
        const broker = new PlayerEventBroker(player); broker.setPlayer(player);
        expect(engine.handleMapmakerNPCClick(cache, 'legacy-player', Types.Entities.KING)).toBe('');
        expect(engine.handleNPCClick(cache, 'legacy-player', Types.Entities.KING)).toMatchObject({quest: effective, text: before.startText});
        expect(engine.handleNPCClick(cache, 'legacy-player', Types.Entities.KING)).toEqual({text: before.endText});
        expect(engine.hasCompletedQuest(source.id, data)).toBe(true); expect(data.gameData.items[Types.Entities.GOLD]).toBe(2);
        expect(engine.questsByID.LANTERN_BASKET).toMatchObject({name: 'A local picnic', target: 'FLOW', dialogueOnly: true});
        expect(engine.handleMapmakerNPCClick(cache, 'legacy-player', Types.Entities.VILLAGER)).toBe('');
    } finally {
        PlayerEventBroker.playerEventBrokers = {}; PlayerEventBroker.pending.clear();
        if (originalNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNode;
        if (originalLocal === undefined) delete process.env.LOOPERLANDS_LOCAL_PLAYTEST; else process.env.LOOPERLANDS_LOCAL_PLAYTEST = originalLocal;
        fs.rmSync(root, {recursive: true, force: true});
    }
});

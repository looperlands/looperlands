const dao = require('../dao.js');
const PlayerQuestEventConsumer = require('./playerquesteventconsumer.js');
const Collectables = require('../collectables.js');
const Types = require("../../../shared/js/gametypes");
const Messages = require("../message");

class PlayerEventBroker {
    static Events = {
        KILL_MOB: 'KILL_MOB',
        LOOT_ITEM: 'LOOT_ITEM',
        SPAWNED: 'SPAWNED',
        DIED: 'DIED',
        QUEST_COMPLETED: 'QUEST_COMPLETED',
        NPC_TALKED: 'NPC_TALKED',
        AREA_ENTERED: 'AREA_ENTERED',
        AREA_LEFT: 'AREA_LEFT',
    };

    static playerEventBrokers = {};
    static playerEventConsumers = [];
    static cache;
    static pending = new Map();

    constructor(player) {
        this.player = player;
        this.cache = player.server.server.cache;
        PlayerEventBroker.cache = this.cache;
    }

    setPlayer(player) {
        PlayerEventBroker.playerEventBrokers[player.sessionId] = this;
        this.player = player;
    }

    static dispatchEvent(eventType, sessionId, player, playerCache, eventData) {
        if(eventData === undefined) {
            eventData = {};
        }

        eventData.player = player;
        eventData.playerData = playerCache;
        eventData.cache = PlayerEventBroker.cache;
        const registry = require('./quests');
        const objective = require('./objectives');
        eventData.allowedObjectives = {};
        for (const saved of playerCache?.gameData?.quests?.IN_PROGRESS || []) {
            const definition = registry.questsByID[saved.questKey || saved.id];
            if (!definition?.objectives) continue;
            const pending = objective.progress(playerCache.gameData, definition).filter(o => !o.done);
            eventData.allowedObjectives[definition.id] = (definition.ordered === false ? pending : pending.slice(0, 1)).map(o => o.id);
        }

        let eventId = eventType + ',' + sessionId;
        const key = eventData.playerData?.nftId || sessionId;
        const previous = PlayerEventBroker.pending.get(key) || Promise.resolve();
        const next = previous.catch(() => {}).then(() => PlayerEventBroker.processEvent(eventId, eventData));
        PlayerEventBroker.pending.set(key, next);
        return next.finally(() => {if (PlayerEventBroker.pending.get(key) === next) PlayerEventBroker.pending.delete(key);});
    }
    
    static async processEvent(eventId, eventData) {
        for (const consumer of PlayerEventBroker.playerEventConsumers) {
            let [eventType, sessionId] = eventId.split(',');
            eventData.playerData = PlayerEventBroker.cache.get(sessionId);
            if (!eventData.playerData) return;
            let consumed = await consumer.consume({eventType: eventType, playerCache: eventData.playerData, data: eventData});
            if (consumed.changedQuests !== undefined && consumed.changedQuests.length > 0) {
                let playerCache = PlayerEventBroker.cache.get(sessionId);
                if (playerCache === undefined) {
                    return;
                }
                playerCache.gameData.quests = consumed.quests;
                PlayerEventBroker.cache.set(sessionId, playerCache);
                let broker = PlayerEventBroker.playerEventBrokers[sessionId];
                broker.player.handleCompletedQuests(consumed.changedQuests);
            }
            if (consumed.objectiveProgress) {
                const latest = PlayerEventBroker.cache.get(sessionId);
                if (latest) PlayerEventBroker.cache.set(sessionId, {...latest, gameData: eventData.playerData.gameData});
            }
        }
    }

    async lootEvent(item, amount) {
        if(amount === undefined) {
            amount = 1;
        }

        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        let gameData = playerCache.gameData;
        let kind;

        if (Collectables.isCollectable(item.kind)){
            kind = Collectables.getCollectItem(item.kind);
            amount = amount * Collectables.getCollectAmount(item.kind);
            dao.saveLootEvent(this.player.nftId, kind, amount);
        } else {
            kind = item.kind;
            dao.saveLootEvent(this.player.nftId, item.kind, amount);
        }

        if (gameData.items === undefined) {
            gameData.items = {};
        }

        let itemCount = gameData.items[kind];
        if (itemCount) {
            gameData.items[kind] = itemCount + amount;
        } else {
            gameData.items[kind] = amount;
        }

        playerCache.gameData = gameData;
        this.cache.set(sessionId, playerCache);

        this.player.server.server.activity?.record(this.player, 'loot', {target: String(kind), quantity: amount});
        return PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.LOOT_ITEM, sessionId, this.player, playerCache, { item: item, kind, amount });
    }

    async killMobEvent(mob) {
        dao.saveMobKillEvent(this.player.nftId, mob.kind);
        this.player.server.server.activity?.record(this.player, 'kill', {target: String(mob.kind), quantity: 1});

        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        let gameData = playerCache.gameData;

        if (gameData.mobKills === undefined) {
            gameData.mobKills = {};
        }

        let killCount = gameData.mobKills[mob.kind]
        if (killCount) {
            gameData.mobKills[mob.kind] = killCount + 1;
        } else {
            gameData.mobKills[mob.kind] = 1;
        }

        playerCache.gameData = gameData;
        this.cache.set(sessionId, playerCache);
        await PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.KILL_MOB, sessionId, this.player, playerCache, { mob: mob });
        this.player.server.npcBehavior?.react('kill', this.player, {mob});
    }

    async questCompleteEvent(quest, xpGained) {
      let sessionId = this.player.sessionId;
      let playerCache = this.cache.get(sessionId);
      PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.QUEST_COMPLETED, sessionId, this.player, playerCache, { quest: quest, xp: xpGained });
      this.player.server.npcBehavior?.react('quest', this.player, {quest});
    }

    async spawnEvent(self, checkpointId) {
        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        return PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.SPAWNED, sessionId, this.player, playerCache, { checkpoint: checkpointId });
    }

    async deathEvent(self, position) {
        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        return PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.DIED, sessionId, this.player, playerCache, { position: position.x + ',' + position.y});
    }

    async npcTalked(npc, message, npcKey) {
        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        return PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.NPC_TALKED, sessionId, this.player, playerCache, { npc: npc, message: message, npcKey });
    }

    observePlace() {
        const area = this.player.server.map?.getSceneAt(this.player.x, this.player.y);
        const key = area && String(area.id ?? area.name);
        if (key === this.place) return Promise.resolve();
        this.place = key;
        return area ? this.enteredArea(area) : Promise.resolve();
    }

    async enteredArea(area) {
        const width = area.width ?? area.w, height = area.height ?? area.h;
        if (Number.isFinite(width) && Number.isFinite(height) && !(this.player.x >= area.x && this.player.y >= area.y && this.player.x < area.x + width && this.player.y < area.y + height)) return;
        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        return PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.AREA_ENTERED, sessionId, this.player, playerCache, { area: area });
    }

    async leftArea(area) {
        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        return PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.AREA_LEFT, sessionId, this.player, playerCache, { area: area });
    }

    destroy() {
        delete PlayerEventBroker.playerEventBrokers[this.player.sessionId];
    }
}

exports.PlayerEventBroker = PlayerEventBroker;

PlayerEventBroker.playerEventConsumers.push(new PlayerQuestEventConsumer.PlayerQuestEventConsumer());

const dao = require('../dao.js');
const PlayerQuestEventConsumer = require('./playerquesteventconsumer.js');
class PlayerEventBroker {
    static Events = {
        KILL_MOB: 'KILL_MOB',
        LOOT_ITEM: 'LOOT_ITEM',
        SPAWNED: 'SPAWNED',
        DIED: 'DIED',
        QUEST_COMPLETED: 'QUEST_COMPLETED',
    };


    static playerEventBrokers = {};
    static playerEventConsumers = [];
    static cache;


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

        let eventId = eventType + ',' + sessionId;
        PlayerEventBroker.processEvent(eventId, eventData);
    }
    
    static async processEvent(eventId, eventData) {
        PlayerEventBroker.playerEventConsumers.forEach(consumer => {
            let [eventType, sessionId] = eventId.split(',');
            let consumed = consumer.consume({eventType: eventType, playerCache: eventData.playerData, data: eventData});
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
        })
    }

    async lootEvent(item) {
        dao.saveLootEvent(this.player.nftId, item.kind);

        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        let gameData = playerCache.gameData;

        if (gameData.items === undefined) {
            gameData.items = {};
        }

        let itemCount = gameData.items[item.kind];
        if (itemCount) {
            gameData.items[item.kind] = itemCount + 1;
        } else {
            gameData.items[item.kind] = 1;
        }

        playerCache.gameData = gameData;
        this.cache.set(sessionId, playerCache);
        PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.LOOT_ITEM, sessionId, this.player, playerCache, { item: item });
    }

    async killMobEvent(mob) {
        dao.saveMobKillEvent(this.player.nftId, mob.kind);

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
        PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.KILL_MOB, sessionId, this.player, playerCache, { mob: mob });
    }
    
    destroy() {
        delete PlayerEventBroker.playerEventBrokers[this.player.sessionId];
    }

    async questCompleteEvent(quest, xpGained) {
      let sessionId = this.player.sessionId;
      let playerCache = this.cache.get(sessionId);
      PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.QUEST_COMPLETED, sessionId, this.player, playerCache, { quest: quest, xp: xpGained });
    }

    async spawnEvent(self, checkpointId) {
        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.SPAWNED, sessionId, this.player, playerCache, { checkpoint: checkpointId });
    }

    async deathEvent(self, position) {
        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        PlayerEventBroker.dispatchEvent(PlayerEventBroker.Events.DIED, sessionId, this.player, playerCache, { position: position.x + ',' + position.y});
    }
} {
}

exports.PlayerEventBroker = PlayerEventBroker;

PlayerEventBroker.playerEventConsumers.push(new PlayerQuestEventConsumer.PlayerQuestEventConsumer());
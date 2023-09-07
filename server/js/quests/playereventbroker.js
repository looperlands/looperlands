const dao = require('../dao.js');
const PlayerQuestEventConsumer = require('./playerquesteventconsumer.js');
class PlayerEventBroker {
    static Events = {
        KILL_MOB: 'KILL_MOB',
        LOOT_ITEM: 'LOOT_ITEM'
    };


    static playerEventBrokers = {};
    static events = {};
    static playerEventConsumers = [];
    static cache;


    static {
        setInterval(PlayerEventBroker.processEvents, 5000);
    }

    constructor(player) {
        this.player = player;
        this.cache = player.server.server.cache;
        PlayerEventBroker.cache = this.cache;
    }

    setPlayer(player) {
        PlayerEventBroker.playerEventBrokers[player.sessionId] = this;
        this.player = player;
    }

    static addEvent(eventType, sessionId, playerCache) {
        let eventId = eventType + ',' + sessionId;
        PlayerEventBroker.events[eventId] = playerCache;
    }
    
    static async processEvents() {
        let hasEvents = Object.keys(PlayerEventBroker.events).length !== 0;
        if (hasEvents) {
            // copy all the events before deleting them
            let events = {... PlayerEventBroker.events};
            PlayerEventBroker.events = {};

            PlayerEventBroker.playerEventConsumers.forEach(consumer => {
                for (const [eventId, playerCache] of Object.entries(events)) {
                    let [eventType, sessionId] = eventId.split(',');
                    let consumed = consumer.consume({eventType: eventType, playerCache: playerCache});
                    if (consumed.changedQuests !== undefined && consumed.changedQuests.length > 0) {
                        let playerCache = PlayerEventBroker.cache.get(sessionId);
                        playerCache.gameData.quests = consumed.quests;
                        PlayerEventBroker.cache.set(sessionId, playerCache);
                        let broker = PlayerEventBroker.playerEventBrokers[sessionId];
                        broker.player.handleCompletedQuests(consumed.changedQuests);
                    }
                }
            });
        }
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
        PlayerEventBroker.addEvent(PlayerEventBroker.Events.LOOT_ITEM, sessionId, playerCache);
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
        PlayerEventBroker.addEvent(PlayerEventBroker.Events.KILL_MOB, sessionId, playerCache);
    }
    
    destroy() {
        delete PlayerEventBroker.playerEventBrokers[this.player.sessionId];
    }
}

exports.PlayerEventBroker = PlayerEventBroker;

PlayerEventBroker.playerEventConsumers.push(new PlayerQuestEventConsumer.PlayerQuestEventConsumer());
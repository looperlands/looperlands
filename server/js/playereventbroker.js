const dao = require('./dao.js');
const PlayerQuestEventConsumer = require('./playerquesteventconsumer.js');
class PlayerEventBroker {
    static Events = {
        KILL_MOB: 'KILL_MOB',
        LOOT_ITEM: 'LOOT_ITEM'
    };


    static playerEventBrokers = {};
    static events = new Set();
    static playerEventConsumers = [];
    static cache;


    static {
        setInterval(PlayerEventBroker.processEvents, 60000);
    }

    constructor(player) {
        this.player = player;
        this.cache = player.server.server.cache;
        PlayerEventBroker.playerEventBrokers[player.sessionId] = this;
    }

    static addEvent(eventType, sessionId, playerCache) {

        const event = {
            sessionId: sessionId,
            event: eventType,
            playerCache: playerCache
        }

        if(!PlayerEventBroker.events.has(event)) {
            PlayerEventBroker.events.add(event);
        }
    }
    
    static async processEvents() {
        if (PlayerEventBroker.events.size > 0) {
            let events = Array.from(PlayerEventBroker.events);

            PlayerEventBroker.events.clear();
            PlayerEventBroker.playerEventConsumers.forEach(consumer => {
                events.forEach(event => {
                    consumer.consume(event);
                });
            });
        }

    }


    async lootEvent(item) {
        dao.saveLootEvent(this.player.nftId, item.kind);

        let sessionId = this.player.sessionId;
        let playerCache = this.cache.get(sessionId);
        let gameData = playerCache.gameData;
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
    
    destroy() {
        console.log("Destroying PlayerEventBroker for: ", this.player.sessionId);
        delete PlayerEventBroker.playerEventBrokers[this.player.sessionId];
    }
}

exports.PlayerEventBroker = PlayerEventBroker;

PlayerEventBroker.playerEventConsumers.push(new PlayerQuestEventConsumer.PlayerQuestEventConsumer());
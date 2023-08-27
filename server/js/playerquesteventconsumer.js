
const PlayerEventConsumer = require('./playereventconsumer.js').PlayerEventConsumer;

class PlayerQuestEventConsumer extends PlayerEventConsumer {

    constructor() {
        super();
    }

    consume(event) {
        //console.log("PlayerQuestEventConsumer Consuming event: ", event, Date.now());
        switch(event.eventType) {
            case "KILL_MOB":
                this.processKillMobEvent(event.playerCache);
                break;
            case "LOOT_ITEM":
                this.processLootEvent(event.playerCache);
                break;
            default:
                throw new Error("Unknown event type: ", event.eventType);
        }
    }

    processLootEvent(playerCache) {
        //console.log("Processing Loot event for session: ", playerCache);
    }

    processKillMobEvent(playerCache) {
        //console.log("Processing Mob kill event for session: ", playerCache);
    }    
}

exports.PlayerQuestEventConsumer = PlayerQuestEventConsumer;
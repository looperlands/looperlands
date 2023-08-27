
const PlayerEventConsumer = require('./playereventconsumer.js').PlayerEventConsumer;

class PlayerQuestEventConsumer extends PlayerEventConsumer {

    constructor() {
        super();
    }

    consume(event) {
        //console.log("PlayerQuestEventConsumer Consuming event: ", event, Date.now());
        switch(event.event) {
            case "KILL_MOB":
                this.processKillMobEvent(event);
                break;
            case "LOOT_ITEM":
                this.processLootEvent(event);
                break;
            default:
                throw new Error("Unknown event type: ", event.event);
        }
    }

    processLootEvent(event) {
        console.log("Processing Loot event for session: ", event.sessionId);
    }

    processKillMobEvent(event) {
        console.log("Processing Loot event for session: ", event.sessionId);
    }    
}

exports.PlayerQuestEventConsumer = PlayerQuestEventConsumer;
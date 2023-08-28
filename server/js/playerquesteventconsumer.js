const player = require('./player.js');

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

        ;
        //console.log("Processing Loot event for session: ", playerCache);
    }

    

    processKillMobEvent(playerCache) {
        for (const [npc, quests] of Object.entries(Types.quests)) {
            quests.forEach(quest => {
                if (quest.eventType === "KILL_MOB"){
                    let mobId = quest.target;
                    let killCount = playerCache.gameData.mobKills[mobId] || 0;

                    if (killCount > quest.amount) {
                        console.log("Quest complete: ", quest);
                    }
                }
            });
        }
    }    
}

exports.PlayerQuestEventConsumer = PlayerQuestEventConsumer;
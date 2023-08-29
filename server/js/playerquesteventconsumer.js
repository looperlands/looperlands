const quests = require('./quests/quests.js').quests;

const PlayerEventConsumer = require('./playereventconsumer.js').PlayerEventConsumer;

class PlayerQuestEventConsumer extends PlayerEventConsumer {

    constructor() {
        super();
    }

    consume(event) {
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
        quests.forEach(quest => {
            if (quest.eventType === "LOOT_ITEM"){
                let itemId = quest.target;
                let lootCount = playerCache.gameData.items[itemId] || 0;

                if (lootCount >= quest.amount) {
                    console.log("Quest complete: ", quest);
                }
            }
        });
    }

    

    processKillMobEvent(playerCache) {
        
        quests.forEach(quest => {
            if (quest.eventType === "KILL_MOB"){
                let mobId = quest.target;
                let killCount = playerCache.gameData.mobKills[mobId] || 0;

                if (killCount >= quest.amount) {
                    console.log("Quest complete: ", quest);
                }
            }
        });
    }    
}

exports.PlayerQuestEventConsumer = PlayerQuestEventConsumer;
const quests = require('./quests.js');
const dao = require('../dao.js');

const PlayerEventConsumer = require('../playereventconsumer.js').PlayerEventConsumer;

class PlayerQuestEventConsumer extends PlayerEventConsumer {

    constructor() {
        super();
    }

    completionCheckers = {
        "KILL_MOB": function(quest, playerCache) {
            let count = playerCache.gameData.mobKills[quest.target] || 0;
            return count >= quest.amount;
        },
        "LOOT_ITEM": function(quest, playerCache) {
            let count = playerCache.gameData.items[quest.target] || 0;
            return count >= quest.amount;
        }
    }

    consume(event) {
        let inProgressQuests = event.playerCache.gameData.quests[quests.STATES.IN_PROGRESS];
        //console.log("inProgressQuests: ", event.playerCache.gameData.quests, inProgressQuests);
        if (inProgressQuests === undefined) {
            return;
        }

        let completionCheckerFN = this.completionCheckers[event.eventType];
        if (completionCheckerFN === undefined) {
            throw new Error("Unknown event type: " + event.eventType);
        }

        for (let quest of inProgressQuests) {
            let questID = quest.id || quest.questID;
            quest = quests.questsByID[questID];
            if (completionCheckerFN(quest, event.playerCache)) {
                dao.setQuestStatus(event.playerCache.nftId, questID, quests.STATES.COMPLETED);
            }
        }
    }
}

exports.PlayerQuestEventConsumer = PlayerQuestEventConsumer;
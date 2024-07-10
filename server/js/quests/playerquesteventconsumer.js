const quests = require('./quests.js');
const dao = require('../dao.js');
const { stringify } = require('flatted');

const PlayerEventConsumer = require('./playereventconsumer.js').PlayerEventConsumer;
const platform = require('../looperlandsplatformclient.js');

const LOOPERLANDS_PLATFORM_BASE_URL = process.env.LOOPERLANDS_PLATFORM_BASE_URL;
const LOOPERLANDS_PLATFORM_API_KEY = process.env.LOOPERLANDS_PLATFORM_API_KEY;

const platformClient = new platform.LooperLandsPlatformClient(LOOPERLANDS_PLATFORM_API_KEY, LOOPERLANDS_PLATFORM_BASE_URL);

class PlayerQuestEventConsumer extends PlayerEventConsumer {

    constructor() {
        super();
    }

    completionCheckers = {
        "KILL_MOB": function (quest, playerCache) {
            if (quest === undefined) {
                return false;
            }
            let count = playerCache.gameData.mobKills[quest.target] || 0;
            return count >= quest.amount;
        },
        "LOOT_ITEM": function (quest, playerCache) {
            if (quest === undefined) {
                return false;
            }
            let count = playerCache.gameData.items[quest.target] || 0;
            return count >= quest.amount;
        }
    }

    consume(event) {

        if (!event.playerCache || !event.playerCache.gameData) {
            console.error("Player cache or gameData is undefined", stringify(event));
            return { change: false };
        }

        let inProgressQuests = event.playerCache.gameData.quests?.[quests.STATES.IN_PROGRESS];
        //console.log("inProgressQuests: ", event.playerCache.gameData.quests, inProgressQuests);
        if (inProgressQuests === undefined) {
            return { change: false };
        }

        let completionCheckerFN = this.completionCheckers[event.eventType];
        if (completionCheckerFN === undefined) {
            return { change: false };
        }

        let changedQuests = []

        for (let quest of inProgressQuests) {
            let questKey = quest.id || quest.questKey;
            quest = quests.questsByID[questKey];
            if (completionCheckerFN(quest, event.playerCache)) {
                dao.setQuestStatus(event.playerCache.nftId, questKey, quests.STATES.COMPLETED);
                let completedQuests = event.playerCache.gameData.quests[quests.STATES.COMPLETED];
                let questInCacheFormat = { questKey: questKey, status: quests.STATES.COMPLETED };
                if (!completedQuests) {
                    event.playerCache.gameData.quests[quests.STATES.COMPLETED] = [questInCacheFormat];
                }
                else {
                    event.playerCache.gameData.quests[quests.STATES.COMPLETED].push(questInCacheFormat);
                }
                //console.log("inprogress quest: ", event.playerCache.gameData.quests[quests.STATES.IN_PROGRESS]);
                event.playerCache.gameData.quests[quests.STATES.IN_PROGRESS] = event.playerCache.gameData.quests[quests.STATES.IN_PROGRESS].filter(q => q.id !== questKey);
                changedQuests.push(quest);

                if (quest.rental) {
                    platformClient.getFreeRental(quest.rental, event.playerCache.walletId);
                }
            }
        }
        return { changedQuests: changedQuests, quests: event.playerCache.gameData.quests };
    }
}

exports.PlayerQuestEventConsumer = PlayerQuestEventConsumer;
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
        "KILL_MOB": function (quest, playerCache, event) {
            if (quest === undefined) {
                return false;
            }
            let count = playerCache.gameData.mobKills[quest.target] || 0;
            quest.done = count;
            quest.remaining = quest.amount - count;

            return count >= quest.amount;
        },
        "LOOT_ITEM": function (quest, playerCache, event) {
            if (quest === undefined) {
                return false;
            }
            let count = playerCache.gameData.items[quest.target] || 0;
            quest.done = count;
            quest.remaining = quest.amount - count;

            return count >= quest.amount;
        },
        "NPC_TALKED": function(quest, playerCache, event) {
            return quest.completed || parseInt(event?.data?.npc) === parseInt(quest?.target);
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
            if(!quest) {
                continue;
            }
            if(quest.eventType !== event.eventType) {
                continue;
            }

            if (completionCheckerFN(quest, event.playerCache, event)) {
                if(!quest.needToReturn && !quest.returnToNpc) {
                    this.completeQuest(event.playerCache, questKey, quest);
                    changedQuests.push(quest);
                } else {
                    quest.completed = true;
                }
            }
        }
        return { changedQuests: changedQuests, quests: event.playerCache.gameData.quests };
    }

    completeQuest(playerCache, questKey, quest) {
        if(quests.hasCompletedQuest(questKey, playerCache)) {
            return;
        }

        dao.setQuestStatus(playerCache.nftId, questKey, quests.STATES.COMPLETED);
        let completedQuests = playerCache.gameData.quests[quests.STATES.COMPLETED];
        let questInCacheFormat = {questKey: questKey, status: quests.STATES.COMPLETED};
        if (!completedQuests) {
            playerCache.gameData.quests[quests.STATES.COMPLETED] = [questInCacheFormat];
        } else {
            playerCache.gameData.quests[quests.STATES.COMPLETED].push(questInCacheFormat);
        }

        playerCache.gameData.quests[quests.STATES.IN_PROGRESS] = playerCache.gameData.quests[quests.STATES.IN_PROGRESS].filter(q => q.id !== questKey);

        if (quest.rental) {
            platformClient.getFreeRental(quest.rental, playerCache.walletId);
        }

        let gameData = playerCache.gameData;
        if (gameData.items === undefined) {
            gameData.items = {};
        }

        if (quest.eventType === "LOOT_ITEM") {
            const amount = -(quest.amount);
            const nftId = playerCache.nftId;
            const item = quest.target;
            dao.updateResourceBalance(nftId, item, amount);

            let itemCount = gameData.items[quest.target] ?? quest.amount;
            gameData.items[quest.target] = itemCount - quest.amount;
        }

        if (quest.reward) {
            const amount = (quest.reward.amount);
            const nftId = playerCache.nftId;
            const item = quest.reward.item;

            dao.updateResourceBalance(nftId, item, amount);

            let itemCount = gameData.items[quest.reward.item] ?? 0;
            gameData.items[quest.reward.item] = itemCount + quest.reward.amount;
        }
        playerCache.gameData = gameData;
    }
}

exports.PlayerQuestEventConsumer = PlayerQuestEventConsumer;
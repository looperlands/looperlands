const quests = require('./quests.js');
const dao = require('../dao.js');
const objectives = require('./objectives');

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
            console.error("Player cache or gameData is undefined");
            return { change: false };
        }

        let inProgressQuests = event.playerCache.gameData.quests?.[quests.STATES.IN_PROGRESS];
        //console.log("inProgressQuests: ", event.playerCache.gameData.quests, inProgressQuests);
        if (inProgressQuests === undefined) {
            return { change: false };
        }

        if (inProgressQuests.some(saved => quests.questsByID[saved.questKey || saved.id]?.objectives)) return this.consumeObjectives(event);

        let completionCheckerFN = this.completionCheckers[event.eventType];
        if (completionCheckerFN === undefined) {
            return { change: false };
        }
        let changedQuests = []

        for (const saved of inProgressQuests) {
            const questKey = saved.questKey || saved.id;
            const definition = quests.questsByID[questKey];
            const quest = definition && {...definition, ...(saved.completed === true ? {completed: true} : {})};
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
                    saved.completed = true;
                }
            }
        }
        return { changedQuests: changedQuests, quests: event.playerCache.gameData.quests };
    }

    async consumeObjectives(event) {
        const changedQuests = [];
        for (const saved of [...event.playerCache.gameData.quests[quests.STATES.IN_PROGRESS]]) {
            const key = saved.questKey || saved.id, quest = quests.questsByID[key];
            if (!quest) continue;
            const checker = this.completionCheckers[event.eventType];
            const done = quest.objectives ? await objectives.consume(quest, event) :
                quest.eventType === event.eventType && checker?.({...quest}, event.playerCache, event);
            if (!done) continue;
            if (quest.needToReturn || quest.returnToNpc) {
                const active = event.playerCache.gameData.quests[quests.STATES.IN_PROGRESS].find(row => (row.questKey || row.id) === key);
                if (active) active.completed = true;
            }
            else {this.completeQuest(event.playerCache, key, quest); changedQuests.push(quest);}
        }
        return {changedQuests, quests: event.playerCache.gameData.quests, objectiveProgress: true};
    }

    completeQuest(playerCache, questKey, quest) {
        if(quests.hasCompletedQuest(questKey, playerCache)) {
            return;
        }

        if (quest.objectives && !objectives.ready(playerCache.gameData, quest)) return;

        dao.setQuestStatus(playerCache.nftId, questKey, quests.STATES.COMPLETED);
        let completedQuests = playerCache.gameData.quests[quests.STATES.COMPLETED];
        let questInCacheFormat = {questKey: questKey, status: quests.STATES.COMPLETED};
        if (!completedQuests) {
            playerCache.gameData.quests[quests.STATES.COMPLETED] = [questInCacheFormat];
        } else {
            playerCache.gameData.quests[quests.STATES.COMPLETED].push(questInCacheFormat);
        }

        playerCache.gameData.quests[quests.STATES.IN_PROGRESS] = (playerCache.gameData.quests[quests.STATES.IN_PROGRESS] || [])
            .filter(q => (q.questKey || q.id) !== questKey);

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

        for (const delivery of (quest.objectives || []).filter(o => o.eventType === 'DELIVER_ITEM')) {
            dao.updateResourceBalance(playerCache.nftId, delivery.target, -(delivery.amount || 1));
            gameData.items[delivery.target] -= (delivery.amount || 1);
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

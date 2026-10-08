const dao = require('../dao.js');
const questState = require('./queststate');
const Formulas = require('../formulas.js');

const {definitions} = require('../worlddefinitions');
const _ = require('underscore');
const objectives = require('./objectives');
const PlayerQuestEventConsumer = require('./playerquesteventconsumer.js');
const {PlayerEventBroker} = require("./playereventbroker");

const STATES = {
    IN_PROGRESS: "IN_PROGRESS", // picked up from an NPC
    COMPLETED: "COMPLETED", // completed but not turned in
    FINISHED: "FINISHED" // completed and turned in
}

const eventConsumer = new PlayerQuestEventConsumer.PlayerQuestEventConsumer();
const quests = definitions.quests;
const questsByNPC = {}, questsByID = {};
function indexDefinitions() {
    quests.forEach(quest => validateQuest(quest));
    for (const key of Object.keys(questsByNPC)) delete questsByNPC[key];
    for (const key of Object.keys(questsByID)) delete questsByID[key];
    Object.assign(questsByNPC, groupBy(quests, 'npc'));
    Object.assign(questsByID, groupBy(quests, 'id', true));
}
indexDefinitions(); definitions.subscribe(indexDefinitions);

exports.handleNPCClick = function (cache, sessionId, npcId) {
    const sessionData = cache.get(sessionId);
    const npcQuests = questsByNPC[npcId]?.filter(quest => !quest.dialogueOnly);
    const broker = PlayerEventBroker.playerEventBrokers[sessionId];

    let response = handleHandoutQuests(npcQuests, sessionData, cache, sessionId) ||
        handleInProgressQuests(npcQuests, sessionData, broker, cache, sessionId) ||
        handleNpcTargetQuests(quests.filter(quest => !quest.dialogueOnly), sessionData, npcId) ||
        handleReturnToNpcQuests(quests.filter(quest => !quest.dialogueOnly), sessionData, npcId, cache, sessionId, broker);

    cache.set(sessionId, sessionData);

    return response || "";
}

exports.newQuest = function (cache, sessionId, questID) {
    let sessionData = cache.get(sessionId);
    let msgText = handoutQuest(questID, sessionData);
    cache.set(sessionId, sessionData);

    return msgText;
}

exports.completeQuest = function (cache, sessionId, questID) {
    if (avatarHasCompletedQuest(questID, cache.get(sessionId).gameData.quests)) {
        return false;
    }

    let sessionData = cache.get(sessionId);
    if (questsByID[questID]?.objectives && !objectives.ready(sessionData.gameData, questsByID[questID])) return false;
    completeQuest(questID, sessionData);
    cache.set(sessionId, sessionData);

    let quest = questsByID[questID];
    return quest.endText ?? null;
}

function handleHandoutQuests(npcQuests, sessionData, cache, sessionId) {
    if (!npcQuests) return null;
    for (const questID of npcQuests.filter(quest => !quest.dialogueOnly).map(quest => quest.id)) {
        const msgText = handoutQuest(questID, sessionData);
        if (msgText) {
            cache.set(sessionId, sessionData);
            return { text: msgText, quest: questsByID[questID] };
        }
    }
    return null;
}

function handleInProgressQuests(npcQuests, sessionData, broker, cache, sessionId) {
    if (!npcQuests) return null;

    for (const questID of npcQuests.map(quest => quest.id)) {
        const quest = {...questsByID[questID]};
        if (avatarHasQuest(questID, sessionData.gameData.quests) && !avatarHasCompletedQuest(questID, sessionData.gameData.quests)) {
            if (quest.objectives) {
                const progress = objectives.progress(sessionData.gameData, quest);
                quest.amount = progress.length; quest.done = progress.filter(o => o.done).length; quest.remaining = quest.amount - quest.done;
            }
            const isCompleted = quest.objectives ? objectives.ready(sessionData.gameData, quest) : eventConsumer.completionCheckers[quest.eventType](quest, sessionData);
            if (isCompleted && !quest.returnToNpc) {
                completeQuest(questID, sessionData);
                broker.player.handleCompletedQuests([quest]);
                cache.set(sessionId, sessionData);
                return { text: quest.endText };
            } else {
                if(quest.inProgressText) {
                    if(Array.isArray(quest.inProgressText)) {
                        let texts = [];
                        for (const inProgressText of quest.inProgressText) {
                            texts.push(_.template(inProgressText, {interpolate: /\{\{(.+?)\}\}/g})(quest));
                        }

                        return {text: texts};
                    }

                    return {text: _.template(quest.inProgressText, {interpolate: /\{\{(.+?)\}\}/g})(quest)};
                }
            }
        }
    }
    return null;
}

function handleNpcTargetQuests(quests, sessionData, npcId) {
    const npcTargetQuests = quests.filter(quest => quest.eventType === "NPC_TALKED" && quest.target === npcId);
    if (npcTargetQuests) {
        for (const questID of npcTargetQuests.map(quest => quest.id)) {
            const quest = {...questsByID[questID]};
            if (avatarHasQuest(questID, sessionData.gameData.quests) && !avatarHasCompletedQuest(questID, sessionData.gameData.quests)) {
                return { text: quest.npcText };
            }
        }
    }
    return null;
}

function handleReturnToNpcQuests(quests, sessionData, npcId, cache, sessionId, broker) {
    const returnToNpcQuests = quests.filter(quest => quest.returnToNpc === npcId);
    if (returnToNpcQuests) {
        for (const questID of returnToNpcQuests.map(quest => quest.id)) {
            const quest = {...questsByID[questID]};
            if (avatarHasQuest(questID, sessionData.gameData.quests) && !avatarHasCompletedQuest(questID, sessionData.gameData.quests)) {
                if (quest.objectives) {
                const progress = objectives.progress(sessionData.gameData, quest);
                quest.amount = progress.length; quest.done = progress.filter(o => o.done).length; quest.remaining = quest.amount - quest.done;
            }
            const isCompleted = quest.objectives ? objectives.ready(sessionData.gameData, quest) : eventConsumer.completionCheckers[quest.eventType](quest, sessionData);
                if (isCompleted) {
                    completeQuest(questID, sessionData);
                    broker.player.handleCompletedQuests([quest]);
                    cache.set(sessionId, sessionData);
                    return { text: quest.endText };
                }
            }
        }
    }
    return null;
}

function handoutQuest(questID, sessionData) {
    let newQuest = questsByID[questID];

    if (_.isEmpty(newQuest)) {
        return "";
    }

    if (newQuest.requiredQuest && !avatarHasCompletedQuest(newQuest.requiredQuest, sessionData.gameData.quests)) {
        return "";
    }

    if (newQuest.requiredLevel && Formulas.level(sessionData.xp) < newQuest.requiredLevel) {
        return "";
    }

    if (avatarHasQuest(questID, sessionData.gameData.quests)) {
        return "";
    }

    startQuest(sessionData, questID);

    return newQuest.startText;
}

exports.hasQuest = function (questID, sessionData) {
    return avatarHasQuest(questID, sessionData.gameData.quests);
}
exports.hasCompletedQuest = function (questID, sessionData) {
    return avatarHasCompletedQuest(questID, sessionData.gameData.quests);
}

function avatarHasQuest(questId, avatarQuests) {
    if (_.isEmpty(avatarQuests)) return false;
    return Object.values(avatarQuests).flat().some(quest => (quest.questKey || quest.id) === questId);
}

function avatarHasCompletedQuest(questId, avatarQuests) {
    return questState.completed({quests: avatarQuests}, questId);
}

function startQuest(sessionData, questID) {
    dao.setQuestStatus(sessionData.nftId, questID, STATES.IN_PROGRESS);
    let inProgressQuests = sessionData.gameData.quests[STATES.IN_PROGRESS];
    let questInCacheFormat = {questKey: questID, status: STATES.IN_PROGRESS};
    if (!inProgressQuests) {
        sessionData.gameData.quests[STATES.IN_PROGRESS] = [questInCacheFormat];
    } else {
        sessionData.gameData.quests[STATES.IN_PROGRESS].push(questInCacheFormat);
    }
}

function completeQuest(questID, sessionData) {
    if (_.isEmpty(sessionData?.gameData?.quests)) {
        return;
    }

    if (!avatarHasQuest(questID, sessionData.gameData.quests ?? {})) {
        return;
    }

    const definition = questsByID[questID];
    if (definition.objectives && !objectives.ready(sessionData.gameData, definition)) return;
    eventConsumer.completeQuest(sessionData, questID, definition);
}


function groupBy(array, key, isSingleValue = false) {
    return array.reduce((acc, item) => {
        if (isSingleValue) {
            acc[item[key]] = item;
        } else {
            if (!acc[item[key]]) {
                acc[item[key]] = [];
            }
            acc[item[key]].push(item);
        }
        return acc;
    }, {});
}

function validateQuest(quest) {
    objectives.validate(quest);
    if (quest.id.length > 100) {
        console.error("Quest ID is too long: ", quest);
        process.exit(1);
    }
    if (quest.objectives) return;
    let target = quest.target;
    if (target !== "FLOW") {
        if (Types.isMob(target) && quest.eventType !== "KILL_MOB") {
            console.error("Quest target is a mob but event type is not KILL_MOB: ", quest);
            process.exit(1);
        }

        if (Types.isItem(target) && quest.eventType !== "LOOT_ITEM") {
            console.error("Quest target is an item but event type is not LOOT_ITEM: ", quest);
            process.exit(1);
        }
    }
}

exports.npcHasQuest = function (cache, sessionId, npcId) {
    if (questsByNPC[npcId] !== undefined) {
        let sessionData = cache.get(sessionId);

        for (const quest of questsByNPC[npcId]) {
            if (quest.requiredQuest && !avatarHasCompletedQuest(quest.requiredQuest, sessionData.gameData?.quests)) {
                continue;
            }

            if (quest.requiredLevel && Formulas.level(sessionData.xp) < quest.requiredLevel) {
                continue;
            }

            if (avatarHasQuest(quest.id, sessionData.gameData?.quests)) {
                continue;
            }

            if (quest.showIndicator !== false) {
                return true;
            }
        }
    }

    return false;
};

exports.npcHasOpenQuest = function (cache, sessionId, npcId) {
    if (questsByNPC[npcId] !== undefined) {
        let sessionData = cache.get(sessionId);

        for (const quest of questsByNPC[npcId]) {
            if (quest.requiredQuest && !avatarHasCompletedQuest(quest.requiredQuest, sessionData.gameData.quests)) {
                continue;
            }

            if (quest.requiredLevel && Formulas.level(sessionData.xp) < quest.requiredLevel) {
                continue;
            }

            if(!avatarHasQuest(quest.id, sessionData.gameData.quests)) {
                continue
            }

            if (avatarHasCompletedQuest(quest.id, sessionData.gameData.quests)) {
                continue;
            }

            if (quest.showIndicator !== false) {
                return true;
            }
        }
    }

    return false;
};


exports.npcHasOpenQuest = function (cache, sessionId, npcId) {
    if (questsByNPC[npcId] !== undefined) {
        let sessionData = cache.get(sessionId);

        for (const quest of questsByNPC[npcId]) {
            if (quest.requiredQuest && !avatarHasCompletedQuest(quest.requiredQuest, sessionData.gameData.quests)) {
                continue;
            }

            if (quest.requiredLevel && Formulas.level(sessionData.xp) < quest.requiredLevel) {
                continue;
            }

            if(!avatarHasQuest(quest.id, sessionData.gameData.quests)) {
                continue
            }

            if (avatarHasCompletedQuest(quest.id, sessionData.gameData.quests)) {
                continue;
            }

            if (quest.showIndicator !== false) {
                return true;
            }
        }
    }

    return false;
};

exports.questsByID = questsByID;
exports.STATES = STATES;

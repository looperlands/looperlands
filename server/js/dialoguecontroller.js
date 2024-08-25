const discord = require("../js/discord");
const _ = require("underscore");
const main = require("./dialogue/main.js");
const quests = require("./quests/quests.js");
const Formulas = require("./formulas");

class DialogueController {
    constructor(cache, platformClient) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.dialogueTrees = {
            main: main.dialogues
        };
    }

    findDialogueTree(mapId, npcId) {
        try {
            const dialogues = this.dialogueTrees[mapId];
            if (dialogues === null || dialogues === undefined) {
                return null;
            }

            for (let i = 0; i < dialogues.length; i++) {
                const dialogue = dialogues[i];
                if (parseInt(dialogue.npc) === parseInt(npcId)) {
                    dialogue.playerState = {}
                    return dialogue;
                }
            }
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error finding dialogue: ${error}`);
            return null;
        }
    }

    hasDialogueTree(mapId, npcId) {
        try {
            const dialogue = this.findDialogueTree(mapId, npcId);
            return dialogue !== null;
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error with Dialogue: ${error}`);
            return false;
        }
    }

    processDialogueTree(mapId, npcId, cache, sessionId) {
        try {
            const dialogue = this.findDialogueTree(mapId, npcId);

            if (!dialogue) {
                return null;
            }

            const sessionData = cache.get(sessionId) || {};

            let nodeKey = this.determineStartingNode(dialogue, sessionData, npcId);
            let node = dialogue.nodes[nodeKey];

            sessionData.currentNode = node.goto ? node.goto : (node.options ? nodeKey : null);
            cache.set(sessionId, sessionData);

            node = _.clone(node);
            node = this.chooseRandomLines(node);
            node = this.filterOptions(node, sessionData);

            return node;
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error with dialogue: ${error}`);
            return null;
        }
    }

    goto(mapId, npcId, nodeKey, cache, sessionId) {
        const dialogue = this.findDialogueTree(mapId, npcId);
        if(!dialogue) {
            return;
        }
        if(!dialogue.nodes[nodeKey]) {
            return;
        }

        const sessionData = cache.get(sessionId) || {};
        sessionData.currentNode = nodeKey;
        cache.set(sessionId, sessionData);
    }

    determineStartingNode(dialogue, sessionData, npcId) {
        // Check if the currentNpc in session is different from the npcId being processed
        if (sessionData.currentNpc !== npcId) {
            // Reset the session data if the player is talking to a new NPC
            sessionData.currentNode = null;
            sessionData.currentNpc = npcId;
        }

        if(sessionData.currentNode) {
            return sessionData.currentNode;
        }

        let nodeKey = dialogue.start;

        // Check if we should resume from a different node based on resume_conditions
        let resumeConditions = dialogue.resume_conditions;
        if (resumeConditions) {
            // Iterate in reverse order to find the last matching condition
            for (let i = resumeConditions.length - 1; i >= 0; i--) {
                let condition = resumeConditions[i];
                if (this.checkCondition(condition, sessionData)) {
                    nodeKey = condition.goto;
                    break;  // Break as we found the last matching condition
                }
            }
        }

        // Update the currentNode in sessionData
        sessionData.currentNode = nodeKey;
        return nodeKey;
    }

    checkConditions(conditions, sessionData) {
        if (!conditions) {
            return true;
        }

        for (let i = 0; i < conditions.length; i++) {
            if (!this.checkCondition(conditions[i], sessionData)) {
                return false;
            }
        }

        return true;
    }

    checkCondition(condition, sessionData) {
        if (!sessionData) {
            return false
        }

        switch (condition.if) {
            case 'quest_open':
                return this.checkQuestIsOpen(condition.quest, sessionData);
            case 'quest_completed':
                return this.checkQuestIsCompleted(condition.quest, sessionData);
            case 'choice_made':
                return this.checkPlayerMadeChoice(condition.choice, sessionData);
            case 'has_item':
                return this.checkPlayerOwnsItem(condition.item, condition.amount ?? 1, sessionData);
            case 'killed_mob':
                return this.checkPlayerKilledMob(condition.mob, condition.amount ?? 1, sessionData);
            case 'is_level':
                return this.checkPlayerIsLevel(condition.level, sessionData);
            default:
                return false;
        }
    }

    checkQuestIsOpen(questId, sessionData) {
        return quests.hasQuest(questId, sessionData)
    }

    checkQuestIsCompleted(questId, sessionData) {
        return quests.hasCompletedQuest(questId, sessionData);
    }

    checkPlayerMadeChoice(choiceId, sessionData) {
        // todo
        return false;
    }

    checkPlayerOwnsItem(itemId, amount, sessionData) {
        return (sessionData?.gameData?.items[itemId] ?? 0) >= amount
    }

    checkPlayerKilledMob(mobId, amount, sessionData) {
        return (sessionData?.gameData?.mobKills[mobId] ?? 0) >= amount;
    }

    checkPlayerIsLevel(level, sessionData) {
        return Formulas.level(sessionData.xp) >= level;
    }

    chooseRandomLines(node) {
        if(!Array.isArray(node.text)) {
            return node;
        }

        let texts = [];
        for (let i = 0; i < node.text.length; i++) {
            let text = node.text[i];
            if(Array.isArray(text)) {
                let randomIndex = Math.floor(Math.random() * node.text[i].length);
                texts[i] = node.text[i][randomIndex];
            } else {
                texts[i] = text;
            }
        }
        node.text = texts;

        return node;
    }


    filterOptions(node, sessionData) {
        if (!node.options) {
            return node;
        }

        let filteredOptions = [];
        for (let i = 0; i < node.options.length; i++) {
            let option = node.options[i];
            if (this.checkConditions(option.conditions, sessionData)) {
                filteredOptions.push(option);
            }
        }
        node.options = filteredOptions;

        return node;
    }

    errorEncountered(message) {
        discord.sendToDevChannel(message);
        console.log(message);
    }
}

module.exports = DialogueController;
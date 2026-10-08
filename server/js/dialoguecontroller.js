const discord = require("../js/discord");
const _ = require("underscore");
const dao = require('./dao.js');
const main = require("./dialogue/main.js");
const bitcorn = require("./dialogue/bitcorn.js");
const quests = require("./quests/quests.js");
const Formulas = require("./formulas");
const roadState = require('../npc-behaviors/lantern-road-state');
const roadContent = require('../npc-behaviors/lantern-road');

class DialogueController {
    constructor(cache, platformClient) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.dialogueTrees = {
            main: main.dialogues,
            //bitcorn: bitcorn.dialogues
        };
    }

    findDialogueTree(mapId, npcId, npcKey) {
        try {
            const dialogues = this.dialogueTrees[mapId];
            if (dialogues === null || dialogues === undefined) {
                return null;
            }

            for (let i = 0; i < dialogues.length; i++) {
                const dialogue = dialogues[i];
                if (parseInt(dialogue.npc) === parseInt(npcId) && (!npcKey || !dialogue.key || dialogue.key === npcKey)) {
                    return dialogue;
                }
            }
            return null;
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error finding dialogue: ${error}`);
            return null;
        }
    }

    hasDialogueTree(mapId, npcId, npcKey) {
        try {
            const dialogue = this.findDialogueTree(mapId, npcId, npcKey);
            return dialogue !== null;
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error with Dialogue: ${error}`);
            return false;
        }
    }

    processDialogueTree(mapId, npcId, cache, sessionId, npcKey) {
        try {
            const dialogue = this.findDialogueTree(mapId, npcId, npcKey);

            if (!dialogue) return null;

            const sessionData = cache.get(sessionId) || {};

            if (sessionData.currentNpcKey !== npcKey) { sessionData.currentNode = null; sessionData.currentNpcKey = npcKey; }
            let nodeKey = this.determineStartingNode(dialogue, sessionData, npcId);
            let node = dialogue.nodes[nodeKey];
            node = _.clone(node);
            if (node.requires && !this.checkConditions(node.requires, sessionData)) {
                sessionData.currentNode = null;
                return {text: 'This task is not ready yet. Check your journal, then speak to me again.'};
            }
            if (node.legacyQuests) {
                sessionData.currentNode = null;
                sessionData.dialogueTransitions = [];
                cache.set(sessionId, sessionData);
                return quests.handleNPCClick(cache, sessionId, Number(npcId)) || '';
            }

            // Check if custom_css has been defined
            if (dialogue.custom_css || node.custom_css) {
                // using properties in node.custom_css where defined, otherwise falling back on dialogue.custom_css.
                node.custom_css = { ...dialogue.custom_css, ...node.custom_css };
            }

            if (node.conditions) {
                this.applyNodeConditions(node, sessionData);
            }

            sessionData.currentNode = node.goto ? node.goto : (node.options ? nodeKey : null);
            cache.set(sessionId, sessionData);

            let nodeActions = [];
            if (node.actions) {
                nodeActions = _.clone(node.actions);
            }

            if (node.record_choice) {
                nodeActions.push({
                    type: 'record_choice',
                    choice: node.record_choice
                });
            }

            if (nodeActions.length > 0) {
                this.handleNodeActions(nodeActions, cache, sessionId, sessionData);
            }

            node = this.chooseRandomLines(node);
            node = this.filterOptions(node, sessionData);
            if (node.storyMenu || node.storyQuest || node.storyConclusion) require('./lanternroadcontroller').LanternRoadController.decorate(node, sessionData);
            sessionData.dialogueTransitions = [...(node.goto ? [node.goto] : []), ...(node.options || []).map(option => option.goto)];
            sessionData.dialogueNpcKey = npcKey;
            cache.set(sessionId, sessionData);

            return node;
        } catch (error) {
            this.errorEncountered(`[DIALOGUE] Error with dialogue: ${error}`);
            return null;
        }
    }

    handleNodeActions(actions, cache, sessionId, sessionData) {
        for (let action of actions) {

            if (action.conditions) {
                if (!this.checkConditions(action.conditions, sessionData)) {
                    continue;
                }
            }

            const nftId = sessionData.nftId;
            const item = action.item;
            const amount = action.amount || 1;

            switch (action.type) {
                case 'record_choice':
                    this.recordChoice(action, sessionData, cache, sessionId);
                    break;
                case 'give_item':
                    this.giveItem(item, amount, sessionData, action, cache, sessionId, nftId);
                    break;
                case 'take_item':
                    this.takeItem(item, amount, sessionData, nftId);
                    break;
                case 'handout_quest':
                    this.handoutQuest(action, cache, sessionId);
                    break;
                case 'complete_quest':
                    this.completeQuest(action, cache, sessionId);
                    break;
                default:
                    this.errorEncountered(`[DIALOGUE] Unknown action type: ${action.type}`);
            }
        }
    }

    completeQuest(action, cache, sessionId) {
        quests.completeQuest(cache, sessionId, action.quest);
    }

    handoutQuest(action, cache, sessionId) {
        quests.newQuest(cache, sessionId, action.quest);
    }

    takeItem(item, amount, sessionData, nftId) {
        sessionData.gameData.items = sessionData.gameData.items || {};
        sessionData.gameData.items[item] = (sessionData.gameData.items[item] || 0) - amount;
        dao.updateResourceBalance(nftId, item, -amount);
    }

    giveItem(item, amount, sessionData, action, cache, sessionId, nftId) {
        sessionData.gameData.items = sessionData.gameData.items || {};
        sessionData.gameData.items[action.item] = (sessionData.gameData.items[item] || 0) + amount;
        cache.set(sessionId, sessionData);
        dao.updateResourceBalance(nftId, item, amount);
    }

    recordChoice(action, sessionData, cache, sessionId) {
        sessionData.gameData.choices = sessionData.gameData.choices || [];

        if (!sessionData.gameData.choices.includes(action.choice)) {
            sessionData.gameData.choices.push(action.choice);
            cache.set(sessionId, sessionData);
            dao.registerChoice(sessionData.nftId, action.choice);
        }
    }

    goto(mapId, npcId, nodeKey, cache, sessionId, npcKey) {
        const dialogue = this.findDialogueTree(mapId, npcId, npcKey);
        if (!dialogue) {
            return;
        }
        if (!dialogue.nodes[nodeKey]) {
            return;
        }

        const sessionData = cache.get(sessionId) || {};
        if (dialogue.key && (sessionData.dialogueNpcKey !== npcKey ||
            !sessionData.dialogueTransitions?.includes(nodeKey))) return false;
        sessionData.currentNode = nodeKey;
        sessionData.dialogueTransitions = [];
        cache.set(sessionId, sessionData);
        return true;
    }

    determineStartingNode(dialogue, sessionData, npcId) {
        // Check if the currentNpc in session is different from the npcId being processed
        if (sessionData.currentNpc !== npcId) {
            // Reset the session data if the player is talking to a new NPC
            sessionData.currentNode = null;
            sessionData.currentNpc = npcId;
        }

        if (sessionData.currentNode) {
            return sessionData.currentNode;
        }

        let nodeKey = dialogue.start;

        // Check if we should resume from a different node based on resume_conditions
        let resumeConditions = dialogue.resume_conditions;
        if (resumeConditions) {
            // Iterate in reverse order to find the last matching condition
            for (let i = resumeConditions.length - 1; i >= 0; i--) {
                let condition = resumeConditions[i];

                if (condition.conditions) {
                    if (this.checkConditions(condition.conditions, sessionData)) {
                        nodeKey = condition.goto;
                        break;  // Break as we found the last matching condition
                    }
                } else {
                    if (this.checkCondition(condition, sessionData)) {
                        nodeKey = condition.goto;
                        break;  // Break as we found the last matching condition
                    }
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

        const invert = Boolean(condition.if_not);

        let result;
        switch (condition.if_not || condition.if) {
            case 'story_objectives_done':
                result = roadState.ready(sessionData.gameData, roadContent.quests.find(q => q.id === condition.quest));
                break;
            case 'open_quest':
            case 'quest_open':
                result = this.checkQuestIsOpen(condition.quest, sessionData);
                break;
            case 'completed_quest':
            case 'quest_completed':
                result = this.checkQuestIsCompleted(condition.quest, sessionData);
                break;
            case "made_choice":
            case 'choice_made':
                result = this.checkPlayerMadeChoice(condition.choice, sessionData);
                break;
            case 'has_item':
                result = this.checkPlayerOwnsItem(condition.item, condition.amount ?? 1, sessionData);
                break;
            case 'mob_killed':
            case 'killed_mob':
                result = this.checkPlayerKilledMob(condition.mob, condition.amount ?? 1, sessionData);
                break;
            case 'is_level':
                result = this.checkPlayerIsLevel(condition.level, sessionData);
                break;
            default:
                result = false;
        }

        if (invert) {
            return !result;
        }

        return result;
    }

    checkQuestIsOpen(questId, sessionData) {
        return quests.hasQuest(questId, sessionData)
    }

    checkQuestIsCompleted(questId, sessionData) {
        return quests.hasCompletedQuest(questId, sessionData);
    }

    checkPlayerMadeChoice(choiceId, sessionData) {
        return sessionData?.gameData.choices?.includes(choiceId) || false;
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
        if (!Array.isArray(node.text)) {
            return node;
        }

        let texts = [];
        for (let i = 0; i < node.text.length; i++) {
            let text = node.text[i];
            if (Array.isArray(text)) {
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

    applyNodeConditions(node, sessionData) {
        for (let condition of node.conditions) {
            if (this.checkCondition(condition, sessionData)) {
                if (condition.text) {
                    node.text = condition.text;
                }
                if (condition.goto) {
                    node.goto = condition.goto;
                }
            }
        }

        return node;
    }

    errorEncountered(message) {
        discord.sendToDevChannel(message);
    }
}

module.exports = DialogueController;
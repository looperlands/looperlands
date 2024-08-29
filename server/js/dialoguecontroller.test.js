process.env.GAMESERVER_NAME = 'TEST_SERVER';

// Mock for gametypes
jest.mock('../../shared/js/gametypes', () => ({
    Messages: {
        HELLO: 0,
        WELCOME: 1
    },
    Actions: {
        START: 0,
        STOP: 1
    },
    Entities: {
        GOLD: 5
    }
}));

// Mock for formulas
jest.mock('./formulas', () => ({
    level: jest.fn((xp) => {
        // Example mock implementation
        if (xp < 0) {
            throw new Error('XP cannot be negative');
        }
        return Math.floor(xp / 100);  // Example: level based on XP
    }),
}));

// Mock for quests
jest.mock('./quests/quests.js', () => ({
    completeQuest: jest.fn(),
    newQuest: jest.fn(),
    hasCompletedQuest: jest.fn()
}));

// Mock for discord
jest.mock('../js/discord');

// Mock for dao
jest.mock('./dao.js', () => ({
    updateResourceBalance: jest.fn(),
    registerChoice: jest.fn(),
    MOB_KILL_QUEUE: [],  // Mock the MOB_KILL_QUEUE variable
    processMobKillEventQueue: jest.fn()
}));

// Mock for dialogue/main.js
jest.mock('./dialogue/main.js', () => ({
    dialogues: [
        {
            npc: 1,
            name: "John Do",
            start: "start",
            resume_conditions: [
                {
                    conditions: [
                        {
                            "if": "quest_open",
                            "quest": "TEST_DIALOG_QUEST_3",
                        },
                        {
                            "if_not": "quest_completed",
                            "quest": "TEST_DIALOG_QUEST_3",
                        }
                    ],
                    "goto": "check_creature_quest_completion"
                },
                {
                    "if": "quest_completed",
                    "quest": "TEST_DIALOG_QUEST_3",
                    "goto": "offer_second_quest"
                },
                {
                    "if": "quest_open",
                    "quest": "TEST_DIALOG_QUEST_3",
                    "goto": "check_bandit_quest_completion"
                },
                {
                    "if": "quest_completed",
                    "quest": "TEST_DIALOG_QUEST_4",
                    "goto": "final_thanks"
                }
            ],
            nodes: {
                "start": {
                    text: [
                        ["Welcome, traveler.", "hi there"],
                        "The village has been waiting for someone like you."
                    ],
                    goto: "intro"
                },
                "intro": {
                    text: "Our village has faced many troubles recently.<br\>Strange creatures have been appearing in the forest.",
                    goto: "ask_help"
                },
                "ask_help": {
                    text: "We need your help to investigate this. Could you assist us?",
                    options: [
                        { text: "Of course, I will help the village.", goto: "accept_help" },
                        { text: "I'm not interested, sorry.", goto: "decline_help" },
                        { text: "What caused the creatures to appear?", goto: "ask_cause" },
                        { text: "I need more information before deciding.", goto: "more_info" }
                    ]
                },
                "accept_help": {
                    text: "Thank you, brave one! Your courage will not be forgotten.",
                    goto: "handout_quest"
                },
                "more_info": {
                    text: "The creatures appeared shortly after a mysterious storm last week.",
                    goto: "response_options"
                },
                "response_options": {
                    text: "Do you now wish to help us?",
                    options: [
                        { text: "Yes, I will help.", goto: "accept_help" },
                        { text: "I still need to think about it.", goto: "decline_help" },
                        { text: "What was the storm about?", goto: "ask_storm" }
                    ]
                }
            }
        }
    ]
}
));

const DialogueController = require('./dialoguecontroller.js');

describe('DialogueController', () => {
    let cache, platformClient, dialogueController;

    beforeEach(() => {
        cache = new Map();
        platformClient = {};  // Mock platform client as needed
        dialogueController = new DialogueController(cache, platformClient);
    });

    test('findDialogueTree should return the correct dialogue for given mapId and npcId', () => {
        const dialogue = dialogueController.findDialogueTree('main', 1);
        expect(dialogue).not.toBeNull();
        expect(dialogue.npc).toBe(1);
    });

    test('findDialogueTree should return null if mapId does not exist', () => {
        const dialogue = dialogueController.findDialogueTree('nonExistentMap', 1);
        expect(dialogue).toBeNull();
    });

    test('hasDialogueTree should return true if dialogue tree exists', () => {
        const hasDialogue = dialogueController.hasDialogueTree('main', 1);
        expect(hasDialogue).toBe(true);
    });

    test('hasDialogueTree should return false if dialogue tree does not exist', () => {
        const hasDialogue = dialogueController.hasDialogueTree('nonExistentMap', 1);
        expect(hasDialogue).toBe(false);
    });

    test('processDialogueTree should return null if dialogue tree does not exist', () => {
        const sessionId = 'testSession';
        const node = dialogueController.processDialogueTree('nonExistentMap', 1, cache, sessionId);
        expect(node).toBeNull();
    });

    test('determineStartingNode should return the correct node based on conditions', () => {
        const dialogue = {
            start: 'start',
            resume_conditions: [
                { if: 'has_item', item: 'key', goto: 'node1' },
                { if: 'completed_quest', quest: 'quest1', goto: 'node2' }
            ]
        };
        const sessionData = { currentNpc: 1, gameData: { items: { key: 1 }, completedQuests: [] } };

        const nodeKey = dialogueController.determineStartingNode(dialogue, sessionData, 1);
        expect(nodeKey).toBe('node1');
    });

    test('applyNodeConditions should modify the node based on conditions', () => {
        const node = {
            text: 'Hello, adventurer!',
            conditions: [
                { if: 'has_item', item: 'key', text: 'You have the key!' }
            ]
        };
        const sessionData = { gameData: { items: { key: 1 } } };

        const modifiedNode = dialogueController.applyNodeConditions(node, sessionData);
        expect(modifiedNode.text).toBe('You have the key!');
    });

    test('filterOptions should return only the options that meet the conditions', () => {
        const node = {
            options: [
                { text: 'Option 1', goto: 'node1' },
                { text: 'Option 2', goto: 'node2', conditions: [{ if: 'has_item', item: 'key', amount: 1 }] }
            ]
        };
        const sessionData = { gameData: { items: { key: 1 } } };

        const filteredNode = dialogueController.filterOptions(node, sessionData);
        expect(filteredNode.options.length).toBe(2);
    });

    test('filterOptions should return only the options that meet the conditions', () => {
        const node = {
            options: [
                { text: 'Option 1', goto: 'node1' },
                { text: 'Option 2', goto: 'node2', conditions: [{ if: 'has_item', item: 'key', amount: 1 }] }
            ]
        };
        const sessionData = { gameData: { items: { key: 0 } } };

        const filteredNode = dialogueController.filterOptions(node, sessionData);
        expect(filteredNode.options.length).toBe(1);
    });

    test('chooseRandomLines should choose a random line when multiple options are provided', () => {
        const node = {
            text: [
                ['Line 1', 'Line 2'],
                ['Line 3', 'Line 4']
            ]
        };

        const modifiedNode = dialogueController.chooseRandomLines(node);
        expect(modifiedNode.text.length).toBe(2);
        expect(['Line 1', 'Line 2']).toContain(modifiedNode.text[0]);
        expect(['Line 3', 'Line 4']).toContain(modifiedNode.text[1]);
    });
});

describe('DialogueController - checkCondition', () => {
    let dialogueController, sessionData;

    beforeEach(() => {
        // Mock implementation of required functions
        dialogueController = new DialogueController(new Map(), {});
        jest.spyOn(dialogueController, 'checkQuestIsOpen').mockReturnValue(true);
        jest.spyOn(dialogueController, 'checkQuestIsCompleted').mockReturnValue(false);
        jest.spyOn(dialogueController, 'checkPlayerMadeChoice').mockReturnValue(true);
        jest.spyOn(dialogueController, 'checkPlayerOwnsItem').mockReturnValue(true);
        jest.spyOn(dialogueController, 'checkPlayerKilledMob').mockReturnValue(true);
        jest.spyOn(dialogueController, 'checkPlayerIsLevel').mockReturnValue(true);

        sessionData = {
            gameData: {
                items: { key: 1 },
                completedQuests: ['quest1']
            },
            currentNpc: 1
        };
    });

    test('should return true for quest_open condition', () => {
        const condition = { if: 'quest_open', quest: 'TEST_DIALOG_QUEST_3' };
        expect(dialogueController.checkCondition(condition, sessionData)).toBe(true);
        expect(dialogueController.checkQuestIsOpen).toHaveBeenCalledWith('TEST_DIALOG_QUEST_3', sessionData);
    });

    test('should return false for quest_completed condition when the quest is not completed', () => {
        const condition = { if: 'quest_completed', quest: 'TEST_DIALOG_QUEST_2' };
        expect(dialogueController.checkCondition(condition, sessionData)).toBe(false);
        expect(dialogueController.checkQuestIsCompleted).toHaveBeenCalledWith('TEST_DIALOG_QUEST_2', sessionData);
    });

    test('should return true for made_choice condition', () => {
        const condition = { if: 'made_choice', choice: 'choice1' };
        expect(dialogueController.checkCondition(condition, sessionData)).toBe(true);
        expect(dialogueController.checkPlayerMadeChoice).toHaveBeenCalledWith('choice1', sessionData);
    });

    test('should return true for has_item condition', () => {
        const condition = { if: 'has_item', item: 'key', amount: 1 };
        expect(dialogueController.checkCondition(condition, sessionData)).toBe(true);
        expect(dialogueController.checkPlayerOwnsItem).toHaveBeenCalledWith('key', 1, sessionData);
    });

    test('should return true for mob_killed condition', () => {
        const condition = { if: 'mob_killed', mob: 'mob1', amount: 1 };
        expect(dialogueController.checkCondition(condition, sessionData)).toBe(true);
        expect(dialogueController.checkPlayerKilledMob).toHaveBeenCalledWith('mob1', 1, sessionData);
    });

    test('should return true for is_level condition', () => {
        const condition = { if: 'is_level', level: 5 };
        expect(dialogueController.checkCondition(condition, sessionData)).toBe(true);
        expect(dialogueController.checkPlayerIsLevel).toHaveBeenCalledWith(5, sessionData);
    });

    test('should return false for an unknown condition', () => {
        const condition = { if: 'unknown_condition' };
        expect(dialogueController.checkCondition(condition, sessionData)).toBe(false);
    });

    test('should return false when sessionData is not provided', () => {
        const condition = { if: 'quest_open', quest: 'TEST_DIALOG_QUEST_3' };
        expect(dialogueController.checkCondition(condition)).toBe(false);
    });

    test('should invert the result for if_not condition', () => {
        const condition = { if_not: 'quest_completed', quest: 'TEST_DIALOG_QUEST_2' };
        expect(dialogueController.checkCondition(condition, sessionData)).toBe(true);
        expect(dialogueController.checkQuestIsCompleted).toHaveBeenCalledWith('TEST_DIALOG_QUEST_2', sessionData);
    });

    test('should return false for inverted condition if the original condition is true', () => {
        const condition = { if_not: 'quest_open', quest: 'TEST_DIALOG_QUEST_3' };
        expect(dialogueController.checkCondition(condition, sessionData)).toBe(false);
        expect(dialogueController.checkQuestIsOpen).toHaveBeenCalledWith('TEST_DIALOG_QUEST_3', sessionData);
    });
});

describe('DialogueController - processDialogueTree', () => {
    let dialogueController, cache, sessionId, mapId, npcId, dialogue, sessionData;

    beforeEach(() => {
        // Initialize the necessary objects
        cache = new Map();
        sessionId = 'testSession';
        mapId = 'main';
        npcId = 1;

        dialogueController = new DialogueController(cache, {});

        // Mock the methods that are used within processDialogueTree
        jest.spyOn(dialogueController, 'findDialogueTree').mockReturnValue({
            npc: 1,
            nodes: {
                start: {
                    text: 'Hello, adventurer!',
                    goto: 'nextNode',
                },
                nextNode: {
                    text: 'Welcome to the village.',
                    options: [
                        { text: 'Tell me more.', goto: 'detailsNode' },
                        { text: 'I need to go.', goto: 'exitNode' },
                    ],
                },
                detailsNode: {
                    text: 'Here are the details...',
                },
            },
        });

        jest.spyOn(dialogueController, 'determineStartingNode').mockReturnValue('start');
        jest.spyOn(dialogueController, 'applyNodeConditions').mockImplementation(node => node);
        jest.spyOn(dialogueController, 'handleNodeActions').mockImplementation(() => {});
        jest.spyOn(dialogueController, 'chooseRandomLines').mockImplementation(node => node);
        jest.spyOn(dialogueController, 'filterOptions').mockImplementation(node => node);
        jest.spyOn(dialogueController, 'errorEncountered').mockImplementation((msg) => console.error(msg));

        // Set up initial session data
        sessionData = {
            currentNpc: 1,
            gameData: {
                items: { key: 1 },
                completedQuests: [],
            },
        };

        cache.set(sessionId, sessionData);
    });

    test('should process dialogue tree and return the correct node', () => {
        const node = dialogueController.processDialogueTree(mapId, npcId, cache, sessionId);

        expect(dialogueController.findDialogueTree).toHaveBeenCalledWith(mapId, npcId);
        expect(dialogueController.determineStartingNode).toHaveBeenCalledWith(dialogueController.findDialogueTree(), sessionData, npcId);
        expect(node).not.toBeNull();
        expect(node.text).toBe('Hello, adventurer!');
        expect(cache.get(sessionId).currentNode).toBe('nextNode');
    });

    test('should return null if no dialogue is found', () => {
        dialogueController.findDialogueTree.mockReturnValue(null);

        const node = dialogueController.processDialogueTree(mapId, npcId, cache, sessionId);

        expect(node).toBeNull();
    });

    test('should handle conditions and actions properly', () => {
        dialogueController.findDialogueTree.mockReturnValue({
            npc: 1,
            nodes: {
                start: {
                    text: 'Hello, adventurer!',
                    conditions: [{ if: 'has_item', item: 'key' }],
                    actions: [{ type: 'someAction' }],
                    goto: 'nextNode',
                },
            },
        });

        const node = dialogueController.processDialogueTree(mapId, npcId, cache, sessionId);

        expect(dialogueController.applyNodeConditions).toHaveBeenCalled();
        expect(dialogueController.handleNodeActions).toHaveBeenCalled();
        expect(node).not.toBeNull();
    });

    test('should catch and log errors, returning null', () => {
        dialogueController.findDialogueTree.mockImplementation(() => {
            throw new Error('Unexpected error');
        });

        const node = dialogueController.processDialogueTree(mapId, npcId, cache, sessionId);

        expect(node).toBeNull();
    });
});


process.env.GAMESERVER_NAME = 'TEST_SERVER';
process.env.DISCORD_TOKEN = "TEST_TOKEN";

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
            custom_css: [
                {
                "avatar": "url(..img/3.JOHN_DO.png",
                "background_position": "-18px -316px",
                "width": "60%",
                "left": "50%"
                }
            ],
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

    test('Should return null and log an error when an exception is thrown in findDialogueTree', () => {
        const dialogueController = new DialogueController(new Map(), {});
        jest.spyOn(dialogueController, 'errorEncountered').mockImplementation(() => {});
    
        // Force an error by mocking dialogueTrees to throw an exception
        dialogueController.dialogueTrees = new Proxy({}, {
            get() {
                throw new Error("Simulated error");
            }
        });
    
        const result = dialogueController.findDialogueTree('main', 1);
        expect(result).toBeNull();
    
        expect(dialogueController.errorEncountered).toHaveBeenCalledWith(
            expect.stringContaining("[DIALOGUE] Error finding dialogue: Error: Simulated error")
        );
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

    test('Should log an error for an unknown action type in handleNodeActions', () => {
        const dialogueController = new DialogueController(new Map(), {});
    
        // Spy on errorEncountered to verify it's called for unknown action types
        jest.spyOn(dialogueController, 'errorEncountered').mockImplementation(() => {});
    
        // Create an action with an unknown type
        const actions = [
            { type: 'unknown_action', item: 'testItem' }
        ];
        const cache = new Map();
        const sessionId = 'testSession';
        const sessionData = { nftId: 'testNftId' };
    
        // Call handleNodeActions with the unknown action
        dialogueController.handleNodeActions(actions, cache, sessionId, sessionData);
    
        // Verify that errorEncountered was called with the expected error message
        expect(dialogueController.errorEncountered).toHaveBeenCalledWith(
            "[DIALOGUE] Unknown action type: unknown_action"
        );
    });
    
    test('should return currentNode from sessionData if it exists in determineStartingNode', () => {
        const dialogueController = new DialogueController(new Map(), {});
    
        // Set up the dialogue object and sessionData with a currentNode
        const dialogue = {
            start: 'start',
            resume_conditions: [
                { if: 'has_item', item: 'key', goto: 'node1' }
            ]
        };
        const sessionData = {
            currentNpc: 1,
            currentNode: 'existingNode', // This should be returned immediately
            gameData: { items: { key: 1 } }
        };
        const npcId = 1;
    
        // Call determineStartingNode with the sessionData containing currentNode
        const result = dialogueController.determineStartingNode(dialogue, sessionData, npcId);
    
        // Verify that currentNode from sessionData is returned directly
        expect(result).toBe('existingNode');
        expect(sessionData.currentNode).toBe('existingNode'); // Ensure it didn't get modified
    });

    test('should set nodeKey to condition.goto when a matching resume_condition is found in determineStartingNode', () => {
        const dialogueController = new DialogueController(new Map(), {});
    
        // Mock checkConditions to return true for the first condition and false for the second
        jest.spyOn(dialogueController, 'checkConditions')
            .mockImplementation((conditions) => conditions[0]?.if === 'has_item');
    
        const dialogue = {
            start: 'start',
            resume_conditions: [
                { conditions: [{ if: 'has_item', item: 'key' }], goto: 'node1' },
                { conditions: [{ if: 'completed_quest', quest: 'quest1' }], goto: 'node2' }
            ]
        };
        const sessionData = {
            currentNpc: 1,
            gameData: { items: { key: 1 }, completedQuests: [] }  // No completed quest, so second condition should not match
        };
        const npcId = 1;
    
        // Call determineStartingNode with matching resume_conditions
        const result = dialogueController.determineStartingNode(dialogue, sessionData, npcId);
    
        // Verify that nodeKey is set to the goto value of the first matching condition (node1)
        expect(result).toBe('node1');
    
        // Confirm checkConditions was called with the correct arguments for both conditions
        expect(dialogueController.checkConditions).toHaveBeenCalledWith(
            [{ if: 'has_item', item: 'key' }],
            sessionData
        );
        expect(dialogueController.checkConditions).toHaveBeenCalledWith(
            [{ if: 'completed_quest', quest: 'quest1' }],
            sessionData
        );
    });
    
    test('should return node immediately if node.text is not an array in chooseRandomLines', () => {
        const dialogueController = new DialogueController(new Map(), {});
    
        const node = { text: "Single line of text" }; // node.text is a string, not an array
    
        // Call chooseRandomLines and expect it to return the node unchanged
        const result = dialogueController.chooseRandomLines(node);
        expect(result).toBe(node);
        expect(result.text).toBe("Single line of text");
    });

    test('should assign text directly to texts[i] when node.text contains non-array elements in chooseRandomLines', () => {
        const dialogueController = new DialogueController(new Map(), {});
    
        const node = {
            text: [
                "Line 1", // not an array, should be assigned directly
                ["Option A", "Option B"], // array, should pick a random element
                "Line 2"  // not an array, should be assigned directly
            ]
        };
    
        // Call chooseRandomLines
        const result = dialogueController.chooseRandomLines(node);
    
        // Ensure that non-array items are assigned directly
        expect(result.text[0]).toBe("Line 1");
        expect(result.text[2]).toBe("Line 2");
    
        // Verify that the middle item is randomly chosen from the array
        expect(["Option A", "Option B"]).toContain(result.text[1]);
    });
    
    test('should return node immediately if node.options is not defined in filterOptions', () => {
        const dialogueController = new DialogueController(new Map(), {});
    
        const node = { text: "Some text" }; // node.options is undefined
    
        // Call filterOptions and expect it to return the node unchanged
        const result = dialogueController.filterOptions(node, {});
        expect(result).toBe(node);
        expect(result.text).toBe("Some text");
        expect(result.options).toBeUndefined(); // Ensure options are still undefined
    });
    
    test('should set node.goto to condition.goto when condition is met in applyNodeConditions', () => {
        const dialogueController = new DialogueController(new Map(), {});
    
        // Mock checkCondition to return true
        jest.spyOn(dialogueController, 'checkCondition').mockReturnValue(true);
    
        const node = {
            text: "Original text",
            conditions: [
                {
                    goto: 'nextNode',
                    text: "New text"
                }
            ]
        };
        const sessionData = { gameData: {} };
    
        // Call applyNodeConditions
        const result = dialogueController.applyNodeConditions(node, sessionData);
    
        // Verify that node.goto is set to the value from the condition
        expect(result.goto).toBe('nextNode');
        // Ensure that node.text was also updated to the new text from the condition
        expect(result.text).toBe("New text");
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

    test('determineStartingNode should reset session data when talking to a different NPC', () => {
        const dialogue = {
            start: 'start',
            resume_conditions: [
                { if: 'has_item', item: 'key', goto: 'node1' },
                { if: 'completed_quest', quest: 'quest1', goto: 'node2' }
            ]
        };
        const sessionData = { currentNpc: 2, currentNode: 'previousNode', gameData: { items: { key: 1 }, completedQuests: [] } };
    
        const nodeKey = dialogueController.determineStartingNode(dialogue, sessionData, 1);
    
        expect(sessionData.currentNode).toBe("node1");
        // Ensure that sessionData.currentNpc was updated
        expect(sessionData.currentNpc).toBe(1);
        // Ensure that the correct nodeKey is returned after resetting sessionData
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
        jest.spyOn(dialogueController, 'handleNodeActions').mockImplementation(() => { });
        jest.spyOn(dialogueController, 'chooseRandomLines').mockImplementation(node => node);
        jest.spyOn(dialogueController, 'filterOptions').mockImplementation(node => node);

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

    test('Should provide the custom CSS if defined', () => {
        dialogueController.findDialogueTree.mockReturnValue({
            npc: 1,
            custom_css: {
                avatar: "url(../img/3/JOHN_DO.png)",
                background_position: "-18px -316px",
                width: "60%"
            },
            nodes: { start: { text: "Hello!" } }
        });
    
        const node = dialogueController.processDialogueTree("main", 1, cache, sessionId);
    
        expect(node.custom_css).toBeDefined();
        expect(node.custom_css.avatar).toBe("url(../img/3/JOHN_DO.png)");
        expect(node.custom_css.background_position).toBe("-18px -316px");
        expect(node.custom_css.width).toBe("60%");
    });
    
    test('should catch and log errors, returning null', () => {
        dialogueController.findDialogueTree.mockImplementation(() => {
            throw new Error('Unexpected error');
        });

        const node = dialogueController.processDialogueTree(mapId, npcId, cache, sessionId);

        expect(node).toBeNull();
    });
    
});


describe('DialogueController - handleNodeActions', () => {
    let dialogueController, cache, sessionId, sessionData;

    beforeEach(() => {
        // Initialize the necessary objects
        cache = new Map();
        sessionId = 'testSession';
        sessionData = { nftId: 'testNftId', currentNpc: 1 };

        dialogueController = new DialogueController(cache, {});

        // Mock the methods that are used within handleNodeActions
        jest.spyOn(dialogueController, 'checkConditions').mockReturnValue(true);
        jest.spyOn(dialogueController, 'recordChoice').mockImplementation(() => { });
        jest.spyOn(dialogueController, 'giveItem').mockImplementation(() => { });
        jest.spyOn(dialogueController, 'takeItem').mockImplementation(() => { });
        jest.spyOn(dialogueController, 'handoutQuest').mockImplementation(() => { });
        jest.spyOn(dialogueController, 'completeQuest').mockImplementation(() => { });
    });

    test('should handle record_choice action', () => {
        const actions = [
            { type: 'record_choice', choice: 'testChoice' }
        ];

        dialogueController.handleNodeActions(actions, cache, sessionId, sessionData);

        expect(dialogueController.recordChoice).toHaveBeenCalledWith(actions[0], sessionData, cache, sessionId);
    });

    test('should handle give_item action', () => {
        const actions = [
            { type: 'give_item', item: 'testItem', amount: 3 }
        ];

        dialogueController.handleNodeActions(actions, cache, sessionId, sessionData);

        expect(dialogueController.giveItem).toHaveBeenCalledWith('testItem', 3, sessionData, actions[0], cache, sessionId, 'testNftId');
    });

    test('should handle take_item action', () => {
        const actions = [
            { type: 'take_item', item: 'testItem', amount: 2 }
        ];

        dialogueController.handleNodeActions(actions, cache, sessionId, sessionData);

        expect(dialogueController.takeItem).toHaveBeenCalledWith('testItem', 2, sessionData, 'testNftId');
    });

    test('should handle handout_quest action', () => {
        const actions = [
            { type: 'handout_quest', quest: 'testQuest' }
        ];

        dialogueController.handleNodeActions(actions, cache, sessionId, sessionData);

        expect(dialogueController.handoutQuest).toHaveBeenCalledWith(actions[0], cache, sessionId);
    });

    test('should handle complete_quest action', () => {
        const actions = [
            { type: 'complete_quest', quest: 'testQuest' }
        ];

        dialogueController.handleNodeActions(actions, cache, sessionId, sessionData);

        expect(dialogueController.completeQuest).toHaveBeenCalledWith(actions[0], cache, sessionId);
    });

    test('should skip action if conditions are not met', () => {
        dialogueController.checkConditions.mockReturnValue(false);

        const actions = [
            { type: 'give_item', item: 'testItem', amount: 3, conditions: [{ if: 'has_item', item: 'key' }] }
        ];

        dialogueController.handleNodeActions(actions, cache, sessionId, sessionData);

        expect(dialogueController.giveItem).not.toHaveBeenCalled();
    });
});

describe('DialogueController - Quests Methods', () => {
    let dialogueController, cache, sessionId, action;
    let quests;

    beforeEach(() => {
        // Initialize the necessary objects
        cache = new Map();
        sessionId = 'testSession';

        dialogueController = new DialogueController(cache, {});

        // Mock the quests module
        quests = require('./quests/quests.js');  // Ensure quests is imported and assigned
        jest.spyOn(quests, 'completeQuest').mockImplementation(() => { });
        jest.spyOn(quests, 'newQuest').mockImplementation(() => { });

        action = { quest: 'testQuest' };
    });

    test('completeQuest should call quests.completeQuest', () => {
        dialogueController.completeQuest(action, cache, sessionId);

        expect(quests.completeQuest).toHaveBeenCalledWith(cache, sessionId, 'testQuest');
    });

    test('handoutQuest should call quests.newQuest', () => {
        dialogueController.handoutQuest(action, cache, sessionId);

        expect(quests.newQuest).toHaveBeenCalledWith(cache, sessionId, 'testQuest');
    });
});

describe('DialogueController - Items Methods', () => {
    let dialogueController, sessionData, nftId, item, amount, cache, sessionId, action;
    let dao;

    beforeEach(() => {
        // Initialize the necessary objects
        sessionData = { gameData: { items: { testItem: 5 } } };
        nftId = 'testNftId';
        item = 'testItem';
        amount = 3;
        sessionId = 'testSession';
        cache = new Map().set(sessionId, sessionData);

        dialogueController = new DialogueController(cache, {});

        // Mock the dao module
        dao = require('./dao.js');  // Ensure dao is imported and assigned
        jest.spyOn(dao, 'updateResourceBalance').mockImplementation(() => { });
    });

    test('takeItem should reduce the item amount and update resource balance', () => {
        dialogueController.takeItem(item, amount, sessionData, nftId);

        expect(sessionData.gameData.items[item]).toBe(2);  // 5 - 3 = 2
        expect(dao.updateResourceBalance).toHaveBeenCalledWith(nftId, item, -amount);
    });

    test('takeItem should handle non-existent items correctly', () => {
        const newItem = 'newItem';
        dialogueController.takeItem(newItem, amount, sessionData, nftId);

        expect(sessionData.gameData.items[newItem]).toBe(-amount);  // New item should be initialized and subtracted
        expect(dao.updateResourceBalance).toHaveBeenCalledWith(nftId, newItem, -amount);
    });

    test('giveItem should increase the item amount and update resource balance', () => {
        action = { item: 'testItem' };
        dialogueController.giveItem(item, amount, sessionData, action, cache, sessionId, nftId);

        expect(sessionData.gameData.items[item]).toBe(8);  // 5 + 3 = 8
        expect(cache.get(sessionId)).toBe(sessionData);  // Ensure the cache is updated
        expect(dao.updateResourceBalance).toHaveBeenCalledWith(nftId, item, amount);
    });

    test('giveItem should handle non-existent items correctly', () => {
        const newItem = 'newItem';
        action = { item: newItem };
        dialogueController.giveItem(newItem, amount, sessionData, action, cache, sessionId, nftId);

        expect(sessionData.gameData.items[newItem]).toBe(amount);  // New item should be initialized and added
        expect(cache.get(sessionId)).toBe(sessionData);  // Ensure the cache is updated
        expect(dao.updateResourceBalance).toHaveBeenCalledWith(nftId, newItem, amount);
    });
});

describe('DialogueController - recordChoice', () => {
    let dialogueController, sessionData, cache, sessionId, action;
    let dao;

    beforeEach(() => {
        // Initialize the necessary objects
        sessionData = { nftId: 'testNftId', gameData: { choices: ['choice1'] } };
        sessionId = 'testSession';
        cache = new Map().set(sessionId, sessionData);
        action = { choice: 'testChoice' };

        dialogueController = new DialogueController(cache, {});

        // Mock the dao module
        dao = require('./dao.js');  // Ensure dao is imported and assigned
        jest.spyOn(dao, 'registerChoice').mockImplementation(() => { });
    });

    test('recordChoice should add a choice if not already present and update cache', () => {
        dialogueController.recordChoice(action, sessionData, cache, sessionId);

        expect(sessionData.gameData.choices).toContain('testChoice');
        expect(cache.get(sessionId)).toBe(sessionData);
        expect(dao.registerChoice).toHaveBeenCalledWith('testNftId', 'testChoice');
    });

    test('recordChoice should initialize choices array if it does not exist', () => {
        sessionData.gameData.choices = undefined;
        dialogueController.recordChoice(action, sessionData, cache, sessionId);

        expect(sessionData.gameData.choices).toEqual(['testChoice']);
        expect(cache.get(sessionId)).toBe(sessionData);
        expect(dao.registerChoice).toHaveBeenCalledWith('testNftId', 'testChoice');
    });
});

describe('DialogueController - goto', () => {
    let dialogueController, cache, sessionId, mapId, npcId, nodeKey, sessionData;

    beforeEach(() => {
        // Initialize the necessary objects
        cache = new Map();
        sessionId = 'testSession';
        mapId = 'main';
        npcId = 1;
        nodeKey = 'nextNode';

        dialogueController = new DialogueController(cache, {});

        // Mock the methods that are used within goto
        jest.spyOn(dialogueController, 'findDialogueTree').mockReturnValue({
            npc: 1,
            nodes: {
                start: { text: 'Hello, adventurer!' },
                nextNode: { text: 'Welcome to the village.' },
            },
        });

        // Set up initial session data
        sessionData = {};
        cache.set(sessionId, sessionData);
    });

    test('goto should set the currentNode in session data if the node exists', () => {
        dialogueController.goto(mapId, npcId, nodeKey, cache, sessionId);

        expect(sessionData.currentNode).toBe(nodeKey);
        expect(cache.get(sessionId)).toBe(sessionData);
    });

    test('goto should not modify session data if the node does not exist', () => {
        nodeKey = 'nonExistentNode';
        dialogueController.goto(mapId, npcId, nodeKey, cache, sessionId);

        expect(sessionData.currentNode).toBeUndefined();
        expect(cache.get(sessionId)).toBe(sessionData);
    });

    test('goto should not modify session data if no dialogue is found', () => {
        dialogueController.findDialogueTree.mockReturnValue(null);

        dialogueController.goto(mapId, npcId, nodeKey, cache, sessionId);

        expect(sessionData.currentNode).toBeUndefined();
        expect(cache.get(sessionId)).toBe(sessionData);
    });
});

describe('DialogueController - checkPlayerKilledMob', () => {
    let dialogueController, sessionData;

    beforeEach(() => {
        dialogueController = new DialogueController(new Map(), {});
    });

    test('should return true if player has killed enough of the specified mob', () => {
        sessionData = {
            gameData: {
                mobKills: {
                    testMob: 5
                }
            }
        };
        const result = dialogueController.checkPlayerKilledMob('testMob', 3, sessionData);

        expect(result).toBe(true);
    });

    test('should return false if player has not killed enough of the specified mob', () => {
        sessionData = {
            gameData: {
                mobKills: {
                    testMob: 2
                }
            }
        };
        const result = dialogueController.checkPlayerKilledMob('testMob', 3, sessionData);

        expect(result).toBe(false);
    });

    test('should return false if player has not killed the specified mob at all', () => {
        sessionData = {
            gameData: {
                mobKills: {}
            }
        };
        const result = dialogueController.checkPlayerKilledMob('testMob', 1, sessionData);

        expect(result).toBe(false);
    });

    test('should return false if sessionData is undefined', () => {
        sessionData = undefined;
        const result = dialogueController.checkPlayerKilledMob('testMob', 1, sessionData);

        expect(result).toBe(false);
    });
});

describe('DialogueController - checkPlayerIsLevel', () => {
    let dialogueController, sessionData;
    let Formulas;

    beforeEach(() => {
        dialogueController = new DialogueController(new Map(), {});

        // Mock the Formulas module
        Formulas = require('./formulas');
        jest.spyOn(Formulas, 'level').mockImplementation((xp) => Math.floor(xp / 100));  // Example mock implementation
    });

    test('should return true if player level is equal to or greater than specified level', () => {
        sessionData = { xp: 300 };
        const result = dialogueController.checkPlayerIsLevel(3, sessionData);

        expect(result).toBe(true);
        expect(Formulas.level).toHaveBeenCalledWith(300);
    });

    test('should return false if player level is less than the specified level', () => {
        sessionData = { xp: 200 };
        const result = dialogueController.checkPlayerIsLevel(3, sessionData);

        expect(result).toBe(false);
        expect(Formulas.level).toHaveBeenCalledWith(200);
    });

    test('should return false if sessionData.xp is undefined', () => {
        sessionData = {};
        const result = dialogueController.checkPlayerIsLevel(1, sessionData);

        expect(result).toBe(false);
    });
});

describe('DialogueController - hasDialogueTree Error Handling', () => {
    let dialogueController;

    beforeEach(() => {
        // Initialize the necessary objects
        dialogueController = new DialogueController(new Map(), {});

        // Mock the findDialogueTree method to throw an error
        jest.spyOn(dialogueController, 'findDialogueTree').mockImplementation(() => {
            throw new Error('Test error');
        });
    });

    test('should return false and log an error when findDialogueTree throws an error', () => {
        const result = dialogueController.hasDialogueTree('testMap', 1);

        expect(result).toBe(false);  // Ensure the method returns false
    });
});

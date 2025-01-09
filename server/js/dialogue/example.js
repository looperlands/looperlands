// Import game types, so are sure to use the correct types
Types = require("../../../shared/js/gametypes");

dialogue = {
    // The NPC That talks
    "npc": Types.Entities.DIALOGUE_EXAMPLE_NPC,
    "name": "John Do", // The name of the NPC (might be used in UI in the future), free text
    "start": "start", // The first node to start the dialogue (if no resume conditions are met)
    
    // "custom_css": {                              // Use "custom_css" if you want to specify a default custom_css for your character's dialogue (you can even override this default on a node by node basis)
    //    "avatar": "url(../img/3/JOHN_DOE.png)",   required* - [avatar] *if you want an avatar to show
    //    "background_position": "0px 0px",         optional  - [avatar] helpful to position your avatar image
    //    "background_size": "cover",               optional  - [avatar] may be helpful positioning your avatar image
    //    "top": "15%",                             optional  - [dialogue popup] sets top for dialogue popup    (default = 15%)
    //    "left": "25%",                            optional  - [dialogue popup] sets left for dialogue popup   (default = 25%)
    //    "width": "45%",                           optional  - [dialogue popup] sets width of dialogue popup   (default = 45%)
    //    "height": "auto"                          optional  - [dialogue popup] sets height of dialogue popup  (default = auto)
    //  },

    "resume_conditions": [ // The last node that matches the conditions will be the starting node, otherwise it will start from the node defined as `start`-property
        {
            // A list of conditions to check, all must be true
            // Conditions can be used at different levels in the dialogue tree (resume_conditions, nodes, options, actions)
            // --------
            // Property `if` is the condition to check if something is true
            // Property `if_not` is the condition to check if something is false
            // The value determines what to check. Options are: `quest_open`, `quest_completed`, `choice_made`, `has_item`, `killed_mob`, `is_level`
            // - `quest_open` and `quest_closed`: the `quest` property is required
            // - `choice_made`:                   the `choice` property is required
            // - `has_item`:                      the `item` property is required, and the `amount` property is optional (default 1)
            // - `killed_mob`:                    the `mob` property is required, and the `amount` property is optional (default 1)
            // - `is_level`:                      the `level` property is required
            // --------
            "conditions": [
                {
                    "if": "quest_open",
                    "quest": "TEST_DIALOG_QUEST_3",
                },
                {
                    "if_not": "quest_completed",
                    "quest": "TEST_DIALOG_QUEST_3",
                }
            ],
            "goto": "check_creature_quest_completion" // The node to start from if the conditions are met
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
    // The nodes of the dialogue tree, a `goto` property points to one of these nodes
    // Each node has a unique name (e.g. "start", "intro"), and can have the following properties:
    // When the node is finished (e.g. the player has read the text), the game will move to the next node, defined in the `goto` property
    // When no `goto` property is defined, the dialogue will end
    "nodes": {
        "start": {
            // "custom_css": {     // FYI - You can even specify custom_css that overrides the default on a node by node basis
            //    "width": "69%"
            //  },
            // The text to show the player
            // This can be a string, indicating a single message, or an array of strings, indicating multiple messages
            // When you use an array, you can optionally again use an array of strings, to indicate multiple options for the NPC to choose from (randomly)
            // See example below
            "text": [
                ["Welcome, traveler.", "hi there"], // One of these messages will be chosen randomly
                "The village has been waiting for someone like you." // This message will always be shown next
            ],
            "goto": "intro" // Next node to go to
        },
        "intro": {
            // You can use HTML in the text, but be careful with the formatting
            "text": "Our village has faced many troubles recently.<br\>Strange creatures have been appearing in the forest.",
            "goto": "ask_help"
        },
        "ask_help": {
            // When options are defined, a dialogue box will show the player the options to choose from
            // The text is the message to show the player
            // When the player chooses an option, the game will move to the node defined in the `goto` property
            "text": "We need your help to investigate this. Could you assist us?",
            "options": [
                {
                    "text": "Of course, I will help the village.",
                    "goto": "accept_help"
                },
                {
                    "text": "I'm not interested, sorry.",
                    "goto": "decline_help"
                },
                {
                    "text": "What caused the creatures to appear?",
                    "goto": "ask_cause"
                },
                {
                    "text": "I need more information before deciding.",
                    "goto": "more_info"
                },
            ]
        },
        // Nothing new here, just a node with a message and a `goto` property
        "accept_help": {
            "text": "Thank you, brave one! Your courage will not be forgotten.",
            "goto": "handout_quest"
        },
        // Nothing new here, just a node with a message and a `goto` property
        "more_info": {
            "text": "The creatures appeared shortly after a mysterious storm last week.",
            "goto": "response_options"
        },
        // Again, a choice node with options, but one of the options is conditional
        "response_options": {
            "text": "Do you now wish to help us?",
            "options": [
                {
                    "text": "Yes, I will help.",
                    "goto": "accept_help"
                },
                {
                    "text": "I still need to think about it.",
                    "goto": "decline_help"
                },
                // This choice option will only be shown if the condition is met (the player has asked about the storm)
                {
                    "text": "What was the storm about?",
                    "goto": "ask_storm",
                    // Conditions work the same as in the `resume_conditions` property
                    "conditions": [
                        {
                            "if": "choice_made",
                            "choice": "ask_cause"
                        }
                    ]
                }
            ]
        },
        // This node records a choice made by the player
        "ask_cause": {
            "text": "We believe the creatures are linked to the strange storm that hit the village.",
            "record_choice": "ask_cause", // You can put any string here, it's just a reference. It will be used in the `choice_made` condition of other nodes
            "goto": "ask_help"
        },
        // When the player asks about the storm, they will get a reward, but only once.
        // This is done by adding `actions` to the node
        "ask_storm": {
            "text": "The storm was unlike anything we've seen. It brought an eerie silence followed by these strange creatures.",
            // A list of actions to execute when the node is reached
            // Actions can be used to give items, hand out quests, or record choices
            // Actions have a `type` property, possible values are: `give_item`, `take_item`, `handout_quest`, `complete_quest`, `record_choice`
            // - `give_item`:       gives the player an item, the `item` property is required, and the `amount` property is optional (default 1)
            // - `take_item`:       takes an item from the player, the `item` property is required, and the `amount` property is optional (default 1)
            // - `handout_quest`:   gives the player a quest, the `quest` property is required, (the quest must be defined in the `quests` json file for the map)
            // - `complete_quest`:  completes a quest, the `quest` property is required
            // - `record_choice`:   records a choice made by the player, the `choice` property is required
            // --------
            // The `conditions` property is optional, and works the same as in the `resume_conditions` property
            // Conditions can be used to check if the action should be executed
            "actions": [
                {
                    "type": "give_item",
                    "item": Types.Entities.CPOTION_L,
                    "conditions": [
                        {
                            "if_not": "choice_made",
                            "choice": "ask_storm"
                        }
                    ]
                }
            ],
            // This is a shorthand for the `record_choice` action
            "record_choice": "ask_storm",
            "goto": "response_options"
        },
        "handout_quest": {
            "text": "Take this map, it will guide you to the forest where the creatures were last seen.",
            "actions": [
                {
                    "type": "handout_quest",
                    "quest": "TEST_DIALOG_QUEST"
                }
            ],
            "goto": "check_creature_quest_completion"
        },
        "check_creature_quest_completion": {
            "text": "Thank you again for your help.",
        },
        "offer_second_quest": {
            "text": "With the creatures gone, a new threat has arisen. Bandits have started raiding our supplies. Can you help us once more?",
            "goto": "response_options_second_quest"
        },
        "response_options_second_quest": {
            "text": "How will you respond?",
            "options": [
                {
                    "text": "Yes, I will deal with the bandits.",
                    "goto": "handout_second_quest"
                },
                {
                    "text": "I need to prepare first.",
                    "goto": "decline_second_quest"
                }
            ]
        },
        "handout_second_quest": {
            "text": "Bless you, brave soul. The bandits were last seen near the old mill.",
            "actions": [
                {
                    "type": "handout_quest",
                    "quest": "TEST_DIALOG_QUEST_2"
                }
            ],
            "goto": "check_bandit_quest_completion"
        },
        "check_bandit_quest_completion": {
            "text": "You have done so much for us.",
        },
        "decline_help": {
            "text": "We understand. Please come back if you change your mind.",
            "goto": "end_conversation"
        },
        "final_thanks": {
            "text": "Your bravery has saved our village. We are forever in your debt."
        },
        // This node has conditional text, based on a choice made by the player.
        "end_conversation": {
            "text": "Farewell, traveler.",
            // Each of the conditions has a `text` property and/or a `goto` property.
            // To show the player a different message based on a condition, use the `text` property.
            // To move the conversation to a different branch based on a condition, use the `goto` property.
            // `text` and `goto` can be used together, but at least one of them must be defined.
            // When a condition is met, the default `text` or `goto` property defined in the node will be overridden.
            "conditions": [
                {
                    "if": "made_choice",
                    "choice": "ask_storm",
                    "text": "Goodbye, and may the storm never return."
                }
            ]
        }
    }
};

// This line is needed to be able to import the dialogue in the map-dialogue file
exports.dialogue = dialogue
Types = require("../../../shared/js/gametypes");
dialogue = {
    "npc": Types.Entities.VILLAGEGIRL,
    "name": "Village girl",
    "start": "start",
    "resume_conditions": [
        {
            "if": "quest_open",
            "quest": "TEST_DIALOG_QUEST",
            "goto": "check_creature_quest_completion"
        },
        {
            "if": "quest_completed",
            "quest": "TEST_DIALOG_QUEST",
            "goto": "offer_second_quest"
        },
        {
            "if": "quest_open",
            "quest": "TEST_DIALOG_QUEST_2",
            "goto": "check_bandit_quest_completion"
        },
        {
            "if": "quest_completed",
            "quest": "TEST_DIALOG_QUEST_2",
            "goto": "final_thanks"
        }
    ],
    "nodes": {
        "start": {
            "text": [["Welcome, traveler.", "hi there"], "The village has been waiting for someone like you."],
            "goto": "intro"
        },
        "intro": {
            "text": "Our village has faced many troubles recently.<br\>Strange creatures have been appearing in the forest.",
            "goto": "ask_help"
        },
        "ask_help": {
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
        "accept_help": {
            "text": "Thank you, brave one! Your courage will not be forgotten.",
            "goto": "handout_quest"
        },
        "more_info": {
            "text": "The creatures appeared shortly after a mysterious storm last week.",
            "goto": "response_options_2"
        },
        "response_options_2": {
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
                {
                    "text": "What was the storm about?",
                    "goto": "ask_storm",
                    "conditions": [
                        {
                            "if": "choice_made",
                            "choice": "ask_cause"
                        }
                    ]
                }
            ]
        },
        "ask_cause": {
            "text": "We believe the creatures are linked to the strange storm that hit the village.",
            "record_choice": "ask_cause",
            "goto": "ask_help"
        },
        "ask_storm": {
            "text": "The storm was unlike anything we've seen. It brought an eerie silence followed by these strange creatures.",
            "record_choice": "ask_storm",
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
            "goto": "response_options_2"
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
        "end_conversation": {
            "text": "Farewell, traveler."
        }
    }
};

exports.dialogue = dialogue
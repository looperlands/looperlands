const Types = require("../../../../shared/js/gametypes");

const dialogue = {
    "npc": Types.Entities.BITNPC_RADIO,
    "name": "Radio",
    "start": "radio_hub",
    "nodes": {
        "radio_hub": {
            "text": "It's a radio. It looks like it might work, but it's not on right now.",
            "options": [
                {
                    "text": "Turn On",
                    "goto": "action_turn_on",
                    "conditions": [
                        { "if_not": "radioIsOn" }
                    ]
                },
                {
                    "text": "Turn Off",
                    "goto": "action_turn_off",
                    "conditions": [
                        { "if": "radioIsOn" }
                    ]
                },
                // /* Station options commented out for future use
                // {
                //     "text": "Tune to CornWaves FM",
                //     "goto": "action_set_station_cornwaves",
                //     "conditions": [
                //         { "if": "radioIsOn" },
                //         { "if_not": "radioStationIs_cornwaves" }
                //     ]
                // },
                // {
                //     "text": "Tune to SludgeFM",
                //     "goto": "action_set_station_sludgefm",
                //     "conditions": [
                //         { "if": "radioIsOn" },
                //         { "if_not": "radioStationIs_sludgefm" }
                //     ]
                // },
                // */
                {
                    "text": "Leave it be.",
                    "goto": "end_dialogue" // Or just omit goto to end dialogue
                }
            ]
        },
        // Action Trigger Nodes (Server uses these 'goto' values to know what action to take)
        "action_turn_on": { "text": "Click.", "goto": "end_dialogue" },
        "action_turn_off": { "text": "Click.", "goto": "end_dialogue" },
        // "action_set_station_cornwaves": { "text": "Tuning...", "goto": "end_dialogue" },
        // "action_set_station_sludgefm": { "text": "Tuning...", "goto": "end_dialogue" },

        "end_dialogue": {} // Immediately ends the dialogue on the client
    }
};

exports.dialogue = dialogue;
const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "28df2efa-d0ea-4264-be37-7996f073db19",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.RAT
            },
            "then": [
                {
                    "idx": "027d2f33-5287-4ec4-9baa-e0994ca03a0b",
                    "type": "has.trigger.active",
                    "options": {
                        "trigger": "test",
                    },
                    "true": [
                        {
                            "idx": "f8f719c5-5232-49aa-9e81-f8254dc952d9",
                            "type": "talk.player",
                            "options": {
                                "message": "Trigger is active"
                            }
                        }
                    ],
                    "false": [
                        {
                            "idx": "f8f719c5-5232-49aa-9e81-f8254dc952d8",
                            "type": "talk.player",
                            "options": {
                                "message": "Activate trigger now"
                            }
                        },
                        {
                            "idx": "f8f719c5-5232-49aa-9e81-f8254dc952d7",
                            "type": "trigger.activate",
                            "options": {
                                "trigger": "test"
                            }
                        }
                    ]
                }
            ]
        }
    ]
}

exports.flow = flow;
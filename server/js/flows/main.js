const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "26785757-606f-4fea-87cc-871bee9551f0",
            "type": "player.looted_item",
            "options": {
                "item": Types.Entities.FLASK
            },
            "then": [
                {
                    "idx": "b8e20ecb-5fd8-4fc9-956b-5d7927a6c25f",
                    "type": "talk.player",
                    "options": {
                        "message": "Yet another rat!"
                    }
                }
            ]
        },
        {
            "idx": "4b80b222-f687-478d-8e22-7505676875e3",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.RAT
            },
            "then": [
                {
                    "idx": "c6b50e66-d108-4c6b-995a-a0f196479672",
                    "type": "tag.equals",
                    "options": {
                        "value": "123"
                    },
                    "true": [
                        {
                            "idx": "3112f30f-b1f8-45c1-89bd-76f997233b73",
                            "type": "send_notification",
                            "options": {
                                "message": "You killed:  tag:mob"
                            },
                            "then": [
                                {
                                    "idx": "235b4489-f8b4-4e3d-b926-ae4763b9ae7a",
                                    "type": "any",
                                    "options": {},
                                    "then": [
                                        {
                                            "idx": "479f72b1-406b-411a-a371-b846652fe269",
                                            "type": "trigger.activate",
                                            "options": {
                                                "trigger": "fight_night"
                                            },
                                            "error": [
                                                {
                                                    "idx": "1ade2033-c219-41dd-815f-238f1bc825c7",
                                                    "type": "send_notification",
                                                    "options": {
                                                        "message": "Fightnight was already active"
                                                    }
                                                }
                                            ],
                                            "then": [
                                                {
                                                    "idx": "ccea91a2-3d65-4770-88e7-f25ea639a5db",
                                                    "type": "delay",
                                                    "options": {
                                                        "delay": "5000"
                                                    },
                                                    "then": [
                                                        {
                                                            "idx": "92433767-dcd2-437c-a763-ce8bb49d5d9f",
                                                            "type": "send_notification",
                                                            "options": {
                                                                "message": "Activated fight night"
                                                            }
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    "false": [
                        {
                            "idx": "9662962f-d8a2-4b89-b646-c0baf47ac3ed",
                            "type": "talk.player",
                            "options": {
                                "message": "I killed a  tag:mob"
                            },
                            "then": [
                                {
                                    "idx": "235b4489-f8b4-4e3d-b926-ae4763b9ae7a",
                                    "type": "any",
                                    "options": {},
                                    "then": [
                                        {
                                            "idx": "479f72b1-406b-411a-a371-b846652fe269",
                                            "type": "trigger.activate",
                                            "options": {
                                                "trigger": "fight_night"
                                            },
                                            "error": [
                                                {
                                                    "idx": "1ade2033-c219-41dd-815f-238f1bc825c7",
                                                    "type": "send_notification",
                                                    "options": {
                                                        "message": "Fightnight was already active"
                                                    }
                                                }
                                            ],
                                            "then": [
                                                {
                                                    "idx": "ccea91a2-3d65-4770-88e7-f25ea639a5db",
                                                    "type": "delay",
                                                    "options": {
                                                        "delay": "5000"
                                                    },
                                                    "then": [
                                                        {
                                                            "idx": "92433767-dcd2-437c-a763-ce8bb49d5d9f",
                                                            "type": "send_notification",
                                                            "options": {
                                                                "message": "Activated fight night"
                                                            }
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

exports.flow = flow;
const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "a496e8a9-c2e7-4ca4-b0ad-9253c876e896",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.RAT
            },
            "then": [
                {
                    "idx": "604f9da3-4bda-43be-870c-507a090afecc",
                    "type": "all",
                    "options": {},
                    "then": [
                        {
                            "idx": "e1fa8714-a79d-4a59-8644-9047235e703d",
                            "type": "talk.player",
                            "options": {
                                "message": "Rat, Bat, Got a magic Hat"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "idx": "1fe223d7-9b28-4118-935d-1a0940eefd3f",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.BAT
            },
            "then": [
                {
                    "idx": "604f9da3-4bda-43be-870c-507a090afecc",
                    "type": "all",
                    "options": {},
                    "then": [
                        {
                            "idx": "e1fa8714-a79d-4a59-8644-9047235e703d",
                            "type": "talk.player",
                            "options": {
                                "message": "Rat, Bat, Got a magic Hat"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "idx": "84ad2d1c-0253-41ec-bc81-8f62f36bd451",
            "type": "player.spawned",
            "options": {},
            "then": [
                {
                    "idx": "b3d10530-894d-4dbd-8e3b-c18fe6793221",
                    "type": "talk.player",
                    "options": {
                        "message": "1"
                    },
                    "then": [
                        {
                            "idx": "7b9e301a-4f01-43a5-979d-6be3c3c97d1d",
                            "type": "any",
                            "options": {},
                            "then": [
                                {
                                    "idx": "d84c9d5f-e32f-45ab-98b7-d14d1fc45b12",
                                    "type": "delay",
                                    "options": {
                                        "delay": "1000"
                                    },
                                    "then": [
                                        {
                                            "idx": "76adada8-c2a9-4d98-bad9-179af0f55845",
                                            "type": "talk.player",
                                            "options": {
                                                "message": "2"
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "idx": "47db0d91-4ba3-4552-bf56-beb055b7ec4a",
                    "type": "delay",
                    "options": {
                        "delay": "2000"
                    },
                    "then": [
                        {
                            "idx": "f77496ab-8ac0-490a-8af0-a67f53c80c9a",
                            "type": "talk.player",
                            "options": {
                                "message": "3"
                            },
                            "then": [
                                {
                                    "idx": "7b9e301a-4f01-43a5-979d-6be3c3c97d1d",
                                    "type": "any",
                                    "options": {},
                                    "then": [
                                        {
                                            "idx": "d84c9d5f-e32f-45ab-98b7-d14d1fc45b12",
                                            "type": "delay",
                                            "options": {
                                                "delay": "1000"
                                            },
                                            "then": [
                                                {
                                                    "idx": "76adada8-c2a9-4d98-bad9-179af0f55845",
                                                    "type": "talk.player",
                                                    "options": {
                                                        "message": "2"
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

exports.flow = flow;
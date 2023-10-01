const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "fbf89dbb-af19-41d9-bed7-71b48ed1501b",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.RAT
            },
            "then": [
                {
                    "idx": "b03b639b-dbf6-437f-8009-3dd569f166a5",
                    "type": "camera.npc",
                    "options": {
                        "npc": Types.Entities.BEACHNPC
                    },
                    "then": [
                        {
                            "idx": "c19ea7fe-5777-4a5b-bf40-ccd9217cec7d",
                            "type": "delay",
                            "options": {
                                "delay": "200"
                            },
                            "then": [
                                {
                                    "idx": "8b1173fc-8e7d-48cd-b6dd-e05bbd6bda10",
                                    "type": "talk.npc.private",
                                    "options": {
                                        "npc": Types.Entities.BEACHNPC,
                                        "message": "Help!! Come find me! Anyone?"
                                    },
                                    "then": [
                                        {
                                            "idx": "b5441bb3-2ce3-439f-899b-83164a0408a8",
                                            "type": "delay",
                                            "options": {
                                                "delay": "3000"
                                            },
                                            "then": [
                                                {
                                                    "idx": "b37802b4-1b78-4eac-bb09-148c2489e155",
                                                    "type": "camera.player",
                                                    "options": {},
                                                    "then": [
                                                        {
                                                            "idx": "8868af2b-63f5-454d-8361-460f91e47824",
                                                            "type": "talk.player.private",
                                                            "options": {
                                                                "message": "I need to help him, lets find him!"
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
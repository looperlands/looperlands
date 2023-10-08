const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "6f6abafd-66ec-439e-8105-3353d5f12cfb",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.RAT,
            },
            "then": [
                {
                    "idx": "3fc7c527-cb79-4cee-957c-cdecd3ca420e",
                    "type": "spawn.npc",
                    "options": {
                        "npc": Types.Entities.OGRE,
                        "position": "44,203"
                    },
                    "then": [
                        {
                            "idx": "2fa9f63d-74ee-4522-97c0-2a6295fef823",
                            "type": "delay",
                            "options": {
                                "delay": "500"
                            },
                            "then": [
                                {
                                    "idx": "3a7ece84-a907-4a41-86bb-078a95cc7b32",
                                    "type": "walk.npc",
                                    "options": {
                                        "npc": "tag:spawned",
                                        "position": "44,195"
                                    },
                                    "then": [
                                        {
                                            "idx": "a2e83210-488a-44aa-9822-6bafc850c361",
                                            "type": "delay",
                                            "options": {
                                                "delay": "5000"
                                            },
                                            "then": [
                                                {
                                                    "idx": "e15638aa-89f1-4368-8bda-ed5d6df96924",
                                                    "type": "npc.animation",
                                                    "options": {
                                                        "npc": "tag:spawned",
                                                        "animation": "atk_up"
                                                    },
                                                    "then": [
                                                        {
                                                            "idx": "3b43352e-50c1-4dd8-bf05-94ad1a648be6",
                                                            "type": "delay",
                                                            "options": {
                                                                "delay": "10000"
                                                            },
                                                            "then": [
                                                                {
                                                                    "idx": "d75453d8-49cd-4e16-91d7-bc5f0a5846c0",
                                                                    "type": "layer.show",
                                                                    "options": {
                                                                        "layer": "Bridge"
                                                                    }
                                                                },
                                                                {
                                                                    "idx": "0e104be9-2025-4621-87a6-a643b0a37a88",
                                                                    "type": "layer.show",
                                                                    "options": {
                                                                        "layer": "bridges shadows"
                                                                    }
                                                                },
                                                                {
                                                                    "idx": "91265989-2c38-462e-9e6d-9a33c531c47b",
                                                                    "type": "npc.animation",
                                                                    "options": {
                                                                        "npc": "tag:spawned",
                                                                        "animation": "idle_down"
                                                                    }
                                                                },
                                                                {
                                                                    "idx": "24564965-eb50-467e-b957-7a9285a82e85",
                                                                    "type": "talk.npc",
                                                                    "options": {
                                                                        "npc": "tag:spawned",
                                                                        "message": "All done. Find my friends now!"
                                                                    }
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            "idx": "d0136825-7958-4ca2-8910-bce9b437365e",
                                            "type": "talk.npc",
                                            "options": {
                                                "npc": "tag:spawned",
                                                "message": "Let me fix that bridge"
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

exports.flow = flow;
const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "6f6abafd-66ec-439e-8105-3353d5f12cfb",
            "type": "player.died",
            "options": {
            },
            "then": [
                {
                    "idx": "3fc7c527-cb79-4cee-957c-cdecd3ca420e",
                    "type": "spawn.item",
                    "options": {
                        "item": Types.Entities.TOMBSTONE,
                        "position": "tag:position",
                    },
                    "then": [
                        {
                            "idx": "3fc7c527-cb79-4cee-957c-cdecd3ca420a",
                            "type": "delay",
                            "options": {
                                "delay": 20000
                            },
                            "then": [
                                {
                                    "idx": "3fc7c527-cb79-4cee-957c-cdecd3ca420b",
                                    "type": "despawn.item",
                                    "options": {
                                        "item": "tag:spawned",
                                        "position": "tag:position"
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

exports.flow = flow;
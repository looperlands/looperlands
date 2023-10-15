const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "6f6abafd-66ec-439e-8105-3353d5f12cfb",
            "type": "npc.talked",
            "options": {
                "npc": Types.Entities.VILLAGER
            },
            "then": [
                {
                    "idx": "3fc7c527-cb79-4cee-957c-cdecd3ca420e",
                    "type": "talk.player",
                    "options": {
                        "message": "Hi there, do you know where to find OA's world?"
                    }
                },
                {
                    "idx": "3fc7c527-cb79-4cee-957c-cdecd3ca420f",
                    "type": "layer.show",
                    "options": {
                        "layer": "Bridge"
                    }
                },
                {
                    "idx": "3fc7c527-cb79-4cee-957c-cdecd3ca420b",
                    "type": "layer.show",
                    "options": {
                        "layer": "bridges shadows"
                    }
                }
            ]
        }
    ]
}

exports.flow = flow;
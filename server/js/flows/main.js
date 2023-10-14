const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "6f6abafd-66ec-439e-8105-3353d5f12cfb",
            "type": "trigger.activated",
            "options": {
                "trigger": "test"
            },
            "then": [
                {
                    "idx": "3fc7c527-cb79-4cee-957c-cdecd3ca420e",
                    "type": "spawn.item",
                    "options": {
                        "item": Types.Entities.TOMBSTONE,
                        "position": "70,374"
                    },
                }
            ]
        }
    ]
}

exports.flow = flow;
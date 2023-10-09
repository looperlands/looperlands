const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "6f6abafd-66ec-439e-8105-3353d5f12cfb",
            "type": "player.spawned",
            "options": {
            },
            "then": [
                {
                    "idx": "3fc7c527-cb79-4cee-957c-cdecd3ca420e",
                    "type": "talk.player",
                    "options": {
                        "message": "I'm finally here",
                    }
                }
            ]
        }
    ]
}

exports.flow = flow;
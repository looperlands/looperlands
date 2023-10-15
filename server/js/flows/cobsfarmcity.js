const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "c76011b9-68af-4189-8dc5-c74a2eb7a006",
            "type": "player.spawned",
            "options": {},
            "then": [
                {
                    "idx": "55fa6ed2-c4c6-43d2-a864-15a03c0e202d",
                    "type": "talk.player",
                    "options": {
                        "message": "Hello"
                    }
                }
            ]
        }
    ]
}

exports.flow = flow;
const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "28df2efa-d0ea-4264-be37-7996f073db18",
            "type": "player.spawned",
            "then": [
                {
                    "idx": "28df2efa-d0ea-4264-be37-7996f073db17",
                    "type": "has.level",
                    "options": {
                        "level": "10"
                    },
                    "true": [
                        {
                            "idx": "e07b677a-fa3a-4682-91e2-a03939f31412",
                            "type": "talk.player",
                            "options": {
                                "message": "TESTETETSET"
                            }
                        }
                    ]
                },

            ]
        }
    ]
}

exports.flow = flow;
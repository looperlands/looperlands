const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "28df2efa-d0ea-4264-be37-7996f073db18",
            "type": "player.spawned",
            "then": [
                {
                    "idx": "28df2efa-d0ea-4264-be37-7996f073db17",
                    "type": "spawn.item",
                    "options": {
                        "item": Types.Entities.COBLOG,
                        "position": "42,200"
                    }
                },
                {
                    "idx": "28df2efa-d0ea-4264-be37-7996f073db17",
                    "type": "spawn.item",
                    "options": {
                        "item": Types.Entities.COBLOG,
                        "position": "46,200"
                    }
                },
            ]
        },
        {
            "idx": "28df2efa-d0ea-4264-be37-7996f073db19",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.RAT
            },
            "then": [
                {
                    "idx": "e07b677a-fa3a-4682-91e2-a03939f31413",
                    "type": "has.quest.received",
                    "options": {
                        "quest": "KING_QUEST_1",
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
                }
            ]
        }
    ]
}

exports.flow = flow;
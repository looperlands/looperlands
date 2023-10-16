const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "28df2efa-d0ea-4264-be37-7996f073db19",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.RAT
            },
            "then": [
                {
                    "idx": "e07b677a-fa3a-4682-91e2-a03939f31413",
                    "type": "has.looted.item",
                    "options": {
                        "amount": "5",
                        "item": Types.Entities.FLASK
                    },
                    "true": [
                        {
                            "idx": "e07b677a-fa3a-4682-91e2-a03939f31412",
                            "type": "talk.player",
                            "options": {
                                "message": "5 potions"
                            }
                        }
                    ]
                }
            ]
        }
    ]
}

exports.flow = flow;
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
                    "idx": "027d2f33-5287-4ec4-9baa-e0994ca03a0b",
                    "type": "in.area",
                    "options": {
                        "top_left": "26,197",
                        "bottom_right": "34,203"
                    },
                    "true": [
                        {
                            "idx": "f8f719c5-5232-49aa-9e81-f8254dc952d9",
                            "type": "talk.player",
                            "options": {
                                "message": "Portal rat"
                            }
                        }
                    ]
                }
            ]
        }
    ]
}

exports.flow = flow;
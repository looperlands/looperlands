const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "fbf89dbb-af19-41d9-bed7-71b48ed1501b",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.RAT
            },
            "then": [
                {
                    "idx": "b03b639b-dbf6-437f-8009-3dd569f166a5",
                    "type": "sound.play",
                    "options": {
                        "sound": "anotherQUESThahaha_T3"
                    },
                },
                {
                    "idx": "b03b639b-dbf6-437f-8009-3dd569f166a6",
                    "type": "talk.player.private",
                    "options": {
                        "message": "Back for another quest?"
                    },
                },
                {
                    "idx": "b03b639b-dbf6-437f-8009-3dd569f166a7",
                    "type": "delay",
                    "options": {
                        "delay": "3000"
                    },
                    "then": [
                        {
                            "idx": "b03b639b-dbf6-437f-8009-3dd569f166a8",
                            "type": "talk.player.private",
                            "options": {
                                "message": "Ha ha haha haaaha!!"
                            },
                        },
                    ]
                }
            ]
        }
    ]
};

exports.flow = flow;
const Types = require("../../../shared/js/gametypes");

flow = {
    "handlers": [
        {
            "idx": "6f6abafd-66ec-439e-8105-3353d5f12cfb",
            "type": "player.killed_mob",
            "options": {
                "mob": Types.Entities.RAT
            },
            "then": [
                {
                    "idx": "66f091c2-e47d-4efa-a670-581ddcbe0555",
                    "type": "spawn.item",
                    "options": {
                        "item": Types.Entities.COBLOG,
                        "position": "44,203"
                    },
                    "then": [
                        {
                            "idx": "d939cbc0-9b4d-43d5-b9a7-2d1d2f7c77c9",
                            "type": "send_notification",
                            "options": {
                                "message": "Here, take this 100 wood"
                            },
                            "then": [
                                {
                                    "idx": "00324fbd-a4bd-420e-abcc-15d1cf11ace6",
                                    "type": "inventory.add",
                                    "options": {
                                        "amount": "100",
                                        "item": Types.Entities.COBLOG
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

exports.flow = flow;
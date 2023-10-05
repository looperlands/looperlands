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
                    "idx": "492f0ba9-636b-4dbe-ba02-0750d884c6c0",
                    "type": "layer.toggle",
                    "options": {
                        "layer": "Bridge"
                    }
                }
                // ,
                // {
                //     "idx": "492f0ba9-636b-4dbe-ba02-0750d884c6c1",
                //     "type": "layer.show",
                //     "options": {
                //         "layer": "bridges shadows"
                //     }
                // }
            ]
        }
    ]
};

exports.flow = flow;
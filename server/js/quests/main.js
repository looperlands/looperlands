Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "KING_QUEST_1",
        name: "The King's Request",
        description: "The King has requested that you slay 100 rats.",
        npc: Types.Entities.KING,
        eventType: "KILL_MOB",
        target: Types.Entities.RAT,
        amount: 100,
        reward: 100,
        requiredLevel: 1
    }
]

exports.quests = quests;
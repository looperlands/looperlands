Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "KING_QUEST_1",
        name: "The King's Kill Request",
        description: "The King has requested that you slay 100 rats.",
        eventType: "KILL_MOB",
        npc: Types.Entities.KING,
        target: Types.Entities.RAT,
        amount: 100,
        reward: 100,
        requiredLevel: 1
    },
    {
        id: "KING_QUEST_2",
        name: "The King's Loot Request",
        description: "The King has requested that you use 100 potions",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.KING,
        target: Types.Entities.FLASK,
        amount: 100,
        reward: 100,
        requiredLevel: 1
    }
]

exports.quests = quests;
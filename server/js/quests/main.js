Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "KING_QUEST_1",
        name: "The King's Kill Request",
        startText: "The King has requested that you slay 100 rats.",
        endText: "Thanks for killing the rats",
        eventType: "KILL_MOB",
        npc: Types.Entities.KING,
        target: Types.Entities.RAT,
        amount: 100,
        level: 1,
        medal: Types.Medals.RAT
    },
    {
        id: "KING_QUEST_2",
        name: "The King's Loot Request",
        startText: "The King has requested that you use 100 potions",
        endText: "Thanks for using the potions",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.KING,
        target: Types.Entities.FLASK,
        amount: 100,
        requiredQuest: "KING_QUEST_1",
        level: 1,
        medal: Types.Medals.HEARTH
    }
]

exports.quests = quests;
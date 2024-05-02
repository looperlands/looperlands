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

    {
        id: "JIMI_QUEST",
        name: "DIMMILIZATION ON THE BRINK",
        startText: "A mysterious being known to the Dimmie's as Bright Lord has conjured up a being so strong, it could be mean the end of Dimmie kind as we know it. Prepare yourself for Big Brimmie's arrival by collecting 10 ore which can be used to craft bullets! Visit Jimi Again when complete.",
        endText: "This should help you on your journey, Looper! Should you find yourself a ranged weapon, this Iron can be used to craft ammo! Be sure to tell Jimi you're ready.",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.BEACHNPC,
        target: Types.Entities.ORE,
        amount: 10,
        level: 1,
        medal: Types.Medals.HEARTH
    }
]

exports.quests = quests;
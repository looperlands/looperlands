Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "TYLERDURDEN_QUEST_1",
        name: "Tyler's Cigarette Request",
        startText: ["Hey, you got a cigarette?",
        "Tyler has requested that you find him 20 cigarettes."],
        endText: "Thanks for the smokes but what am I supposed to do with these without a lighter?",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.TYLERDURDEN,
        target: Types.Entities.CIGARETTE,
        amount: 20,
        level: 1,
        xp: 10000,
        medal: Types.Medals.SKULL
    },
    {
        id: "TYLERDURDEN_QUEST_2",
        name: "Tyler's Lighter Request",
        startText: ["All these cigarettes and no lighter...",
        "You think you could find me a lighter so I can smoke these things?"],
        endText: "Nice, thanks. Hey, you ever been in a fight?",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.TYLERDURDEN,
        target: Types.Entities.LIGHTER,
        amount: 1,
        requiredQuest: "TYLERDURDEN_QUEST_1",
        level: 30,
        xp: 100000,
        medal: Types.Medals.SKULL
    }
]

exports.quests = quests;
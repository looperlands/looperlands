Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "OA_QUEST_1",
        name: "Hushwind's Slimy Problem",
        startText: "Ah, traveler! Hushwind used to be a peaceful place. But with King RC's absence, even simple creatures like slimes have grown aggressive, threatening our village. Could you assist us in reducing their numbers outside? It might buy us some time to figure out the larger threat looming over Looporia.",
        endText: "Thanks for killing the rats",
        eventType: "KILL_MOB",
        npc: Types.Entities.TORIN,
        target: Types.Entities.SLIME,
        amount: 30,
        level: 1,
        medal: Types.Medals.RAT
    },
    {
        id: "OA_QUEST_2",
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
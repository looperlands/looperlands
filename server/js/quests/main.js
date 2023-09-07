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
        level: 1
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
        level: 1
    },
    {
        id: "COB_COLLECT_LOGS",
        name: "Maintaining the campfire",
        startText: "We are running out of wood! Please, bring me 20 logs.",
        endText: "Thanks to you it will not be dark here tonight!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.COBLUMBERJACK,
        target: Types.Entities.COBLOG,
        amount: 20,
        level: 10
    },
    {
        id: "COB_BLUE_SLIMES",
        name: "Finding the lucky clover",
        startText: "I have found a lucky clover but the blue slimes stole it from me! Kill 20 of them, get it back!",
        endText: "Thank you! It weren't the blue slimes after all...",
        eventType: "KILL_MOB",
        npc: Types.Entities.COBHILLSNPC,
        target: Types.Entities.COBSLIMEBLUE,
        amount: 20,
        level: 2
    },
    {
        id: "COB_YELLOW_SLIMES",
        name: "Finding the lucky clover again",
        startText: "Now I remember! It was the yellow ones! Kill 40 of them, they must have the clover!",
        endText: "Well, at least it's less slimes here!",
        eventType: "KILL_MOB",
        npc: Types.Entities.COBHILLSNPC,
        target: Types.Entities.COBSLIMEYELLOW,
        amount: 40,
        requiredQuest: "COB_BLUE_SLIMES",
        level: 4
    },
    {
        id: "COB_RED_SLIMES",
        name: "Still finding the lucky clover",
        startText: "Ohh now don't be mad at me! Yellow, red... it's all the same! If you kill 60 red ones, surely one of them has to have it.",
        endText: "Where's the clover? Will we ever find it again?",
        eventType: "KILL_MOB",
        npc: Types.Entities.COBHILLSNPC,
        target: Types.Entities.COBSLIMERED,
        amount: 60,
        requiredQuest: "COB_YELLOW_SLIMES",
        level: 7
    },
    {
        id: "COB_RAINBOW_SLIME",
        name: "Finally finding the lucky clover",
        startText: "Now I know why I kept getting the colors mixed up. It was ALL OF THEM! Get the rainbow slime for me!",
        endText: "Thank you so much! This clover means a lot to me.",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.COBHILLSNPC,
        target: Types.Entities.COBCLOVER,
        amount: 1,
        requiredQuest: "COB_RED_SLIMES",
        level: 10
    },
]

exports.quests = quests;
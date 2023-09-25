Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "COB_COLLECT_LOGS",
        name: "Maintaining the campfire",
        startText: "We are running out of wood! Find 20 logs to keep the fire going.",
        endText: "Thanks to you it will not be dark here tonight!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.COBLUMBERJACK,
        target: Types.Entities.COBLOG,
        requiredLevel: 7,
        amount: 20,
        level: 9,
        medal: Types.Medals.TREE
    },
    {
        id: "COB_BLUE_SLIMES",
        name: "Finding the lucky clover",
        startText: "The blue slimes stole my lucky clover! Kill 20 of them, get it back!",
        endText: "Thank you! It weren't the blue slimes after all...",
        eventType: "KILL_MOB",
        npc: Types.Entities.COBHILLSNPC,
        target: Types.Entities.COBSLIMEBLUE,
        amount: 20,
        level: 2,
        medal: Types.Medals.SKULL
    },
    {
        id: "COB_YELLOW_SLIMES",
        name: "Finding the lucky clover again",
        startText: "My bad! It was the yellow ones! Kill 40 of them, they must have the clover!",
        endText: "Well, at least it's less slimes here!",
        eventType: "KILL_MOB",
        npc: Types.Entities.COBHILLSNPC,
        target: Types.Entities.COBSLIMEYELLOW,
        amount: 40,
        requiredQuest: "COB_BLUE_SLIMES",
        level: 4,
        medal: Types.Medals.SKULL
    },
    {
        id: "COB_RED_SLIMES",
        name: "Still finding the lucky clover",
        startText: "Yellow, red... it's all the same! Kill 60 red ones, one of them has it!",
        endText: "Where's the clover? Will we ever find it again?",
        eventType: "KILL_MOB",
        npc: Types.Entities.COBHILLSNPC,
        target: Types.Entities.COBSLIMERED,
        amount: 60,
        requiredQuest: "COB_YELLOW_SLIMES",
        level: 6,
        medal: Types.Medals.SKULL
    },
    {
        id: "COB_RAINBOW_SLIME",
        name: "Finally finding the lucky clover",
        startText: "Now I remember! It was ALL OF THEM! Get the rainbow slime!",
        endText: "Thank you so much! This clover means a lot to me.",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.COBHILLSNPC,
        target: Types.Entities.COBCLOVER,
        amount: 1,
        requiredQuest: "COB_RED_SLIMES",
        level: 8,
        medal: Types.Medals.SKULL
    },
]

exports.quests = quests;
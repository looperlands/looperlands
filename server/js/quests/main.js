Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "KING_QUEST_1",
        name: "The King's Kill Request",
        startText: "The King has requested that you slay 100 rats.",
        inProgressText: "You are doing great! Keep it up, {{remaining}} to go! Come back for another quest when you have killed 100 rats.",
        endText: ["Thanks for killing the rats", "Here is your next quest"],
        eventType: "KILL_MOB",
        npc: Types.Entities.KING,
        target: Types.Entities.RAT,
        amount: 100,
        level: 1,
        medal: Types.Medals.RAT,
        needToReturn: true
    },
    {
        id: "KING_QUEST_2",
        name: "The King's Loot Request",
        startText: "The King has requested that you use 100 potions",
        inProgressText: "You are doing great! Keep it up! Collect {{remaining}} more potions to finish the quest.",
        endText: "Thanks for using the potions",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.KING,
        target: Types.Entities.FLASK,
        amount: 100,
        requiredQuest: "KING_QUEST_1",
        level: 1,
        medal: Types.Medals.HEARTH
    },
    {
        id: "TEST_DIALOG_QUEST",
        name: "Test dialog quest 1",
        startText: "Can you please kill 1 rat!",
        inProgressText: ["Come on, you can do it", 'Really, I trust you!'],
        endText: "Thanks for killing that rat for me",
        eventType: "KILL_MOB",
        npc: Types.Entities.VILLAGEGIRL,
        target: Types.Entities.RAT,
        amount: 1,
        level: 1,
        medal: Types.Medals.RAT
    },


    {
        id: "TEST_DIALOG_QUEST_2",
        name: "Test dialog quest 2",
        startText: "Can you please kill 1 more rat!",
        inProgressText: ["Come on, you can do it", 'Really, I trust you!'],
        endText: "Thanks for killing that rat for me",
        eventType: "KILL_MOB",
        npc: Types.Entities.VILLAGEGIRL,
        target: Types.Entities.RAT,
        amount: 1,
        level: 1,
        medal: Types.Medals.RAT
    },

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
    },

    // SAMPLE QUEST
    // {
    //     id: "KING_QUEST_FEED_CAT",
    //     name: "Feed the cat",
    //     startText: "Go feed my cat. Kill a rat and bring it to her.",
    //     inProgressText: "The cat is hungry, Hurry up!",
    //     endText: "Yum Yum, Thank you for the rat",
    //     eventType: "KILL_MOB",
    //     npc: Types.Entities.KING,
    //     target: Types.Entities.RAT,
    //     amount: 1,
    //     requiredQuest: "KING_QUEST_1",
    //     level: 1,
    //     medal: Types.Medals.FOX,
    //     returnToNpc: Types.Entities.NYAN,
    //     reward: {
    //         item: Types.Entities.cpotion_m,
    //         amount: 5
    //     }
    // },
]

exports.quests = quests;
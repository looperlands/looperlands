Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "Save the Hamsters Part 1",
        name: "Save the Hamsters Part 1",
        startText: ["Someone stole my hamsters!",
        "Please help me save them by defeating the Red Senitels!"],
        endText: "Thank you for saving my hamsters!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.BALKSBIT,
        target: Types.Entities.HAMSTER1,
        amount: 2,
        level: 1,
        xp: 1000,
        medal: Types.Medals.SKULL
    },
    {
        id: "Purify100",
        name: "Purify 100 Ghost Spirits!",
        startText: ["Help purify the ghosts scattered around Cyber City!",
        "These ghosts need to be set free!"],
        endText: "Thank you for purifying the ghosts!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.WHISPYKING,
        target: Types.Entities.WHISPYSPIRIT,
        amount: 100,
        level: 1,
        xp: 50000,
        medal: Types.Medals.SKULL
    },
    { 
        id: "Save the Ducklings Part 1",
        name: "Save the Ducklings Part 1",
        startText: ["My little ducklings are missing!",
        "Please find them for me!"],
        endText: "Hooray! You found my ducklings!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.HDUCKLEE,
        target: Types.Entities.DUCKBIT,
        amount: 20,
        level: 1,
        medal: Types.Medals.RAT
    },
    { 
        id: "My Milk",
        name: "Gather 10 milk cartons please!",
        startText: ["Have you tried the out the vending machines?",
        "Gather 10 milk cartons for me please!"],
        endText: "I love milk!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.KAWAIIPRINCESS,
        target: Types.Entities.MILK1,
        amount: 10,
        level: 1,
        medal: Types.Medals.RAT
    },
    {
        id: "Purify1000",
        name: "Purify 1000 Ghost Spirits!",
        startText: ["There are more spirits that need our help!",
        "Will you help purify them all?",],
        inProgressText: ["Keep it up, you're doing great!",
        "You only have {{remaining}} more ghosts to purify!"],
        endText: ["You saved all the spirits!"],
        eventType: "LOOT_ITEM",
        npc: Types.Entities.WHISPYSPIRIT,
        target: Types.Entities.WHISPYKING,
        amount: 1000,
        requiredQuest: "Purify100",
        level: 5,
        medal: Types.Medals.SKULL,
        xp: 100000,
        
    },

    {
        id: "Defeat_the_Pumpkin_Warlock",
        name: "Take on the final boss this Halloween!",
        startText: ["Be careful of his evil pumpkin army.",
        "Will you take on the final boss?"],
        eventType: "KILL_MOB",
        npc: Types.Entities.WHISPYBOBBY,
        target: Types.Entities.PUMPKINWARLOCK,
        amount: 88888,
        level: 1,
        medal: Types.Medals.SKULL,
        needToReturn: true,
        xp: 90000,
    }
];

   
exports.quests = quests;
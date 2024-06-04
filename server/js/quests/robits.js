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
];

   
exports.quests = quests;
const Types = require("../../../shared/js/gametypes");
const quests = [
    {
        id: "Save the Hamsters Part 1",
        name: "Save the Hamsters Part 1",
        startText: ["Someone stole <span class=\"dialogue-item\">my hamsters</span>!",
        "Please help me save them by defeating the <span class=\"dialogue-danger\">Red Senitels</span>!"],
        endText: "Thank you for saving <span class=\"dialogue-item\">my hamsters</span>!",
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
        startText: ["Help purify the <span class=\"dialogue-wave\">ghosts</span> scattered around Cyber City!",
        "These <span class=\"dialogue-wave\">ghosts</span> need to be set free!"],
        endText: "Thank you for purifying the <span class=\"dialogue-wave\">ghosts</span>!",
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
        startText: ["My <span class=\"dialogue-item\">little ducklings</span> are missing!",
        "Please find them for me!"],
        endText: "<span class=\"dialogue-wave\">Hooray!</span> You found my ducklings!",
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
        "Gather <span class=\"dialogue-item\">10 milk cartons</span> for me please!"],
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
        startText: ["There are more <span class=\"dialogue-wave\">spirits</span> that need our help!",
        "Will you help purify them all?",],
        inProgressText: ["Keep it up, you're doing great!",
        "You only have {{remaining}} more <span class=\"dialogue-wave\">ghosts</span> to purify!"],
        endText: ["You saved all the <span class=\"dialogue-wave\">spirits</span>!"],
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
        startText: ["Be careful of his <span class=\"dialogue-danger dialogue-shake\">evil pumpkin army</span>.",
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
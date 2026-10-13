const Types = require("../../../shared/js/gametypes");
const quests = [
    {
        id: "TYLERDURDEN_QUEST_1",
        name: "Tyler's Cigarette Request",
        startText: ["Hey, you got a cigarette?",
        "Tyler has requested that you find him <span class=\"dialogue-item\">20 cigarettes</span>."],
        endText: "Thanks for the smokes but what am I supposed to do with these without a <span class=\"dialogue-item\">lighter</span>?",
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
        startText: ["All these cigarettes and no <span class=\"dialogue-item\">lighter</span>...",
        "You think you could find me a <span class=\"dialogue-item\">lighter</span> so I can smoke these things?"],
        endText: ["Nice, thanks. Hey, you ever been in a fight?",  
        'Check<a target="_blank" href="https://l2-nfts.com"> this</a> out...'],
        eventType: "LOOT_ITEM",
        npc: Types.Entities.TYLERDURDEN,
        target: Types.Entities.LIGHTER,
        amount: 1,
        requiredQuest: "TYLERDURDEN_QUEST_1",
        level: 30,
        xp: 100000,
        medal: Types.Medals.SKULL
    },
    {
        id: "TYLERDURDEN_QUEST_3",
        name: "Tyler's Cigarette Pack Request",
        startText: ["Singles aren't gonna cutting it...",
        "I'm gonna need you to start bringing me <span class=\"dialogue-item\">packs of cigarettes</span>."],
        endText: "Nice, thanks. Hey, do you know anything about soap?",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.TYLERDURDEN,
        target: Types.Entities.CIGARETTEPACK,
        amount: 69,
        requiredQuest: "TYLERDURDEN_QUEST_2",
        level: 40,
        xp: 200000,
        medal: Types.Medals.SKULL
    },
    {
        id: "TYLERDURDEN_QUEST_4",
        name: "Tyler's Soap Request",
        startText: ["We're gonna need <span class=\"dialogue-item\">lots of soap</span>...",
        "Don't worry about why right now."],
        endText: "Nice, thanks. You know, the things you own end up owning you.",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.TYLERDURDEN,
        target: Types.Entities.SOAP,
        amount: 420,
        requiredQuest: "TYLERDURDEN_QUEST_3",
        level: 50,
        xp: 300000,
        medal: Types.Medals.SKULL
    }
]

exports.quests = quests;
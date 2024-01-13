Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "SDU_QUEST_1",
        name: "Kill The Wolf Boss",
        longText: "Back story here",
        startText: "The King has requested that you slay the wolf boss.",
        endText: "Thanks for killing the wolf boss.",
        eventType: "KILL_MOB",
        npc: Types.Entities.KING,
        target: Types.Entities.WOLFBOSS,
        amount: 1,
        level: 1,
        medal: Types.Medals.RAT
    }
]

exports.quests = quests;
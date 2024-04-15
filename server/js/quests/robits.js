Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "ROBITS_QUEST_1",
        name: "Overide Protocol 1",
        startText: [" Welcome to Cyber City! Robits have been hacked! Help us defeat the Sentinels to purify the robits.",
        "Please help us defeat the Sentinels created by Bitadel."],
        endText: "Thank you for helping our hacked ronbits. Keep on fighting and we'll take down Bitadel together!",
        eventType: "KILL_MOB",
        npc: Types.Entities.ROBITSC1,
        target: Types.Entities.ROBITSE3,
        amount: 100,
        level: 1,
        xp: 1000,
        medal: Types.Medals.SKULL
    },
   
exports.quests = quests;
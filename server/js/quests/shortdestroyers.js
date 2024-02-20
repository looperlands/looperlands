Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "SDU_QUEST_1",
        name: "Concert in The Cellar", 
        startText: "Hey, my band Old Kids has a show at The Cellar this weekend. You should come out!",
        longText: "Old Kids has a show in The Cellar this weekend but the wind just blew the flyers all over the parking lot! This city is so windy, the flyers are everywhere! If you can help pick up the flyers, Chase said he would add your name to the list so you can get into the show.",
        endText: "Chase: You're a lifesaver! I'll put your name on the list.",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.DEVON,
        target: Types.Entities.FLYER,
        amount: 10,
        level: 1,
        medal: Types.Medals.HEARTH
    },
//     { //DONE
//         id: "OA_QUEST_3",
//         name: "The Slime King's Reign",
//         startText: "Ah, just who I needed!",
//         longText:  "So, you're the one who's been aiding our people. I commend you for your efforts. But we have a more pressing issue at hand. The sudden surge of slimes around our village is no accident. Our scouts have reported sightings of a creature they've named the 'Slime King' in a nearby cave. We believe it's the source of our troubles. If you could brave the depths and rid us of this menace, it could be the key to understanding the disturbances across Looporia in the wake of King RC's absence.",
//         endText: "Slime King slain! - Progress onward!",
//         eventType: "KILL_MOB",
//         npc: Types.Entities.ELDRIN,
//         target: Types.Entities.KINGSLIME,
//         amount: 1,
//         requiredQuest: "OA_QUEST_1",
//         level: 2,
//         medal: Types.Medals.HEARTH
//     },
]
exports.quests = quests;
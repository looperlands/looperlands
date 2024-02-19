Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "SDU_TEST_1",
        name: "test123", //Concert in The Cellar
        startText: "Here's a flier with all the info... Whoaaaa! All the fliers flew away!",
        longText: "Hey dude! My band, Old Kids has a show in The Cellar this weekend! I'm trying to get the word out, but the wind just blew my fliers all over the parking lot! This city is so windy, the fliers are everywhere! If you can help me pick up these fliers, I'll make sure your name is on the list so you can get into the show.",
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
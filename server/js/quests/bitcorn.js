Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "GOLDEN_KERNEL_QUEST_TALKTOBIT",
        name: "Talk to bitcorn about Golden Kernel", 
        startText: "Go. Talk. bitcorn.",
        longText: "Yeah, so like totally go and talk to that friendly lil bugger named bitcorn.",
        endText: "Noice.",
        eventType: "NPC_TALKED",
        npc: Types.Entities.BITNPC_THORNBEARD_KNEEL,
        target: Types.Entities.BITNPC_BITCORN,
        level: 1,
        showIndicator: false
    },
    {
        id: "GOLDEN_KERNEL_QUEST",
        name: "Get Dat Kernel", 
        startText: "Hey. Gimme Dat Kernel",
        longText: "Venture down into the depths of turds and come out a golden kernel heavier.",
        endText: "Hey. Nice Kernel, wanna be friends?",
        eventType: "KILL_MOB",
        npc: Types.Entities.BITNPC_BITCORN,
        target: Types.Entities.KINGSLIME,
        amount: 1,
        level: 1,
        medal: Types.Medals.HEARTH,
        showIndicator: false
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
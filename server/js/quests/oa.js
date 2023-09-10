Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "OA_QUEST_1",
        name: "Hushwind's Slimy Problem",
        startText: "Ah, traveler! Hushwind used to be a peaceful place. But with King RC's absence, even simple creatures like slimes have grown aggressive, threatening our village. Could you assist us in reducing their numbers outside? It might buy us some time to figure out the larger threat looming over Looporia.",
        endText: "Slimes pushed back!",
        eventType: "KILL_MOB",
        npc: Types.Entities.TORIN,
        target: Types.Entities.SLIME,
        amount: 30,
        level: 1,
        medal: Types.Medals.RAT
    },
    {
        id: "OA_QUEST_2",
        name: "Boar's Hide and Seek",
        startText: "You're the one who helped Guard Aleron with the slimes, aren't you? I'm in desperate need of assistance. The boars around the village, usually a source of hides for my work, have become aggressive and are hindering my ability to gather materials. If you could take some down and bring me their hides, it would be of great help to both me and the village. We need to ensure we're well-equipped, especially now with King RC missing and uncertainty clouding our lands.",
        endText: "Boar hides collected!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.ELARA,
        target: Types.Entities.BOARHIDE,
        amount: 30,
        requiredQuest: "OA_QUEST_1",
        level: 2,
        medal: Types.Medals.HEARTH
    },

    {
        id: "OA_QUEST_3",
        name: "The Slime King's Reign",
        startText: "So, you're the one who's been aiding our people. I commend you for your efforts. But we have a more pressing issue at hand. The sudden surge of slimes around our village is no accident. Our scouts have reported sightings of a creature they've named the 'Slime King' in a nearby cave. We believe it's the source of our troubles. If you could brave the depths and rid us of this menace, it could be the key to understanding the disturbances across Looporia in the wake of King RC's absence.",
        endText: "Slime King slain!",
        eventType: "KILL_MOB",
        npc: Types.Entities.ELDRIN,
        target: Types.Entities.KINGSLIME,
        amount: 30,
        requiredQuest: "OA_QUEST_2",
        level: 2,
        medal: Types.Medals.HEARTH
    }
    
]

exports.quests = quests;
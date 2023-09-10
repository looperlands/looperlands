Types = require("../../../shared/js/gametypes");
quests = [
    {
        id: "OA_QUEST_1",
        name: "Hushwind's Slimy Problem",
//        startText: "Ah, traveler! Hushwind used to be a peaceful place. But with King RC's absence, even simple creatures like slimes have grown aggressive, threatening our village. Could you assist us in reducing their numbers outside? It might buy us some time to figure out the larger threat looming over Looporia.",
        startText: "Hushwind's at risk; slimes aggressive since King RC's absence.",
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
        startText: "Boars turned aggressive; need hides for village safety & Equipment",
//        startText: "You're the one who helped Guard Aleron with the slimes, aren't you? I'm in desperate need of assistance. The boars around the village, usually a source of hides for my work, have become aggressive and are hindering my ability to gather materials. If you could take some down and bring me their hides, it would be of great help to both me and the village. We need to ensure we're well-equipped, especially now with King RC missing and uncertainty clouding our lands.",
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
        startText: "Slime King is the source of the slime scourge; need him slain.",
//        startText: "So, you're the one who's been aiding our people. I commend you for your efforts. But we have a more pressing issue at hand. The sudden surge of slimes around our village is no accident. Our scouts have reported sightings of a creature they've named the 'Slime King' in a nearby cave. We believe it's the source of our troubles. If you could brave the depths and rid us of this menace, it could be the key to understanding the disturbances across Looporia in the wake of King RC's absence.",
        endText: "Slime King slain!",
        eventType: "KILL_MOB",
        npc: Types.Entities.ELDRIN,
        target: Types.Entities.KINGSLIME,
        amount: 1,
        requiredQuest: "OA_QUEST_2",
        level: 2,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_4",
        name: "Planes of Aggression",
        startText: "Gnashlings overrun Windweave since King RC's departure; help needed.",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Gnashlings pushed back!",
        eventType: "KILL_MOB",
        npc: Types.Entities.DRAYLEN,
        target: Types.Entities.GNASHLING,
        amount: 30,
        requiredQuest: "OA_QUEST_3",
        level: 3,
        medal: Types.Medals.HEARTH
    },

    {
        id: "OA_QUEST_5",
        name: "The Key to Thudlord",
        startText: "Commander Draylen wants you to defeat Thudlord and retrieve his key.",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Thudlord King slain!",
        eventType: "KILL_MOB",
        npc: Types.Entities.DRAYLEN,
        target: Types.Entities.THUDLORD,
        amount: 1,
        requiredQuest: "OA_QUEST_4",
        level: 3,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_6",
        name: "Relic of Windweave",
        startText: "Retrieve Luminous Orb and Crystalline Shard from Windweave caves.",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Orb obtained!",
        eventType: "KILL_MOB",
        npc: Types.Entities.DRAYLEN,
        target: Types.Entities.THUDLORD,
        amount: 1,
        requiredQuest: "OA_QUEST_5",
        level: 3,
        medal: Types.Medals.HEARTH
    },

    {
        id: "OA_QUEST_7",
        name: "Webbed pathways",
        startText: "Silkthread Pass infested with spiders; assist and restore order.",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Spiders have been quelled!",
        eventType: "KILL_MOB",
        npc: Types.Entities.LIORA,
        target: Types.Entities.SPIDER,
        amount: 30,
        requiredQuest: "OA_QUEST_6",
        level: 4,
        medal: Types.Medals.HEARTH
    },

    {
        id: "OA_QUEST_8",
        name: "Lurking in the Shadows",
        startText: "Silkthread Pass infested with Fangwings; Collect their wings!",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Bats have been dealt with!",
        eventType: "KILL_MOB",
        npc: Types.Entities.LIORA,
        target: Types.Entities.FANGWING,
        amount: 30,
        requiredQuest: "OA_QUEST_6",
        level: 4,
        medal: Types.Medals.HEARTH
    },

    {
        id: "OA_QUEST_9",
        name: "Twilight's Arachnid",
        startText: "Slay the Arachweave spider, careful it is guarded",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Arachweave slain!",
        eventType: "KILL_MOB",
        npc: Types.Entities.LIORA,
        target: Types.Entities.ARACHWEAVE,
        amount: 30,
        requiredQuest: "OA_QUEST_8",
        level: 4,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_10",
        name: "Lurking in the Shadows",
        startText: "Silkshade, the Spider Queen, threatens Silkthread; eliminate her",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Silkshade bested!",
        eventType: "KILL_MOB",
        npc: Types.Entities.LIORA,
        target: Types.Entities.SILKSHADE,
        amount: 30,
        requiredQuest: "OA_QUEST_9",
        level: 4,
        medal: Types.Medals.HEARTH
    }
    
]

exports.quests = quests;
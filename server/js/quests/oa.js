Types = require("../../../shared/js/gametypes");
///MAIN QUESTS///
quests = [
    { //DONE
        id: "OA_QUEST_1",
        name: "Hushwind's Slimy Problem",
//        startText: "Ah, traveler! Hushwind used to be a peaceful place. But with King RC's absence, even simple creatures like slimes have grown aggressive, threatening our village. Could you assist us in reducing their numbers outside? It might buy us some time to figure out the larger threat looming over Looporia.",
        startText: "Hushwind's at risk; Eliminate 30 Slimes to push them back.",
        endText: "Slimes pushed back! - Go see Elara!",
        eventType: "KILL_MOB",
        npc: Types.Entities.TORIN,
        target: Types.Entities.SLIME,
        amount: 30,
        level: 1,
        medal: Types.Medals.RAT
    },
    { //DONE
        id: "OA_QUEST_2",
        name: "Boar's Hide and Seek",
        startText: "Boars turned aggressive; Collect 30 hides for village safety & Equipment",
//        startText: "You're the one who helped Guard Aleron with the slimes, aren't you? I'm in desperate need of assistance. The boars around the village, usually a source of hides for my work, have become aggressive and are hindering my ability to gather materials. If you could take some down and bring me their hides, it would be of great help to both me and the village. We need to ensure we're well-equipped, especially now with King RC missing and uncertainty clouding our lands.",
        endText: "Boar hides collected!- Go see Eldrin!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.ELARA,
        target: Types.Entities.BOARHIDE,
        amount: 30,
        requiredQuest: "OA_QUEST_1",
        level: 2,
        medal: Types.Medals.HEARTH
    },

    { //DONE
        id: "OA_QUEST_3",
        name: "The Slime King's Reign",
        startText: "Slime King is the source of the slime scourge; need him slain.",
//        startText: "So, you're the one who's been aiding our people. I commend you for your efforts. But we have a more pressing issue at hand. The sudden surge of slimes around our village is no accident. Our scouts have reported sightings of a creature they've named the 'Slime King' in a nearby cave. We believe it's the source of our troubles. If you could brave the depths and rid us of this menace, it could be the key to understanding the disturbances across Looporia in the wake of King RC's absence.",
        endText: "Slime King slain! - Progress onward!",
        eventType: "KILL_MOB",
        npc: Types.Entities.ELDRIN,
        target: Types.Entities.KINGSLIME,
        amount: 1,
        requiredQuest: "OA_QUEST_1",
        level: 2,
        medal: Types.Medals.HEARTH
    },
    { //DONE
        id: "OA_QUEST_4",
        name: "Planes of Aggression",
        startText: "Gnashlings overrun Windweave since King RC's departure; Kill 30!",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Gnashlings pushed back! - Go see Draylen!",
        eventType: "KILL_MOB",
        npc: Types.Entities.DRAYLEN,
        target: Types.Entities.GNASHLING,
        amount: 30,
        requiredQuest: "OA_QUEST_3",
        level: 3,
        medal: Types.Medals.HEARTH
    },

    { //IN PROGRESS
        id: "OA_QUEST_5",
        name: "The Key to Thudlord",
        startText: "Defeat Thudlord in his camp and retrieve his key",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Thudlord King slain! - Go see Draylen!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.DRAYLEN,
        target: Types.Entities.THUDKEY,
        amount: 1,
        requiredQuest: "OA_QUEST_4",
        level: 3,
        medal: Types.Medals.HEARTH
    },
    { //IN PROGRESS
        id: "OA_QUEST_6",
        name: "Relic of Windweave",
        startText: "Retrieve Luminous Orb from a windweave cave.",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Orb obtained! - Progress onward!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.DRAYLEN,
        target: Types.Entities.ORB,
        amount: 1,
        requiredQuest: "OA_QUEST_5",
        level: 3,
        medal: Types.Medals.HEARTH
    },

    { //DONE
        id: "OA_QUEST_7",
        name: "Webbed pathways",
        startText: "Silkthread Pass infested with spiders; Kill 30 to clear a path.",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Spiders have been quelled! - Go see Liora",
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
        startText: "This area is infested with bats! Collect 30 of their wings!",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Bats have been dealt with! - Go See Liora",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.LIORA,
        target: Types.Entities.BATWING,
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
        endText: "Arachweave slain! - Go see Liora",
        eventType: "KILL_MOB",
        npc: Types.Entities.LIORA,
        target: Types.Entities.ARACHWEAVE,
        amount: 1,
        requiredQuest: "OA_QUEST_8",
        level: 4,
        medal: Types.Medals.HEARTH
    },

    {
        id: "OA_QUEST_10",
        name: "I'm not lost, you are!",
        startText: "Locate the Dawnbloom hermits home.",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Located the house!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.TORVIN,
        target: Types.Entities.HERMITHOME,
        amount: 1,
        requiredQuest: "OA_QUEST_9",
        level: 4,
        medal: Types.Medals.HEARTH
    },

    {
        id: "OA_QUEST_11",
        name: "Dawnbloom Curse",
        startText: "Break the curse of Dawnbloom!",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Curse has been lifted!",
        eventType: "KILL_MOB",
        npc: Types.Entities.THAELEN,
        target: Types.Entities.LOOMLEAF,
        amount: 1,
        requiredQuest: "OA_QUEST_9",
        level: 6,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_12",
        name: "Glacialord's Demise",
        startText: "Shatter the Glacialord",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Glacialord defeated!",
        eventType: "KILL_MOB",
        npc: Types.Entities.EDUR,
        target: Types.Entities.GLACIALORD,
        amount: 1,
        requiredQuest: "OA_QUEST_11",
        level: 16,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_13",
        name: "Icebound Treasures",
        startText: "Gather icebound crystals within the enclave.",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Crystals delivered!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.LUMI,
        target: Types.Entities.ICEBOUNDCRYSTAL,
        amount: 25,
        requiredQuest: "OA_QUEST_11", // change
        level: 14,
        medal: Types.Medals.HEARTHS
    },
    {
        id: "OA_QUEST_14",
        name: "Satchel's Secrets",
        startText: "Retrieve lost satchel from enclave's depths",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Recovered Satchel!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.EDUR,
        target: Types.Entities.SATCHEL,
        amount: 1,
        requiredQuest: "OA_QUEST_11", //change
        level: 14,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_15",
        name: "Essence of Frost",
        startText: "Extract essences from enclave's crystoliths",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Extracted essences!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.GELIDUS,
        target: Types.Entities.ICESSENCE,
        amount: 40,
        requiredQuest: "OA_QUEST_11", //change
        level: 14,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_16",
        name: "Nightharrows Nightfall",
        startText: "Defeat the Night King",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "King vanquished!",
        eventType: "KILL_MOB",
        npc: Types.Entities.TORIAN,
        target: Types.Entities.NIGHTHARROW,
        amount: 1,
        requiredQuest: "OA_QUEST_12", //change
        level: 21,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_17",
        name: "Recover doomforged greatswords.",
        startText: "Defeat the Night King, for Looporia!",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "King vanquished!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.TORIAN,
        target: Types.Entities.FORGEDSWORD,
        amount: 40,
        requiredQuest: "OA_QUEST_12", //change
        level: 14,
        medal: Types.Medals.HEARTH
    },

    {
        id: "OA_QUEST_18",
        name: "Defeat the Gloomforged warriors",
        startText: "Eliminate Gloomforge warriors",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "King vanquished!",
        eventType: "KILL_MOB",
        npc: Types.Entities.TORIAN,
        target: Types.Entities.GLOOMFORGED,
        amount: 40,
        requiredQuest: "OA_QUEST_12", //change
        level: 14,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_19",
        name: "Tattered Banners",
        startText: "Receover Gloomforge Banners!",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "King vanquished!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.TORIAN,
        target: Types.Entities.BANNER,
        amount: 15,
        requiredQuest: "OA_QUEST_12", //change
        level: 14,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_QUEST_20",
        name: "The Spider Queen",
        startText: "Slay Silkshade",
//        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Bested Silkshade",
        eventType: "KILL_MOB",
        npc: Types.Entities.LIORA,
        target: Types.Entities.SILKSHADE,
        amount: 1,
        requiredQuest: "OA_QUEST_6",
        level: 5,
        medal: Types.Medals.HEARTH
    },
///SIDE QUESTS///

    {
        id: "OA_SIDE_1",
        name: "Revenge served..Slimey",
        startText: "Collect 15 Red Ooze for Elric",
    //        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Collected enough ooze!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.ELRIC,
        target: Types.Entities.REDOOZE,
        amount: 15,
        level: 2,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_SIDE_2",
        name: "Do a Barrel search!",
        startText: "Scour Gnashling camps for 12 weapons",
    //        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Crippled Gnashling supplies!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.DRAYLEN,
        target: Types.Entities.WILDBLADE,
        amount: 12,
        level: 4,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_SIDE_3",
        name: "Magic Mushrooms!?",
        startText: "Collect 20 Magic Mushrooms from the cave!",
    //        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Wow great! Job..feeling..dizzy",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.ATHLYN,
        target: Types.Entities.MAGICMUSHROOM,
        amount: 20,
        level: 1,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_SIDE_4",
        name: "Berry Serious",
        startText: "Collect 8 Berry bushes from around town",
    //        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Whoah whoah! Don't eat those!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.NEENA,
        target: Types.Entities.WILDFLOWER,
        amount: 8,
        level: 1,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_SIDE_5",
        name: "Whiskers' Mischievous Kittens",
        startText: "Find all of whiskers kittens in town",
    //        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Wow! What a good samaritan!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.WHISKERS,
        target: Types.Entities.BLACKCAT,
        amount: 7,
        level: 4,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_SIDE_6",
        name: "They trixed us! They betrayed us!",
        startText: "Friends betray Glink! Slay 25 Wildgrins!",
    //        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "That should teach them a lesson!",
        eventType: "KILL_MOB",
        npc: Types.Entities.GLINK,
        target: Types.Entities.WILDGRIN,
        amount: 25,
        level: 6,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_SIDE_7",
        name: "My pearls!",
        startText: "They steal from Glink! Get them back!",
    //        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "My preciouses!!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.GLINK,
        target: Types.Entities.GREEN_PEARL,
        amount: 8,
        level: 6,
        medal: Types.Medals.HEARTH
    },
    {
        id: "OA_SIDE_8",
        name: "Slimy coating ",
        startText: "Collect sludge for Gripnar! He use to coat weapon!",
    //        startText: "Traveler, you come at a dire time. My men and I were ambushed. These plains were once calm, but ever since King RC's departure, they've been swarming with these vile creatures we've named 'Gnashlings'. Their numbers are overwhelming. I implore you, if you can thin their ranks, it might give us a fighting chance to reclaim the Windweave Planes and push these creatures back. We need to stabilize this area, or all of Looporia might be at risk.",
        endText: "Gripnar thanks you!",
        eventType: "LOOT_ITEM",
        npc: Types.Entities.GRIPNAR,
        target: Types.Entities.SLIMEBALL,
        amount: 15,
        level: 2,
        medal: Types.Medals.HEARTH
    }

]

exports.quests = quests;
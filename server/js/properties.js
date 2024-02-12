const Types = require("../../shared/js/gametypes");

let Properties = {
    rat: {
        level: 1,
        drops: {
            flask: 40,
            burger: 10,
            firepotion: 5
        },
        respawnDelay: 10000,
    },

    skeleton: {
        level: 4,
        drops: {
            flask: 40,
            axe: 20,
            firepotion: 5
        },
        weaponMod: 1.5, //bigger mod cause attack rate is 50% slower
        respawnDelay: 45000,
    },

    goblin: {
        level: 3,
        drops: {
            flask: 50,
            axe: 10,
            firepotion: 5
        }
    },

    ogre: {
        level: 6,
        drops: {
            burger: 10,
            flask: 50,
            bluesword: 5,
            firepotion: 5
        }
    },

    spectre: {
        level: 9,
        drops: {
            flask: 30,
            redsword: 30,
            firepotion: 5
        },
        weaponMod: 1.25,
        hpMod: 0.8
    },

    deathknight: {
        level: 12,
        drops: {
            burger: 50,
            firepotion: 5
        },
        weaponMod: 0.9,
        hpMod: 1.2
    },

    crab: {
        level: 2,
        drops: {
            flask: 50,
            axe: 20,
            firepotion: 5
        }
    },

    snake: {
        level: 5,
        drops: {
            flask: 50,
            morningstar: 10,
            firepotion: 5
        },
        weaponMod: 1.2,
        armorMod: 0.5
    },

    skeleton2: {
        level: 20,
        drops: {
            burger: 30,
            firepotion: 10
        },
        weaponMod: 1.5, //bgger mod cause attack rate is 50% slower
        respawnDelay: 30000
    },

    eye: {
        level: 8,
        drops: {
            flask: 50,
            redsword: 10,
            firepotion: 5
        }
    },

    bat: {
        level: 3,
        drops: {
            flask: 50,
            axe: 10,
            firepotion: 5
        }
    },

    wizard: {
        level: 4,
        drops: {
            flask: 50,
            firepotion: 5
        }
    },

    boss: {
        level: 13,
        drops: {
            goldensword: 10,
            flask: 50
        },
        hpMod: 15,
        armorMod: 1.5,
        weaponMod: 2.5,
        redpacket: true,
        respawnDelay: 120000,
        xp: 7500
    },

    slime: {
        level: 1,
        drops: {
            potion: 50,
            SLIMEBALL: 50,
        },
    },
    boar: {
        level: 1,
        drops: {
            BOARHIDE: 95,
        },
    },

    gnashling: {
        level: 3,
        drops: {
            potion: 80,
        },
    },

    crystolith: {
        level: 12,
        drops: {
            ICESSENCE: 80,
        },
    },

    stoneguard: {
        level: 9,
        drops: {
            potion: 80,
        },
    },

    shiverrock: {
        level: 16,
        drops: {
            ICEKEY1: 100,
        },
    },
    shiverrockii: {
        level: 16,
        drops: {
            ICEKEY2: 100,
        },
    },
    shiverrockiii: {
        level: 16,
        drops: {
            ICEKEY3: 100,
        },
    },

    gloomforged: {
        drops: {
            FORGEDSWORD: 40,
        },
        level: 20,
        armorMod: 1.25,
        weaponMod: 1.1
    },

    thudlord: {
        level: 6,
        drops: {
            THUDKEY: 100,
        },
        weaponMod: 0.9,
        hpMod: 2,
        armorMod: 0.8


    },

    grizzlefang: {
        level: 6,
        drops: {
            ORB: 100,
        },
    },
    barrel: {
        level: 1,
        xp: 0,
        drops: {
            WILDBLADE: 40,
        },
    },




//BOSSES

    kingslime: {
        level: 3,
        drops: {
            potion: 100,
            messages: ['Bow to the gelatinous crown', 'Flowing, shifting, unstoppable', 'Dissolve within my embrace', 'I am boundless, ever-spreading', 'Your struggles make the kingdom grow'],
            armorMod: 0.75,
            hpMod: 3,
            xp: 0,
        },
    },

    silkshade: {
        level: 7,
        drops: {
            potion: 50,
        },
        messages: ['Darkness shall embrance you!', 'Your doom is woven', 'Fear binds you', 'Your end is spun', 'The old world beckons you'],
        armorMod: 1,
        hpMod: 3,
        weaponMod: 0.8,
        respawnDelay: 30000,
        xp: 600
    },

    loomleaf: {
        level: 10,
        drops: {
            potion: 100,

        },
        armorMod: 1.2,
        weaponMod: 1.9,
        hpMod: 2.8,
        xp: 1200,
        respawnDelay: 30000

    },

    glacialord: {
        level: 20,
        drops: {
            potion: 50,
        },
        messages: ['Frost consumes you!', 'Ice seals your fate!', 'I am eternal Cold!', 'Cold as death', 'Shatter!'],
        armorMod: 1,
        hpMod: 5,
        weaponMod: 0.8,
        respawnDelay: 30000,
        xp: 3000


    },

    nightharrow: {
        level: 25,
        drops: {
            potion: 50,
        },
        aoe: {
            damage: 100,
            range: 2
        },
        messages: ['Endings begin with me.', 'Kneel!', 'Dawn shall never rise.', 'Face the endless night!', 'Embrace the final dusk.!'],
        armorMod: 2,
        hpMod: 12,
        weaponMod: 1.6,
        respawnDelay: 1800000,
        xp: 5000



    },


    wildgrin: {
        level: 7,
        drops: {
            potion: 100,
        },
    },


    redslime: {
        level: 2,
        drops: {
            potion: 50,
            REDOOZE: 50,
        },
    },

    spider: {
        level: 4,
        drops: {
            potion: 65,
        },
    },

    fangwing: {
        level: 4,
        drops: {
            potion: 40,
            BATWING: 65,
        },
    },

    arachweave: {
        level: 5,
        drops: {
            KEY_ARACHWEAVE: 100,
        },
    },

    minimag: {
        level: 16,
        drops: {
            flask: 50
        },
        aoe: {
            damage: 60,
            onDeath: true
        },
        armorMod: 2,
        weaponMod: 0.8
    },

    megamag: {
        level: 20,
        drops: {
            burger: 100
        },
        armorMod: 2.5,
        weaponMod: 2.5,
        hpMod: 20,
        aoe: {
            damage: 100,
            range: 2
        },
        redpacket: true,
        xp: 50000,
        messages: ['Perish!', 'Be gone!', 'Burn!', 'Wither!', 'Suffer!'],
        respawnDelay: 1800000
    },
    seacreature: {
        level: 18,
        drops: {},
        hp: 999999,
        redpacket: true,
        xp: 75000,
        respawnDelay: 1800000
    },
    tentacle: {
        level: 18,
        drops: {},
        armorMod: 1.5,
        weaponMod: 0.1,
        hpMod: 10,
        aoe: {
            damage: 100,
            range: 1,
            onTimer: 4000
        },
        respawnDelay: 20000
    },
    tentacle2: {
        level: 18,
        drops: {},
        armorMod: 1.5,
        weaponMod: 0.1,
        hpMod: 10,
        aoe: {
            damage: 100,
            range: 1,
            onTimer: 4000
        },
        respawnDelay: 20000
    },

    cobchicken: {
        level: 1,
        friendly: true
    },

    cobcow: {
        level: 1,
        friendly: true
    },

    cobpig: {
        level: 1,
        friendly: true
    },

    cobgoat: {
        level: 1,
        friendly: true
    },

    ghostie: {
        level: 9,
        drops: {
            cobapple: 50,
            cobcorn: 10
        },
        armorMod: 0.75,
        hpMod: 0.75
    },

    cobslimered: {
        level: 5,
        drops: {
            cobapple: 20,
            cobcorn: 10,
            redsword: 5
        }
    },

    cobslimeyellow: {
        level: 3,
        drops: {
            cobapple: 30,
            morningstar: 5
        }
    },

    cobslimeblue: {
        level: 1,
        drops: {
            cobapple: 20,
            axe: 5
        }
    },

    cobslimepurple: {
        level: 8,
        drops: {
            cobapple: 20,
            cobcorn: 10,
            redsword: 5
        }
    },

    cobslimegreen: {
        level: 11,
        drops: {
            cobapple: 30,
            cobcorn: 10,
            redsword: 5
        }
    },

    cobslimepink: {
        level: 14,
        drops: {
            cobapple: 30,
            luminousstones: 20,
            cobcorn: 10,
            redsword: 5
        }
    },

    cobslimecyan: {
        level: 17,
        drops: {
            luminousstones: 50,
            cobapple: 40,
            cobcorn: 10,
        }
    },

    cobslimemint: {
        level: 20,
        drops: {
            cobapple: 50,
            cobcorn: 10,
            redsword: 5
        }
    },

    cobslimeking: {
        level: 7,
        drops: {
            cobclover: 100
        },
        armorMod: 1.25,
        weaponMod: 2,
        hpMod: 10,
        xp: 2500,
        respawnDelay: 180000
    },

    alaric: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    blackdog: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    turtle: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    brownspotdog: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    tabbycat: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    oablackcat: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    browndog: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    whitedog: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    fvillager1: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    villager1: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager2: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager3: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager4: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager5: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager6: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager7: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager8: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager9: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager10: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager11: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager12: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager13: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager14: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager15: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager16: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager17: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager18: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager19: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager20: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager21: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager22: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager23: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager24: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager25: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager26: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager27: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager28: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    villager29: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager1: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager2: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager3: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager4: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager5: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager6: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager7: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager8: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager9: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager10: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager11: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager12: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager13: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager14: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager15: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager16: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager17: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager18: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager19: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager20: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager21: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager22: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager23: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager24: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager25: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager26: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager27: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager28: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager29: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager30: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    fvillager31: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    jayce: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    orlan: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    cobcat: {
        level: 1,
        friendly: true
    },

    cobyorkie: {
        level: 1,
        friendly: true
    },

    cobdirt: {
        level: 1,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        xp: 0,
        respawnDelay: 10000
    },

    cobincubator: {
        level: 1,
        drops: {
            cobegg: 100
        },
        hp: 1,
        xp: 0,
        respawnDelay: 60000
    },

    cobcoblin: {
        level: 11,
        drops: {
            cobapple: 35,
            cobcorn: 5,
            cobegg: 5
        },
        weaponMod: 1.15,
        armorMod: 0.8,
        hpMod: 0.8
    },

    cobcobane: {
        level: 13,
        drops: {
            cobapple: 45,
            cobcorn: 5,
            cobegg: 5
        },
        hpMod: 1.1
    },

    cobogre: {
        level: 15,
        armorMod: 1.25,
        weaponMod: 2.25,
        hpMod: 13,
        xp: 5000,
        respawnDelay: 180000
    },

    BORAC: {
        level: 9,
        drops: {
            GREYPOTION: 100,
            EYEBALL: 10
        },

    },

    INFERNOTH: {
        level: 30,
        hpMod: 8.25,
        weaponMod: 2.2,
        xp:10000,
        respawnDelay: 60000
    },

    WINGELLA: {
        level: 5,
        drops: {
            REDPOTION: 40
        },

    },

    GAUNTER: {
        level: 13,
        drops: {
            GREYPOTION: 100,
            EYEBALL: 10
        },
    },

    MASTROM: {
        level: 11,
        drops: {
            GREYPOTION: 100,
            EYEBALL: 10
        },
    },

    VALKYM: {
        level: 7,
        drops: {
            REDPOTION: 40,
            EYEBALL: 10
        },
    },

    //Short Destroyers
    lateflea: {
        level: 5,
        drops: {
            popcorn: 50,
            energydrink: 10,
        }
    },

    wolfboss: {
        level: 10,
        drops: {
            dvd: 50,
            popcorn: 50,      
        },
        messages: ['Prepare for Death!'],
        armorMod: 1.1,
        weaponMod: 1.6,
        hpMod: 2.0,
        xp: 1200,  
        respawnDelay: 30000
    },

    fleaboss: {
        level: 30,
        drops: {
            energydrink: 50,
            GOLD: 50,
            GOLD2: 10,
            GOLD3: 2,      
        },
        messages: ['Time to collect those late fees!'],
        armorMod: 2.2,
        weaponMod: 2.0,
        hpMod: 4.0,
        xp: 18000,   
        respawnDelay: 180000
    },

    horde1: {
        level: 8,
        drops: {
            popcorn: 50,
            energydrink: 10,
        }
    },

    horde2: {
        level: 12,
        drops: {
            popcorn: 50,
            energydrink: 10,
        }
    },

    horde3: {
        level: 6,
        drops: {
            flask: 50
        }
    },

    horde4: {
        level: 8,
        drops: {
            flask: 50
        }
    },

    horde5: {
        level: 10,
        drops: {
            flask: 50
        }
    },
   cobWalkingNpc1: {
       hp: 10,
       armor: 1,
       weapon: 1,
       friendly: true
   },
   cobWalkingNpc2: {
       hp: 10,
       armor: 1,
       weapon: 1,
       friendly: true
   },
   cobWalkingNpc3: {
       hp: 10,
       armor: 1,
       weapon: 1,
       friendly: true
   },
   cobWalkingNpc4: {
       hp: 10,
       armor: 1,
       weapon: 1,
       friendly: true
   },
   cobWalkingNpc5: {
       hp: 10,
       armor: 1,
       weapon: 1,
       friendly: true
   },

    //Field effects
    magcrack: {
        aoe: {
            damage: 100,
            range: 1
        }
    },

    cobfallingrock: {
        aoe: {
            damage: 75,
            range: 0,
            singleHitDuration: 2900
        },
    },

    //Items
    luminousstones: {
        respawnDelay: 60000,
    },
    wildflowers: {
        respawnDelay: 60000,
    },
    trinket: {
        respawnDelay: 60000,
    },
    crystal: {
        respawnDelay: 60000,
    },
    coffeebeans: {
        respawnDelay: 60000,
    },
    coblog: {
        respawnDelay: 60000,
    },
    GOLD: {
        collectable: true,
        inventoryDescription: "Gold",
    },
    GOLD2: {
        collectable: true,
        inventoryDescription: "Gold",
        collectItem: Types.Entities.GOLD,
        collectAmount: 10
    },
    GOLD3: {
        collectable: true,
        inventoryDescription: "Gold",
        collectItem: Types.Entities.GOLD,
        collectAmount: 50
    },
    cpotion_s: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "hpPotions",
            duration: 60000
        },
        inventoryDescription: "Small healing potion (75)",
        onConsume: function(player){
            player.regenHealthBy(75);
        }
    },
    cpotion_m: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "hpPotions",
            duration: 60000
        },
        inventoryDescription: "Medium healing potion (150)",
        onConsume: function(player){
            player.regenHealthBy(150);
        }
    },
    cpotion_l: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "hpPotions",
            duration: 60000
        },
        inventoryDescription: "Large healing potion (300)",
        onConsume: function(player){
            player.regenHealthBy(300);
        }
    },
    cimmupot: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "immunity",
            duration: 180000
        },
        inventoryDescription: "Liquid loopium",
        onConsume: function(player){
            player.startInvincibility();
        }
    },
    cagedrat: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "caged",
            duration: 60000
        },
        inventoryDescription: "Caged rat",
        onConsume: function(player) {
            player.releaseMob(Types.Entities.RAT);
        }
    }

    // Weapons
    // axe: {
    //     name: "Axe",
    //     consumables: {
    //         GOLD: {
    //             level: 40,
    //             range: 6
    //         },
    //         coblog: {
    //             level: 10,
    //             range: 12
    //         }
    //     }
    // }
};

Properties.getArmorLevel = function(kind, levelOffset) {
    try {
        if(Types.isMob(kind)) {
            let level = Properties.getLevel(kind);
            if (Properties[Types.getKindAsString(kind)].armor !== undefined) {
                return Math.round(Properties[Types.getKindAsString(kind)].armor * (level + levelOffset) / level);
            } else {
                return Math.round((0.5 * (level + levelOffset)) * Properties.getArmorMod(kind));
            }
        } else {
            return 1;
        }
    } catch(e) {
        console.error("No level found for armor: "+Types.getKindAsString(kind));
    }
    return 1;
};

Properties.getWeaponLevel = function(kind, levelOffset) {
    try {
        if(Types.isMob(kind)) {
            let level = Properties.getLevel(kind);
            if (Properties[Types.getKindAsString(kind)].weapon !== undefined) {
                return Math.round(Properties[Types.getKindAsString(kind)].weapon * (level + levelOffset) / level);
            } else {
                return Math.round((0.4 * (level + levelOffset) + (level + levelOffset - 1) * 0.5) * Properties.getWeaponMod(kind));
            }
        } else {
            if (Properties[Types.getKindAsString(kind)] !== undefined) {
                let weaponProps = Properties[Types.getKindAsString(kind)];

                if(weaponProps.consumables) {
                    let levelInfo = [];
                    for(let consumable in weaponProps.consumables) {
                        levelInfo.push({ consumable: consumable, level: weaponProps.consumables[consumable].level, range: weaponProps.consumables[consumable].range});
                    }

                    return levelInfo;
                }

                return weaponProps.level;
            }
            return Types.getWeaponRank(kind);
        }
    } catch(e) {
        console.error("No level found for weapon: "+Types.getKindAsString(kind), e);
    }
};

Properties.getWeaponName = function(kind) {
    let retName = Properties[Types.getKindAsString(kind)]?.name;
    return retName !== undefined ? retName : Types.getKindAsString(kind);
}

Properties.getHitPoints = function(kind, levelOffset) {
    let level = Properties.getLevel(kind);

    if (Properties[Types.getKindAsString(kind)].hp !== undefined) {
        return Math.round(Properties[Types.getKindAsString(kind)].hp * (level + levelOffset) / level);
    } else {
        return Math.round((level + levelOffset) * 25 * Properties.getHpMod(kind));
    }
};

Properties.getLevel = function(kind) {
    let retLevel = Properties[Types.getKindAsString(kind)].level;
    return retLevel !== undefined ? retLevel : 1;
};

Properties.getHpMod = function(kind) {
    let retMod = Properties[Types.getKindAsString(kind)].hpMod;
    return retMod !== undefined ? retMod : 1;
};

Properties.getArmorMod = function(kind) {
    let retMod = Properties[Types.getKindAsString(kind)].armorMod;
    return retMod !== undefined ? retMod : 1;
};

Properties.getWeaponMod = function(kind) {
    let retMod = Properties[Types.getKindAsString(kind)].weaponMod;
    return retMod !== undefined ? retMod : 1;
};

Properties.isCollectable = function(kind) {
    let retCollectable = Properties[Types.getKindAsString(kind)]?.collectable;
    return retCollectable !== undefined ? retCollectable : false;
}

Properties.isConsumable = function(kind) {
    let retConsumable = Properties[Types.getKindAsString(kind)]?.consumable;
    return retConsumable !== undefined ? retConsumable : false;
}

Properties.getCollectableImageName = function(kind) {
    return 'item-' + Types.getKindAsString(kind);
}

Properties.getCollectAmount = function(kind) {
    let retCollectableAmount = Properties[Types.getKindAsString(kind)]?.collectAmount;
    return retCollectableAmount !== undefined ? retCollectableAmount : 1;
}

Properties.getCollectItem = function(kind) {
    let retCollectableItem = Properties[Types.getKindAsString(kind)]?.collectItem;
    return retCollectableItem !== undefined ? retCollectableItem : kind;
}

Properties.consume = function(kind, player) {
    let onConsume = Properties[Types.getKindAsString(kind)]?.onConsume;
    if(onConsume !== undefined) {
        onConsume(player);
    }
}

Properties.getInventoryDescription = function(kind) {
    let retDescription = Properties[Types.getKindAsString(kind)]?.inventoryDescription;
    return retDescription !== undefined ? retDescription : false;
}

Properties.getCooldownData = function(kind) {
    return Properties[Types.getKindAsString(kind)]?.cooldown; 
}

Properties.filterCooldownGroups = function() {
    let ret = {};
    Object.keys(Properties).forEach(key => {
        let itemGroup = Properties[key].cooldown?.group;
        if (itemGroup !== undefined) {
            if (ret[itemGroup] === undefined) {
                ret[itemGroup] = [];
            }
            ret[itemGroup].push(key);
        }
    });

    return ret;
}

const COOLDOWNGROUP_MAP = Properties.filterCooldownGroups();

Properties.getCdItemsByGroup = function(cdGroup) {
    return COOLDOWNGROUP_MAP[cdGroup] !== undefined ? COOLDOWNGROUP_MAP[cdGroup] : [];
}

module.exports = Properties;
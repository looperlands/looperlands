const Types = require("../../shared/js/gametypes");

let Properties = {
    rat: {
        level: 1,
        drops: {
            flask: 40,
            taikoboost: 10,
            loopring: 5
        },
        respawnDelay: 10000,
    },

    skeleton: {
        level: 4,
        drops: {
            flask: 40,
            axe: 20,
            loopring: 5
        },
        weaponMod: 1.5, //bigger mod cause attack rate is 50% slower
        respawnDelay: 45000,
    },

    goblin: {
        level: 3,
        drops: {
            flask: 50,
            axe: 10,
            loopring: 5
        }
    },

    ogre: {
        level: 6,
        drops: {
            taikoboost: 10,
            flask: 50,
            bluesword: 5,
            loopring: 5
        }
    },

    spectre: {
        level: 9,
        drops: {
            flask: 30,
            redsword: 30,
            loopring: 5
        },
        weaponMod: 1.25,
        hpMod: 0.8
    },

    deathknight: {
        level: 12,
        drops: {
            taikoboost: 50,
            loopring: 5
        },
        weaponMod: 0.9,
        hpMod: 1.2
    },

    crab: {
        level: 2,
        drops: {
            flask: 50,
            axe: 20,
            loopring: 5
        }
    },

    snake: {
        level: 5,
        drops: {
            flask: 50,
            morningstar: 10,
            loopring: 5
        },
        weaponMod: 1.2,
        armorMod: 0.5
    },

    skeleton2: {
        level: 20,
        drops: {
            taikoboost: 30,
            loopring: 10
        },
        weaponMod: 1.5, //bgger mod cause attack rate is 50% slower
        respawnDelay: 30000
    },

    eye: {
        level: 8,
        drops: {
            flask: 50,
            redsword: 10,
            loopring: 5
        }
    },

    bat: {
        level: 3,
        drops: {
            flask: 50,
            axe: 10,
            loopring: 5
        }
    },

    wizard: {
        level: 4,
        drops: {
            flask: 50,
            loopring: 5
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
    SLUDGERAT: {
        level: 15,
        drops: {
            flask: 34,
	    taikoboost: 5,
	    GOLD: 40,
            GOLD2: 15,
            GOLD3: 5,
	    GOLD4: 1
        },
    },
    SPACECRAB: {
        level: 20,
        drops: {
            flask: 30,
	    taikoboost: 5,
	    GOLD: 15,
            GOLD2: 35,
            GOLD3: 8,
	    GOLD4: 2
        },
    },
    BLACKMAGE: {
        level: 25,
        drops: {
            flask: 50
        },
        armorMod: 2,
        weaponMod: 1.5,
        hpMod: 5,
        messages: ['Etheriumos!', 'Bitcornia!', 'Go-go-gadget magic!', 'BooyahKORNsha!'],
    },
    HOPPURP: {
        level: 30,
        drops: {
            flask: 25
        },
        respawnDelay: 15000
    },
    HOPPINK: {
        level: 35,
        drops: {
            flask: 40,
            taikoboost: 10
        },
        respawnDelay: 30000
    },
    ZOMBBID: {
        level: 42,
        drops: {
            flask: 90,
            taikoboost: 8,
            loopring: 2
        },
        respawnDelay: 120000
    },
    RABBID: {
        level: 100,
        drops: {
            flask: 5,
            taikoboost: 5,
            GOLD4: 45,
            GOLD5: 45
        },
        weaponMod: 3,
        hpMod: 2,
        respawnDelay: 160000
    },
    CRAPTOR: {
        level: 69,
        drops: {
            flask: 90,
            taikoboost: 10
        },
        weaponMod: 3,
        hpMod: 2,
        respawnDelay: 160000
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
        redpacket: true,
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
            taikoboost: 100
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

    cobcatorange: {
        level: 1,
        friendly: true
    },

    cobcatbrown: {
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

    cobhay: {
        level: 1,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        xp: 0,
        respawnDelay: 10000
    },

    cobhaytwo: {
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
        level: 35,
        drops: {
            GREYPOTION: 90,
            EYEBALL: 10
        },
        respawnDelay: 30000
    },

    INFERNOTH: {
        level: 30,
        hpMod: 8.25,
        weaponMod: 2.2,
        xp:10000,
        redpacket: true,
        respawnDelay: 30000
    },

    WINGELLA: {
        level: 25,
        drops: {
            REDPOTION: 40
        },
        respawnDelay: 30000
    },

    GAUNTER: {
        level: 40,
        drops: {
            GREYPOTION: 90,
            EYEBALL: 10
        },
        respawnDelay: 30000
    },

    MASTROM: {
        level: 21,
        drops: {
            GREYPOTION: 100,
            EYEBALL: 10
        },
        respawnDelay: 30000
    },

    VALKYM: {
        level: 30,
        drops: {
            REDPOTION: 40,
            EYEBALL: 10
        },
        respawnDelay: 30000
    },

     //robits Mobs
     ROBITSE3: {
        level: 2,
        drops: {
            HAMSTER1: 100
        },
    },

    ROBITSE4: {
        level: 5,
        drops: {
            taikoboost: 50,
            GOLD: 3
        },
    },

    ROBITSE5: {
        level: 10,
        drops: {
            taikoboost: 10,
            GOLD: 10
        },
    },

    ROBITSE6: {
        level: 15,
        drops: {
            taikoboost: 50,
            GOLD: 50
        },
    },

    ROBITSE7: {
        level: 10,
        drops: {
            taikoboost: 50,
            GOLD: 50
        },
    },

    ROBITSE8: {
        level: 15,
        drops: {
            taikoboost: 50,
            GOLD: 50
        },
    },

    ROBITSE9: {
        level: 13,
        drops: {
            taikoboost: 50,
            GOLD: 50,
        },
    },

    ROBITSE10: {
        level: 5,
        drops: {
            taikoboost: 50,
            GOLD: 50
        },
    },

    INFERNOID: {
        level: 3,
        drops: {
            taikoboost: 50,
            GOLD: 50,
            GOLD2: 10,
            GOLD3: 2,
        },
        messages: ['I will beepin destroy you!'],
        armorMod: 2.2,
        respawnDelay: 180000
    },

    ZAROTH: {
        level: 55,
        drops: {
            taikoboost: 50,
            GOLD: 50,
            GOLD2: 10,
            GOLD3: 2,
        },
        messages: ['I will beepin destroy you!'],
        armorMod: 2.2,
        xp: 30000,
        redpacket: true,
        respawnDelay: 60000
    },

    INFECTION: {
        level: 5,
        drops: {
            taikoboost: 50,
            GOLD: 50,
            GOLD2: 25,
        },
        messages: ['I will beepin destroy you!'],
        armorMod: 2.2,
        respawnDelay:  60000
    },

    FRYGUY: {
        level: 5,
        drops: {
            taikoboost: 50,
            GOLD: 5,
            GOLD1: 3,
            GOLD2: 1,
        },
        messages: ['I will beepin destroy you!'],
        armorMod: 2.2,
        respawnDelay:  60000
    },

     COLOSSUS: {
        level: 30,
        drops: {
            taikoboost: 50,
            GOLD: 50,
            GOLD2: 10,
            GOLD3: 2,
        },
        messages: ['I will beepin destroy you!'],
        armorMod: 2.2,
        xp: 18000,
        respawnDelay: 180000
    },

    ONI: {
        level: 30,
        drops: {
            taikoboost: 40,
            GOLD: 40,
            GOLD2: 10,
            GOLD3: 2
        },
        messages: ['Shinu!'],
        armorMod: 2.2,
        respawnDelay: 180000
    },

    BURGERBOSS: {
        level: 30,
        drops: {
            taikoboost: 40,
            GOLD: 40,
            GOLD2: 10,
            GOLD3: 2
        },
        messages: ['Shinu!'],
        armorMod: 2.2,
        respawnDelay: 180000
    },

    GHOST1: {
        level: 2,
        drops: {
            WHISPYSPIRIT: 100
        },
    },

    PUMPKINPUNK: {
        level: 5,
        drops: {
            taikoboost: 50,
            GOLD: 1
        },
        messages: ['BOO!'],
        respawnDelay:  60000
    },

    GHOST2: {
        level: 10,
        drops: {
            taikoboost: 50,
            GOLD: 5,
            GOLD1: 3,
            GOLD2: 1
        },
        messages: ['BOO!'],
        respawnDelay:  60000

    },

    GHOST3: {
        level: 10,
        drops: {
            taikoboost: 50,
            GOLD: 5,
            GOLD1: 3,
            GOLD2: 1
        },
        messages: ['BOO!'],
        respawnDelay:  60000
    
    },

    HORSEMAN: {
        level: 13,
        drops: {
            taikoboost: 40,
            GOLD: 40,
            GOLD2: 10,
            GOLD3: 2
        },
        messages: ['Shinu!'],
        armorMod: 2.2,
        respawnDelay: 180000
    
    },

    WRAITH: {
        level: 40,
        drops: {
            taikoboost: 40,
            GOLD: 40,
            GOLD2: 10,
            GOLD3: 2
        },
        messages: ['Shinu!'],
        armorMod: 2.2,
        respawnDelay: 120000
    
    },

    PUMPKINWARLOCK: {
        level: 69,
        drops: {
            taikoboost: 40,
            GOLD: 40,
            GOLD2: 10,
            GOLD3: 2
        },
        messages: ['Shinu!'],
        armorMod: 2.2,
        respawnDelay: 120000
    
    },

    EVILPUMPKIN: {
        level: 2,
        drops: {
            taikoboost: 40
        },
        messages: ['Shinu!'],
        armorMod: 2.2,
        respawnDelay: 6000
    
    },

    //m88n's Mobs
    balloondogb: {
        level: 2,
        drops: {
            taikoboost: 10,
            GOLD: 69
        },
        xp: 69
    },

    balloondogy: {
        level: 4,
        drops: {
            taikoboost: 20,
            GOLD: 69
        },
        xp: 99
    },

    balloondogg: {
        level: 6,
        drops: {
            m88nmap: 3,
            taikoboost: 20,
            GOLD: 30,
            GOLD2: 10
        },
        xp: 222
    },

    balloondoga: {
        level: 8,
        drops: {
            m88nmap: 5,
            taikoboost: 20,
            GOLD: 30,
            GOLD2: 20,
            GOLD3: 10,
        },
        xp: 444
    },

    balloondogv: {
        level: 10,
        drops: {
            m88nmap: 7,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            taikoboost: 25,
            GOLD: 10,
            GOLD2: 20,
            GOLD3: 30,
        },
        xp: 777
    },

    balloondogp: {
        level: 1,
        drops: {
            m88nmap: 5,
            taikoboost: 10,
            GOLD: 10,
            GOLD2: 5,
            lollitreat: 1
        },
    },

    balloonhotdogr: {
        level: 20,
        drops: {
            m88nmap: 10,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            taikoboost: 5,
            GOLD2: 20,
            GOLD3: 55
        },
        xp: 2222
    },

    balloongiraffeo: {
        level: 40,
        drops: {
            m88nmap: 15,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            taikoboost: 5,
            GOLD3: 50,
            loopring: 20
        },
        xp: 22222
    },

    m88nbigchungus: {
        level: 50,
        drops: {
            m88nmap: 30,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            taikoboost: 15,
            GOLD3: 25,
            loopring: 20
        },
        messages: ['Mmmmm, Easter Eggs!', 'O Doyle Rules!', 'Cant touch this...', 'Stay away or come back with friends!'],
        armorMod: 1,
        hpMod: 3,
        weaponMod: 0.8,
        respawnDelay: 1000000,
        xp: 69420,
        redpacket: true
    },

    m88noctopussy: {
        level: 69,
        drops: {
            m88nmap: 60,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            m88nseeds: 1,
            m88npotato: 1,
            m88nsnail: 1,
            m88nworm: 1,
            m88ngem: 1,
            gameboy: 4,
            battery: 3,
            hardwallet: 2,
            movieglasses: 1,
            m88ntentacle: 2,
            GOLD3: 10,
            loopring: 10
        },
        messages: ['Hahaha, no chance!', 'You should stay out of the ocean...', 'Why are you wasting my time?', 'Stay away or come back with friends!'],
        armorMod: 1,
        hpMod: 3,
        weaponMod: 0.8,
        respawnDelay: 420000,
        xp: 69420
    },

    sharkboss: {
        level: 88,
        drops: {
            m88nmap: 25,
            movieglasses: 1,
            battery: 1,
            gameboy: 1,
            hardwallet: 1,
            m88npeel: 1,
            m88ndungbeetle: 1,
            m88nfly: 1,
            m88njunebug: 1,
            m88nstickbug: 1,
            m88ndiamondnecklace: 1,
            m88ndiamondring: 1,
            m88ngoldearrings: 1,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            m88nwatercan: 1,
            m88nseeds: 1,
            m88npotato: 1,
            m88npackage: 1,
            m88nsalad: 1,
            m88nblueprint: 1,
            m88nhardhat: 1,
            m88nrose: 1,
            m88nworkgloves: 1,
            m88nbrewski: 1,
            m88npie: 1,
            m88nworm: 1,
            m88ngem: 3,
            GOLD3: 5,
            GOLD4: 5,
            GOLD5: 5,
            loopring: 10
        },
        messages: ['Mmmmm, tasty!', 'Yum!', 'Eww, that was a little tough...', 'Stay on land or come back with friends!'],
        armorMod: 1,
        hpMod: 4,
        weaponMod: 1,
        respawnDelay: 30000
    },

    m88njaws: {
        level: 369,
        drops: {
            m88ndiamondnecklace: 1,
            m88ndiamondring: 1,
            m88ngoldearrings: 1,
            m88ngoldtiara: 1,
            m88ndinnerbell: 1,
            m88negg1: 10,
            m88negg2: 10,
            m88negg3: 10,
            m88negg4: 10,
            m88negg5: 10,
            m88negg6: 10,
            m88ngem: 5,
            m88nchampagne: 1,
            m88nchampagnebottle: 1,
            m88nmanamaitai: 1,
            m88nmermaidmojito: 1,
            m88nnexussangria: 1,
            m88nhelioislandicedtea: 2,
            m88ndirtymartini: 3,
            m88nsunsetdaiquiri: 3,
            m88nbrassknuckles: 4,
            m88nkevlararmor: 5,
            GOLD3: 1,
            GOLD4: 1,
            GOLD5: 1
        },
        messages: ['Mmmmm, tasty!', 'Yum!', 'Eww, that was a little tough...', 'Stay on land or come back with friends!'],
        armorMod: 2,
        hpMod: 20,
        weaponMod: 2,
        respawnDelay: 60000
    },

    m88nhermie: {
        level: 1,
        drops: {
            m88nmap: 10,
            GOLD: 10
        },
        respawnDelay: 20000,
    },

    m88nmrcrab: {
        level: 2,
        drops: {
            flask: 20,
            hardwallet: 1,
            GOLD: 30,
            GOLD2: 25,
            GOLD3: 10,
            loopring: 5
        },
        xp: 22
    },

    roachclip: {
        level: 3,
        drops: {
            flask: 10,
            GOLD: 20,
            GOLD2: 20,
            GOLD3: 20,
            loopring: 10
        },
        xp: 222
    },

    m88nboner: {
        level: 55,
        drops: {
            m88nskeletonkey: 100
        },
        messages: ['Boner kill!', 'I thought I was already dead...', 'Cant touch this...', 'I have a bone to pick with you...', 'Stay away or come back with friends!'],
        armorMod: 1,
        hpMod: 5,
        weaponMod: 0.8,
        respawnDelay: 1000000,
        xp: 69420
    },

    m88nnightmaremonsterb: {
        level: 3,
        drops: {
            m88ndarkcloud: 10,
            m88ndreamcloud: 2,
            m88nbone: 2,
            taikoboost: 5,
            GOLD: 10,
            loopring: 1
        },
    },

    m88nnightmaremonstery: {
        level: 6,
        drops: {
            m88ndarkcloud: 20,
            m88ndreamcloud: 4,
            m88nbone: 4,
            taikoboost: 5,
            GOLD: 10,
            loopring: 2
        },
    },

    m88nnightmaremonsterg: {
        level: 9,
        drops: {
            m88ndarkcloud: 25,
            m88ndreamcloud: 10,
            m88nsunshine: 5,
            m88nbone: 6,
            taikoboost: 5,
            GOLD: 10,
            GOLD2: 10,
            loopring: 3
        },
    },

    m88nnightmaremonstera: {
        level: 12,
        drops: {
            m88nsunshine: 15,
            m88nbone: 8,
            taikoboost: 10,
            GOLD: 10,
            GOLD2: 10,
            loopring: 4
        },
    },

    m88nnightmaremonsterv: {
        level: 15,
        drops: {
            m88nbone: 20,
            taikoboost: 10,
            GOLD: 10,
            GOLD2: 10,
            GOLD3: 10,
            loopring: 5
        },
    },

    m88nnightmaremonsterp: {
        level: 18,
        drops: {
            taikoboost: 15,
            GOLD: 10,
            GOLD2: 10,
            GOLD3: 20,
            loopring: 5
        },
    },

    m88nshortsqueeze: {
        level: 35,
        drops: {
            m88ndrsgme: 1,
            m88nmap: 5,
            wood: 30,
            GOLD2: 20,
            GOLD3: 10,
            GOLD4: 5,
            loopring: 10
        },
    },

    m88nconepooper: {
        level: 25,
        drops: {
            m88ngoldenpoo: 1,
            m88nmap: 5,
            wood: 20,
            GOLD2: 10,
            GOLD3: 5,
            loopring: 10
        },
    },

    m88nfishlips: {
        level: 11,
        drops: {
            GOLD5: 50,
        },
        //messages: ['Darkness shall embrance you!', 'Your doom is woven', 'Fear binds you', 'Your end is spun', 'The old world beckons you'],
        armorMod: 1,
        hpMod: 3,
        weaponMod: 0.8,
        respawnDelay: 90000
    },

    m88nsushi: {
        level: 7,
        drops: {
            GOLD5: 25,
        },
        //messages: ['Darkness shall embrance you!', 'Your doom is woven', 'Fear binds you', 'Your end is spun', 'The old world beckons you'],
        armorMod: 1,
        hpMod: 3,
        weaponMod: 0.8,
        respawnDelay: 60000
    },

    m88nsashimi: {
        level: 8,
        drops: {
            GOLD5: 25,
        },
        //messages: ['Darkness shall embrance you!', 'Your doom is woven', 'Fear binds you', 'Your end is spun', 'The old world beckons you'],
        armorMod: 1,
        hpMod: 3,
        weaponMod: 0.8,
        respawnDelay: 60000
    },

    m88nthewarden: {
        level: 88,
        drops: {
            GOLD5: 88,
            m88ndrsgme: 1,
        },
        messages: ['Choose peace!', 'We do not need to fight...', 'There is another way...', 'Why cant we be friends...', 'This whole world is a puzzle...'],
        armorMod: 0.8,
        hpMod: 8,
        weaponMod: 0.8,
        respawnDelay: 88888
    },

    m88nkennyclown: {
        level: 69,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        drops: {
            m88ndrsgme: 50,
        },
        messages: ['I wish I never shorted that stupid stock!'],
        respawnDelay: 300000 //five minutes
    },

    m88nnancyclown: {
        level: 69,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        drops: {
            m88ndrsgme: 25,
        },
        messages: ['Buy the dip!'],
        respawnDelay: 120000 //two minutes
    },

    m88njimmyclown: {
        level: 69,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        drops: {
            m88ndrsgme: 25,
        },
        messages: ['Where should I put this banana?'],
        respawnDelay: 120000 //two minutes
    },

    m88nheadlessonesie: {
        level: 40,
        drops: {
            manacrystal: 14,
            candycorntreat: 11,
            lollitreat: 7,
            chocolatetreat: 4,
            candytreat: 3,
            headstonetrick: 11,
            spidertrick: 7,
            skullnbonestrick: 4,
            m88ngem: 3
        },
        respawnDelay: 500000,
    },

    m88nheadlessskeleton: {
        level: 30,
        drops: {
            manacrystal: 14,
            candycorntreat: 11,
            lollitreat: 7,
            chocolatetreat: 4,
            candytreat: 3,
            headstonetrick: 11,
            spidertrick: 7,
            skullnbonestrick: 4,
            m88ndirt: 3
        },
        respawnDelay: 400000,
    },

    m88nghostpumpkin: {
        level: 5,
        drops: {
            manacrystal: 12,
            candycorntreat: 7,
            lollitreat: 4,
            chocolatetreat: 2,
            candytreat: 1,
            headstonetrick: 7,
            spidertrick: 4,
            skullnbonestrick: 1
        },
        respawnDelay: 20000,
    },

    m88nturkey: {
        level: 8,
        drops: {
            wood: 25,
            m88nturkeyleg: 11,
            m88nturkeydinner: 8,
            m88nturkeyfeather: 5
        },
        respawnDelay: 30000,
    },

    m88nicecrab: {
        level: 20,
        drops: {
            manacrystal: 50,
            GOLD2: 10,
            m88ndirt: 1,
            m88ngem: 1,
            GOLD4: 1
        },
        respawnDelay: 60000,
    },

    m88nelf: {
        level: 4,
        drops: {
            manacrystal: 25,
            GOLD2: 10,
            m88ndirt: 1,
            m88ngem: 1,
            GOLD4: 1
        },
        respawnDelay: 40000,
    },

    m88nelf2: {
        level: 5,
        drops: {
            manacrystal: 25,
            GOLD2: 10,
            m88ndirt: 1,
            m88ngem: 1,
            GOLD4: 1
        },
        respawnDelay: 40000,
    },

    m88nsnowmobile: {
        level: 40,
        drops: {
            manacrystal: 75,
            GOLD2: 10,
            m88ndirt: 1,
            m88ngem: 1,
            GOLD4: 1
        },
        respawnDelay: 40000,
    },

    m88nmine: {
        level: 69,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        drops: {
            m88ndirt: 99,
            m88ngem: 1,
        },
        respawnDelay: 4000000 //one hour
    },

    m88ncow: {
        level: 69,
        friendly: true, //not actually friendly, just AoE immune
        hp: 10,
        drops: {
            MILK1: 75,
            m88nsteak: 25,
        },
        respawnDelay: 900000 //fifteen minutes
    },

    m88ntree: {
        level: 69,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        drops: {
            m88nsticks: 99,
            wood: 1,
        },
        respawnDelay: 900000 //fifteen minutes
    },

    m88npinataballoons: {
        level: 111,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        drops: {
            m88nmap: 5,
            movieglasses: 1,
            battery: 1,
            gameboy: 1,
            hardwallet: 1,
            m88npeel: 1,
            m88ndungbeetle: 1,
            m88nfly: 1,
            m88njunebug: 1,
            m88nstickbug: 1,
            m88ndiamondnecklace: 1,
            m88ndiamondring: 1,
            m88ngoldearrings: 1,
            m88ngoldtiara: 1,
            m88ndinnerbell: 1,
            m88nsteak: 1,
            m88nclover: 1,
            m88nmail: 1,
            m88nshovel: 1,
            m88nwatercan: 1,
            m88nseeds: 1,
            m88npotato: 1,
            m88npackage: 1,
            m88nsalad: 1,
            m88nblueprint: 1,
            m88nhardhat: 1,
            m88nrose: 1,
            m88nworkgloves: 1,
            m88nbrewski: 1,
            m88npie: 1,
            m88nworm: 1,
            m88nfastshoes: 1,
            m88nbrassknuckles: 1,
            m88ngrenade: 1,
            m88nkevlararmor: 1,
            m88nwizardshat: 1,
            m88ndirt: 10,
            m88ngem: 20,
            GOLD4: 10,
            GOLD5: 10,
        },
        respawnDelay: 4000000 //one hour
    },

    m88nbabymonkey: {
        level: 1,
        friendly: true
    },

    m88nbabychimp: {
        level: 1,
        friendly: true
    },

    m88nbabyape: {
        level: 1,
        friendly: true
    },

    m88nbabypenguin: {
        level: 1,
        friendly: true
    },

    m88nbabyturtle: {
        level: 1,
        friendly: true
    },

    m88ndaddyape: {
        level: 1,
        friendly: true
    },

    m88ndaddypenguin: {
        level: 1,
        friendly: true
    },

    m88ndaddyturtle: {
        level: 1,
        friendly: true
    },

    m88nparrot: {
        level: 1,
        friendly: true
    },

    m88ntoucan: {
        level: 1,
        friendly: true
    },

    m88nseal: {
        level: 1,
        friendly: true
    },

    m88nwalrus: {
        level: 1,
        friendly: true
    },

    m88nbunnyblue: {
        level: 1,
        friendly: true
    },

    m88nbunnypink: {
        level: 1,
        friendly: true
    },

    m88nbunnyyellow: {
        level: 1,
        friendly: true
    },

    m88nbunnywhite: {
        level: 1,
        friendly: true
    },

    m88nkittentabby: {
        level: 1,
        friendly: true
    },

    m88npuppyyorkie: {
        level: 1,
        friendly: true
    },

    m88ntigercub: {
        level: 1,
        friendly: true
    },

    m88nbabyduck: {
        level: 1,
        friendly: true
    },

    m88nbabypig: {
        level: 1,
        friendly: true
    },

    m88nflamingo: {
        level: 1,
        friendly: true
    },

    m88nfrog: {
        level: 1,
        friendly: true
    },

    m88ngoat: {
        level: 1,
        friendly: true
    },

    m88nswan: {
        level: 1,
        friendly: true
    },

    m88nvulture: {
        level: 1,
        friendly: true
    },

    m88nmagiccarpet: {
        level: 1,
        friendly: true
    },

    m88ndinor: {
        level: 1,
        friendly: true
    },
    
    m88ndinow: {
        level: 1,
        friendly: true
    },

    m88ndinob: {
        level: 1,
        friendly: true
    },

    m88ndinog: {
        level: 1,
        friendly: true
    },

    m88nlion: {
        level: 1,
        friendly: true
    },

    m88ntiger: {
        level: 1,
        friendly: true
    },

    m88ncamel: {
        level: 1,
        friendly: true
    },

    m88nflybutterfly: {
        level: 1,
        friendly: true
    },

    m88ndaddybearbrown: {
        level: 1,
        friendly: true
    },

    m88nfishy: {
        level: 1,
        friendly: true
    },

    m88nfishyb: {
        level: 1,
        friendly: true
    },

    m88nfishyc: {
        level: 1,
        friendly: true
    },

    m88nfishyd: {
        level: 1,
        friendly: true
    },

    m88nfishye: {
        level: 1,
        friendly: true
    },
    
    m88nfishyf: {
        level: 1,
        friendly: true
    },

    m88nfishyg: {
        level: 1,
        friendly: true
    },

    m88nfishyh: {
        level: 1,
        friendly: true
    },

    m88nbabyyoda1: {
        level: 1,
        friendly: true
    },

    m88nbabyyoda2: {
        level: 1,
        friendly: true
    },

    m88nreindeer: {
        level: 1,
        friendly: true
    },

    //m88n Mob Nexans
    nexan1: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan2: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan3: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan6: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan7: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan8: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan9: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan10: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan21: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan22: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan23: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan24: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan25: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan26: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan27: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan30: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88njeeves: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan49: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan50: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan51: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan52: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan53: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    nexan54: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmermaid1: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmermaid2: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmermaid3: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmermaid4: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmermaid5: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmerman1: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmerman2: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmerman3: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmerman4: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    m88nmerman5: {
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
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
        level: 25,
        drops: {
            cagedrat: 100,     
        },
        messages: ['I dont want to grow up!'],
        armorMod: 1.1,
        weaponMod: 1.6,
        hpMod: 2.0,
        xp: 12000,  
        respawnDelay: 100000
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
    GOLD4: {
        collectable: true,
        inventoryDescription: "Gold",
        collectItem: Types.Entities.GOLD,
        collectAmount: 100
    },
    GOLD5: {
        collectable: true,
        inventoryDescription: "Gold",
        collectItem: Types.Entities.GOLD,
        collectAmount: 300
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
    },
    wood: {
        collectable: true,
        inventoryDescription: "Wood",
        respawnDelay: 150000
    },
    ore: {
        collectable: true,
        inventoryDescription: "Iron ore",
        respawnDelay: 150000
    },
    manacrystal: {
        collectable: true,
        inventoryDescription: "Crystal",
        respawnDelay: 150000
    },
    m88negg1: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "easterEggs",
            duration: 180000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 42069741,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NSAGE, 20000);
        }
    },
    m88negg2: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "easterEggs",
            duration: 180000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 42069741,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NSAGE2, 20000);
        }
    },
    m88negg3: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "easterEggs",
            duration: 180000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 42069741,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NSAGE3, 20000);
        }
    },
    m88negg4: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "easterEggs",
            duration: 180000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 42069741,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NSAGE4, 20000);
        }
    },
    m88negg5: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "easterEggs",
            duration: 180000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 42069741,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NSAGE5, 20000);
        }
    },
    m88negg6: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "easterEggs",
            duration: 180000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 42069741,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NSAGE6, 20000);
        }
    },
    m88negg7: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "easterEggs",
            duration: 180000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 42069741,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NSAGE7, 20000);
        }
    },
    m88nfabergeegg: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "easterEggs",
            duration: 180000
        },
        inventoryDescription: "Golden Faberge Egg",
        respawnDelay: 42069741,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NSAGE7, 20000);
        }
    },
    m88nlamp: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "lamp",
            duration: 180000
        },
        inventoryDescription: "Mysterious Lamp",
        respawnDelay: 42069741,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NGENIE, 15000);
        }
    },
    m88nprizes: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "pinata",
            duration: 5000
        },
        inventoryDescription: "Mysterious Prizes",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseMob(Types.Entities.M88NPINATABALLOONS);
        }
    },
    m88nbag: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "bags",
            duration: 5000
        },
        inventoryDescription: "Brown Bag",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.M88NDIRT);
        }
    },
    m88nvipbag: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "bags",
            duration: 5000
        },
        inventoryDescription: "Black Bag",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.M88NTICKET);
        }
    },
    m88ngoldbag: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "bags",
            duration: 5000
        },
        inventoryDescription: "Golden Bag",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.M88NGOLDENTICKET);
        }
    },
    m88ngembag: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "bags",
            duration: 5000
        },
        inventoryDescription: "Gem Bag",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.M88NGEM);
        }
    },
    m88nluckybag: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "bags",
            duration: 5000
        },
        inventoryDescription: "Lucky Bag",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.M88NTACO);
        }
    },
    m88nmedic: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "medic",
            duration: 5000
        },
        inventoryDescription: "Medic Bag",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.FIRSTAIDKIT);
        }
    },
    m88nmedic2: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "medic",
            duration: 5000
        },
        inventoryDescription: "Medic Bag 2",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.STRANGEYELLOWLIQUID);
        }
    },
    m88nruck: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "ruck",
            duration: 5000
        },
        inventoryDescription: "Ruck Sack",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.M88NKEVLARARMOR);
        }
    },
    m88nruck2: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "ruck",
            duration: 5000
        },
        inventoryDescription: "Ruck Sack 2",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.M88NBRASSKNUCKLES);
        }
    },
    m88nruck3: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "ruck",
            duration: 5000
        },
        inventoryDescription: "Ruck Sack 3",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseItem(Types.Entities.M88NGRENADE);
        }
    },
    m88ndufflebag: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "duffle bag",
            duration: 60000
        },
        inventoryDescription: "Duffle Bag",
        respawnDelay: 9900000,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NMOBILEBARTENDER, 30000);
        }
    },
    m88nmimosa: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "dropPotions",
            duration: 60000
        },
        inventoryDescription: "Mimosa",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.GOLD, 20000);
        }
    },
    m88nchampagne: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "dropPotions",
            duration: 60000
        },
        inventoryDescription: "Glass of Champagne",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.GOLD2, 20000);
        }
    },
    m88nchampagnebottle: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "dropPotions",
            duration: 60000
        },
        inventoryDescription: "Bottle of Champagne",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.GOLD3, 20000);
        }
    },
    m88nshine: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "specialdropPotions",
            duration: 300000
        },
        inventoryDescription: "Shot of m88nshine",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.M88NGEM, 10000);
        }
    },
    m88ndirtymartini: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "specialdropPotions",
            duration: 300000
        },
        inventoryDescription: "Dirty Martini",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.M88NDIRT, 10000);
        }
    },
    m88nmanamaitai: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "dropPotions",
            duration: 60000
        },
        inventoryDescription: "Mana Mai Tai",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.MANACRYSTAL, 10000);
        }
    },
    m88nparadisehurricane: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "dropPotions",
            duration: 60000
        },
        inventoryDescription: "Paradise Hurricane",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.WOOD, 10000);
        }
    },
    m88nnexussangria: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "dropPotions",
            duration: 60000
        },
        inventoryDescription: "Nexus Sangria",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.ORE, 10000);
        }
    },
    m88nsunsetdaiquiri: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpPotions",
            duration: 360000
        },
        inventoryDescription: "Sunset Daiquiri",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 3, 180000);
        }
    },
    m88nhelioislandicedtea: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpPotions",
            duration: 360000
        },
        inventoryDescription: "Helio Island Iced Tea",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 4, 180000);
        }
    },
    m88nmermaidmojito: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpPotions",
            duration: 180000
        },
        inventoryDescription: "Mermaid Mojito",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 5, 180000);
        }
    },
    m88nwhiskey: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "superspecialdropPotions",
            duration: 600000
        },
        inventoryDescription: "The Good Whiskey",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.M88NDRSGME, 10000);
        }
    },
    m88nfries: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpPotions",
            duration: 60000
        },
        inventoryDescription: "French Fries",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 2, 30000);
        }
    },
    m88ntaco: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpPotions",
            duration: 120000
        },
        inventoryDescription: "Taco Tuesday!",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 2, 60000);
        }
    },
    m88nhotdog: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpPotions",
            duration: 180000
        },
        inventoryDescription: "Loaded Hot Dog",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 2, 90000);
        }
    },
    m88nburger: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpPotions",
            duration: 240000
        },
        inventoryDescription: "Double Burger",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 2, 120000);
        }
    },
    m88npizza: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpPotions",
            duration: 360000
        },
        inventoryDescription: "Slice of Pizza",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 2, 180000);
        }
    },
    m88nsalad: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpPotions",
            duration: 360000
        },
        inventoryDescription: "Big Salad",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 2, 300000);
        }
    },
    candycorntreat: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpTreat",
            duration: 20000
        },
        inventoryDescription: "Candy Corn",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 2, 20000);
        }
    },
    candytreat: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpTreatt",
            duration: 20000
        },
        inventoryDescription: "Sour Candy",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('xp', 4, 20000);
        }
    },
    lollitreat: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpTreattt",
            duration: 20000
        },
        inventoryDescription: "Protection Pop",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('meleeDamageTaken', 0.5, 20000);
        }
    },
    chocolatetreat: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpTreatttt",
            duration: 20000
        },
        inventoryDescription: "Freaky Fudge",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('meleeDamageDealt', 2, 20000);
        }
    },
    spidertrick: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "moveTrick",
            duration: 10000
        },
        inventoryDescription: "Spider!",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('moveSpeed', 10, 10000);
        }
    },
    headstonetrick: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "moveTrickk",
            duration: 10000
        },
        inventoryDescription: "Here Lies You",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('moveSpeed', 1, 10000);
        }
    },
    skullnbonestrick: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "mobTrick",
            duration: 60000
        },
        inventoryDescription: "Do Not Open",
        respawnDelay: 60000,
        onConsume: function(player) {
            player.releaseMob(Types.Entities.M88NBONER);
        }
    },
    candybucket: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "xpTreatttt",
            duration: 20000
        },
        inventoryDescription: "Candy Bucket",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('meleeDamageDealt', 10, 20000);
        }
    },
    m88nturkeyleg: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "rangedDamageDealt",
            duration: 90000
        },
        inventoryDescription: "Turkey Leg",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('rangedDamageDealt', 2, 20000);
        }
    },
    m88nturkeydinner: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "specialdropPotions",
            duration: 300000
        },
        inventoryDescription: "Turkey Dinner",
        onConsume: function(player){
            player.setDropOverride(Types.Entities.M88NTURKEYLEG, 10000);
        }
    },
    m88nturkeyfeather: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "mobDrop",
            duration: 180000
        },
        inventoryDescription: "Magical Turkey Feather",
        respawnDelay: 90000,
        onConsume: function(player) {
            player.releaseMob(Types.Entities.M88NTURKEY);
        }
    },
    m88nbananapie: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "rangedDamageDealt",
            duration: 90000
        },
        inventoryDescription: "Banana Cream Pie",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('rangedDamageDealt', 10, 20000);
        }
    },
    m88ncherrypie: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "rangedDamageDealt",
            duration: 90000
        },
        inventoryDescription: "Cherry Cream Pie",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('rangedDamageDealt', 10, 20000);
        }
    },
    m88nlemonpie: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "rangedDamageDealt",
            duration: 90000
        },
        inventoryDescription: "Lemon Cream Pie",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('rangedDamageDealt', 10, 20000);
        }
    },
    m88npumpkinpie: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "rangedDamageDealt",
            duration: 90000
        },
        inventoryDescription: "Pumpkin Cream Pie",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('rangedDamageDealt', 10, 20000);
        }
    },
    m88nfastshoes: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "moveSpeed",
            duration: 60000
        },
        inventoryDescription: "Fast Shoes",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('moveSpeed', 2, 30000);
        }
    },
    m88nslowshoes: {
        collectable: true,
        //consumable: true,
        cooldown: {
            group: "immunity",
            duration: 180000
        },
        inventoryDescription: "Slow Shoes",
        onConsume: function(player){
            player.startInvincibility();
        }
    },
    m88nwizardshat: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "stealth",
            duration: 60000
        },
        inventoryDescription: "Wizard's Hat",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('stealth', 2, 30000);
        }
    },
    m88nbrassknuckles: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "meleeDamageDealt",
            duration: 90000
        },
        inventoryDescription: "Brass Knuckles",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('meleeDamageDealt', 5, 30000);
        }
    },
    m88nkevlararmor: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "meleeDamageTaken",
            duration: 90000
        },
        inventoryDescription: "Kevlar Armor",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('meleeDamageTaken', 0.5, 30000);
        }
    },
    m88ngrenade: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "rangedDamageDealt",
            duration: 90000
        },
        inventoryDescription: "Grenade",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('rangedDamageDealt', 5, 30000);
        }
    },
    m88ngem: {
        collectable: true,
        inventoryDescription: "m88n gems",
        collectItem: Types.Entities.M88NGEM,
        collectAmount: 1,
        respawnDelay: 42069741
    },
    m88ndirt: {
        collectable: true,
        inventoryDescription: "m88n dirt",
        respawnDelay: 4000000
    },
    m88nplainbanana: {
        collectable: true,
        //consumable: true,
        inventoryDescription: "Special Banana",
        collectItem: Types.Entities.M88NGEM,
        collectAmount: 10,
        respawnDelay: 42069741
    },
    m88nchocolatebanana: {
        collectable: true,
        //consumable: true,
        inventoryDescription: "Special Banana",
        collectItem: Types.Entities.M88NGEM,
        collectAmount: 20,
        respawnDelay: 42069741
    },
    m88nchocolatesprinklebanana: {
        collectable: true,
        //consumable: true,
        inventoryDescription: "Special Banana",
        collectItem: Types.Entities.M88NGEM,
        collectAmount: 50,
        respawnDelay: 42069741
    },
    m88nchocolatewhippedbanana: {
        collectable: true,
        //consumable: true,
        inventoryDescription: "Special Banana",
        collectItem: Types.Entities.M88NGEM,
        collectAmount: 100,
        respawnDelay: 42069741
    },
    m88nm88nbanana: {
        collectable: true,
        //consumable: true,
        inventoryDescription: "Special Banana",
        collectItem: Types.Entities.M88NGEM,
        collectAmount: 500,
        respawnDelay: 42069741
    },
    m88nchocolatenutsbanana: {
        collectable: true,
        //consumable: true,
        inventoryDescription: "Special Banana",
        collectItem: Types.Entities.GOLD,
        collectAmount: 50000,
        respawnDelay: 42069741
    },
    m88npicklebanana: {
        collectable: true,
        //consumable: true,
        inventoryDescription: "Special Banana",
        collectItem: Types.Entities.GOLD,
        collectAmount: 500000,
        respawnDelay: 42069741
    },
    m88nmoneybags: {
        //collectable: true,
        //inventoryDescription: "Money Bags",
        respawnDelay: 42069741
    },
    m88ngoldenpoo: {
        //collectable: true,
        //inventoryDescription: "Golden Poo",
        respawnDelay: 42069741
    },
    m88nholyhandgrenade: {
        collectable: true,
        consumable: true,
        respawnDelay: 42069741,
        cooldown: {
            group: "rangedDamageDealt",
            duration: 60000
        },
        inventoryDescription: "Holy Hand Grenade",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('rangedDamageDealt', 20, 60000);
        }
    },
    m88ngoldknuckles: {
        collectable: true,
        consumable: true,
        respawnDelay: 42069741,
        cooldown: {
            group: "meleeDamageDealt",
            duration: 60000
        },
        inventoryDescription: "Gold Knuckles",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('meleeDamageDealt', 20, 60000);
        }
    },
    m88ngoldenchalis: {
        collectable: true,
        consumable: true,
        respawnDelay: 42069741,
        cooldown: {
            group: "meleeDamageDealt",
            duration: 60000
        },
        inventoryDescription: "Golden Chalis",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('meleeDamageDealt', 30, 60000);
        }
    },
    m88ndrsgme: {
        collectable: true,
        inventoryDescription: "DRS'd GME",
        respawnDelay: 42069741
    },
    m88ndrsbook: {
        collectable: true,
        inventoryDescription: "DRS Book",
        respawnDelay: 42069741
    },
    bandaid: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "hpPotions",
            duration: 60000
        },
        inventoryDescription: "For minor cuts and scrapes",
        respawnDelay: 500000,
        onConsume: function(player){
            player.regenHealthBy(300);
        }
    },
    firstaidkit: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "hpPotions",
            duration: 60000
        },
        inventoryDescription: "Full first aid kit",
        respawnDelay: 1500000,
        onConsume: function(player){
            player.regenHealthBy(2400);
        }
    },
    cigarette: {
        respawnDelay: 9900000
    },
    cigarettepack: {
        respawnDelay: 9900000,
    },
    soap: {
        respawnDelay: 9900000,
    },
    gameboy: {
        collectable: true,
        inventoryDescription: "Gameboy",
        respawnDelay: 9900000
    },
    battery: {
        collectable: true,
        inventoryDescription: "Battery",
        respawnDelay: 9900000
    },
    hardwallet: {
        collectable: true,
        inventoryDescription: "Hard Wallet",
        respawnDelay: 9900000
    },
    movieglasses: {
        respawnDelay: 9900000
    },
    m88ncompass: {
        collectable: true,
        inventoryDescription: "Mysterious Compass",
        respawnDelay: 9900000
    },
    m88nbinoculars: {
        collectable: true,
        inventoryDescription: "Mysterious Binoculars",
        respawnDelay: 9900000
    },
    m88npeel: {
        collectable: true,
        inventoryDescription: "Banana Peel",
        respawnDelay: 9900000
    },
    m88nfly: {
        respawnDelay: 9900000
    },
    m88njunebug: {
        respawnDelay: 9900000
    },
    m88ndungbeetle: {
        respawnDelay: 9900000
    },
    m88nstickbug: {
        respawnDelay: 9900000
    },
    m88nsnail: {
        respawnDelay: 9900000
    },
    m88nbutterfly: {
        respawnDelay: 9900000
    },
    m88ndiamondnecklace: {
        respawnDelay: 9900000
    },
    m88ndiamondring: {
        respawnDelay: 9900000
    },
    m88ngoldearrings: {
        respawnDelay: 9900000
    },
    m88nclover: {
        respawnDelay: 9900000
    },
    m88nluckyclover: {
        respawnDelay: 9900000
    },
    m88nmail: {
        respawnDelay: 9900000
    },
    m88npackage: {
        respawnDelay: 9900000
    },
    m88nsteak: {
        collectable: true,
        inventoryDescription: "Steak",
        respawnDelay: 9900000
    },
    m88npotato: {
        collectable: true,
        inventoryDescription: "Potato",
        respawnDelay: 9900000
    },
    m88nbrewski: {
        respawnDelay: 9900000
    },
    m88npie: {
        respawnDelay: 9900000
    },
    m88nseeds: {
        collectable: true,
        inventoryDescription: "Sack of Seeds",
        respawnDelay: 9900000
    },
    m88nsack: {
        respawnDelay: 9900000
    },
    m88nshovel: {
        collectable: true,
        inventoryDescription: "Shovel",
        respawnDelay: 9900000
    },
    m88nwatercan: {
        collectable: true,
        inventoryDescription: "Water Can",
        respawnDelay: 9900000
    },
    m88nticket: {
        respawnDelay: 9900000
    },
    m88ngoldenticket: {
        respawnDelay: 9900000
    },
    m88nworm: {
        collectable: true,
        inventoryDescription: "Worm",
        respawnDelay: 9900000
    },
    m88nrose: {
        collectable: true,
        inventoryDescription: "Red Rose",
        respawnDelay: 9900000
    },
    m88nhardhat: {
        collectable: true,
        inventoryDescription: "Hard Hat",
        respawnDelay: 9900000
    },
    m88nworkgloves: {
        collectable: true,
        inventoryDescription: "Work Glove",
        respawnDelay: 9900000
    },
    m88nblueprint: {
        collectable: true,
        inventoryDescription: "Blueprint",
        respawnDelay: 9900000
    },
    m88ntentacle: {
        collectable: true,
        inventoryDescription: "Octopussy Tentacle",
        respawnDelay: 9900000
    },
    m88nskeletonkey: {
        collectable: true,
        inventoryDescription: "Skeleton Key",
        respawnDelay: 9900000
    },
    strangeyellowliquid: {
        collectable: true,
        consumable: true,
        respawnDelay: 5500000,
        cooldown: {
            group: "immunity",
            duration: 60000
        },
        inventoryDescription: "Strange Yellow Liquid",
        onConsume: function(player){
            player.startInvincibility();
        }
    },

    m88nsticks: {
        collectable: true,
        inventoryDescription: "Sticks",
        respawnDelay: 300000
    },

    m88nturnip: {
        collectable: true,
        inventoryDescription: "Turnip",
        respawnDelay: 360000
    },

    m88ncauliflower: {
        collectable: true,
        inventoryDescription: "Cauliflower",
        respawnDelay: 300000
    },

    m88nbroccoli: {
        collectable: true,
        inventoryDescription: "Broccoli",
        respawnDelay: 240000
    },

    m88nlettuce: {
        collectable: true,
        inventoryDescription: "Lettuce",
        respawnDelay: 180000
    },

    m88ntomato: {
        collectable: true,
        inventoryDescription: "Tomato",
        respawnDelay: 120000
    },

    m88ncarrot: {
        collectable: true,
        inventoryDescription: "Carrot",
        respawnDelay: 60000
    },

    // Projectiles
    shortarrow: {
        collectable: true,
        consumable: false,
        inventoryDescription: "Short range arrow (damage: high, range: low)",
        damage: 1.2,
        range: 6
    },
    mediumarrow: {
        collectable: true,
        consumable: false,
        inventoryDescription: "Basic arrow (damage: medium, range: medium)",
        damage: 1,
        range: 9
    },
    longarrow: {
        collectable: true,
        consumable: false,
        inventoryDescription: "Long range arrow (damage: low, range: high)",
        damage: 0.8,
        range: 12
    },

    shortbullet: {
        collectable: true,
        consumable: false,
        inventoryDescription: "Short range bullet (damage: high, range: low)",
        damage: 1.2,
        range: 6
    },
    mediumbullet: {
        collectable: true,
        consumable: false,
        inventoryDescription: "Basic bullet (damage: medium, range: medium)",
        damage: 1,
        range: 9
    },
    longbullet: {
        collectable: true,
        consumable: false,
        inventoryDescription: "Long range bullet (damage: low, range: high)",
        damage: 0.8,
        range: 12
    },

    shortmana: {
        collectable: true,
        consumable: false,
        inventoryDescription: "Short range bottled mana (damage: high, range: low)",
        damage: 1.2,
        range: 6
    },
    mediummana: {
        collectable: true,
        consumable: false,
        inventoryDescription: "Bottled mana (damage: medium, range: medium)",
        damage: 1,
        range: 9
    },
    longmana: {
        collectable: true,
        consumable: false,
        inventoryDescription: "Long range bottled mana (damage: low, range: high)",
        damage: 0.8,
        range: 12
    },
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

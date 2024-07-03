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
        redpacket: true,
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
            burger: 50,
            GOLD: 3
        },
    },

    ROBITSE5: {
        level: 10,
        drops: {
            burger: 10,
            GOLD: 10
        },
    },

    ROBITSE6: {
        level: 15,
        drops: {
            burger: 50,
            GOLD: 50
        },
    },

    ROBITSE7: {
        level: 10,
        drops: {
            burger: 50,
            GOLD: 50
        },
    },

    ROBITSE8: {
        level: 15,
        drops: {
            burger: 50,
            GOLD: 50
        },
    },

    ROBITSE9: {
        level: 13,
        drops: {
            burger: 50,
            GOLD: 50,
        },
    },

    ROBITSE10: {
        level: 5,
        drops: {
            burger: 50,
            GOLD: 50
        },
    },

    INFERNOID: {
        level: 3,
        drops: {
            burger: 50,
            GOLD: 50,
            GOLD2: 10,
            GOLD3: 2,
        },
        messages: ['I will beepin destroy you!'],
        armorMod: 2.2,
        xp: 18000,
        respawnDelay: 180000
    },

     COLOSSUS: {
        level: 30,
        drops: {
            burger: 50,
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
            burger: 40,
            GOLD: 40,
            GOLD2: 10,
            GOLD3: 2,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1
        },
        messages: ['Shinu!'],
        armorMod: 2.2,
        xp: 18000,
        redpacket: true,
        respawnDelay: 180000
    },
    //m88n's Mobs
    balloondogb: {
        level: 2,
        drops: {
            burger: 50,
            GOLD: 20
        },
    },

    balloondogy: {
        level: 4,
        drops: {
            burger: 50,
            GOLD: 25
        },
    },

    balloondogg: {
        level: 6,
        drops: {
            m88nmap: 3,
            burger: 47,
            GOLD: 30
        },
    },

    balloondoga: {
        level: 8,
        drops: {
            m88nmap: 3,
            burger: 25,
            GOLD: 47
        },
    },

    balloondogv: {
        level: 10,
        drops: {
            m88nmap: 7,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            burger: 25,
            GOLD: 32,
            GOLD2: 10
        },
    },

    balloondogp: {
        level: 2,
        drops: {
            m88nmap: 7,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            burger: 25,
            GOLD: 22,
            GOLD2: 25
        },
    },

    balloonhotdogr: {
        level: 20,
        drops: {
            m88nmap: 8,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            burger: 5,
            GOLD2: 20,
            GOLD3: 64
        },
    },

    balloongiraffeo: {
        level: 50,
        drops: {
            m88nmap: 15,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            burger: 5,
            GOLD3: 75
        },
    },

    m88nbigchungus: {
        level: 55,
        drops: {
            m88nmap: 30,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            m88negg3: 1,
            m88negg4: 1,
            m88negg5: 1,
            m88negg6: 1,
            burger: 15,
            GOLD3: 45
        },
        messages: ['Mmmmm, Easter Eggs!', 'O Doyle Rules!', 'Cant touch this...', 'Stay away or come back with friends!'],
        armorMod: 1,
        hpMod: 5,
        weaponMod: 0.8,
        respawnDelay: 1000000,
        xp: 69420,
        redpacket: true
    },

    m88noctopussy: {
        level: 69,
        drops: {
            m88nmap: 69,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            m88nseeds: 1,
            m88npotato: 1,
            m88nmail: 1,
            m88nworm: 1,
            m88ngem: 1,
            gameboy: 5,
            battery: 3,
            hardwallet: 2,
            movieglasses: 1,
            m88ntentacle: 1,
            GOLD3: 10
        },
        messages: ['Hahaha, no chance!', 'You should stay out of the ocean...', 'Why are you wasting my time?', 'Stay away or come back with friends!'],
        armorMod: 1,
        hpMod: 5,
        weaponMod: 0.8,
        respawnDelay: 420000,
        xp: 69420
    },

    sharkboss: {
        level: 88,
        drops: {
            m88nmap: 30,
            m88nsteak: 1,
            m88nmail: 1,
            m88nshovel: 1,
            m88nseeds: 1,
            m88npotato: 1,
            m88nmail: 1,
            m88nworm: 1,
            m88negg1: 1,
            m88negg2: 1,
            burger: 10,
            m88ngem: 1,
            GOLD3: 35,
            GOLD4: 1,
            GOLD5: 1,
        },
        messages: ['Mmmmm, tasty!', 'Yum!', 'Eww, that was a little tough...', 'Stay on land or come back with friends!'],
        armorMod: 1,
        hpMod: 6,
        weaponMod: 2,
        respawnDelay: 30000,
        xp: 88000
    },

    m88nhermie: {
        level: 1,
        drops: {
            flask: 40,
            burger: 10,
            firepotion: 5
        },
        respawnDelay: 10000,
    },

    m88nmrcrab: {
        level: 2,
        drops: {
            flask: 50,
            GOLD: 20,
            firepotion: 5
        }
    },

    roachclip: {
        level: 3,
        drops: {
            flask: 50,
            GOLD: 20,
            firepotion: 5
        }
    },

    m88nmine: {
        level: 1,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        xp: 4444,
        drops: {
            m88ndirt: 99,
            m88ngem: 1,
        },
        respawnDelay: 4000000 //one hour
    },

    m88npinataballoons: {
        level: 1,
        friendly: true, //not actually friendly, just AoE immune
        hp: 1,
        xp: 8888,
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
            m88nsteak: 1,
            m88nclover: 1,
            m88nmail: 1,
            m88nshovel: 1,
            m88nwatercan: 1,
            m88nseeds: 1,
            m88npotato: 1,
            m88npackage: 1,
            m88nsalad: 1,
            m88nsnail: 1,
            m88nblueprint: 1,
            m88nhardhat: 1,
            m88nrose: 1,
            m88nworkgloves: 1,
            m88nbrewski: 1,
            m88npie: 1,
            m88nsack: 1,
            m88nworm: 1,
            m88nfastshoes: 1,
            m88nbrassknuckles: 1,
            m88ngrenade: 1,
            m88nkevlararmor: 1,
            m88nwizardshat: 1,
            burger: 1,
            m88ndirt: 10,
            m88ngem: 20,
            GOLD3: 1,
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
            group: "immunity",
            duration: 180000
        },
        inventoryDescription: "Immunity Easter Egg",
        onConsume: function(player){
            player.startInvincibility();
        }
    },
    m88negg2: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "hpPotions",
            duration: 60000
        },
        inventoryDescription: "HP Easter Egg",
        onConsume: function(player){
            player.regenHealthBy(300);
        }
    },
    m88negg3: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "caged",
            duration: 60000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 1500000,
        onConsume: function(player) {
            player.releaseMob(Types.Entities.M88NBUNNYBLUE);
        }
    },
    m88negg4: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "caged",
            duration: 60000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 1500000,
        onConsume: function(player) {
            player.releaseMob(Types.Entities.M88NBUNNYPINK);
        }
    },
    m88negg5: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "caged",
            duration: 60000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 1500000,
        onConsume: function(player) {
            player.releaseMob(Types.Entities.M88NBUNNYYELLOW);
        }
    },
    m88negg6: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "caged",
            duration: 60000
        },
        inventoryDescription: "Special Easter Egg",
        respawnDelay: 1500000,
        onConsume: function(player) {
            player.releaseMob(Types.Entities.M88NBIGCHUNGUS);
        }
    },
    m88nfabergeegg: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "caged",
            duration: 60000
        },
        inventoryDescription: "Golden Faberge Egg",
        respawnDelay: 1500000,
        onConsume: function(player) {
            player.releaseMob(Types.Entities.M88NOCTOPUSSY);
        }
    },
    m88nlamp: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "caged",
            duration: 60000
        },
        inventoryDescription: "Mysterious Lamp",
        respawnDelay: 1500000,
        onConsume: function(player) {
            player.releaseNpc(Types.Entities.M88NGENIE, 10000);
        }
    },
    m88nprizes: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "caged",
            duration: 60000
        },
        inventoryDescription: "Mysterious Prizes",
        respawnDelay: 1500000,
        onConsume: function(player) {
            player.releaseMob(Types.Entities.M88NPINATABALLOONS);
        }
    },
    m88nfastshoes: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "moveSpeed",
            duration: 180000
        },
        inventoryDescription: "Fast Shoes",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('moveSpeed', 2, 20000);
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
            duration: 180000
        },
        inventoryDescription: "Wizard's Hat",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('stealth', 2, 20000);
        }
    },
    m88nbrassknuckles: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "meleeDamageDealt",
            duration: 180000
        },
        inventoryDescription: "Brass Knuckles",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('meleeDamageDealt', 5, 20000);
        }
    },
    m88nkevlararmor: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "meleeDamageTaken",
            duration: 180000
        },
        inventoryDescription: "Kevlar Armor",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('meleeDamageTaken', 0.5, 20000);
        }
    },
    m88ngrenade: {
        collectable: true,
        consumable: true,
        cooldown: {
            group: "rangedDamageDealt",
            duration: 180000
        },
        inventoryDescription: "Grenade",
        onConsume: function(player){
            player.playerClassModifiers.applyTemporaryModifierWithTimeout('rangedDamageDealt', 5, 20000);
        }
    },
    m88ngem: {
        collectable: true,
        inventoryDescription: "m88n gems",
        collectItem: Types.Entities.M88NGEM,
        collectAmount: 1,
        respawnDelay: 8800000
    },
    m88ndirt: {
        collectable: true,
        inventoryDescription: "m88n dirt",
        respawnDelay: 4000000
    },
    m88nmoneybags: {
        collectable: true,
        inventoryDescription: "Money Bags",
        respawnDelay: 8800000
    },
    m88ngoldenpoo: {
        collectable: true,
        inventoryDescription: "Golden Poo",
        respawnDelay: 8800000
    },
    m88ngoldenchalis: {
        collectable: true,
        consumable: true,
        respawnDelay: 8800000,
        cooldown: {
            group: "immunity",
            duration: 180000
        },
        inventoryDescription: "Golden Chalis",
        onConsume: function(player){
            player.startInvincibility();
        }
    },
    m88ndrsgme: {
        collectable: true,
        inventoryDescription: "DRS'd GME",
        respawnDelay: 8800000
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
            player.regenHealthBy(75);
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
            player.regenHealthBy(300);
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
        respawnDelay: 9900000,
    },
    battery: {
        respawnDelay: 9900000,
    },
    hardwallet: {
        respawnDelay: 9900000,
    },
    movieglasses: {
        respawnDelay: 9900000,
    },
    m88ncompass: {
        respawnDelay: 9900000
    },
    m88nbinoculars: {
        respawnDelay: 9900000
    },
    m88npeel: {
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
    m88nbutterfly: {
        respawnDelay: 9900000
    },
    m88nstickbug: {
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
        respawnDelay: 9900000
    },
    m88npotato: {
        respawnDelay: 9900000
    },
    m88nsalad: {
        respawnDelay: 9900000
    },
    m88nbrewski: {
        respawnDelay: 9900000
    },
    m88npie: {
        respawnDelay: 9900000
    },
    m88nseeds: {
        respawnDelay: 9900000
    },
    m88nsack: {
        respawnDelay: 9900000
    },
    m88nshovel: {
        respawnDelay: 9900000
    },
    m88nwatercan: {
        respawnDelay: 9900000
    },
    m88nticket: {
        respawnDelay: 9900000
    },
    m88ngoldenticket: {
        respawnDelay: 9900000
    },
    m88nworm: {
        respawnDelay: 9900000
    },
    m88nsnail: {
        respawnDelay: 9900000
    },
    m88ntentacle: {
        respawnDelay: 9900000
    },
    strangeyellowliquid: {
        collectable: true,
        consumable: true,
        respawnDelay: 5500000,
        cooldown: {
            group: "immunity",
            duration: 180000
        },
        inventoryDescription: "Strange Yellow Liquid",
        onConsume: function(player){
            player.startInvincibility();
        }
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
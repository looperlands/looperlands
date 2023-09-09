
var Types = require("../../shared/js/gametypes");

var Properties = {
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
        weaponMod: 1.5, //bgger mod cause attack rate is 50% slower
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
            potion: 95,
        },
    },

    gnashling: {
        level: 3,
        drops: {
            potion: 50,
        },
    },

    loomleaf: {
        level: 10,
        drops: {
            potion: 100,
        },
    },

    thudlord: {
        level: 6,
        drops: {
            potion: 150,
        },
    },
    
    kingslime: {
        level: 3,
        drops: {
            potion: 100,
        messages: ['Bow to the gelatinous crown', 'Flowing, shifting, unstoppable', 'Dissolve within my embrace', 'I am boundless, ever-spreading', 'Your struggles make the kingdom grow'],        
        },
    },

    silkshade: {
        level: 7,
        drops: {
            potion: 50,
        },
        messages: ['Darkness shall embrance you!', 'Your doom is woven', 'Fear binds you', 'Your end is spun', 'The old world beckons you'],        
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
            potion: 90,
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
            potion: 65,
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
            ondeath: true
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
        expMultiplier: {
            duration: 1200
        },
        messages: ['Perish!', 'Be gone!', 'Burn!', 'Wither!', 'Suffer!'],
        respawnDelay: 1800000
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
        level: 10,
        drops: {
            cobapple: 50,
            cobcorn: 10
        },
        armorMod: 0.75,
        hpMod: 0.75
    },

    cobslimered: {
        level: 6,
        drops: {
            cobapple: 20,
            cobcorn: 10,
            redsword: 5
        }
    },

    cobslimeyellow: {
        level: 4,
        drops: {
            cobapple: 30,
            morningstar: 5
        }
    },

    cobslimeblue: {
        level: 2,
        drops: {
            cobapple: 20,
            axe: 5
        }
    },

    cobslimeking: {
        level: 8,
        drops: {
            cobclover: 100
        },
        armorMod: 1.25,
        weaponMod: 2,
        hpMod: 10,
        xp: 2500,  
        respawnDelay: 300000
    },

    alaric: {
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

    //Field effects
    magcrack: {
        aoe: {
            damage: 100,
            range: 1
        }
    }
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
            return Types.getWeaponRank(kind);
        }
    } catch(e) {
        console.error("No level found for weapon: "+Types.getKindAsString(kind));
    }
};

Properties.getHitPoints = function(kind, levelOffset) {
    let level = Properties.getLevel(kind);

    if (Properties[Types.getKindAsString(kind)].hp !== undefined) {
        return Math.round(Properties[Types.getKindAsString(kind)].hp * (level + levelOffset) / level);
    } else {
        return Math.round((level + levelOffset) * 25 * Properties.getHpMod(kind));
    }
};

Properties.getLevel = function(kind) {
    retLevel = Properties[Types.getKindAsString(kind)].level;
    return retLevel !== undefined ? retLevel : 1;
};

Properties.getHpMod = function(kind) {
    retMod = Properties[Types.getKindAsString(kind)].hpMod;
    return retMod !== undefined ? retMod : 1;
};

Properties.getArmorMod = function(kind) {
    retMod = Properties[Types.getKindAsString(kind)].armorMod;
    return retMod !== undefined ? retMod : 1;
};

Properties.getWeaponMod = function(kind) {
    retMod = Properties[Types.getKindAsString(kind)].weaponMod;
    return retMod !== undefined ? retMod : 1;
};

module.exports = Properties;
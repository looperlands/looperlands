
var Types = require("../../shared/js/gametypes");

var Properties = {
    rat: {
        drops: {
            flask: 40,
            burger: 10,
            firepotion: 5
        },
        hp: 25,
        armor: 1,
        weapon: 1,
        respawnDelay: 5000
    },
    
    skeleton: {
        drops: {
            flask: 40,
            axe: 20,
            firepotion: 5
        },
        hp: 110,
        armor: 2,
        weapon: 2
    },
    
    goblin: {
        drops: {
            flask: 50,
            axe: 10,
            firepotion: 5
        },
        hp: 90,
        armor: 2,
        weapon: 1
    },
    
    ogre: {
        drops: {
            burger: 10,
            flask: 50,
            morningstar: 20,
            firepotion: 5
        },
        hp: 200,
        armor: 3,
        weapon: 2
    },
    
    spectre: {
        drops: {
            flask: 30,
            redsword: 30,
            firepotion: 5
        },
        hp: 250,
        armor: 2,
        weapon: 4
    },
    
    deathknight: {
        drops: {
            burger: 95,
            firepotion: 5
        },
        hp: 250,
        armor: 3,
        weapon: 3
    },
    
    crab: {
        drops: {
            flask: 50,
            axe: 20,
            firepotion: 5
        },
        hp: 60,
        armor: 2,
        weapon: 1
    },
    
    snake: {
        drops: {
            flask: 50,
            morningstar: 10,
            firepotion: 5
        },
        hp: 150,
        armor: 3,
        weapon: 2
    },
    
    skeleton2: {
        drops: {
            flask: 60,
            bluesword: 15,
            firepotion: 5
        },
        hp: 200,
        armor: 3,
        weapon: 3
    },
    
    eye: {
        drops: {
            flask: 50,
            redsword: 10,
            firepotion: 5
        },
        hp: 200,
        armor: 3,
        weapon: 3
    },
    
    bat: {
        drops: {
            flask: 50,
            axe: 10,
            firepotion: 5
        },
        hp: 80,
        armor: 2,
        weapon: 1
    },
    
    wizard: {
        drops: {
            flask: 50,
            firepotion: 5
        },
        hp: 100,
        armor: 2,
        weapon: 6
    },
    
    boss: {
        drops: {
            goldensword: 10,
            flask: 50
        },
        hp: 5000,
        armor: 5,
        weapon: 8,
        redpacket: true,
        respawnDelay: 60000
    },

    slime: {
        drops: {
            potion: 50,
        },        
        hp: 50,
        armor: 2,
        weapon: 1
    },

    gnashling: {
        drops: {
            potion: 50,
        },                
        hp: 130,
        armor: 3,
        weapon: 2
    },

    loomleaf: {
        drops: {
            potion: 100,
        },                
        hp: 3300,
        armor: 16,
        weapon: 6
    },

    thudlord: {
        drops: {
            potion: 150,
        },                
        hp: 1100,
        armor: 4,
        weapon: 3
    },
    
    kingslime: {
        drops: {
            potion: 100,
        },                
        hp: 400,
        armor: 3,
        weapon: 3
    },

    silkshade: {
        hp: 2000,
        armor: 5,
        weapon: 4
    },


    wildgrin: {
        drops: {
            potion: 100,
        },
        hp: 140,
        armor: 6,
        weapon: 4
    },        
    

    redslime: {
        drops: {
            potion: 100,
        },        
        hp: 140,
        armor: 2,
        weapon: 2
    },    

    spider: {
        drops: {
            potion: 65,
        },
        hp: 300,
        armor: 4,
        weapon: 3
    },

    arachweave: {
        drops: {
            KEY_ARACHWEAVE: 100,
        },
        hp: 300,
        armor: 4,
        weapon: 3
    },
    
    minimag: {
        drops: {
            flask: 50
        },
        hp: 500,
        armor: 25,
        weapon: 4,
        aoe: {
            damage: 60,
            ondeath: true
        }
    },

    megamag: {
        drops: {
            burger: 100
        },
        hp: 15000,
        armor: 40,
        weapon: 8,
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
        hp: 10,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    cobcow: {
        hp: 100,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    
    cobpig: {
        hp: 60,
        armor: 1,
        weapon: 1,
        friendly: true
    },
    
    cobgoat: {
        hp: 35,
        armor: 1,
        weapon: 1,
        friendly: true
    },

    ghostie: {
        drops: {
            flask: 50
        },
        hp: 300,
        armor: 3,
        weapon: 3,
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
    }


};

Properties.getArmorLevel = function(kind) {
    try {
        if(Types.isMob(kind)) {
            return Properties[Types.getKindAsString(kind)].armor;
        } else {
            return 1;
        }
    } catch(e) {
        console.error("No level found for armor: "+Types.getKindAsString(kind));
    }
    return 1;
};

Properties.getWeaponLevel = function(kind) {
    try {
        if(Types.isMob(kind)) {
            return Properties[Types.getKindAsString(kind)].weapon;
        } else {
            return Types.getWeaponRank(kind) + 1;
        }
    } catch(e) {
        console.error("No level found for weapon: "+Types.getKindAsString(kind));
    }
};

Properties.getHitPoints = function(kind) {
    return Properties[Types.getKindAsString(kind)].hp;
};

module.exports = Properties;
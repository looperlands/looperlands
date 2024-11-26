// FOR ALL:
// Add .json in client/sprites
// Add sprite images:
//    100% scale ==> client/img/1
//    200% scale ==> client/img/2
//    300% scale ==> client/img/3

// For MOBS: Input level, armorMod, weaponMod, hpMod, drops, respawnDelay, etc in server/js/properties
// For ITEMS: Input collectable, consumable, collectItem, collectAmount, inventoryDescription, cooldown, onConsume, etc in server/js/properties
// For NPCS: Input basic dialogue in client/js/npc.js or advanced dialogue via files in server/js/dialogue

define(() => {
    return {
        "NPCS": {
            //'SPRITE': 'ALTNAME'
            'BITNPC_BITCORN': 'bitcorn',
            'BITNPC_THORNBEARD_KNEEL': 'Thornbeard',
            'BITNPC_THORNBEARD': 'Thornbeard',
            'BITNPC_RADIO': 'Boombox',
            'BITNPC_PC': 'BEEP BOOP BEEP',
        },

        "MOBS": {
            /*
            setting:      default   Description
            =================================================================================
            altName:         null   Alternate display name for sprite
            moveSpeed:        350   Speed of the mob's movement
            idleSpeed:        800   Speed of the mob's idle (standby) behavior
            atkSpeed:         100   Speed of the mob's attacks
            atkRate:          800   Milliseconds between attacks (sets attack rate)
            shadowOffsetY:      1   Adjust the Y position of the mob's shadow
            isAggressive:    true   Whether the mob is aggressive (hostile) towards players
            aggroRange:         1   The distance within which the mob will aggro on players
            deathAnimated:  false   Whether the mob has a death animation
            title:           null   Special title for the mob (e.g., "Boss")
            idleOrientation: null   Used to set idle orientation to a single direction (u,d,l,r)
            nameless:       false   Set to true if the mob should not have a name
            nameOffsetY:      -10   Adjusts the location of the entity name
            */
            'SLUDGERAT': {
                altName: 'sludgeRAT', //level: 15, drops: { flask: 34, taikoboost: 5, GOLD: 40, GOLD2: 15, GOLD3: 5, GOLD4: 1 },
                moveSpeed: 100 + Math.random() * 300, atkSpeed: 50 + Math.random() * 100, shadowOffsetY: -2, aggroRange: 1 + Math.random() * 4, deathAnimated: true,
            },
            'SPACECRAB': {
                altName: 'spaceCRAB', //level: 20, drops: { flask: 30, taikoboost: 5, GOLD: 15, GOLD2: 35, GOLD4: 2 },
                moveSpeed: 150 + Math.random() * 100, atkSpeed: 20 + Math.random() * 40, idleSpeed: 500, aggroRange: 1 + Math.random() * 2, deathAnimated: true,
            },
            'BLACKMAGE': {
                altName: 'motherFlippin BlackMAGE', //level: 25, drops: { flask: 50 }, armorMod: 2, weaponMod: 1.5, hpMod: 5, messages: ['Etheriumos!', 'Bitcornia!', 'Go-go-gadget magic!', 'BooyahKORNsha!'],
                moveSpeed: 100 + Math.random() * 100, atkSpeed: 50 + Math.random() * 50, idleSpeed: 150, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'RABBID': {
                altName: 'Rabbid', //level: 100, drops: { flask: 5, taikoboost: 5, GOLD4: 45, GOLD5: 45 }, weaponMod: 3, hpMod: 2, respawnDelay: 160000,
                moveSpeed: 100 + Math.random() * 100, atkSpeed: 50 + Math.random() * 50, idleSpeed: 250, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'ZOMBBID': {
                altName: 'Zombbid', //level: 42, drops: { flask: 90, taikoboost: 8, loopring: 2 }, respawnDelay: 120000,
                moveSpeed: 100 + Math.random() * 250, atkSpeed: 50 + Math.random() * 50, idleSpeed: 250, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'HOPPINK': {
                altName: 'HOPpink', //level: 35, drops: { flask: 40, taikoboost: 10 },
                moveSpeed: 100 + Math.random() * 150, atkSpeed: 50 + Math.random() * 50, idleSpeed: 250, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'HOPPURP': {
                altName: 'HOPpurp', //level: 30, drops: { flask: 25 }, respawnDelay: 15000,
                moveSpeed: 100 + Math.random() * 150, atkSpeed: 50 + Math.random() * 50, idleSpeed: 250, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'CRAPTOR': {
                altName: 'CRAPtor', //level: 69,
                moveSpeed: 300 + Math.random() * 100, atkSpeed: 75 + Math.random() * 50, aggroRange: 1 + Math.random() * 3, deathAnimated: true, nameOffsetY: -24
            },
        },

        "ITEMS": {
            //"RESOURCE" : {lootMessage: "LOOTMESSAGE", type: "resource"}
            //"ITEMNAME" : {lootMessage: "LOOTMESSAGE"}, //type defaults to "object", so not needed
            //"BURGER": {lootMessage: "Now that's a tasty burger!"}
        },

        "FISH": {
            //'SPRITE': 'ALTNAME'
            'bit_BoneFish': 'a BoneFish',
            'bit_Corn': 'RIVER CORN!',
            'bit_FEET': 'FEET',
            'bit_freshPrawnce': 'The Fresh Prawnce',
            'bit_JEFF': 'JEFF',
            'bit_Kickle': 'Kickle the Pickle',
            'bit_maCORNtosh': "one of 'dem maCORNtosh CORNputers",
            'bit_MrPunchy': 'Mr. Punchy',
            'bit_SnaggletoothEel': 'a nasty Snaggletooth Eel!',
            'bit_NOPEmato': 'a NOPEmato',
            'cornBootFish': "Old Gregg's Shoe",
            'cornCanFish': 'an empty can of Mother Shucker',
            'cornWinkyFish': 'The Legendary Winky',
        }
    };
});



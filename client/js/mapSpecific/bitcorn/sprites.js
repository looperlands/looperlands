///////////////////////////////////
// ADD A NPC, MOB, ITEM, OR FISH //
///////////////////////////////////
/*
FOR ANY TYPE:
    Add .json in client/sprites
    Add reference to .json in client/js/sprites.js
    Add .png sprite image:
       => 100% scale in client/img/1
       => 200% scale in client/img/2
       => 300% scale in client/img/3

FOR MOBS:  
    server/js/properties.js => Set level, armorMod, weaponMod, hpMod, drops, respawnDelay, etc. 

FOR ITEMS: 
    server/js/properties.js => Set collectable, consumable, collectItem, collectAmount, inventoryDescription, cooldown, onConsume, etc.

FOR NPCS:  
    client/js/npc.js => Add any basic dialogue
    See server/js/dialogue/example.js for adding advanced dialogue

FOR FISH:
    server/js/lakes.js => Add specified fish into your lakes
*/
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
            SETTING:      DEFAULT   DESCRIPTION
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
                altName: 'sludgeRAT', moveSpeed: 100 + Math.random() * 300, atkSpeed: 50 + Math.random() * 100, shadowOffsetY: -2, aggroRange: 1 + Math.random() * 4, deathAnimated: true,
            },
            'SPACECRAB': {
                altName: 'spaceCRAB', moveSpeed: 150 + Math.random() * 100, atkSpeed: 20 + Math.random() * 40, idleSpeed: 500, aggroRange: 1 + Math.random() * 2, deathAnimated: true,
            },
            'BLACKMAGE': {
                altName: 'motherFlippin BlackMAGE', moveSpeed: 100 + Math.random() * 100, atkSpeed: 50 + Math.random() * 50, idleSpeed: 150, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'RABBID': {
                altName: 'Rabbid', moveSpeed: 100 + Math.random() * 100, atkSpeed: 50 + Math.random() * 50, idleSpeed: 250, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'ZOMBBID': {
                altName: 'Zombbid', moveSpeed: 100 + Math.random() * 250, atkSpeed: 50 + Math.random() * 50, idleSpeed: 250, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'HOPPINK': {
                altName: 'HOPpink', moveSpeed: 100 + Math.random() * 150, atkSpeed: 50 + Math.random() * 50, idleSpeed: 250, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'HOPPURP': {
                altName: 'HOPpurp', moveSpeed: 100 + Math.random() * 150, atkSpeed: 50 + Math.random() * 50, idleSpeed: 250, aggroRange: 1 + Math.random() * 3, deathAnimated: true,
            },
            'CRAPTOR': {
                altName: 'CRAPtor', moveSpeed: 300 + Math.random() * 100, atkSpeed: 75 + Math.random() * 50, aggroRange: 1 + Math.random() * 3, deathAnimated: true, nameOffsetY: -24
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



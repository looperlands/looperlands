define([
    'mapSpecific/bitcorn/sprites', // Sprite list for the bitcorn map
    // Add more map-specific sprite lists here
], function (...spriteLists) {
    let allSprites = {
        NPCS: [], // Will hold all NPC names
        MOBS: [], // Will hold all mob data (with settings)
        ITEMS: [], // Will hold items with loot messages
        FISH: [] // Will hold fish names with descriptions
    };

    // Default settings for unspecified mob properties
    const defaultMobSettings = {
        moveSpeed: 350,          // Default movement speed
        idleSpeed: 800,          // Default idle speed
        atkSpeed: 100,           // Default attack speed
        atkRate: 800,            // Default attack rate
        shadowOffsetY: 1,        // Default shadow Y position
        isAggressive: true,      // Default aggression
        aggroRange: 1,           // Default aggro range
        deathAnimated: false,    // Default death animation
        nameless: false,         // Default name setting
        nameOffsetY: -10,        // Default name Y offset
    };

    // Iterate over each sprite list and merge categories into the allSprites object
    spriteLists.forEach(spriteList => {
        Object.keys(spriteList).forEach(category => {
            if (category === 'NPCS') {
                // Process NPCS: Add all NPC names with their altName
                Object.keys(spriteList[category]).forEach(npcName => {
                    const altName = spriteList[category][npcName];
                    allSprites.NPCS.push({ name: npcName, altName });
                });
            }
            else if (category === 'MOBS') {
                // Process MOBS: Add settings for each mob
                Object.keys(spriteList[category]).forEach(mobName => {
                    const mobSettings = spriteList[category][mobName];
                    
                    // Apply default settings and override with mob-specific values
                    const mob = { ...defaultMobSettings, ...mobSettings };

                    // Store mob data with its settings in the MOBS category
                    allSprites.MOBS.push({
                        name: mobName,
                        settings: mob
                    });
                });
            }
            else if (category === 'ITEMS') {
                // Process ITEMS: Add items with loot messages and type to the array
                Object.keys(spriteList[category]).forEach(itemName => {
                    const { lootMessage, type = "object" } = spriteList[category][itemName]; // Destructure to get lootMessage and type
            
                    // Add objects with name, lootMessage, and type under ITEMS
                    allSprites.ITEMS.push({ name: itemName, lootMessage, type });
                });
            }
            else if (category === 'FISH') {
                // Process FISH: Add fish sprites with their altName
                Object.keys(spriteList[category]).forEach(fishSprite => {
                    const altName = spriteList[category][fishSprite];
                    allSprites.FISH.push({ name: fishSprite, altName });
                });
            }
        });
    });

    // Now allSprites contains all the categorized sprites, items, mobs with default and custom settings
    return allSprites;
});
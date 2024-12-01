define([
    'mapSpecific/bitcorn/sprites', // bitcorn map (see this for an example)
    // Add more map-specific sprite lists here

], function (...spriteLists) {
    let allSprites = { NPCS: [], MOBS: [], ITEMS: [], FISH: [] };

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

    spriteLists.forEach(spriteList => {
        Object.keys(spriteList).forEach(category => {
            if (category === 'NPCS') {
                // Process NPCS: Add NPCS with their altName
                Object.keys(spriteList[category]).forEach(npcName => {
                    const altName = spriteList[category][npcName];
                    allSprites.NPCS.push({ name: npcName, altName });
                });
            }
            else if (category === 'MOBS') {
                // Process MOBS: Add mobs with provided/default settings
                Object.keys(spriteList[category]).forEach(mobName => {
                    const mobSettings = spriteList[category][mobName];
                    // Apply default settings and override with mob-specific values
                    const mob = { ...defaultMobSettings, ...mobSettings };
                    allSprites.MOBS.push({ name: mobName, settings: mob });
                });
            }
            else if (category === 'ITEMS') {
                // Process ITEMS: Add items with loot messages and type
                Object.keys(spriteList[category]).forEach(itemName => {
                    const { lootMessage, type = "object" } = spriteList[category][itemName];
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

    return allSprites;
});
define([
    'mapSpecific/bitcorn/sprites', // Sprite list for the bitcorn map
    // Add more map-specific sprite lists here
], function (...spriteLists) {
    let allSprites = {};

    // Iterate over each sprite list and merge categories into the allSprites object
    spriteLists.forEach(spriteList => {
        Object.keys(spriteList).forEach(category => {
            if (!allSprites[category]) {
                allSprites[category] = []; // Initialize the category array if it doesn't exist
            }

            // Handle ITEMS category differently
            if (category === 'ITEMS') {
                Object.keys(spriteList[category]).forEach(itemName => {
                    const lootMessage = spriteList[category][itemName];
                    // Add objects with name and lootMessage under ITEMS
                    allSprites[category].push({ name: itemName, lootMessage });
                });
            } else {
                allSprites[category] = allSprites[category].concat(spriteList[category]); // Merge sprite names for other categories
            }
        });
    });

    // Now allSprites contains all the categorized sprites and items with name and lootMessage
    return allSprites;
});


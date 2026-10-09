// Deliberately small, fixed definitions for behavior tests; independent of live map balancing.
module.exports = function createFarmingDefinitions() {
    function crop(name, tileGroup, yieldItem, overrides = {}) {
        return {
            name, displayName: name, tileGroup, yieldItem,
            plantType: "crop", level: 5, seedCost: 1, growSeconds: 90,
            stages: 4, yield: { min: 1, max: 2 }, xp: 30,
            seedReturnChance: 0.35, rareDrops: [], ...overrides,
        };
    }

    function tree(name, tileGroup, yieldItem) {
        return crop(name, tileGroup, yieldItem, {
            plantType: "tree", level: 12, seedCost: 3, growSeconds: 540,
            renderOffset: { x: 8, y: 0 }, yield: { min: 2, max: 4 },
        });
    }

    const farm = {
        minLevel: 5,
        prepare: { name: "Prepare soil", tool: "M88NSHOVEL", duration: 3, tile: 17118, xp: 15 },
        water: { tool: "M88NWATERCAN", duration: 3, xp: 20 },
        seedItem: "M88NSEEDS",
        allowedPlantTypes: ["crop", "tree"],
        careBoosts: [
            { item: "M88NPOO", name: "Add fertilizer", description: "Harvest 1 extra item and earn 10 extra XP.", quality: 1, yieldBonus: 0, maxUses: 1 },
            { item: "M88NWORM", name: "Add worm", description: "Improves yield: Harvest 1 extra item.", quality: 0, yieldBonus: 1, maxUses: 1 },
            { item: "M88NGRUB", name: "Add grub", description: "Harvest 2 extra items.", quality: 0, yieldBonus: 2, maxUses: 1 },
            { item: "M88NDIRT", name: "Add dirt", description: "Adds 10 percentage points to each rare drop chance.", rareChanceBonus: 0.1, maxUses: 1 },
            { item: "M88NSNAIL", name: "Add snail", description: "Adds 50 percentage points to each rare drop chance.", rareChanceBonus: 0.5, maxUses: 1 },
        ],
        crops: {
            M88NLETTUCE: crop("Lettuce", "lettuce", "M88NLETTUCE"),
            M88NCARROT: crop("Carrot", "carrot", "M88NCARROT"),
            M88NGRAIN: crop("Grain", "grain", "M88NGRAIN"),
            COBCORN: crop("Corn", "corn", "M88NCORN", { seedCost: 2 }),
            M88NORANGE: tree("Orange tree", "tree1", "M88NORANGE"),
            COBAPPLE: tree("Cherry tree", "treeRed", "M88NCHERRY"),
            TREEPURPLE: tree("Purple fruit tree", "treePurple", "M88NCHERRY"),
            TREEYELLOW: tree("Lemon tree", "treeYellow", "M88NLEMON"),
            M88NHOTPEPPERGREEN: crop("Green Hot Pepper", "hotpeppergreen", "M88NHOTPEPPERGREEN", { seedItem: "M88NSPICYSEEDS" }),
            M88NHOTPEPPERRED: crop("Red Hot Pepper", "hotpepperred", "M88NHOTPEPPERRED", { seedItem: "M88NSPICYSEEDS" }),
            M88NROSE: crop("Roses", "roses", "M88NROSE", { stages: 3, stagedTile: 18249 }),
        },
    };
    const potFarm = {
        ...farm,
        minLevel: 1,
        prepare: { ...farm.prepare, tile: 18366 },
        allowedPlantTypes: ["pot"],
        crops: {
            M88NLETTUCE: crop("Potted lettuce", "lettucePotted", "M88NLETTUCE", { plantType: "pot", stagedTile: 17970 }),
            COBCORN: crop("Potted corn", "cornPotted", "M88NCORN", { plantType: "pot", seedCost: 2, stagedTile: 17409 }),
            M88NROSE: crop("Potted roses", "pottedRoses", "M88NROSE", { plantType: "pot", stages: 3, stagedTile: 18246 }),
        },
    };
    return { duckville: { farm, potFarm } };
};

const definitions = require("../../client/tileActions/duckville.json");

// Integration checks for exported assets stay separate from controller behavior tests.
describe("Duckville farming map configuration", () => {
    test("tree crops use the exported four-stage 2x3 tile groups", () => {
        const farm = definitions.farm;
        const map = require("../../client/maps/world_client_duckville.json");

        expect(farm.crops.M88NORANGE.stages).toBe(4);
        expect(farm.crops.M88NORANGE.renderOffset).toEqual({ x: 8, y: 0 });
        expect(farm.crops.COBAPPLE.stages).toBe(4);
        expect(farm.crops.COBAPPLE.renderOffset).toEqual({ x: 8, y: 0 });
        expect(farm.crops.TREEPURPLE.stages).toBe(4);
        expect(farm.crops.TREEPURPLE.renderOffset).toEqual({ x: 8, y: 0 });
        expect(farm.crops.TREEYELLOW.stages).toBe(4);
        expect(farm.crops.TREEYELLOW.renderOffset).toEqual({ x: 8, y: 0 });

        expect(map.stagedTiles["19599"]).toMatchObject({
            groupName: "tree1",
            size: { w: 2, h: 3 },
            stageTiles: [19606, 19608, 19610, 19613],
            stages: 4,
        });
        expect(map.stagedTiles["20151"]).toMatchObject({
            groupName: "treeRed",
            size: { w: 2, h: 3 },
            stageTiles: [20158, 20160, 20162, 20165],
            stages: 4,
        });
        expect(map.stagedTiles["20703"]).toMatchObject({
            groupName: "treePurple",
            size: { w: 2, h: 3 },
            stageTiles: [20710, 20712, 20714, 20717],
            stages: 4,
        });
        expect(map.stagedTiles["21255"]).toMatchObject({
            groupName: "treeYellow",
            size: { w: 2, h: 3 },
            stageTiles: [21262, 21264, 21266, 21269],
            stages: 4,
        });
    });

    test("crop data uses display names, plural rare drops, and staged rose groups", () => {
        const { farm, potFarm } = definitions;

        Object.values(farm.crops).concat(Object.values(potFarm.crops)).forEach((crop) => {
            expect(crop.displayName).toEqual(expect.any(String));
            expect(crop.rareDrop).toBeUndefined();
            expect(crop.rareDrops).toEqual(expect.any(Array));
        });

        expect(farm.crops.M88NROSE).toMatchObject({
            displayName: "Roses",
            tileGroup: "roses",
            stagedTile: 18249,
            yieldItem: "M88NROSE",
            stages: 3,
        });
        expect(potFarm.crops.M88NROSE).toMatchObject({
            displayName: "Potted roses",
            tileGroup: "pottedRoses",
            stagedTile: 18246,
            yieldItem: "M88NROSE",
            stages: 3,
        });
        expect(potFarm.crops.COBCORN).toMatchObject({
            displayName: "Potted corn",
            tileGroup: "cornPotted",
            stagedTile: 17409,
            yieldItem: "M88NCORN",
            stages: 4,
        });
    });

    test("baked-base and potted crop groups are defined separately", () => {
        const map = require("../../client/maps/world_client_duckville.json");

        expect(map.stagedTiles["18085"]).toMatchObject({
            groupName: "lettuce",
        });
        expect(map.stagedTiles["17689"]).toMatchObject({
            groupName: "carrot",
            size: { w: 1, h: 2 },
        });
        expect(map.stagedTiles["17128"]).toMatchObject({
            groupName: "cauliflower",
            size: { w: 1, h: 2 },
        });
        expect(map.stagedTiles["17404"]).toMatchObject({
            groupName: "broccoli",
            size: { w: 1, h: 2 },
        });
        expect(map.stagedTiles["17680"]).toMatchObject({
            groupName: "potato",
            size: { w: 1, h: 2 },
        });
        expect(map.stagedTiles["17413"]).toMatchObject({
            groupName: "corn",
            size: { w: 1, h: 2 },
        });
        expect(map.stagedTiles["17533"]).toMatchObject({
            groupName: "turnip",
        });
        expect(map.stagedTiles["17533"].renderMode).toBeUndefined();
        expect(map.stagedTiles["17685"]).toMatchObject({
            groupName: "carrotPotted",
            size: { w: 1, h: 2 },
            renderMode: "replace",
        });
        expect(map.stagedTiles["17124"]).toMatchObject({
            groupName: "cauliflowerPotted",
            size: { w: 1, h: 2 },
            renderMode: "replace",
        });
        expect(map.stagedTiles["17400"]).toMatchObject({
            groupName: "broccoliPotted",
            size: { w: 1, h: 2 },
            renderMode: "replace",
        });
        expect(map.stagedTiles["17409"]).toMatchObject({
            groupName: "cornPotted",
            size: { w: 1, h: 2 },
        });
        expect(Object.values(map.stagedTiles).filter((tile) => tile.groupName === "cornPotted")).toHaveLength(1);
        expect(map.stagedTiles["17675"]).toBeUndefined();
        expect(map.stagedTiles["17676"]).toMatchObject({
            groupName: "potatoPotted",
            size: { w: 1, h: 2 },
            renderMode: "replace",
        });
        expect(map.stagedTiles["17952"]).toMatchObject({
            groupName: "strawberryPotted",
            size: { w: 1, h: 2 },
            renderMode: "replace",
        });
        expect(map.stagedTiles["17956"]).toMatchObject({
            groupName: "strawberry",
            size: { w: 1, h: 2 },
        });
        expect(map.stagedTiles["17961"]).toMatchObject({
            groupName: "onionPotted",
            size: { w: 1, h: 2 },
            renderMode: "replace",
        });
        expect(map.stagedTiles["17965"]).toMatchObject({
            groupName: "onion",
            size: { w: 1, h: 2 },
        });
        expect(map.stagedTiles["17970"]).toMatchObject({
            groupName: "lettucePotted",
            size: { w: 1, h: 2 },
            renderMode: "replace",
        });
        expect(map.stagedTiles["18223"]).toMatchObject({
            groupName: "berries",
        });
        expect(map.stagedTiles["18218"]).toMatchObject({
            groupName: "blueberry",
            size: { w: 1, h: 2 },
        });
        expect(map.stagedTiles["18237"]).toMatchObject({
            groupName: "tomatoPotted",
            size: { w: 1, h: 2 },
            renderMode: "replace",
        });
        expect(map.stagedTiles["18241"]).toMatchObject({
            groupName: "tomato",
            size: { w: 1, h: 2 },
        });
        expect(map.stagedTiles["18246"]).toMatchObject({
            groupName: "pottedRoses",
            size: { w: 1, h: 2 },
            renderMode: "replace",
            stages: 3,
        });
        expect(map.stagedTiles["18249"]).toMatchObject({
            groupName: "roses",
            size: { w: 1, h: 2 },
            stages: 3,
        });
        expect(map.stagedTiles["17689"].renderMode).toBeUndefined();
        expect(map.stagedTiles["17128"].renderMode).toBeUndefined();
        expect(map.stagedTiles["17404"].renderMode).toBeUndefined();
        expect(map.stagedTiles["18223"].renderMode).toBeUndefined();
        expect(map.stagedTiles["17413"].renderMode).toBeUndefined();
    });
});

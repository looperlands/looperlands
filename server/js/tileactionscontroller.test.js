process.env.GAMESERVER_NAME = process.env.GAMESERVER_NAME || "test";

jest.mock("../../shared/js/gametypes", () => ({
    Entities: {
        M88NSEEDS: 78003900,
        M88NSHOVEL: 78004100,
        M88NWATERCAN: 78004200,
        M88NDIRT: 78004700,
        M88NWORM: 78004900,
        M88NSNAIL: 78005000,
        COBAPPLE: 21300011,
        COBCORN: 21300010,
        M88NPOTATO: 78003800,
        M88NLETTUCE: 78012700,
        M88NTOMATO: 78012900,
        M88NTURNIP: 78013000,
        M88NCARROT: 78015000,
        M88NBROCCOLI: 78012500,
        M88NCAULIFLOWER: 78012600,
        M88NROSE: 78005100,
    },
    getKindAsString: jest.fn((kind) => {
        const names = {
            78003800: "m88npotato",
            21300011: "cobapple",
            21300010: "cobcorn",
            78012700: "m88nlettuce",
            78012900: "m88ntomato",
            78013000: "m88nturnip",
            78015000: "m88ncarrot",
            78012500: "m88nbroccoli",
            78012600: "m88ncauliflower",
            78005100: "m88nrose",
        };
        return names[kind];
    }),
}));

jest.mock("./dao.js", () => ({}));
jest.mock("./formulas", () => ({
    level: jest.fn((xp) => xp >= 1000000 ? 20 : 0),
}));

const TileActionsController = require("./tileactionscontroller");
const Types = require("../../shared/js/gametypes");

describe("TileActionsController farming", () => {
    let plots;
    let inventory;
    let dao;
    let cache;
    let sessionData;
    let world;
    let controller;
    let tileAction;
    let now;

    beforeEach(() => {
        now = 1000000;
        plots = {};
        inventory = {};
        dao = {
            getItemCount: jest.fn(async (nftId, itemId) => inventory[itemId] || 0),
            updateResourceBalance: jest.fn(async (transactionOrTransactions, itemId, quantity) => {
                const transactions = Array.isArray(transactionOrTransactions)
                    ? transactionOrTransactions
                    : [{ nftId: transactionOrTransactions, itemId, quantity }];
                transactions.forEach((transaction) => {
                    inventory[transaction.itemId] = (inventory[transaction.itemId] || 0) + transaction.quantity;
                });
            }),
            loadFarmPlots: jest.fn(async (mapId) => Object.values(plots).filter((plot) => plot.mapId === mapId)),
            loadFarmPlot: jest.fn(async (mapId, x, y) => plots[`${mapId}.${x}.${y}`] || null),
            saveFarmPlot: jest.fn(async (plot) => {
                plots[`${plot.mapId}.${plot.x}.${plot.y}`] = { ...plot };
                return plot;
            }),
            deleteFarmPlot: jest.fn(async (mapId, x, y) => {
                delete plots[`${mapId}.${x}.${y}`];
            }),
        };

        cache = {
            keys: jest.fn(() => ["session"]),
            get: jest.fn(() => sessionData),
            set: jest.fn((key, value) => {
                sessionData = value;
            }),
        };

        world = {
            players: {
                1: { nftId: "avatar", handleExperience: jest.fn(async () => {}) },
                2: { nftId: "other", handleExperience: jest.fn(async () => {}) },
            },
            placeStagedTile: jest.fn(),
            placeStagedTileGroup: jest.fn(),
            clearStagedTile: jest.fn(),
            sendNotifications: jest.fn(),
        };

        controller = new TileActionsController(cache, null, {
            dao,
            now: () => now,
            random: () => 0,
        });
        tileAction = { name: "farm", gridX: 10, gridY: 20 };

        inventory[Types.Entities.M88NSHOVEL] = 1;
        inventory[Types.Entities.M88NWATERCAN] = 1;
        inventory[Types.Entities.M88NSEEDS] = 5;

        sessionData = {
            nftId: "avatar",
            xp: 1000000,
            gameData: {
                items: {
                    [Types.Entities.M88NSHOVEL]: 1,
                    [Types.Entities.M88NWATERCAN]: 1,
                    [Types.Entities.M88NSEEDS]: 5,
                },
            },
        };
    });

    test("empty plot returns prepare action", async () => {
        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);

        expect(stage.key).toBe("prepare");
        expect(stage.name).toBe("Prepare soil");
        expect(stage.hasTool).toBe(true);
        expect(stage.optimisticStage).toEqual({ tile: 17118, stage: 0 });
    });

    test("prepare persists the plot and planting becomes available", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(dao.saveFarmPlot).toHaveBeenCalledWith(expect.objectContaining({
            mapId: "duckville",
            x: 10,
            y: 20,
            state: "prepared",
        }));
        expect(world.placeStagedTile).toHaveBeenCalledWith(10, 20, 17118, 0);

        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.key).toBe("plant");
        expect(stage.itemChoices.M88NLETTUCE.disabled).toBe(false);
        expect(stage.itemChoices.M88NLETTUCE.optimisticStage).toEqual({ tileGroup: "lettuce", stage: 0 });
    });

    test("prepare continues with local state when farm persistence is unavailable", async () => {
        dao.saveFarmPlot.mockRejectedValueOnce(new Error("HTTP error! status: 404"));

        const result = await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(result.success).toBe(true);
        expect(world.placeStagedTile).toHaveBeenCalledWith(10, 20, 17118, 0);
        expect(world.sendNotifications).toHaveBeenCalledWith(world.players[1], "The soil is ready.");

        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.key).toBe("plant");
    });

    test("plant consumes seeds and water becomes the next action", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);

        expect(inventory[Types.Entities.M88NSEEDS]).toBe(4);
        expect(world.placeStagedTileGroup).toHaveBeenLastCalledWith(10, 20, "lettuce", 0);

        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.key).toBe("water");
        expect(stage.name).toBe("Water Lettuce");
        expect(stage.optimisticStage).toEqual({ tileGroup: "lettuce", stage: 1 });
    });

    test("plant choices respect the action tile plant type", async () => {
        tileAction.name = "potFarm";

        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.itemChoices.M88NLETTUCE.disabled).toBe(false);
        expect(stage.itemChoices.M88NLETTUCE.title).toBe("Potted lettuce");
        expect(stage.itemChoices.COBAPPLE).toBeUndefined();
        expect(stage.itemChoices.M88NROSE.disabled).toBe(false);
        expect(stage.itemChoices.M88NROSE.title).toBe("Potted roses");
    });

    test("persisted potted rose plots restore with potted crop visuals", async () => {
        plots["duckville.10.20"] = {
            mapId: "duckville",
            x: 10,
            y: 20,
            ownerNftId: "avatar",
            crop: "M88NROSE",
            state: "growing",
            stage: 2,
            tileGroup: "pottedRoses",
            createdAt: now - 1000,
            plantedAt: now - 1000,
            wateredAt: now - 1000,
            readyAt: now - 1,
        };

        await controller.loadPersistedPlots("duckville", world);

        expect(world.placeStagedTileGroup).toHaveBeenCalledWith(10, 20, "pottedRoses", 2, null, 18246);
    });

    test("plant validation blocks incompatible seeds", async () => {
        tileAction.allowedPlantTypes = "potted";

        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);

        const plot = plots["duckville.10.20"];
        expect(plot.state).toBe("prepared");
        expect(plot.crop).toBe(null);
        expect(inventory[Types.Entities.M88NSEEDS]).toBe(5);
        expect(world.sendNotifications).toHaveBeenCalledWith(world.players[1], "Lettuce needs open farmland.");
    });

    test("water starts growth and not-ready crop waits", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(world.placeStagedTileGroup).toHaveBeenLastCalledWith(10, 20, "lettuce", 1);

        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(["boost", "wait"]).toContain(stage.key);
    });

    test("ready crop can be harvested and clears staged tile state", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += 91000;

        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.key).toBe("harvest");

        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(dao.deleteFarmPlot).toHaveBeenCalledWith("duckville", 10, 20);
        expect(world.clearStagedTile).toHaveBeenCalledWith(10, 20);
        expect(inventory[Types.Entities.M88NLETTUCE]).toBeGreaterThan(0);
    });

    test("planting spends seed packets and harvesting grants grown crop items", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NORANGE", world);

        expect(world.placeStagedTileGroup).toHaveBeenLastCalledWith(10, 20, "tree1", 0, { x: 8, y: 0 });
        expect(inventory[Types.Entities.M88NSEEDS]).toBe(2);
        expect(sessionData.gameData.items[String(Types.Entities.M88NSEEDS)]).toBe(2);
        expect(inventory[Types.Entities.COBAPPLE] || 0).toBe(0);
        expect(sessionData.gameData.items[String(Types.Entities.COBAPPLE)] || 0).toBe(0);

        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += 541000;
        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(inventory[Types.Entities.COBAPPLE]).toBeGreaterThan(0);
        expect(sessionData.gameData.items[String(Types.Entities.COBAPPLE)]).toBeGreaterThan(0);
        expect(inventory[Types.Entities.M88NSEEDS]).toBe(3);
        expect(sessionData.gameData.items[String(Types.Entities.M88NSEEDS)]).toBe(3);
    });

    test("validation blocks missing shovel", async () => {
        inventory[Types.Entities.M88NSHOVEL] = 0;

        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(dao.saveFarmPlot).not.toHaveBeenCalled();
        expect(world.sendNotifications).toHaveBeenCalledWith(world.players[1], "You need a shovel to prepare this land.");
    });

    test("validation blocks missing watering can", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        inventory[Types.Entities.M88NWATERCAN] = 0;

        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        const plot = plots["duckville.10.20"];
        expect(plot.state).toBe("planted");
        expect(world.sendNotifications).toHaveBeenCalledWith(world.players[1], "You need a watering can.");
    });

    test("too-low level blocks locked crops", async () => {
        cache.get = jest.fn(() => ({ nftId: "avatar", xp: 0 }));
        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(dao.saveFarmPlot).not.toHaveBeenCalled();
        expect(world.sendNotifications).toHaveBeenCalledWith(world.players[1], "You need level 5 to prepare this land.");
    });

    test("active player level is used before stale session xp", async () => {
        cache.get = jest.fn(() => ({ nftId: "avatar", xp: 0 }));
        world.players[1].getLevel = jest.fn(() => 6);

        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(dao.saveFarmPlot).toHaveBeenCalledWith(expect.objectContaining({
            mapId: "duckville",
            x: 10,
            y: 20,
            state: "prepared",
        }));
    });

    test("debug level gate bypass allows low-level farming", async () => {
        cache.get = jest.fn(() => ({ nftId: "avatar", xp: 0 }));
        controller = new TileActionsController(cache, null, {
            dao,
            now: () => now,
            random: () => 0,
            disableLevelGate: true,
        });

        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(dao.saveFarmPlot).toHaveBeenCalledWith(expect.objectContaining({
            mapId: "duckville",
            x: 10,
            y: 20,
            state: "prepared",
        }));

        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.itemChoices.M88NLETTUCE.disabled).toBe(false);

        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        expect(plots["duckville.10.20"].crop).toBe("M88NLETTUCE");
    });

    test("non-owner cannot harvest before the overdue window", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += 91000;

        await controller.executeStage("other", "duckville", tileAction, null, world);

        expect(dao.deleteFarmPlot).not.toHaveBeenCalled();
        expect(world.sendNotifications).toHaveBeenCalledWith(world.players[2], "Only the planter can harvest this crop right now.");
    });

    test("repeated harvest does not duplicate rewards", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += 91000;

        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        const firstHarvest = inventory[Types.Entities.M88NLETTUCE];
        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(inventory[Types.Entities.M88NLETTUCE]).toBe(firstHarvest);
    });

    test("persisted plots hydrate into staged tiles", async () => {
        plots["duckville.10.20"] = {
            mapId: "duckville",
            x: 10,
            y: 20,
            ownerNftId: "avatar",
            crop: "M88NLETTUCE",
            state: "growing",
            tileGroup: "lettuce",
            wateredAt: now - 45000,
            readyAt: now + 45000,
            boosts: {},
        };

        await controller.loadPersistedPlots("duckville", world);

        expect(world.placeStagedTileGroup).toHaveBeenCalledWith(10, 20, "lettuce", expect.any(Number));
        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.key).toBe("wait");
    });

    test("tree crops use the exported four-stage 2x3 tile groups", () => {
        const farm = controller.stageDefinitions.duckville.farm;
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
        const { farm, potFarm } = controller.stageDefinitions.duckville;

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
            yieldItem: "COBCORN",
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

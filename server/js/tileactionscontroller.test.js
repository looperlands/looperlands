process.env.GAMESERVER_NAME = process.env.GAMESERVER_NAME || "test";

jest.mock("../../shared/js/gametypes", () => {
    // The shared browser/CommonJS module assigns to the global Types binding.
    global.Types = {};
    const types = jest.requireActual("../../shared/js/gametypes");
    return {
        ...types,
        Entities: { ...types.Entities, MOONSEEDS: 99900001 },
    };
});

jest.mock("./dao.js", () => ({}));
jest.mock("./formulas", () => ({
    level: jest.fn((xp) => xp >= 1000000 ? 20 : 0),
}));

const TileActionsController = require("./tileactionscontroller");
const Types = require("../../shared/js/gametypes");
const createFarmingDefinitions = require("./fixtures/farming");

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
            stageDefinitions: createFarmingDefinitions(),
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

    function growthDurationMs(cropKey = "M88NLETTUCE") {
        return controller.stageDefinitions.duckville.farm.crops[cropKey].growSeconds * 1000;
    }

    test("injected farming definitions work without loading live map configuration", async () => {
        const DuckvilleController = require("./tileactions/duckvillecontroller");
        const loadSpy = jest.spyOn(DuckvilleController.prototype, "loadStageDefinitions").mockImplementation(() => {
            throw new Error("Live map configuration must not be read in behavior tests");
        });
        try {
            const configured = new TileActionsController(cache, null, {
                dao, now: () => now, stageDefinitions: createFarmingDefinitions(),
            });
            expect((await configured.executeStage("avatar", "duckville", tileAction, null, world)).success).toBe(true);
            expect((await configured.findCurrentStage("avatar", "duckville", tileAction, world)).key).toBe("plant");
        } finally {
            loadSpy.mockRestore();
        }
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

    test.each([1, 90, 3600])("crop becomes harvestable at the configured %i-second boundary", async (growSeconds) => {
        controller.stageDefinitions.duckville.farm.crops.M88NLETTUCE.growSeconds = growSeconds;
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        expect(plots["duckville.10.20"].readyAt).toBe(now + growSeconds * 1000);
        now += growSeconds * 1000 - 1;
        expect((await controller.findCurrentStage("avatar", "duckville", tileAction, world)).key).toBe("wait");
        now += 1;
        expect((await controller.findCurrentStage("avatar", "duckville", tileAction, world)).key).toBe("harvest");
    });

    test("ready crop can be harvested and clears staged tile state", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += growthDurationMs() + 1000;

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
        expect(inventory[Types.Entities.M88NORANGE] || 0).toBe(0);
        expect(sessionData.gameData.items[String(Types.Entities.M88NORANGE)] || 0).toBe(0);

        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += growthDurationMs("M88NORANGE") + 1000;
        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(inventory[Types.Entities.M88NORANGE]).toBeGreaterThan(0);
        expect(sessionData.gameData.items[String(Types.Entities.M88NORANGE)]).toBeGreaterThan(0);
        expect(inventory[Types.Entities.COBAPPLE] || 0).toBe(0);
        expect(inventory[Types.Entities.M88NSEEDS]).toBe(3);
        expect(sessionData.gameData.items[String(Types.Entities.M88NSEEDS)]).toBe(3);
    });

    test.each([
        ["farm", "COBAPPLE", "M88NCHERRY"],
        ["farm", "TREEPURPLE", "M88NCHERRY"],
        ["farm", "TREEYELLOW", "M88NLEMON"],
        ["farm", "COBCORN", "M88NCORN"],
        ["potFarm", "COBCORN", "M88NCORN"],
        ["farm", "M88NGRAIN", "M88NGRAIN"],
        ["farm", "M88NHOTPEPPERGREEN", "M88NHOTPEPPERGREEN"],
        ["farm", "M88NHOTPEPPERRED", "M88NHOTPEPPERRED"],
    ])("%s crop %s harvests %s", async (action, cropKey, yieldItem) => {
        tileAction.name = action;
        const farm = controller.stageDefinitions.duckville[action];
        const crop = farm.crops[cropKey];
        const seedKind = Types.Entities[crop.seedItem || farm.seedItem || "M88NSEEDS"];
        inventory[seedKind] = 5;
        sessionData.gameData.items[String(seedKind)] = 5;

        expect((await controller.executeStage("avatar", "duckville", tileAction, null, world)).success).toBe(true);
        expect((await controller.executeStage("avatar", "duckville", tileAction, cropKey, world)).success).toBe(true);
        expect(inventory[seedKind]).toBe(5 - crop.seedCost);
        expect((await controller.executeStage("avatar", "duckville", tileAction, null, world)).success).toBe(true);
        now += crop.growSeconds * 1000 + 1000;

        const result = await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(result.success).toBe(true);
        expect(inventory[Types.Entities[yieldItem]]).toBe(crop.yield.min);
        expect(sessionData.gameData.items[String(Types.Entities[yieldItem])]).toBe(crop.yield.min);
        expect(dao.deleteFarmPlot).toHaveBeenCalledWith("duckville", 10, 20);
        if (Types.Entities[cropKey] && cropKey !== yieldItem) {
            expect(inventory[Types.Entities[cropKey]] || 0).toBe(0);
        }
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
            stageDefinitions: createFarmingDefinitions(),
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
        now += growthDurationMs() + 1000;

        await controller.executeStage("other", "duckville", tileAction, null, world);

        expect(dao.deleteFarmPlot).not.toHaveBeenCalled();
        expect(world.sendNotifications).toHaveBeenCalledWith(world.players[2], expect.stringContaining("Reserved for the planter"));
    });

    test("repeated harvest does not duplicate rewards", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += growthDurationMs() + 1000;

        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        const firstHarvest = inventory[Types.Entities.M88NLETTUCE];
        await controller.executeStage("avatar", "duckville", tileAction, null, world);

        expect(inventory[Types.Entities.M88NLETTUCE]).toBe(firstHarvest);
    });

    test.each([
        [undefined, 0, false], [undefined, 86400000, true],
        ["protected", 0, false], ["protected", 86400000, true],
        ["shared", 0, true], ["owner", 86400000, false],
    ])("harvest access %s after %i ms gives another player access: %s", async (access, overdue, allowed) => {
        controller.stageDefinitions.duckville.farm.harvestAccess = access;
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        const early = await controller.executeStage("other", "duckville", tileAction, null, world);
        expect(early.success).toBe(false);
        now += growthDurationMs() + overdue;

        const result = await controller.executeStage("other", "duckville", tileAction, null, world);

        expect(result.success).toBe(allowed);
        expect(dao.deleteFarmPlot).toHaveBeenCalledTimes(allowed ? 1 : 0);
        if (allowed) {
            expect(dao.updateResourceBalance).toHaveBeenLastCalledWith(expect.arrayContaining([
                expect.objectContaining({ nftId: "other", itemId: Types.Entities.M88NLETTUCE }),
            ]));
        }
    });

    test("special seeds unlock a crop on the same plot and are consumed and returned", async () => {
        Object.assign(controller.stageDefinitions.duckville.farm.crops.M88NLETTUCE, {
            seedItem: "MOONSEEDS", hideUntilSeeds: true,
        });
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        let stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.requirements.items).not.toContain("M88NLETTUCE");
        expect(stage.itemChoices.M88NLETTUCE).toBeUndefined();
        expect(stage.itemChoices.M88NCARROT.disabled).toBe(false);
        const blocked = await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        expect(blocked.success).toBe(false);

        inventory[Types.Entities.MOONSEEDS] = 1;
        stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.itemChoices.M88NLETTUCE.disabled).toBe(false);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        expect(inventory[Types.Entities.MOONSEEDS]).toBe(0);
        expect(inventory[Types.Entities.M88NSEEDS]).toBe(5);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += growthDurationMs() + 1000;
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        expect(inventory[Types.Entities.MOONSEEDS]).toBe(1);
        expect(inventory[Types.Entities.M88NLETTUCE]).toBeGreaterThan(0);
    });

    test("protected crop explains the countdown before offering any harvest animation", async () => {
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += growthDurationMs();
        const stage = await controller.findCurrentStage("other", "duckville", tileAction, world);
        expect(stage.name).toBe("Reserved for the planter (24h remaining)");
        expect(stage.waiting).toBe(true);
        expect(stage.playAnimation).toBeUndefined();
        expect(stage.optimisticStage).toBeUndefined();
        expect((await controller.findCurrentStage("avatar", "duckville", tileAction, world)).key).toBe("harvest");
        now += 86400000 - 30000;
        expect((await controller.findCurrentStage("other", "duckville", tileAction, world)).name).toBe("Reserved for the planter (30s remaining)");
        now += 30000;
        expect((await controller.findCurrentStage("other", "duckville", tileAction, world)).key).toBe("harvest");
    });

    test.each(["owner", "shared"])("harvest prompt follows %s access", async (access) => {
        controller.stageDefinitions.duckville.farm.harvestAccess = access;
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += growthDurationMs() + 86400000;
        const stage = await controller.findCurrentStage("other", "duckville", tileAction, world);
        expect(stage.key).toBe(access === "shared" ? "harvest" : "wait");
        if (access === "owner") {
            expect(stage.name).toBe("Reserved for the planter");
            expect(stage.message).not.toContain("Anyone can harvest");
        }
    });

    test("planting descriptions identify default seeds, custom labels and plural bags", async () => {
        const farm = controller.stageDefinitions.duckville.farm;
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        let stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.itemChoices.M88NLETTUCE.description).toBe("Uses 1 bag of seeds.");
        farm.seedName = "magical seeds";
        Object.assign(farm.crops.M88NLETTUCE, { seedItem: "MOONSEEDS", seedCost: 2 });
        stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.itemChoices.M88NLETTUCE.description).toBe("Uses 2 bags of moon seeds.");
        expect(stage.itemChoices.M88NLETTUCE.disabled).toBe(true);
        expect(stage.itemChoices.M88NCARROT.description).toBe("Uses 1 bag of magical seeds.");
        farm.crops.M88NLETTUCE.seedName = "Dreamland magical seeds";
        stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.itemChoices.M88NLETTUCE.description).toBe("Uses 2 bags of Dreamland magical seeds.");
    });

    test("seed descriptions and harvest protection work on another map", async () => {
        const farm = controller.stageDefinitions.duckville.farm;
        const configured = new TileActionsController(cache, null, {
            dao, now: () => now, stageDefinitions: { moon: { farm: { ...farm, seedItem: "MOONSEEDS", seedName: "moon seeds" } } },
        });
        inventory[Types.Entities.MOONSEEDS] = 1;
        await configured.executeStage("avatar", "moon", tileAction, null, world);
        expect((await configured.findCurrentStage("avatar", "moon", tileAction, world)).itemChoices.M88NLETTUCE.description).toBe("Uses 1 bag of moon seeds.");
        await configured.executeStage("avatar", "moon", tileAction, "M88NLETTUCE", world);
        expect(inventory[Types.Entities.MOONSEEDS]).toBe(0);
        await configured.executeStage("avatar", "moon", tileAction, null, world);
        now += farm.crops.M88NLETTUCE.growSeconds * 1000;
        expect((await configured.findCurrentStage("other", "moon", tileAction, world)).name).toContain("Reserved for the planter");
        expect((await configured.findCurrentStage("avatar", "moon", tileAction, world)).key).toBe("harvest");
    });

    test("client explains reserved crops without animation or a request and passes seed labels to the popup", async () => {
        const post = jest.fn();
        let actions;
        require("vm").runInNewContext(require("fs").readFileSync(require("path").resolve(__dirname, "../../client/js/tileactions.js"), "utf8"), {
            define: (dependencies, factory) => { actions = factory(); },
            Class: { extend: (definition) => definition }, axios: { post },
        });
        actions.game = {
            showNotification: jest.fn(), player: { setAnimation: jest.fn() },
            app: { showSelectionPopup: jest.fn() },
        };
        actions.activeStages = {};
        actions.stageDefinitions = { "10.20": { waiting: true } };
        actions.executeStage(tileAction, { waiting: true, playAnimation: true, message: "Reserved for the planter." });
        expect(actions.game.showNotification).toHaveBeenCalledWith("Reserved for the planter.");
        expect(actions.game.player.setAnimation).not.toHaveBeenCalled();
        expect(post).not.toHaveBeenCalled();
        expect(actions.stageDefinitions["10.20"]).toBeUndefined();

        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        actions.executeStage(tileAction, stage);
        expect(actions.game.app.showSelectionPopup).toHaveBeenCalledWith("Plant seeds", expect.arrayContaining([
            expect.objectContaining({ value: "M88NLETTUCE", description: "Uses 1 bag of seeds." }),
        ]));
    });

    test("crops with missing seeds stay visible unless explicitly hidden", async () => {
        const farm = controller.stageDefinitions.duckville.farm;
        farm.crops = { M88NLETTUCE: { ...farm.crops.M88NLETTUCE, seedItem: "MOONSEEDS" } };
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        let stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.itemChoices.M88NLETTUCE.disabled).toBe(true);
        farm.crops.M88NLETTUCE.hideUntilSeeds = true;
        stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.waiting).toBe(true);
        expect(stage.message).toBe("Find seeds to plant in this garden.");
        inventory[Types.Entities.MOONSEEDS] = 1;
        expect((await controller.findCurrentStage("avatar", "duckville", tileAction, world)).key).toBe("plant");
    });

    test("Care Boost descriptions reach the selection choices", async () => {
        inventory[Types.Entities.M88NPOO] = 1;
        inventory[Types.Entities.M88NGRUB] = 1;
        inventory[Types.Entities.M88NDIRT] = 1;
        inventory[Types.Entities.M88NWORM] = 1;
        inventory[Types.Entities.M88NSNAIL] = 1;
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
        expect(stage.itemChoices.M88NPOO.description).toContain("10 extra XP");
        expect(stage.itemChoices.M88NGRUB.description).toContain("Harvest 2 extra items");
        expect(stage.itemChoices.M88NDIRT.description).toContain("10 percentage points");
        expect(stage.itemChoices.M88NWORM.description).toBe("Improves yield: Harvest 1 extra item.");
        expect(stage.itemChoices.M88NSNAIL.description).toContain("50 percentage points");
    });

    test("garden JSON files register new maps without another controller", async () => {
        const fs = require("fs");
        const directorySpy = jest.spyOn(fs, "readdirSync").mockReturnValueOnce(["duckville.json", "moon.json", "README.md"]);
        const fileSpy = jest.spyOn(fs, "readFileSync").mockImplementation((file) => {
            const farm = createFarmingDefinitions().duckville.farm;
            return JSON.stringify(file.endsWith("/moon.json") ? { moonGarden: farm } : { farm });
        });
        let configured;
        try {
            configured = new TileActionsController(cache, null, { dao, now: () => now });
        } finally {
            directorySpy.mockRestore();
            fileSpy.mockRestore();
        }
        expect(configured.getController("moon")).toBe(configured.getController("duckville"));
        expect(configured.getController("README")).toBeNull();
        const result = await configured.executeStage("avatar", "moon", { ...tileAction, name: "moonGarden" }, null, world);
        expect(result.success).toBe(true);
        expect(dao.saveFarmPlot).toHaveBeenCalledWith(expect.objectContaining({ mapId: "moon" }));
    });

    test("client map export supplies garden actions without a new server export", async () => {
        const fs = require("fs");
        const duckvilleController = controller.getController("duckville");
        const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
        const readSpy = jest.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({
            width: 2, data: [0, [0, 42]], actionTiles: { 42: { action: "farm" } },
        }));
        world.map = {};
        tileAction = { name: "potFarm", gridX: 1, gridY: 0 };
        try {
            const stage = await controller.findCurrentStage("avatar", "duckville", tileAction, world);
            expect(stage.optimisticStage.tile).toBe(17118);
            expect(duckvilleController.getMapActionGrid("duckville")).toEqual({ "1.0": { action: "farm" } });
            expect(readSpy).toHaveBeenCalledTimes(1);
            expect(await controller.findCurrentStage("avatar", "duckville", { ...tileAction, gridX: -1 }, world)).toBeNull();
            expect((await controller.executeStage("avatar", "duckville", { ...tileAction, gridX: -1 }, null, world)).success).toBe(false);
        } finally {
            existsSpy.mockRestore();
            readSpy.mockRestore();
        }
    });

    test("client map action prevents requests from changing harvest access", async () => {
        controller.stageDefinitions.duckville.communityGarden = {
            ...controller.stageDefinitions.duckville.farm, harvestAccess: "shared",
        };
        controller.getController("duckville").mapActionGrids.duckville = { "10.20": { action: "farm" } };
        world.map = {};
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        await controller.executeStage("avatar", "duckville", tileAction, "M88NLETTUCE", world);
        await controller.executeStage("avatar", "duckville", tileAction, null, world);
        now += growthDurationMs() + 1000;
        const result = await controller.executeStage("other", "duckville", { ...tileAction, name: "communityGarden" }, null, world);
        expect(result.success).toBe(false);
        expect(dao.deleteFarmPlot).not.toHaveBeenCalled();
    });

    test("persisted plots restore the correct garden even when crop graphics are shared", async () => {
        const farm = controller.stageDefinitions.duckville.farm;
        controller.stageDefinitions.duckville.communityGarden = {
            ...farm, crops: { M88NLETTUCE: { ...farm.crops.M88NLETTUCE, stages: 2 } },
        };
        controller.getController("duckville").mapActionGrids.duckville = { "10.20": { action: "communityGarden" } };
        world.map = {};
        plots["duckville.10.20"] = {
            mapId: "duckville", x: 10, y: 20, ownerNftId: "avatar",
            crop: "M88NLETTUCE", state: "growing", tileGroup: "lettuce",
            wateredAt: now - 70000, readyAt: now + 20000,
        };
        await controller.loadPersistedPlots("duckville", world);
        expect(world.placeStagedTileGroup).toHaveBeenCalledWith(10, 20, "lettuce", 1);
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

});

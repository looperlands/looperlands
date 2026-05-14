const _ = require("underscore");

const duckville = require("../../../client/tileActions/duckville.json");
const defaultDao = require("../dao.js");
const Formulas = require("../formulas");
const Types = require("../../../shared/js/gametypes");

const DAY_MS = 24 * 60 * 60 * 1000;

class DuckvilleTileActionsController {
    constructor(cache, platformClient, options = {}) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.dao = options.dao || defaultDao;
        this.now = options.now || (() => Date.now());
        this.random = options.random || Math.random;
        this.disableLevelGate = options.disableLevelGate !== undefined
            ? options.disableLevelGate
            : (process.env.LOOPERLANDS_DISABLE_FARM_LEVEL_GATE === "1" || process.env.LOOPERLANDS_LOCAL_MODE === "1");
        this.stageDefinitions = {
            duckville: duckville,
        };
        this.tileStages = {};
        this.plotLocks = {};
        this.loadedMaps = {};
        this.stageTimers = {};
    }

    async findCurrentStage(nftId, map, tileAction, world) {
        try {
            const farmDefinition = this.getFarmDefinition(map, tileAction);
            if (!farmDefinition) {
                console.info("[tileStage.duckville] no farm definition", JSON.stringify({
                    nftId,
                    map,
                    tileAction,
                    knownActions: Object.keys(this.stageDefinitions[map] || {}),
                }));
                return null;
            }

            await this.loadPersistedPlots(map, world);

            const plot = await this.getPlot(map, tileAction);
            await this.refreshVisualStage(map, tileAction, plot, farmDefinition, world);
            const stage = await this.getStageForPlot(nftId, map, tileAction, plot, farmDefinition, world);
            console.info("[tileStage.duckville] current stage", JSON.stringify({
                nftId,
                map,
                tileAction,
                plot: this.describePlot(plot),
                stage,
            }));
            return stage;
        } catch (error) {
            console.error("findCurrentStage", error);
            return null;
        }
    }

    async executeStage(nftId, map, tileAction, item, world) {
        const lockKey = this.getPlotKey(map, tileAction);
        if (this.plotLocks[lockKey]) {
            this.notifyPlayer(world, nftId, "That plot is already being tended.");
            return { success: false };
        }

        this.plotLocks[lockKey] = true;
        try {
            await this.loadPersistedPlots(map, world);
            const farmDefinition = this.getFarmDefinition(map, tileAction);
            const plot = await this.getPlot(map, tileAction);
            await this.refreshVisualStage(map, tileAction, plot, farmDefinition, world);
            const stage = await this.getStageForPlot(nftId, map, tileAction, plot, farmDefinition, world);
            console.info("[tileStage.duckville] execute stage", JSON.stringify({
                nftId,
                map,
                tileAction,
                item,
                plot: this.describePlot(plot),
                stage: this.describeStage(stage),
            }));

            if (!stage || stage.inProgress || stage.waiting) {
                if (stage && stage.message) {
                    this.notifyPlayer(world, nftId, stage.message);
                }
                return { success: false };
            }

            switch (stage.key) {
                case "prepare":
                    return await this.preparePlot(nftId, map, tileAction, farmDefinition, world);
                case "plant":
                    return await this.plantCrop(nftId, map, tileAction, item, farmDefinition, world);
                case "water":
                    return await this.waterCrop(nftId, map, tileAction, plot, farmDefinition, world);
                case "boost":
                    return await this.boostCrop(nftId, map, tileAction, item, plot, farmDefinition, world);
                case "harvest":
                    return await this.harvestCrop(nftId, map, tileAction, plot, farmDefinition, world);
                default:
                    return { success: false };
            }
        } catch (error) {
            console.error("[tileStage.duckville] executeStage error", JSON.stringify({
                nftId,
                map,
                tileAction,
                item,
                message: error?.message,
                stack: error?.stack,
            }));
            this.notifyPlayer(world, nftId, "Something went wrong while tending this plot.");
            return { success: false };
        } finally {
            delete this.plotLocks[lockKey];
        }
    }

    getFarmDefinition(map, tileAction) {
        return this.stageDefinitions[map]?.[tileAction.name];
    }

    async getStageForPlot(nftId, map, tileAction, plot, farmDefinition, world) {
        if (!plot) {
            return this.decorateRequirements(nftId, {
                key: "prepare",
                name: farmDefinition.prepare.name,
                playAnimation: true,
                duration: farmDefinition.prepare.duration,
                optimisticStage: {
                    tile: farmDefinition.prepare.tile,
                    stage: 0,
                },
                requirements: {
                    level: this.getRequiredLevel(farmDefinition.minLevel),
                    tool: farmDefinition.prepare.tool,
                },
            });
        }

        if (plot.state === "prepared") {
            const cropChoices = await this.getCropChoices(nftId, farmDefinition, world, tileAction);
            return {
                key: "plant",
                name: "Plant seeds",
                requirements: { items: Object.keys(farmDefinition.crops) },
                itemChoices: cropChoices,
            };
        }

        const crop = farmDefinition.crops[plot.crop];
        if (!crop) {
            console.info("[tileStage.duckville] plot has no matching crop", JSON.stringify({
                map,
                tileAction,
                plot: this.describePlot(plot),
                cropKeys: Object.keys(farmDefinition.crops || {}),
            }));
            return null;
        }

        if (plot.state === "planted") {
            return this.decorateRequirements(nftId, {
                key: "water",
                name: "Water " + this.cropName(crop),
                playAnimation: true,
                duration: farmDefinition.water.duration,
                optimisticStage: this.getOptimisticCropStage(crop, 1),
                requirements: { tool: farmDefinition.water.tool },
            });
        }

        if (plot.state === "growing") {
            if (this.isReady(plot)) {
                return {
                    key: "harvest",
                    name: "Harvest " + this.cropName(crop),
                    playAnimation: true,
                    duration: 2,
                    optimisticStage: { clear: true },
                };
            }

            const boostChoices = await this.getBoostChoices(nftId, farmDefinition, plot);
            if (Object.keys(boostChoices).length > 0) {
                return {
                    key: "boost",
                    name: "Tend " + this.cropName(crop),
                    requirements: { items: Object.keys(boostChoices) },
                    itemChoices: boostChoices,
                };
            }

            return {
                key: "wait",
                name: "Growing " + this.cropName(crop),
                waiting: true,
                message: this.cropName(crop) + " will be ready in " + this.formatRemaining(plot.readyAt),
            };
        }

        return null;
    }

    describePlot(plot) {
        if (!plot) {
            return null;
        }

        return {
            keys: Object.keys(plot),
            mapId: plot.mapId,
            x: plot.x,
            y: plot.y,
            state: plot.state,
            crop: plot.crop,
            ownerNftId: plot.ownerNftId,
            isEmptyObject: Object.keys(plot).length === 0,
        };
    }

    describeStage(stage) {
        if (!stage) {
            return null;
        }

        return {
            key: stage.key,
            name: stage.name,
            waiting: stage.waiting,
            inProgress: stage.inProgress,
            requirements: stage.requirements,
            hasTool: stage.hasTool,
            optimisticStage: stage.optimisticStage,
            itemChoiceKeys: stage.itemChoices ? Object.keys(stage.itemChoices) : undefined,
        };
    }

    async decorateRequirements(nftId, stage) {
        if (stage.requirements?.tool) {
            const toolKind = Types.Entities[stage.requirements.tool];
            stage.hasTool = await this.hasItem(nftId, toolKind);
        }
        return stage;
    }

    async getCropChoices(nftId, farmDefinition, world, tileAction) {
        const playerLevel = await this.getPlayerLevel(nftId, world);
        const seedCounts = {};
        const choices = {};

        for (const cropKey of Object.keys(farmDefinition.crops)) {
            const crop = farmDefinition.crops[cropKey];
            const plantingAllowed = this.canPlantCropOnTile(crop, farmDefinition, tileAction);
            const seedItem = this.getSeedItem(crop, farmDefinition);
            const seedKind = Types.Entities[seedItem];
            if (seedCounts[seedItem] === undefined) {
                seedCounts[seedItem] = await this.getCount(nftId, seedKind);
            }
            const seedCount = seedCounts[seedItem];
            choices[cropKey] = {
                title: this.titleForCrop(crop),
                count: seedCount,
                imageItem: this.getYieldItem(cropKey, crop),
                seedItem,
                yieldItem: this.getYieldItem(cropKey, crop),
                plantType: this.getCropPlantType(crop),
                optimisticStage: this.getOptimisticCropStage(crop, 0),
                disabled: !plantingAllowed || seedCount < crop.seedCost || this.isLevelLocked(playerLevel, crop.level),
                detail: this.cropDetail(crop, playerLevel, seedCount, plantingAllowed, tileAction, farmDefinition),
            };
        }

        return choices;
    }

    async getBoostChoices(nftId, farmDefinition, plot) {
        const choices = {};
        for (const boost of farmDefinition.careBoosts || []) {
            const used = plot.boosts?.[boost.item] || 0;
            if (used >= boost.maxUses) {
                continue;
            }

            const itemKind = Types.Entities[boost.item];
            const count = await this.getCount(nftId, itemKind);
            if (count <= 0) {
                continue;
            }

            choices[boost.item] = {
                title: boost.name,
                count,
                imageItem: boost.item,
                disabled: false,
            };
        }
        return choices;
    }

    async preparePlot(nftId, map, tileAction, farmDefinition, world) {
        const playerLevel = await this.getPlayerLevel(nftId, world);
        if (this.isLevelLocked(playerLevel, farmDefinition.minLevel)) {
            return this.fail(world, nftId, "You need level " + farmDefinition.minLevel + " to prepare this land.");
        }

        if (!await this.hasItem(nftId, Types.Entities[farmDefinition.prepare.tool])) {
            return this.fail(world, nftId, "You need a shovel to prepare this land.");
        }

        const plot = this.createPlot(map, tileAction, nftId, "prepared", null, farmDefinition.prepare.tile);
        await this.savePlot(plot);
        this.setTileActionStage(map, tileAction, plot);
        world.placeStagedTile(tileAction.gridX, tileAction.gridY, farmDefinition.prepare.tile, 0);
        await this.giveAvatarXp(world, nftId, farmDefinition.prepare.xp);
        return this.success(world, nftId, "The soil is ready.");
    }

    async plantCrop(nftId, map, tileAction, cropKey, farmDefinition, world) {
        const crop = farmDefinition.crops[cropKey];
        if (!crop) {
            return this.fail(world, nftId, "Choose a crop to plant.");
        }

        if (!this.canPlantCropOnTile(crop, farmDefinition, tileAction)) {
            return this.fail(world, nftId, this.getPlantTypeMismatchMessage(crop, tileAction, farmDefinition));
        }

        const playerLevel = await this.getPlayerLevel(nftId, world);
        if (this.isLevelLocked(playerLevel, crop.level)) {
            return this.fail(world, nftId, "You need level " + crop.level + " to plant " + this.cropName(crop) + ".");
        }

        const seedItem = this.getSeedItem(crop, farmDefinition);
        const seedKind = Types.Entities[seedItem];
        if (!seedKind) {
            return this.fail(world, nftId, "This crop has no valid seed item.");
        }
        const seedCount = await this.getCount(nftId, seedKind);
        if (seedCount < crop.seedCost) {
            return this.fail(world, nftId, "You need " + crop.seedCost + " seed packet" + (crop.seedCost === 1 ? "" : "s") + ".");
        }

        await this.dao.updateResourceBalance(nftId, seedKind, -crop.seedCost);
        this.applyInventoryTransactions([{ nftId, itemId: seedKind, quantity: -crop.seedCost }]);
        const now = this.now();
        const plot = this.createPlot(map, tileAction, nftId, "planted", cropKey, crop.tile, crop.tileGroup);
        plot.plantedAt = now;
        plot.quality = 0;
        plot.boosts = {};

        await this.savePlot(plot);
        this.setTileActionStage(map, tileAction, plot);
        this.placeCropStage(world, tileAction, crop, 0);
        return this.success(world, nftId, "You planted " + this.cropName(crop) + ".");
    }

    async waterCrop(nftId, map, tileAction, plot, farmDefinition, world) {
        const crop = farmDefinition.crops[plot.crop];
        if (!await this.hasItem(nftId, Types.Entities[farmDefinition.water.tool])) {
            return this.fail(world, nftId, "You need a watering can.");
        }

        const now = this.now();
        plot.state = "growing";
        plot.wateredAt = now;
        plot.readyAt = now + crop.growSeconds * 1000;
        plot.stage = 1;

        await this.savePlot(plot);
        this.setTileActionStage(map, tileAction, plot);
        this.placeCropStage(world, tileAction, crop, 1);
        this.schedulePlotStageUpdates(map, tileAction, plot, crop, world);
        await this.giveAvatarXp(world, nftId, farmDefinition.water.xp);
        return this.success(world, nftId, this.cropName(crop) + " is watered.");
    }

    async boostCrop(nftId, map, tileAction, boostItem, plot, farmDefinition, world) {
        const boost = (farmDefinition.careBoosts || []).find((candidate) => candidate.item === boostItem);
        if (!boost) {
            return this.fail(world, nftId, "Choose something useful for this crop.");
        }

        plot.boosts = plot.boosts || {};
        if ((plot.boosts[boost.item] || 0) >= boost.maxUses) {
            return this.fail(world, nftId, "This plot already has enough " + boost.name.toLowerCase() + ".");
        }

        const itemKind = Types.Entities[boost.item];
        if (!await this.hasItem(nftId, itemKind)) {
            return this.fail(world, nftId, "You do not have " + boost.name.toLowerCase() + ".");
        }

        await this.dao.updateResourceBalance(nftId, itemKind, -1);
        this.applyInventoryTransactions([{ nftId, itemId: itemKind, quantity: -1 }]);
        plot.boosts[boost.item] = (plot.boosts[boost.item] || 0) + 1;
        plot.quality = (plot.quality || 0) + (boost.quality || 0);
        plot.yieldBonus = (plot.yieldBonus || 0) + (boost.yieldBonus || 0);
        plot.rareChanceBonus = (plot.rareChanceBonus || 0) + (boost.rareChanceBonus || 0);

        await this.savePlot(plot);
        this.setTileActionStage(map, tileAction, plot);
        return this.success(world, nftId, boost.name + " helped the crop along.");
    }

    async harvestCrop(nftId, map, tileAction, plot, farmDefinition, world) {
        const crop = farmDefinition.crops[plot.crop];
        if (!this.canHarvest(nftId, plot)) {
            return this.fail(world, nftId, "Only the planter can harvest this crop right now.");
        }

        if (!this.isReady(plot)) {
            return this.fail(world, nftId, this.cropName(crop) + " will be ready in " + this.formatRemaining(plot.readyAt) + ".");
        }

        const harvestItem = Types.Entities[this.getYieldItem(plot.crop, crop)];
        if (!harvestItem) {
            return this.fail(world, nftId, "This crop has no valid harvest item.");
        }
        const seedItem = Types.Entities[this.getSeedItem(crop, farmDefinition)];
        const yieldAmount = this.rollYield(crop, plot);
        const transactions = [
            { nftId, itemId: harvestItem, quantity: yieldAmount },
        ];

        if (seedItem && this.random() < (crop.seedReturnChance || 0)) {
            transactions.push({ nftId, itemId: seedItem, quantity: 1 });
        }

        this.rollRareDrops(crop, plot).forEach((rareDrop) => {
            transactions.push({ nftId, itemId: rareDrop.itemId, quantity: rareDrop.quantity });
        });

        await this.dao.updateResourceBalance(transactions);
        this.applyInventoryTransactions(transactions);
        await this.giveAvatarXp(world, nftId, crop.xp + (plot.quality || 0) * 10);
        await this.deletePlot(map, tileAction);
        this.clearTileActionStage(map, tileAction);
        this.clearPlotStageTimers(map, tileAction);
        world.clearStagedTile(tileAction.gridX, tileAction.gridY);
        return this.success(world, nftId, "Harvested " + yieldAmount + " " + this.cropName(crop) + ".");
    }

    createPlot(map, tileAction, ownerNftId, state, crop, tile, tileGroup) {
        return {
            mapId: map,
            x: tileAction.gridX,
            y: tileAction.gridY,
            ownerNftId,
            crop,
            state,
            stage: 0,
            tile,
            tileGroup,
            createdAt: this.now(),
        };
    }

    async loadPersistedPlots(map, world) {
        if (this.loadedMaps[map]) {
            return;
        }

        this.loadedMaps[map] = true;
        const plots = await this.dao.loadFarmPlots(map);
        console.info("[tileStage.duckville] persisted plots", JSON.stringify({
            map,
            type: Array.isArray(plots) ? "array" : typeof plots,
            count: Array.isArray(plots) ? plots.length : undefined,
        }));
        for (const plot of plots || []) {
            const tileAction = { gridX: plot.x, gridY: plot.y, name: "farm" };
            this.setTileActionStage(map, tileAction, plot);
            if (world) {
                const crop = this.stageDefinitions[map]?.farm?.crops?.[plot.crop];
                if (crop) {
                    const visualStage = this.getVisualStage(plot, crop);
                    this.placeCropStage(world, tileAction, crop, visualStage);
                    this.schedulePlotStageUpdates(map, tileAction, plot, crop, world);
                } else if (plot.state === "prepared" && this.stageDefinitions[map]?.farm?.prepare?.tile) {
                    world.placeStagedTile(plot.x, plot.y, this.stageDefinitions[map].farm.prepare.tile, 0);
                }
            }
        }
    }

    async getPlot(map, tileAction) {
        const cached = this.tileStages[map]?.[this.getPositionKey(tileAction)];
        if (cached) {
            return cached;
        }

        const plot = await this.dao.loadFarmPlot(map, tileAction.gridX, tileAction.gridY);
        console.info("[tileStage.duckville] loaded plot", JSON.stringify({
            map,
            tileAction,
            plot: this.describePlot(plot),
        }));
        if (plot) {
            this.setTileActionStage(map, tileAction, plot);
        }
        return plot;
    }

    async savePlot(plot) {
        console.info("[tileStage.duckville] save plot", JSON.stringify({
            plot: this.describePlot(plot),
        }));
        try {
            await this.dao.saveFarmPlot(plot);
        } catch (error) {
            if (this.isFarmPersistenceUnavailable(error)) {
                console.warn("[tileStage.duckville] farm persistence unavailable; continuing with local plot state", JSON.stringify({
                    plot: this.describePlot(plot),
                    message: error?.message,
                }));
                return;
            }
            throw error;
        }
    }

    async deletePlot(map, tileAction) {
        try {
            await this.dao.deleteFarmPlot(map, tileAction.gridX, tileAction.gridY);
        } catch (error) {
            if (this.isFarmPersistenceUnavailable(error)) {
                console.warn("[tileStage.duckville] farm persistence unavailable; continuing with local plot delete", JSON.stringify({
                    map,
                    tileAction,
                    message: error?.message,
                }));
                return;
            }
            throw error;
        }
    }

    isFarmPersistenceUnavailable(error) {
        return error?.message?.includes("status: 404") || error?.message?.includes("status: 405");
    }

    setTileActionStage(map, tileAction, plot) {
        if (!this.tileStages[map]) {
            this.tileStages[map] = {};
        }
        this.tileStages[map][this.getPositionKey(tileAction)] = plot;
    }

    clearTileActionStage(map, tileAction) {
        if (this.tileStages[map]) {
            delete this.tileStages[map][this.getPositionKey(tileAction)];
        }
    }

    placeCropStage(world, tileAction, crop, visualStage) {
        if (crop.tileGroup) {
            const stagedTile = crop.stagedTile || crop.tile;
            if (crop.renderOffset && stagedTile) {
                world.placeStagedTileGroup(tileAction.gridX, tileAction.gridY, crop.tileGroup, visualStage, crop.renderOffset, stagedTile);
            } else if (crop.renderOffset) {
                world.placeStagedTileGroup(tileAction.gridX, tileAction.gridY, crop.tileGroup, visualStage, crop.renderOffset);
            } else if (stagedTile) {
                world.placeStagedTileGroup(tileAction.gridX, tileAction.gridY, crop.tileGroup, visualStage, null, stagedTile);
            } else {
                world.placeStagedTileGroup(tileAction.gridX, tileAction.gridY, crop.tileGroup, visualStage);
            }
        } else {
            world.placeStagedTile(tileAction.gridX, tileAction.gridY, crop.tile, visualStage);
        }
    }

    getOptimisticCropStage(crop, visualStage) {
        if (crop.tileGroup) {
            const optimisticStage = {
                tileGroup: crop.tileGroup,
                stage: visualStage,
            };
            if (crop.renderOffset) {
                optimisticStage.renderOffset = crop.renderOffset;
            }
            if (crop.stagedTile || crop.tile) {
                optimisticStage.stagedTile = crop.stagedTile || crop.tile;
            }
            return optimisticStage;
        }

        return {
            tile: crop.tile,
            stage: visualStage,
        };
    }

    async refreshVisualStage(map, tileAction, plot, farmDefinition, world) {
        if (!plot || plot.state !== "growing" || !world) {
            return;
        }

        const crop = farmDefinition.crops[plot.crop];
        if (!crop) {
            return;
        }

        const visualStage = this.getVisualStage(plot, crop);
        if (plot.stage === visualStage) {
            return;
        }

        plot.stage = visualStage;
        await this.savePlot(plot);
        this.setTileActionStage(map, tileAction, plot);
        this.placeCropStage(world, tileAction, crop, visualStage);
        this.schedulePlotStageUpdates(map, tileAction, plot, crop, world);
    }

    schedulePlotStageUpdates(map, tileAction, plot, crop, world) {
        this.clearPlotStageTimers(map, tileAction);
        if (!world || !plot || plot.state !== "growing" || !plot.wateredAt || !plot.readyAt || !crop?.stages) {
            return;
        }

        const duration = plot.readyAt - plot.wateredAt;
        if (duration <= 0) {
            return;
        }

        const currentStage = this.getVisualStage(plot, crop);
        for (let visualStage = currentStage + 1; visualStage < crop.stages; visualStage += 1) {
            const stageAt = plot.wateredAt + Math.ceil(duration * (visualStage / crop.stages));
            const delay = stageAt - this.now();
            if (delay <= 0) {
                continue;
            }

            const timerKey = this.getStageTimerKey(map, tileAction, visualStage);
            const timer = setTimeout(async () => {
                try {
                    const currentPlot = await this.getPlot(map, tileAction);
                    if (!currentPlot || currentPlot.state !== "growing" || currentPlot.crop !== plot.crop) {
                        return;
                    }

                    const nextStage = this.getVisualStage(currentPlot, crop);
                    if ((currentPlot.stage || 0) >= nextStage) {
                        return;
                    }

                    currentPlot.stage = nextStage;
                    await this.savePlot(currentPlot);
                    this.setTileActionStage(map, tileAction, currentPlot);
                    this.placeCropStage(world, tileAction, crop, nextStage);
                } catch (error) {
                    console.error("schedulePlotStageUpdates", error);
                } finally {
                    delete this.stageTimers[timerKey];
                }
            }, delay);

            if (timer.unref) {
                timer.unref();
            }
            this.stageTimers[timerKey] = timer;
        }
    }

    clearPlotStageTimers(map, tileAction) {
        const prefix = this.getPlotKey(map, tileAction) + ".";
        Object.keys(this.stageTimers).forEach((timerKey) => {
            if (!timerKey.startsWith(prefix)) {
                return;
            }

            clearTimeout(this.stageTimers[timerKey]);
            delete this.stageTimers[timerKey];
        });
    }

    getVisualStage(plot, crop) {
        if (plot.state === "prepared") {
            return 0;
        }
        if (plot.state === "planted") {
            return 0;
        }
        if (!plot.readyAt || !plot.wateredAt) {
            return plot.stage || 0;
        }

        const progress = Math.max(0, Math.min(1, (this.now() - plot.wateredAt) / (plot.readyAt - plot.wateredAt)));
        return Math.min(crop.stages - 1, Math.max(1, Math.floor(progress * crop.stages)));
    }

    isReady(plot) {
        return plot.readyAt && this.now() >= plot.readyAt;
    }

    canHarvest(nftId, plot) {
        return plot.ownerNftId === nftId || (plot.readyAt && this.now() - plot.readyAt >= DAY_MS);
    }

    rollYield(crop, plot) {
        const range = crop.yield.max - crop.yield.min + 1;
        return crop.yield.min + Math.floor(this.random() * range) + (plot.yieldBonus || 0) + (plot.quality || 0);
    }

    rollRareDrops(crop, plot) {
        const rareDrops = crop.rareDrops || (crop.rareDrop ? [crop.rareDrop] : []);
        return rareDrops
            .filter((rareDrop) => this.random() < (rareDrop.chance || 0) + (plot.rareChanceBonus || 0))
            .map((rareDrop) => ({
                itemId: Types.Entities[rareDrop.item],
                quantity: rareDrop.amount || 1,
            }))
            .filter((rareDrop) => rareDrop.itemId);
    }

    async hasItem(nftId, itemKind) {
        return (await this.getCount(nftId, itemKind)) > 0;
    }

    async getCount(nftId, itemKind) {
        if (!itemKind) {
            return 0;
        }
        const count = await this.dao.getItemCount(nftId, itemKind);
        return parseInt(count || 0);
    }

    async getPlayerLevel(nftId, world) {
        const player = this.getPlayer(world, nftId);
        if (player?.getLevel) {
            return player.getLevel();
        }
        if (player?.level !== undefined) {
            return player.level;
        }

        const session = this.getSessionForNft(nftId);
        if (session?.xp !== undefined) {
            return Formulas.level(session.xp);
        }
        return 1;
    }

    async giveAvatarXp(world, nftId, xp) {
        const player = this.getPlayer(world, nftId);
        if (player?.handleExperience) {
            await player.handleExperience(xp);
        }
    }

    getPlayer(world, nftId) {
        return _.find(world?.players || {}, (player) => player.nftId === nftId);
    }

    getSessionForNft(nftId) {
        const keys = this.cache?.keys ? this.cache.keys() : [];
        for (const key of keys) {
            const session = this.cache.get(key);
            if (session?.nftId === nftId) {
                return session;
            }
        }
        return null;
    }

    applyInventoryTransactions(transactions) {
        const keys = this.cache?.keys ? this.cache.keys() : [];
        for (const key of keys) {
            const session = this.cache.get(key);
            if (!session?.nftId) {
                continue;
            }

            const sessionTransactions = transactions.filter((transaction) => transaction.nftId === session.nftId);
            if (sessionTransactions.length === 0) {
                continue;
            }

            session.gameData = session.gameData || {};
            session.gameData.items = session.gameData.items || {};
            for (const transaction of sessionTransactions) {
                const itemKey = String(transaction.itemId);
                const currentCount = parseInt(session.gameData.items[itemKey] || 0);
                const nextCount = currentCount + transaction.quantity;
                if (nextCount > 0) {
                    session.gameData.items[itemKey] = nextCount;
                } else {
                    delete session.gameData.items[itemKey];
                }
            }

            if (this.cache.set) {
                this.cache.set(key, session);
            }
        }
    }

    notifyPlayer(world, nftId, message) {
        const player = this.getPlayer(world, nftId);
        if (player && world?.sendNotifications) {
            world.sendNotifications(player, message);
        }
    }

    fail(world, nftId, message) {
        this.notifyPlayer(world, nftId, message);
        return { success: false, message };
    }

    success(world, nftId, message) {
        this.notifyPlayer(world, nftId, message);
        return { success: true, message };
    }

    titleForCrop(crop) {
        return this.cropName(crop);
    }

    cropName(crop) {
        if (crop.displayName) {
            return crop.displayName;
        }

        const rawName = String(crop.name || "");
        const pottedMatch = rawName.match(/^(.+)Potted$/);
        if (pottedMatch) {
            return "Potted " + this.humanizeCropName(pottedMatch[1]).toLowerCase();
        }

        return this.humanizeCropName(rawName);
    }

    humanizeCropName(name) {
        return String(name || "")
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/^./, (character) => character.toUpperCase());
    }

    getSeedItem(crop, farmDefinition) {
        return crop.seedItem || farmDefinition.seedItem || "M88NSEEDS";
    }

    getYieldItem(cropKey, crop) {
        return crop.yieldItem || cropKey;
    }

    getCropPlantType(crop) {
        if (crop.plantType) {
            return crop.plantType;
        }

        if ((crop.tileGroup || "").toLowerCase().startsWith("tree") || (crop.name || "").toLowerCase().includes("tree")) {
            return "tree";
        }

        return "crop";
    }

    getAllowedPlantTypes(tileAction, farmDefinition) {
        const allowedPlantTypes = tileAction?.allowedPlantTypes || farmDefinition.allowedPlantTypes || ["crop", "tree"];
        if (Array.isArray(allowedPlantTypes)) {
            return allowedPlantTypes;
        }

        return String(allowedPlantTypes)
            .split(",")
            .map((plantType) => plantType.trim())
            .filter(Boolean);
    }

    canPlantCropOnTile(crop, farmDefinition, tileAction) {
        return this.getAllowedPlantTypes(tileAction, farmDefinition).includes(this.getCropPlantType(crop));
    }

    getPlantTypeMismatchMessage(crop, tileAction, farmDefinition) {
        const allowedPlantTypes = this.getAllowedPlantTypes(tileAction, farmDefinition);
        if (allowedPlantTypes.length === 1 && (allowedPlantTypes[0] === "pot" || allowedPlantTypes[0] === "potted")) {
            return this.cropName(crop) + " needs open farmland.";
        }

        if (this.getCropPlantType(crop) === "pot" || this.getCropPlantType(crop) === "potted") {
            return this.cropName(crop) + " needs a pot.";
        }

        return this.cropName(crop) + " cannot be planted here.";
    }

    getRequiredLevel(level) {
        return this.disableLevelGate ? 0 : level;
    }

    isLevelLocked(playerLevel, requiredLevel) {
        return !this.disableLevelGate && playerLevel < requiredLevel;
    }

    cropDetail(crop, playerLevel, seedCount, plantingAllowed = true, tileAction = null, farmDefinition = null) {
        if (!plantingAllowed) {
            return this.getPlantTypeMismatchMessage(crop, tileAction, farmDefinition);
        }
        if (this.isLevelLocked(playerLevel, crop.level)) {
            return "Level " + crop.level;
        }
        if (seedCount < crop.seedCost) {
            return crop.seedCost + " seeds";
        }
        return Math.ceil(crop.growSeconds / 60) + " min";
    }

    formatRemaining(readyAt) {
        const remaining = Math.max(0, readyAt - this.now());
        const seconds = Math.ceil(remaining / 1000);
        if (seconds < 60) {
            return seconds + "s";
        }
        return Math.ceil(seconds / 60) + "m";
    }

    getPositionKey(tileAction) {
        return tileAction.gridX + "." + tileAction.gridY;
    }

    getPlotKey(map, tileAction) {
        return map + "." + this.getPositionKey(tileAction);
    }

    getStageTimerKey(map, tileAction, visualStage) {
        return this.getPlotKey(map, tileAction) + "." + visualStage;
    }
}

module.exports = DuckvilleTileActionsController;

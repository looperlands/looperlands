const DuckvilleTileActionsController = require("./tileactions/duckvillecontroller");

class TileActionsController {
    constructor(cache, platformClient, options = {}) {
        const duckvilleController = options.duckvilleController || new DuckvilleTileActionsController(cache, platformClient, options);

        this.controllers = {};
        this.stageDefinitions = {};

        this.registerMapController("duckville", duckvilleController);

        Object.entries(options.controllers || {}).forEach(([map, controller]) => {
            this.registerMapController(map, controller);
        });
    }

    registerMapController(map, controller) {
        this.controllers[map] = controller;

        if (controller?.stageDefinitions?.[map]) {
            this.stageDefinitions[map] = controller.stageDefinitions[map];
        }
    }

    getController(map) {
        return this.controllers[map] || null;
    }

    async findCurrentStage(nftId, map, tileAction, world) {
        const controller = this.getController(map);
        if (!controller?.findCurrentStage) {
            return null;
        }

        return await controller.findCurrentStage(nftId, map, tileAction, world);
    }

    async executeStage(nftId, map, tileAction, item, world) {
        const controller = this.getController(map);
        if (!controller?.executeStage) {
            return { success: false };
        }

        return await controller.executeStage(nftId, map, tileAction, item, world);
    }

    async loadPersistedPlots(map, world) {
        const controller = this.getController(map);
        if (!controller?.loadPersistedPlots) {
            return;
        }

        await controller.loadPersistedPlots(map, world);
    }
}

module.exports = TileActionsController;

const Types = require("../../shared/js/gametypes");

const DuckvilleTileActionsController = require("./tileactions/duckvillecontroller");

class TileActionsController {
    constructor(cache, platformClient, options = {}) {
        const duckvilleController = options.duckvilleController || new DuckvilleTileActionsController(cache, platformClient, options);

        this.activeAnimations = new WeakMap();
        this.controllers = {};
        this.stageDefinitions = {};

        this.registerMapController("duckville", duckvilleController);
        Object.keys(duckvilleController.stageDefinitions || {}).forEach((map) => {
            this.registerMapController(map, duckvilleController);
        });

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

        const stage = await controller.findCurrentStage(nftId, map, tileAction, world);
        if (!stage) return stage;
        const sprite = Types.getToolAnimationSprite(Types.Entities[stage.requirements?.tool]);
        return sprite ? { ...stage, animationSprite: sprite } : stage;
    }

    async startStage(player, map, tileAction, world, expectedStage, expectedRevision) {
        const sessionId = player.sessionId;
        const stage = await this.findCurrentStage(player.nftId, map, tileAction, world);
        if (stage?.requirements?.level && player.getLevel() < stage.requirements.level) {
            return {success: false, message: "You need level " + stage.requirements.level + " for this action."};
        }
        if ((expectedStage !== undefined && stage?.key !== expectedStage) ||
            (expectedRevision !== undefined && stage?.revision !== expectedRevision) ||
            !stage?.playAnimation || stage.waiting || stage.inProgress ||
            (stage.requirements?.tool && stage.hasTool !== true) ||
            (stage.requirements?.level && player.getLevel() < stage.requirements.level)) {
            return { success: false, message: "This action is not available." };
        }
        // Ownership/stage lookup is asynchronous: validate the active actor again.
        if (world.getPlayerById(player.id) !== player || player.sessionId !== sessionId || !player.hasEnteredGame ||
            Math.max(Math.abs(player.x - tileAction.gridX), Math.abs(player.y - tileAction.gridY)) > 1) {
            return { success: false, message: "Move next to the tile to use it." };
        }
        const orientation = tileAction.gridX < player.x ? Types.Orientations.LEFT
            : tileAction.gridX > player.x ? Types.Orientations.RIGHT
            : tileAction.gridY < player.y ? Types.Orientations.UP
            : tileAction.gridY > player.y ? Types.Orientations.DOWN : player.orientation;
        const seconds = Number(stage.duration ?? 1);
        if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 30) {
            return { success: false, message: "Invalid action duration." };
        }
        if ((this.activeAnimations.get(player) || 0) > Date.now()) {
            return { success: false, message: "An action is already in progress." };
        }
        this.activeAnimations.set(player, Date.now() + seconds * 1000);
        const state = { entityId: player.id, orientation, duration: seconds * 1000,
            animationSprite: stage.animationSprite || null,
            tileX: tileAction.gridX, tileY: tileAction.gridY,
            impactFeedback: Types.getKindOptions(Types.Entities[stage.requirements?.tool]).impactFeedback || null };
        const Messages = require("./message");
        world.pushToAdjacentGroups(player.group, new Messages.TileAction(state), player.id);
        return { success: true, stage, animation: state };
    }

    async executeStage(nftId, map, tileAction, item, world, expectedStage, expectedRevision) {
        const controller = this.getController(map);
        if (!controller?.executeStage) {
            return { success: false };
        }

        return await controller.executeStage(nftId, map, tileAction, item, world, expectedStage, expectedRevision);
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

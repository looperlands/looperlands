const _ = require("underscore");

const duckville = require("../../client/tileActions/duckville.json");
const Collectables = require("./collectables");
const dao = require('./dao.js');
const Types = require("../../shared/js/gametypes");

class TileActionsController {
    constructor(cache, platformClient) {
        this.cache = cache;
        this.platformClient = platformClient;
        this.stageDefinitions = {
            duckville: duckville,
        };
        this.tileStages = {};
    }

    async findCurrentStage(nftId, map, tileAction, game) {
        try {
            const stageDefinition = this.stageDefinitions[map][tileAction.name];

            if (!this.tileStages[map]) {
                this.tileStages[map] = {};
            }

            const stage = this.tileStages[map][tileAction.gridX + '.' + tileAction.gridY]

            if(!stage) {
                return stageDefinition.stages[0];
            }

            if (stage.inProgress) {
                return null;
            }

            if (stage.requirements && stage.requirements.items) {
                let itemChoices = {};
                for (let i = 0; i < stage.requirements.items.length; i++) {
                    let item = stage.requirements.items[i];

                    itemChoices[item] = {
                        title: Collectables.getInventoryDescription(Types.Entities[item]),
                        count:  await dao.getItemCount(nftId, Types.Entities[item]),
                    };
                }
                stage.itemChoices = itemChoices
            }

            return stage;
        } catch (error) {
            return null;
        }
    }

    async executeStage(nftId, map, tileAction, item, game) {
        const self = this;
        const stage = await this.findCurrentStage(nftId, map, tileAction);
        if (!stage) {
            return;
        }

        if (!this.checkRequirements(stage.requirements)) {
            return;
        }

        this.tileStages[map][tileAction.gridX + '.' + tileAction.gridY] = JSON.parse(JSON.stringify(stage));

        if(!stage.duration) {
            this.executeActions(stage, tileAction, stage.actions, item, game);
            this.giveRewards(stage.rewards, item);
        } else {
            setTimeout(() => {
                this.executeActions(stage, tileAction, stage.actions, item, game);
                this.giveRewards(stage.rewards, item);
            }, stage.duration * 1000);
        }

        if (stage.wait) {
            stage.inProgress = true;
            setTimeout(() => {
                stage.inProgress = false;
                self.toNextStage(map, stage.nextStage, item, tileAction);
            }, stage.wait * 1000);
        } else {
            this.toNextStage(map, stage.nextStage, item, tileAction);
        }
    }

    checkRequirements(requirements) {
        if(!requirements) {
            return true;
        }

        return _.all(requirements, function(requirement) {
            return this.checkRequirement(requirement);
        }, this);
    }

    checkRequirement(requirement) {
        // TODO
        return true;
    }

    executeActions(stage, tileAction, actions, item, world) {
        _.each(actions, function(action, index) {
            if(index === item || item === undefined || item === null) {
                this.executeAction(stage, tileAction, action, world);
            }
        }, this);
    }

    executeAction(stage, tileAction, action, world) {
        switch(action.type) {
            case 'placeStagedTile': this.placeStagedTile(stage, tileAction, action, world); break;
            case 'placeStagedTileGroup': this.placeStagedTileGroup(stage, tileAction, action, world); break;
            case 'progressStage': this.progressStage(stage, tileAction, action, world); break;
        }
    }


    placeStagedTile(stage, tileAction, action, world) {
        world.placeStagedTile(tileAction.gridX, tileAction.gridY, action.tile);
    }

    placeStagedTileGroup(stage, tileAction, action, world) {
        world.placeStagedTileGroup(tileAction.gridX, tileAction.gridY, action.tileGroup);
    }

    progressStage(stage, tileAction, action, world) {
        world.progressStage(tileAction.gridX, tileAction.gridY);
    }

    giveRewards(rewards) {
        _.each(rewards, function(reward) {
            this.giveReward(reward);
        }, this);
    }

    giveReward(reward) {
        // TODO
    }

    toNextStage(map, nextStage, item, tileAction) {
        if(!nextStage) {
            delete this.tileStages[map][tileAction.gridX + '.' + tileAction.gridY];
            return;
        }

        if(_.isObject(nextStage)) {
            this.tileStages[map][tileAction.gridX + '.' + tileAction.gridY] = this.getStage(map, tileAction.name, nextStage[item]);
        } else {
            this.tileStages[map][tileAction.gridX + '.' + tileAction.gridY] = this.getStage(map, tileAction.name, nextStage);
        }
    }

    getStage(map, action, stage) {
        return _.clone(_.find(this.stageDefinitions[map][action].stages, function(stageDefinition) {
            return stageDefinition.key === stage;
        }));
    }
}

module.exports = TileActionsController;
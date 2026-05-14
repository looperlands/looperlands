define(['../../shared/js/gametypes'], function () {
    return Class.extend({
        init: function (game) {
            this.game = game;
            this.stageDefinitions = {};
            this.activeStages = {};
        },

        findCurrentStage: function (tileAction) {
            const url = '/session/' + this.game.sessionId + '/tileStage';
            return axios.post(url, {map: this.game.mapId, tileAction: tileAction})
                .then(function (response) {
                    return response.data;
                })
                .catch(function (error) {
                    console.error("Error while checking the trigger:", error);
                    throw error; // Ensure the error propagates
                });
        },

        executeStage: function (tileAction, stage, selectedItem) {
            if(!stage || stage.inProgress) {
                return;
            }

            const activeKey = this.getTileActionKey(tileAction);
            if (this.activeStages[activeKey]) {
                return;
            }

            if (stage.requirements && stage.requirements.tool && stage.hasTool === false) {
                this.game.showNotification("You need a " + this.getToolDisplayName(stage.requirements.tool) + ".");
                return;
            }

            if (selectedItem === undefined && stage.requirements && stage.requirements.items) {
                this.game.app.showSelectionPopup(stage.name, stage.requirements.items.map((item) => {
                    const choice = stage.itemChoices[item];
                    const imageItem = (choice.imageItem || item).toLowerCase();
                    return {
                        value: item,
                        title: choice.detail ? (choice.title + ' (' + choice.detail + ')') : choice.title,
                        image: '/img/3/item-' + imageItem + '.png',
                        count: choice.count,
                        disabled: choice.disabled || (choice.count <= 0),
                        callback: (selectedItem) => {
                            this.executeStage(tileAction, stage, item);
                        }
                    };
                }));
            } else {
                const runStage = () => {
                    const url = '/session/' + this.game.sessionId + '/tileStage/execute';
                    return axios.post(url, {map: this.game.mapId, tileAction: tileAction, item: selectedItem})
                        .then((response) => {
                            if (!response.data || response.data.success !== false) {
                                this.refreshInventory();
                            }
                            return response;
                        })
                        .finally(() => {
                            stage.inProgress = false;
                            delete this.activeStages[activeKey];
                        });
                };

                if (stage.playAnimation) {
                    stage.inProgress = true;
                    this.activeStages[activeKey] = true;
                    const actionToolName = this.getStageToolSpriteName(stage);
                    if (actionToolName && this.game.sprites[actionToolName]) {
                        this.game.player.actionToolName = actionToolName;
                    }
                    let o = this.getTileOrientation(tileAction);
                    if(o === 'left') {
                        o = 'right';
                        this.game.player.flipSpriteX = true;
                    }
                    this.game.player.setAnimation('atk_' + o, this.game.player.atkSpeed);
                    const duration = (stage.duration) ? (stage.duration * 1000) : 1000;
                    const clearActionTool = () => {
                        if (this.game.player.actionToolName === actionToolName) {
                            delete this.game.player.actionToolName;
                        }
                    };
                    setTimeout(() => {
                        clearActionTool();
                        this.game.player.idle();
                    }, duration);
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            runStage()
                                .then(resolve)
                                .catch(reject)
                                .finally(clearActionTool);
                        }, duration);
                    });
                }

                this.activeStages[activeKey] = true;
                return runStage();
            }
        },

        getTileActionKey: function (tileAction) {
            return tileAction.gridX + '.' + tileAction.gridY;
        },

        refreshInventory: function () {
            if (!this.game.app) {
                return;
            }

            if (this.game.app.initResourcesDisplay) {
                this.game.app.initResourcesDisplay();
            }

            if (this.game.app.isInventoryVisible && this.game.app.showInventory) {
                this.game.app.showInventory();
            }
        },

        getStageToolSpriteName: function (stage) {
            if (!stage || !stage.requirements || !stage.requirements.tool) {
                return null;
            }

            return 'item-' + stage.requirements.tool.toLowerCase();
        },

        getToolDisplayName: function (tool) {
            const names = {
                M88NSHOVEL: 'shovel',
                M88NWATERCAN: 'watering can',
            };

            return names[tool] || tool.toLowerCase();
        },

        getTileOrientation: function (tileAction) {
            if(tileAction.gridX < this.game.player.gridX) {
                return 'left';
            } else if(tileAction.gridX > this.game.player.gridX) {
                return 'right';
            } else if(tileAction.gridY < this.game.player.gridY) {
                return 'up';
            } else if(tileAction.gridY > this.game.player.gridY) {
                return 'down';
            } else {
                return Types.getOrientationAsString(this.game.player.orientation);
            }
        }
    });
});

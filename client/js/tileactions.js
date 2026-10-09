define(['../../shared/js/gametypes'], function () {
    return Class.extend({
        init: function (game) {
            this.game = game;
            this.stageDefinitions = {};
            this.activeStages = {};
            this.actionAnimations = {};
        },

        findCurrentStage: function (tileAction) {
            const url = '/session/' + this.game.sessionId + '/tileStage';
            return axios.post(url, {map: this.game.mapId, tileAction: tileAction})
                .then((response) => {
                    this.cacheStage(tileAction, response.data);
                    return response.data;
                })
                .catch(function (error) {
                    console.error("Error while checking the trigger:", error);
                    throw error; // Ensure the error propagates
                });
        },

        getImmediateStage: function (tileAction) {
            const cachedStage = this.stageDefinitions[this.getTileActionKey(tileAction)];
            if (cachedStage) {
                return cachedStage;
            }

            return {
                name: this.getDefaultStageName(tileAction),
                speculative: true,
            };
        },

        cacheStage: function (tileAction, stage) {
            const key = this.getTileActionKey(tileAction);
            if (stage) {
                this.stageDefinitions[key] = stage;
            } else {
                delete this.stageDefinitions[key];
            }
        },

        executeStage: function (tileAction, stage, selectedItem) {
            if(!stage || stage.inProgress) {
                return;
            }

            if (stage.waiting) {
                if (stage.message) {
                    this.game.showNotification(stage.message);
                }
                this.cacheStage(tileAction, null);
                return;
            }

            if (this.localActionInProgress) return;

            const activeKey = this.getTileActionKey(tileAction);
            if (this.activeStages[activeKey]) {
                return;
            }

            if (stage.requirements && stage.requirements.tool && stage.hasTool === false) {
                this.game.showNotification("You need a " + this.getToolDisplayName(stage.requirements.tool) + ".");
                return;
            }

            if (selectedItem === undefined && stage.requirements && stage.requirements.items) {
                const selectionMap = this.game.mapId;
                const selectionSession = this.game.sessionId;
                this.game.app.showSelectionPopup(stage.name, stage.requirements.items.map((item) => {
                    const choice = stage.itemChoices[item];
                    const imageItem = (choice.imageItem || item).toLowerCase();
                    return {
                        value: item,
                        title: choice.detail ? (choice.title + ' (' + choice.detail + ')') : choice.title,
                        description: choice.description,
                        image: '/img/3/item-' + imageItem + '.png',
                        count: choice.count,
                        disabled: choice.disabled || (choice.count <= 0),
                        callback: (selectedItem) => {
                            if (this.game.mapId !== selectionMap || this.game.sessionId !== selectionSession) return;
                            return Promise.resolve(this.executeStage(tileAction, stage, item)).catch((error) => {
                                console.error("Tile action failed", error);
                                this.game.showNotification("Could not complete this action. Please try again.");
                            });
                        }
                    };
                }));
            } else {
                const runStage = () => {
                    const url = '/session/' + this.game.sessionId + '/tileStage/execute';
                    const optimisticState = this.applyOptimisticStage(tileAction, stage, selectedItem);
                    return axios.post(url, {map: this.game.mapId, tileAction: tileAction, item: selectedItem, expectedStage: stage.key, expectedRevision: stage.revision})
                        .then((response) => {
                            this.cacheStage(tileAction, null);
                            if (response.data && response.data.success === false) {
                                this.revertOptimisticStage(optimisticState);
                                if (response.data.message) {
                                    this.game.showNotification(response.data.message);
                                }
                            } else {
                                this.cacheStage(tileAction, null);
                                this.refreshInventory();
                            }
                            return response;
                        })
                        .catch((error) => {
                            this.revertOptimisticStage(optimisticState);
                            this.cacheStage(tileAction, null);
                            throw error;
                        })
                        .finally(() => {
                            stage.inProgress = false;
                            delete this.activeStages[activeKey];
                        });
                };

                if (stage.playAnimation) {
                    stage.inProgress = true;
                    this.activeStages[activeKey] = true;
                    this.localActionInProgress = true;
                    const player = this.game.player;
                    const mapId = this.game.mapId;
                    const sessionId = this.game.sessionId;
                    return axios.post('/session/' + this.game.sessionId + '/tileStage/start', {
                        map: mapId, tileAction, expectedStage: stage.key, expectedRevision: stage.revision,
                    }).then(async (response) => {
                        const result = response.data;
                        if (!result?.success) {
                            if (result?.message) this.game.showNotification(result.message);
                            return result;
                        }
                        if (this.game.player !== player || this.game.mapId !== mapId || this.game.sessionId !== sessionId || player.isDead || this.game.isStopped) return;
                        const completed = await this.showActionAnimation(result.animation);
                        if (!completed) return;
                        // Execute only after the approved animation; the server checks inventory again.
                        Object.assign(stage, result.stage);
                        return runStage();
                    }).finally(() => {
                        stage.inProgress = false;
                        delete this.activeStages[activeKey];
                        this.localActionInProgress = false;
                    });
                }

                this.activeStages[activeKey] = true;
                return runStage();
            }
        },

        getTileActionKey: function (tileAction) {
            return tileAction.gridX + '.' + tileAction.gridY;
        },

        getDefaultStageName: function (tileAction) {
            if (tileAction.name === "farm" || tileAction.name === "potFarm") {
                const key = this.getTileActionKey(tileAction);
                const hasStagedTile = Object.keys(this.game.tileStages || {}).some((stageKey) => {
                    return stageKey === key || stageKey.startsWith(key + ':');
                });
                return hasStagedTile ? "Tend plot" : "Prepare soil";
            }

            return "Use";
        },

        applyOptimisticStage: function (tileAction, stage, selectedItem) {
            const optimisticStage = this.getOptimisticStage(stage, selectedItem);
            if (!optimisticStage || !this.game.handleTileStage) {
                return null;
            }

            const baseKey = this.getTileActionKey(tileAction);
            const previousStages = {};
            Object.keys(this.game.tileStages || {}).forEach((key) => {
                if (key === baseKey || key.startsWith(baseKey + ':')) {
                    previousStages[key] = this.game.tileStages[key];
                }
            });

            this.game.handleTileStage(Object.assign({
                x: tileAction.gridX,
                y: tileAction.gridY,
            }, optimisticStage));

            return {
                tileAction,
                previousStages,
                mapId: this.game.mapId,
                sessionId: this.game.sessionId,
                revision: this.game.tileStageRevisions?.[baseKey] || 0,
            };
        },

        revertOptimisticStage: function (optimisticState) {
            if (!optimisticState || !this.game.handleTileStage) {
                return;
            }

            if (this.game.mapId !== optimisticState.mapId || this.game.sessionId !== optimisticState.sessionId) return;
            const tileAction = optimisticState.tileAction;
            const baseKey = this.getTileActionKey(tileAction);
            if ((this.game.tileStageRevisions?.[baseKey] || 0) !== optimisticState.revision) return;
            this.game.handleTileStage({
                x: tileAction.gridX,
                y: tileAction.gridY,
                clear: true,
            });

            Object.keys(optimisticState.previousStages).forEach((key) => {
                this.game.tileStages[key] = optimisticState.previousStages[key];
            });
        },

        getOptimisticStage: function (stage, selectedItem) {
            if (selectedItem && stage.itemChoices && stage.itemChoices[selectedItem]) {
                return stage.itemChoices[selectedItem].optimisticStage;
            }

            return stage.optimisticStage;
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

        showActionAnimation: function (state) {
            if (!state) return Promise.resolve(false);
            const entity = this.game.getEntityById(state.entityId);
            if (!entity || entity.isDead || !Number.isFinite(state.duration) || state.duration <= 0 || state.duration > 30000) {
                return Promise.resolve(false);
            }
            if (this.actionAnimations[entity.id]) this.actionAnimations[entity.id]();
            const mapId = this.game.mapId;
            const sessionId = this.game.sessionId;
            const previousOrientation = entity.orientation;
            const previousTool = entity.actionToolName;
            const sprite = this.game.sprites[state.animationSprite];
            const animation = 'atk_' + (state.orientation === Types.Orientations.LEFT
                ? 'right' : Types.getOrientationAsString(state.orientation));
            // Missing/incompatible art falls back to the equipped weapon.
            if (sprite?.animationData?.[animation]) entity.actionToolName = state.animationSprite;
            entity.orientation = state.orientation;
            entity.flipSpriteX = state.orientation === Types.Orientations.LEFT;
            entity.flipSpriteY = false;
            const previousSpeed = entity.getAnimationByName?.(animation)?.speed;
            entity.setAnimation(animation, 140);
            const actionAnimation = entity.currentAnimation;
            actionAnimation?.setSpeed?.(140);
            actionAnimation?.reset?.();
            this.game.toolImpactFeedback?.startAction(entity, state, actionAnimation);
            const isCurrent = () => this.game.mapId === mapId && this.game.sessionId === sessionId && !this.game.isStopped && !entity.isDead &&
                this.game.getEntityById(entity.id) === entity && !entity.isMoving() &&
                entity.currentAnimation === actionAnimation;
            return new Promise((resolve) => {
                const cleanup = (completed = false) => {
                    clearTimeout(timeout);
                    clearInterval(watch);
                    if (this.actionAnimations[entity.id] !== cleanup) return;
                    delete this.actionAnimations[entity.id];
                    this.game.toolImpactFeedback?.stopAction(entity, !completed);
                    actionAnimation?.setSpeed?.(previousSpeed || entity.atkSpeed);
                    if (previousTool === undefined) delete entity.actionToolName;
                    else entity.actionToolName = previousTool;
                    if (entity.currentAnimation === actionAnimation && !entity.isDead && !entity.isMoving()) {
                        entity.idle(previousOrientation);
                    }
                    resolve(completed);
                };
                const timeout = setTimeout(() => cleanup(isCurrent()), state.duration);
                const watch = setInterval(() => {
                    if (!isCurrent()) cleanup();
                }, 50);
                this.actionAnimations[entity.id] = cleanup;
            });
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

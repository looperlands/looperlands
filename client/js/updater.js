define(['character', 'projectile', 'timer'], function (Character, Projectile, Timer) {

    var Updater = Class.extend({
        init: function (game) {
            this.game = game;
            this.playerAggroTimer = new Timer(1000);
        },

        update: function () {
            this.updateZoning();
            this.updateCharacters();
            this.updateProjectiles();
            this.updatePlayerAggro();
            this.updateTransitions();
            this.updateAnimations();
            this.updateAnimatedTiles();
            this.updateChatBubbles();
            this.updateInfos();
        },

        updateCharacters: function () {
            var self = this;

            this.game.forEachEntity(function (entity) {
                var isCharacter = entity instanceof Character;

                if (entity.isLoaded) {
                    if (isCharacter) {
                        self.updateCharacter(entity);
                        self.game.onCharacterUpdate(entity);
                    }
                    self.updateEntityFading(entity);
                }
            });
        },

        updateProjectiles: function () {
            var self = this;

            this.game.forEachEntity(function (projectile) {
                var isProjectile = projectile instanceof Projectile;
                if (isProjectile && projectile.isLoaded) {
                    self.updateProjectile(projectile);
                }
            });
        },

        updatePlayerAggro: function () {
            var t = this.game.currentTime,
                player = this.game.player;

            // Check player aggro every 1s when not moving nor attacking
            if (player && !player.isMoving() && !player.isAttacking() && this.playerAggroTimer.isOver(t)) {
                player.checkAggro();
            }
        },

        updateEntityFading: function (entity) {
            if (entity && entity.isFading) {
                var duration = 1000,
                    t = this.game.currentTime,
                    dt = t - entity.startFadingTime;

                if (dt > duration) {
                    this.isFading = false;
                    entity.fadingAlpha = 1;
                } else {
                    entity.fadingAlpha = dt / duration;
                }
            }
        },

        updateTransitions: function () {
            var self = this,
                m = null,
                z = this.game.currentZoning;

            this.game.forEachEntity(function (entity) {
                if (entity === undefined) {
                    return;
                }
                m = entity.movement;
                if (m) {
                    if (m.inProgress) {
                        m.step(self.game.currentTime);
                    }
                }
            });

            if (z) {
                if (z.inProgress) {
                    z.step(this.game.currentTime);
                }
            }
        },

        updateZoning: function () {
            var g = this.game,
                c = g.camera,
                z = g.currentZoning,
                s = 3,
                ts = 16,
                speed = 0;
            if (z && z.inProgress === false) {
                var orientation = this.game.zoningOrientation,
                    startValue = endValue = offset = 0,
                    updateFunc = null,
                    endFunc = null;

                if (orientation === Types.Orientations.LEFT || orientation === Types.Orientations.RIGHT) {
                    offset = (c.gridW - 2) * ts;
                    startValue = (orientation === Types.Orientations.LEFT) ? c.x - ts : c.x + ts;
                    endValue = (orientation === Types.Orientations.LEFT) ? c.x - offset : c.x + offset;
                    updateFunc = function (x) {
                        c.setPosition(x, c.y);
                        g.initAnimatedTiles();
                        g.renderer.renderStaticCanvases();
                    }
                    endFunc = function () {
                        c.setPosition(z.endValue, c.y);
                        g.endZoning();
                    }
                } else if (orientation === Types.Orientations.UP || orientation === Types.Orientations.DOWN) {
                    offset = (c.gridH - 2) * ts;
                    startValue = (orientation === Types.Orientations.UP) ? c.y - ts : c.y + ts;
                    endValue = (orientation === Types.Orientations.UP) ? c.y - offset : c.y + offset;
                    updateFunc = function (y) {
                        c.setPosition(c.x, y);
                        g.initAnimatedTiles();
                        g.renderer.renderStaticCanvases();
                    }
                    endFunc = function () {
                        c.setPosition(c.x, z.endValue);
                        g.endZoning();
                    }
                }

                z.start(this.game.currentTime, updateFunc, endFunc, startValue, endValue, speed);
            }
        },

        updateCharacter: function (c) {
            var self = this;

            // Estimate of the movement distance for one update
            var tick = Math.round(16 / Math.round((c.moveSpeed / (1000 / this.game.renderer.FPS))));
            if (tick > 14) {
                tick = 14;
            }
            if (tick < 1) {
                tick = 1;
            }

            if (c.isMoving() && c.movement.inProgress === false) {
                if (c.orientation === Types.Orientations.LEFT) {
                    c.movement.start(this.game.currentTime,
                        function (x) {
                            c.x = x;
                            c.hasMoved();
                        },
                        function () {
                            c.x = c.movement.endValue;
                            c.hasMoved();
                            c.nextStep();
                        },
                        c.x - tick,
                        c.x - 16,
                        c.moveSpeed);
                } else if (c.orientation === Types.Orientations.RIGHT) {
                    c.movement.start(this.game.currentTime,
                        function (x) {
                            c.x = x;
                            c.hasMoved();
                        },
                        function () {
                            c.x = c.movement.endValue;
                            c.hasMoved();
                            c.nextStep();
                        },
                        c.x + tick,
                        c.x + 16,
                        c.moveSpeed);
                } else if (c.orientation === Types.Orientations.UP) {
                    c.movement.start(this.game.currentTime,
                        function (y) {
                            c.y = y;
                            c.hasMoved();
                        },
                        function () {
                            c.y = c.movement.endValue;
                            c.hasMoved();
                            c.nextStep();
                        },
                        c.y - tick,
                        c.y - 16,
                        c.moveSpeed);
                } else if (c.orientation === Types.Orientations.DOWN) {
                    c.movement.start(this.game.currentTime,
                        function (y) {
                            c.y = y;
                            c.hasMoved();
                        },
                        function () {
                            c.y = c.movement.endValue;
                            c.hasMoved();
                            c.nextStep();
                        },
                        c.y + tick,
                        c.y + 16,
                        c.moveSpeed);
                }
            }
        },

        updateProjectile: function (p) {
            if (p.isMoving() && p.movement.inProgress === false) {
                // Estimate of the movement distance for one update
                let tick = 3;

                let dx = Math.abs((p.targetX * 16) - (p.sourceX * 16));
                let dy = Math.abs((p.targetY * 16) - (p.sourceY * 16));

                if (dx === 0 && dy === 0) {
                    return;
                }

                if (dx > dy) {
                    let YXRatio = dy / dx;
                    p.movement.start(this.game.currentTime,
                        function (x) {
                            let movedX = Math.abs(x - p.x);

                            p.x = x;
                            p.y = p.sourceY < p.targetY ? (p.y + (movedX * YXRatio)) : (p.y - (movedX * YXRatio));
                            p.hasMoved();
                        },
                        function () {
                            p.x = p.targetX * 16;
                            p.y = p.targetY * 16;
                            p.hasMoved();
                            p.nextStep();
                        },
                        p.sourceX < p.targetX ? p.x + tick : p.x - tick,
                        p.sourceX < p.targetX ? p.targetX * 16 : (p.targetX * 16) + 16,
                        p.moveSpeed
                    );
                } else {
                    let XYRatio = dx / dy;
                    p.movement.start(this.game.currentTime,
                        function (y) {
                            let movedY = Math.abs(y - p.y);

                            p.y = y;
                            p.x = p.sourceX < p.targetX ? (p.x + (movedY * XYRatio)) : (p.x - (movedY * XYRatio));
                            p.hasMoved();
                        },
                        function () {
                            p.y = p.targetY * 16;
                            p.x = p.targetX * 16;
                            p.hasMoved();
                            p.nextStep();
                            p.visible = false;
                            p.setDirty();
                        },
                        p.y + tick,
                        p.targetY * 16,
                        p.moveSpeed
                    );
                }
            }
        },

        updateAnimations: function () {
            var t = this.game.currentTime;

            this.game.forEachEntity(function (entity) {
                var anim = entity.currentAnimation;

                if (anim) {
                    if (anim.update(t)) {
                        entity.setDirty();
                    }
                }
            });

            var sparks = this.game.sparksAnimation;
            if (sparks) {
                sparks.update(t);
            }

            var indicator = this.game.indicatorAnimation;
            if (indicator) {
                indicator.update(t);
            }

            var target = this.game.targetAnimation;
            if (target) {
                target.update(t);
            }

            var floats = this.game.floatAnimation;
            if (floats) {
                floats.update(t);
            }
        },

        updateAnimatedTiles: function () {
            var self = this,
                t = this.game.currentTime;

            let animatedTilesEnabled = this.game.app.settings.getAnimatedTiles();
            let updateAnimatedTilesFn = function (tile) {
                if (animatedTilesEnabled) {
                    tile.animate(t)
                }
            }
            this.game.forEachAnimatedTile(updateAnimatedTilesFn);
            this.game.forEachHighAnimatedTile(updateAnimatedTilesFn);
        },

        updateChatBubbles: function () {
            var t = this.game.currentTime;

            this.game.bubbleManager.update(t);
        },

        updateInfos: function () {
            var t = this.game.currentTime;

            this.game.infoManager.update(t);
        }
    });

    return Updater;
});

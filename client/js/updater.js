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
                        if (entity instanceof Character && !m.inProgress && entity.isMoving()) {
                            // Carry the remainder into the next tile in this same frame.
                            // Limit catch-up after a suspended tab to one extra tile.
                            var startTime = Math.max(m.startTime + m.duration,
                                self.game.currentTime - entity.moveSpeed);
                            self.updateCharacter(entity, startTime);
                            m.step(self.game.currentTime);
                            if (!m.inProgress && entity.isMoving()) {
                                self.updateCharacter(entity, self.game.currentTime);
                            }
                        }
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

        updateCharacter: function (c, startTime) {
            if (c.isMoving() && c.movement.inProgress === false) {
                var startX = c.x, startY = c.y,
                    endX = c.path[c.step][0] * 16,
                    endY = c.path[c.step][1] * 16,
                    dx = endX - startX, dy = endY - startY;
                if (dx === 0 && dy === 0) return;
                // Interpolate both axes together. Diagonals cover sqrt(2) times
                // the distance, so take proportionally longer at the same speed.
                var duration = c.moveSpeed * Math.hypot(dx, dy) / 16;
                c.movement.start(startTime === undefined ? this.game.currentTime : startTime,
                    function (progress) {
                        c.x = Math.round(startX + dx * progress);
                        c.y = Math.round(startY + dy * progress);
                        c.hasMoved();
                    },
                    function () {
                        c.x = endX;
                        c.y = endY;
                        c.hasMoved();
                        c.nextStep();
                    },
                    0, 1, duration, false);
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
            if (!this.game.app.settings.getAnimatedTiles()) {
                return;
            }

            var t = this.game.currentTime;
            let updateAnimatedTilesFn = function (tile) {
                tile.animate(t);
            };
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

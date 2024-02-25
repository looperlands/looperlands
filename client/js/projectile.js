
define(['entity', 'transition'], function(Entity, Transition) {

    var resetTime = 0;
    var projectileCounter = 0;

    var Projectile = Entity.extend({
        init: function(projectileKind, shooter) {
            // if 5 seconds have passed since the last projectile was created, reset the counter
            if (new Date().getTime() - resetTime > 5000) {
                projectileCounter = 0;
                resetTime = new Date().getTime();
            }

            let projectileId = self.sprites[shooter.weaponName].projectiles[projectileKind];
            this._super('projectile_' + projectileCounter++, Types.getTypeFromString(projectileId));

            this.flySpeed = 100;
            this.impactSpeed = 100;
            this.shooter = shooter;
            this.sourceX = shooter.gridX;
            this.sourceY = shooter.gridY;
            this.setGridPosition(this.sourceX, this.sourceY);
            this.setSprite(self.sprites[projectileId]);
            this.movement = new Transition();
            this.moving = false;
            this.nameless = true;
        },

        flyTo: function (targetX, targetY) {
            this.targetX = targetX;
            this.targetY = targetY;

            this.angle = Math.atan2(targetY - this.sourceY, targetX -this.sourceX);
            this.moving = true;
            this.moveSpeed = Math.sqrt(
                Math.pow(Math.abs(targetX - this.sourceX), 2) +
                    Math.pow(Math.abs(targetY - this.sourceY), 2)
                ) * 50;
            this.fly();
        },

        fly: function() {
            this.setAnimation("fly", this.flySpeed);
        },

        impact: function(onEnd) {
            this.setAnimation("impact", this.impactSpeed, 1, onEnd )
        },

        hasShadow: function() {
            return false;
        },

        isMoving: function() {
            return this.moving;
        },

        onMove: function(callback) {
          this.onmove_callback = callback;
        },

        hasMoved: function() {
            this.setDirty();
            if(this.onmove_callback) {
                this.onmove_callback();
            }
        },

        onDestination: function(callback) {
          this.onDestination_callback = callback;
        },

        nextStep: function() {
            var stop = false;

            if(this.isMoving()) {
                this.updatePositionOnGrid();

                if(this.hasNextStep()) {
                    this.step += 1;
                }
                else {
                    stop = true;
                }

                if (stop) { // Path is complete or has been interrupted
                    this.moving = false;
                    if(this.onDestination_callback) {
                        this.onDestination_callback(this);
                    }
                }
            }
        },

        hasNextStep: function() {

            let steps = Math.abs((this.targetX * 16) - (this.sourceX * 16)) / 4;

            return this.step < steps;
        },

        updatePositionOnGrid: function() {
            this.setGridPosition(Math.floor(this.x / 16), Math.floor(this.y / 16));
        },
    });
    
    return Projectile;
});
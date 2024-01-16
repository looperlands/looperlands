
define(['entity', 'transition'], function(Entity, Transition) {

    var Projectile = Entity.extend({
        init: function(projectileId, shooter) {
            this._super('projectile_' + Math.random() * 99999999999, projectileId);
            this.moveSpeed = 300;
            this.flySpeed = 100;
            this.sourceX = shooter.gridX;
            this.sourceY = shooter.gridY;
            this.setGridPosition(shooter.gridX, shooter.gridY);
            this.setSprite(self.sprites[Types.getKindAsString(projectileId)]);
            this.movement = new Transition();
            this.moving = false;
            this.nameless = true;
        },

        flyTo: function (targetX, targetY) {
            this.targetX = targetX;
            this.targetY = targetY;

            this.angle = Math.atan2(targetY - this.sourceY, targetX -this.sourceX);
            this.moving = true;
            this.fly();
        },

        fly: function(orientation) {
            this.setAnimation("fly", this.flySpeed);
        },

        hasShadow: function() {
            return true;
        },

        isMoving: function() {
            return this.moving;
        },

        hasMoved: function() {
            console.log('pos', this.x, this.y);
            this.setDirty();
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
            console.log('grid pos', Math.floor(this.x / 16), Math.floor(this.y / 16));
            this.setGridPosition(Math.floor(this.x / 16), Math.floor(this.y / 16));
        },
    });
    
    return Projectile;
});
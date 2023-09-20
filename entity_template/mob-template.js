        ID: Mob.extend({
            init: function(id) {
                this._super(id, Types.Entities.ID);
                this.moveSpeed = 350;
                this.atkSpeed = 100;
                this.idleSpeed = 800;
                this.shadowOffsetY = 1;
                this.setAttackRate(1200);
            }
        }),
        // @nextMobLine@

define(['character'], function(Character) {
    
    var Mob = Character.extend({
        init: function(id, kind) {
            this._super(id, kind);
        
            this.aggroRange = 1;
            this.isAggressive = true;
            this.inCombat = false;

            this.animationLock = false;
            this.nameOffsetY = -10;
        },

        breakFriendly: function(){
            return;
        },

        joinCombat: function() {
            this.inCombat = true;
        },

        exitCombat: function() {
            this.inCombat = false;
        }
    });
    
    return Mob;
});
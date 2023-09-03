
define(['character','../../shared/js/altnames','../../shared/js/gametypes'], function(Character) {
    
    var Mob = Character.extend({
        init: function(id, kind) {
            this._super(id, kind);
        
            this.aggroRange = 1;
            this.isAggressive = true;
            this.inCombat = false;

            this.animationLock = false;
            this.nameOffsetY = -10;
            this.initAltName();
        },

        breakFriendly: function(){
            return;
        },

        joinCombat: function() {
            this.inCombat = true;
        },

        exitCombat: function() {
            this.inCombat = false;
        },

        initAltName: function (){
            let kindString = Types.getKindAsString(this.kind);
            let altName = AltNames.getAltNameFromKind(kindString);
            if (altName !== undefined){
                this.setName(altName);
            } 
        }

    });
    
    return Mob;
});

define(['entity'], function(Entity) {

    var Fieldeffect = Entity.extend({
        init: function(id, kind) {
    	    this._super(id, kind);
            this.idleSpeed = 150;
            this.projectileSpeed = 150;
            this.type = "";
        },

        getSpriteName: function() {
            return "fieldeffect-"+ Types.getKindAsString(this.kind);
        }
    });
    
    return Fieldeffect;
});
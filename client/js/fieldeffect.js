
define(['entity'], function(Entity) {

    var Fieldeffect = Entity.extend({
        init: function(id, kind) {
    	    this._super(id, kind);
        },

        getSpriteName: function() {
            return "fieldeffect-"+ Types.getKindAsString(this.kind);
        }
    });
    
    return Fieldeffect;
});
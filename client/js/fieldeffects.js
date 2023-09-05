
define(['fieldeffect'], function(Fieldeffect) {
    
    var Fieldeffects = {
        
        Magcrack: Fieldeffect.extend({
            init: function(id) {
                this._super(id, Types.Entities.MAGCRACK);
            },
        }),
    };

    return Fieldeffects;
});

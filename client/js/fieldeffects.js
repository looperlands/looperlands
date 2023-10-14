
define(['fieldeffect'], function(Fieldeffect) {
    /* Types:
    - continousAoe (ticking aura on the floor)
    - singleIndicatedAoe (one aoe after a delay) 
    */
    var Fieldeffects = {
        
        Magcrack: Fieldeffect.extend({
            init: function(id) {
                this._super(id, Types.Entities.MAGCRACK);
                this.type = "continousAoe";
            },
        }),

        Cobfallingrock: Fieldeffect.extend({
            init: function(id) {
                this._super(id, Types.Entities.COBFALLINGROCK);
                this.type = "singleIndicatedAoe";
                this.idleSpeed = 333;
            },
        }),
    };

    return Fieldeffects;
});

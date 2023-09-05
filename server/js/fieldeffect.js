const Properties = require("./properties"),
    Types = require("../../shared/js/gametypes");

module.exports = Fieldeffect = Entity.extend({
    init: function(id, kind, x, y) {
        this._super(id, "fieldeffect", kind, x, y);
        this.tickRate = 1000;
        this.fieldIntervals = [];
    },

    initDamageCallback: function(callback) {
        const self = this;
        kindString = Types.getKindAsString(this.kind);

        if (Properties[kindString] !== undefined && Properties[kindString].aoe !== undefined){
            self.damage_callback = callback;
            let damageInterval = setInterval(function() {
                self.damage_callback(self);
            }, self.tickRate);
            self.fieldIntervals.push(damageInterval);
        }
    },

    despawn: function() {
        this.fieldIntervals.forEach((interval) => clearInterval(interval));
        this._super();
    },
});
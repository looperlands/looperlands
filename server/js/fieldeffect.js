const Properties = require("./properties"),
    Types = require("../../shared/js/gametypes");

module.exports = Fieldeffect = Entity.extend({
    init: function(id, kind, x, y) {
        this._super(id, "fieldeffect", kind, x, y);
        this.tickRate = 1000;
        this.fieldIntervals = [];
        this.fieldTimeouts = [];
    },

    initContinousDamageCallback: function(callback) {
        const self = this;
        let kindString = Types.getKindAsString(this.kind);

        if (Properties[kindString] !== undefined 
            && Properties[kindString].aoe !== undefined 
            && Properties[kindString].aoe.singleHitDuration === undefined)
        {
            self.damage_callback = callback;
            let damageInterval = setInterval(function() {
                self.damage_callback(self);
            }, self.tickRate);
            self.fieldIntervals.push(damageInterval);
        }
    },

    initSingleHitCallback: function(callback1, callback2) {
        const self = this;
        let kindString = Types.getKindAsString(this.kind);

        if (Properties[kindString] !== undefined 
            && Properties[kindString].aoe !== undefined 
            && Properties[kindString].aoe.singleHitDuration !== undefined)
        {
            self.damage_callback = callback1;
            self.despawn_callback = callback2;
            let hitTimeout = setTimeout(function() {
                self.damage_callback(self);
                self.despawn_callback(self);
            }, Properties[kindString].aoe.singleHitDuration);
            self.fieldTimeouts.push(hitTimeout);
        }
    },

    despawn: function() {
        this.detachFromParent();
        this.fieldIntervals.forEach((interval) => clearInterval(interval));
        this.fieldTimeouts.forEach((timeout) => clearTimeout(timeout));
        return this._super();
    },
});
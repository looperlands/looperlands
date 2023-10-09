var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.mob = options.mob;
        this.anmiation = options.animation;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        let controllingMob;
        if(_.isString(this.mob) || _.isNumber(this.mob)) {
            controllingMob = this.worldserver.getClosestMobOfKind(this.mob, event.data.player.x, event.data.player.y);
        } else {
            controllingMob = this.mob;
        }

        this.worldserver.triggerAnimation(controllingMob, this.anmiation);
        return 'then';
    },
})
var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.npc = options.npc;
        this.anmiation = options.animation;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        let controllingNpc;
        if(_.isString(this.npc) || _.isNumber(this.npc)) {
            controllingNpc = this.worldserver.getClosestNpcOfKind(this.npc, event.data.player.x, event.data.player.y);
        } else {
            controllingNpc = this.npc;
        }

        this.worldserver.triggerAnimation(controllingNpc, this.anmiation);
        return 'then';
    },
})
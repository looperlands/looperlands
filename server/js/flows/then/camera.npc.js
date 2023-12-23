var cls = require("../../lib/class")
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.worldserver = worldserver;
        this.npc = options.npc;
    },

    destroy: function() {
    },

    handle(event) {
        let closestNpc = this.worldserver.getClosestNpcOfKind(this.npc, event.data.player.x, event.data.player.y);
        this.worldserver.pushToPlayer(event.data.player, new Messages.Camera(closestNpc.x, closestNpc.y))

        return 'then';
    },
})
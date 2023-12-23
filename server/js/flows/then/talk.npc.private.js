var cls = require("../../lib/class")
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.npc = options.npc;
        this.message = options.message;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        let closestNpc = this.worldserver.getClosestNpcOfKind(this.npc, event.data.player.x, event.data.player.y);
        this.worldserver.pushToPlayer(this.worldserver.player, new Messages.Chat(closestNpc, this.message));

        return 'then';
    }
})
var cls = require("../../lib/class")
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.mob = options.mob;
        this.message = options.message;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        let closestMob = this.worldserver.getClosestMobOfKind(this.mob, event.data.player.x, event.data.player.y);
        this.worldserver.pushToPlayer(closestMob.group, new Messages.Chat(closestMob, this.message), false);

        return 'then';
    }
})
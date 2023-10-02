var cls = require("../../lib/class")
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.sound = options.sound;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        this.worldserver.pushToPlayer(event.data.player, new Messages.Sound(this.sound), false);
        return 'then';
    }
})
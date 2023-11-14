var cls = require("../../lib/class")
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.music = options.music;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        this.worldserver.pushToPlayer(event.data.player, new Messages.Music(this.music), false);

        return 'then';
    }
})
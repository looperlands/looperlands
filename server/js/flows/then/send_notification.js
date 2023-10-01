var cls = require("../../lib/class")
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.message = options.message;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        this.worldserver.pushToPlayer(event.data.player, new Messages.Notify(this.message), false);
        return 'then';
    }
})
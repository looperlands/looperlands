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
        try {
            this.worldserver.pushToPlayer(event.data.player, new Messages.Chat(event.data.player, this.message));
        } catch (e) {
            console.log(e)
        }

        return 'then';
    }
})
var cls = require("../../lib/class")
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.amount = options.amount;
        this.item = options.item;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        this.worldserver.sendNotifications(event.data.player, this.amount + 'wood added it inventory', false);
        return 'then';
    }
})
var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.item = String(options.item);
        this.amount = parseInt(options.amount);
    },

    destroy: function() {
    },

    handle(event) {
        return ((event.data.playerData.gameData.items[this.item] ?? 0) >= this.amount);
    }
})
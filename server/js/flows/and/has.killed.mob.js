var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.handled = false;
        this.mob = String(options.mob);
        this.amount = parseInt(options.amount);
    },

    destroy: function() {
    },

    handle(event) {
        return ((event.data.playerData.gameData.mobKills[this.mob] ?? 0) >= this.amount);
    }
})
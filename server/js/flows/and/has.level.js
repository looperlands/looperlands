var cls = require("../../lib/class")
const Formulas = require("../../formulas");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.handled = false;
        this.level = parseInt(options.level);
    },

    destroy: function() {
    },

    handle(event) {
        return (Formulas.level(event.data.playerData.xp) >= this.level);
    }
})
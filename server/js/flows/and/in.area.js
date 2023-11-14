var cls = require("../../lib/class")
const Formulas = require("../../formulas");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.handled = false;
        this.top_left = options.top_left;
        this.bottom_right = options.bottom_right;
    },

    destroy: function() {
    },

    handle(event) {
        let top_left = this.top_left.split(",");
        let bottom_right = this.bottom_right.split(",");

        return (
            event.data.player.x >= parseInt(top_left[0]) &&
            event.data.player.x <= parseInt(bottom_right[0]) &&
            event.data.player.y >= parseInt(top_left[1]) &&
            event.data.player.y <= parseInt(bottom_right[1])
        );
    }
})
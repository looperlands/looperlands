var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.handled = false;
    },

    destroy: function() {
    },

    handle(event) {
        if(this.handled) {
            return "blocked";
        }

        this.handled = true;
        return "then";
    }
})
var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    incoming: [],

    init: function(options, worldserver) {
        this.handled = {};
    },

    destroy: function() {
    },

    handle(event) {
        this.handled[event.incoming.idx] = true;
        console.log(this.incoming, this.handled);
        // loop over this.incoming and check if all are handled
        for(var idx in this.incoming) {
            if(!this.handled[this.incoming[idx]]) {
                return "blocked";
            }
        }

        this.handled = {};
        return "then";
    }
})
var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.delay = parseInt(options.delay);
    },

    destroy: function() {
    },

    handle(event, callback) {
        setTimeout(() => { callback(event) }, this.delay);

        return 'then';
    }
})
var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    init: function(options) {
        this.trigger = options.trigger;
    },

    destroy: function() {
    },

    handle(event) {
        console.log('Activate trigger: ' + this.trigger);
        return 'then';
    }
})
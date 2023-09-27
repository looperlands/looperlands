var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    init: function(options) {
        this.message = options.message;
    },

    destroy: function() {
    },

    handle(event) {
        console.log('Player chat bubble: ' + this.message);
        return 'then';
    }
})
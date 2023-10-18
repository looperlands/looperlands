var cls = require("../../lib/class")

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.trigger = options.trigger;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        return this.worldserver.checkTriggerActive(this.trigger);
    }
})
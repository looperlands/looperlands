var cls = require("../../lib/class")
const {WorldEventBroker} = require("../worldeventbroker");

module.exports = Event = cls.Class.extend({
    eventType: WorldEventBroker.Events.TRIGGER_ACTIVATED,
    init: function(options, worldserver) {
        this.trigger = options.trigger;
    },

    destroy: function() {
    },

    handle(event) {
        return (event.data.trigger === this.trigger);
    }
})
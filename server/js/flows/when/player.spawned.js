var cls = require("../../lib/class")
const {PlayerEventBroker} = require("../../quests/playereventbroker");

module.exports = Event = cls.Class.extend({
    eventType: PlayerEventBroker.Events.SPAWNED,
    init: function(options, worldserver) {},

    destroy: function() {},

    handle(event) {
        return true;
    }
})
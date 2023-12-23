var cls = require("../../lib/class")
const {PlayerEventBroker} = require("../../quests/playereventbroker");

module.exports = Event = cls.Class.extend({
    eventType: PlayerEventBroker.Events.KILL_MOB,
    init: function(options, worldserver) {
        this.mob = options.mob;
    },

    destroy: function() {
    },

    handle(event) {
        return (parseInt(event.data.mob.kind) === parseInt(this.mob));
    }
})
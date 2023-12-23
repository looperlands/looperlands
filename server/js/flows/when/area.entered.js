var cls = require("../../lib/class")
const {PlayerEventBroker} = require("../../quests/playereventbroker");

module.exports = Event = cls.Class.extend({
    eventType: PlayerEventBroker.Events.AREA_ENTERED,
    init: function(options, worldserver) {
        this.area = options.area;
    },

    destroy: function() {
    },

    handle(event) {
        return (parseInt(event.data.area.id) === parseInt(this.area));
    }
})
var cls = require("../../lib/class")
const {PlayerEventBroker} = require("../../quests/playereventbroker");

module.exports = Event = cls.Class.extend({
    eventType: PlayerEventBroker.Events.LOOT_ITEM,
    init: function(options, worldserver) {
        this.item = options.item;
    },

    destroy: function() {
    },

    handle(event) {
        return (parseInt(event.data.item.kind) === parseInt(this.item));
    }
})
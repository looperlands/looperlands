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
        console.log(event);
        return (event.data.item.kind === this.item);
    }
})
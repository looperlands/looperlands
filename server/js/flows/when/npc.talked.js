var cls = require("../../lib/class")
const {PlayerEventBroker} = require("../../quests/playereventbroker");

module.exports = Event = cls.Class.extend({
    eventType: PlayerEventBroker.Events.NPC_TALKED,
    init: function(options, worldserver) {
        this.npc = options.npc;
        this.message = options.message;
    },

    destroy: function() {},

    handle(event) {
        return (parseInt(event.data.npc) === parseInt(this.npc));
    }
})
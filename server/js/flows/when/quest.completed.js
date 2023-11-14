var cls = require("../../lib/class")
const {PlayerEventBroker} = require("../../quests/playereventbroker");

module.exports = Event = cls.Class.extend({
    eventType: PlayerEventBroker.Events.QUEST_COMPLETED,
    init: function(options, worldserver) {
        this.quest = options.quest;
    },

    destroy: function() {
    },

    handle(event) {
        return (event.data.quest.id === this.quest);
    }
})
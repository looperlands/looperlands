var cls = require("../../lib/class")
const quests = require("../../quests/quests.js");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.quest = options.quest;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        if(this.worldserver.newQuest(event.data.player, this.quest)) {
            return 'then';
        }

        event.error = 'Quest could not be handed out';
        return 'error';
    }
})
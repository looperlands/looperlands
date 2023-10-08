var cls = require("../../lib/class")
const quests = require("../../quests/quests.js");
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.quest = options.quest;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        if(this.worldserver.completeQuest(event.data.player, this.quest)) {
            this.worldserver.pushToPlayer(event.data.player, new Messages.Sound('achievement'), false);
            return 'then';
        }

        event.error = 'Quest could not be completed';
        return 'error';
    }
})
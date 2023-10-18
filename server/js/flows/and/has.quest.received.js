var cls = require("../../lib/class")
const quests = require("../../quests/quests.js");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.quest = String(options.quest);
    },

    destroy: function() {
    },

    handle(event) {
        return quests.hasQuest(this.quest, event.data.playerData)
    }
})
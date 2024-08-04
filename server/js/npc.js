const quests = require('./quests/quests');

module.exports = Npc = Entity.extend({
    init: function(id, kind, x, y) {
        this._super(id, "npc", kind, x, y);
    },

    checkIndicator: function(sessionId, cache) {
        this.showIndicator = quests.npcHasQuest(cache, sessionId, this.kind);
    },

    getState: function() {
        var basestate = this._getBaseState(),
            state = [];

        state.push(this.showIndicator);

        return basestate.concat(state);
    },
});
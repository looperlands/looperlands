const quests = require('./quests/quests');

module.exports = Npc = Entity.extend({
    init: function(id, kind, x, y) {
        this._super(id, "npc", kind, x, y);
    },

    checkIndicator: function(sessionId, cache) {
        const npcKey = this.behaviorState?.key;
        this.showIndicator = quests.npcHasQuest(cache, sessionId, this.kind, npcKey) || quests.npcHasOpenQuest(cache, sessionId, this.kind, npcKey);
    },

    getState: function() {
        var basestate = this._getBaseState(),
            state = [];

        state.push(this.showIndicator);
        if (this.behaviorState) state.push(this.behaviorState);

        return basestate.concat(state);
    },
});

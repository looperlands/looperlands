var cls = require("../../lib/class");
var _ = require('underscore');

const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.npc = options.npc;
        this.message = options.message;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        try {
            let controllingNpc;
            if (_.isString(this.npc) || _.isNumber(this.npc)) {
                controllingNpc = this.worldserver.getClosestNpcOfKind(this.npc, event.data.player.x, event.data.player.y);
            } else {
                controllingNpc = this.npc;
            }

            this.worldserver.pushBroadcast(new Messages.Chat(controllingNpc, this.message), false);
        } catch(e) {
            console.log(e);
        }

        return 'then';
    }
})
var cls = require("../../lib/class")
const Messages = require("../../message");
const _ = require("underscore");

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
            if(_.isString(this.npc) || _.isNumber(this.npc)) {
                controllingNpc = this.worldserver.getClosestNpcOfKind(this.npc, event.data.player.x, event.data.player.y);
            } else {
                controllingNpc = this.npc;
            }

            this.worldserver.pushToPlayer(event.data.player, new Messages.Chat(controllingNpc, this.message));
        } catch(e) {
            //console.log(e);
        }

        return 'then';
    }
})
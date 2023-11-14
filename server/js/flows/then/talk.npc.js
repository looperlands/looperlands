var cls = require("../../lib/class")
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
        let controllingNpc;
        if(_.isString(this.npc) || _.isNumber(this.npc)) {
            controllingNpc = this.worldserver.getClosestNpcOfKind(this.npc, event.data.player.x, event.data.player.y);
        } else {
            controllingNpc = this.npc;
        }

        this.worldserver.pushToGroup(controllingNpc.group, new Messages.Chat(controllingNpc, this.message), false);

        return 'then';
    }
})
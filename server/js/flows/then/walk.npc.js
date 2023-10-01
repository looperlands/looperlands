var cls = require("../../lib/class")
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.npc = options.npc;
        this.position = options.position;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        let coordinate = this.position.split(',');
        let closestNpc = this.worldserver.getClosestNpcOfKind(this.npc, coordinate[0], coordinate[1]);
        this.worldserver.moveNpc(closestNpc, parseInt(coordinate[0]), parseInt(coordinate[1]));

        return 'then';
    },
})
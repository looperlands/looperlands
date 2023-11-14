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
        event.data.spawned = this.worldserver.addNpc(this.npc, parseInt(coordinate[0]), parseInt(coordinate[1]));

        return 'then';
    },
})
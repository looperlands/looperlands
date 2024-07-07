var cls = require("../../lib/class")
const Messages = require("../../message");
const _ = require("underscore");

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
        let controllingNpc;
        if(_.isString(this.npc) || _.isNumber(this.npc)) {
            controllingNpc = this.worldserver.getClosestNpcOfKind(this.npc, coordinate[0], coordinate[1]);;
        } else {
            controllingNpc = this.npc;
        }

        this.worldserver.moveNpc(controllingNpc, parseInt(coordinate[0]), parseInt(coordinate[1]));

        return 'then';
    },
})
var cls = require("../../lib/class")
const Messages = require("../../message");

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.position = options.position;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        let coordinate = this.position.split(',');


        event.data.player.setPosition(parseInt(coordinate[0]),parseInt(coordinate[1]));
        this.worldserver.pushToAdjacentGroups(event.data.player.group, new Messages.Move(event.data.player));
        this.worldserver.handleEntityGroupMembership(event.data.player);

        return 'then';
    },
})
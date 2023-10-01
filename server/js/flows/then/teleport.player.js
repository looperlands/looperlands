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

        if(this.worldserver.isValidPosition(parseInt(coordinate[0]), parseInt(coordinate[1]))) {
            event.data.player.setPosition(parseInt(coordinate[0]), parseInt(coordinate[1]));
            event.data.player.clearTarget();

            this.worldserver.handlePlayerVanish(event.data.player);
            event.data.player.broadcast(new Messages.Teleport(event.data.player), false);
            this.worldserver.pushRelevantEntityListTo(event.data.player);
        }

        return 'then';
    },
})
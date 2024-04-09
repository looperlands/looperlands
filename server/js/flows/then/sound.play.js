var cls = require("../../lib/class")
const Messages = require("../../message");
var _ = require('underscore');

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.sound = options.sound;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        try {
            this.worldserver.pushToPlayer(event.data.player, new Messages.Sound(this.sound), false);
        } catch (e) {
        }
        return 'then';
    }
})
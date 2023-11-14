var cls = require("../../lib/class")
const Messages = require("../../message");
const Item = require('../../item');

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.item = options.item;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        this.worldserver.despawn(this.item);
        event.data.removed = this.item

        return 'then';
    },
})
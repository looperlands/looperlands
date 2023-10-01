var cls = require("../../lib/class")
const Messages = require("../../message");
const Item = require('../../item');

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.item = options.item;
        this.position = options.position;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        let coordinate = this.position.split(',');
        let item = this.worldserver.createItem(this.item, parseInt(coordinate[0]), parseInt(coordinate[1]));
        // We need this to be a chest item, otherwise it will be handled as a dropped item and that won't work
        item.isFromChest = true;

        event.data.spawned = this.worldserver.addItem(item);
        return 'then';
    },
})
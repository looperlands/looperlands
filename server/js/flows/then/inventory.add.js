var cls = require("../../lib/class")
const Types = require('../../../../shared/js/gametypes.js');
const AltNames = require('../../../../shared/js/altnames.js');

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.amount = parseInt(options.amount);
        this.item = options.item;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        this.worldserver.addToInventory(event.data.player, this.item, this.amount);
        let altName = AltNames.getAltNameFromKind(Types.getKindAsString(this.item));
        let itemName = altName ? altName : Types.getKindAsString(this.item);
        this.worldserver.sendNotifications(event.data.player, this.amount + ' ' + itemName +' added to inventory', false);
        return 'then';
    }
})
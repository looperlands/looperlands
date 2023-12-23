var cls = require("../../lib/class")
const Messages = require("../../message");
const Mob = require('../../mob');

module.exports = Block = cls.Class.extend({
    init: function(options, worldserver) {
        this.mob = options.mob;
        this.position = options.position;
        this.worldserver = worldserver;
    },

    destroy: function() {
    },

    handle(event) {
        let coordinate = this.position.split(',');
        let mob = new Mob(this.worldserver.nextMobId(), this.mob, parseInt(coordinate[0]), parseInt(coordinate[1]));
        this.worldserver.addMob(mob);
        event.data.spawned = mob;

        return 'then';
    },
})
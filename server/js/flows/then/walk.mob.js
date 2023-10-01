var cls = require("../../lib/class")
const Messages = require("../../message");

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
        let closestMob = this.worldserver.getClosestMobOfKind(this.mob, coordinate[0], coordinate[1]);
        if(!closestMob.hasTarget() && !closestMob.isDead) {
            closestMob.move(parseInt(coordinate[0]), parseInt(coordinate[1]))
        }

        return 'then';
    },
})
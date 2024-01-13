var Area = require('./area'),
    _ = require('underscore'),
    Types = require("../../shared/js/gametypes"),
    Mob = require('./mob')
    Utils = require('./utils');

module.exports = HordeArea = Area.extend({
    init: function(id, nb, kind, lvl, inc, waves, x, y, width, height, world) {
        this._super(id, x, y, width, height, world);
        this.nb = nb; // Number of mobs per wave
        this.kind = kind; // Type of mobs
        this.lvl = lvl; // Starting level of the mob
        this.inc = inc; // Level increment per wave
        this.waves = waves; // Number of waves
        this.currentWave = 0; // Track the current wave

        this.initHorde();
    },

    spawnWave: function() {
        for(var i = 0; i < this.nb; i++) {
            var mob = this._createMobInsideArea(this.lvl);
            this.addToArea(mob);
        }
        this.currentWave++;
        this.lvl += this.inc; // Increase the level for the next wave
    },

    _createMobInsideArea: function(level) {
        var k = Types.getKindFromString(this.kind),
            pos = this._getRandomPositionInsideArea(),
            mob = new Mob('1' + this.id + '' + k + '' + this.entities.length, k, pos.x, pos.y);

        mob.setLevel(level); // Assuming Mob class has setLevel method
        mob.onMove(this.world.onMobMoveCallback.bind(this.world));
        mob.onExitCombat(this.world.onMobExitCombatCallback.bind(this.world));

        return mob;
    },

    initHorde: function() {
        this.spawnWave();
    },

    onEmpty: function(callback) {
        this.empty_callback = callback;
    },

    checkForNextWave: function() {
        if (this.currentWave < this.waves) {
            this.spawnWave();
        } else {
            if (this.empty_callback) {
                this.empty_callback(this);
            }
        }
    },

    removeFromArea: function(mob) {
        var index = _.indexOf(_.pluck(this.entities, 'id'), mob.id);
        if(index !== -1) {
            this.entities.splice(index, 1);
            if(mob.area && mob.area.id === this.id) {
                mob.area = null;
            }

            if (this.entities.length === 0) {
                this.checkForNextWave();
            }
        }
    },
});

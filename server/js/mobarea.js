
var Area = require('./area'),
    _ = require('underscore'),
    Types = require("../../shared/js/gametypes"),
    Mob = require('./mob')
    Utils = require('./utils');

module.exports = MobArea = Area.extend({
    init: function(id, nb, kind, x, y, width, height, world) {
        this._super(id, x, y, width, height, world);
        this.nb = nb;
        this.kind = kind;
        this.respawns = [];
        this.setNumberOfEntities(this.nb);
        
        this.initRoaming();
    },
    
    spawnMobs: function() {
        for(var i = 0; i < this.nb; i += 1) {
            this.addToArea(this._createMobInsideArea());
        }
    },
    
    _createMobInsideArea: function() {
        var k = Types.getKindFromString(this.kind),
            pos = this._getRandomPositionInsideArea(),
            mob = new Mob('1' + this.id + ''+ k + ''+ this.entities.length, k, pos.x, pos.y);
        
        mob.onMove(this.world.onMobMoveCallback.bind(this.world));
        mob.onExitCombat(this.world.onMobExitCombatCallback.bind(this.world));

        return mob;
    },
    
    respawnMob: function(mob, delay) {
        var self = this;
        
        this.removeFromArea(mob);
        
        setTimeout(function() {
            var pos = self._getRandomPositionInsideArea();
            
            mob.x = pos.x;
            mob.y = pos.y;
            mob.isDead = false;
            mob.generateLevel();
            mob.recalculateStats();
            self.addToArea(mob);
            self.world.addMob(mob);
        }, delay);
    },

    initRoaming: function(mob) {
        var self = this;
        
        setInterval(function() {
            if (self.world.getPlayerCount() < 1) {
                return;
            }
            const entitiesLength = self.entities.length;
            for (let i = 0; i < entitiesLength; i++) {
                let mob = self.entities[i];
                let canRoam = (Utils.random(10) === 1),
                    pos;

                if (canRoam) {
                    if (!mob.hasTarget() && !mob.isDead) {
                        pos = self._getRandomPositionInsideArea();
                        mob.move(pos.x, pos.y);
                    }
                }
            }
        }, 2000);
    },
    
    createReward: function() {
        var pos = this._getRandomPositionInsideArea();
        
        return { x: pos.x, y: pos.y, kind: Types.Entities.CHEST };
    }
});

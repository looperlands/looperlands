
var cls = require("./lib/class"),
    _ = require("underscore"),
    Properties = require("./properties"),
    Formulas = require("./formulas"),
    Types = require("../../shared/js/gametypes");

module.exports = Mob = Character.extend({
    init: function(id, kind, x, y) {
        this._super(id, "mob", kind, x, y);

        this.generateLevel();
        this.recalculateStats();
        this.spawningX = x;
        this.spawningY = y;
        this.hatelist = [];
        this.respawnTimeout = null;
        this.returnTimeout = null;
        this.specialTimeout = null;
        this.isDead = false;
        this.dmgTakenArray = [];
        this.addArray = [];
    },
    
    destroy: function() {
        this.isDead = true;
        this.hatelist = [];
        this.dmgTakenArray = [];
        this.addArray = [];
        this.clearTarget();
        this.updateHitPoints();
        this.resetPosition();
        this.clearSpecialInterval();
        this.detachFromParent();

        this.handleRespawn();
    },

    wasDamagedBy: function(playerId) {
        return _.any(this.dmgTakenArray, function(obj) { 
            return obj.id === playerId; 
        });
    },
    
    receiveDamage: function(points, playerId) {
        this.hitPoints -= points;

        if(this.wasDamagedBy(playerId)) {
            _.detect(this.dmgTakenArray, function(obj) {
                return obj.id === playerId;
            }).dmg += points;
        }
        else {
            this.dmgTakenArray.push({ id: playerId, dmg: points });
        }
    },
    
    hates: function(playerId) {
        return _.any(this.hatelist, function(obj) { 
            return obj.id === playerId; 
        });
    },
    
    increaseHateFor: function(playerId, points) {

        if(this.type === "player") {
            console.log("Players cannot hate other players.");
            return;
        } 
        if(this.hates(playerId)) {
            _.detect(this.hatelist, function(obj) {
                return obj.id === playerId;
            }).hate += points;
        }
        else {
            this.hatelist.push({ id: playerId, hate: points });
        }

        /*
        console.debug("Hatelist : "+this.id);
        _.each(this.hatelist, function(obj) {
            console.debug(obj.id + " -> " + obj.hate);
        });*/
        
        if(this.returnTimeout) {
            // Prevent the mob from returning to its spawning position
            // since it has aggroed a new player
            clearTimeout(this.returnTimeout);
            this.returnTimeout = null;
        }
    },
    
    getHatedPlayerId: function(hateRank) {
        var i, playerId,
            sorted = _.sortBy(this.hatelist, function(obj) { return obj.hate; }),
            size = _.size(this.hatelist);
        
        if(hateRank && hateRank <= size) {
            i = size - hateRank;
        }
        else {
            i = size - 1;
        }
        if(sorted && sorted[i]) {
            playerId = sorted[i].id;
        }
        
        return playerId;
    },
    
    forgetPlayer: function(playerId, duration) {
        this.hatelist = _.reject(this.hatelist, function(obj) { return obj.id === playerId; });
        this.dmgTakenArray = _.reject(this.dmgTakenArray, function(obj) { return obj.id === playerId; });

        if(this.hatelist.length === 0) {
            this.returnToSpawningPosition(duration);
        }
    },
    
    forgetEveryone: function() {
        this.hatelist = [];
        this.dmgTakenArray = [];
        this.returnToSpawningPosition(1);
        this.clearSpecialInterval();
    },
    
    handleRespawn: function() {
        var self = this;

        let delay = Properties[Types.getKindAsString(this.kind)].respawnDelay;
        if (delay === undefined) {
            delay = 40000;
        }
        
        if(this.area && this.area instanceof MobArea) {
            // Respawn inside the area if part of a MobArea
            this.area.respawnMob(this, delay);
        }
        else {
            if(this.area && this.area instanceof ChestArea) {
                this.area.removeFromArea(this);
            }
            
            setTimeout(function() {
                if(self.respawn_callback) {
                    self.respawn_callback();
                }
            }, delay);
        }
    },
    
    onRespawn: function(callback) {
        this.respawn_callback = callback;
    },
    
    resetPosition: function() {
        this.setPosition(this.spawningX, this.spawningY);
    },
    
    returnToSpawningPosition: function(waitDuration) {
        var self = this,
            delay = waitDuration || 4000;
        
        this.clearTarget();
        
        this.returnTimeout = setTimeout(function() {
            self.resetPosition();
            self.move(self.x, self.y);
            if (self.hatelist.length === 0){
                self.exitCombat();
            }
        }, delay);
    },
    
    onMove: function(callback) {
        this.move_callback = callback;
    },
    
    move: function(x, y) {
        this.setPosition(x, y);
        if(this.move_callback) {
            this.move_callback(this);
        }
    },
    
    updateHitPoints: function() {
        this.resetHitPoints(Properties.getHitPoints(this.kind, this.levelOffset));
    },
    
    distanceToSpawningPoint: function(x, y) {
        return Utils.distanceTo(x, y, this.spawningX, this.spawningY);
    },

    clearSpecialInterval: function() {
        clearInterval(this.specialInterval);
        this.specialInterval = null;
    },

    onExitCombat: function(callback) {
        this.exitCombat_callback = callback;
    },

    exitCombat: function() {
        if(this.exitCombat_callback) {
            this.exitCombat_callback(this);
        }
    },

    isInCombat: function() {
        return this.hatelist.length > 0 ? true : false;
    },

    generateLevel: function() {
        const deviation = 0.2;

        this.level = Properties.getLevel(this.kind);
        this.levelOffset = Math.round(Formulas.gaussianRangeRandom(-deviation * this.level, deviation * this.level));
        this.level += this.levelOffset;
    },

    recalculateStats: function() {
        this.updateHitPoints();
        this.armorLevel = Properties.getArmorLevel(this.kind, this.levelOffset);
        this.weaponLevel = Properties.getWeaponLevel(this.kind, this.levelOffset);
    }
});

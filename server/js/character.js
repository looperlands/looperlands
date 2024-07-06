
var cls = require("./lib/class"),
    Messages = require("./message"),
    Utils = require("./utils"),
    Properties = require("./properties"),
    Types = require("../../shared/js/gametypes");
    
module.exports = Character = Entity.extend({
    init: function(id, type, kind, x, y) {
        this._super(id, type, kind, x, y);
        
        this.orientation = Utils.randomOrientation();
        this.attackers = {};
        this.target = null;
    },
    
    getState: function() {
        var basestate = this._getBaseState(),
            state = [];
        
        state.push(this.orientation);
        state.push(this.level);
        if(this.target) {
            state.push(this.target);
        }
        
        return basestate.concat(state);
    },
    
    resetHitPoints: function(maxHitPoints) {
        this.maxHitPoints = maxHitPoints;
        this.hitPoints = this.maxHitPoints;
    },
    
    regenHealthBy: function(value) {
        var hp = this.hitPoints,
            max = this.maxHitPoints;
            
        if(hp < max) {
            if(hp + value <= max) {
                this.hitPoints += value;
            }
            else {
                this.hitPoints = max;
            }
        }
    },
    
    hasFullHealth: function() {
        return this.hitPoints === this.maxHitPoints;
    },
    
    setTarget: function(entity) {
        this.target = entity.id;
    },
    
    clearTarget: function() {
        this.target = null;
    },
    
    hasTarget: function() {
        return this.target !== null;
    },
    
    attack: function() {
        return new Messages.Attack(this.id, this.target);
    },
    
    health: function() {
        return new Messages.Health(this.hitPoints, false);
    },
    
    regen: function() {
        return new Messages.Health(this.hitPoints, true);
    },
    
    addAttacker: function(entity) {
        if(entity) {
            this.attackers[entity.id] = entity;
        }
    },
    
    removeAttacker: function(entity) {
        if(entity && entity.id in this.attackers) {
            delete this.attackers[entity.id];
            //console.debug(this.id +" REMOVED ATTACKER "+ entity.id);
        }
    },
    
    forEachAttacker: function(callback) {
        for(var id in this.attackers) {
            callback(this.attackers[id]);
        }
    },

    getMoveSpeed: function() {
        return;
    },

    getAttackRate: function() {
        return;
    },

    getWeaponLevel: function () {
        return this.weaponLevel;
    },

    isInCombat: function() {
        return;
    },

    getActiveBuff: function() {
        return;
    },

    getStealth: function() {
        return 1;
    },

    drop: function(item) {
        if(item) {
            return new Messages.Drop(this, item);
        }
    },
});

var Area = require('./area'),
    _ = require('underscore'),
    Types = require("../../shared/js/gametypes");

module.exports = ChestArea = Area.extend({
    init: function(id, x, y, width, height, cx, cy, items, world) {
        this._super(id, x, y, width, height, world);
        this.items = items;
        this.chestX = cx;
        this.chestY = cy;
    },

    setChances: function(chances) {
        this.chances = chances;
    },

    // Reward membership is independent of the area's roaming/respawn owner.
    addToArea: function(mob) {
        if (this.entities.some(entity => entity.id === mob.id)) return;
        this.entities.push(mob);
        mob.chestAreas ||= new Set();mob.chestAreas.add(this);
        if (this.isFull()) this.hasCompletelyRespawned = true;
    },

    removeFromArea: function(mob) {
        const index = this.entities.findIndex(entity => entity.id === mob.id);
        if (index < 0) return;
        this.entities.splice(index, 1);
        if (this.isEmpty() && this.hasCompletelyRespawned && this.empty_callback) {
            this.hasCompletelyRespawned = false;this.empty_callback();
        }
    },

    contains: function(entity) {
        if(entity) {
            return entity.x >= this.x
                && entity.y >= this.y
                && entity.x < this.x + this.width
                && entity.y < this.y + this.height;
        } else {
            return false;
        }
    }
});

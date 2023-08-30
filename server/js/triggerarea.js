
var Area = require('./area'),
    _ = require('underscore'),
    Types = require("../../shared/js/gametypes");

module.exports = TriggerArea = Area.extend({
    init: function(id, x, y, width, height, trigger, world) {
        this._super(id, x, y, width, height, world);
        this.trigger = trigger;
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
const Utils = require("../../server/js/utils");

define(function() {

    var Area = Class.extend({
        init: function(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        },
    
        contains: function(entity) {
            if(entity) {
                return entity.gridX >= this.x
                    && entity.gridY >= this.y
                    && entity.gridX < this.x + this.width
                    && entity.gridY < this.y + this.height;
            } else {
                return false;
            }
        },

        isOutOfBounds: function (x, y) {
            return (x < this.x || x >= this.x + this.width || y < this.y || y >= this.y + this.height);
        },

        getRandomPosition() {
            let pos = {};

            pos.x = this.x + Utils.randomInt(0, this.width - 1);
            pos.y = this.y + Utils.randomInt(0, this.height - 1);
            return pos;
        }
    });
    
    return Area;
});
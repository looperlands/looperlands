
define(function() {

    var Float = Class.extend({
        init: function(gX, gY, playerId, fishingRod) {
            this.gridX = gX;
            this.gridY = gY;
            this.id = playerId;
            this.spriteName = "item-" + fishingRod;
        }
    });
    
    return Float;
});
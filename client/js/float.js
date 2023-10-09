
define(function() {

    var Float = Class.extend({
        init: function(gX, gY, playerId, fishingRod) {
            this.gridX = gX;
            this.gridY = gY;
            this.id = playerId;
            this.spriteName = "item-" + fishingRod;
            this.despawnDuration = 30000;
        }
    });
    
    return Float;
});
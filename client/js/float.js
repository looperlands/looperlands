
define(function() {

    var Float = Class.extend({
        init: function(gX, gY, playerId, fishingRod) {
            this.gridX = gX;
            this.gridY = gY;
            this.id = playerId;
            this.rodName = fishingRod;
            this.spriteName = "item-" + fishingRod;
            this.castAt = Date.now();
            this.releaseAt = this.castAt + 120;
            this.landAt = this.releaseAt + 360;
            this.biteAt = null;
            this.reelAt = null;
        },

        reelDuration: 280,
        despawnDuration: 30000
    });
    
    return Float;
});

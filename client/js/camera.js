
define(function() {

    var Camera = Class.extend({
        init: function(renderer) {
            this.renderer = renderer;
            this.x = 0;
            this.y = 0;
            this.gridX = 0;
            this.gridY = 0;
            this.offset = 0.5;
            this.rescale();
        },
    
        rescale: function() {
            var factor = this.renderer.mobile ? 1 : 2;
        
            this.gridW = 15 * factor;
            this.gridH = 7 * factor;
        
            console.debug("---------");
            console.debug("Factor:"+factor);
            console.debug("W:"+this.gridW + " H:" + this.gridH);
        },

        setPosition: function(x, y) {
            this.x = x;
            this.y = y;
    
            this.gridX = Math.floor( x / 16 );
            this.gridY = Math.floor( y / 16 );
        },

        setGridPosition: function(x, y) {
            this.gridX = x;
            this.gridY = y;
        
            this.x = this.gridX * 16;
            this.y = this.gridY * 16;
        },

        lookAt: function(entity) {
            if (entity) {
                var r = this.renderer,
                    x = Math.round( entity.x - (Math.floor(this.gridW / 2) * r.tilesize) ),
                    y = Math.round( entity.y - (Math.floor(this.gridH / 2) * r.tilesize) );
        
                this.setPosition(x, y);
            }
        },

        forEachVisiblePosition: function(callback, extra) {
            extra = extra || 0;
            for(let y=this.gridY-extra, maxY=this.gridY+this.gridH+(extra*2); y < maxY; y += 1) {
                for(let x=this.gridX-extra, maxX=this.gridX+this.gridW+(extra*2); x < maxX; x += 1) {
                    callback(x, y);
                }
            }
        },
        
        isVisible: function(entity) {
            return this.isVisiblePosition(entity.gridX, entity.gridY);
        },
        
        isVisiblePosition: function(x, y, extra) {
            extra = extra || 0;
            return y >= this.gridY - extra && y < this.gridY + this.gridH + (extra * 2)
                && x >= this.gridX - extra && x < this.gridX + this.gridW + (extra * 2);
        },
    
        focusEntity: function(entity) {
            var w = this.gridW - 2,
                h = this.gridH - 2,
                x = Math.floor((entity.gridX - 1) / w) * w,
                y = Math.floor((entity.gridY - 1) / h) * h;

            this.setGridPosition(x, y);
        }
    });

    return Camera;
});

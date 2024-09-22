
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
            this.checkBounds();
        },
    
        rescale: function() {
            var factor = this.renderer.mobile ? 1 : 2;
        
            this.gridW = 15 * factor;
            this.gridH = 7 * factor;

            this.checkBounds();

            console.debug("---------");
            console.debug("Factor:"+factor);
            console.debug("W:"+this.gridW + " H:" + this.gridH);
        },

        setBoundingBox: function(gridX, gridY, gridW, gridH) {
            this.bounds = { x: gridX, y: gridY, w: gridW, h: gridH };
            this.checkBounds();
        },

        removeBoundingBox: function(entity) {
            this.bounds = null;
            this.focusEntity(entity);
            this.checkBounds();
        },

        setPosition: function(x, y) {
            this.x = x;
            this.y = y;
    
            this.gridX = Math.floor( x / 16 );
            this.gridY = Math.floor( y / 16 );

            this.checkBounds();
        },

        setGridPosition: function(x, y) {
            this.gridX = x;
            this.gridY = y;
        
            this.x = this.gridX * 16;
            this.y = this.gridY * 16;

            this.checkBounds();
        },

        checkBounds: function() {
            if(this.bounds) {
                if(Math.floor(this.x / 16) < this.bounds.x) {
                    this.gridX = this.bounds.x;
                    this.x = this.gridX * 16;
                }
                if(Math.floor(this.y / 16) < this.bounds.y) {
                    this.gridY = this.bounds.y;
                    this.y = this.gridY * 16;
                }
                if(Math.ceil(this.x / 16) + this.gridW > this.bounds.x + this.bounds.w) {
                    this.gridX = this.bounds.x + this.bounds.w - this.gridW;
                    this.x = this.gridX * 16;
                }
                if(Math.ceil(this.y / 16) + this.gridH > this.bounds.y + this.bounds.h) {
                    this.gridY = this.bounds.y + this.bounds.h - this.gridH;
                    this.y = this.gridY * 16;
                }

                // Center camera on bounds if smaller than grid
                if(this.gridW > this.bounds.w) {
                    this.gridX = Math.floor(this.bounds.x + (this.bounds.w/2) - (this.gridW/2))
                    this.x = this.gridX * 16;
                }
                if(this.gridH > this.bounds.h) {
                    this.gridY = Math.floor(this.bounds.y + (this.bounds.h/2) - (this.gridH/2))
                    this.y = this.gridY * 16;
                }
            }
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
            this.checkBounds();
            extra = extra || 0;
            return y >= this.gridY - extra && y < this.gridY + this.gridH + (extra * 2)
                && x >= this.gridX - extra && x < this.gridX + this.gridW + (extra * 2);
        },
    
        focusEntity: function(entity) {
            var w = this.gridW ,
                h = this.gridH,
                x = entity.gridX - Math.round(w/2),
                y = entity.gridY - Math.round(h/2);

            this.setGridPosition(x, y);
        }
    });

    return Camera;
});

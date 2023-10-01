
define(['camera', 'item', 'character', 'player', 'timer', 'mob'], 
function(Camera, Item, Character, Player, Timer, Mob) {

    var Renderer = Class.extend({
        init: function(game, canvas, background, foreground) {
            this.game = game;
            this.context = (canvas && canvas.getContext) ? canvas.getContext("2d") : null;
            //this.background = (background && background.getContext) ? background.getContext("2d") : null;
            this.foreground = (foreground && foreground.getContext) ? foreground.getContext("2d") : null;

            let highCanvas = document.getElementById("high-canvas").transferControlToOffscreen();
            let backgroundAnimated = document.getElementById("background-animated").transferControlToOffscreen();
            let highAnimated = document.getElementById("high-canvas-animated").transferControlToOffscreen();

            let offScreenCanvas = background.transferControlToOffscreen();
            this.background = background;
        
            this.canvas = canvas;
            this.backcanvas = background;
            this.forecanvas = foreground;

            this.initFPS();
            this.tilesize = 16;
        
            this.upscaledRendering = true;
            this.supportsSilhouettes = this.upscaledRendering;
            this.worker = new Worker("js/renderer-webworker.js");
        
            this.lastTime = new Date();
            this.frameCount = 0;
            this.maxFPS = this.FPS;
            this.realFPS = 0;
            this.isDebugInfoVisible = false;
        
            this.animatedTileCount = 0;
            this.highTileCount = 0;
        
            this.tablet = Detect.isTablet(window.innerWidth);
            
            this.fixFlickeringTimer = new Timer(100);

            this.worker.postMessage({"canvas":  offScreenCanvas, "type": "setCanvas", "id": "background"}, [offScreenCanvas]);
            this.worker.postMessage({"canvas":  backgroundAnimated, "type": "setCanvas", "id": "backgroundAnimated"}, [backgroundAnimated]);
            this.worker.postMessage({"canvas":  highCanvas, "type": "setCanvas", "id": "high"}, [highCanvas]);
            this.worker.postMessage({"canvas":  highAnimated, "type": "setCanvas", "id": "highAnimated"}, [highAnimated]);
            this.rescale(this.getScaleFactor());

            let self = this;
            this.worker.addEventListener("message", (e) => {
                if (e.data.type === "rendered") {
                    self.game.tick();
                }
            });
        },
    
        getWidth: function() {
            return this.canvas.width;
        },
    
        getHeight: function() {
            return this.canvas.height;
        },
    
        setTileset: function(tileset) {
            this.tileset = tileset;
            console.log(tileset);
            this.worker.postMessage({type: "setTileset", src: tileset.src});
        },
    
        getScaleFactor: function() {
            var w = window.innerWidth,
                h = window.innerHeight,
                scale;
        
            this.mobile = false;
        
            if(w <= 1000) {
                scale = 2;
                this.mobile = true;
            }
            else if(w <= 1500 || h <= 870) {
                scale = 2;
            }
            else {
                scale = 3;
            }
        
            return scale;
        },
    
        rescale: function(factor) {
            this.scale = this.getScaleFactor();
        
            this.createCamera();
        
            this.context.imageSmoothingEnabled  = false;
            this.background.imageSmoothingEnabled  = false;
            this.foreground.imageSmoothingEnabled  = false;
        
            this.initFont();
            this.initFPS();
        
            if(!this.upscaledRendering && this.game.map && this.game.map.tilesets) {
                this.setTileset(this.game.map.tilesets[this.scale - 1]);
            }
            if(this.game.renderer) {
                this.game.setSpriteScale(this.scale);
            }
        },

        createCamera: function() {
            this.camera = new Camera(this);
            this.camera.rescale();
        
            this.canvas.width = this.camera.gridW * this.tilesize * this.scale;
            this.canvas.height = this.camera.gridH * this.tilesize * this.scale;
            console.debug("#entities set to "+this.canvas.width+" x "+this.canvas.height);
        
            this.worker.postMessage({type: "setCanvasSize", width: this.canvas.width, height: this.canvas.height});
            console.debug("#background set to "+this.backcanvas.width+" x "+this.backcanvas.height);
        
            this.forecanvas.width = this.canvas.width;
            this.forecanvas.height = this.canvas.height;
            console.debug("#foreground set to "+this.forecanvas.width+" x "+this.forecanvas.height);
        },
    
        initFPS: function() {
            this.FPS = this.mobile ? 50 : 50;
        },
    
        initFont: function() {
            var fontsize;
        
            switch(this.scale) {
                case 1:
                    fontsize = 10; break;
                case 2:
                    fontsize = Detect.isWindows() ? 10 : 13; break;
                case 3:
                    fontsize = 20;
            }
            this.setFontSize(fontsize);
        },
    
        setFontSize: function(size) {
            var font = size+"px GraphicPixel";
        
            this.context.font = font;
            this.background.font = font;
        },

        drawText: function(text, x, y, centered, color, strokeColor, title) {
            var ctx = this.context;
            
            let strokeSize;

            switch(this.scale) {
                case 1:
                    strokeSize = 3; break;
                case 2:
                    strokeSize = 3; break;
                case 3:
                    strokeSize = 5;
            }

            if(text && x && y) {
                ctx.save();
                if(centered) {
                    ctx.textAlign = "center";
                }
                if (title) {
                    switch(this.scale) {
                        case 1: this.setFontSize(5); break;
                        case 2: this.setFontSize(10); break;
                        case 3: this.setFontSize(15); break;
                    }
                }
                ctx.strokeStyle = strokeColor || "#373737";
                ctx.lineWidth = strokeSize;
                ctx.strokeText(text, x, y);
                ctx.fillStyle = color || "white";
                ctx.fillText(text, x, y);
                ctx.restore();
            }
        },
    
        drawCellRect: function(x, y, color) {
            this.context.save();
            this.context.lineWidth = 2*this.scale;
            this.context.strokeStyle = color;
            this.context.translate(x+2, y+2);
            this.context.strokeRect(0, 0, (this.tilesize * this.scale) - 4, (this.tilesize * this.scale) - 4);
            this.context.restore();
        },

        drawCellHighlight: function(x, y, color) {
            var s = this.scale,
                ts = this.tilesize,
                tx = x * ts * s,
                ty = y * ts * s;
        
            this.drawCellRect(tx, ty, color);
        },
    
        drawTargetCell: function() {
            var mouse = this.game.getMouseGridPosition();
        
            if(this.game.targetCellVisible && !(mouse.x === this.game.selectedX && mouse.y === this.game.selectedY)) {
                this.drawCellHighlight(mouse.x, mouse.y, this.game.targetColor);
            }
        },
    
        drawAttackTargetCell: function() {
            var mouse = this.game.getMouseGridPosition(),
                entity = this.game.getEntityAt(mouse.x, mouse.y),
                s = this.scale;
        
            if(entity) {
                this.drawCellRect(entity.x * s, entity.y * s, "rgba(255, 0, 0, 0.5)");
            }
        },
    
        drawOccupiedCells: function() {
            var positions = this.game.entityGrid;
        
            if(positions) {
                for(var i=0; i < positions.length; i += 1) {
                    for(var j=0; j < positions[i].length; j += 1) {
                        if(!_.isNull(positions[i][j])) {
                            this.drawCellHighlight(i, j, "rgba(50, 50, 255, 0.5)");
                        }
                    }
                }
            }
        },
    
        drawPathingCells: function() {
            var grid = this.game.pathingGrid;
        
            if(grid && this.game.debugPathing) {
                for(var y=0; y < grid.length; y += 1) {
                    for(var x=0; x < grid[y].length; x += 1) {
                        if(grid[y][x] !== 0 && this.game.camera.isVisiblePosition(x, y)) {
                            this.drawCellHighlight(x, y, "rgba(50, 50, 255, 0.5)");
                        }
                    }
                }
            }
        },

        drawSelectedCell: function() {
            if (this.game.keyboardMovement === true) {
                return;
            }
            var sprite = this.game.cursors["target"],
                anim = this.game.targetAnimation,
                os = this.upscaledRendering ? 1 : this.scale,
                ds = this.upscaledRendering ? this.scale : 1;
        
            if(this.game.selectedCellVisible) {
                if(sprite && anim) {
                    var	frame = anim.currentFrame,
                        s = this.scale,
                        x = frame.x * os,
                        y = frame.y * os,
                        w = sprite.width * os,
                        h = sprite.height * os,
                        ts = 16,
                        dx = this.game.selectedX * ts * s,
                        dy = this.game.selectedY * ts * s,
                        dw = w * ds,
                        dh = h * ds;

                    this.context.save();
                    this.context.translate(dx, dy);
                    this.context.drawImage(sprite.image, x, y, w, h, 0, 0, dw, dh);
                    this.context.restore();
                }
            }
        },
    
        clearScaledRect: function(ctx, x, y, w, h) {
            var s = this.scale;
        
            ctx.clearRect(x * s, y * s, w * s, h * s);
        },

        drawCursor: function() {
            var mx = this.game.mouse.x,
                my = this.game.mouse.y,
                s = this.scale,
                os = this.upscaledRendering ? 1 : this.scale;
        
            this.context.save();
            if(this.game.currentCursor && this.game.currentCursor.isLoaded) {
                this.context.drawImage(this.game.currentCursor.image, 0, 0, 14 * os, 14 * os, mx, my, 14*s, 14*s);
            }
            this.context.restore();
        },

        drawScaledImage: function(ctx, image, x, y, w, h, dx, dy) {
            var s = this.upscaledRendering ? 1 : this.scale;
            _.each(arguments, function(arg) {
                if(_.isUndefined(arg) || _.isNaN(arg) || _.isNull(arg) || arg < 0) {
                    console.error("x:"+x+" y:"+y+" w:"+w+" h:"+h+" dx:"+dx+" dy:"+dy, true);
                    throw Error("A problem occured when trying to draw on the canvas");
                }
            });
        
            ctx.drawImage(image,
                          x * s,
                          y * s,
                          w * s,
                          h * s,
                          dx * this.scale,
                          dy * this.scale,
                          w * this.scale,
                          h * this.scale);
        },

        drawTile: function(ctx, tileid, tileset, setW, gridW, cellid) {
            var s = this.upscaledRendering ? 1 : this.scale;
            if(tileid !== -1) { // -1 when tile is empty in Tiled. Don't attempt to draw it.
                this.drawScaledImage(ctx,
                                     tileset,
                                     getX(tileid + 1, (setW / s)) * this.tilesize,
                                     Math.floor(tileid / (setW / s)) * this.tilesize,
                                     this.tilesize,
                                     this.tilesize,
                                     getX(cellid + 1, gridW) * this.tilesize,
                                     Math.floor(cellid / gridW) * this.tilesize);
            }
        },
    
        clearTile: function(ctx, gridW, cellid) {
            var s = this.scale,
                ts = this.tilesize,
                x = getX(cellid + 1, gridW) * ts * s,
                y = Math.floor(cellid / gridW) * ts * s,
                w = ts * s,
                h = w;
        
            ctx.beginPath();
            ctx.fillStyle = "rgba(0, 0, 0, 255)";
            ctx.fillRect(x, y, h, w);
            ctx.stroke();
        },

        drawEntity: function(entity) {
            var sprite = entity.sprite,
                shadow = this.game.shadows["small"],
                anim = entity.currentAnimation,
                os = this.upscaledRendering ? 1 : this.scale,
                ds = this.upscaledRendering ? this.scale : 1;
        
            if(anim && sprite) {
                var	frame = anim.currentFrame,
                    s = this.scale,
                    x = frame.x * os,
                    y = frame.y * os,
                    w = sprite.width * os,
                    h = sprite.height * os,
                    ox = sprite.offsetX * s,
                    oy = sprite.offsetY * s,
                    dx = entity.x * s,
                    dy = entity.y * s,
                    dw = w * ds,
                    dh = h * ds;
            
                if(entity.isFading) {
                    this.context.save();
                    this.context.globalAlpha = entity.fadingAlpha;
                }
                
                if(!(entity instanceof Mob && entity.isFriendly)) { // friendly mobs render nameless
                this.drawEntityName(entity, sprite.offsetY);
                }
                
                this.context.save();
                if(entity.flipSpriteX) {
                    this.context.translate(dx + this.tilesize*s, dy);
                    this.context.scale(-1, 1);
                }
                else if(entity.flipSpriteY) {
                    this.context.translate(dx, dy + dh);
                    this.context.scale(1, -1);
                }
                else {
                    this.context.translate(dx, dy);
                }
            
                if(entity.isVisible()) {
                    if(entity.hasShadow()) {
                        this.context.drawImage(shadow.image, 0, 0, shadow.width * os, shadow.height * os,
                                               0,
                                               entity.shadowOffsetY * ds,
                                               shadow.width * os * ds, shadow.height * os * ds);
                    }
                
                    this.context.drawImage(sprite.image, x, y, w, h, ox, oy, dw, dh);

                    if(entity instanceof Item && entity.kind !== Types.Entities.CAKE) {
                        var sparks = this.game.sprites["sparks"],
                            anim = this.game.sparksAnimation,
                            frame = anim.currentFrame,
                            sx = sparks.width * frame.index * os,
                            sy = sparks.height * anim.row * os,
                            sw = sparks.width * os,
                            sh = sparks.width * os;

                        this.context.drawImage(sparks.image, sx, sy, sw, sh,
                                               sparks.offsetX * s,
                                               sparks.offsetY * s,
                                               sw * ds, sh * ds);
                    }
                }
            
                if(entity instanceof Character && !entity.isDead && entity.hasWeapon()) {
                    var weapon = this.game.sprites[entity.getWeaponName()];
        
                    if(weapon) {
                        var weaponAnimData = weapon.animationData[anim.name],
                            index = frame.index < weaponAnimData.length ? frame.index : frame.index % weaponAnimData.length;
                            wx = weapon.width * index * os,
                            wy = weapon.height * anim.row * os,
                            ww = weapon.width * os,
                            wh = weapon.height * os;

                        this.context.drawImage(weapon.image, wx, wy, ww, wh,
                                               weapon.offsetX * s,
                                               weapon.offsetY * s,
                                               ww * ds, wh * ds);
                    }
                }
            
                this.context.restore();
            
                if(entity.isFading) {
                    this.context.restore();
                }
            }
        },

        drawEntities: function(dirtyOnly) {
            var self = this;
        
            function handleDrawingEntity(entity) {
                let stuckEntity = entity.lastUpdate !== undefined ? self.game.currentTime - entity.lastUpdate > 1000 : false;
                if (stuckEntity) {
                    self.game.unregisterEntityPosition(entity);
                    return;
                }
                if(entity.isLoaded) {
                    if(dirtyOnly) {
                        if(entity.isDirty) {
                            self.drawEntity(entity);
                            
                            entity.isDirty = false;
                            entity.oldDirtyRect = entity.dirtyRect;
                            entity.dirtyRect = null;
                        }
                    } else {
                        self.drawEntity(entity);
                    }
                }
            }

            let drawAfter =[];

            this.game.forEachVisibleEntityByDepth(function(entity){
                if (Types.isFieldEffect(entity.kind)) { //draw FieldEffects first
                    handleDrawingEntity(entity);
                } else {
                    drawAfter.push(entity); //push the other entities to draw next
                }
            });

            drawAfter.forEach((entity) => handleDrawingEntity(entity));
        },
        
        drawDirtyEntities: function() {
            this.drawEntities(true);
        },
        
        clearDirtyRect: function(r) {
            this.context.clearRect(r.x, r.y, r.w, r.h);
        },
    
        clearDirtyRects: function() {
            var self = this,
                count = 0;
            
            this.game.forEachVisibleEntityByDepth(function(entity) {
                if(entity.isDirty && entity.oldDirtyRect) {
                    self.clearDirtyRect(entity.oldDirtyRect);
                    count += 1;
                }
            });
            
            let animatedTileUpdate = function(tile) {
                if(tile.isDirty) {
                    self.clearDirtyRect(tile.dirtyRect);
                    count += 1;
                }
            }
            this.game.forEachAnimatedTile(animatedTileUpdate);
            this.game.forEachHighAnimatedTile(animatedTileUpdate);
            
            if(this.game.clearTarget && this.lastTargetPos) {
                var last = this.lastTargetPos;
                    rect = this.getTargetBoundingRect(last.x, last.y);
                
                this.clearDirtyRect(rect);
                this.game.clearTarget = false;
                count += 1;
            }
            
            if(count > 0) {
                //console.debug("count:"+count);
            }
        },
        
        getEntityBoundingRect: function(entity) {
            var rect = {},
                s = this.scale,
                spr;
                
            if(entity instanceof Player && entity.hasWeapon()) {
                var weapon = this.game.sprites[entity.getWeaponName()];
                spr = weapon;
            } else {
                spr = entity.sprite;
            }
    
            if(spr) {
                rect.x = (entity.x + spr.offsetX - this.camera.x) * s;
                rect.y = (entity.y + spr.offsetY - this.camera.y) * s;
                rect.w = spr.width * s;
                rect.h = spr.height * s;
                rect.left = rect.x;
                rect.right = rect.x + rect.w;
                rect.top = rect.y;
                rect.bottom = rect.y + rect.h;
            }
            return rect;
        },
        
        getTileBoundingRect: function(tile) {
            var rect = {},
                gridW = this.game.map.width,
                s = this.scale,
                ts = this.tilesize,
                cellid = tile.index;
            
            rect.x = ((getX(cellid + 1, gridW) * ts) - this.camera.x) * s;
            rect.y = ((Math.floor(cellid / gridW) * ts) - this.camera.y) * s;
            rect.w = ts * s;
            rect.h = ts * s;
            rect.left = rect.x;
            rect.right = rect.x + rect.w;
            rect.top = rect.y;
            rect.bottom = rect.y + rect.h;
            
            return rect;
        },
        
        getTargetBoundingRect: function(x, y) {
            var rect = {},
                s = this.scale,
                ts = this.tilesize,
                tx = x || this.game.selectedX,
                ty = y || this.game.selectedY;
            
            rect.x = ((tx * ts) - this.camera.x) * s;
            rect.y = ((ty * ts) - this.camera.y) * s;
            rect.w = ts * s;
            rect.h = ts * s;
            rect.left = rect.x;
            rect.right = rect.x + rect.w;
            rect.top = rect.y;
            rect.bottom = rect.y + rect.h;
            
            return rect;
        },
        
        isIntersecting: function(rect1, rect2) {
            return !((rect2.left > rect1.right) ||
                     (rect2.right < rect1.left) ||
                     (rect2.top > rect1.bottom) ||
                     (rect2.bottom < rect1.top));
        },
        
        drawEntityName: function(entity, oy) {
            this.context.save();
            if(entity.name && (entity instanceof Player || entity instanceof Mob)) {
                var color = (entity.id === this.game.playerId) ? "#fcda5c" : this.getHpIndicatorColor(entity);
                let entityData = entity.name;
                if (entity.level !== undefined && entity.level !== null) { //currently it's null on revive, as the player doesn't get welcome message from the server
                    entityData = entity.level + " " + entityData;
                }
                
                this.drawText(entityData,
                              (entity.x + 8) * this.scale,
                              (entity.y + oy) * this.scale,
                              true,
                              color);

                if (entity.title !== undefined) {
                    if (entity instanceof Player){
                        this.drawText(entity.title, (entity.x + 8) * this.scale, (entity.y + entity.nameOffsetY + 5) * this.scale, true, "white", 1, true);
                    } else {
                        this.drawText(entity.title, (entity.x + 8) * this.scale, (entity.y + oy + 6) * this.scale, true, "orange", 1, true);
                    }
                }
            }
            this.context.restore();
        },
        
        getHpIndicatorColor: function(entity) {
            if (entity.maxHitPoints !== undefined && entity.hitPoints !== undefined) {
                lifePercentage = entity.hitPoints/entity.maxHitPoints * 100;

                if (lifePercentage >= 95) {
                    return "green";
                } else if (lifePercentage >= 90) {
                    return "forestgreen";
                } else if (lifePercentage >= 80) {
                    return "greenyellow"
                } else if (lifePercentage >= 50) {
                    return "yellow";
                } else if (lifePercentage >= 25) {
                    return "orange";
                } else if (lifePercentage >= 10) {
                    return "orangered";
                } else if (lifePercentage >= 5) {
                    return "red";
                } else if (lifePercentage >= 0) {
                    return "black";
                }
            }
        },

        drawTerrain: function() {
            return { "type": "render", id: "background", tiles: this.game.visibleTerrainTiles, cameraX: this.camera.x, cameraY: this.camera.y, scale: this.scale, clear: true }
        },
    
        drawAnimatedTiles: function() {
            var self = this,
                m = this.game.map,
                tilesetwidth = this.tileset.width / m.tilesize;

            let visbileTiles = [];
            if (this.game.visibleAnimatedTiles !== undefined) {
                for (let tile of this.game.visibleAnimatedTiles) {
                    visbileTiles.push({tileid: tile.id, setW: tilesetwidth, gridW: m.width, cellid: tile.index});
                }
                return {"type": "render", id: "backgroundAnimated", tiles: visbileTiles, cameraX: this.camera.x, cameraY: this.camera.y, scale: this.scale, clear: true};
            }
        },

        drawHighAnimatedTiles: function() {
            var self = this,
                m = this.game.map,
                tilesetwidth = this.tileset.width / m.tilesize;

                let visbileTiles = [];
                if (this.game.visibleAnimatedHighTiles !== undefined) {
                    for (let tile of this.game.visibleAnimatedHighTiles) {
                        visbileTiles.push({tileid: tile.id, setW: tilesetwidth, gridW: m.width, cellid: tile.index});
                    }
                    return {"type": "render", id: "highAnimated", tiles: visbileTiles, cameraX: this.camera.x, cameraY: this.camera.y, scale: this.scale, clear: true};
                }

        },
        
        drawDirtyAnimatedTiles: function() {
            this.drawAnimatedTiles(true);
        },
    
        drawHighTiles: function(ctx) {
            var self = this,
                m = this.game.map,
                tilesetwidth = this.tileset.width / m.tilesize;
        
                return {"type": "render", id: "high", tiles: this.game.visibleHighTiles, cameraX: this.camera.x, cameraY: this.camera.y, scale: this.scale, clear: true};
        },

        drawBackground: function(ctx, color) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        },

        drawFPS: function() {
            var nowTime = new Date(),
                diffTime = nowTime.getTime() - this.lastTime.getTime();

            if (diffTime >= 1000) {
                this.realFPS = this.frameCount;
                this.frameCount = 0;
                this.lastTime = nowTime;
            }
            this.frameCount++;
        
            //this.drawText("FPS: " + this.realFPS + " / " + this.maxFPS, 30, 30, false);
            this.drawText("FPS: " + this.realFPS, 30, 30, false);
        },
    
        drawDebugInfo: function() {
            if(this.isDebugInfoVisible) {
                this.drawFPS();
                this.drawText("A: " + this.animatedTileCount, 100, 30, false);
                this.drawText("H: " + this.highTileCount, 140, 30, false);
            }
        },
    
        drawCombatInfo: function() {
            var self = this;
        
            switch(this.scale) {
                case 2: this.setFontSize(20); break;
                case 3: this.setFontSize(30); break;
            }
            this.game.infoManager.forEachInfo(function(info) {
                self.context.save();
                self.context.globalAlpha = info.opacity;
                self.drawText(info.value, (info.x + 8) * self.scale, Math.floor(info.y * self.scale), true, info.fillColor, info.strokeColor);
                self.context.restore();
            });
            this.initFont();
        },
    
        setCameraView: function(ctx) {
            ctx.translate(-this.camera.x * this.scale, -this.camera.y * this.scale);
        },
    
        clearScreen: function(ctx) {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        },
    
        getPlayerImage: function() {
            var canvas = document.createElement('canvas'),
    	        ctx = canvas.getContext('2d'),
    	        os = this.upscaledRendering ? 1 : this.scale,
    	        player = this.game.player,
    	        sprite = player.getArmorSprite(),
    	        spriteAnim = sprite.animationData["idle_down"],
    	        // character
    	        row = spriteAnim.row,
                w = sprite.width * os,
                h = sprite.height * os,
    	        y = row * h,
    	        // weapon
    	        weapon = this.game.sprites[this.game.player.getWeaponName()],
    	        ww = weapon.width * os,
    	        wh = weapon.height * os,
    	        wy = wh * row,
    	        offsetX = (weapon.offsetX - sprite.offsetX) * os,
    	        offsetY = (weapon.offsetY - sprite.offsetY) * os,
    	        // shadow
    	        shadow = this.game.shadows["small"],
    	        sw = shadow.width * os,
    	        sh = shadow.height * os,
    	        ox = -sprite.offsetX * os;
    	        oy = -sprite.offsetY * os;
	    
    	    canvas.width = w;
    	    canvas.height = h;
	    
    	    ctx.clearRect(0, 0, w, h);
    	    ctx.drawImage(shadow.image, 0, 0, sw, sh, ox, oy, sw, sh);
    	    ctx.drawImage(sprite.image, 0, y, w, h, 0, 0, w, h);
            ctx.drawImage(weapon.image, 0, wy, ww, wh, offsetX, offsetY, ww, wh);
        
            return canvas.toDataURL("image/png");
        },
    
        renderStaticCanvases: function() {
            this.redrawTerrain = true;
        },

        renderFrame: function() {
            let centeredCamera = !this.game.canUseCenteredCamera();
            let renderData = [];

            let terrain = [];
            let highTiles = []
            if (centeredCamera && this.redrawTerrain) {
                terrain = this.drawTerrain();
                highTiles = this.drawHighTiles();
                this.redrawTerrain = false;
            } else {
                terrain = this.drawTerrain();
                highTiles = this.drawHighTiles();
            }
            renderData.push(highTiles);
            renderData.push(terrain);

            let highAnimatedTiles = this.drawHighAnimatedTiles();
            renderData.push(highAnimatedTiles);

            let animatedTiles = this.drawAnimatedTiles();
            renderData.push(animatedTiles);

            this.clearScreen(this.context);
            this.context.save();
            this.setCameraView(this.context);
            if(this.game.started) {
                this.drawSelectedCell();
                this.drawTargetCell();
            }

            //this.drawOccupiedCells();
            this.drawPathingCells();
            this.drawEntities();
            this.drawCombatInfo();
            this.context.restore();
            // Overlay UI elements
            this.drawCursor();
            this.drawDebugInfo();
            this.worker.postMessage({"type": "render", "renderData": renderData});
        },
        
        preventFlickeringBug: function() {
            if(this.fixFlickeringTimer.isOver(this.game.currentTime)) {
                this.background.fillRect(0, 0, 0, 0);
                this.context.fillRect(0, 0, 0, 0);
                this.foreground.fillRect(0, 0, 0, 0);
            }
        }
    });

    var getX = function(id, w) {
        if(id == 0) {
            return 0;
        }
        return (id % w == 0) ? w - 1 : (id % w) - 1;
    };
    
    return Renderer;
});

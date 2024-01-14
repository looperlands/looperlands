define(['camera', 'item', 'character', 'player', 'timer', 'mob'], 
function(Camera, Item, Character, Player, Timer, Mob) {

    var Renderer = Class.extend({
        init: function(game, canvas, background, foreground) {
            this.game = game;
            this.context = (canvas && canvas.getContext) ? canvas.getContext("2d") : null;
            //this.background = (background && background.getContext) ? background.getContext("2d") : null;
            this.foreground = (foreground && foreground.getContext) ? foreground.getContext("2d") : null;

            let combinedCanvas = document.getElementById("background").transferControlToOffscreen();

            let width = canvas.width;
            let height = canvas.height;

            let offScreenCanvas = new OffscreenCanvas(width, height);
            let highCanvas = new OffscreenCanvas(width, height);
            let textCanvas = new OffscreenCanvas(width, height);
            let entitiesCanvas = new OffscreenCanvas(width, height);

            this.background = background;
        
            this.canvas = canvas;
            this.backcanvas = background;
            this.forecanvas = foreground;

            this.initFPS();
            this.tilesize = 16;
        
            this.upscaledRendering = true;
            this.supportsSilhouettes = true;
            this.worker = new Worker("js/renderer-webworker.js");
        
            this.lastTime = new Date();
            this.frameCount = 0;
            this.maxFPS = this.FPS;
            this.realFPS = 0;
            this.frameTime = 1000 / this.FPS;
            this.isDebugInfoVisible = false;
        
            this.animatedTileCount = 0;
            this.highTileCount = 0;
        
            this.tablet = Detect.isTablet(window.innerWidth);
            
            this.fixFlickeringTimer = new Timer(100);

            this.worker.postMessage({"canvas":  offScreenCanvas, "type": "setCanvas", "id": "background"}, [offScreenCanvas]);
            this.worker.postMessage({"canvas":  highCanvas, "type": "setCanvas", "id": "high"}, [highCanvas]);
            this.worker.postMessage({"canvas":  textCanvas, "type": "setCanvas", "id": "text"}, [textCanvas]);
            this.worker.postMessage({"canvas":  entitiesCanvas, "type": "setCanvas", "id": "entities"}, [entitiesCanvas]);
            this.worker.postMessage({"canvas":  combinedCanvas, "type": "setCanvas", "id": "combined"}, [combinedCanvas]);
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
        
            if( this.game.targetCellVisible 
                && !(mouse.x === this.game.selectedX && mouse.y === this.game.selectedY) 
                && this.game.app.settings.getHighlightTargetTiles()
                ) {
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

            return {"type": "render", id: "high", mx: mx, my: my, s: s, os: os, cursor : true, name: this.game.currentCursorName};
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
            let textData = undefined;
            let entityData = {drawData: []};

            var sprite = entity.sprite,
                shadow = this.game.shadows["small"],
                anim = entity.currentAnimation,
                os = this.upscaledRendering ? 1 : this.scale,
                ds = this.upscaledRendering ? this.scale : 1;
        
            if(anim && sprite) {
                let	frame = anim.currentFrame,
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
                    entityData.globalAlpha = entity.fadingAlpha;
                }
                
                if(!(entity instanceof Mob && (entity.nameless || entity.isFriendly))) { // friendly mobs render nameless by default
                    textData = this.drawEntityName(entity, sprite.offsetY);
                }
                
                if(entity.flipSpriteX) {
                    entityData.translateX = dx + this.tilesize*s;
                    entityData.translateY = dy;
                    entityData.scaleX = -1;
                    entityData.scaleY = 1;
                }
                else if(entity.flipSpriteY) {
                    entityData.translateX = dx;
                    entityData.translateY = dy + dh;
                    entityData.scaleX = 1;
                    entityData.scaleY = -1;
                }
                else {
                    entityData.translateX = dx;
                    entityData.translateY = dy;
                }
            
                if(entity.isVisible()) {
                    if(entity.hasShadow()) {
                        entityData.drawData.push({
                            "id": shadow.id,
                            "sx": 0,
                            "sy": 0,
                            "sW": shadow.width * os,
                            "sH": shadow.height * os,
                            "dx": 0,
                            "dy": entity.shadowOffsetY * ds,
                            "dW": shadow.width * os * ds,
                            "dH": shadow.height * os * ds
                        });
                    }

                    entityData.drawData.push({
                        "id": sprite.id,
                        "sx": x,
                        "sy": y,
                        "sW": w,
                        "sH": h,
                        "dx": ox,
                        "dy": oy,
                        "dW": dw,
                        "dH": dh
                    });

                    if(entity instanceof Item && entity.kind !== Types.Entities.CAKE && !entity.nosparks) {
                        let sparks = this.game.sprites["sparks"],
                            anim = this.game.sparksAnimation,
                            frame = anim.currentFrame,
                            sx = sparks.width * frame.index * os,
                            sy = sparks.height * anim.row * os,
                            sw = sparks.width * os,
                            sh = sparks.width * os;

                        entityData.drawData.push({
                            "id": sparks.id,
                            "sx": sx,
                            "sy": sy,
                            "sW": sw,
                            "sH": sh,
                            "dx": sparks.offsetX * ds,
                            "dy": sparks.offsetY * ds,
                            "dW": sw * ds,
                            "dH": sh * ds
                        });
                    }
                }
            
                if(entity instanceof Character && !entity.isDead && entity.hasWeapon()) {
                    let weapon = this.game.sprites[entity.getWeaponName()];
        
                    if(weapon) {
                        let weaponAnimData = weapon.animationData[anim.name],
                            index = frame.index < weaponAnimData.length ? frame.index : frame.index % weaponAnimData.length;
                            wx = weapon.width * index * os,
                            wy = weapon.height * anim.row * os,
                            ww = weapon.width * os,
                            wh = weapon.height * os;

                        entityData.drawData.push({
                            "id": weapon.id,
                            "sx": wx,
                            "sy": wy,
                            "sW": ww,
                            "sH": wh,
                            "dx": weapon.offsetX * ds,
                            "dy": weapon.offsetY * ds,
                            "dW": ww * ds,
                            "dH": wh * ds
                        });
                    }
                }
            }
            return [textData, entityData];
        },

        drawEntities: function(dirtyOnly) {
            let textData = [];
            let entities = [];
            var self = this;
        
            function handleDrawingEntity(entity) {
                let stuckEntity = entity.lastUpdate !== undefined ? self.game.currentTime - entity.lastUpdate > 1000 : false;
                if (stuckEntity) {
                    self.game.unregisterEntityPosition(entity);
                    return;
                }
                if(entity.isLoaded) {
                    let [newTextData, entityData] = self.drawEntity(entity);
                    if (newTextData !== undefined) {
                        textData = textData.concat(newTextData);
                    }

                    if (entityData !== undefined) {
                        entities.push(entityData);
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
            return [textData, entities];
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
            let textData = [];
            if(entity.name && (entity instanceof Player || entity instanceof Mob)) {
                let color = (entity.id === this.game.playerId) ? "#fcda5c" : this.getHpIndicatorColor(entity);
                let entityData = entity.name;

                if (entity.level !== undefined && entity.level !== null) { //currently it's null on revive, as the player doesn't get welcome message from the server
                    let level = entity.level > 0 ? entity.level : 1;
                    entityData = level + " " + entityData;
                }

                textData.push({
                    "id": "text",
                    "type": "text",
                    "text": entityData,
                    "x": (entity.x + 8) * this.scale,
                    "y": (entity.y + oy) * this.scale,
                    "centered": true,
                    "color": color
                });

                if (entity.title !== undefined) {
                    if (entity instanceof Player){
                        textData.push({
                            "id": "text",
                            "type": "text",
                            "text": entity.title,
                            "x": (entity.x + 8) * this.scale,
                            "y": (entity.y + entity.nameOffsetY + 5) * this.scale,
                            "centered": true,
                            "color": "white",
                            "title": true
                        });
                    } else {
                        textData.push({
                            "id": "text",
                            "type": "text",
                            "text": entity.title,
                            "x": (entity.x + 8) * this.scale,
                            "y": (entity.y + oy + 6) * this.scale,
                            "centered": true,
                            "color": "orange",
                            "title" : true
                        });
                    }
                }
            }
            return textData;
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
            let m = this.game.map,
                tilesetwidth = this.tileset.width / m.tilesize;

            let visbileTiles = [];
            if (this.game.visibleAnimatedTiles !== undefined) {
                let visibleAnimatedTiles = this.game.visibleAnimatedTiles;
                let visibileAnimatedTilesLength = visibleAnimatedTiles.length;
                for (let i = 0; i < visibileAnimatedTilesLength; i++) {
                    let tile = visibleAnimatedTiles[i];
                    visbileTiles.push({tileid: tile.id, setW: tilesetwidth, gridW: m.width, cellid: tile.index});
                }
                return {"type": "render", id: "background", tiles: visbileTiles, cameraX: this.camera.x, cameraY: this.camera.y, scale: this.scale, clear: false};
            }
        },

        drawHighAnimatedTiles: function() {
            let m = this.game.map,
                tilesetwidth = this.tileset.width / m.tilesize;

                let visbileTiles = [];
                if (this.game.visibleAnimatedHighTiles !== undefined) {
                    let visibileAnimatedHighTiles = this.game.visibleAnimatedHighTiles;
                    let visibileAnimatedTilesLength = visibileAnimatedHighTiles.length;
                    for (let i = 0; i < visibileAnimatedTilesLength; i++) {
                        let tile = visibileAnimatedHighTiles[i];
                        visbileTiles.push({tileid: tile.id, setW: tilesetwidth, gridW: m.width, cellid: tile.index});
                    }
                    return {"type": "render", id: "high", tiles: visbileTiles, cameraX: this.camera.x, cameraY: this.camera.y, scale: this.scale, clear: false};
                }

        },
        
        drawDirtyAnimatedTiles: function() {
            this.drawAnimatedTiles(true);
        },
    
        drawHighTiles: function() {
            let m = this.game.map;
        
            return {"type": "render", id: "high", tiles: this.game.visibleHighTiles, cameraX: this.camera.x, cameraY: this.camera.y, scale: this.scale, clear: true};
        },

        drawToggledLayers: function(ctx, highTile, animated) {
            if(highTile === undefined) {
                highTile = false;
            }
            var self = this,
                m = this.game.map,
                tilesetwidth = this.tileset.width / m.tilesize;

            _.forEach(Object.keys(self.game.map.hiddenLayers), function(layerName) {
                if(self.game.toggledLayers[layerName] === true) {
                    let layer = self.game.map.hiddenLayers[layerName];
                    self.game.forEachVisibleTileIndex(function(tileIndex) {
                        if(layer[tileIndex] === null || layer[tileIndex] === undefined) {
                            return;
                        }
                        if(highTile === m.isHighTile(layer[tileIndex]) && animated === m.isAnimatedTile(layer[tileIndex])) {
                            self.drawTile(ctx, layer[tileIndex] - 1, self.tileset, tilesetwidth, m.width, tileIndex);
                        }
                    }, 1);
                }
            });
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
            //this.drawText("FPS: " + this.realFPS, 30, 30, false);
        },
    
        drawDebugInfo: function() {
            if(this.isDebugInfoVisible) {
                //this.drawFPS();
                //this.drawText("A: " + this.animatedTileCount, 100, 30, false);
                //this.drawText("H: " + this.highTileCount, 140, 30, false);
            }
        },
    
        drawCombatInfo: function() {
            let combatTextData = [];
            let self = this;
        
            let fontSize;
            if (this.scale === 2) {
                fontSize = 20;
            } else if (this.scale === 3) {
                fontSize = 30;
            }

            this.game.infoManager.forEachInfo(function(info) {
                let textData = {
                    "id": "text",
                    "type": "text",
                    "text": info.value,
                    "x": (info.x + 8) * self.scale,
                    "y": Math.floor(info.y * self.scale),
                    "centered": true,
                    "color": info.fillColor,
                    "strokeColor": info.strokeColor,
                    "globalAlpha": info.opacity,
                    "fontSize": fontSize
                }
                combatTextData.push(textData);
            });
            return combatTextData;
        },

        drawFishingFloat: function(inputFloat) {
            let float = this.game.sprites[inputFloat.spriteName],
                            anim = this.game.floatAnimation;

            if(anim && float) {
                let s = this.scale,
                os = this.upscaledRendering ? 1 : s,
                ds = this.upscaledRendering ? s : 1,
                frame = anim.currentFrame,
                fx = float.width * frame.index * os,
                fy = float.height * anim.row * os,
                fw = float.width * os,
                fh = float.height * os;

                this.context.save();
                this.context.translate(inputFloat.gridX * this.tilesize * s, inputFloat.gridY * this.tilesize * s);
                this.context.drawImage(float.image, fx, fy, fw, fh,
                                    float.offsetX * s,
                                    float.offsetY * s,
                                    fw * ds, fh * ds);
                this.context.restore();
            }
        },

        drawFloats: function() {
            var self = this;

            this.game.forEachFloat(function(float){
                self.drawFishingFloat(float);
            });

        },
    
        setCameraView: function(ctx) {
            ctx.translate(-this.camera.x * this.scale, -this.camera.y * this.scale);
        },
    
        clearScreen: function(ctx) {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        },
    
        renderStaticCanvases: function() {
            this.redrawTerrain = true;
        },

        renderFrame: function() {

            let centeredCamera = !this.game.canUseCenteredCamera();
            let renderText = this.game.app.settings.getRenderText();
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

            this.renderStaticCanvases();
            this.drawToggledLayers(this.context, false, false);
            this.drawToggledLayers(this.context, false, true);

            if(this.game.started) {
                this.drawSelectedCell();
                this.drawTargetCell();
            }

            //this.drawOccupiedCells();
            this.drawPathingCells();
            let [entityTextData, entityDrawData] = this.drawEntities();
            let drawEntitiesData = {
                "type": "entities",
                "id": "entities",
                "entityData": entityDrawData,
                "cameraX": this.camera.x,
                "cameraY": this.camera.y,
                "scale": this.scale
            }
            renderData.push(drawEntitiesData);
            this.drawFloats();

            let combatInfoTextData = this.drawCombatInfo();

            let textData = []
            if (renderText) {
                textData = entityTextData.concat(combatInfoTextData);
            }

            let textDataCmd = {
                "type": "text",
                "id": "text",
                "textData": textData,
                "cameraX": this.camera.x,
                "cameraY": this.camera.y,
                "scale": this.scale
            }
            renderData.push(textDataCmd);

            this.drawToggledLayers(this.context, true, false);
            this.drawToggledLayers(this.context, true, true);

            this.context.restore();
            // Overlay UI elements
            let cursorData = this.drawCursor();
            renderData.push(cursorData);
            this.drawDebugInfo();
            this.worker.postMessage({"type": "render", "renderData": renderData});
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

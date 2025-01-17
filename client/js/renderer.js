
define(['camera', 'item', 'character', 'player', 'timer', 'mob', 'npc'],
    function(Camera, Item, Character, Player, Timer, Mob, Npc) {
    
        var Renderer = Class.extend({
            init: function(game, canvas, background, foreground) {
                this.game = game;
    
                if(this.game.map && !this.game.map.getCurrentScene()) {
                    this.camera.removeBoundingBox(this.game.player);
                }
    
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
                let highEntitiesCanvas = new OffscreenCanvas(width, height);
                let lightCanvas = new OffscreenCanvas(width, height);
                let aboveLight = new OffscreenCanvas(width, height);
    
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
    
                this.syncedLights = false;
    
                this.tablet = Detect.isTablet(window.innerWidth);
    
                this.fixFlickeringTimer = new Timer(100);
    
                this.worker.postMessage({"canvas":  offScreenCanvas, "type": "setCanvas", "id": "background"}, [offScreenCanvas]);
                this.worker.postMessage({"canvas":  highCanvas, "type": "setCanvas", "id": "high"}, [highCanvas]);
                this.worker.postMessage({"canvas":  textCanvas, "type": "setCanvas", "id": "text"}, [textCanvas]);
                this.worker.postMessage({"canvas":  entitiesCanvas, "type": "setCanvas", "id": "entities"}, [entitiesCanvas]);
                this.worker.postMessage({"canvas":  highEntitiesCanvas, "type": "setCanvas", "id": "highEntities"}, [highEntitiesCanvas]);
                this.worker.postMessage({"canvas":  combinedCanvas, "type": "setCanvas", "id": "combined"}, [combinedCanvas]);
                this.worker.postMessage({"canvas":  lightCanvas, "type": "setCanvas", "id": "lighting"}, [lightCanvas]);
                this.worker.postMessage({"canvas":  aboveLight, "type": "setCanvas", "id": "aboveLight"}, [aboveLight]);
    
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
                this.FPS = 50;
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
    
                return {"type": "render", id: "aboveLight", mx: mx, my: my, s: s, os: os, cursor : true, name: this.game.currentCursorName};
            },
    
            drawScaledImage: function(ctx, image, x, y, w, h, dx, dy, colorShift = null) {
                var s = this.upscaledRendering ? 1 : this.scale;
    
                // Validate required arguments
                [x, y, w, h, dx, dy].forEach((arg) => {
                    if (arg === undefined || isNaN(arg) || arg === null || arg < 0) {
                        console.error("x:" + x + " y:" + y + " w:" + w + " h:" + h + " dx:" + dx + " dy:" + dy, true);
                        throw new Error("A problem occurred when trying to draw on the canvas");
                    }
                });
    
                let sx = x * s;
                let sy = y * s;
                let sw = w * s;
                let sh = h * s;
                let dxs = dx * this.scale;
                let dys = dy * this.scale;
                let dw = w * this.scale;
                let dh = h * this.scale;
    
                if (colorShift) {
                    // Create an offscreen canvas
                    const offscreenCanvas = document.createElement('canvas');
                    offscreenCanvas.width = dw;
                    offscreenCanvas.height = dh;
                    const offscreenCtx = offscreenCanvas.getContext('2d');
    
                    // Clear the offscreen canvas before drawing
                    offscreenCtx.clearRect(0, 0, dw, dh);
                    offscreenCtx.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);
    
                    if (colorShift) {
                        let imageData = offscreenCtx.getImageData(0, 0, dw, dh);
                        imageData = this.applyColorShift(imageData, colorShift);
                        offscreenCtx.putImageData(imageData, 0, 0);
                    }
    
                    // Draw the scaled image from the offscreen canvas to the main canvas
                    ctx.drawImage(offscreenCanvas, 0, 0, dw, dh, dxs, dys, dw, dh);
                } else {
                    ctx.drawImage(image, sx, sy, sw, sh, dxs, dys, dw, dh);
                }
            },
    
            applyColorShift: function(imageData, colorShift) {
                const { colorDifference, progress } = colorShift;
                const data = imageData.data;
    
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, data[i] + Math.round(colorDifference.r * progress))); // Red
                    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + Math.round(colorDifference.g * progress))); // Green
                    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + Math.round(colorDifference.b * progress))); // Blue
                    //data[i + 3] = data[i + 3]; // Alpha remains the same as the original
                }
    
                return imageData;
            },
    
            drawTile: function(ctx, tileid, tileset, setW, setH, gridW, cellid, scale, slideOffsetX, slideOffsetY, colorShift = null) {
                if (tileid !== -1) { // -1 when tile is empty in Tiled. Don't attempt to draw it.
                    const tileX = getX(tileid + 1, (setW / scale), slideOffsetX) * this.tilesize;
                    const tileY = getY(tileid + 1, (setW / scale), (setH / scale), slideOffsetY) * this.tilesize;
                    const destX = getX(cellid + 1, gridW) * this.tilesize;
                    const destY = Math.floor(cellid / gridW) * this.tilesize;
    
                    this.drawScaledImage(ctx, tileset, tileX, tileY, this.tilesize, this.tilesize, destX, destY, colorShift);
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
                        dh = h * ds,
                        a = entity.angle;
    
                    if(entity.isFading) {
                        entityData.globalAlpha = entity.fadingAlpha;
                    }
    
                    if(!(entity instanceof Mob && (entity.nameless || (entity.isFriendly && !entity.exitingCombat)))) { // friendly mobs render nameless by default, make sure mob is actually friendly and not just exiting combat
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
                                "spriteName": "shadow16",
                                "sx": 0,
                                "sy": 0,
                                "sW": shadow.width * os,
                                "sH": shadow.height * os,
                                "dx": entity.shadowOffsetX * ds,
                                "dy": entity.shadowOffsetY * ds,
                                "dW": shadow.width * os * ds,
                                "dH": shadow.height * os * ds,
                            });
                        }
    
    
                        if(entity instanceof Character && !entity.isDead && entity.hasWeapon()) {
                            let weapon = this.game.sprites[entity.getWeaponName()];
    
                            if(!Types.alwaysOnTop(entity.getWeaponName()) && entity.orientation === Types.Orientations.UP) {
                                if (weapon) {
                                    let weaponAnimData = weapon.animationData[anim.name],
                                        index = frame.index < weaponAnimData.length ? frame.index : frame.index % weaponAnimData.length;
                                    wx = weapon.width * index * os,
                                        wy = weapon.height * anim.row * os,
                                        ww = weapon.width * os,
                                        wh = weapon.height * os;
    
                                    entityData.drawData.push({
                                        "id": weapon.id,
                                        "spriteName": entity.getWeaponName(),
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
    
                        entityData.drawData.push({
                            "id": sprite.id,
                            "spriteName": entity.sprite.name,
                            "sx": x,
                            "sy": y,
                            "sW": w,
                            "sH": h,
                            "dx": ox,
                            "dy": oy,
                            "dW": dw,
                            "dH": dh,
                            "a": a
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
                                "spriteName": "sparks",
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
                        if(Types.alwaysOnTop(entity.getWeaponName()) || entity.orientation !== Types.Orientations.UP) {
                            if (weapon) {
                                let weaponAnimData = weapon.animationData[anim.name],
                                    index = frame.index < weaponAnimData.length ? frame.index : frame.index % weaponAnimData.length;
                                wx = weapon.width * index * os,
                                    wy = weapon.height * anim.row * os,
                                    ww = weapon.width * os,
                                    wh = weapon.height * os;
    
                                entityData.drawData.push({
                                    "id": weapon.id,
                                    "spriteName": entity.getWeaponName(),
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
    
                    if (entity instanceof Npc) {
                       if(entity.showIndicator) {
                           let indicator = this.game.sprites["indicator"],
                               anim = this.game.indicatorAnimation,
                               frame = anim.currentFrame,
                               sx = indicator.width * frame.index * os,
                               sy = indicator.height * anim.row * os,
                               sw = indicator.width * os,
                               sh = indicator.width * os;
    
                           entityData.drawData.push({
                               "id": indicator.id,
                               "spriteName": "indicator",
                               "renderAbove": true,
                               "sx": sx,
                               "sy": sy,
                               "sW": sw,
                               "sH": sh,
                               "dx": indicator.offsetX * ds,
                               "dy": indicator.offsetY * ds,
                               "dW": sw * ds,
                               "dH": sh * ds
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
                    let opacity = (entity.id === this.game.playerId || entity.attackingMode || entity.followingMode || entity.inCombat) ? 1.0 : 0.5;
                    let entityData = entity.name;
                    
                    let renderThisText = (entity.id === this.game.playerId) ? this.game.app.settings.getRenderMyText() : this.game.app.settings.getRenderText();
                    if(!renderThisText){return textData;} // if player's setting selections say don't render this, skip entity
    
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
                        "color": color,
                        "globalAlpha": opacity
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
                    tilesetheight = this.tileset.height / m.tilesize;
    
                let visbileTiles = [];
                if (this.game.visibleAnimatedTiles !== undefined) {
                    let visibleAnimatedTiles = this.game.visibleAnimatedTiles;
                    let visibileAnimatedTilesLength = visibleAnimatedTiles.length;
                    for (let i = 0; i < visibileAnimatedTilesLength; i++) {
                        let tile = visibleAnimatedTiles[i];
                        let slideOffset = tile ? tile.getCurrentOffset() : { x: 0, y: 0 };
                        let colorShift = tile ? tile.getColorShiftForFrame() : null;
                        visbileTiles.push({tileid: tile.id, setW: tilesetwidth, setH: tilesetheight, gridW: m.width, cellid: tile.index, slideOffsetX: slideOffset.x, slideOffsetY: slideOffset.y, colorShift: colorShift});
                    }
                    return {"type": "render", id: "background", tiles: visbileTiles, cameraX: this.camera.x, cameraY: this.camera.y, scale: this.scale, clear: false};
                }
            },
    
            drawHighAnimatedTiles: function() {
                let m = this.game.map,
                    tilesetwidth = this.tileset.width / m.tilesize;
                    tilesetheight = this.tileset.height / m.tilesize;
    
                    let visbileTiles = [];
                    if (this.game.visibleAnimatedHighTiles !== undefined) {
                        let visibileAnimatedHighTiles = this.game.visibleAnimatedHighTiles;
                        let visibileAnimatedTilesLength = visibileAnimatedHighTiles.length;
                        for (let i = 0; i < visibileAnimatedTilesLength; i++) {
                            let tile = visibileAnimatedHighTiles[i];
                            let slideOffset = tile ? tile.getCurrentOffset() : { x: 0, y: 0 };
                            let colorShift = tile ? tile.getColorShiftForFrame() : null;
                            visbileTiles.push({tileid: tile.id, setW: tilesetwidth, setH: tilesetheight, gridW: m.width, cellid: tile.index,  slideOffsetX: slideOffset.x, slideOffsetY: slideOffset.y, colorShift: colorShift});
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
                    visbileTiles = self.game.visibleAnimatedTiles;
                    tilesetwidth = this.tileset.width / m.tilesize;
                    tilesetheight = this.tileset.height / m.tilesize;
                    var scale = this.upscaledRendering ? 1 : this.scale;
    
                _.forEach(Object.keys(self.game.map.hiddenLayers), function(layerName) {
                    if(self.game.toggledLayers[layerName] === true) {
                        let layer = self.game.map.hiddenLayers[layerName];
                        self.game.forEachVisibleTileIndex(function(tileIndex) {
                            if(layer[tileIndex] === null || layer[tileIndex] === undefined) {
                                return;
                            }
                            if(highTile === m.isHighTile(layer[tileIndex]) && animated === m.isAnimatedTile(layer[tileIndex])) {
                                let tile = visbileTiles.find(t => t.id === layer[tileIndex] - 1);
                                let slideOffset = tile ? tile.getCurrentOffset() : { x: 0, y: 0 };
                                let colorShift = tile ? tile.getColorShiftForFrame() : null;
                                self.drawTile(ctx, layer[tileIndex] - 1, self.tileset, tilesetwidth, tilesetheight, m.width, tileIndex, scale, slideOffset.x, slideOffset.y, colorShift);
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
                    console.debug('FPS', this.realFPS);
                    this.frameCount = 0;
                    this.lastTime = nowTime;
                }
                this.frameCount++;
    
                //this.drawText("FPS: " + this.realFPS + " / " + this.maxFPS, 30, 30, false);
                //this.drawText("FPS: " + this.realFPS, 30, 30, false);
            },
    
            drawDebugInfo: function() {
                if(this.isDebugInfoVisible) {
                    this.drawFPS();
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
    
            drawLights: function() {
              return {
                  "type": "render",
                  "id":"lights",
                  "tiles": [],
                  "cameraX": this.camera.x,
                  "cameraY": this.camera.y,
                  "scale": this.scale,
                  "clear": false,
                  "options": {
                      'shadows': this.game.app.settings.getRenderShadows(),
                      'playerShadow': this.game.app.settings.getRenderPlayerShadow(),
                      'dynamicLights': this.game.app.settings.getEnableDynamicLights(),
                  }
              };
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
    
                if(this.game.map && !this.syncedLights) {
                    this.worker.postMessage({"type": "setLights", "lights": this.game.map.lights})
                    this.worker.postMessage({"type": "setObstacles", "obstacles": this.game.map.shadows})
                    this.worker.postMessage({"type": "setLightEmittingTiles", "lightEmittingTiles": this.game.map.lightTiles})
                    this.syncedLights = true;
                }
    
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
    
                if(this.game.started && !$("#minigame").hasClass("active")) {
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
                this.drawLights();
    
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
                if(!$("#minigame").hasClass("active") && this.game.app.settings.getCursor()){
                    let cursorData = this.drawCursor();
                    renderData.push(cursorData);
                }
    
                renderData.push(this.drawLights());
    
                this.drawDebugInfo();
                let scene = this.game.map.getCurrentScene(this.game.player);
                if(!scene) {
                    scene = {
                        dn_cycle: false,
                        darkness: 0,
                    }
                }
    
                if(!scene.darkness) {
                    scene.darkness = 0;
                }
    
                if(this.game.player) {
                    this.worker.postMessage({
                        type: "render",
                        renderData: renderData,
                        player: {x: this.game.player.x, y: this.game.player.y},
                        serverTime: this.game.serverTime,
                        scene: scene
                    });
                } else {
                    this.worker.postMessage({
                        type: "render",
                        renderData: renderData,
                        player: {x: 0, y: 0},
                        serverTime: this.game.serverTime,
                        scene: scene
                    });
                }
            }
        });
    
        var getX = function(id, w, slideOffsetX = 0) {
            if (id == 0) {
                return 0;
            }
            let x = (id % w == 0) ? w - 1 : (id % w) - 1;
            x += slideOffsetX / 16; // Convert slide offset to tiles
            if (x >= w) x = w - 1; // Boundary check
            if (x < 0) x = 0; // Boundary check
            return x;
        };
    
        var getY = function(id, w, h, slideOffsetY = 0) {
            if (id == 0) {
                return 0;
            }
            let y = Math.floor((id - 1) / w);
            y += slideOffsetY / 16; // Convert slide offset to tiles
            if (y >= h) y = h - 1; // Boundary check
            if (y < 0) y = 0; // Boundary check
            return y;
        };
    
        return Renderer;
    });
    
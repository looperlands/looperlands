let tileset = undefined;
let tilesize = 16;
let canvases = {};
let contexes = {};
let cursors = {};
let cursor = undefined;
let sprites = {};

let lightEmittingTiles = {};
let lights = [];
let obstacles = [];

let hasLoadedFont = false;
let GLOBAL_LIGHT_INTENSITY = 0.2;
const MIN_GLOBAL_LIGHT_INTENSITY = 0.08;
const MAX_GLOBAL_LIGHT_INTENSITY = 0.90;
const MAX_LIGHTS_TO_RENDER = 100;
const MAX_SHADOWS_TO_RENDER = 100;

let OPTION_SHADOWS = true;
let OPTION_DYNAMIC_LIGHTS = true;
let OPTION_PLAYER_SHADOW = true;

// Day/night cycle of 1 hour
const CYCLE_DURATION = 1000 * 60 * 60;
let playerPosition = null;

function transformObstacles(obstacles) {
    let transformedObstacles = [];
    if (!obstacles) {
        return transformedObstacles;
    }

    obstacles.forEach(obstacle => {
        // if we get an object with x, y, width, height, convert it to a polygon
        if (obstacle.width !== undefined && obstacle.height !== undefined) {
            obstacle = [
                { x: obstacle.x, y: obstacle.y },
                { x: obstacle.x + obstacle.width, y: obstacle.y },
                { x: obstacle.x + obstacle.width, y: obstacle.y + obstacle.height },
                { x: obstacle.x, y: obstacle.y + obstacle.height },
            ];
        }

        if (obstacle.polygon) {
            obstacle = obstacle.polygon.points.split(" ").map(point => {
                const [x, y] = point.split(",").map(Number);
                return { x: parseFloat(obstacle.x) + x, y: parseFloat(obstacle.y) + y };
            });
        }

        transformedObstacles.push(obstacle);
    })

    return transformedObstacles;
}

function pulseAnimation(lightSource, time, pulseStrength = 0.05, pulseSpeed = 3, radiusVariation = 0.15, intensityVariation = 0.01) {
    // pulseStrength = Strength of the glow pulsation
    // pulseSpeed = Speed of the pulse animation
    // radiusVariation = Variation in light radius
    // intensityVariation = Variation in light intensity

    // Smooth pulsation effect using sine wave
    const pulse = Math.sin(time * pulseSpeed) * pulseStrength + Math.random() * pulseStrength;

    // Adjust radius of the pulsating effect
    lightSource.radius = Math.max(2, lightSource.radius * (1 + pulse * radiusVariation));

    // Adjust intensity of the pulsating glow
    lightSource.intensity = Math.max(0.3, lightSource.intensity * (1 + pulse * intensityVariation));
}

function fireAnimation(lightSource, time) {
    const positionVariation = 0.8; // Controls how much the light "jumps" in position
    // Add a slight movement to simulate the light source "dancing"
    lightSource.x += (Math.random() - 0.5) * positionVariation;
    lightSource.y += (Math.random() - 0.5) * positionVariation;
    pulseAnimation(lightSource, time)
}

function radioactiveAnimation(lightSource, time) {
    const hueShiftSpeed = 0.5; // Speed at which the hue cycles
    const hueShift = Math.sin(time * hueShiftSpeed) * 30; // +/- 30 degrees shift
    lightSource.color = `hsl(${120 + hueShift}, 100%, 60%)`; // Greenish hues
    pulseAnimation(lightSource, time)
}

class Sprite {
    constructor(id, src, animationData, width, height, offsetX, offsetY) {
        this.id = id;
        this.src = src;
        this.animationData = animationData;
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }

    async load() {
        let self = this;
        loadImg(this.src).then((img) => {
            self.image = img;
        });
    }
}

async function loadImg(src) {
    try {
        const imgblob = await fetch(src)
            .then(r => r.blob());
        return await createImageBitmap(imgblob);
    } catch (e) {
        console.log(e, src);
    }
}

async function loadFont() {
    if (self.FontFace) {
        // first declare our font-face
        const fontFace = new FontFace(
            'GraphicPixel',
            "url('../fonts/graphicpixel-webfont.eot') format('embedded-opentype'), url('../fonts/graphicpixel-webfont.eot?#iefix') format('embedded-opentype'), url('../fonts/graphicpixel-webfont.woff') format('woff'), url('../fonts/graphicpixel-webfont.ttf') format('truetype'), url('../fonts/graphicpixel-webfont.svg#GraphicPixelRegular') format('svg')"
        );
        // add it to the list of fonts our worker supports
        self.fonts.add(fontFace);
        await fontFace.load();
    }

    hasLoadedFont = true;
}

var getX = function (id, w, slideOffsetX = 0) {
    if (id == 0) {
        return 0;
    }
    let x = (id % w == 0) ? w - 1 : (id % w) - 1;
    x += slideOffsetX / 16; // Convert slide offset to tiles
    if (x >= w) x = w - 1; // Boundary check
    if (x < 0) x = 0; // Boundary check
    return x;
};

var getY = function (id, w, h, slideOffsetY = 0) {
    if (id == 0) {
        return 0;
    }
    let y = Math.floor((id - 1) / w);
    y += slideOffsetY / 16; // Convert slide offset to tiles
    if (y >= h) y = h - 1; // Boundary check
    if (y < 0) y = 0; // Boundary check
    return y;
};

// Cache object to store scaled images
const imageCache = {};
const cacheKeys = [];
const MAX_CACHE_SIZE = 4096; // Adjust as needed

// Function to generate a unique cache key
function getCacheKey(x, y, w, h, scale, colorShift) {
    const colorDiffKey = colorShift ? `${colorShift.colorDifference.r},${colorShift.colorDifference.g},${colorShift.colorDifference.b}` : 'null';
    const progressKey = colorShift ? colorShift.progress : 'null';
    return `${x},${y},${w},${h},${scale},${colorDiffKey},${progressKey}`;
}

function addToImageCache(cacheKey, offCanvas) {
    imageCache[cacheKey] = offCanvas;
    cacheKeys.push(cacheKey);

    // Handle cache size limit
    if (cacheKeys.length > MAX_CACHE_SIZE) {
        cacheKeys.shift();
        delete imageCache[cacheKeys];
    }
}

function drawScaledImage(ctx, image, x, y, w, h, dx, dy, scale, colorShift = null) {
    const cacheKey = getCacheKey(x, y, w, h, scale, colorShift);

    let dxs = dx * scale;
    let dys = dy * scale;
    let dw = w * scale;
    let dh = h * scale;

    // Check if the scaled image is in the cache
    if (imageCache[cacheKey]) {
        // Draw the cached image
        ctx.drawImage(imageCache[cacheKey], dxs, dys);
    } else {
        // Create an offscreen canvas
        const offCanvas = new OffscreenCanvas(dw, dh);
        const offCtx = offCanvas.getContext('2d');

        // Disable image smoothing
        offCtx.imageSmoothingEnabled = false;

        // Clear offscreen canvas then draw the scaled image
        offCtx.clearRect(0, 0, dw, dh);
        offCtx.drawImage(image, x, y, w, h, 0, 0, dw, dh);

        // Apply color transition if applicable
        if (colorShift) {
            let imageData = offCtx.getImageData(0, 0, dw, dh);
            imageData = applyColorShift(imageData, colorShift);
            offCtx.putImageData(imageData, 0, 0);
        }

        // Store the scaled image in the cache
        addToImageCache(cacheKey, offCanvas);

        // Draw the scaled image from the offscreen canvas to the main canvas
        ctx.drawImage(offCanvas, dxs, dys);
    }
}

function applyColorShift(imageData, colorShift) {
    const { colorDifference, progress } = colorShift;
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + Math.round(colorDifference.r * progress))); // Red
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + Math.round(colorDifference.g * progress))); // Green
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + Math.round(colorDifference.b * progress))); // Blue
        //data[i + 3] = data[i + 3]; // Alpha remains the same as the original
    }

    return imageData;
}

function drawTile(ctx, tileid, tileset, setW, setH, gridW, cellid, scale, slideOffsetX, slideOffsetY, colorShift = null) {
    if (tileid !== -1) { // -1 when tile is empty in Tiled. Don't attempt to draw it.
        const tileX = getX(tileid + 1, setW, slideOffsetX) * tilesize;
        const tileY = getY(tileid + 1, setW, setH, slideOffsetY) * tilesize;
        const destX = getX(cellid + 1, gridW) * tilesize;
        const destY = Math.floor(cellid / gridW) * tilesize;
        drawScaledImage(ctx, tileset, tileX, tileY, tilesize, tilesize, destX, destY, scale, colorShift);
    }
}

let tileLights = [];

function render(id, tiles, cameraX, cameraY, scale, clear, serverTime, scene, options) {
    let ctx = contexes[id];
    if (id !== "lights") {
        let canvas = canvases[id];
        if (clear === true) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        ctx.save();
        ctx.translate(-cameraX * scale, -cameraY * scale);

        const tilesLength = tiles.length;

        // Render the game world normally (tiles, entities, etc.)
        for (let i = 0; i < tilesLength; i++) {
            let tile = tiles[i];
            if (tile.id !== -1) {
                // Render your tile here as usual...
                drawTile(ctx, tile.tileid, tileset, tile.setW, tile.setH, tile.gridW, tile.cellid, scale, tile.slideOffsetX, tile.slideOffsetY, tile.colorShift);

                if (lightEmittingTiles && lightEmittingTiles[String(parseInt(tile.tileid + 1))]) {
                    let lightEmittingTile = Object.assign({}, lightEmittingTiles[tile.tileid + 1]);

                    let destX = getX(tile.cellid + 1, tile.gridW) * tilesize;
                    let destY = Math.floor(tile.cellid / tile.gridW) * tilesize;
                    lightEmittingTile.x = destX;
                    lightEmittingTile.y = destY;
                    tileLights.push(lightEmittingTile);
                }
            }
        }

        ctx.restore();
    } else {
        renderLightOverlay(lights, cameraX, cameraY, scale, serverTime, scene, tileLights, options);
        tileLights = [];
    }
}

onmessage = (e) => {
    if (!hasLoadedFont) {
        loadFont();
    }

    if (e.data.type === "setTileset") {
        loadImg(e.data.src).then((img) => {
            tileset = img;
        });
    } else if (e.data.type === "loadCursor") {
        loadImg(e.data.src).then((img) => {
            cursors[e.data.name] = img;
            console.log("loaded cursor", e.data.name);
        });
    } else if (e.data.type === "render") {
        const renderDataLength = e.data.renderData.length;
        let scale = 1;
        for (let i = 0; i < renderDataLength; i++) {
            let renderData = e.data.renderData[i];
            playerPosition = e.data.player;

            if (renderData.cursor !== undefined) {
                renderCursor(renderData);
            } else if (renderData.type === "text") {
                drawText(renderData);
            } else if (renderData.type === "entities") {
                drawEntities(renderData);
            } else {
                scale = renderData.scale;
                render(renderData.id, renderData.tiles, renderData.cameraX, renderData.cameraY, 1, renderData.clear, e.data.serverTime, e.data.scene, renderData.options);
            }
        }

        let combinedCanvas = canvases["combined"];
        let combinedCtx = contexes["combined"];

        // Perform double buffering by drawing all canvases to a single canvas
        combinedCtx.clearRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedCtx.save();
        combinedCtx.drawImage(canvases["background"], 0, 0, canvases["background"].width * scale, canvases["background"].height * scale);
        combinedCtx.drawImage(canvases["entities"], 0, 0);
        combinedCtx.drawImage(canvases["text"], 0, 0);
        combinedCtx.drawImage(canvases["high"], 0, 0, canvases["high"].width * scale, canvases["high"].height * scale);
        combinedCtx.drawImage(canvases["highEntities"], 0, 0);

        // Render the light overlay on top of everything else
        let origCompositeOperation = combinedCtx.globalCompositeOperation;
        combinedCtx.globalCompositeOperation = 'multiply';  // Use 'multiply' for lighting effect
        combinedCtx.drawImage(canvases['lighting'], 0, 0, canvases['lighting'].width * scale, canvases['lighting'].height * scale);
        combinedCtx.globalCompositeOperation = origCompositeOperation;  // Reset the composite operation

        combinedCtx.drawImage(canvases["aboveLight"], 0, 0);

        // Restore the default composite operation
        combinedCtx.restore();

        requestAnimationFrame(() => {
            postMessage({ type: "rendered" });
        });
    } else if (e.data.type === "setCanvasSize") {

        for (let id in canvases) {
            let canvas = canvases[id];
            let ctx = contexes[id];
            canvas.width = e.data.width;
            canvas.height = e.data.height;
            ctx.imageSmoothingEnabled = false;
        }
    } else if (e.data.type === "setCanvas") {
        let id = e.data.id;
        let canvas = e.data.canvas;
        canvases[id] = canvas;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        contexes[id] = ctx;
    } else if (e.data.type === "loadSprite") {
        sprites[e.data.spriteName] = new Sprite(e.data.spriteName, e.data.src, e.data.animationData, e.data.width, e.data.height, e.data.offsetX, e.data.offsetY);
    } else if (e.data.type === "setLights") {
        lights = e.data.lights;
    } else if (e.data.type === "setObstacles") {
        obstacles = e.data.obstacles;
        obstacles = transformObstacles(obstacles);
    } else if (e.data.type === "setLightEmittingTiles") {
        lightEmittingTiles = e.data.lightEmittingTiles;
    } else if (e.data.type === "idle") {
        requestAnimationFrame(() => {
            postMessage({ type: "rendered" });
        });
    }
};

function renderCursor(renderData) {
    let mx = renderData.mx;
    let my = renderData.my;
    let s = renderData.s;
    let os = renderData.os;
    let cursorImg = cursors[renderData.name];
    let ctx = contexes[renderData.id];
    ctx.clearRect(0, 0, canvases[renderData.id].width, canvases[renderData.id].height);
    ctx.save();
    ctx.drawImage(cursorImg, 0, 0, 14 * os, 14 * os, mx, my, 14 * s, 14 * s);
    ctx.restore();
}

let lastRenderLength = 0;

async function drawText(renderData) {
    const textDataLength = renderData.textData.length;

    /*
        Don't render if there is no text to render the second time
        which allows for clearing the screen once
        after the user disables the text rendering
    */
    let disabled = textDataLength === lastRenderLength && textDataLength === 0;
    if (disabled) {
        return;
    }

    let id = renderData.id;
    let ctx = contexes[id];
    let canvas = canvases[id];

    const cameraX = renderData.cameraX;
    const cameraY = renderData.cameraY;
    const scale = renderData.scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX * scale, -cameraY * scale);
    for (let i = 0; i < textDataLength; i++) {
        let textData = renderData.textData[i];
        let { text, x, y, centered, color, strokeColor, title } = textData;

        let strokeSize;

        switch (scale) {
            case 1:
                strokeSize = 3;
                break;
            case 2:
                strokeSize = 3;
                break;
            case 3:
                strokeSize = 5;
        }

        if (text && x && y) {
            if (centered) {
                ctx.textAlign = "center";
            }
            let fontSize;
            if (title) {
                switch (scale) {
                    case 1:
                        fontSize = 5;
                        break;
                    case 2:
                        fontSize = 10;
                        break;
                    case 3:
                        fontSize = 15;
                        break;
                }
            } else {
                if (textData.fontSize) {
                    fontSize = textData.fontSize;
                } else {
                    switch (scale) {
                        case 1:
                            fontSize = 10;
                            break;
                        case 2:
                            fontSize = 13;
                            break;
                        case 3:
                            fontSize = 20;
                            break;
                    }
                }
            }

            let font = `${fontSize}px GraphicPixel`;
            ctx.font = font;

            if (textData.globalAlpha !== undefined) {
                ctx.globalAlpha = textData.globalAlpha;
            }

            ctx.strokeStyle = strokeColor || "#373737";
            ctx.lineWidth = strokeSize;
            ctx.strokeText(text, x, y);
            ctx.fillStyle = color || "white";
            ctx.fillText(text, x, y);

        }
    }
    ctx.restore();
    lastRenderLength = textDataLength;
}

function drawEntities(drawEntitiesData) {
    let id = drawEntitiesData.id;
    let ctx = contexes[id];
    let canvas = canvases[id];
    let highCtx = contexes["highEntities"];
    let highCanvas = canvases["highEntities"];

    const cameraX = drawEntitiesData.cameraX;
    const cameraY = drawEntitiesData.cameraY;
    const scale = drawEntitiesData.scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-cameraX * scale, -cameraY * scale);
    highCtx.clearRect(0, 0, highCanvas.width, highCanvas.height);
    highCtx.save();
    highCtx.translate(-cameraX * scale, -cameraY * scale);

    const entityCount = drawEntitiesData.entityData.length;

    for (let i = 0; i < entityCount; i++) {
        const entityData = drawEntitiesData.entityData[i];
        ctx.save();
        highCtx.save();

        if (entityData.globalAlpha !== undefined && Number.isNaN(entityData.globalAlpha) === false) {
            ctx.globalAlpha = entityData.globalAlpha;
            highCtx.globalAlpha = entityData.globalAlpha;
        }

        ctx.translate(entityData.translateX, entityData.translateY);
        highCtx.translate(entityData.translateX, entityData.translateY);
        if (entityData.scaleX !== undefined && entityData.scaleY !== undefined) {
            ctx.scale(entityData.scaleX, entityData.scaleY);
            highCtx.scale(entityData.scaleX, entityData.scaleY);
        }
        let drawDataLength = entityData.drawData.length;

        for (let y = 0; y < drawDataLength; y++) {
            const drawData = entityData.drawData[y];
            const { id, spriteName, sx, sy, sW, sH, dx, dy, dW, dH, a, renderAbove } = drawData;
            const origCtx = ctx;
            if (renderAbove) {
                ctx = highCtx;
            }
            let sprite = sprites[spriteName];

            if (sprite) {
                try {
                    if (a) {
                        let centerX = dW / 2;
                        let centerY = dH / 2;

                        ctx.translate(centerX, centerY);
                        ctx.rotate(a);

                        let offsetFactorX = Math.cos(a);
                        let offsetFactoryY = Math.cos(a);

                        ctx.drawImage(sprite.image, sx, sy, sW, sH, ((offsetFactorX * dx) - (dW / 2)), ((offsetFactoryY * dy) - (dW / 2)), dW, dH);
                        ctx.rotate(-a);
                        ctx.translate(-centerX, -centerY);
                    } else {
                        ctx.drawImage(sprite.image, sx, sy, sW, sH, dx, dy, dW, dH);
                    }
                } catch (e) {
                    console.log('exception', e);
                    if (sprite.image === undefined) {
                        sprite.load();
                    } else {
                        console.log(e);
                    }
                }
            } else {
                console.log('no sprite', spriteName);
            }

            ctx = origCtx;
        }
        ctx.restore();
        highCtx.restore();
    }
    ctx.restore();
    highCtx.restore();
}

lastTime = null;

function renderLightOverlay(lightSources, cameraX, cameraY, scale, serverTime, scene, tileLights, options) {

    OPTION_SHADOWS = options?.shadows ?? true;
    OPTION_PLAYER_SHADOW = options?.playerShadow ?? true;
    OPTION_DYNAMIC_LIGHTS = options?.dynamicLights ?? true;

    if (scene.dn_cycle && scene.dn_cycle !== "false") {
        const cycleProgress = ((serverTime + performance.now()) % CYCLE_DURATION) / CYCLE_DURATION;
        const cycleAngle = cycleProgress * Math.PI * 2;
        const cycleIntensity = Math.sin(cycleAngle) * 0.5 + 0.5;
        GLOBAL_LIGHT_INTENSITY = cycleIntensity * (MAX_GLOBAL_LIGHT_INTENSITY - MIN_GLOBAL_LIGHT_INTENSITY) + MIN_GLOBAL_LIGHT_INTENSITY;
    } else {
        GLOBAL_LIGHT_INTENSITY = 1 - parseFloat(scene.darkness);
    }
    // Clear the light canvas
    let canvas = canvases['lighting'];
    let ctx = contexes['lighting'];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Add global light
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - GLOBAL_LIGHT_INTENSITY})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const time = performance.now()

    if (lightSources) {
        // Draw each light source on the light canvas
        lightSources.filter((lightSource) => {
            // Light source in camera view
            let dx = lightSource.x - cameraX;
            let dy = lightSource.y - cameraY;
            let distance = hypot(dx, dy);

            // Light is within scene
            let lightIsInScene = lightSource.x >= (scene.x * tilesize) && lightSource.x <= (scene.x + scene.width) * tilesize && lightSource.y >= scene.y * tilesize && lightSource.y <= (scene.y + scene.height) * tilesize;
            // let lightIsInScene = true;

            if (lightSource.global) {
                return distance < canvas.width + lightSource.w && lightIsInScene;
            }

            return distance < canvas.width + (lightSource.radius * tilesize) && lightIsInScene;
        }).slice(0, MAX_LIGHTS_TO_RENDER).forEach(lightSource => {
            if (lightSource.animation && OPTION_DYNAMIC_LIGHTS) {
                lightSource = updateAnimatedLightSource(lightSource, time);
            }
            drawLightSource(ctx, lightSource, cameraX, cameraY);
        });
    }

    // Draw tile lights
    for (let i = 0; i < tileLights.length; i++) {
        let lightSource = tileLights[i];
        lightSource = Object.assign({}, lightSource); // Clone the light source to avoid modifying the original

        if (lightSource.animation && OPTION_DYNAMIC_LIGHTS) {
            lightSource = updateAnimatedLightSource(tileLights[i], time);
        }

        drawLightSource(ctx, lightSource, cameraX, cameraY);
    }

    // Player holds lantern
    drawLightSource(ctx, {
        id: 9999,
        x: playerPosition.x + 8,
        y: playerPosition.y + 6,
        radius: 4,
        innerRadius: 0,
        intensity: 0.2,
        shadow: 0,
    }, cameraX, cameraY, scene);

    let origCompositeOperation = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = "black";
    ctx.fillRect((scene.x * tilesize) - cameraX, (scene.y * tilesize) - cameraY, scene.width * tilesize, scene.height * tilesize);
    ctx.globalCompositeOperation = origCompositeOperation;
}

function updateAnimatedLightSource(lightSource, time) {
    if (!OPTION_DYNAMIC_LIGHTS) {
        return lightSource
    }

    if (lightSource.animation instanceof Function) {
        lightSource.animation(lightSource, time);
    } else {
        switch (lightSource.animation) {
            case 'pulse':
                pulseAnimation(lightSource, time);
                break;
            case 'fire':
                fireAnimation(lightSource, time);
                break;
            case 'radioactive':
                radioactiveAnimation(lightSource, time);
                break;
            default:
                console.log(`Unsupported Light Source Animation: ${lightSource.animation}`);
                break
        }
    }
    return lightSource
}

// Main entry point for light source rendering
function drawLightSource(ctx, lightSource, cameraX, cameraY) {
    const commonProps = calculateLightProperties(lightSource, cameraX, cameraY);

    const cacheKey = createCacheKey(commonProps);
    if (useCachedLight(ctx, cacheKey, commonProps)) return;

    let tmpCanvas;

    if (lightSource.type === 'polygon') {
        tmpCanvas = renderPolygonLight(ctx, cameraX, cameraY, commonProps);
    } else {
        tmpCanvas = new OffscreenCanvas(commonProps.outerRadius * 2, commonProps.outerRadius * 2);
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.imageSmoothingEnabled = false;

        if (lightSource.type === 'radial') {
            renderLightGradients(tmpCtx, commonProps);
            applyShadows(tmpCtx, commonProps, cameraX, cameraY);
        } else if (lightSource.type === 'global') {
            renderLightGradients(tmpCtx, commonProps);
        }
    }

    drawFinalLight(ctx, tmpCanvas, commonProps);
    cacheLightRendering(cacheKey, tmpCanvas, commonProps);
}

// Calculate common properties for light sources
function calculateLightProperties(lightSource, cameraX, cameraY) {
    return {
        type: lightSource.type || "unknown",
        outerRadius: (lightSource.radius || 1) * tilesize,
        innerRadius: (lightSource.innerRadius || 0) * tilesize,
        intensity: lightSource.intensity || 1,
        shadow: lightSource.shadow || 0,
        color: lightSource.color || { r: 255, g: 255, b: 255 },
        x: lightSource.x,
        y: lightSource.y,
        lightX: lightSource.x - cameraX,
        lightY: lightSource.y - cameraY,
        w: lightSource.w || 0,
        h: lightSource.h || 0,
        animation: lightSource.animation || null,
        spread: parseInt(lightSource.spread || 0),
        innerSpread: parseInt(lightSource.innerSpread || 0),
        angleDeg: parseInt(lightSource.angle || 0)
    };
}

// Create a unique cache key for light rendering
function createCacheKey(commonProps) {
    if (commonProps.type === 'polygon') {
        const polygonHash = commonProps.polygon.map(p => `${p.x},${p.y}`).join('|');
        return `poly.${polygonHash}|${commonProps.intensity}|${commonProps.color}|${commonProps.x},${commonProps.y}`;
    }
    return `l.${commonProps.outerRadius},${commonProps.innerRadius}|${commonProps.intensity},${commonProps.shadow}|${commonProps.color}|${commonProps.x},${commonProps.y}`;
}

// Check if a light is already cached and render if available
function useCachedLight(ctx, cacheKey, commonProps) {
    if (!(commonProps.animation || !OPTION_DYNAMIC_LIGHTS) && imageCache[cacheKey]) {
        let origCompositeOperation = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "screen";

        if (commonProps.type === 'polygon') {
            ctx.drawImage(imageCache[cacheKey], 0, 0);
        } else if (commonProps.type === 'global') {
            ctx.drawImage(imageCache[cacheKey], commonProps.lightX, commonProps.lightY, commonProps.w, commonProps.h);
        } else {
            ctx.drawImage(
                imageCache[cacheKey],
                commonProps.lightX - commonProps.outerRadius,
                commonProps.lightY - commonProps.outerRadius
            );
        }
        ctx.globalCompositeOperation = origCompositeOperation;
        return true;
    }
    return false;
}

// Cache rendered light for performance
function cacheLightRendering(cacheKey, tmpCanvas, commonProps) {
    if (!commonProps.animation || !OPTION_DYNAMIC_LIGHTS) {
        addToImageCache(cacheKey, tmpCanvas);
    }
}

// Render radial gradients for circular or global light sources
function renderLightGradients(ctx, commonProps) {
    const { outerRadius, innerRadius, intensity, color, spread, innerSpread, angleDeg } = commonProps;
    let origCompositeOperation = ctx.globalCompositeOperation;

    if (spread > 0) {
        const angle = toRad(angleDeg + 90);
        const arcGradient = ctx.createConicGradient(angle - toRad(spread / 2), outerRadius, outerRadius);
        arcGradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b}, 0)`);
        arcGradient.addColorStop(toPerc(spread / 2) - toPerc(innerSpread) / 2, `rgba(${color.r},${color.g},${color.b}, ${intensity})`);
        arcGradient.addColorStop(toPerc(spread / 2) + toPerc(innerSpread) / 2, `rgba(${color.r},${color.g},${color.b}, ${intensity})`);
        arcGradient.addColorStop(toPerc(spread), `rgba(${color.r},${color.g},${color.b}, 0)`);

        ctx.fillStyle = arcGradient;
        ctx.beginPath();
        ctx.arc(outerRadius, outerRadius, outerRadius, angle, angle + toRad(spread), false);
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'destination-in';
    }    

    if(commonProps.type === "global"){
        ctx.fillStyle = `rgba(${color.r},${color.g},${color.b}, ${intensity})`;
        ctx.fillRect(0, 0, commonProps.w, commonProps.h);
    }else {
        const radialGradient = ctx.createRadialGradient(outerRadius, outerRadius, innerRadius, outerRadius, outerRadius, outerRadius);
        radialGradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b}, ${intensity})`);
        radialGradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b}, 0)`);
        ctx.fillStyle = radialGradient;
        ctx.fillRect(0, 0, outerRadius * 2, outerRadius * 2);
    }
    
    ctx.globalCompositeOperation = origCompositeOperation;
}

// Render polygon light with gradient fading
function renderPolygonLight(ctx, cameraX, cameraY, commonProps) {
    const expandedPolygon = offsetPolygon(commonProps);

    // Calculate the bounding box of the polygon
    const polygonPoints = [...commonProps.polygon, ...expandedPolygon];
    const { minX, minY, maxX, maxY } = calculateBoundingBox(polygonPoints, (commonProps.fadeOffset || 1) * tilesize);

    // Create an optimized OffscreenCanvas for the polygon bounds
    const tmpCanvasWidth = Math.ceil(maxX - minX);
    const tmpCanvasHeight = Math.ceil(maxY - minY);
    const tmpCanvas = new OffscreenCanvas(tmpCanvasWidth, tmpCanvasHeight);
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.imageSmoothingEnabled = false;

    // Translate context for the polygon's bounding box
    tmpCtx.translate(-minX, -minY);

    // Fill the original polygon with full intensity
    tmpCtx.fillStyle = `rgba(${commonProps.color.r},${commonProps.color.g},${commonProps.color.b}, ${commonProps.intensity})`;
    tmpCtx.beginPath();
    commonProps.polygon.forEach((point, index) => {
        index === 0 ? tmpCtx.moveTo(point.x, point.y) : tmpCtx.lineTo(point.x, point.y);
    });
    tmpCtx.closePath();
    tmpCtx.fill();

    // Handle gradients
    expandedPolygon.forEach((expandedPoint, index) => {
        const originalPoint = commonProps.polygon[index];
        const nextOriginalPoint = commonProps.polygon[(index + 1) % commonProps.polygon.length];
        const nextExpandedPoint = expandedPolygon[(index + 1) % expandedPolygon.length];

        const isConvex = detectConvexity(originalPoint, nextOriginalPoint, expandedPoint);

        if (isConvex) {
            // Radial gradient at the vertex
            const radialGradient = tmpCtx.createRadialGradient(
                originalPoint.x,
                originalPoint.y,
                0, // Inner radius
                originalPoint.x,
                originalPoint.y,
                hypot(expandedPoint.x - originalPoint.x, expandedPoint.y - originalPoint.y) // Outer radius
            );
            radialGradient.addColorStop(0, `rgba(${commonProps.color.r},${commonProps.color.g},${commonProps.color.b}, ${commonProps.intensity})`);
            radialGradient.addColorStop(1, `rgba(${commonProps.color.r},${commonProps.color.g},${commonProps.color.b}, 0)`);

            tmpCtx.fillStyle = radialGradient;
            tmpCtx.beginPath();
            tmpCtx.moveTo(originalPoint.x, originalPoint.y);
            tmpCtx.lineTo(expandedPoint.x, expandedPoint.y);
            tmpCtx.lineTo(nextExpandedPoint.x, nextExpandedPoint.y);
            tmpCtx.lineTo(nextOriginalPoint.x, nextOriginalPoint.y);
            tmpCtx.closePath();
            tmpCtx.fill();
        } else {
            // Linear gradient along the edge
            const linearGradient = tmpCtx.createLinearGradient(
                originalPoint.x,
                originalPoint.y,
                expandedPoint.x,
                expandedPoint.y
            );
            linearGradient.addColorStop(0, `rgba(${commonProps.color.r},${commonProps.color.g},${commonProps.color.b}, ${commonProps.intensity})`);
            linearGradient.addColorStop(1, `rgba(${commonProps.color.r},${commonProps.color.g},${commonProps.color.b}, 0)`);

            tmpCtx.fillStyle = linearGradient;
            tmpCtx.beginPath();
            tmpCtx.moveTo(originalPoint.x, originalPoint.y);
            tmpCtx.lineTo(expandedPoint.x, expandedPoint.y);
            tmpCtx.lineTo(nextExpandedPoint.x, nextExpandedPoint.y);
            tmpCtx.lineTo(nextOriginalPoint.x, nextOriginalPoint.y);
            tmpCtx.closePath();
            tmpCtx.fill();
        }
    });

    // Composite the rendered polygon light onto the main canvas
    let origCompositeOperation = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(tmpCanvas, minX - cameraX, minY - cameraY);
    ctx.globalCompositeOperation = origCompositeOperation;

    return tmpCanvas;
}

// Calculate a bounding box for polygon lights to help with performance
function calculateBoundingBox(points, fadeOffset) {
    const minX = Math.min(...points.map(p => p.x)) - fadeOffset;
    const minY = Math.min(...points.map(p => p.y)) - fadeOffset;
    const maxX = Math.max(...points.map(p => p.x)) + fadeOffset;
    const maxY = Math.max(...points.map(p => p.y)) + fadeOffset;

    return { minX, minY, maxX, maxY };
}


// Apply shadows for radial lights
function applyShadows(ctx, commonProps, cameraX, cameraY) {

    const { lightX, lightY, outerRadius, innerRadius, intensity, shadow } = commonProps

    // Skip if shadow isn't required
    if (shadow <= 0) return;

    // Create a radial shadow gradient
    const shadowGradient = ctx.createRadialGradient(
        outerRadius, outerRadius, innerRadius,
        outerRadius, outerRadius, outerRadius
    );

    shadowGradient.addColorStop(0, `rgba(0, 0, 0, ${intensity * shadow})`);
    shadowGradient.addColorStop(1, `rgba(0, 0, 0, 0)`);

    const shadowCanvas = new OffscreenCanvas(outerRadius * 2, outerRadius * 2);
    const shadowCtx = shadowCanvas.getContext('2d');
    shadowCtx.imageSmoothingEnabled = false;

    // Clone and process obstacles
    const allObstacles = processObstacles();

    // Filter obstacles within the light radius
    const relevantObstacles = allObstacles.filter(obstacle =>
        obstacle.some(point => hypot(point.x - commonProps.x, point.y - commonProps.y) < outerRadius)
    ).slice(0, MAX_SHADOWS_TO_RENDER);

    // Draw shadows for each obstacle
    relevantObstacles.forEach(obstacle => {
        const shadowPoly = calculateShadow(lightX, lightY, outerRadius, obstacle, cameraX, cameraY, commonProps.animation);

        // Draw the shadow polygon
        drawShadowPolygon(shadowCtx, shadowPoly, shadowGradient, lightX, lightY, outerRadius);

        // Remove the obstacle from the shadow
        clearObstacleShadow(shadowCtx, obstacle, lightX, lightY, outerRadius, cameraX, cameraY);
    });

    // Composite the shadow onto the light canvas
    let origCompositeOperation = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(shadowCanvas, 0, 0);
    ctx.globalCompositeOperation = origCompositeOperation;
}

function processObstacles() {
    let obstaclesCopy = OPTION_SHADOWS ? obstacles.map(obstacle => obstacle.map(point => ({ x: point.x, y: point.y }))) : [];

    // Add player shadow if enabled
    if (OPTION_PLAYER_SHADOW) {
        obstaclesCopy.push({
            x: playerPosition.x + 6,
            y: playerPosition.y + 6,
            width: 6,
            height: 6
        });
    }
    return transformObstacles(obstaclesCopy);
}

function drawShadowPolygon(ctx, shadowPoly, shadowGradient, lightX, lightY, outerRadius) {
    let origCompositeOperation = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "source-out";
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.moveTo(
        shadowPoly[0].x - lightX + outerRadius,
        shadowPoly[0].y - lightY + outerRadius
    );
    shadowPoly.forEach(point =>
        ctx.lineTo(
            point.x - lightX + outerRadius,
            point.y - lightY + outerRadius
        )
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = origCompositeOperation;
}

function clearObstacleShadow(ctx, obstacle, lightX, lightY, outerRadius, cameraX, cameraY) {
    let origCompositeOperation = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(
        obstacle[0].x - cameraX - lightX + outerRadius,
        obstacle[0].y - cameraY - lightY + outerRadius
    );
    obstacle.forEach(point =>
        ctx.lineTo(
            point.x - cameraX - lightX + outerRadius,
            point.y - cameraY - lightY + outerRadius
        )
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = origCompositeOperation;
}

shadowPolygonCache = {};
function calculateShadow(lightX, lightY, lightRadius, polygon, cameraX, cameraY, animation) {
    const shadowPolygon = [];

    let firstShadowVertex = null;
    let lastShadowVertex = null;
    let hasSeenLight = false;
    let hasSeenShadow = false;
    let startInShadow = false;

    for (let i = 0; i < polygon.length; i++) {
        const currentVertex = polygon[i];
        const nextVertex = polygon[(i + 1) % polygon.length];

        // Calculate vectors from the light to the current and next vertices
        const currentDx = currentVertex.x - cameraX - lightX;
        const currentDy = currentVertex.y - cameraY - lightY;
        const nextDx = nextVertex.x - cameraX - lightX;
        const nextDy = nextVertex.y - cameraY - lightY;

        // Determine if the edge is facing the light source
        const isFacingLight = (currentDx * nextDy - currentDy * nextDx) < 0;

        if (i === 0 && !isFacingLight) {
            startInShadow = true;
        }

        if (isFacingLight) {
            hasSeenLight = true;
        } else {
            hasSeenShadow = true;
        }

        if (!isFacingLight) {
            if (startInShadow) {
                if (!hasSeenLight) {
                    lastShadowVertex = currentVertex;
                }
                if (hasSeenLight && firstShadowVertex === null) {
                    firstShadowVertex = currentVertex;
                }
            } else {
                if (!firstShadowVertex) {
                    firstShadowVertex = currentVertex;
                }
                lastShadowVertex = currentVertex;
            }
        }
    }

    if (!firstShadowVertex) {
        firstShadowVertex = polygon[0];
    }

    if (firstShadowVertex && lastShadowVertex) {

        let firstX = firstShadowVertex.x - cameraX;
        let firstY = firstShadowVertex.y - cameraY;
        let lastX = lastShadowVertex.x - cameraX;
        let lastY = lastShadowVertex.y - cameraY;

        // project the first and last shadow vertex to the light source
        const lengthFirst = Math.min(50, hypot(firstX - lightX, firstY - lightY));
        const directionFirstX = (firstX - lightX) / lengthFirst;
        const directionFirstY = (firstY - lightY) / lengthFirst;
        let firstShadowVertex2 = {
            x: lightX + directionFirstX * lightRadius * 3,
            y: lightY + directionFirstY * lightRadius * 3,
        };

        const lengthLast = Math.min(50, hypot(lastX - lightX, lastY - lightY));
        const directionLastX = (lastX - lightX) / lengthLast;
        const directionLastY = (lastY - lightY) / lengthLast;
        let lastShadowVertex2 = {
            x: lightX + directionLastX * lightRadius * 3,
            y: lightY + directionLastY * lightRadius * 3,
        };

        shadowPolygon.push({ x: firstX, y: firstY });
        shadowPolygon.push(firstShadowVertex2);
        shadowPolygon.push(lastShadowVertex2);
        shadowPolygon.push({ x: lastX, y: lastY });
    }

    return shadowPolygon;
}

// Finalize the light rendering on the main canvas
function drawFinalLight(ctx, tmpCanvas, commonProps) {
    let origCompositeOperation = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "screen";

    // Determine the correct position for the light source rendering
    if (commonProps.type === 'polygon') {
        // Use the full bounds of the OffscreenCanvas for polygons
        ctx.drawImage(tmpCanvas, 0, 0);
    } else {
        // For radial and global lights, center the rendered light
        ctx.drawImage(
            tmpCanvas,
            commonProps.lightX - (commonProps.outerRadius || 0),
            commonProps.lightY - (commonProps.outerRadius || 0)
        );
    }

    ctx.globalCompositeOperation = origCompositeOperation;
}


function hypot(x, y) {
    return Math.sqrt(x * x + y * y);
}

function toPerc(angle) {
    return angle / 360;
}

function toRad(angle) {
    return angle * Math.PI / 180;
}

// Helper function to normalize a vector
function normalizeVector(x, y) {
    const length = Math.sqrt(x * x + y * y);
    return { x: x / length, y: y / length };
}

// Function to offset a polygon by a specified distance
function offsetPolygon(lightSource) {
    return lightSource.polygon.map((vertex) => {
        const direction = {
            x: vertex.x - lightSource.x,
            y: vertex.y - lightSource.y,
        };

        const normalizedDirection = normalizeVector(direction.x, direction.y);
        return {
            x: vertex.x + normalizedDirection.x * (lightSource.fadeOffset || 1) * tilesize,
            y: vertex.y + normalizedDirection.y * (lightSource.fadeOffset || 1) * tilesize,
        };
    });
}
let rendererExtensions = null;
const extensionModules = new Set();
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
let fontLoadPromise = null;
let GLOBAL_LIGHT_INTENSITY = 0.2;
const MIN_GLOBAL_LIGHT_INTENSITY = 0.08;
const MAX_GLOBAL_LIGHT_INTENSITY = 0.90;
const MAIN_MAP_MIN_LIGHT_INTENSITY = 0.18;
const MAIN_MAP_MAX_LIGHT_INTENSITY = 0.95;
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
    if(!obstacles) {
        return transformedObstacles;
    }

    obstacles.forEach(obstacle => {
        // if we get an object with x, y, width, height, convert it to a polygon
        if (obstacle.width !== undefined && obstacle.height !== undefined) {
            obstacle = [
                {x: obstacle.x, y: obstacle.y},
                {x: obstacle.x + obstacle.width, y: obstacle.y},
                {x: obstacle.x + obstacle.width, y: obstacle.y + obstacle.height},
                {x: obstacle.x, y: obstacle.y + obstacle.height},
            ];
        }

        if (obstacle.polygon) {
            obstacle = obstacle.polygon.points.split(" ").map(point => {
                const [x, y] = point.split(",").map(Number);
                return {x: parseFloat(obstacle.x) + x, y: parseFloat(obstacle.y) + y};
            });
        }

        transformedObstacles.push(obstacle);
    })

    return transformedObstacles;
}

function fireAnimation(lightSource, time) {
    const flickerStrength = 0.05; // Controls how much the light flickers
    const positionVariation = 0.8; // Controls how much the light "jumps" in position
    const radiusVariation = 0.15; // Controls the variation in light radius
    const intensityVariation = 0.01; // Controls the variation in light intensity

    // Simulate flickering by adjusting the radius and intensity with sine and random noise
    const flicker = Math.sin(time * 3) * flickerStrength + Math.random() * flickerStrength;

    // Adjust radius with a slight random flicker
    lightSource.radius = Math.max(2, lightSource.radius * (1 + flicker * radiusVariation));

    // Adjust intensity to simulate the flickering effect
    lightSource.intensity = Math.max(0.3, lightSource.intensity * (1 + flicker * intensityVariation));

    // Optional: Add a slight movement to simulate the light source "dancing"
    lightSource.x += (Math.random() - 0.5) * positionVariation;
    lightSource.y += (Math.random() - 0.5) * positionVariation;
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

    load() {
        if (this.image !== undefined) {
            return Promise.resolve(this.image);
        }
        if (!this.loadPromise) {
            this.loadPromise = loadImg(this.src).then((img) => {
                this.image = img;
                return img;
            }).finally(() => {
                this.loadPromise = null;
            });
        }
        return this.loadPromise;
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
    clearTextCache();
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
const MAX_CACHE_SIZE = 4096;
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
let cacheBytes = 0;
const imageIds = new WeakMap();
let nextImageId = 0;

// Function to generate a unique cache key
function getCacheKey(x, y, w, h, scale, colorShift) {
    const colorDiffKey = colorShift ? `${colorShift.colorDifference.r},${colorShift.colorDifference.g},${colorShift.colorDifference.b}` : 'null';
    const progressKey = colorShift ? colorShift.progress : 'null';
    return `${x},${y},${w},${h},${scale},${colorDiffKey},${progressKey}`;
}

function addToImageCache(cacheKey, offCanvas) {
    const bytes = offCanvas.width * offCanvas.height * 4;
    if (bytes > MAX_CACHE_BYTES) return;
    if (imageCache[cacheKey]) {
        const previous = imageCache[cacheKey];
        cacheBytes -= previous.width * previous.height * 4;
        if (previous !== offCanvas) previous.width = previous.height = 0;
        cacheKeys.splice(cacheKeys.indexOf(cacheKey), 1);
    }
    imageCache[cacheKey] = offCanvas;
    cacheBytes += bytes;
    cacheKeys.push(cacheKey);
    while (cacheKeys.length > MAX_CACHE_SIZE || cacheBytes > MAX_CACHE_BYTES) {
        const oldest = cacheKeys.shift(), canvas = imageCache[oldest];
        cacheBytes -= canvas.width * canvas.height * 4;
        delete imageCache[oldest];
        canvas.width = canvas.height = 0;
    }
}

function clearImageCache() {
    for (const key of cacheKeys) imageCache[key].width = imageCache[key].height = 0;
    for (const key of cacheKeys) delete imageCache[key];
    cacheKeys.length = 0;
    cacheBytes = 0;
}

function drawScaledImage(ctx, image, x, y, w, h, dx, dy, scale, colorShift = null) {
    if (!imageIds.has(image)) imageIds.set(image, ++nextImageId);
    const cacheKey = imageIds.get(image) + ':' + getCacheKey(x, y, w, h, scale, colorShift);

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
    const {colorDifference, progress} = colorShift;
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

const terrainCache = new Map();
let renderScale = 1;
let composingWorld = false;
let frameExtensions;
let framePending = false, nextFrameTime;
const FRAME_INTERVAL = 1000 / 60;
function scheduleNextFrame() {
    if (framePending) return;
    framePending = true;
    function ready(time) {
        // RAF supplies a monotonic timestamp; a deadline prevents a second 50 FPS gate.
        if (Number.isFinite(time) && nextFrameTime !== undefined && time < nextFrameTime - 0.5) {
            requestAnimationFrame(ready);
            return;
        }
        framePending = false;
        if (Number.isFinite(time)) {
            if (nextFrameTime === undefined || time - nextFrameTime > 250) nextFrameTime = time;
            do { nextFrameTime += FRAME_INTERVAL; } while (nextFrameTime <= time + 0.5);
        }
        postMessage({type: 'rendered'});
    }
    requestAnimationFrame(ready);
}

function resizeWorkerLayers(scale) {
    renderScale = scale;
    const output = canvases.combined;
    for (const id of ['background', 'high', 'entities', 'highEntities', 'lighting']) {
        const canvas = canvases[id];
        const width = Math.ceil(output.width / scale), height = Math.ceil(output.height / scale);
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width; canvas.height = height;
            contexes[id].imageSmoothingEnabled = false;
            terrainCache.delete(id);
        }
    }
}

function drawStaticTerrain(id, tiles, cameraX, cameraY, revision) {
    const ctx = contexes[id], canvas = canvases[id];
    const key = revision === undefined ? JSON.stringify(tiles) : revision;
    let cached = terrainCache.get(id);
    if (!cached || cached.key !== key || cached.tileset !== tileset ||
        cached.width !== canvas.width || cached.height !== canvas.height ||
        cameraX < cached.x || cameraY < cached.y ||
        cameraX + canvas.width > cached.x + cached.canvas.width ||
        cameraY + canvas.height > cached.y + cached.canvas.height) {
        const x = Math.floor(cameraX / 16) * 16 - 32, y = Math.floor(cameraY / 16) * 16 - 32;
        const buffer = new OffscreenCanvas(canvas.width + 80, canvas.height + 80);
        const bufferCtx = buffer.getContext('2d');
        bufferCtx.imageSmoothingEnabled = false;
        bufferCtx.translate(-x, -y);
        const tileSources = [];
        for (const tile of tiles) {
            const tx = getX(tile.cellid + 1, tile.gridW) * tilesize;
            const ty = Math.floor(tile.cellid / tile.gridW) * tilesize;
            if (lightEmittingTiles?.[tile.tileid + 1]) tileSources.push({...lightEmittingTiles[tile.tileid + 1], x: tx, y: ty});
            if (tx + 16 > x && ty + 16 > y && tx < x + buffer.width && ty < y + buffer.height) {
                drawTile(bufferCtx, tile.tileid, tileset, tile.setW, tile.setH, tile.gridW, tile.cellid, 1, tile.slideOffsetX, tile.slideOffsetY, tile.colorShift);
            }
        }
        if (cached) cached.canvas.width = cached.canvas.height = 0;
        cached = {key, tileset, x, y, width: canvas.width, height: canvas.height, canvas: buffer, lights: tileSources};
        terrainCache.set(id, cached);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cached.canvas, Math.round(cached.x - cameraX), Math.round(cached.y - cameraY));
    tileLights.push(...cached.lights);
}

let tileLights = [];

function render(id, tiles, cameraX, cameraY, scale, clear, serverTime, scene, options, mapId, worldTime, revision) {
    let ctx = contexes[id];
    if (id !== 'lights' && clear) {
        drawStaticTerrain(id, tiles, cameraX, cameraY, revision);
        return;
    }
    if(id !== "lights") {
        let canvas = canvases[id];
        if (clear === true) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        ctx.save();
        ctx.translate(Math.round(-cameraX) * scale, Math.round(-cameraY) * scale);

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
        renderLightOverlay(lights, cameraX, cameraY, scale, serverTime, scene, tileLights, options, mapId, worldTime);
        tileLights = [];
    }
}


onmessage = (e) => {
    if (e.data.type === 'registerExtension') {
        const name = e.data.module;
        if (!/^[a-z][a-z0-9-]*-worker\.js$/.test(name) || extensionModules.has(name)) return;
        if (!rendererExtensions) {
            importScripts('render-extensions-worker.js');
            rendererExtensions = self.RendererExtensions;
        }
        importScripts(name);
        extensionModules.add(name);
        return;
    }

    if (!hasLoadedFont && !fontLoadPromise) {
        fontLoadPromise = loadFont().catch((error) => {
            console.log('Unable to load renderer font', error);
        }).finally(() => {
            fontLoadPromise = null;
        });
    }

    if (e.data.type === "setTileset") {
        tileset = undefined;
        clearImageCache();
        terrainCache.clear();
        loadImg(e.data.src).then((img) => {
            tileset = img;
        });
    } else if (e.data.type === "loadCursor") {
        loadImg(e.data.src).then((img) => {
            cursors[e.data.name] = img;
            console.log("loaded cursor", e.data.name);
        });
    } else if (e.data.type === "render") {
        if (!tileset) {
            scheduleNextFrame();
            return;
        }
        const view = e.data.renderData.find(data => data.type === 'entities');
        const scale = view?.scale || 1;
        resizeWorkerLayers(scale);
        composingWorld = true;
        frameExtensions = e.data.extensions;
        const renderDataLength = e.data.renderData.length;
        let cursorCommand;
        for (let i = 0; i < renderDataLength; i++) {
            let renderData = e.data.renderData[i];
            if (!renderData) continue;
            playerPosition = e.data.player;

            if (renderData.cursor !== undefined) {
                cursorCommand = renderData;
            } else if (renderData.type === "text") {
                drawText(renderData);
            } else if (renderData.type === "entities") {
                drawEntities(renderData);
            } else {
                render(renderData.id, renderData.tiles, renderData.cameraX, renderData.cameraY, 1, renderData.clear, e.data.serverTime, e.data.scene, renderData.options, e.data.mapId, e.data.worldTime, renderData.revision);
            }
        }

        let combinedCanvas = canvases["combined"];
        let combinedCtx = contexes["combined"];

        // World buffers are native pixel art resolution. Text keeps its display resolution.
        combinedCtx.clearRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedCtx.save();
        combinedCtx.drawImage(canvases.entities, 0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedCtx.drawImage(canvases.text, 0, 0);
        combinedCtx.drawImage(canvases.highEntities, 0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedCtx.globalCompositeOperation = 'multiply';
        combinedCtx.drawImage(canvases.lighting, 0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedCtx.globalCompositeOperation = 'source-over';
        if (cursorCommand) renderCursor({...cursorCommand, id: 'combined'}, false);
        combinedCtx.restore();
        composingWorld = false;
        rendererExtensions?.draw('foreground', combinedCtx, e.data.extensions, view);
        drawWorldAmbience(combinedCtx, e.data.ambience, view, combinedCanvas.width, combinedCanvas.height, e.data.worldTime);
        drawCombatFeedback(combinedCtx, e.data.combatFeedback);

        scheduleNextFrame();
    } else if (e.data.type === "setCanvasSize") {

        for (const id of ['combined', 'text']) {
            const canvas = canvases[id];
            if (canvas.width !== e.data.width) canvas.width = e.data.width;
            if (canvas.height !== e.data.height) canvas.height = e.data.height;
            contexes[id].imageSmoothingEnabled = false;
        }
        terrainCache.clear();
        textFrameKey = undefined;
        resizeWorkerLayers(renderScale);
    } else if (e.data.type === "setCanvas") {
        let id = e.data.id;
        let canvas = e.data.canvas;
        canvases[id] = canvas;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        contexes[id] = ctx;
    } else if (e.data.type === "loadSprite") {
        sprites[e.data.spriteName] = new Sprite(e.data.spriteName, e.data.src, e.data.animationData, e.data.width, e.data.height, e.data.offsetX, e.data.offsetY);
    }  else if (e.data.type === "setLights") {
        lights = e.data.lights ?? [];
    } else if (e.data.type === "setObstacles") {
        obstacles = e.data.obstacles;
        obstacles = transformObstacles(obstacles);
        obstacleRevision++;
    }  else if (e.data.type === "setLightEmittingTiles") {
        lightEmittingTiles = e.data.lightEmittingTiles || {};
        terrainCache.clear();
    } else if (e.data.type === "idle") {
        scheduleNextFrame();
    }
};

function renderCursor(renderData, clear = true) {
    let mx = renderData.mx;
    let my = renderData.my;
    let s = renderData.s;
    let os = renderData.os;
    let cursorImg = cursors[renderData.name];
    let ctx = contexes[renderData.id];
    if (clear) ctx.clearRect(0, 0, canvases[renderData.id].width, canvases[renderData.id].height);
    if (!cursorImg) return;
    ctx.save();
    ctx.drawImage(cursorImg, 0, 0, 14 * os, 14 * os, mx, my, 14 * s, 14 * s);
    ctx.restore();
}

const labelCache = new Map();
const MAX_LABEL_BYTES = 2 * 1024 * 1024;
let labelBytes = 0, textFrameKey;
function clearTextCache() {
    for (const label of labelCache.values()) label.canvas.width = label.canvas.height = 0;
    labelCache.clear(); labelBytes = 0; textFrameKey = undefined;
}

function cachedLabel(text, fontSize, strokeSize, color, strokeColor, fontWeight = 'normal') {
    const key = JSON.stringify([text, fontSize, strokeSize, color, strokeColor, fontWeight, hasLoadedFont]);
    let label = labelCache.get(key);
    if (label) return label;
    const metricsCtx = contexes.text;
    metricsCtx.font = `${fontWeight} ${fontSize}px GraphicPixel`;
    const metrics = metricsCtx.measureText(text);
    const left = Math.max(0, metrics.actualBoundingBoxLeft || 0);
    const right = Math.max(metrics.width, metrics.actualBoundingBoxRight || 0);
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent || fontSize);
    const descent = Math.ceil(metrics.actualBoundingBoxDescent || fontSize * 0.3);
    const pad = Math.ceil(strokeSize / 2) + 2;
    const canvas = new OffscreenCanvas(Math.max(1, Math.ceil(left + right + pad * 2)), Math.max(1, ascent + descent + pad * 2));
    const ctx = canvas.getContext('2d');
    ctx.font = metricsCtx.font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeSize;
    ctx.lineJoin = fontWeight === 'bold' ? 'round' : 'miter';
    ctx.strokeText(text, left + pad, ascent + pad);
    ctx.fillStyle = color; ctx.fillText(text, left + pad, ascent + pad);
    label = {canvas, x: left + pad, y: ascent + pad, advance: metrics.width};
    const bytes = canvas.width * canvas.height * 4;
    if (bytes <= MAX_LABEL_BYTES) {
        labelCache.set(key, label); labelBytes += bytes;
        while (labelCache.size > 256 || labelBytes > MAX_LABEL_BYTES) {
            const oldest = labelCache.keys().next().value, value = labelCache.get(oldest);
            labelBytes -= value.canvas.width * value.canvas.height * 4;
            labelCache.delete(oldest);
            value.canvas.width = value.canvas.height = 0;
        }
    }
    return label;
}

function drawText(renderData) {
    const ctx = contexes[renderData.id], canvas = canvases[renderData.id];
    const {cameraX, cameraY, scale, textData} = renderData;
    const key = JSON.stringify([cameraX, cameraY, scale, textData, canvas.width, canvas.height, hasLoadedFont]);
    if (key === textFrameKey) return;
    textFrameKey = key;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    for (const entry of textData) {
        const {text, x, y} = entry;
        if (!text || !Number.isFinite(x) || !Number.isFinite(y)) continue;
        const grid = entry.pixelAligned ? scale : 1;
        const screenX = Math.round((x - cameraX * scale) / grid) * grid;
        const screenY = Math.round((y - cameraY * scale) / grid) * grid;
        const fontSize = entry.title ? [0, 5, 10, 15][scale]
            : entry.fontSize || [0, 10, 13, 20][scale];
        const label = cachedLabel(text, fontSize, scale === 3 ? 5 : 3, entry.color || 'white', entry.strokeColor || '#373737', entry.fontWeight || 'normal');
        ctx.globalAlpha = entry.globalAlpha ?? 1;
        if (entry.textScale !== undefined || entry.rotation) {
            // Transform the cached bitmap so animation never allocates a label per frame.
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(entry.rotation || 0);
            ctx.scale(entry.textScale ?? 1, entry.textScale ?? 1);
            ctx.drawImage(label.canvas, -label.x - (entry.centered ? label.advance / 2 : 0), -label.y);
            ctx.restore();
        } else {
            ctx.drawImage(label.canvas, screenX - label.x - (entry.centered ? label.advance / 2 : 0), screenY - label.y);
        }
    }
    ctx.restore();
}

let mobHealthBars;
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
    if (composingWorld) {
        ctx.drawImage(canvases.background, 0, 0);
        rendererExtensions?.draw('ground', ctx, frameExtensions, {...drawEntitiesData, scale: 1,
            cameraX: -Math.round(-cameraX), cameraY: -Math.round(-cameraY),
            sources: {background: canvases.background}, fireLights: lights.concat(tileLights)});
        ctx.scale(1 / scale, 1 / scale);
    }
    highCtx.clearRect(0, 0, highCanvas.width, highCanvas.height);
    highCtx.save();
    if (composingWorld) {
        highCtx.drawImage(canvases.high, 0, 0);
        highCtx.scale(1 / scale, 1 / scale);
    }

    const entityCount = drawEntitiesData.entityData.length;

    for (let i = 0; i < entityCount; i++) {
        const entityData = drawEntitiesData.entityData[i];
        ctx.save();
        highCtx.save();

        if (entityData.globalAlpha !== undefined && Number.isNaN(entityData.globalAlpha) === false) {
            ctx.globalAlpha = entityData.globalAlpha;
            highCtx.globalAlpha = entityData.globalAlpha;
        }

        // Snap the composed actor-camera transform once, on the native art grid.
        // Body, equipment, shadow and indicators share this same screen position.
        const screenX = Math.round(entityData.translateX / scale - cameraX) * scale;
        const screenY = Math.round(entityData.translateY / scale - cameraY) * scale;
        ctx.translate(screenX, screenY);
        highCtx.translate(screenX, screenY);
        if (entityData.scaleX !== undefined && entityData.scaleY !== undefined) {
            ctx.scale(entityData.scaleX, entityData.scaleY);
            highCtx.scale(entityData.scaleX, entityData.scaleY);
        }
        let drawDataLength = entityData.drawData.length;

        for (let y = 0; y < drawDataLength; y++) {
            const drawData = entityData.drawData[y];
            const {id, spriteName, sx, sy, sW, sH, dx, dy, dW, dH, a, renderAbove} = drawData;
            const origCtx = ctx;
            if (renderAbove) {
                ctx = highCtx;
            }
            let sprite = sprites[spriteName];

            if (sprite) {
                if (sprite.image === undefined) {
                    sprite.load();
                    ctx = origCtx;
                    continue;
                }
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
                }
            } else {
                console.log('no sprite', spriteName);
            }

            ctx = origCtx;
        }
        ctx.restore();
        highCtx.restore();
    }
    const healthBars = drawEntitiesData.entityData.map(entity=>entity.healthBar).filter(Boolean);
    if (healthBars.length || mobHealthBars) {
        if (!mobHealthBars) { importScripts('mobhealthbar-worker.js'); mobHealthBars = new self.MobHealthBars.Bars(); }
        mobHealthBars.draw(ctx,healthBars,drawEntitiesData,drawEntitiesData.healthTime || 0,drawEntitiesData.reducedMotion);
    }
    ctx.restore();
    highCtx.restore();
}

lastTime = null;

let worldClock = null;
function getMainMapCycleIntensity(cycleProgress) {
    if (!worldClock) {
        importScripts('worldtime-worker.js');
        worldClock = self.WorldTime;
    }
    return worldClock.mainDaylight(cycleProgress * CYCLE_DURATION);
}

function lightIntersectsView(light, cameraX, cameraY, width, height) {
    const dx = light.x - cameraX, dy = light.y - cameraY;
    // Leave a pixel of room for the small positional/radius flicker at viewport edges.
    const radius = (light.radius || 1) * tilesize * (light.animation ? 1.02 : 1) + 1;
    return light.global
        ? dx + light.w >= 0 && dy + light.h >= 0 && dx <= width && dy <= height
        : dx + radius >= 0 && dy + radius >= 0 && dx - radius <= width && dy - radius <= height;
}

function renderLightOverlay(lightSources, cameraX, cameraY, scale, serverTime, scene, tileLights, options, mapId, worldTime) {

    OPTION_SHADOWS = options?.shadows ?? true;
    OPTION_PLAYER_SHADOW = options?.playerShadow ?? true;
    OPTION_DYNAMIC_LIGHTS = options?.dynamicLights ?? true;

    if(scene.dn_cycle && scene.dn_cycle !== "false") {
        const cycleProgress = ((worldTime ?? serverTime + performance.now()) % CYCLE_DURATION) / CYCLE_DURATION;
        if (mapId === 'main') {
            const cycleIntensity = getMainMapCycleIntensity(cycleProgress);
            GLOBAL_LIGHT_INTENSITY = cycleIntensity * (MAIN_MAP_MAX_LIGHT_INTENSITY - MAIN_MAP_MIN_LIGHT_INTENSITY) + MAIN_MAP_MIN_LIGHT_INTENSITY;
        } else {
            const cycleAngle = cycleProgress * Math.PI * 2;
            const cycleIntensity = Math.sin(cycleAngle) * 0.5 + 0.5;
            GLOBAL_LIGHT_INTENSITY = cycleIntensity * (MAX_GLOBAL_LIGHT_INTENSITY - MIN_GLOBAL_LIGHT_INTENSITY) + MIN_GLOBAL_LIGHT_INTENSITY;
        }
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

    if(lightSources) {
        // Draw each light source on the light canvas
        lightSources.filter((lightSource) => {
            // Light source in camera view
            const inScene = lightSource.x >= scene.x * tilesize && lightSource.x <= (scene.x + scene.width) * tilesize &&
                lightSource.y >= scene.y * tilesize && lightSource.y <= (scene.y + scene.height) * tilesize;
            return inScene && lightIntersectsView(lightSource, cameraX, cameraY, canvas.width, canvas.height);
        }).slice(0, MAX_LIGHTS_TO_RENDER).forEach(lightSource => {
            if (lightSource.animation && OPTION_DYNAMIC_LIGHTS) {
                lightSource = updateAnimatedLightSource(lightSource, time);
            }
            drawLightSource(ctx, lightSource, cameraX, cameraY);
        });
    }

    // Draw tile lights
    for(let i = 0; i < tileLights.length; i++) {
        let lightSource = tileLights[i];
        if (!lightIntersectsView(lightSource, cameraX, cameraY, canvas.width, canvas.height)) continue;
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
    if(!OPTION_DYNAMIC_LIGHTS) {
        return lightSource
    }

    // Animation must not mutate the map light; repeated frames stay near its base size.
    lightSource = {...lightSource};
    if (lightSource.animation instanceof Function) {
        lightSource.animation(lightSource, time);
    } else {
        switch (lightSource.animation) {
            case 'fire':
                fireAnimation(lightSource, time);
                break;
            default:
                break
        }
    }
    return lightSource
}

const lightScratch = {}, shadowScratch = {}, gradientScratch = {};
let obstacleRevision = 0;
function scratchCanvas(scratch, width, height) {
    if (!scratch.canvas) scratch.canvas = new OffscreenCanvas(width, height);
    if (scratch.canvas.width < width) scratch.canvas.width = width;
    if (scratch.canvas.height < height) scratch.canvas.height = height;
    const ctx = scratch.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, scratch.canvas.width, scratch.canvas.height);
    return {canvas: scratch.canvas, ctx};
}

function drawLightSource(ctx, light, cameraX, cameraY) {
    const lightX = light.x - cameraX, lightY = light.y - cameraY;
    const innerRadius = (light.innerRadius || 0) * tilesize;
    const outerRadius = (light.radius || 1) * tilesize;
    const intensity = light.intensity ?? 1;
    const color = light.color || {r: 255, g: 255, b: 255};
    const spread = parseInt(light.spread || 0), innerSpread = parseInt(light.innerSpread || 0);
    const angle = parseInt(light.angle || 0);
    const width = Math.max(1, Math.ceil(light.global ? light.w : outerRadius * 2));
    const height = Math.max(1, Math.ceil(light.global ? light.h : outerRadius * 2));
    const gradientKey = ['gradient', width, height, outerRadius, innerRadius, intensity,
        color.r, color.g, color.b, spread, innerSpread, angle, !!light.global].join(',');
    let gradientCanvas = imageCache[gradientKey];
    if (!gradientCanvas) {
        // Animated lights use one growing scratch surface instead of retaining each flicker.
        const scratch = light.animation && OPTION_DYNAMIC_LIGHTS
            ? scratchCanvas(gradientScratch, width, height)
            : {canvas: new OffscreenCanvas(width, height)};
        gradientCanvas = scratch.canvas;
        const gradientCtx = scratch.ctx || gradientCanvas.getContext('2d');
        gradientCtx.imageSmoothingEnabled = false;
        if (spread > 0) {
            const radians = toRad(angle + 90);
            const arc = gradientCtx.createConicGradient(radians - toRad(spread / 2), outerRadius, outerRadius);
            arc.addColorStop(0, `rgba(${color.r},${color.g},${color.b},0)`);
            arc.addColorStop(toPerc(spread / 2) - toPerc(innerSpread) / 2, `rgba(${color.r},${color.g},${color.b},${intensity})`);
            arc.addColorStop(toPerc(spread / 2) + toPerc(innerSpread) / 2, `rgba(${color.r},${color.g},${color.b},${intensity})`);
            arc.addColorStop(toPerc(spread), `rgba(${color.r},${color.g},${color.b},0)`);
            gradientCtx.fillStyle = arc;
            gradientCtx.beginPath();
            gradientCtx.arc(outerRadius, outerRadius, outerRadius, radians, spread, false);
            gradientCtx.closePath(); gradientCtx.fill();
            gradientCtx.globalCompositeOperation = 'destination-in';
        }
        if (light.global) {
            gradientCtx.fillStyle = `rgba(${color.r},${color.g},${color.b},${intensity})`;
        } else {
            const gradient = gradientCtx.createRadialGradient(outerRadius, outerRadius, innerRadius, outerRadius, outerRadius, outerRadius);
            gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${intensity})`);
            gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
            gradientCtx.fillStyle = gradient;
        }
        gradientCtx.fillRect(0, 0, width, height);
        gradientCtx.globalCompositeOperation = 'source-over';
        if (!light.animation || !OPTION_DYNAMIC_LIGHTS) addToImageCache(gradientKey, gradientCanvas);
    }

    let output = gradientCanvas;
    if (light.shadow > 0 && (OPTION_SHADOWS || OPTION_PLAYER_SHADOW)) {
        const staticShadow = !light.animation || !OPTION_DYNAMIC_LIGHTS;
        const shadowKey = [gradientKey, 'shadow', light.x, light.y, light.shadow, OPTION_SHADOWS, obstacleRevision].join(',');
        if (staticShadow && OPTION_SHADOWS && obstacles.length) {
            output = imageCache[shadowKey];
            if (!output) {
                const scratch = scratchCanvas(lightScratch, width, height);
                scratch.ctx.drawImage(gradientCanvas, 0, 0, width, height, 0, 0, width, height);
                subtractShadows(scratch.ctx, light, obstacles, width, height);
                output = new OffscreenCanvas(width, height);
                output.getContext('2d').drawImage(scratch.canvas, 0, 0, width, height, 0, 0, width, height);
                addToImageCache(shadowKey, output);
            }
        }
        // Buildings stay cached even while the player's shadow moves.
        const movingPolygons = !staticShadow && OPTION_SHADOWS ? obstacles.slice() : [];
        if (OPTION_PLAYER_SHADOW && playerPosition) {
            const playerPolygon = transformObstacles([{
                x: playerPosition.x + 6, y: playerPosition.y + 6, width: 6, height: 6
            }])[0];
            if (polygonIntersectsLight(playerPolygon, light, outerRadius)) movingPolygons.push(playerPolygon);
        }
        if (movingPolygons.length) {
            const scratch = scratchCanvas(lightScratch, width, height);
            scratch.ctx.drawImage(output, 0, 0, width, height, 0, 0, width, height);
            subtractShadows(scratch.ctx, light, movingPolygons, width, height);
            output = scratch.canvas;
        }
    }
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(output, 0, 0, width, height,
        light.global ? lightX : lightX - outerRadius,
        light.global ? lightY : lightY - outerRadius, width, height);
}

function polygonIntersectsLight(polygon, light, radius) {
    return polygon.some(point => hypot(point.x - light.x, point.y - light.y) < radius);
}

function subtractShadows(ctx, light, polygons, width, height) {
    const outerRadius = (light.radius || 1) * tilesize, innerRadius = (light.innerRadius || 0) * tilesize;
    const mask = scratchCanvas(shadowScratch, width, height);
    const shade = mask.ctx.createRadialGradient(outerRadius, outerRadius, innerRadius, outerRadius, outerRadius, outerRadius);
    shade.addColorStop(0, `rgba(0,0,0,${(light.intensity ?? 1) * light.shadow})`);
    shade.addColorStop(1, 'rgba(0,0,0,0)');
    let drawn = 0;
    for (const polygon of polygons) {
        if (!polygonIntersectsLight(polygon, light, outerRadius)) continue;
        if (drawn++ >= MAX_SHADOWS_TO_RENDER) break;
        const shadow = calculateShadow(light.x, light.y, outerRadius, polygon, 0, 0, light.animation);
        if (!shadow.length) continue;
        mask.ctx.globalCompositeOperation = 'source-out';
        mask.ctx.fillStyle = shade;
        mask.ctx.beginPath();
        mask.ctx.moveTo(shadow[0].x - light.x + outerRadius, shadow[0].y - light.y + outerRadius);
        for (const point of shadow) mask.ctx.lineTo(point.x - light.x + outerRadius, point.y - light.y + outerRadius);
        mask.ctx.closePath(); mask.ctx.fill();
        mask.ctx.globalCompositeOperation = 'destination-out';
        mask.ctx.fillStyle = 'black'; mask.ctx.beginPath();
        mask.ctx.moveTo(polygon[0].x - light.x + outerRadius, polygon[0].y - light.y + outerRadius);
        for (const point of polygon) mask.ctx.lineTo(point.x - light.x + outerRadius, point.y - light.y + outerRadius);
        mask.ctx.closePath(); mask.ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(mask.canvas, 0, 0, width, height, 0, 0, width, height);
    }
}

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

        shadowPolygon.push({x: firstX, y: firstY});
        shadowPolygon.push(firstShadowVertex2);
        shadowPolygon.push(lastShadowVertex2);
        shadowPolygon.push({x: lastX, y: lastY});
    }

    return shadowPolygon;
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

const IMPACT_RAYS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
];

// Short pixel bursts and steady target brackets, composed above scene lighting.
function drawCombatFeedback(ctx, feedback) {
    if (!feedback) return;
    ctx.save();
    const scale = feedback.scale;
    const rect = (x, y, width, height) => ctx.fillRect(
        Math.round(x - feedback.cameraX) * scale, Math.round(y - feedback.cameraY) * scale,
        width * scale, height * scale);
    const corners = (target, thickness, extension) => {
        const {x, y, width, height} = target;
        for (const [cx, cy, dx, dy] of [
            [x, y, 1, 1], [x + width, y, -1, 1],
            [x, y + height, 1, -1], [x + width, y + height, -1, -1],
        ]) {
            rect(cx - extension + (dx < 0 ? -4 : 0), cy - extension, 4 + extension * 2, thickness);
            rect(cx - extension, cy - extension + (dy < 0 ? -4 : 0), thickness, 4 + extension * 2);
        }
    };
    if (feedback.target) {
        ctx.fillStyle = '#231b24';
        corners(feedback.target, 3, 1);
        ctx.fillStyle = '#ffd66b';
        corners(feedback.target, 1, 0);
    }
    for (const impact of feedback.impacts) {
        const progress = impact.progress;
        const distance = 3 + Math.round((1 - Math.pow(1 - progress, 2)) * 7);
        const size = progress < 0.5 ? 2 : 1;
        ctx.globalAlpha = 1 - progress;
        for (const [dx, dy] of IMPACT_RAYS) {
            const x = impact.x + Math.round(dx * distance) - 1;
            const y = impact.y + Math.round(dy * distance) - 1;
            ctx.fillStyle = '#593526';
            rect(x - 1, y - 1, size + 2, size + 2);
            ctx.fillStyle = '#ffb13b';
            rect(x, y, size, size);
            ctx.fillStyle = '#fff2bf';
            rect(x, y, 1, 1);
        }
        if (progress < 0.25) {
            ctx.globalAlpha = 0.85 * (1 - progress / 0.25);
            ctx.fillStyle = '#593526';
            rect(impact.x - 4, impact.y - 2, 9, 5);
            rect(impact.x - 2, impact.y - 4, 5, 9);
            ctx.fillStyle = '#fff2bf';
            rect(impact.x - 3, impact.y - 1, 7, 3);
            rect(impact.x - 1, impact.y - 3, 3, 7);
        }
    }
    ctx.restore();
}

// World particles are composited in the same frame and camera as the map.
function drawWorldAmbience(context, ambience, view, width, height, worldTime) {
    if (!ambience || !view || ambience.reducedMotion) return;
    if (!self.WorldParticles) importScripts('worldparticles-worker.js');
    const elapsed = (Date.now() - (ambience.epoch || 0)) / 1000;
    const daylight = getMainMapCycleIntensity(worldTime / CYCLE_DURATION);
    context.save();
    if (ambience.bounds) {
        const {x, y, width: w, height: h} = ambience.bounds;
        context.beginPath(); context.rect((x - view.cameraX) * view.scale, (y - view.cameraY) * view.scale, w * view.scale, h * view.scale); context.clip();
    }
    for (const effect of ambience.effects || [{type: ambience.particles, count: ambience.particleCount}]) {
        for (const point of ambienceParticlePositions({particles: effect.type, particleCount: effect.count}, view, elapsed, width, height)) {
            const reacted = self.WorldParticles.react(point, effect.type, elapsed, view, ambience.fx);
            self.WorldParticles.draw(context, reacted, effect.type, elapsed, daylight);
        }
    }
    context.restore();
}
function ambienceParticlePositions(config, view, elapsed, width, height) {
    return self.WorldParticles.positions(config.particles, config.particleCount, elapsed,
        {x: view.cameraX, y: view.cameraY, scale: view.scale}, width, height);
}

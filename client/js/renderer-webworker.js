let rendererExtensions = null;
const extensionModules = new Set();
let tileset = undefined;
let tilesetGeneration = 0;
let tilesize = 16;
let canvases = {};
let contexes = {};
let cursors = {};
let cursor = undefined;
let sprites = {};

let lightEmittingTiles = {};
let lights = [];
let obstacles = [];
let bodyMap, heightShadows, proxyAtlasRequest, bakedShadowMask;
let outdoorShadowAreas = [];
let framePointShadows, actorPointShadows;
let emissiveGlowPass, frameEmissionForeground, frameLightTime;

let hasLoadedFont = false;
let fontLoadPromise = null;
let GLOBAL_LIGHT_INTENSITY = 0.2;
const MIN_GLOBAL_LIGHT_INTENSITY = 0.08;
const MAX_GLOBAL_LIGHT_INTENSITY = 0.90;
const MAIN_MAP_MIN_LIGHT_INTENSITY = 0.18;
const MAIN_MAP_MAX_LIGHT_INTENSITY = 0.95;
const MAX_LIGHTS_TO_RENDER = 100;
const MAX_SHADOWS_TO_RENDER = 100;
const DEFAULT_POINT_SHADOW_STRENGTH = .65;

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
        const owner = obstacle.proxyOwner;
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

        if (owner) obstacle.proxyOwner = owner;
        transformedObstacles.push(obstacle);
    })

    return transformedObstacles;
}

function fireAnimation(lightSource, time) {
    // A flame changes over real time. Several rates give each emitter its own
    // irregular rhythm, independent of frame rate and the day/night slider.
    const t = time / 1000, phase = lightSource.x * .37 + lightSource.y * .23;
    const pulse = .53 * Math.sin(t * 5.1 + phase) + .31 * Math.sin(t * 9.7 - phase) +
        .16 * Math.sin(t * 16.3 + phase * .7);
    const sway = Math.sin(t * 6.3 + phase) * .65 + Math.sin(t * 11.1 - phase) * .35;
    lightSource.radius = (lightSource.radius || 1) * (1 + .045 * pulse);
    lightSource.intensity = Math.min(1, (lightSource.intensity ?? 1) * (1 + .09 * pulse));
    lightSource.x += .55 * sway;
    lightSource.y -= .45 * pulse;
    lightSource.flamePulse = pulse;
}

class Sprite {
    constructor(id, src, animationData, width, height, offsetX, offsetY, anchor = {}) {
        this.id = id;
        this.src = src;
        this.animationData = animationData;
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.sourceScale = anchor.sourceScale ?? 1;
        this.requestId = anchor.requestId;
        this.autoGroundAnchor = anchor.autoGroundAnchor === true && Number.isSafeInteger(this.requestId) && this.requestId > 0;
        this.groundAnchorPending = this.autoGroundAnchor;
    }

    load() {
        if (this.image !== undefined) {
            return Promise.resolve(this.image);
        }
        if (!this.loadPromise) {
            this.loadPromise = loadImg(this.src).then((img) => {
                this.image = img;
                if (img && this.autoGroundAnchor) this.resolveGroundAnchor(img);
                return img;
            }).finally(() => {
                this.loadPromise = null;
            });
        }
        return this.loadPromise;
    }

    resolveGroundAnchor(image) {
        let groundOffsetY = 0;
        try {
            if (!self.SpriteGroundAnchor) importScripts('sprite-ground-anchor.js');
            if (self.SpriteGroundAnchor.frameLayout(image.width, image.height, this)) {
                const canvas = new OffscreenCanvas(image.width, image.height);
                const context = canvas.getContext('2d', {willReadFrequently: true});
                context.drawImage(image, 0, 0);
                groundOffsetY = self.SpriteGroundAnchor.inferOffset(context.getImageData(0, 0, image.width, image.height), this);
            }
        } catch (error) {
            // Missing canvas support or unreadable artwork keeps its legacy placement.
        }
        if (sprites[this.id] !== this) return;
        this.groundOffsetY = groundOffsetY;
        self.postMessage({type: 'spriteGroundAnchor', requestId: this.requestId,
            spriteName: this.id, src: this.src, groundOffsetY});
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

async function setBodyMap(map) {
    bodyMap = map;
    outdoorShadowAreas = [];
    heightShadows = null;
    bakedShadowMask = null;
    if (!map) {
        self.postMessage({type: 'shadowProxyAtlas', available: false, ready: false});
        return;
    }
    self.postMessage({type: 'shadowProxyAtlas', loading: true, ready: false});
    const {height, paint} = map.profile;
    if (!proxyAtlasRequest || proxyAtlasRequest.height !== height || proxyAtlasRequest.paint !== paint) {
        proxyAtlasRequest?.images.then(images => images.forEach(image => image?.close?.()));
        const base = '../img/common/height-proxies/';
        proxyAtlasRequest = {height, paint, images: Promise.all([loadImg(base + height), paint ? loadImg(base + paint) : null])};
    }
    const [atlas, mask] = await proxyAtlasRequest.images;
    if (map !== bodyMap) return;
    if (!atlas || (paint && !mask)) {
        atlas?.close?.();
        mask?.close?.();
        proxyAtlasRequest = null;
        self.postMessage({type: 'shadowProxyAtlas', ready: false});
        return;
    }
    if (!self.HeightShadows) importScripts('height-shadows-worker.js');
    if (!self.SceneEnvironment) importScripts('sceneenvironment.js');
    const areas = map.profile.outdoors?.[map.mapId] || [];
    outdoorShadowAreas = areas.map((area, index) => ({...area, id: 'shadow-area-' + index,
        weatherExposure: 'outdoor', authoringAtmosphere: {cycle: true, dayDarkness: 0, nightDarkness: 0,
            dayNight: self.SceneEnvironment.defaults.dayNight}}));
    bakedShadowMask = mask;
    heightShadows = new self.HeightShadows.Pass(map, atlas);
    self.postMessage({type: 'shadowProxyAtlas', ready: true});
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

function imageId(image) {
    if (!imageIds.has(image)) imageIds.set(image, ++nextImageId);
    return imageIds.get(image);
}

function drawScaledImage(ctx, image, x, y, w, h, dx, dy, scale, colorShift = null, cutoutColors = [], paint = null) {
    // Paint masks use the native artwork's full width and can end above the tilesheet's last row.
    const ratio = paint ? paint.width / image.width : 0;
    const masked = paint && y * ratio < paint.height;
    const cacheKey = imageId(image) + ':' + getCacheKey(x, y, w, h, scale, colorShift) + ':' + cutoutColors.join(';') +
        (masked ? ':paint:' + imageId(paint) : '');

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
        if (masked) {
            offCtx.globalCompositeOperation = 'destination-out';
            offCtx.drawImage(paint, x * ratio, y * ratio, w * ratio, h * ratio, 0, 0, dw, dh);
            offCtx.globalCompositeOperation = 'source-over';
        }

        // Apply color transition if applicable
        if (colorShift || cutoutColors.length) {
            let imageData = offCtx.getImageData(0, 0, dw, dh);
            // Palette cutouts are sampled once per tile variant, never by reading back a whole frame.
            // Cliff edges, bridges and collision data remain exactly where the map put them.
            if (cutoutColors.length) {
                const pixels = imageData.data;
                for (let index = 0; index < pixels.length; index += 4) {
                    if (cutoutColors.some(color => color[0] === pixels[index] && color[1] === pixels[index + 1] && color[2] === pixels[index + 2])) pixels[index + 3] = 0;
                }
            }
            if (colorShift) imageData = applyColorShift(imageData, colorShift);
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

function drawTile(ctx, tileid, tileset, setW, setH, gridW, cellid, scale, slideOffsetX, slideOffsetY, colorShift = null, cutouts = []) {
    if (tileid !== -1) { // -1 when tile is empty in Tiled. Don't attempt to draw it.
        const appearance = frameTileAppearance.get((cellid % gridW) + ',' + Math.floor(cellid / gridW) + ',' + (tileid + 1));
        if (appearance) {
            if (appearance.to != null && appearance.to <= setW * setH) tileid = appearance.to - 1;
            if (appearance.colorShift) colorShift = appearance.colorShift;
        }
        const tileX = getX(tileid + 1, setW, slideOffsetX) * tilesize;
        const tileY = getY(tileid + 1, setW, setH, slideOffsetY) * tilesize;
        const destX = getX(cellid + 1, gridW) * tilesize;
        const destY = Math.floor(cellid / gridW) * tilesize;
        const colors = cutouts.filter(area => destX >= area.x && destY >= area.y && destX < area.x + area.w && destY < area.y + area.h &&
            !(area.exclude || []).some(hole => destX >= hole.x && destY >= hole.y && destX < hole.x + hole.w && destY < hole.y + hole.h))
            .flatMap(area => area.colors);
        const scene = frameSkyTerrain;
        const x = destX / tilesize, y = destY / tilesize;
        const inSkyScene = scene && x >= scene.x && x < scene.x + scene.width && y >= scene.y && y < scene.y + scene.height;
        drawScaledImage(ctx, tileset, tileX, tileY, tilesize, tilesize, destX, destY, scale, colorShift, colors,
            inSkyScene ? framePaint : null);
    }
}

const terrainCache = new Map();
const terrainDefinitions = new Map();
let frameSkyTerrain = null, framePaint = null;

function setSkyTerrain(scene) {
    const paint = scene ? bakedShadowMask : null;
    if (framePaint !== paint || frameSkyTerrain?.x !== scene?.x || frameSkyTerrain?.y !== scene?.y ||
        frameSkyTerrain?.width !== scene?.width || frameSkyTerrain?.height !== scene?.height) {
        terrainCache.clear();
    }
    frameSkyTerrain = scene;
    framePaint = paint;
}

function boundedScene(scene) {
    return scene && [scene.x, scene.y, scene.width, scene.height].every(Number.isFinite) && scene.width > 0 && scene.height > 0;
}
let renderScale = 1;
let composingWorld = false;
let frameExtensions;
let frameCutouts = [], frameCutoutKey = '';
let frameTileAppearance = new Map(), frameTileAppearanceKey = '';
let framePending = false, nextFrameTime;
let frameWeather, frameWeatherScene, frameSky, nextPanelSample = 0, panelShadow, pendingPanelShadow;
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
        const message = {type: 'rendered'};
        if (pendingPanelShadow) {
            message.panelShadow = pendingPanelShadow;
            pendingPanelShadow = null;
        }
        postMessage(message);
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

// Tile artwork and animation frames share one emitter at the center of the map cell.
function tileLightAt(tile) {
    const source = lightEmittingTiles?.[tile.tileid + 1];
    if (!source) return;
    return {...source, x: (getX(tile.cellid + 1, tile.gridW) + .5) * tilesize,
        y: (Math.floor(tile.cellid / tile.gridW) + .5) * tilesize};
}

function drawStaticTerrain(id, tiles, cameraX, cameraY, revision) {
    const ctx = contexes[id], canvas = canvases[id];
    const key = revision === undefined ? JSON.stringify(tiles) : revision;
    let cached = terrainCache.get(id);
    if (!cached || cached.key !== key || cached.tileset !== tileset || cached.cutoutKey !== frameCutoutKey || cached.appearanceKey !== frameTileAppearanceKey ||
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
            const source = tileLightAt(tile);
            if (source) tileSources.push(source);
            if (tx + 16 > x && ty + 16 > y && tx < x + buffer.width && ty < y + buffer.height) {
                drawTile(bufferCtx, tile.tileid, tileset, tile.setW, tile.setH, tile.gridW, tile.cellid, 1, tile.slideOffsetX, tile.slideOffsetY, tile.colorShift, id === 'background' ? frameCutouts : []);
            }
        }
        if (cached) cached.canvas.width = cached.canvas.height = 0;
        cached = {key, tileset, cutoutKey: frameCutoutKey, appearanceKey: frameTileAppearanceKey, x, y, width: canvas.width, height: canvas.height, canvas: buffer, lights: tileSources};
        terrainCache.set(id, cached);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cached.canvas, Math.round(cached.x - cameraX), Math.round(cached.y - cameraY));
    tileLights.push(...cached.lights);
}

let tileLights = [];

function render(id, tiles, cameraX, cameraY, scale, clear, serverTime, scene, options, mapId, worldTime, revision, atmosphere) {
    let ctx = contexes[id];
    if (id !== 'lights' && clear) {
        if (tiles === undefined) {
            const definition = terrainDefinitions.get(id);
            if (!definition || definition.revision !== revision) {
                // A missing or stale reference must never display the previous map's terrain.
                ctx.clearRect(0, 0, canvases[id].width, canvases[id].height);
                terrainCache.delete(id);
                return;
            }
            tiles = definition.tiles;
        }
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
            if (tile.tileid !== -1) {
                // Render your tile here as usual...
                drawTile(ctx, tile.tileid, tileset, tile.setW, tile.setH, tile.gridW, tile.cellid, scale, tile.slideOffsetX, tile.slideOffsetY, tile.colorShift, id === 'background' ? frameCutouts : []);

                const source = tileLightAt(tile);
                if (source) tileLights.push(source);
            }
        }

        ctx.restore();
    } else {
        renderLightOverlay(lights, cameraX, cameraY, scale, serverTime, scene, tileLights, options, mapId, worldTime, atmosphere);
        tileLights = [];
    }
}


onmessage = (e) => {
    if (e.data.type === 'setTerrain') {
        const {id, tiles, revision} = e.data;
        if ((id === 'background' || id === 'high') && Array.isArray(tiles)) {
            terrainDefinitions.set(id, {tiles, revision});
        }
        return;
    }
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
        const generation = ++tilesetGeneration;
        const {requestId, src} = e.data;
        const previousTileset = tileset;
        tileset = undefined;
        clearImageCache();
        terrainCache.clear();
        terrainDefinitions.clear();
        previousTileset?.close?.();
        loadImg(src).then((img) => {
            if (generation !== tilesetGeneration) {
                img?.close?.();
                return;
            }
            tileset = img;
            self.postMessage({type: 'tilesetReady', requestId, ...(img ? {} : {error: 'Map tileset could not be loaded'})});
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
        const frameTime = performance.now();
        const actors = e.data.renderData.find(data => data.type === 'entities');
        const view = actors && {...filterReadyActors(actors), parallaxTime: frameTime};
        const scale = view?.scale || 1;
        resizeWorkerLayers(scale);
        if (rendererExtensions?.ready?.(e.data.extensions, {...view,
            viewportWidth: canvases.background.width / scale, viewportHeight: canvases.background.height / scale}) === false) {
            scheduleNextFrame();
            return;
        }
        composingWorld = true;
        frameEmissionForeground = null;
        frameExtensions = e.data.extensions;
        const scene = e.data.scene;
        const lightOptions = e.data.renderData.find(layer => layer?.id === 'lights')?.options;
        // Legacy maps can pack an outdoor town and its interiors onto the same sheet
        // without defining gameplay scenes. Limit only the shadow pass to their authored areas.
        const shadowScene = boundedScene(scene) ? scene : e.data.mapId === bodyMap?.mapId && outdoorShadowAreas.find(area =>
            insideScene(area, e.data.player.x, e.data.player.y));
        const profileOptions = heightShadows && view && e.data.mapId === bodyMap?.mapId && shadowScene ? lightOptions : null;
        const skyOptions = profileOptions && self.SceneEnvironment.outdoors(shadowScene) ? profileOptions : null;
        const inspect = profileOptions?.inspectShadowProxies === true;
        const animationClock = (e.data.serverTime ?? 0) + frameTime;
        const clock = e.data.worldTime ?? animationClock;
        const atmosphere = authoredLightAt(scene, clock);
        frameWeatherScene = previewWeatherScene(shadowScene || scene, e.data.previewWeather);
        frameWeather = sampleSceneWeather(frameWeatherScene, view, clock, e.data.mapId, lightOptions);
        const cloudy = frameWeather && (frameWeather.cloudy || frameWeather.rain);
        if (cloudy && !self.SceneEnvironment) importScripts('sceneenvironment.js');
        const outdoorClouds = cloudy && boundedScene(frameWeatherScene) && self.SceneEnvironment.outdoors(frameWeatherScene);
        frameSky = null;
        if (inspect || skyOptions || outdoorClouds) {
            if (!self.HeightShadows) importScripts('height-shadows-worker.js');
            const skyScene = shadowScene || scene, mapId = e.data.mapId;
            const skyAtmosphere = skyScene === scene ? atmosphere : authoredLightAt(skyScene, clock);
            const daylight = skyAtmosphere?.daylight ?? cycleDaylight(mapId, clock);
            const legacyCycle = !skyAtmosphere && mapId !== 'main';
            const cycle = legacyCycle ? {dawn: 0, dusk: 12, duskDuration: 0} : skyScene.authoringAtmosphere?.dayNight;
            frameSky = self.HeightShadows.skyLight(clock, cycle, daylight);
            if (outdoorClouds && frameSky.sun && daylight > 0) {
                const viewport = {x: -Math.round(-view.cameraX), y: -Math.round(-view.cameraY),
                    width: canvases.background.width, height: canvases.background.height};
                frameWeather.cloudLight = self.SceneWeather.prepareCloudLight(viewport, frameWeather, daylight, animationClock, view.reducedMotion);
                frameSky.cloudField = frameWeather.cloudLight;
            }
        }
        const shadowSurface = (inspect || skyOptions) && renderSkyShadows(view, shadowScene, frameSky, profileOptions);
        framePointShadows = !inspect && view && lightOptions && (lightOptions.shadows !== false || lightOptions.playerShadow !== false)
            ? {view, scene, mapId: e.data.mapId, options: lightOptions, pass: skyOptions ? heightShadows : null} : null;
        setSkyTerrain(bakedShadowMask && skyOptions && skyOptions.shadows !== false ? shadowScene : null);
        const tileAppearance = rendererExtensions?.tileAppearance?.(frameExtensions) || [];
        const appearanceKey = JSON.stringify(tileAppearance);
        if (appearanceKey !== frameTileAppearanceKey) {
            frameTileAppearance = new Map(tileAppearance.map(tile => [tile.x + ',' + tile.y + ',' + tile.from, tile]));
            frameTileAppearanceKey = appearanceKey;
        }
        frameCutouts = rendererExtensions?.terrainCutouts?.(frameExtensions, {...view,
            viewportWidth: canvases.background.width, viewportHeight: canvases.background.height}) || [];
        frameCutoutKey = JSON.stringify(frameCutouts);
        const renderDataLength = e.data.renderData.length;
        let cursorCommand, combatTextCommand;
        for (let i = 0; i < renderDataLength; i++) {
            let renderData = e.data.renderData[i];
            if (!renderData) continue;
            playerPosition = e.data.player;

            if (renderData.cursor !== undefined) {
                cursorCommand = renderData;
            } else if (renderData.type === 'combatText') {
                combatTextCommand = renderData;
            } else if (renderData.type === "text") {
                drawText(renderData);
            } else if (renderData.type === "entities") {
                drawEntities(view, skyOptions, inspect ? null : shadowSurface, shadowScene);
            } else {
                render(renderData.id, renderData.tiles, renderData.cameraX, renderData.cameraY, 1, renderData.clear, e.data.serverTime, scene, renderData.options, e.data.mapId, clock, renderData.revision, atmosphere);
            }
        }

        let combinedCanvas = canvases["combined"];
        let combinedCtx = contexes["combined"];

        if (inspect && shadowSurface) {
            framePointShadows = null;
            composingWorld = false;
            combinedCtx.drawImage(shadowSurface, 0, 0, combinedCanvas.width, combinedCanvas.height);
            if (cursorCommand) renderCursor({...cursorCommand, id: 'combined'}, false);
            scheduleNextFrame();
            return;
        }

        // World buffers are native pixel art resolution. Text keeps its display resolution.
        combinedCtx.clearRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedCtx.save();
        const shake = e.data.combatFeedback?.shake;
        if (shake) combinedCtx.translate(shake.x * scale, shake.y * scale);
        combinedCtx.drawImage(canvases.entities, 0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedCtx.drawImage(canvases.text, 0, 0);
        combinedCtx.drawImage(canvases.highEntities, 0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedCtx.globalCompositeOperation = 'multiply';
        combinedCtx.drawImage(canvases.lighting, 0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedCtx.globalCompositeOperation = 'source-over';
        drawEmissiveGlow(combinedCtx, lights, view?.cameraX || 0, view?.cameraY || 0,
            {...lightOptions, scene, scale, time: frameLightTime, excludeWorld: true});
        drawBackgroundEmission(combinedCtx, view);
        framePointShadows = null;
        drawWorldUi(combinedCtx, view);
        composingWorld = false;
        const foregroundView = {...view, lightIntensity: GLOBAL_LIGHT_INTENSITY};
        if (frameWeather?.cloudLight) {
            foregroundView.shadePlacedForeground = ctx => drawFrameClouds(ctx, view.cameraX, view.cameraY, scale, 'source-atop');
        }
        rendererExtensions?.draw('foreground', combinedCtx, e.data.extensions, foregroundView);
        drawWorldAmbience(combinedCtx, e.data.ambience, view, combinedCanvas.width, combinedCanvas.height, clock, scene);
        if (frameWeather) drawSceneWeather(combinedCtx, frameWeatherScene, view, clock, animationClock, frameWeather);
        drawCombatFeedback(combinedCtx, e.data.combatFeedback);
        if (e.data.combatFeedback?.hitFeel?.length) {
            if (!self.HitFeelRenderer) importScripts('hitfeel-worker.js');
            self.HitFeelRenderer.drawImpacts(combinedCtx, e.data.combatFeedback);
        }
        // Combat labels stay above scenery, overhead sprites, lighting and feature overlays.
        if (combatTextCommand) drawText({...combatTextCommand, id: 'combined'}, false);
        combinedCtx.restore();
        // Cursor and DOM HUD do not participate in the camera shake.
        if (cursorCommand) renderCursor({...cursorCommand, id: 'combined'}, false);

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
        sprites[e.data.spriteName] = new Sprite(e.data.spriteName, e.data.src, e.data.animationData, e.data.width, e.data.height, e.data.offsetX, e.data.offsetY, e.data);
    } else if (e.data.type === 'spriteGroundAnchorApplied') {
        const sprite = sprites[e.data.spriteName];
        if (sprite && sprite.autoGroundAnchor && sprite.image && sprite.requestId === e.data.requestId && sprite.src === e.data.src) {
            sprite.groundAnchorPending = false;
        }
    }  else if (e.data.type === "setLights") {
        lights = e.data.lights ?? [];
    } else if (e.data.type === "setObstacles") {
        obstacles = e.data.obstacles;
        obstacles = transformObstacles(obstacles);
        obstacleRevision++;
        return setBodyMap(e.data.bodyMap);
    } else if (e.data.type === 'retryShadowProxyAtlas') {
        if (bodyMap && !heightShadows) return setBodyMap(bodyMap);
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

function drawText(renderData, clear = true) {
    const ctx = contexes[renderData.id], canvas = canvases[renderData.id];
    const {cameraX, cameraY, scale} = renderData;
    const textData = readySpriteEntries(renderData.textData);
    if (clear) {
        const key = JSON.stringify([cameraX, cameraY, scale, textData, canvas.width, canvas.height, hasLoadedFont]);
        if (key === textFrameKey) return;
        textFrameKey = key;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
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
const worldUiScratch = {}, healthBarScratch = {};

function drawWorldUi(ctx, view) {
    const healthBars = (view?.entityData || []).map(entity => entity.healthBar).filter(Boolean);
    const nativeWidth = canvases.entities.width, nativeHeight = canvases.entities.height;
    let bars;
    if (healthBars.length || mobHealthBars) {
        bars = scratchCanvas(healthBarScratch, nativeWidth, nativeHeight);
        if (!mobHealthBars) {
            importScripts('mobhealthbar-worker.js');
            mobHealthBars = new self.MobHealthBars.Bars();
        }
        // Retain the original native-pixel rasterization and damage-trail clock.
        bars.ctx.save();
        bars.ctx.scale(1 / (view?.scale || 1), 1 / (view?.scale || 1));
        mobHealthBars.draw(bars.ctx, healthBars, view || {}, view?.healthTime || 0, view?.reducedMotion);
        bars.ctx.restore();
    }
    if (!healthBars.length) return;

    const {width, height} = canvases.combined;
    const ui = scratchCanvas(worldUiScratch, width, height);
    ui.ctx.drawImage(bars.canvas, 0, 0, nativeWidth, nativeHeight, 0, 0, width, height);
    // Health bars remain readable after lighting, but overhead scenery still occludes them.
    ui.ctx.globalCompositeOperation = 'destination-out';
    ui.ctx.drawImage(canvases.highEntities, 0, 0, width, height);
    ui.ctx.globalCompositeOperation = 'source-over';
    // Scratch surfaces grow on demand, so only copy the current viewport.
    ctx.drawImage(ui.canvas, 0, 0, width, height, 0, 0, width, height);
}

// Draw sprite-colored pixel fragments without reading back a canvas or adding a
// full-screen effect. Stable cell ranks make repeated frames dissolve coherently.
function drawDissolvingSprite(ctx, image, sx, sy, sw, sh, dx, dy, dw, dh, dissolve) {
    const visible = Math.max(0, Math.min(1, dissolve.visible));
    if (visible === 0) return;
    if (visible === 1) {
        ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        return;
    }
    const pixel = Math.max(1, dissolve.pixelSize);
    for (let y = 0; y < dh; y += pixel) {
        for (let x = 0; x < dw; x += pixel) {
            const cx = Math.floor((dx + x) / pixel), cy = Math.floor((dy + y) / pixel);
            const rank = (((cx * 374761393) ^ (cy * 668265263)) >>> 0) % 997 / 997;
            if (rank >= visible) continue;
            const edge = dissolve.scatter ? Math.max(0, 1 - (visible - rank) / 0.22) : 0;
            const driftX = Math.round((rank - 0.5) * edge * pixel * 18);
            const driftY = -Math.round(edge * pixel * 14);
            const w = Math.min(pixel, dw - x), h = Math.min(pixel, dh - y);
            ctx.drawImage(image, sx + x * sw / dw, sy + y * sh / dh, w * sw / dw, h * sh / dh,
                dx + x + driftX, dy + y + driftY, w, h);
        }
    }
}

function clipToScene(ctx, scene, cameraX, cameraY) {
    ctx.beginPath();
    ctx.rect(Math.round(scene.x * tilesize - cameraX), Math.round(scene.y * tilesize - cameraY), scene.width * tilesize, scene.height * tilesize);
    ctx.clip();
}

function shadeTerrain(ctx, surface, scene, cameraX, cameraY) {
    ctx.save();
    clipToScene(ctx, scene, cameraX, cameraY);
    // Only the terrain already on this layer receives sky shadows. Transparent
    // gaps in overhead tiles must stay open for the characters drawn below.
    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(surface, 0, 0);
    ctx.restore();
}

function groundAnchorReady(entity) {
    const body = sprites[entity.bodySpriteName];
    if (!body?.autoGroundAnchor) return true;
    if (body.image === undefined) body.load();
    return body.image !== undefined && !body.groundAnchorPending && (entity.groundOffsetY || 0) === body.groundOffsetY;
}

function readySpriteEntries(entries) {
    const firstPending = entries.findIndex(entry => !groundAnchorReady(entry));
    if (firstPending === -1) return entries;
    const ready = entries.slice(0, firstPending);
    for (let i = firstPending + 1; i < entries.length; i++) {
        if (groundAnchorReady(entries[i])) ready.push(entries[i]);
    }
    return ready;
}

function filterReadyActors(data) {
    const entityData = readySpriteEntries(data.entityData);
    return entityData === data.entityData ? data : {...data, entityData};
}

function drawEntities(drawEntitiesData, skyOptions, shadowSurface, scene) {
    // The main thread applies the inferred baseline to body, gear and labels together.
    // Until its acknowledgement, withhold the whole actor rather than paint one stale frame.
    drawEntitiesData = filterReadyActors(drawEntitiesData);
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
        rendererExtensions?.draw('background', ctx, frameExtensions, {...drawEntitiesData, scale: 1});
        ctx.drawImage(canvases.background, 0, 0);
        rendererExtensions?.draw('ground', ctx, frameExtensions, {...drawEntitiesData, scale: 1,
            sources: {background: canvases.background}, fireLights: lights.concat(tileLights)});
        if (shadowSurface) shadeTerrain(ctx, shadowSurface, scene, cameraX, cameraY);
        ctx.scale(1 / scale, 1 / scale);
    }
    highCtx.clearRect(0, 0, highCanvas.width, highCanvas.height);
    highCtx.save();
    if (composingWorld) {
        highCtx.drawImage(canvases.high, 0, 0);
        if (shadowSurface) shadeTerrain(highCtx, shadowSurface, scene, cameraX, cameraY);
        highCtx.scale(1 / scale, 1 / scale);
    }

    const entityCount = drawEntitiesData.entityData.length;
    for (const entity of drawEntitiesData.entityData) {
        const contact = entity.drawData.find(part => part.spriteName === 'shadow16');
        if (!contact) continue;
        if (skyOptions && insideScene(scene, entity.translateX / scale + (entity.scaleX === -1 ? -8 : 8),
            entity.depthY ?? entity.translateY / scale + tilesize)) {
            const caster = self.HeightShadows.casterDraw(entity, sprites, scale);
            if (caster && (caster.shadowBody === 'player' ? skyOptions.playerShadow : skyOptions.shadows) !== false) continue;
        } else if (hasLocalCast(entity, drawEntitiesData, framePointShadows)) continue;
        ctx.save();
        applyActorTransform(ctx, entity, cameraX, cameraY, scale);
        drawEntitySprite(ctx, entity, contact, scale);
        ctx.restore();
    }

    const scenery = composingWorld ? rendererExtensions?.sorted?.(frameExtensions, {
        ...drawEntitiesData, viewportWidth: canvas.width, viewportHeight: canvas.height
    }) || [] : [];
    let foreground;
    const foregroundSurface = () => foreground ??= pointForeground(drawEntitiesData, scenery);
    if (framePointShadows) framePointShadows.foreground = foregroundSurface;
    if (composingWorld) frameEmissionForeground = foregroundSurface;
    let sceneryIndex = 0;
    const drawSceneryUntil = depth => {
        while (sceneryIndex < scenery.length && scenery[sceneryIndex].y <= depth) scenery[sceneryIndex++].draw(ctx);
    };

    for (let i = 0; i < entityCount; i++) {
        const entityData = drawEntitiesData.entityData[i];
        if (!entityData.groundEffect) drawSceneryUntil(entityData.depthY ?? entityData.translateY / scale + 16);
        ctx.save();
        highCtx.save();

        applyActorTransform(ctx, entityData, cameraX, cameraY, scale);
        applyActorTransform(highCtx, entityData, cameraX, cameraY, scale);
        for (const drawData of entityData.drawData) {
            if (drawData.spriteName === 'shadow16') continue;
            drawEntitySprite(drawData.renderAbove ? highCtx : ctx, entityData, drawData, scale);
        }
        ctx.restore();
        highCtx.restore();
    }
    drawSceneryUntil(Infinity);
    ctx.restore();
    highCtx.restore();
}

function applyActorTransform(ctx, entity, cameraX, cameraY, scale) {
    if (entity.globalAlpha !== undefined && !Number.isNaN(entity.globalAlpha)) ctx.globalAlpha = entity.globalAlpha;
    // All layers align to the same native-art pixel, including flipped or moving actors.
    ctx.translate(Math.round(entity.translateX / scale - cameraX) * scale,
        Math.round(entity.translateY / scale - cameraY) * scale);
    if (entity.scaleX !== undefined && entity.scaleY !== undefined) ctx.scale(entity.scaleX, entity.scaleY);
}

function pointForeground(view, scenery) {
    const {width, height} = canvases.entities;
    const {ctx, canvas} = scratchCanvas(pointForegroundScratch, width, height);
    ctx.save();
    ctx.scale(1 / view.scale, 1 / view.scale);
    // Depth-sorted scenery and all visible actor parts sit above ground casts.
    // Drawing the sprite alpha here also preserves recoil, gear, and dissolution.
    for (const entry of scenery) entry.draw(ctx);
    // Extensions can paint outside their sprite metadata. Preserve their whole stencil.
    let regions = scenery.length ? null : [];
    function drawActors(overhead) {
        for (const actor of view.entityData) {
            if (actor.groundEffect) continue;
            ctx.save();
            applyActorTransform(ctx, actor, view.cameraX, view.cameraY, view.scale);
            let transform;
            for (const draw of actor.drawData) {
                if (draw.spriteName === 'shadow16' || !!draw.renderAbove !== overhead) continue;
                drawEntitySprite(ctx, actor, draw, view.scale);
                if (!regions) continue;
                if (draw.a || actor.hitFeel) { regions = null; continue; }
                transform ??= ctx.getTransform();
                const x = transform.e + draw.dx * transform.a, y = transform.f + draw.dy * transform.d;
                const right = x + draw.dW * transform.a, bottom = y + draw.dH * transform.d;
                regions.push({left: Math.min(x, right), top: Math.min(y, bottom),
                    right: Math.max(x, right), bottom: Math.max(y, bottom)});
            }
            ctx.restore();
        }
    }
    drawActors(false);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(canvases.high, 0, 0, width * view.scale, height * view.scale);
    ctx.globalCompositeOperation = 'source-over';
    drawActors(true);
    ctx.restore();
    return {canvas, regions};
}

function drawEntitySprite(ctx, entity, draw, scale) {
    const {spriteName, sx, sy, sW, sH, dx, dy, dW, dH, a, renderAbove} = draw;
    const sprite = sprites[spriteName];
    if (!sprite) {
        console.log('no sprite', spriteName);
        return;
    }
    if (sprite.image === undefined) {
        sprite.load();
        return;
    }
    if (sprite.groundAnchorPending) return;
    try {
        if (entity.hitFeel && spriteName !== 'shadow16' && !renderAbove && !a) {
            if (!self.HitFeelRenderer) importScripts('hitfeel-worker.js');
            self.HitFeelRenderer.drawSprite(ctx, sprite.image, draw, entity.hitFeel, scale);
        } else if (entity.dissolve) {
            drawDissolvingSprite(ctx, sprite.image, sx, sy, sW, sH, dx, dy, dW, dH, entity.dissolve);
        } else if (a) {
            const centerX = dW / 2, centerY = dH / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(a);
            ctx.drawImage(sprite.image, sx, sy, sW, sH, Math.cos(a) * dx - centerX,
                Math.cos(a) * dy - centerX, dW, dH);
            ctx.rotate(-a);
            ctx.translate(-centerX, -centerY);
        } else {
            ctx.drawImage(sprite.image, sx, sy, sW, sH, dx, dy, dW, dH);
        }
    } catch (e) {
        console.log('exception', e);
    }
}

lastTime = null;

let worldClock = null;
function cycleDaylight(mapId, time) {
    if (mapId !== 'main') return .5 + .5 * Math.sin(time % CYCLE_DURATION / CYCLE_DURATION * Math.PI * 2);
    if (!worldClock) {
        importScripts('worldtime-worker.js');
        worldClock = self.WorldTime;
    }
    return worldClock.mainDaylight(time);
}

// The spot gradient starts half a spread to either side of its heading.
// The extrema of a sector lie at its center, its ends, or a cardinal axis.
function beamBounds(light) {
    const spread = parseInt(light.spread);
    if (!(spread > 0 && spread < 360) || light.global) return null;
    const heading = toRad((parseInt(light.angle) || 0) + 90), half = toRad(spread / 2);
    const start = heading - half, end = heading + half, limit = Math.cos(half);
    const dx = Math.cos(heading), dy = Math.sin(heading);
    const radius = (light.radius || 1) * tilesize * (light.animation ? 1.045 : 1);
    return {
        x: Math.floor(light.x + radius * (dx <= -limit ? -1 : Math.min(0, Math.cos(start), Math.cos(end)))) - 1,
        right: Math.ceil(light.x + radius * (dx >= limit ? 1 : Math.max(0, Math.cos(start), Math.cos(end)))) + 1,
        y: Math.floor(light.y + radius * (dy <= -limit ? -1 : Math.min(0, Math.sin(start), Math.sin(end)))) - 1,
        bottom: Math.ceil(light.y + radius * (dy >= limit ? 1 : Math.max(0, Math.sin(start), Math.sin(end)))) + 1,
    };
}

function lightIntersectsView(light, cameraX, cameraY, width, height) {
    const dx = light.x - cameraX, dy = light.y - cameraY;
    if (light.global) return dx + light.w >= 0 && dy + light.h >= 0 && dx <= width && dy <= height;
    const radius = (light.radius || 1) * tilesize * (light.animation ? 1.045 : 1) + 1;
    if (dx + radius < 0 || dy + radius < 0 || dx - radius > width || dy - radius > height) return false;
    if (dx >= 0 && dx <= width && dy >= 0 && dy <= height) return true;
    const bounds = beamBounds(light);
    return !bounds || bounds.right >= cameraX && bounds.bottom >= cameraY &&
        bounds.x <= cameraX + width && bounds.y <= cameraY + height;
}

function authoredLightAt(scene, clock) {
    if (!scene?.authoringAtmosphere) return;
    if (!worldClock) {importScripts('worldtime-worker.js');worldClock = self.WorldTime;}
    return worldClock.atmosphereLight(scene.authoringAtmosphere, clock);
}

function renderSkyShadows(view, scene, sky, options) {
    const inspect = options.inspectShadowProxies === true;
    const shadows = options.shadows !== false, playerShadow = options.playerShadow !== false;
    if (!inspect && !shadows && !playerShadow) return;
    const canvas = canvases.background;
    const scenery = frameShadowBodies(view, canvas);
    return heightShadows.draw(canvas, view, scene, sky, view.entityData, sprites, {shadows, playerShadow}, scenery, inspect);
}

function frameShadowBodies(view, canvas) {
    return rendererExtensions?.shadowBodies?.(frameExtensions, {...view,
        viewportWidth: canvas.width, viewportHeight: canvas.height,
        casterClip: self.HeightShadows.casterClip(canvas.width, canvas.height)}) || [];
}

function playerLantern() {
    return {
        id: 9999,
        x: playerPosition.x + 8,
        y: playerPosition.y + 6,
        radius: 4,
        innerRadius: 0,
        intensity: 0.2,
        shadow: .45,
        owner: 'player',
    };
}

function lightInScene(light, scene) {
    return !boundedScene(scene) || insideScene(scene, light.x, light.y);
}

function insideScene(scene, x, y) {
    return x >= scene.x * tilesize && x < (scene.x + scene.width) * tilesize &&
        y >= scene.y * tilesize && y < (scene.y + scene.height) * tilesize;
}

function pointContribution(light, x, y) {
    const dx = x - light.x, dy = y - light.y, range = (light.radius || 1) * tilesize;
    const spread = Number(light.spread);
    if (spread > 0 && spread < 360) {
        const angle = Math.atan2(dy, dx) - ((Number(light.angle) || 0) + 90) * Math.PI / 180;
        if (Math.cos(angle) < Math.cos(spread * Math.PI / 360)) return 0;
    }
    return Math.max(0, 1 - Math.hypot(dx, dy) / range) * (light.intensity ?? 1) * (light.shadow ?? DEFAULT_POINT_SHADOW_STRENGTH);
}

function hasLocalCast(entity, view, state) {
    if (!state) return false;
    const draw = entity.drawData.find(part => part.shadowBody);
    if (!draw || state.options[draw.shadowBody === 'player' ? 'playerShadow' : 'shadows'] === false) return false;
    const x = entity.translateX / view.scale + (entity.scaleX === -1 ? -8 : 8);
    const y = entity.depthY ?? entity.translateY / view.scale + 16;
    state.contactLights ??= lights.concat(tileLights, playerLantern()).filter(light =>
        !light.global && light.shadow !== 0 && lightInScene(light, state.scene));
    const illuminated = state.contactLights.some(light => {
        if (light.owner === 'player' && draw.shadowBody === 'player') return false;
        return pointContribution(light, x, y) >= .02;
    });
    if (!illuminated) return false;
    if (!self.HeightShadows) importScripts('height-shadows-worker.js');
    return !!self.HeightShadows.casterDraw(entity, sprites, view.scale);
}

function preparePointShadows(state) {
    if (!state) return;
    if (!state.pass) {
        if (!self.HeightShadows) importScripts('height-shadows-worker.js');
        state.pass = (state.mapId === bodyMap?.mapId && heightShadows) || (actorPointShadows ??= new self.HeightShadows.Pass());
        const {view, scene, options} = state, canvas = canvases.background;
        state.pass.prepare(canvas, view, scene, view.entityData, sprites,
            {shadows: options.shadows !== false, playerShadow: options.playerShadow !== false}, frameShadowBodies(view, canvas));
    }
    state.pass.pointFrame.foreground = state.foreground;
    return state.pass;
}

function drawFrameClouds(ctx, cameraX, cameraY, scale, operation) {
    const x = -Math.round(-cameraX), y = -Math.round(-cameraY);
    ctx.save();
    if (scale !== 1) ctx.scale(scale, scale);
    clipToScene(ctx, frameWeatherScene, x, y);
    self.SceneWeather.drawCloudLight(ctx, frameWeather.cloudLight, x, y, operation);
    ctx.restore();
}

// Build the receiver field only when the padded static terrain cache changes.
// The *visible cutout*, not the parallax bitmap underneath solid rock, emits light.
// A small, softly upscaled field can illuminate nearby walls, bridges and actors.
function terrainSpillRaster(cached, setting, areas) {
    const step = 4, width = Math.ceil(cached.canvas.width / step), height = Math.ceil(cached.canvas.height / step);
    const raster = new OffscreenCanvas(width, height);
    const rasterCtx = raster.getContext('2d', {willReadFrequently: true});
    rasterCtx.imageSmoothingEnabled = false;
    rasterCtx.drawImage(cached.canvas, 0, 0, width, height);
    let pixels;
    try {pixels = rasterCtx.getImageData(0, 0, width, height);}
    catch (error) {raster.width = raster.height = 0; return null;}
    const mask = new Uint8Array(width * height);
    let sources = 0;
    for (let y = 0; y < height; y++) {
        const worldY = cached.y + (y + .5) * cached.canvas.height / height;
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            if (pixels.data[i * 4 + 3] >= 64) continue;
            const worldX = cached.x + (x + .5) * cached.canvas.width / width;
            if (!areas.some(area => worldX >= area.x && worldY >= area.y &&
                worldX < area.x + area.w && worldY < area.y + area.h &&
                !(area.exclude || []).some(hole => worldX >= hole.x && worldY >= hole.y &&
                    worldX < hole.x + hole.w && worldY < hole.y + hole.h))) continue;
            mask[i] = 1;
            sources++;
        }
    }
    if (!sources) {raster.width = raster.height = 0; return null;}
    if (!self.AreaEmission) importScripts('area-emission-worker.js');
    const colored = self.AreaEmission.build(mask, width, height, setting.radius / step);
    pixels.data.set(colored);
    rasterCtx.putImageData(pixels, 0, 0);
    return raster;
}

function drawTerrainIllumination(ctx, setting, cameraX, cameraY) {
    if (!(setting?.intensity > 0) || !(GLOBAL_LIGHT_INTENSITY < 1)) return;
    const cached = terrainCache.get('background');
    if (!cached) return;
    const areas = frameCutouts.filter(area => area?.colors?.length &&
        area.x < setting.x + setting.w && area.x + area.w > setting.x &&
        area.y < setting.y + setting.h && area.y + area.h > setting.y);
    if (!areas.length) return;
    const key = JSON.stringify([setting, frameCutoutKey]);
    cached.spillFields ??= new Map();
    if (!cached.spillFields.has(key)) {
        if (cached.spillFields.size >= 4) {
            const oldest = cached.spillFields.keys().next().value;
            const previous = cached.spillFields.get(oldest);
            if (previous) previous.width = previous.height = 0;
            cached.spillFields.delete(oldest);
        }
        cached.spillFields.set(key, terrainSpillRaster(cached, setting, areas));
    }
    const field = cached.spillFields.get(key);
    if (!field) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha *= Math.min(1, setting.intensity) * (1 - GLOBAL_LIGHT_INTENSITY);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(field, 0, 0, field.width, field.height,
        Math.round(cached.x - cameraX), Math.round(cached.y - cameraY),
        cached.canvas.width, cached.canvas.height);
    ctx.restore();
}

function renderLightOverlay(lightSources, cameraX, cameraY, scale, serverTime, scene, tileLights, options, mapId, worldTime,
    atmosphereLight = authoredLightAt(scene, worldTime ?? serverTime + performance.now())) {

    OPTION_SHADOWS = options?.shadows ?? true;
    OPTION_PLAYER_SHADOW = options?.playerShadow ?? true;
    OPTION_DYNAMIC_LIGHTS = options?.dynamicLights ?? true;

    if (atmosphereLight) {
        GLOBAL_LIGHT_INTENSITY = 1 - atmosphereLight.darkness;
    } else if(scene.dn_cycle && scene.dn_cycle !== "false") {
        const daylight = cycleDaylight(mapId, worldTime ?? serverTime + performance.now());
        const min = mapId === 'main' ? MAIN_MAP_MIN_LIGHT_INTENSITY : MIN_GLOBAL_LIGHT_INTENSITY;
        const max = mapId === 'main' ? MAIN_MAP_MAX_LIGHT_INTENSITY : MAX_GLOBAL_LIGHT_INTENSITY;
        GLOBAL_LIGHT_INTENSITY = min + daylight * (max - min);
    } else {
        GLOBAL_LIGHT_INTENSITY = 1 - parseFloat(scene.darkness);
    }
    const weather = scene.weather !== undefined ? scene.weather : scene.authoringAtmosphere?.weather;
    let state = composingWorld ? frameWeather : null;
    if (!composingWorld && weather && options?.ambience !== false) {
        if (!self.SceneWeather) importScripts('weather-worker.js');
        state = self.SceneWeather.sample(weather, worldTime ?? serverTime + performance.now());
    }
    if (state && options?.ambience !== false) {
        // Night haze gives way to the spatial daylight pass through dawn and dusk.
        const haze = 1 - (state.cloudLight?.daylight || 0);
        GLOBAL_LIGHT_INTENSITY = Math.max(0, GLOBAL_LIGHT_INTENSITY - state.darkness * haze);
    }
    // Clear the light canvas
    let canvas = canvases['lighting'];
    let ctx = contexes['lighting'];

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bounded = boundedScene(scene);
    const inScene = light => lightInScene(light, scene);
    if (bounded) {
        // Clip the entire pass, including ambient tint, tile lights, flicker and the player's lantern.
        clipToScene(ctx, scene, cameraX, cameraY);
    }

    // Add global light
    const tint = atmosphereLight?.color || scene.authoringAtmosphere?.color || '#000000';
    const rgb = [1,3,5].map(i => parseInt(tint.slice(i,i+2),16));
    ctx.fillStyle = `rgba(${rgb.join(',')}, ${1 - GLOBAL_LIGHT_INTENSITY})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Local emitters add their light after the patches of sunlight and cloud shade.
    if (state?.cloudLight) drawFrameClouds(ctx, cameraX, cameraY, 1, 'source-over');
    // Lava outlines already exist as transparent static terrain cutouts. Reuse
    // their cached geometry to light the entire nearby world, not isolated tile
    // centers, without regenerating a blur texture for every animated frame.
    if (composingWorld && rendererExtensions?.terrainIllumination) {
        const surfaceView = {cameraX, cameraY, scale: 1, viewportWidth: canvas.width,
            viewportHeight: canvas.height, sceneId: scene?.id};
        for (const setting of rendererExtensions.terrainIllumination(frameExtensions, surfaceView)) {
            drawTerrainIllumination(ctx, setting, cameraX, cameraY);
        }
    }


    const time = performance.now();
    frameLightTime = time;
    // Panels share one screen-space direction sampled at the player's feet.
    // Reuse the visible emitters and the sky direction that this frame already drew.
    const samplePanels = composingWorld && time >= nextPanelSample;
    let panelX = 3, panelY = 6, brightest = .02;
    if (samplePanels && frameSky?.strength > .02) {
        const cover = frameSky.cloudField ? self.SceneWeather.cloudCoverAt(frameSky.cloudField, playerPosition.x + 8, playerPosition.y + tilesize) : 0;
        brightest = 3 * (cover ? self.HeightShadows.coveredSunStrength(frameSky.strength, cover) : frameSky.strength);
        panelX = -frameSky.x * 7;
        panelY = -frameSky.y * 12;
    }
    function drawSource(source) {
        if (samplePanels && !source.global && !source.owner) {
            const x = playerPosition.x + 8, y = playerPosition.y + tilesize;
            const strength = pointContribution(source, x, y);
            if (strength > brightest) {
                brightest = strength;
                const dx = x - source.x, dy = y - source.y, distance = Math.max(tilesize, Math.hypot(dx, dy));
                panelX = 9 * dx / distance;
                panelY = 9 * dy / distance;
            }
        }
        if (!source.global && source.shadow == null) source = {...source, shadow: DEFAULT_POINT_SHADOW_STRENGTH};
        const light = source.animation && OPTION_DYNAMIC_LIGHTS ? updateAnimatedLightSource(source, time) : source;
        const pointPass = !source.global && source.shadow > 0 ? preparePointShadows(framePointShadows) : null;
        drawLightSource(ctx, light, cameraX, cameraY, pointPass, source);
    }

    if(lightSources) {
        // Draw each light source on the light canvas
        lightSources.filter((lightSource) => {
            // Light source in camera view
            // Glow-only companions do not consume the ordinary-light budget.
            return (lightSource.intensity ?? 1) > 0 && inScene(lightSource) &&
                lightIntersectsView(lightSource, cameraX, cameraY, canvas.width, canvas.height);
        }).slice(0, MAX_LIGHTS_TO_RENDER).forEach(drawSource);
    }

    // Draw tile lights
    for(let i = 0; i < tileLights.length; i++) {
        const lightSource = tileLights[i];
        if (!inScene(lightSource)) continue;
        if (!lightIntersectsView(lightSource, cameraX, cameraY, canvas.width, canvas.height)) continue;
        drawSource(lightSource);
    }

    const lantern = playerLantern();
    if (inScene(lantern) && lightIntersectsView(lantern, cameraX, cameraY, canvas.width, canvas.height)) drawSource(lantern);
    if (samplePanels) {
        nextPanelSample = time + 200;
        const x = Math.round(panelX), y = Math.round(panelY);
        if (x !== panelShadow?.x || y !== panelShadow?.y) {
            panelShadow = pendingPanelShadow = {x, y};
        }
    }
    if (composingWorld) {
        rendererExtensions?.draw('lighting', ctx, frameExtensions, {cameraX, cameraY, scale: 1,
            sources: {overhead: canvases.highEntities}});
    }
    ctx.restore();
}

// The preview uses the same source-only pass on a transparent surface. Its
// coordinates and tilesize are resolution-scaled; glowRadius stays in art pixels.
function drawEmissiveGlow(ctx, sources, cameraX, cameraY, options = {}) {
    if (options.emissiveGlow === false || !Array.isArray(sources)) return 0;
    const scene = options.scene;
    const visible = sources.filter(source => source?.glowIntensity > 0 && lightInScene(source, scene));
    if (!visible.length) return 0;
    if (!self.EmissiveGlow) importScripts('emissive-glow-worker.js');
    emissiveGlowPass ??= new self.EmissiveGlow.Pass();
    const time = options.time ?? performance.now();
    const animated = options.dynamicLights !== false && options.reducedMotion !== true;
    const emitters = visible.map(source => {
        if (!animated || source.animation !== 'fire') return source;
        const flame = {...source};
        fireAnimation(flame, time);
        // Emission is independent of ordinary intensity: an existing tile light
        // can opt into a local glow with a zero-intensity authored companion.
        return {...source, glowIntensity: source.glowIntensity * (1 + .09 * flame.flamePulse)};
    });
    const scale = options.scale || 1;
    ctx.save();
    if (scale !== 1) ctx.scale(scale, scale);
    if (boundedScene(scene)) clipToScene(ctx, scene, cameraX, cameraY);
    const drawn = emissiveGlowPass.draw(ctx, emitters, {
        cameraX, cameraY, width: ctx.canvas.width / scale, height: ctx.canvas.height / scale,
        pixelScale: tilesize / 16,
        mask: (mask, source, region) => subtractEmissiveOcclusion(mask, source, region, options)
    });
    ctx.restore();
    return drawn;
}

function drawBackgroundEmission(ctx, view) {
    if (!view || !rendererExtensions?.backgroundEmission) return;
    const width = canvases.entities.width, height = canvases.entities.height;
    const painters = rendererExtensions.backgroundEmission(frameExtensions, {...view,
        scale: 1, viewportWidth: width, viewportHeight: height, lightIntensity: GLOBAL_LIGHT_INTENSITY});
    if (!painters.length) return;
    const emission = scratchCanvas(backgroundEmissionScratch, width, height);
    for (const paint of painters) paint(emission.ctx);
    // Lava is behind terrain, roofs, actors, and depth-sorted scenery. Remove
    // their opaque pixels BEFORE applying this post-darkness screen contribution.
    emission.ctx.globalCompositeOperation = 'destination-out';
    emission.ctx.drawImage(canvases.background, 0, 0, width, height);
    emission.ctx.drawImage(canvases.highEntities, 0, 0, width, height);
    const foreground = frameEmissionForeground?.();
    if (foreground) emission.ctx.drawImage(foreground.canvas, 0, 0, width, height);
    emission.ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(emission.canvas, 0, 0, width, height, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
}

function subtractEmissiveOcclusion(ctx, source, region, options) {
    const shadow = source.shadow ?? DEFAULT_POINT_SHADOW_STRENGTH;
    if (shadow > 0 && (options.shadows !== false || options.playerShadow !== false)) {
        const pointPass = preparePointShadows(framePointShadows);
        const radius = region.width / 2;
        if (pointPass) {
            // A glow may extend beyond a tiny ordinary light. Reuse its mask
            // whenever that mask already covers the authored emission radius.
            const shadowSource = radius > (source.radius || 1) * tilesize
                ? {...source, radius: radius / tilesize} : source;
            const mask = pointPass.pointMask(shadowSource, beamBounds(shadowSource));
            if (mask) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.globalAlpha = Math.min(1, shadow);
                ctx.drawImage(mask.canvas, mask.x - region.worldX, mask.y - region.worldY);
                ctx.globalAlpha = 1;
            }
        }
        if (options.shadows !== false) {
            const frame = pointPass?.pointFrame;
            const independent = frame ? (frame.obstacles ??= obstacles.filter(p =>
                !p.proxyOwner || !pointPass.ownsPointBlocker(p.proxyOwner, frame.scenery))) : obstacles;
            const blockers = independent.filter(p => polygonIntersectsLight(p, source, radius));
            if (blockers.length) {
                ctx.save();
                ctx.translate(source.x - radius - region.worldX, source.y - radius - region.worldY);
                subtractShadows(ctx, {...source, radius: radius / tilesize, innerRadius: 0,
                    intensity: 1, shadow, animation: undefined}, blockers, region.width, region.height);
                ctx.restore();
            }
        }
    }
    if (!options.excludeWorld) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
    const foreground = frameEmissionForeground?.();
    const overlaps = !foreground?.regions || foreground.regions.some(r =>
        r.left < region.x + region.width && r.right > region.x && r.top < region.y + region.height && r.bottom > region.y);
    const erase = canvas => {
        if (!canvas) return;
        ctx.drawImage(canvas, region.x, region.y, region.width, region.height,
            0, 0, region.width, region.height);
    };
    if (overlaps) erase(foreground?.canvas);
    erase(canvases.highEntities);
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

const lightScratch = {}, shadowScratch = {}, gradientScratch = {}, backgroundEmissionScratch = {};
const pointForegroundScratch = {}, pointMaskScratch = {};
let obstacleRevision = 0;
function scratchCanvas(scratch, width, height) {
    if (!scratch.canvas) scratch.canvas = new OffscreenCanvas(width, height);
    if (scratch.canvas.width < width) scratch.canvas.width = width;
    if (scratch.canvas.height < height) scratch.canvas.height = height;
    const ctx = scratch.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    return {canvas: scratch.canvas, ctx};
}

function drawLightSource(ctx, light, cameraX, cameraY, pointPass, source = light) {
    const innerRadius = (light.innerRadius || 0) * tilesize;
    const outerRadius = (light.radius || 1) * tilesize;
    // Blit the active rectangle of shared scratch canvases on the terrain's pixel grid.
    // At half a pixel, nearest-neighbour sampling can pick up the previous light's edge.
    const offsetX = Math.round(-cameraX), offsetY = Math.round(-cameraY);
    const screenX = Math.round(light.global ? light.x : light.x - outerRadius) + offsetX;
    const screenY = Math.round(light.global ? light.y : light.y - outerRadius) + offsetY;
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
    const region = {x: screenX, y: screenY, width, height};
    if (pointPass && !light.global && light.shadow > 0 && (OPTION_SHADOWS || OPTION_PLAYER_SHADOW)) {
        const mask = pointPass.pointMask(source, beamBounds(source));
        const frame = pointPass.pointFrame;
        const independent = OPTION_SHADOWS ? (frame.obstacles ??= obstacles.filter(p =>
            !p.proxyOwner || !pointPass.ownsPointBlocker(p.proxyOwner, frame.scenery))) : [];
        const blockers = independent.filter(p => polygonIntersectsLight(p, source, outerRadius));
        if (mask || blockers.length) {
            region.x = Math.max(0, screenX);
            region.y = Math.max(0, screenY);
            region.width = Math.min(screenX + width, ctx.canvas.width) - region.x;
            region.height = Math.min(screenY + height, ctx.canvas.height) - region.y;
            if (region.width <= 0 || region.height <= 0) return;
            const cropX = region.x - screenX, cropY = region.y - screenY;
            const scratch = scratchCanvas(lightScratch, region.width, region.height);
            scratch.ctx.drawImage(gradientCanvas, cropX, cropY, region.width, region.height, 0, 0, region.width, region.height);
            if (blockers.length) {
                scratch.ctx.save();
                scratch.ctx.translate(-cropX, -cropY);
                subtractShadows(scratch.ctx, light, blockers, width, height);
                scratch.ctx.restore();
            }
            if (mask) {
                subtractPointMask(scratch.ctx, mask, frame, light, region, offsetX, offsetY);
            }
            output = scratch.canvas;
        }
    } else if (light.shadow > 0 && (OPTION_SHADOWS || OPTION_PLAYER_SHADOW)) {
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
        if (OPTION_PLAYER_SHADOW && playerPosition && source.owner !== 'player') {
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
    ctx.drawImage(output, 0, 0, region.width, region.height,
        region.x, region.y, region.width, region.height);
}

function subtractPointMask(ctx, mask, frame, light, region, offsetX, offsetY) {
    // The mask includes elevated receivers such as tree crowns. Keep those pixels
    // registered to the artwork while the flame changes radius, position and opacity.
    const x = mask.x + offsetX - region.x, y = mask.y + offsetY - region.y;
    const left = Math.max(0, x), top = Math.max(0, y);
    const right = Math.min(region.width, x + mask.canvas.width), bottom = Math.min(region.height, y + mask.canvas.height);
    if (right <= left || bottom <= top) return;

    const foreground = frame.foregroundSurface ??= frame.foreground?.();
    const screenLeft = region.x + left, screenTop = region.y + top;
    const cw = right - left, ch = bottom - top;
    const overlap = foreground && (!foreground.regions || foreground.regions.some(r =>
        r.left < screenLeft + cw && r.right > screenLeft && r.top < screenTop + ch && r.bottom > screenTop));
    const flameOpacity = light.animation === 'fire' ? .78 + .055 * (light.flamePulse || 0) : 1;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = Math.min(1, light.shadow * flameOpacity);
    if (overlap) {
        const clipped = scratchCanvas(pointMaskScratch, cw, ch);
        clipped.ctx.drawImage(mask.canvas, left - x, top - y, cw, ch, 0, 0, cw, ch);
        clipped.ctx.globalCompositeOperation = 'destination-out';
        clipped.ctx.drawImage(foreground.canvas, screenLeft, screenTop, cw, ch, 0, 0, cw, ch);
        ctx.drawImage(clipped.canvas, 0, 0, cw, ch, left, top, cw, ch);
    } else {
        ctx.drawImage(mask.canvas, left - x, top - y, cw, ch, left, top, cw, ch);
    }
    ctx.globalAlpha = 1;
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
function drawWorldAmbience(context, ambience, view, width, height, worldTime, scene) {
    if (!ambience || !view || ambience.reducedMotion) return;
    if (!self.WorldParticles) importScripts('worldparticles-worker.js');
    const elapsed = (Date.now() - (ambience.epoch || 0)) / 1000;
    const daylight = sceneDaylight(scene, worldTime);
    context.save();
    if (ambience.bounds) {
        const {x, y, width: w, height: h} = ambience.bounds;
        context.beginPath(); context.rect((x - view.cameraX) * view.scale, (y - view.cameraY) * view.scale, w * view.scale, h * view.scale); context.clip();
    }
    for (const effect of ambience.effects || [{type: ambience.particles, count: ambience.particleCount}]) {
        for (const point of ambienceParticlePositions({particles: effect.type, particleCount: effect.count, design: effect.design}, view, elapsed, width, height)) {
            const reacted = self.WorldParticles.react(point, effect.type, elapsed, view, ambience.fx);
            self.WorldParticles.drawEffect(context, reacted, effect, elapsed, daylight);
        }
    }
    context.restore();
}
function ambienceParticlePositions(config, view, elapsed, width, height) {
    return self.WorldParticles.positions(config.particles, config.particleCount, elapsed,
        {x: view.cameraX, y: view.cameraY, scale: view.scale}, width, height, config.design);
}

function sceneDaylight(scene, time, mapId = 'main') {
    if (scene?.authoringAtmosphere) {
        if (!worldClock) {importScripts('worldtime-worker.js'); worldClock = self.WorldTime;}
        const config = scene.authoringAtmosphere;
        return config.cycle ? worldClock.atmosphereLight(config, time).daylight : 1 - config.dayDarkness;
    }
    return cycleDaylight(mapId, time);
}
function previewWeatherScene(scene, preset) {
    if (!preset || !boundedScene(scene)) return scene;
    if (!self.SceneEnvironment) importScripts('sceneenvironment.js');
    if (!self.SceneEnvironment.types.includes(preset) || !self.SceneEnvironment.outdoors(scene)) return scene;
    const authored = scene.weather || scene.authoringAtmosphere?.weather || self.SceneEnvironment.defaults.weather;
    return {...scene, weather: {...authored, mode: 'fixed', type: preset, intensity: .85}};
}

function sampleSceneWeather(scene, view, time, mapId, options) {
    const config = scene?.weather !== undefined ? scene.weather : scene?.authoringAtmosphere?.weather;
    if (!config || !view || view.ambienceEnabled === false || options?.ambience === false) return;
    if (!self.SceneWeather) importScripts('weather-worker.js');
    return self.SceneWeather.sample(config, time, sceneDaylight(scene, time, mapId));
}

function drawSceneWeather(context, scene, view, time, animationClock, state = sampleSceneWeather(scene, view, time)) {
    if (!state) return;
    self.SceneWeather.draw(context, state, {...view,
        bounds: {x: scene.x * 16, y: scene.y * 16, w: scene.width * 16, h: scene.height * 16}}, animationClock);
}

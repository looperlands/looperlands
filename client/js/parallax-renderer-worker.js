// Scene-local image planes. Coordinates and image sizes use native world pixels.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else {
        root.createSceneParallax = factory;
        if (!root.RendererExtensions) return;
        const parallax = factory();
        root.RendererExtensions.register('parallax-background', {layer: 'background', draw: parallax.background, terrainCutouts: parallax.terrainCutouts});
        root.RendererExtensions.register('parallax-ground', {layer: 'ground', subpixel: true, draw: parallax.ground});
        root.RendererExtensions.register('parallax-entities', {layer: 'entities', entries: parallax.entries});
        root.RendererExtensions.register('parallax-foreground', {layer: 'foreground', draw: parallax.foreground});
    }
})(typeof self !== 'undefined' ? self : null, function (options = {}) {
    const images = new Map();
    const rasters = new Map(), imageIds = new WeakMap();
    const maxRasterBytes = 16 * 1024 * 1024;
    let rasterBytes = 0, nextImageId = 0;
    const createCanvas = options.createCanvas || ((width, height) => new OffscreenCanvas(width, height));
    const now = options.now || (() => performance.now());
    const loadImage = options.loadImage || (async source => {
        const response = await fetch(source);
        if (!response.ok) throw new Error('Parallax image returned HTTP ' + response.status);
        return createImageBitmap(await response.blob());
    });
    const finite = (value, fallback, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    const validSource = source => typeof source === 'string' && /^\/img\/parallax\/[a-z0-9][a-z0-9-]*\.(png|webp)$/.test(source);

    function imageFor(source) {
        if (!validSource(source)) return null;
        let entry = images.get(source);
        if (!entry) {
            // Cache both pending loads and failures; a missing decoration must never retry every frame.
            entry = {image: null};
            images.set(source, entry);
            Promise.resolve().then(() => loadImage(source)).then(image => {
                if (images.get(source) === entry) entry.image = image;
                else image?.close?.();
            }).catch(error => options.onError?.(error));
            while (images.size > 16) {
                const oldest = images.keys().next().value;
                images.get(oldest).image?.close?.();
                images.delete(oldest);
            }
        } else {
            images.delete(source);
            images.set(source, entry);
        }
        return entry.image;
    }

    function rasterFor(image, width, height, scale) {
        const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
        const zoom = Math.max(1, Math.ceil(scale)), bytes = w * h * zoom * zoom * 4;
        if (bytes > maxRasterBytes / 2) return image;
        if (!imageIds.has(image)) imageIds.set(image, ++nextImageId);
        const key = imageIds.get(image) + ':' + w + 'x' + h + '@' + zoom;
        let entry = rasters.get(key);
        if (entry) {
            rasters.delete(key); rasters.set(key, entry);
            return entry.canvas;
        }
        while (rasters.size && (rasterBytes + bytes > maxRasterBytes || rasters.size >= 32)) {
            const oldest = rasters.keys().next().value, previous = rasters.get(oldest);
            rasterBytes -= previous.bytes;
            previous.canvas.width = previous.canvas.height = 0;
            rasters.delete(oldest);
        }
        // Sample the artwork once on its native pixel grid, then enlarge without filtering.
        // Only the final fractional display-pixel translation is filtered each frame.
        const native = createCanvas(w, h), nativeCtx = native.getContext('2d');
        nativeCtx.imageSmoothingEnabled = false;
        nativeCtx.drawImage(image, 0, 0, w, h);
        let canvas = native;
        if (zoom > 1) {
            canvas = createCanvas(w * zoom, h * zoom);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(native, 0, 0, canvas.width, canvas.height);
            native.width = native.height = 0;
        }
        entry = {canvas, bytes}; rasters.set(key, entry); rasterBytes += bytes;
        return canvas;
    }

    function drawLayer(ctx, layer, scene, view, clip, time) {
        if (layer.placed) {
            for (const sprite of placedSprites(layer, scene, view, clip)) drawSprite(ctx, sprite, clip, view.scale);
            return;
        }
        const image = imageFor(layer.image);
        if (!image) return;
        const scale = view.scale;
        const width = finite(layer.width, 384, 32, 4096);
        const height = finite(layer.height, 384, 32, 4096);
        const factorX = view.reducedMotion ? 1 : finite(layer.factorX, 1, 0, 2);
        const factorY = view.reducedMotion ? 1 : finite(layer.factorY, 1, 0, 2);
        const seconds = view.reducedMotion ? 0 : time / 1000;
        const x = -(view.cameraX - scene.x * 16) * factorX + finite(layer.offsetX, 0, -4096, 4096) + seconds * finite(layer.driftX, 0, -32, 32);
        const y = -(view.cameraY - scene.y * 16) * factorY + finite(layer.offsetY, 0, -4096, 4096) + seconds * finite(layer.driftY, 0, -32, 32);
        const startX = layer.repeatX === false ? x : x + Math.floor((clip.left - x) / width) * width;
        const startY = layer.repeatY === false ? y : y + Math.floor((clip.top - y) / height) * height;
        const endX = layer.repeatX === false ? startX + width : clip.right;
        const endY = layer.repeatY === false ? startY + height : clip.bottom;
        ctx.globalAlpha = finite(layer.opacity, 1, 0, 1);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'low';
        const raster = rasterFor(image, width, height, scale);
        let count = 0;
        for (let dy = startY; dy < endY; dy += height) {
            for (let dx = startX; dx < endX; dx += width) {
                if (++count > 256) return;
                if (dx >= clip.right || dy >= clip.bottom || dx + width <= clip.left || dy + height <= clip.top) continue;
                // Keep fractional positions: slow drift must advance every frame, not every art pixel.
                ctx.drawImage(raster, dx * scale, dy * scale, width * scale, height * scale);
            }
        }
    }

    function sceneClip(scene, view, width, height) {
        if (!scene || ![scene.x, scene.y, scene.w, scene.h].every(Number.isFinite) || scene.w <= 0 || scene.h <= 0) return null;
        const left = scene.x * 16 - view.cameraX, top = scene.y * 16 - view.cameraY;
        const clip = {left: Math.max(0, left), top: Math.max(0, top),
            right: Math.min(width, left + scene.w * 16), bottom: Math.min(height, top + scene.h * 16)};
        clip.exclude = (scene.exclude || []).map(area => ({x: area.x - view.cameraX, y: area.y - view.cameraY, w: area.w, h: area.h}));
        return clip.right > clip.left && clip.bottom > clip.top ? clip : null;
    }

    function placedSprites(layer, scene, view, clip) {
        const result = [], placements = Array.isArray(scene.placements) ? scene.placements : [];
        const centerX = view.viewportWidth / 2, centerY = view.viewportHeight / 2;
        const factorX = view.reducedMotion ? 1 : finite(layer.factorX, 1, 0.5, 2);
        const factorY = view.reducedMotion ? 1 : finite(layer.factorY, 1, 0.5, 2);
        for (const placement of placements.slice(0, 256)) {
            if (!placement || ![placement.x, placement.y].every(Number.isFinite)) continue;
            const size = finite(placement.scale, 1, 0.5, 2);
            const width = finite(layer.width, 96, 8, 512) * size, height = finite(layer.height, 96, 8, 512) * size;
            const worldX = scene.x * 16 + placement.x, worldY = scene.y * 16 + placement.y;
            // Each height projects around the viewport center; roots remain fixed to the world.
            // Unlike scrolling a whole texture, this never separates a crown from its trunk over a long walk.
            const x = centerX + (worldX - view.cameraX - centerX) * factorX + finite(layer.offsetX, 0, -512, 512) * size
                - width * finite(layer.anchorX, 0.5, 0, 1);
            const y = centerY + (worldY - view.cameraY - centerY) * factorY + finite(layer.offsetY, 0, -512, 512) * size
                - height * finite(layer.anchorY, 0.5, 0, 1);
            if (x >= clip.right || y >= clip.bottom || x + width <= clip.left || y + height <= clip.top) continue;
            const opacity = finite(layer.opacity, 1, 0, 1);
            const image = imageFor(layer.image);
            if (image) result.push({image, x, y, width, height, opacity, worldY, flipX: placement.flipX === true});
        }
        return result;
    }

    function applyClip(ctx, clip, scale) {
        ctx.beginPath();
        ctx.rect(clip.left * scale, clip.top * scale, (clip.right - clip.left) * scale, (clip.bottom - clip.top) * scale);
        ctx.clip();
        // Intersect one subtraction at a time so overlapping exclusions never reopen a hole.
        for (const area of clip.exclude || []) {
            const x = Math.max(clip.left, area.x), y = Math.max(clip.top, area.y);
            const w = Math.min(clip.right, area.x + area.w) - x, h = Math.min(clip.bottom, area.y + area.h) - y;
            if (w <= 0 || h <= 0) continue;
            ctx.beginPath();
            ctx.rect(clip.left * scale, clip.top * scale, (clip.right - clip.left) * scale, (clip.bottom - clip.top) * scale);
            ctx.rect(x * scale, y * scale, w * scale, h * scale); ctx.clip('evenodd');
        }
    }

    function drawSprite(ctx, sprite, clip, scale, rasterScale = scale) {
        ctx.save();
        applyClip(ctx, clip, scale);
        ctx.globalAlpha = sprite.opacity;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'low';
        const x = sprite.x * scale, y = sprite.y * scale;
        const width = Math.round(sprite.width) * scale, height = Math.round(sprite.height) * scale;
        const raster = rasterFor(sprite.image, sprite.width, sprite.height, rasterScale);
        if (sprite.flipX) {
            ctx.translate(x + width, y); ctx.scale(-1, 1);
            ctx.drawImage(raster, 0, 0, width, height);
        } else ctx.drawImage(raster, x, y, width, height);
        ctx.restore();
    }

    function entries(state, view) {
        const result = [];
        if (!state || !view || ![view.cameraX, view.cameraY, view.scale, view.viewportWidth, view.viewportHeight].every(Number.isFinite)) return result;
        for (const scene of (Array.isArray(state.scenes) ? state.scenes : []).slice(0, 100)) {
            const clip = sceneClip(scene, view, view.viewportWidth, view.viewportHeight);
            if (!clip) continue;
            for (const layer of (Array.isArray(scene.layers) ? scene.layers : []).slice(0, 8)) {
                if (!layer?.placed || layer.plane !== 'entities') continue;
                for (const sprite of placedSprites(layer, scene, view, clip)) {
                    result.push({y: sprite.worldY, draw: ctx => drawSprite(ctx, sprite, clip, view.scale, 1)});
                }
            }
        }
        return result;
    }

    function terrainCutouts(state, view) {
        const result = [];
        if (!state || !view) return result;
        for (const scene of (Array.isArray(state.scenes) ? state.scenes : []).slice(0, 100)) {
            if (!sceneClip(scene, view, view.viewportWidth, view.viewportHeight)) continue;
            const colors = (Array.isArray(scene.cutoutColors) ? scene.cutoutColors : []).slice(0, 8)
                .filter(color => Array.isArray(color) && color.length === 3 && color.every(value => Number.isInteger(value) && value >= 0 && value <= 255));
            const layers = (scene.layers || []).filter(layer => layer?.plane === 'background');
            // Keep the original map intact while its replacement is loading or unavailable.
            if (!colors.length || !layers.length || !layers.every(layer => imageFor(layer.image))) continue;
            result.push({x: scene.x * 16, y: scene.y * 16, w: scene.w * 16, h: scene.h * 16, colors, ...(scene.exclude?.length ? {exclude: scene.exclude} : {})});
        }
        return result;
    }

    function draw(plane, ctx, state, view) {
        if (!state || !view || ![view.cameraX, view.cameraY, view.scale].every(Number.isFinite) || view.scale <= 0) return;
        const time = now();
        const viewportWidth = ctx.canvas.width / view.scale, viewportHeight = ctx.canvas.height / view.scale;
        view = {...view, viewportWidth, viewportHeight};
        for (const scene of (Array.isArray(state.scenes) ? state.scenes : []).slice(0, 100)) {
            const clip = sceneClip(scene, view, viewportWidth, viewportHeight);
            if (!clip) continue;
            ctx.save();
            applyClip(ctx, clip, view.scale);
            if (plane === 'background' && /^#[0-9a-f]{6}$/i.test(scene.backgroundColor || '')) {
                ctx.fillStyle = scene.backgroundColor;
                ctx.fillRect(clip.left * view.scale, clip.top * view.scale, (clip.right - clip.left) * view.scale, (clip.bottom - clip.top) * view.scale);
            }
            for (const layer of (Array.isArray(scene.layers) ? scene.layers : []).slice(0, 8)) {
                if (!layer || (layer.plane || 'foreground') !== plane) continue;
                ctx.save();
                // Opaque overhead tree art follows the scene's ambient light too.
                if (layer.placed && plane === 'foreground' && Number.isFinite(view.lightIntensity)) ctx.filter = 'brightness(' + finite(view.lightIntensity, 1, 0, 1) + ')';
                drawLayer(ctx, layer, scene, view, clip, time);
                ctx.restore();
            }
            ctx.restore();
        }
    }
    return {
        entries,
        terrainCutouts,
        background: (ctx, state, view) => draw('background', ctx, state, view),
        ground: (ctx, state, view) => draw('ground', ctx, state, view),
        foreground: (ctx, state, view) => draw('foreground', ctx, state, view)
    };
});

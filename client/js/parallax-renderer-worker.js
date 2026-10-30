// Scene-local image planes. Coordinates and image sizes use native world pixels.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else {
        root.createSceneParallax = factory;
        if (!root.RendererExtensions) return;
        const parallax = factory();
        root.RendererExtensions.register('parallax-background', {layer: 'background', draw: parallax.background, terrainCutouts: parallax.terrainCutouts, ready: parallax.ready});
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

    const visibleLayer = (layer, scene, view) => !layer?.activeSceneOnly || String(view.sceneId) === String(scene.id);

    function imageFor(source) {
        if (!validSource(source)) return null;
        let entry = images.get(source);
        if (!entry) {
            // Cache both pending loads and failures; a missing decoration must never retry every frame.
            entry = {image: null, requestedAt: now()};
            images.set(source, entry);
            Promise.resolve().then(() => loadImage(source)).then(image => {
                if (images.get(source) === entry) {entry.image = image; entry.loadedAt = now();}
                else image?.close?.();
            }).catch(error => {entry.failed = true; options.onError?.(error);});
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

    function loadOpacity(source, view, plane) {
        // Recessed terrain must be opaque as soon as its cutout becomes active.
        if (view.reducedMotion || plane === 'background') return 1;
        const duration = options.fadeDuration ?? 800;
        if (duration <= 0) return 1;
        const progress = Math.max(0, Math.min(1, (now() - images.get(source).loadedAt) / duration));
        return progress * progress * (3 - 2 * progress);
    }

    function rasterFor(image, width, height, scale, brightness = 1) {
        let w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
        let zoom = Math.max(1, Math.ceil(scale));
        if (w * h * zoom * zoom * 4 > maxRasterBytes / 2) {
            zoom = 1;
            const ratio = Math.min(1, Math.sqrt(maxRasterBytes / 8 / (w * h)));
            w = Math.max(1, Math.floor(w * ratio)); h = Math.max(1, Math.floor(h * ratio));
        }
        const bytes = w * h * zoom * zoom * 4;
        // Bound cache variants while keeping day/night changes visually gradual.
        brightness = Math.round(brightness * 128) / 128;
        if (!imageIds.has(image)) imageIds.set(image, ++nextImageId);
        const key = imageIds.get(image) + ':' + w + 'x' + h + '@' + zoom + ':' + brightness;
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
        // Canvas filters are not implemented consistently in Safari. Composite onto
        // the artwork itself so transparent edges keep their alpha in every browser.
        if (brightness < 1) {
            nativeCtx.globalCompositeOperation = 'source-atop';
            nativeCtx.fillStyle = 'rgba(0,0,0,' + (1 - brightness) + ')';
            nativeCtx.fillRect(0, 0, w, h);
            nativeCtx.globalCompositeOperation = 'source-over';
        }
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

    function sway(layer, view, time, phase = 0) {
        if (view.reducedMotion) return {x: 0, y: 0};
        const angle = time / 1000 / finite(layer.swayPeriod, 6, 1, 30) * Math.PI * 2 + phase;
        return {x: finite(layer.swayX, 0, 0, 12) * (Math.sin(angle) * .85 + Math.sin(angle * 2) * .15),
            y: finite(layer.swayY, 0, 0, 12) * Math.sin(angle + .8)};
    }

    // Stable samples keep each repeated sprite's motion independent of frame rate and camera position.
    function unit(seed) {
        const value = Math.sin(seed * 12.9898) * 43758.5453;
        return value - Math.floor(value);
    }

    function orbitMotion(layer, seconds, column, row) {
        const phase = column * 1.7 + row * 2.3;
        const seed = column * 127.1 + row * 311.7 + finite(layer.orbitPeriod, 8, 2, 60) * 17;
        const variation = finite(layer.orbitVariation, 0, 0, 1);
        const direction = variation && unit(seed + 3) < .5 ? -1 : 1;
        const speed = 1 + (unit(seed + 7) * 2 - 1) * .45 * variation;
        const omega = Math.PI * 2 / finite(layer.orbitPeriod, 8, 2, 60) * speed;
        const pulse = seconds * omega * .63 + phase;
        const angle = phase + direction * (seconds * omega + variation * .28 * Math.sin(pulse));
        const angularSpeed = direction * omega * (1 + variation * .1764 * Math.cos(pulse));
        const radius = finite(layer.orbitRadius, 0, 0, 256);
        const orientation = unit(seed + 11) * Math.PI * 2 * variation;
        const cos = Math.cos(orientation), sin = Math.sin(orientation);
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius * .65;
        const vx = -Math.sin(angle) * radius * angularSpeed, vy = Math.cos(angle) * radius * .65 * angularSpeed;
        const scaleVariation = finite(layer.scaleVariation, 0, 0, .75);
        return {x: x * cos - y * sin, y: x * sin + y * cos,
            rotation: Math.atan2(vx * sin + vy * cos + finite(layer.driftY, 0, -32, 32),
                vx * cos - vy * sin + finite(layer.driftX, 0, -32, 32)) + Math.PI / 2,
            scale: 1 + scaleVariation * (.65 * (unit(seed + 19) * 2 - 1) + .35 * Math.sin(seconds * .32 + unit(seed + 23) * Math.PI * 2))};
    }

    function drawLayer(ctx, layer, scene, view, clip, time, brightness) {
        if (layer.placed) {
            for (const sprite of placedSprites(layer, scene, view, clip, time)) drawSprite(ctx, sprite, clip, view.scale, view.scale, brightness);
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
        const motion = sway(layer, view, time);
        const x = motion.x - (view.cameraX - scene.x * 16) * factorX + finite(layer.offsetX, 0, -4096, 4096) + seconds * finite(layer.driftX, 0, -32, 32);
        const y = motion.y - (view.cameraY - scene.y * 16) * factorY + finite(layer.offsetY, 0, -4096, 4096) + seconds * finite(layer.driftY, 0, -32, 32);
        // Repeat distance is independent of sprite size, leaving quiet gaps between passes.
        const spacingX = finite(layer.spacingX, width, width, 4096);
        const spacingY = finite(layer.spacingY, height, height, 4096);
        const radius = finite(layer.orbitRadius, 0, 0, 256);
        const maxSize = 1 + finite(layer.scaleVariation, 0, 0, .75);
        const margin = radius || maxSize > 1 ? radius + Math.hypot(width, height) * maxSize / 2 : 0;
        const startX = layer.repeatX === false ? x : x + Math.floor((clip.left - margin - x) / spacingX) * spacingX;
        const startY = layer.repeatY === false ? y : y + Math.floor((clip.top - margin - y) / spacingY) * spacingY;
        const endX = layer.repeatX === false ? startX + width : clip.right + margin;
        const endY = layer.repeatY === false ? startY + height : clip.bottom + margin;
        ctx.globalAlpha *= finite(layer.opacity, 1, 0, 1) * loadOpacity(layer.image, view, layer.plane);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'low';
        const raster = rasterFor(image, width, height, scale, brightness);
        const edge = layer.rotateToPath && radius ? Math.hypot(width, height) * maxSize / 2 : 0;
        let count = 0;
        for (let dy = startY; dy < endY; dy += spacingY) {
            for (let dx = startX; dx < endX; dx += spacingX) {
                if (++count > 256) return;
                const flight = radius || maxSize > 1 ? orbitMotion(layer, seconds,
                    Math.round((dx - x) / spacingX), Math.round((dy - y) / spacingY)) : {x: 0, y: 0, scale: 1};
                const spriteWidth = width * flight.scale, spriteHeight = height * flight.scale;
                const px = dx + flight.x + (width - spriteWidth) / 2;
                const py = dy + flight.y + (height - spriteHeight) / 2;
                if (px - edge >= clip.right || py - edge >= clip.bottom || px + spriteWidth + edge <= clip.left || py + spriteHeight + edge <= clip.top) continue;
                // Cache one raster; gradual height changes scale it without allocating new buffers.
                if (layer.rotateToPath && radius) {
                    ctx.save();
                    ctx.translate((px + spriteWidth / 2) * scale, (py + spriteHeight / 2) * scale);
                    ctx.rotate(flight.rotation);
                    ctx.drawImage(raster, -spriteWidth * scale / 2, -spriteHeight * scale / 2, spriteWidth * scale, spriteHeight * scale);
                    ctx.restore();
                } else ctx.drawImage(raster, px * scale, py * scale, spriteWidth * scale, spriteHeight * scale);
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

    function placedSprites(layer, scene, view, clip, time = now()) {
        const result = [], placements = Array.isArray(scene.placements) ? scene.placements : [];
        const centerX = view.viewportWidth / 2, centerY = view.viewportHeight / 2;
        const factorX = view.reducedMotion ? 1 : finite(layer.factorX, 1, 0.5, 2);
        const factorY = view.reducedMotion ? 1 : finite(layer.factorY, 1, 0.5, 2);
        for (const placement of placements.slice(0, 256)) {
            if (!placement || ![placement.x, placement.y].every(Number.isFinite)) continue;
            const size = finite(placement.scale, 1, 0.5, 2);
            const width = finite(layer.width, 96, 8, 512) * size, height = finite(layer.height, 96, 8, 512) * size;
            const worldX = scene.x * 16 + placement.x, worldY = scene.y * 16 + placement.y;
            const motion = sway(layer, view, time, worldX * .017 + worldY * .011);
            // Each height projects around the viewport center; roots remain fixed to the world.
            // Unlike scrolling a whole texture, this never separates a crown from its trunk over a long walk.
            const x = motion.x * size + centerX + (worldX - view.cameraX - centerX) * factorX + finite(layer.offsetX, 0, -512, 512) * size
                - width * finite(layer.anchorX, 0.5, 0, 1);
            const y = motion.y * size + centerY + (worldY - view.cameraY - centerY) * factorY + finite(layer.offsetY, 0, -512, 512) * size
                - height * finite(layer.anchorY, 0.5, 0, 1);
            if (x >= clip.right || y >= clip.bottom || x + width <= clip.left || y + height <= clip.top) continue;
            const image = imageFor(layer.image);
            const opacity = finite(layer.opacity, 1, 0, 1);
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

    function drawSprite(ctx, sprite, clip, scale, rasterScale = scale, brightness = 1) {
        ctx.save();
        applyClip(ctx, clip, scale);
        ctx.globalAlpha *= sprite.opacity;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'low';
        const x = sprite.x * scale, y = sprite.y * scale;
        const width = Math.round(sprite.width) * scale, height = Math.round(sprite.height) * scale;
        const raster = rasterFor(sprite.image, sprite.width, sprite.height, rasterScale, brightness);
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
                if (!layer?.placed || layer.plane !== 'entities' || !visibleLayer(layer, scene, view)) continue;
                for (const sprite of placedSprites(layer, scene, view, clip)) {
                    result.push({y: sprite.worldY, draw: ctx => drawSprite(ctx, sprite, clip, view.scale, 1)});
                }
            }
        }
        return result;
    }

    function ready(state, view) {
        let complete = true;
        for (const scene of (Array.isArray(state?.scenes) ? state.scenes : []).slice(0, 100)) {
            if (!sceneClip(scene, view, view.viewportWidth, view.viewportHeight)) continue;
            for (const layer of (scene.layers || []).slice(0, 8)) {
                if (!layer?.placed || !validSource(layer.image) || !visibleLayer(layer, scene, view)) continue;
                imageFor(layer.image);
                const entry = images.get(layer.image);
                if (!entry.image && !entry.failed && now() - entry.requestedAt < 3000) complete = false;
            }
        }
        return complete;
    }

    function terrainCutouts(state, view) {
        const result = [];
        if (!state || !view) return result;
        for (const scene of (Array.isArray(state.scenes) ? state.scenes : []).slice(0, 100)) {
            if (!sceneClip(scene, view, view.viewportWidth, view.viewportHeight)) continue;
            const colors = (Array.isArray(scene.cutoutColors) ? scene.cutoutColors : []).slice(0, 8)
                .filter(color => Array.isArray(color) && color.length === 3 && color.every(value => Number.isInteger(value) && value >= 0 && value <= 255));
            const layers = (scene.layers || []).filter(layer => layer?.plane === 'background' && visibleLayer(layer, scene, view));
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
                // Do not show neighboring outdoor layers while the viewer is in an interior.
                if (!visibleLayer(layer, scene, view)) continue;
                ctx.save();
                // Overhead art is composed after world lighting. Dim it continuously
                // with ambient light, while luminous effects can opt into brighter nights.
                let layerBrightness = 1;
                if (plane === 'foreground' && Number.isFinite(view.lightIntensity)) {
                    const light = finite(view.lightIntensity, 1, 0, 1);
                    const opacity = finite(layer.nightOpacity, layer.placed ? 1 : .45, 0, 1);
                    const brightness = finite(layer.nightBrightness, layer.placed ? .35 : .55, 0, 1);
                    ctx.globalAlpha *= opacity + (1 - opacity) * light;
                    layerBrightness = brightness + (1 - brightness) * light;
                }
                drawLayer(ctx, layer, scene, view, clip, time, layerBrightness);
                ctx.restore();
            }
            ctx.restore();
        }
    }
    return {
        ready,
        entries,
        terrainCutouts,
        background: (ctx, state, view) => draw('background', ctx, state, view),
        ground: (ctx, state, view) => draw('ground', ctx, state, view),
        foreground: (ctx, state, view) => draw('foreground', ctx, state, view)
    };
});

// Authored source emission, kept separate from the world's multiply lightmap.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.EmissiveGlow = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    const maxRadius = 64, maxSources = 16, maxPixels = 16384, maxSprites = 32, maxBytes = 2 * 1024 * 1024;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function colorOf(value) {
        if (!value || !['r', 'g', 'b'].every(key => Number.isFinite(value[key]))) return null;
        return ['r', 'g', 'b'].map(key => Math.round(clamp(value[key], 0, 255)));
    }

    function styleOf(source) {
        if (!source || source.global || source.kind === 'shadow' || !Number.isFinite(source.x) || !Number.isFinite(source.y) ||
            !Number.isFinite(source.glowIntensity) || source.glowIntensity <= 0) return null;
        const spread = Number(source.spread);
        if (spread > 0 && spread < 360) return null;
        return {
            intensity: clamp(source.glowIntensity, 0, 1),
            radius: Math.round(clamp(Number.isFinite(source.glowRadius) ? source.glowRadius : 16, 1, maxRadius)),
            color: colorOf(source.glowColor) || colorOf(source.color) || [255, 255, 255],
            profile: source.animation === 'fire' ? 'fire' : 'steady',
            texture: source.glowTexture
        };
    }

    class Pass {
        constructor(createCanvas = (width, height) => new OffscreenCanvas(width, height), loadTexture = async name => {
            const response = await fetch('../img/lighting/' + encodeURIComponent(name) + '.png');
            if (!response.ok) throw new Error('Light texture unavailable: ' + name);
            return createImageBitmap(await response.blob());
        }) {
            this.createCanvas = createCanvas;
            this.loadTexture = loadTexture;
            this.textures = new Map();
            this.sprites = new Map();
            this.bytes = 0;
        }

        texture(name, onPending) {
            let entry = this.textures.get(name);
            if (entry) {
                this.textures.delete(name);
            } else {
                if (this.textures.size >= maxSources) {
                    const oldest = this.textures.keys().next().value;
                    this.textures.get(oldest).image?.close();
                    this.textures.delete(oldest);
                }
                entry = {};
                entry.pending = this.loadTexture(name).then(image => {
                    if (this.textures.get(name) !== entry || image.width !== image.height || image.width > maxRadius * 2) {
                        image.close();
                        return;
                    }
                    entry.image = image;
                }).catch(() => undefined).finally(() => {entry.pending = null;});
            }
            this.textures.set(name, entry);
            if (entry.pending) onPending?.(entry.pending);
            return entry.image;
        }

        sprite(style) {
            const {radius, color, profile} = style, size = radius * 2;
            const key = radius + ':' + color.join(',') + ':' + profile;
            let canvas = this.sprites.get(key);
            if (canvas) {
                this.sprites.delete(key); this.sprites.set(key, canvas);
                return canvas;
            }
            const bytes = size * size * 4;
            while (this.sprites.size && (this.sprites.size >= maxSprites || this.bytes + bytes > maxBytes)) {
                const oldest = this.sprites.keys().next().value, old = this.sprites.get(oldest);
                this.bytes -= old.width * old.height * 4;
                old.width = old.height = 0;
                this.sprites.delete(oldest);
            }
            canvas = this.createCanvas(size, size);
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
            // Flame and window art cover most of the bright center. A smooth shoulder
            // keeps the surrounding terrain visibly warm while preserving a soft edge.
            // Both profiles share the same bounded cached-sprite rendering path.
            const stops = profile === 'fire'
                ? [[0, 1], [.14, .9], [.3, .67], [.5, .34], [.75, .1], [1, 0]]
                : [[0, 1], [.12, .78], [.3, .44], [.54, .18], [.78, .045], [1, 0]];
            for (const [stop, alpha] of stops) {
                gradient.addColorStop(stop, 'rgba(' + color.join(',') + ',' + alpha + ')');
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            this.sprites.set(key, canvas); this.bytes += bytes;
            return canvas;
        }

        draw(ctx, sources, view) {
            const pixelScale = view.pixelScale ?? 1;
            if (!(pixelScale > 0) || !Number.isFinite(pixelScale)) return 0;
            const offsetX = Math.round(-view.cameraX), offsetY = Math.round(-view.cameraY);
            let drawn = 0, admitted = 0, pixels = 0;
            ctx.save();
            const opacity = ctx.globalAlpha ?? 1;
            ctx.globalCompositeOperation = 'screen';
            for (const source of sources) {
                const style = styleOf(source);
                if (!style) continue;
                const radius = style.radius * pixelScale, size = style.radius * 2;
                const x = Math.round(source.x - radius) + offsetX, y = Math.round(source.y - radius) + offsetY;
                const width = radius * 2;
                if (x + width <= 0 || y + width <= 0 || x >= view.width || y >= view.height) continue;
                if (admitted >= maxSources) break;
                // Bound filled area as well as source count. Keep authored order,
                // but leave room for a later small source when a large one cannot fit.
                if (pixels + size * size > maxPixels) continue;
                const exposure = style.texture ? clamp(((view.darkness ?? 1) - .08) / .74, 0, 1) : 1;
                if (exposure === 0) continue;
                admitted++;
                pixels += size * size;
                let output = style.texture ? this.texture(style.texture, view.onTexturePending) : this.sprite(style);
                if (!output) continue;
                let sourceSize = output.width;
                const region = {x, y, width, height: width, worldX: x - offsetX, worldY: y - offsetY};
                if (view.mask) {
                    if (!this.scratch) this.scratch = this.createCanvas(size, size);
                    if (this.scratch.width < size) this.scratch.width = size;
                    if (this.scratch.height < size) this.scratch.height = size;
                    const mask = this.scratch.getContext('2d');
                    mask.clearRect(0, 0, size, size);
                    mask.imageSmoothingEnabled = !style.texture;
                    mask.drawImage(output, 0, 0, size, size);
                    mask.save();
                    mask.scale(1 / pixelScale, 1 / pixelScale);
                    view.mask(mask, source, region);
                    mask.restore();
                    output = this.scratch;
                    sourceSize = size;
                }
                ctx.imageSmoothingEnabled = !style.texture;
                ctx.globalAlpha = opacity * style.intensity * exposure;
                ctx.drawImage(output, 0, 0, sourceSize, sourceSize, x, y, width, width);
                drawn++;
            }
            ctx.restore();
            return drawn;
        }
    }
    return {Pass};
});

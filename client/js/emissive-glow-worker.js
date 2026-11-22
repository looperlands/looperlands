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
            color: colorOf(source.glowColor) || colorOf(source.color) || [255, 255, 255]
        };
    }

    class Pass {
        constructor(createCanvas = (width, height) => new OffscreenCanvas(width, height)) {
            this.createCanvas = createCanvas;
            this.sprites = new Map();
            this.bytes = 0;
        }

        sprite(style) {
            const {radius, color} = style, size = radius * 2;
            const key = radius + ':' + color.join(',');
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
            // A bright compact core and a quiet tail keep a lamp readable without
            // flattening the surrounding pixel art into a large luminous disc.
            for (const [stop, alpha] of [[0, 1], [.12, .65], [.4, .16], [.7, .03], [1, 0]]) {
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
            let drawn = 0, pixels = 0;
            ctx.save();
            const opacity = ctx.globalAlpha ?? 1;
            ctx.globalCompositeOperation = 'screen';
            ctx.imageSmoothingEnabled = true;
            for (const source of sources) {
                const style = styleOf(source);
                if (!style) continue;
                const radius = style.radius * pixelScale, size = style.radius * 2;
                const x = Math.round(source.x - radius) + offsetX, y = Math.round(source.y - radius) + offsetY;
                const width = radius * 2;
                if (x + width <= 0 || y + width <= 0 || x >= view.width || y >= view.height) continue;
                if (drawn >= maxSources) break;
                // Bound filled area as well as source count. Keep authored order,
                // but leave room for a later small source when a large one cannot fit.
                if (pixels + size * size > maxPixels) continue;
                const region = {x, y, width, height: width, worldX: x - offsetX, worldY: y - offsetY};
                let output = this.sprite(style);
                if (view.mask) {
                    if (!this.scratch) this.scratch = this.createCanvas(size, size);
                    if (this.scratch.width < size) this.scratch.width = size;
                    if (this.scratch.height < size) this.scratch.height = size;
                    const mask = this.scratch.getContext('2d');
                    mask.clearRect(0, 0, size, size);
                    mask.drawImage(output, 0, 0);
                    mask.save();
                    mask.scale(1 / pixelScale, 1 / pixelScale);
                    view.mask(mask, source, region);
                    mask.restore();
                    output = this.scratch;
                }
                ctx.globalAlpha = opacity * style.intensity;
                ctx.drawImage(output, 0, 0, size, size, x, y, width, width);
                drawn++;
                pixels += size * size;
            }
            ctx.restore();
            return drawn;
        }
    }
    return {Pass};
});

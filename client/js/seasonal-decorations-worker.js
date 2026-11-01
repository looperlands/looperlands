// Decorative sprites use the existing entity-depth pass without changing map collision.
// The server scene owns when these decorations are present and where they belong.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else root.RendererExtensions.register('seasonal-decorations', factory());
})(typeof self !== 'undefined' ? self : null, function (options = {}) {
    const images = new Map();
    const loadImage = options.loadImage || (async source => {
        // Resolve against this worker to retain the client's pinned release URL.
        const response = await fetch('..' + source);
        if (!response.ok) throw new Error('Decoration image returned HTTP ' + response.status);
        return createImageBitmap(await response.blob());
    });
    const validSource = source => typeof source === 'string' && /^\/img\/1\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.png$/.test(source);
    const dimension = value => Number.isFinite(value) && value > 0 && value <= 256;

    function imageFor(source) {
        let cached = images.get(source);
        if (!cached) {
            cached = {image: null};
            images.set(source, cached);
            Promise.resolve().then(() => loadImage(source)).then(image => {
                if (images.get(source) === cached) cached.image = image;
                else image?.close?.();
            }).catch(error => options.onError?.(error));
            // Failed and pending loads remain cached too: neither retries every frame.
            while (images.size > 64) {
                const oldest = images.keys().next().value;
                images.get(oldest).image?.close?.();
                images.delete(oldest);
            }
        }
        return cached.image;
    }

    function entries(state, view) {
        if (!Array.isArray(state?.decorations) || !view || ![view.cameraX, view.cameraY, view.scale].every(Number.isFinite) || view.scale <= 0) return [];
        const result = [], sources = new Set();
        for (const decoration of state.decorations.slice(0, 512)) {
            if (!decoration || !validSource(decoration.image) || ![decoration.x, decoration.y].every(Number.isFinite)) continue;
            const width = decoration.width ?? 16, height = decoration.height ?? 16;
            const offsetX = decoration.offsetX ?? 0, offsetY = decoration.offsetY ?? 0;
            const frame = decoration.frame || {x: 0, y: 0, width, height};
            if (!dimension(width) || !dimension(height) || !dimension(frame.width) || !dimension(frame.height) ||
                ![offsetX, offsetY, frame.x, frame.y].every(Number.isFinite) || frame.x < 0 || frame.y < 0) continue;
            const x = decoration.x * 16 + offsetX, y = decoration.y * 16 + offsetY;
            const screenX = Math.round(x - view.cameraX), screenY = Math.round(y - view.cameraY);
            if (screenX + width <= 0 || screenY + height <= 0 || screenX >= view.viewportWidth || screenY >= view.viewportHeight) continue;
            if (!sources.has(decoration.image) && sources.size >= 64) continue;
            sources.add(decoration.image);
            const image = imageFor(decoration.image);
            if (!image) continue;
            result.push({y: (decoration.y + 1) * 16, draw(context) {
                context.imageSmoothingEnabled = false;
                context.drawImage(image, frame.x, frame.y, frame.width, frame.height,
                    screenX * view.scale, screenY * view.scale, width * view.scale, height * view.scale);
            }});
        }
        return result;
    }

    function tileAppearance(state) {
        return (Array.isArray(state?.tiles) ? state.tiles : []).slice(0, 512).filter(tile => {
            if (!tile || ![tile.x, tile.y].every(value => Number.isSafeInteger(value) && value >= 0) ||
                !Number.isSafeInteger(tile.from) || tile.from < 1) return false;
            if (tile.to != null && (!Number.isSafeInteger(tile.to) || tile.to < 1)) return false;
            if (tile.colorShift != null) {
                const {colorDifference, progress} = tile.colorShift;
                if (!colorDifference || !['r', 'g', 'b'].every(key => Number.isFinite(colorDifference[key]) && Math.abs(colorDifference[key]) <= 255) ||
                    !Number.isFinite(progress) || progress < 0 || progress > 1) return false;
            }
            return tile.to != null || tile.colorShift != null;
        });
    }

    return {layer: 'entities', entries, tileAppearance};
});

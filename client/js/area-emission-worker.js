// A bounded distance field derived from visible cutouts, not one light per tile.
// Input is a binary low-resolution mask of exposed emissive ground.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.AreaEmission = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    function build(mask, width, height, radius) {
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
            mask.length !== width * height) throw new Error('Invalid emission mask');
        radius = Math.max(1, Math.min(16, Math.round(radius)));
        const dist = new Float32Array(mask.length), far = 100000;
        for (let i = 0; i < dist.length; i++) dist[i] = mask[i] ? 0 : far;
        const diagonal = Math.SQRT2;
        // Two chamfer sweeps approximate Euclidean falloff in linear time.
        // No wrap: unrelated lava pockets must not illuminate across map edges.
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                if (x) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
                if (y) {
                    dist[i] = Math.min(dist[i], dist[i - width] + 1);
                    if (x) dist[i] = Math.min(dist[i], dist[i - width - 1] + diagonal);
                    if (x + 1 < width) dist[i] = Math.min(dist[i], dist[i - width + 1] + diagonal);
                }
            }
        }
        for (let y = height - 1; y >= 0; y--) {
            for (let x = width - 1; x >= 0; x--) {
                const i = y * width + x;
                if (x + 1 < width) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
                if (y + 1 < height) {
                    dist[i] = Math.min(dist[i], dist[i + width] + 1);
                    if (x) dist[i] = Math.min(dist[i], dist[i + width - 1] + diagonal);
                    if (x + 1 < width) dist[i] = Math.min(dist[i], dist[i + width + 1] + diagonal);
                }
            }
        }
        const pixels = new Uint8ClampedArray(mask.length * 4);
        for (let i = 0; i < dist.length; i++) {
            if (dist[i] >= radius) continue;
            const falloff = Math.pow(1 - dist[i] / radius, 2);
            const offset = i * 4;
            pixels[offset] = 255;
            pixels[offset + 1] = 154;
            pixels[offset + 2] = 62;
            pixels[offset + 3] = Math.round(190 * falloff);
        }
        return pixels;
    }
    return {build};
});

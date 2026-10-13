(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RendererExtensions.register('pickup', factory());
})(typeof self !== 'undefined' ? self : null, function () {
    return {layer: 'foreground', draw(context, particles, view) {
        for (const particle of particles) {
            context.globalAlpha = particle.alpha;
            const x = Math.round((particle.x - view.cameraX) * view.scale);
            const y = Math.round((particle.y - view.cameraY) * view.scale);
            const s = view.scale;
            context.fillStyle = '#5f3c24';
            if (particle.finish) {
                const r = particle.radius * s;
                context.fillRect(x - r - s, y - s, 3 * s, 3 * s);
                context.fillRect(x + r - s, y - s, 3 * s, 3 * s);
                context.fillRect(x - s, y - r - s, 3 * s, 3 * s);
                context.fillRect(x - s, y + r - s, 3 * s, 3 * s);
                context.fillStyle = '#fff2bf';
                context.fillRect(x - r, y, s, s);
                context.fillRect(x + r, y, s, s);
                context.fillRect(x, y - r, s, s);
                context.fillRect(x, y + r, s, s);
            } else {
                context.fillRect(x - s, y - s, 4 * s, 4 * s);
                context.fillStyle = '#fff2bf';
                context.fillRect(x, y, 2 * s, 2 * s);
            }
        }
    }};
});

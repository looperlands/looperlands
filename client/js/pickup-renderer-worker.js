(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RendererExtensions.register('pickup', factory());
})(typeof self !== 'undefined' ? self : null, function () {
    return {layer: 'foreground', draw(context, particles, view) {
        context.fillStyle = '#fff2bf';
        for (const particle of particles) {
            context.globalAlpha = particle.alpha;
            context.fillRect(Math.round((particle.x - view.cameraX) * view.scale),
                Math.round((particle.y - view.cameraY) * view.scale), view.scale, view.scale);
        }
    }};
});

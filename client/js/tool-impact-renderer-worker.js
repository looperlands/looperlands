(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RendererExtensions.register('tool-impact', factory());
})(typeof self !== 'undefined' ? self : null, function () {
    function draw(context, particles, view) {
        for (const particle of particles) {
            context.globalAlpha = particle.alpha;
            context.fillStyle = particle.color;
            context.fillRect(Math.round((particle.x - view.cameraX) * view.scale),
                Math.round((particle.y - view.cameraY) * view.scale),
                particle.size * view.scale, particle.size * view.scale);
        }
    }
    return {layer: 'foreground', draw};
});

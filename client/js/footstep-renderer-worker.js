(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RendererExtensions.register('footsteps', factory());
})(typeof self !== 'undefined' ? self : null, function () {
    return {layer: 'ground', draw(context, steps, view) {
        for (const step of steps) {
            const sand = step.surface === 'sand';
            context.globalAlpha = (1 - step.progress) * (sand ? 0.6 : 0.85);
            const x = Math.round((step.x - view.cameraX) * view.scale);
            const y = Math.round((step.y - view.cameraY - (sand ? 0 : step.progress * 3)) * view.scale);
            context.fillStyle = sand ? '#795e3b' : '#584d36';
            context.fillRect(x - 4 * view.scale, y, 3 * view.scale, 2 * view.scale);
            context.fillRect(x + 2 * view.scale, y + view.scale, 3 * view.scale, 2 * view.scale);
            if (!sand) {
                context.fillStyle = step.surface === 'grass' ? '#cad59a' : '#ead8af';
                context.fillRect(x - 4 * view.scale, y, 2 * view.scale, view.scale);
                context.fillRect(x + 2 * view.scale, y + view.scale, 2 * view.scale, view.scale);
            }
        }
    }};
});

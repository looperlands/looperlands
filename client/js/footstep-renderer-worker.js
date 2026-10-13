(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RendererExtensions.register('footsteps', factory());
})(typeof self !== 'undefined' ? self : null, function () {
    return {layer: 'ground', draw(context, steps, view) {
        for (const step of steps) {
            const sand = step.surface === 'sand';
            context.fillStyle = sand ? '#795e3b' : step.surface === 'grass' ? '#6f8550' : '#ab8760';
            context.globalAlpha = (1 - step.progress) * (sand ? 0.3 : 0.4);
            const x = Math.round((step.x - view.cameraX) * view.scale);
            const y = Math.round((step.y - view.cameraY - (sand ? 0 : step.progress * 2)) * view.scale);
            context.fillRect(x - 3 * view.scale, y, (sand ? 2 : 1) * view.scale, view.scale);
            context.fillRect(x + 2 * view.scale, y + view.scale, (sand ? 2 : 1) * view.scale, view.scale);
        }
    }};
});

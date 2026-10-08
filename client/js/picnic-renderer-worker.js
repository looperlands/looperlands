// Feature-owned scenery. The renderer only knows the generic ground extension hook.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RendererExtensions.register('picnic', factory());
})(typeof self !== 'undefined' ? self : null, function () {
function draw(context, picnic, view) {
    if (!picnic || !view || !['gathering', 'celebrating'].includes(picnic.phase)) return;
    const scale = view.scale;
    const x = (picnic.center.x * 16 - view.cameraX) * scale;
    const y = (picnic.center.y * 16 - view.cameraY) * scale;
    // A small checkered blanket, bread, cake and two lanterns. These are
    // feature scenery, anchored to the same world coordinates as NPCs.
    context.fillStyle = '#673c50';
    context.fillRect(x - 20 * scale, y - 8 * scale, 40 * scale, 24 * scale);
    for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 5; column++) {
            context.fillStyle = (row + column) % 2 ? '#c79c80' : '#935c67';
            context.fillRect(x + (column * 8 - 20) * scale, y + (row * 8 - 8) * scale, 7 * scale, 7 * scale);
        }
    }
    context.fillStyle = '#a36d3f';
    context.fillRect(x - 13 * scale, y - 2 * scale, 12 * scale, 6 * scale);
    context.fillStyle = '#ebc799';
    context.fillRect(x - 11 * scale, y - 2 * scale, 2 * scale, 5 * scale);
    context.fillRect(x - 6 * scale, y - 2 * scale, 2 * scale, 5 * scale);
    context.fillStyle = '#743f45';
    context.fillRect(x + 6 * scale, y - 1 * scale, 9 * scale, 7 * scale);
    context.fillStyle = '#f3d8b4';
    context.fillRect(x + 6 * scale, y - 2 * scale, 9 * scale, 3 * scale);
    context.fillStyle = '#c56153';
    context.fillRect(x + 9 * scale, y - 3 * scale, 3 * scale, 2 * scale);
    for (const offset of [-26, 26]) {
        const lanternX = x + offset * scale;
        const lanternY = y + 4 * scale;
        const radius = 18 * scale;
        const halo = context.createRadialGradient(lanternX, lanternY, 0, lanternX, lanternY, radius);
        halo.addColorStop(0, 'rgba(255,199,103,' + 0.45 + ')');
        halo.addColorStop(1, 'rgba(255,199,103,0)');
        context.fillStyle = halo;
        context.fillRect(lanternX - radius, lanternY - radius, radius * 2, radius * 2);
        context.fillStyle = '#654635';
        context.fillRect(lanternX - 3 * scale, lanternY - 5 * scale, 6 * scale, 10 * scale);
        context.fillStyle = '#ffd28a';
        context.fillRect(lanternX - 2 * scale, lanternY - 3 * scale, 4 * scale, 6 * scale);
    }
}

    return {layer: 'ground', draw};
});

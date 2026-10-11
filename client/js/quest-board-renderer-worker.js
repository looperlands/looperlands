// Quest JSON supplies placement; this extension only draws its supplied scenery.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else root.RendererExtensions.register('quest-board', factory(root));
})(typeof self !== 'undefined' ? self : null, function (root) {
    const images = new Map();
    function sprite(name) {
        if (!images.has(name)) {
            images.set(name, null);
            root.fetch('../img/common/' + name + '.png').then(response => {
                if (!response.ok) throw new Error('Quest scenery asset unavailable');
                return response.blob();
            }).then(blob => {
                const size = name === 'quest-board' ? 64 : 32;
                return root.createImageBitmap(blob, {resizeWidth: size, resizeHeight: size, resizeQuality: 'pixelated'});
            }).then(image => images.set(name, image)).catch(() => {});
        }
        return images.get(name);
    }
    return {
        layer: 'ground',
        draw(context, data, view) {
            if (!root || !view) return;
            const scale = view.scale || 1;
            context.imageSmoothingEnabled = false;
            const placements = [
                ...(data.boards || []).flatMap(board => [board.bounds, ...(board.placements || [])].map(bounds => ({...board, bounds, sprite: 'quest-board', size: 64}))),
                ...(data.handInLocations || []).filter(location => location.kind === 'object').map(location => ({...location, sprite: 'quest-dropoff', size: 32})),
            ];
            for (const placement of placements) {
                if (!placement.bounds || placement.enabled === false) continue;
                const bounds = placement.bounds, image = sprite(placement.sprite);
                if (!image) continue;
                const x = ((bounds.x + (bounds.width || 1) / 2) * 16 - placement.size / 2 - view.cameraX) * scale;
                const y = ((bounds.y + (bounds.height || 1)) * 16 - placement.size - view.cameraY) * scale;
                context.drawImage(image, Math.round(x), Math.round(y), placement.size * scale, placement.size * scale);
            }
            if (data.destination) {
                const bounds = data.destination;
                const x = ((bounds.x + (bounds.width || 1) / 2) * 16 - view.cameraX) * scale;
                const y = (bounds.y * 16 - 10 - view.cameraY) * scale;
                // A navigation marker is separate from the supplied object art.
                context.fillStyle = '#2c202f'; context.fillRect(x - 5 * scale, y - 5 * scale, 10 * scale, 10 * scale);
                context.fillStyle = '#ffe198'; context.font = (10 * scale) + 'px sans-serif'; context.textAlign = 'center'; context.fillText('!', x, y + 3 * scale);
                context.strokeStyle = '#eac779'; context.lineWidth = scale;
                context.strokeRect((bounds.x * 16 - view.cameraX) * scale, (bounds.y * 16 - view.cameraY) * scale, (bounds.width || 1) * 16 * scale, (bounds.height || 1) * 16 * scale);
            }
        },
    };
});

// Story-owned ground objects. No quest or scenery knowledge belongs to Renderer.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RendererExtensions.register('lantern-road', factory());
})(typeof self !== 'undefined' ? self : null, function () {
    function draw(context, objects, view) {
        for (const object of objects) {
            const s = view.scale;
            const x = (object.x * 16 - view.cameraX) * s;
            const y = (object.y * 16 - view.cameraY) * s;
            if (context.canvas && (x < -40 || y < -40 || x > context.canvas.width + 40 || y > context.canvas.height + 40)) continue;
            if (object.kind === 'marker' || object.kind === 'passage') {
                context.fillStyle = object.kind === 'passage' ? '#c2bdde' : '#ffd38b';
                context.fillRect(x + 4*s, y + 11*s, 8*s, 2*s);
                context.fillRect(x + 6*s, y + 9*s, 4*s, 6*s);
            } else if (object.kind === 'parcel') {
                context.fillStyle = '#946840';
                context.fillRect(x + 3*s, y + 9*s, 10*s, 6*s);
                context.fillStyle = '#efce88';
                context.fillRect(x + 7*s, y + 9*s, 2*s, 6*s);
            } else {
                context.fillStyle = object.kind === 'memorial' ? '#8c929d' : '#694b35';
                context.fillRect(x + 3*s, y + 3*s, 10*s, 12*s);
                context.fillStyle = '#ffcf79';
                context.fillRect(x + 5*s, y + 6*s, 6*s, 6*s);
                context.fillStyle = 'rgba(255,207,121,0.16)';
                context.fillRect(x - 2*s, y + 1*s, 20*s, 16*s);
            }
        }
    }
    return {layer: 'ground', draw};
});

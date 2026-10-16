(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else {
        const fx = factory();
        root.RendererExtensions.register('world-fx-ground', {layer: 'ground', draw: fx.ground});
        root.RendererExtensions.register('world-fx', {layer: 'foreground', draw: fx.draw});
    }
})(typeof self !== 'undefined' ? self : null, function () {
    function ground(ctx, state, view) {
        const source = view.sources?.background;
        if (!state.flags.heat || !source) return;
        const regions = state.scenery?.fires ?? (view.fireLights || [])
            .filter(light => light.animation === 'fire')
            .map(light => ({x: light.x - 8, y: light.y - 28, width: 32, height: 28}));
        let drawn = 0;
        for (const fire of regions) {
            const x = Math.round(fire.x - view.cameraX), y = Math.round(fire.y - view.cameraY);
            if (x + fire.width <= 0 || y + fire.height <= 0 || x >= ctx.canvas.width || y >= ctx.canvas.height) continue;
            if (++drawn > 32) break;
            for (let row = 0; row < fire.height; row += 2) {
                const shift = Math.round(Math.sin(state.time / 125 + row * 0.6) * 1.7 * (1 - row / fire.height));
                const height = Math.min(2, fire.height - row);
                ctx.drawImage(source, x, y + row, fire.width, height, x + shift, y + row, fire.width, height);
            }
        }
    }

    function draw(ctx, state, view) {
        const scale = view.scale;
        const xy = (x, y) => [Math.round((x - view.cameraX) * scale), Math.round((y - view.cameraY) * scale)];
        for (const p of state.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(...xy(p.x, p.y), p.size * scale, p.size * scale);
        }
        for (const warp of state.teleports) {
            const frame = warp.frame, sprite = view.sprites?.[frame.spriteName];
            if (!sprite?.image) continue;
            const progress = Math.min(1, Math.max(0, (state.time - warp.startedAt) / 650));
            for (const origin of [warp.from, warp.to]) {
                const phase = origin === warp.from ? progress : 1 - progress;
                ctx.globalAlpha = origin === warp.from ? 1 - progress : Math.min(1, progress * 2);
                for (const p of warp.fragments) {
                    ctx.drawImage(sprite.image, (frame.x + p.sx) * frame.scale, (frame.y + p.sy) * frame.scale,
                        p.width * frame.scale, p.height * frame.scale,
                        ...xy(origin.x + p.x + p.dx * phase, origin.y + p.y + p.dy * phase), p.width * scale, p.height * scale);
                }
            }
        }
        ctx.globalAlpha = 1;
    }
    return {ground, draw};
});

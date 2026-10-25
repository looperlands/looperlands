(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = () => factory(require('./worldparticles-worker'));
    else {
        if (!root.WorldParticles) importScripts('worldparticles-worker.js');
        const fx = factory(root.WorldParticles);
        root.RendererExtensions.register('world-fx-ground', {layer: 'ground', draw: fx.ground});
        root.RendererExtensions.register('world-fx', {layer: 'foreground', draw: fx.draw});
    }
})(typeof self !== 'undefined' ? self : null, function (Particles) {
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

    function levelUp(ctx, ring, time, xy, scale) {
        const age = Math.max(0, time - ring.startedAt);
        const [cx, cy] = xy(ring.coreX, ring.coreY);
        ctx.save();
        // A short white-gold ignition, followed by a rising column and two shockwaves.
        if (age < 480) {
            const fade = 1 - age / 480;
            ctx.globalAlpha = fade * 0.45;
            ctx.fillStyle = '#ffe078';
            ctx.fillRect(cx - 3 * scale, cy - (22 + age / 15) * scale, 6 * scale, (25 + age / 15) * scale);
            ctx.globalAlpha = fade;
            ctx.fillStyle = '#fff9df';
            const arm = (3 + Math.sin(Math.min(1, age / 160) * Math.PI / 2) * 9) * fade * scale;
            ctx.fillRect(cx - arm, cy - scale, arm * 2, 2 * scale);
            ctx.fillRect(cx - scale, cy - arm, 2 * scale, arm * 2);
            for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4;
                const inner = (5 + age / 24) * scale, outer = inner + 12 * fade * scale;
                ctx.strokeStyle = i % 2 ? '#9cefe6' : '#ffe078';
                ctx.lineWidth = scale;
                ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
                ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer); ctx.stroke();
            }
        }
        for (let wave = 0; wave < 2; wave++) {
            const progress = (age - wave * 180) / 850;
            if (progress < 0 || progress > 1) continue;
            const radius = (1 - Math.pow(1 - progress, 3)) * ring.radius;
            ctx.globalAlpha = Math.pow(1 - progress, 1.5) * 0.9;
            ctx.strokeStyle = wave ? '#9cefe6' : '#ffe078'; ctx.lineWidth = (wave ? 1 : 2) * scale;
            ctx.beginPath(); ctx.ellipse(...xy(ring.x, ring.y), Math.max(1, radius) * scale,
                Math.max(0.5, radius * 0.4) * scale, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }

    function draw(ctx, state, view) {
        const scale = view.scale;
        const xy = (x, y) => [Math.round((x - view.cameraX) * scale), Math.round((y - view.cameraY) * scale)];
        for (const p of state.particles || []) {
            ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
            const [px, py] = xy(p.x, p.y);
            if (p.design) {
                Particles.draw(ctx, {x: px, y: py, scale, seed: p.seed}, 'custom', p.elapsed, 1, p.design);
            } else if (p.shape === 'star') {
                ctx.fillRect(px - p.size * scale, py, (p.size * 2 + 1) * scale, scale);
                ctx.fillRect(px, py - p.size * scale, scale, (p.size * 2 + 1) * scale);
                ctx.fillStyle = '#fffdf0'; ctx.fillRect(px, py, scale, scale);
            } else {
                if (p.shape === 'spark') {
                    ctx.globalAlpha = p.alpha * 0.4; ctx.strokeStyle = p.color; ctx.lineWidth = scale;
                    ctx.beginPath(); ctx.moveTo(...xy(p.x - p.trailX, p.y - p.trailY)); ctx.lineTo(px, py); ctx.stroke();
                    ctx.globalAlpha = p.alpha;
                }
                ctx.fillRect(px, py, p.size * scale, p.size * scale);
            }
        }
        ctx.globalAlpha = 1;
        for (const ring of state.rings || []) levelUp(ctx, ring, state.time, xy, scale);
    }
    return {ground, draw};
});

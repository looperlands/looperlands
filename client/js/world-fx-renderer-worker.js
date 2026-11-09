(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = createCanvas => factory(require('./worldparticles-worker'), createCanvas);
    else {
        if (!root.WorldParticles) importScripts('worldparticles-worker.js');
        const fx = factory(root.WorldParticles);
        root.RendererExtensions.register('world-fx-ground', {layer: 'ground', draw: fx.ground});
        root.RendererExtensions.register('world-fx-lighting', {layer: 'lighting', draw: fx.lighting});
        root.RendererExtensions.register('world-fx', {layer: 'foreground', draw: fx.draw});
    }
})(typeof self !== 'undefined' ? self : null, function (Particles, createCanvas = (width, height) => new OffscreenCanvas(width, height)) {
    let lightCanvas;
    function heat(ctx, state, view) {
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

    function evolution(ctx, ring, time, xy, scale) {
        const age = Math.max(0, time - ring.startedAt), revealDelay = ring.revealDelayMs;
        const afterReveal = age - revealDelay, fade = Math.min(1, (ring.lifetimeMs - age) / 1400);
        if (fade <= 0) return;
        const charge = Math.min(1, age / revealDelay), [cx, cy] = xy(ring.coreX, ring.coreY);
        ctx.save();
        // The old form stays visible as a slow, warm aura gathers around it.
        if (afterReveal < 1200) {
            const radius = (13 + charge * 11) * scale;
            ctx.globalAlpha = afterReveal < 0 ? .18 + charge * .48 : (1 - afterReveal / 1200) * .66;
            ctx.strokeStyle = '#f1cd85'; ctx.lineWidth = scale;
            ctx.beginPath();
            ctx.moveTo(cx, cy - radius * 1.5); ctx.lineTo(cx + radius, cy);
            ctx.lineTo(cx, cy + radius * .8); ctx.lineTo(cx - radius, cy);
            ctx.lineTo(cx, cy - radius * 1.5); ctx.stroke();
            ctx.strokeStyle = '#b97b50';
            ctx.beginPath(); ctx.moveTo(cx, cy - radius * 1.5); ctx.lineTo(cx, cy + radius * .8); ctx.stroke();
        }
        for (let i = 0; i < 12; i++) {
            if (afterReveal < 0 && i > Math.floor(charge * 12)) continue;
            const angle = i / 12 * Math.PI * 2 + age / 1800;
            const radius = (afterReveal < 0 ? 30 - charge * 10 : 20 + Math.min(afterReveal, 3000) / 150) * scale;
            const x = cx + Math.cos(angle) * radius, y = cy + Math.sin(angle) * radius * .45 - Math.max(0, afterReveal) / 700 * scale;
            ctx.globalAlpha = fade * (.4 + charge * .6);
            ctx.fillStyle = i % 2 ? '#f1cd85' : '#fff2d4';
            const size = (i % 3 === 0 ? 2 : 1) * scale;
            ctx.fillRect(Math.round(x) - size, Math.round(y), size * 2 + scale, scale);
            ctx.fillRect(Math.round(x), Math.round(y) - size, scale, size * 2 + scale);
        }
        for (let wave = 0; wave < 3; wave++) {
            const progress = (afterReveal - wave * 600) / 2100;
            if (progress < 0 || progress > 1) continue;
            const radius = (1 - Math.pow(1 - progress, 3)) * ring.radius;
            ctx.globalAlpha = (1 - progress) * .8;
            ctx.strokeStyle = ['#fff2d4', '#f1cd85', '#b97b50'][wave];
            ctx.lineWidth = (wave ? 1 : 2) * scale;
            ctx.beginPath(); ctx.ellipse(...xy(ring.x, ring.y), Math.max(1, radius) * scale,
                Math.max(.5, radius * .42) * scale, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }

    function ground(ctx, state, view) {
        heat(ctx, state, view);
        drawParticles(ctx, (state.particles || []).filter(p => p.layer === 'ground'), view);
    }

    function lighting(ctx, state, view) {
        const particles = (state.particles || []).filter(p => p.layer === 'ground' && p.alpha > 0);
        if (!particles.length) return;
        const {width, height} = ctx.canvas;
        lightCanvas ||= createCanvas(width, height);
        if (lightCanvas.width !== width) lightCanvas.width = width;
        if (lightCanvas.height !== height) lightCanvas.height = height;
        const light = lightCanvas.getContext('2d');
        light.save();
        light.clearRect(0, 0, width, height);
        light.globalCompositeOperation = 'screen';
        for (const p of particles) {
            const x = Math.round(p.x - view.cameraX), y = Math.round(p.y - view.cameraY);
            if (x < -5 || y < -5 || x > width + 5 || y > height + 5) continue;
            light.fillStyle = p.color;
            light.globalAlpha = p.alpha * 0.08;
            light.fillRect(x - 4, y - 4, 9, 9);
            light.globalAlpha = p.alpha * 0.16;
            light.fillRect(x - 2, y - 2, 5, 5);
            light.fillStyle = '#ffffff';
            light.globalAlpha = Math.min(1, p.alpha * 2);
            if (p.shape === 'star') {
                light.fillRect(x - p.size, y, p.size * 2 + 1, 1);
                light.fillRect(x, y - p.size, 1, p.size * 2 + 1);
            } else light.fillRect(x, y, p.size, p.size);
        }
        // A covered spark must not punch a bright spot through a roof or canopy.
        light.globalAlpha = 1;
        light.globalCompositeOperation = 'destination-out';
        if (view.sources?.overhead) light.drawImage(view.sources.overhead, 0, 0, width, height);
        light.restore();
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(lightCanvas, 0, 0);
    }

    function drawParticles(ctx, particles, view) {
        const scale = view.scale;
        const xy = (x, y) => [Math.round((x - view.cameraX) * scale), Math.round((y - view.cameraY) * scale)];
        for (const p of particles) {
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
    }

    function draw(ctx, state, view) {
        drawParticles(ctx, (state.particles || []).filter(p => p.layer !== 'ground'), view);
        const scale = view.scale;
        const xy = (x, y) => [Math.round((x - view.cameraX) * scale), Math.round((y - view.cameraY) * scale)];
        for (const ring of state.rings || []) {
            if (ring.owner === 'evolution') evolution(ctx, ring, state.time, xy, scale);
            else levelUp(ctx, ring, state.time, xy, scale);
        }
    }
    return {ground, draw, lighting};
});

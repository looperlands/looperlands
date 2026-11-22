define(function () {
    // Guide points in tile-local pixels for the shared held-rod animation rig.
    // Snap to the individual rod's opaque artwork, including short and oversized rods.
    const tips = {
        idle_right: [[21, -1], [21, -2]], idle_up: [[17, -3]], idle_down: [[-8, 5], [-8, 6]],
        atk_right: [[24, -11], [28, -4], [29, 6], [28, 13], [27, 16]],
        atk_up: [[-11, -9], [-3, -16], [7, -19], [17, -17], [21, -11]],
        atk_down: [[28, 17], [12, 23], [5, 23], [-9, 19], [-16, 4]]
    };
    const rodTips = new WeakMap();
    let sampler;

    function artworkTip(rod, pose, index, guide) {
        const animation = rod?.animationData[pose];
        if (!animation) return guide;
        const frame = index % animation.length, key = pose + frame;
        let cache = rodTips.get(rod);
        if (cache?.has(key)) return cache.get(key);
        const image = rod.getImage();
        if (!image) return guide;
        if (!cache) { cache = new Map(); rodTips.set(rod, cache); }
        let tip = guide;
        const w = rod.width, h = rod.height, scale = rod.dynamicNFT ? 1 : rod.scale;
        if (!sampler) sampler = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
        sampler.canvas.width = w;
        sampler.canvas.height = h;
        sampler.imageSmoothingEnabled = false;
        sampler.drawImage(image, frame * w * scale, animation.row * h * scale, w * scale, h * scale, 0, 0, w, h);
        let pixels;
        try {
            pixels = sampler.getImageData(0, 0, w, h).data;
        } catch (_) {
            // Some browsers restrict canvas readback, even for visible sprite art.
            cache.set(key, guide);
            return guide;
        }
        // Aim beyond the template tip, so a longer rod pays out from its end too.
        const aimX = 2 * guide[0] - 8, aimY = 2 * guide[1] - 8;
        let nearest = Infinity;
        for (let i = 0; i < w * h; i++) {
            if (pixels[i * 4 + 3] < 160) continue; // Ignore translucent swing trails.
            const x = i % w + rod.offsetX + .5, y = Math.floor(i / w) + rod.offsetY + .5;
            const distance = (x - aimX) ** 2 + (y - aimY) ** 2;
            if (distance < nearest) { nearest = distance; tip = [x, y]; }
        }
        cache.set(key, tip);
        return tip;
    }

    function rodTip(caster, float, rod, size) {
        const dx = float.gridX - caster.gridX, dy = float.gridY - caster.gridY;
        const facing = dx ? 'right' : dy < 0 ? 'up' : 'down';
        const anim = caster.currentAnimation;
        const pose = anim?.name?.replace('_left', '_right') || 'idle_' + facing;
        const guides = tips[pose] || tips['idle_' + facing];
        const index = anim?.currentFrame.index || 0;
        const [x, y] = artworkTip(rod, pose, index, guides[index % guides.length]);
        return {x: caster.x + (caster.flipSpriteX ? size - x : x),
            y: caster.y + y + (caster.sprite?.groundOffsetY || 0)};
    }

    function ring(ctx, x, y, radius, alpha) {
        ctx.globalAlpha = alpha;
        ctx.lineWidth = .8;
        ctx.strokeStyle = '#275463';
        ctx.beginPath();
        ctx.ellipse(x, y + .6, radius, radius * .38, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#d8fff2';
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * .38, 0, .12, Math.PI * .94);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * .38, 0, Math.PI * 1.12, Math.PI * 1.92);
        ctx.stroke();
    }

    function water(ctx, x, y, float, now, quiet) {
        const bite = float.biteAt != null, age = now - float.landAt;
        if (quiet) {
            ring(ctx, x, y + 2, bite ? 6 : 3.5, bite ? .95 : .5);
        } else {
            const landing = age < 860 && !bite;
            const wave = landing ? age : (now - (float.reelAt ?? float.biteAt ?? float.landAt)) % (bite ? 820 : 2300);
            const duration = bite ? 540 : 680;
            for (const delay of [0, 165]) {
                const t = (wave - delay) / duration;
                if (t >= 0 && t < 1) ring(ctx, x, y + 2, 2 + t * (landing ? 10 : bite ? 8 : 5), (1 - t) * (landing || bite ? .9 : .56));
            }
            if (landing && age < 260) {
                const t = age / 260;
                ctx.globalAlpha = 1 - t;
                ctx.fillStyle = '#dcfff6';
                for (const dx of [-5, -2, 3, 6]) {
                    ctx.fillRect(Math.round(x + dx * t), Math.round(y + 1 - Math.abs(dx) * 4 * t * (1 - t)), 1, 1);
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    function line(ctx, tip, x, y, slack) {
        const midX = (tip.x + x) / 2 + slack * .38, midY = (tip.y + y) / 2 + slack;
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.quadraticCurveTo(midX, midY, x, y);
        ctx.strokeStyle = 'rgba(25, 53, 62, .82)';
        ctx.lineWidth = 1.65;
        ctx.stroke();
        ctx.strokeStyle = '#e1f4df';
        ctx.lineWidth = .78;
        ctx.stroke();
    }

    function bobber(ctx, sprite, x, y, age, size) {
        const image = sprite?.getImage();
        if (image) {
            const anim = sprite.animationData.idle, scale = sprite.dynamicNFT ? 1 : sprite.scale;
            const w = sprite.width, h = sprite.height;
            const frames = Math.max(1, Math.min(anim.length, Math.floor(image.width / (w * scale))));
            const frame = Math.floor(age / 240) % frames;
            ctx.drawImage(image, frame * w * scale, anim.row * h * scale, w * scale, h * scale,
                Math.round(x - size / 2) + sprite.offsetX, Math.round(y - size / 2) + sprite.offsetY, w, h);
            return;
        }
        // Keep the tackle readable while custom artwork streams in.
        x = Math.round(x); y = Math.round(y);
        ctx.fillStyle = '#263e47'; ctx.fillRect(x - 2, y - 2, 4, 5);
        ctx.fillStyle = '#ff7554'; ctx.fillRect(x - 1, y - 3, 2, 3);
        ctx.fillStyle = '#fff1cb'; ctx.fillRect(x - 1, y, 2, 2);
    }

    function draw(ctx, float, caster, rod, sprite, size, now, quiet) {
        const waterX = (float.gridX + .5) * size, waterY = (float.gridY + .5) * size;
        const tip = caster && rodTip(caster, float, rod, size);
        const age = Math.max(0, (float.reelAt ?? now) - float.landAt);
        const bite = float.biteAt != null;
        let x = waterX, y = waterY, slack = bite ? .4 : 4;
        if (tip && now < float.landAt) {
            if (!float.launchTip || now < float.releaseAt) float.launchTip = tip;
            const from = float.launchTip;
            const t = Math.max(0, (now - float.releaseAt) / (float.landAt - float.releaseAt));
            const arc = 4 * t * (1 - t);
            const height = quiet ? 0 : 10 + Math.hypot(waterX - from.x, waterY - from.y) * .2;
            x = from.x + (waterX - from.x) * t;
            y = from.y + 2 + (waterY - from.y - 2) * t - height * arc;
            slack = quiet ? 1 : 2 + 6 * arc;
        } else {
            if (now >= float.landAt) water(ctx, waterX, waterY, float, now, quiet);
            if (bite) {
                const biteAge = (float.reelAt ?? now) - float.biteAt;
                const tug = quiet ? 1 : Math.max(0, Math.cos(biteAge * Math.PI * 2 / 820)) ** 2;
                y += 1 + 3 * tug;
                if (!quiet) x += 1.4 * Math.sin(biteAge / 95) * tug;
            } else if (!quiet) {
                y += .9 * Math.sin(age / 350);
            }
            if (tip && float.reelAt != null) {
                const t = Math.min(1, (now - float.reelAt) / float.reelDuration);
                x += (tip.x - x) * t;
                y += (tip.y - y) * t - (quiet ? 0 : 6 * 4 * t * (1 - t));
                slack = .5;
                ctx.globalAlpha = Math.min(1, (1 - t) * 4);
            }
        }
        if (tip) line(ctx, tip, x, y, slack);
        if (bite && float.reelAt == null) {
            // The float's belly disappears below a fixed waterline as the fish pulls.
            ctx.beginPath();
            ctx.rect(x - size, y - size, size * 2, waterY + 4 - (y - size));
            ctx.clip();
        }
        bobber(ctx, sprite, x, y, quiet ? 0 : age, size);
    }

    return {draw};
});

// Deterministic particles in map pixels. Shared patches remain continuous when
// a particle crosses their edge; the camera never resets their animation.
(function (root, factory) {
    if (typeof define === 'function' && define.amd) define([], factory);
    else if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.WorldParticles = factory();
}(typeof self !== 'undefined' ? self : globalThis, function () {
    const wrap = (value, size) => ((value % size) + size) % size;
    const speeds = {leaves: [5, 7], pollen: [3, -1], dust: [11, 2], gusts: [15, 2],
        spray: [7, -3], sand: [9, 1], embers: [2, -6], ash: [4, 3], mist: [2, 0]};

    function positions(type, count, elapsed, view, width, height) {
        const {x: cameraX = 0, y: cameraY = 0, scale = 1} = view || {};
        const points = [];
        const drift = speeds[type] || [0, 0];
        const margin = type === 'mist' ? 48 : 16;
        for (let patchY = Math.floor((cameraY - margin) / 224); patchY <= Math.floor((cameraY + height / scale + margin) / 224); patchY++) {
            for (let patchX = Math.floor((cameraX - margin) / 480); patchX <= Math.floor((cameraX + width / scale + margin) / 480); patchX++) {
                for (let index = 0; index < count; index++) {
                    const seed = index * 1.618 + 0.5 + (type === 'fireflies' ? 0 : type.length * 0.73);
                    const worldX = patchX * 480 + wrap(seed * 137 + elapsed * drift[0] + Math.sin(elapsed * 0.25 + seed) * 7, 480);
                    const worldY = patchY * 224 + wrap(seed * 83 + elapsed * drift[1] + Math.cos(elapsed * 0.3 + seed) * 6, 224);
                    const x = (worldX - cameraX) * scale, y = (worldY - cameraY) * scale;
                    if (x >= -margin * scale && y >= -margin * scale && x <= width + margin * scale && y <= height + margin * scale) {
                        points.push({index, seed, x, y, scale});
                    }
                }
            }
        }
        return points;
    }

    function halo(context, x, y, radius, color, opacity) {
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(' + color + ',' + opacity + ')');
        gradient.addColorStop(1, 'rgba(' + color + ',0)');
        context.fillStyle = gradient;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    function draw(context, point, type, elapsed, daylight) {
        const {x, y, scale, seed} = point;
        const visibility = 0.35 + daylight * 0.65;
        const flutter = 0.65 + Math.sin(elapsed * 1.1 + seed) * 0.15;
        switch (type) {
            case 'fireflies': {
                const glow = (1 - daylight) * flutter;
                if (glow <= 0) return;
                context.globalCompositeOperation = 'lighter';
                halo(context, x, y, 8 * scale, '236,255,148', glow * 0.45);
                context.fillStyle = 'rgba(255,255,208,' + glow + ')';
                context.fillRect(x, y, 2 * scale, 2 * scale);
                context.globalCompositeOperation = 'source-over';
                break;
            }
            case 'leaves':
                context.save();
                context.translate(x, y);
                context.rotate(Math.sin(elapsed * 0.9 + seed) * 0.8 + seed);
                context.fillStyle = 'rgba(171,158,72,' + visibility * 0.5 + ')';
                context.fillRect(-2 * scale, -scale / 2, 4 * scale, scale);
                context.fillRect(-scale, -scale, 2 * scale, 2 * scale);
                context.restore();
                break;
            case 'dust':
                halo(context, x, y, 10 * scale, '205,169,111', visibility * flutter * 0.13);
                context.fillStyle = 'rgba(223,192,135,' + visibility * 0.27 + ')';
                context.fillRect(x, y, scale, scale);
                break;
            case 'gusts':
                context.save();
                context.translate(x, y);
                context.rotate(0.15);
                context.fillStyle = 'rgba(225,199,155,' + visibility * flutter * 0.14 + ')';
                context.fillRect(-8 * scale, 0, 16 * scale, scale / 2);
                context.restore();
                break;
            case 'spray':
                halo(context, x, y, 5 * scale, '184,226,236', visibility * flutter * 0.1);
                context.fillStyle = 'rgba(207,239,246,' + visibility * flutter * 0.4 + ')';
                context.fillRect(x, y, 2 * scale, scale);
                break;
            case 'embers': {
                const glow = flutter * (0.25 + (1 - daylight) * 0.45);
                context.globalCompositeOperation = 'lighter';
                halo(context, x, y, 6 * scale, '255,132,57', glow * 0.25);
                context.fillStyle = 'rgba(255,186,91,' + glow + ')';
                context.fillRect(x, y, scale, 2 * scale);
                context.globalCompositeOperation = 'source-over';
                break;
            }
            case 'mist':
                halo(context, x, y, 48 * scale, '167,192,187', visibility * flutter * 0.07);
                break;
            case 'pollen':
            case 'sand':
            case 'ash': {
                const color = {pollen: '222,218,169', sand: '235,211,160', ash: '183,172,159'}[type];
                context.fillStyle = 'rgba(' + color + ',' + visibility * flutter * 0.35 + ')';
                context.fillRect(x, y, scale, scale);
                break;
            }
        }
    }
    return {positions, draw};
}));

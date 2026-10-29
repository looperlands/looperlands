// Deterministic weather driven by the shared world clock; used in game and Toolkit.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(() => require('./parallax-renderer-worker')());
    else root.SceneWeather = factory(() => {
        if (!root.createSceneParallax && typeof importScripts === 'function') importScripts('parallax-renderer-worker.js');
        return root.createSceneParallax();
    });
})(typeof self !== 'undefined' ? self : null, function (createParallax) {
    let clouds;
    const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
    const clamp = value => Math.max(0, Math.min(1, value));
    const smooth = value => {value = clamp(value); return value * value * (3 - 2 * value);};
    function sample(config, milliseconds, daylight = 1) {
        const result = {rain: 0, sunrays: 0, cloudy: 0, wind: config?.wind || 0, darkness: 0};
        if (!config) return result;
        let phases = [{type: config.type, intensity: config.intensity, weight: 1}];
        if (config.mode === 'cycle' && config.sequence?.length) {
            const sequence = config.sequence, total = sequence.reduce((sum, phase) => sum + phase.duration, 0);
            let seconds = mod(milliseconds / 1000, total), index = 0;
            while (index < sequence.length - 1 && seconds >= sequence[index].duration) seconds -= sequence[index++].duration;
            const blend = smooth(seconds / config.transition);
            phases = [{...sequence[mod(index - 1, sequence.length)], weight: 1 - blend}, {...sequence[index], weight: blend}];
        }
        for (const phase of phases) if (phase.type === 'rain' || phase.type === 'sunrays' || phase.type === 'cloudy') result[phase.type] += clamp(phase.intensity) * phase.weight;
        result.sunrays *= clamp(daylight);
        result.darkness = result.rain * .13 + result.cloudy * .08;
        const night = Number.isFinite(config.nightOpacity) ? clamp(config.nightOpacity) : .45;
        result.opacity = night + (1 - night) * clamp(daylight);
        return result;
    }
    function hash(x, y, seed) {
        let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177);
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }
    function draw(ctx, weather, view, milliseconds) {
        if (!weather || !view || view.enabled === false) return;
        const scale = view.scale || 1, width = ctx.canvas.width / scale, height = ctx.canvas.height / scale;
        const time = view.reducedMotion ? 0 : milliseconds / 1000;
        ctx.save();
        ctx.globalAlpha *= weather.opacity ?? 1;
        if (view.bounds) {
            const b = view.bounds;
            ctx.beginPath(); ctx.rect((b.x - view.cameraX) * scale, (b.y - view.cameraY) * scale, b.w * scale, b.h * scale); ctx.clip();
        }
        if (weather.cloudy > .001) {
            clouds ||= createParallax();
            // Use a shared world origin so crossing outdoor scene boundaries cannot
            // reposition the cloud field. The enclosing weather pass clips the scene.
            const wind = weather.wind || 0;
            const layers = [
                {width:512,height:384,factorX:.82,factorY:.88,opacity:.12,driftX:.55,driftY:.12},
                {width:384,height:320,factorX:1.28,factorY:1.2,opacity:.38,driftX:1.1,driftY:.22,offsetX:96,offsetY:64}
            ].map(layer=>({...layer,image:'/img/parallax/clouds.png',plane:'foreground',nightOpacity:1,
                opacity:layer.opacity*weather.cloudy,driftX:layer.driftX+wind*2}));
            clouds.foreground(ctx,{scenes:[{x:0,y:0,w:65536,h:65536,layers}]},view);
        }
        // Long, soft shafts have a stable world origin and a very slow sway.
        if (weather.sunrays > .001) {
            const spacing = 108, slope = .35 + weather.wind * .2;
            const drift = Math.sin(time * .09) * 9;
            const anchorX = view.cameraX - view.cameraY * slope;
            const start = Math.floor((anchorX - height * Math.abs(slope) - 120) / spacing);
            const count = Math.min(32, Math.ceil((width + height * Math.abs(slope) + 240) / spacing));
            ctx.globalCompositeOperation = 'screen';
            for (let i = start; i < start + count; i++) {
                const x = i * spacing - anchorX + drift + hash(i, 0, 8) * 50;
                const beam = 13 + hash(i, 1, 8) * 24;
                const offset = 0;
                const gradient = ctx.createLinearGradient(0, 0, 0, height * scale);
                const alpha = weather.sunrays * (.08 + hash(i, 2, 8) * .09);
                gradient.addColorStop(0, 'rgba(255,238,170,' + alpha + ')');
                gradient.addColorStop(.55, 'rgba(255,230,153,' + alpha * .5 + ')');
                gradient.addColorStop(1, 'rgba(255,230,153,0)');
                ctx.fillStyle = gradient;
                ctx.beginPath(); ctx.moveTo((x + offset) * scale, 0); ctx.lineTo((x + offset + beam) * scale, 0);
                ctx.lineTo((x + offset + beam * 1.7 + height * slope) * scale, height * scale);
                ctx.lineTo((x + offset + height * slope) * scale, height * scale); ctx.closePath(); ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        }
        // Rain is a bounded world-space field: no allocations or accumulating particles.
        if (weather.rain > .001 && !view.reducedMotion) {
            const cell = 64, velocityY = 150, velocityX = weather.wind * 65;
            const shiftX = time * velocityX, shiftY = time * velocityY;
            const startX = Math.floor((view.cameraX - shiftX - 16) / cell), startY = Math.floor((view.cameraY - shiftY - 16) / cell);
            const columns = Math.ceil((width + 32) / cell), rows = Math.ceil((height + 32) / cell);
            ctx.strokeStyle = 'rgba(183,211,232,' + (.16 + weather.rain * .28) + ')'; ctx.lineWidth = Math.max(1, scale * .5);
            ctx.beginPath(); let drawn = 0;
            for (let row = startY; row <= startY + rows; row++) for (let col = startX; col <= startX + columns; col++) {
                for (let n = 0; n < 6; n++) {
                    if (hash(col, row, n + 1) > weather.rain || drawn++ >= 600) continue;
                    const x = col * cell + hash(col, row, n + 17) * cell + shiftX - view.cameraX;
                    const y = row * cell + hash(col, row, n + 37) * cell + shiftY - view.cameraY;
                    const length = 5 + hash(col, row, n + 57) * 7;
                    ctx.moveTo(x * scale, y * scale); ctx.lineTo((x + length * velocityX / velocityY) * scale, (y + length) * scale);
                }
            }
            ctx.stroke();
        }
        ctx.restore();
    }
    return {sample, draw};
});

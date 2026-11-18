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
    const mix = (a, b, t) => a + (b - a) * t;
    function noise(x, y, seed) {
        const col = Math.floor(x), row = Math.floor(y);
        const u = smooth(x - col), v = smooth(y - row);
        return mix(mix(hash(col, row, seed), hash(col + 1, row, seed), u),
            mix(hash(col, row + 1, seed), hash(col + 1, row + 1, seed), u), v);
    }
    function cloudBank(x, y) {
        const large = noise(x / 125, y / 95, 51);
        const lobes = noise(x / 55, y / 46, 19);
        const edge = noise(x / 27, y / 31, 32);
        return smooth((.59 * large + .32 * lobes + .09 * edge - .34) / .32);
    }
    const cloudStep = 12;
    let cloudField;
    function prepareCloudLight(viewport, weather, daylight, milliseconds, reducedMotion) {
        const density = clamp((weather?.cloudy || 0) + (weather?.rain || 0) * .85);
        const strength = Math.round(255 * clamp(daylight) * density);
        if (!strength || !viewport.width || !viewport.height) return null;
        const seconds = reducedMotion ? 0 : milliseconds / 1000;
        const driftX = seconds * (6 + 9 * (weather.wind || 0)), driftY = seconds * 1.8;
        // The samples travel with the clouds. Between cell crossings the exact
        // same small bitmap slides; cameras sampling a shared world point agree.
        const col = Math.floor((viewport.x - driftX) / cloudStep) - 1;
        const row = Math.floor((viewport.y - driftY) / cloudStep) - 1;
        const width = Math.ceil(viewport.width / cloudStep) + 4;
        const height = Math.ceil(viewport.height / cloudStep) + 4;
        let field = cloudField;
        if (!field || width !== field.width || height !== field.height) {
            field = cloudField = {width, height, step: cloudStep, bank: new Uint8Array(width * height),
                values: new Uint8Array(width * height)};
        }
        field.x = col * cloudStep + driftX; field.y = row * cloudStep + driftY;
        field.daylight = clamp(daylight);
        const moved = field.col !== col || field.row !== row;
        if (moved) {
            for (let y = 0, i = 0; y < height; y++) for (let x = 0; x < width; x++, i++) {
                field.bank[i] = Math.round(255 * cloudBank((col + x) * cloudStep, (row + y) * cloudStep));
            }
            field.col = col; field.row = row;
        }
        if (moved || strength !== field.strength) {
            for (let i = 0; i < field.values.length; i++) field.values[i] = Math.round(field.bank[i] * strength / 255);
            field.strength = strength;
            field.paintDirty = true;
        }
        return field;
    }
    function cloudCoverAt(field, worldX, worldY) {
        if (!field) return 0;
        const {x, y, width, height, step, values} = field;
        const u = Math.max(0, Math.min(width - 1, (worldX - x) / step));
        const v = Math.max(0, Math.min(height - 1, (worldY - y) / step));
        const col = Math.floor(u), row = Math.floor(v), next = Math.min(col + 1, width - 1);
        const i = row * width, j = Math.min(row + 1, height - 1) * width;
        return mix(mix(values[i + col], values[i + next], u - col),
            mix(values[j + col], values[j + next], u - col), v - row) / 255;
    }
    function drawCloudLight(ctx, field, cameraX, cameraY, operation = 'source-over') {
        if (!field) return;
        if (!field.canvas) {
            field.canvas = new OffscreenCanvas(field.width, field.height);
            field.context = field.canvas.getContext('2d');
            field.pixels = field.context.createImageData(field.width, field.height);
        }
        if (field.paintDirty) {
            const pixels = field.pixels.data;
            for (let i = 0, p = 0; i < field.bank.length; i++, p += 4) {
                const bank = field.bank[i] / 255;
                const shade = .48 * smooth((bank - .14) / .82);
                const sun = .22 * (1 - smooth((bank - .02) / .57));
                const alpha = shade + sun, warm = sun / alpha;
                pixels[p] = mix(18, 255, warm);
                pixels[p + 1] = mix(31, 216, warm);
                pixels[p + 2] = mix(55, 143, warm);
                pixels[p + 3] = alpha * field.strength;
            }
            field.context.putImageData(field.pixels, 0, 0); field.paintDirty = false;
        }
        ctx.save();
        ctx.globalCompositeOperation = operation;
        ctx.imageSmoothingEnabled = true;
        // The weather grid's nodes coincide with texel centers.
        ctx.drawImage(field.canvas, field.x - cameraX - field.step / 2, field.y - cameraY - field.step / 2,
            field.width * field.step, field.height * field.step);
        ctx.restore();
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
        // As direct daylight takes over, the shadow of the bank replaces the
        // old foreground haze. Fade through dawn rather than popping it off.
        const haze = weather.cloudLight ? 1 - smooth(weather.cloudLight.daylight / .4) : 1;
        if (weather.cloudy * haze > .001) {
            clouds ||= createParallax();
            // Use a shared world origin so crossing outdoor scene boundaries cannot
            // reposition the cloud field. The enclosing weather pass clips the scene.
            const wind = weather.wind || 0;
            const layers = [
                {width:512,height:384,factorX:.82,factorY:.88,opacity:.12,driftX:.55,driftY:.12},
                {width:384,height:320,factorX:1.28,factorY:1.2,opacity:.38,driftX:1.1,driftY:.22,offsetX:96,offsetY:64}
            ].map(layer=>({...layer,image:'/img/parallax/clouds.png',plane:'foreground',nightOpacity:1,
                opacity:layer.opacity*weather.cloudy*haze,driftX:layer.driftX+wind*2}));
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
    return {sample, draw, prepareCloudLight, cloudCoverAt, drawCloudLight};
});

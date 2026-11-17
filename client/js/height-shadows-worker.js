// Native-pixel height fields for the main map's outdoor lighting.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HeightShadows = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    const tileSize = 16;
    const atlasColumns = 20;
    const maxHeight = 160;
    const margin = 208;
    const cacheStep = 48;
    // Five intervals along the ray. Neighbouring world pixels sample different
    // points in each interval, so a thin caster does not repeat in five bands.
    const rayStops = [1, 6, 16, 34, 59, 100];
    const rayFractions = [.125, .625, .875, .375];
    const sampleWeights = [1, .95, .88, .8, .72];

    // Each atlas region describes one body, even when the map places its tiles on different layers.
    // GIDs are one-based. Base, front height and physical depth are native pixels; slope is rise/run.
    function region(first, columns, rows, base, front, slope, depth, stone = false) {
        return {first, columns, rows, base, front, slope, depth, stone};
    }
    const profiles = [
        region(44, 8, 8, 121, 62, .43, 18),       // slate-roof timber house
        region(204, 7, 9, 144, 65, .54, 20),      // red gable
        region(1452, 8, 10, 155, 70, .48, 20),   // blue gable
        region(2453, 8, 10, 150, 66, .44, 20),   // blacksmith
        region(2501, 5, 8, 122, 50, .52, 16),    // potion shop
        region(213, 4, 5, 79, 26, .68, 12),      // oak
        region(658, 3, 3, 47, 22, .76, 6),       // bare tree
        region(814, 3, 4, 60, 26, .74, 7),       // dead tree
        region(1698, 3, 4, 61, 24, .75, 7),      // graveyard tree
        region(18, 3, 4, 52, 15, .38, 8),        // boulder
        region(758, 3, 3, 47, 15, .4, 7),        // mirrored boulder
        region(257, 2, 2, 29, 7, .38, 4, true),  // grass-backed stones
        region(259, 2, 2, 29, 7, .38, 4, true),
        region(98, 1, 1, 15, 4, .4, 2),          // loose stone
        region(141, 2, 3, 47, 14, .46, 7),       // canvas tent
        region(281, 3, 4, 62, 25, .55, 8),       // covered well
        region(381, 3, 5, 71, 36, .5, 8),        // timber hut
        region(332, 2, 3, 46, 19, .7, 4),        // cactus
        region(3601, 4, 4, 59, 32, .65, 4),      // event board and feet
        region(81, 1, 1, 15, 10, .55, 2),        // headstones
        region(101, 1, 1, 15, 8, .55, 2),
        region(717, 3, 1, 15, 8, .6, 2),         // fence
        region(5, 1, 1, 15, 8, .65, 2),          // palisade stakes
        region(25, 1, 1, 15, 9, .65, 2)
    ];
    const tiles = new Map();
    for (const body of profiles) {
        for (let y = 0; y < body.rows; y++) {
            for (let x = 0; x < body.columns; x++) {
                tiles.set(body.first + x + y * atlasColumns, {...body, base: body.base - y * tileSize});
            }
        }
    }

    function skyLight(time, cycle, daylight) {
        const hour = ((time % 3600000 + 3600000) % 3600000) / 150000;
        // The legacy main clock rises at minute 55 and sets at minute 45 of the next hour.
        const rise = cycle?.dawn ?? 22;
        const set = cycle ? cycle.dusk + cycle.duskDuration : 18;
        const dayHours = (set - rise + 24) % 24 || 24;
        const sinceRise = (hour - rise + 24) % 24;
        const sun = sinceRise < dayHours;
        // The legacy map has a short night and is bright long before noon on the HUD.
        // Keep its published dawn/dusk while putting the highest sun at clock noon.
        const toNoon = cycle ? dayHours / 2 : (12 - rise + 24) % 24;
        let phase;
        if (!sun) phase = (sinceRise - dayHours) / (24 - dayHours);
        else if (sinceRise < toNoon) phase = .5 * sinceRise / toNoon;
        else phase = .5 + .5 * (sinceRise - toNoon) / (dayHours - toNoon);
        const angle = phase * Math.PI, elevation = Math.sin(angle);
        const reach = .4 + 1.65 * (1 - elevation);
        const strength = sun ? .39 * daylight : .19 * (1 - daylight) * Math.min(1, elevation * 5);
        return {x: Math.cos(angle) * reach, y: -(.24 + .3 * elevation) * reach, strength};
    }

    function bodyHeight(rise, front, slope) {
        return Math.min(maxHeight, Math.max(0, Math.round(Math.min(rise, front) + Math.max(0, rise - front) * slope)));
    }

    // Screen y + height is the ground coordinate beneath that pixel. Extrude behind
    // the front face to give a thin sign, a tree crown and a deep roof different footprints.
    function makeStamp(rgba, width, height, body) {
        const face = new Uint8Array(width * height);
        const groundTop = bodyHeight(body.base, body.front, body.slope) - body.depth;
        const groundBottom = height + bodyHeight(body.base - height + 1, body.front, body.slope);
        const ground = new Uint8Array(width * (groundBottom - groundTop + 1));
        for (let y = 0; y < height; y++) {
            const z = bodyHeight(body.base - y, body.front, body.slope);
            if (!z) continue;
            for (let x = 0; x < width; x++) {
                const pixel = y * width + x, color = pixel * 4;
                if (rgba[color + 3] < 176) continue; // Ignore the translucent baked drop shadow.
                if (body.stone && rgba[color + 1] > rgba[color] + 15) continue;
                face[pixel] = z;
                const end = (y + z - groundTop) * width + x;
                for (let i = end - body.depth * width; i <= end; i += width) {
                    if (ground[i] < z) ground[i] = z;
                }
            }
        }
        return {width, face, ground, groundTop};
    }

    function blit(target, stride, rows, pixels, width, x, y, flip) {
        const left = Math.max(0, -x), right = Math.min(width, stride - x);
        const top = Math.max(0, -y), bottom = Math.min(pixels.length / width, rows - y);
        for (let row = top; row < bottom; row++) {
            const dest = (y + row) * stride + x, src = row * width;
            for (let col = left; col < right; col++) {
                const value = pixels[src + (flip ? width - 1 - col : col)];
                if (value > target[dest + col]) target[dest + col] = value;
            }
        }
    }

    function place(field, stamp, worldX, worldY, flip = false, casts = true) {
        const x = Math.round(worldX) - field.x, y = Math.round(worldY) - field.y;
        blit(field.face, field.width, field.height, stamp.face, stamp.width, x, y, flip);
        if (casts) blit(field.ground, field.width, field.height, stamp.ground, stamp.width, x, y + stamp.groundTop, flip);
    }

    function shade(field, left, top, mask, light, samples) {
        const {ground, face, width} = field;
        const rays = rayFractions.map(fraction => sampleWeights.map((weight, i) => {
            const z = Math.round(rayStops[i] + fraction * (rayStops[i + 1] - rayStops[i]));
            const offset = Math.round(z * light.x) + Math.round(z * light.y) * width;
            return {z, offset, weight};
        }));
        const stride = mask.width + 1, strength = 255 * light.strength;
        // Sample one extra row and column. The same world pixel resolves identically
        // at a camera edge and in the middle of the viewport.
        for (let y = 0, i = 0; y <= mask.height; y++) {
            let sample = (top - field.y + y) * width + left - field.x;
            const row = ((top + y) & 1) * 2;
            for (let x = 0; x <= mask.width; x++, sample++, i++) {
                const z = face[sample], foot = sample + z * width;
                const ray = rays[row + ((left + x) & 1)];
                let occlusion = 0;
                for (let step = 0; step < ray.length; step++) {
                    const tap = ray[step];
                    const clearance = ground[foot + tap.offset] - z - tap.z;
                    if (clearance > 0) occlusion = Math.max(occlusion, tap.weight * Math.min(1, clearance / 4));
                    if (occlusion >= tap.weight) break;
                }
                samples[i] = strength * occlusion;
            }
        }
        // Resolve only the shadow alpha. The atlas and actor pixels retain their sharp edges.
        for (let y = 0, pixel = 3; y < mask.height; y++) {
            for (let x = 0, i = y * stride; x < mask.width; x++, i++, pixel += 4) {
                mask.data[pixel] = (samples[i] + samples[i + 1] + samples[i + stride] + samples[i + stride + 1]) * .25;
            }
        }
    }

    class Pass {
        constructor(map, atlas) {
            this.map = map;
            this.atlas = atlas;
            this.tiles = new Map();
            this.sprites = new WeakMap();
            this.reader = new OffscreenCanvas(1, 1);
            this.readContext = this.reader.getContext('2d', {willReadFrequently: true});
        }

        read(image, sx, sy, sw, sh, width, height, body, flipY = false) {
            if (this.reader.width < width) this.reader.width = width;
            if (this.reader.height < height) this.reader.height = height;
            const ctx = this.readContext;
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, width, height);
            ctx.save();
            if (flipY) {ctx.translate(0, height); ctx.scale(1, -1);}
            ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
            ctx.restore();
            return makeStamp(ctx.getImageData(0, 0, width, height).data, width, height, body);
        }

        tile(id) {
            const body = tiles.get(id);
            if (!body) return;
            if (!this.tiles.has(id)) {
                const size = this.atlas.width / atlasColumns;
                this.tiles.set(id, this.read(this.atlas, (id - 1) % atlasColumns * size,
                    Math.floor((id - 1) / atlasColumns) * size, size, size, tileSize, tileSize, body));
            }
            return this.tiles.get(id);
        }

        sprite(image, sx, sy, sw, sh, width, height, body, flipY = false) {
            let frames = this.sprites.get(image);
            if (!frames) {frames = new Map(); this.sprites.set(image, frames);}
            const key = [sx, sy, sw, sh, width, height, body.base, body.front, body.slope, body.depth, flipY].join(',');
            if (!frames.has(key)) {
                if (frames.size >= 128) frames.delete(frames.keys().next().value);
                frames.set(key, this.read(image, sx, sy, sw, sh, width, height, body, flipY));
            }
            return frames.get(key);
        }

        terrain(left, top, width, height, scene) {
            const x = Math.floor(left / cacheStep) * cacheStep - margin;
            const y = Math.floor(top / cacheStep) * cacheStep - margin;
            const stride = width + 2 * margin + cacheStep, rows = height + 2 * margin + maxHeight + cacheStep;
            const cached = this.staticField;
            if (cached && cached.x === x && cached.y === y && cached.width === stride && cached.height === rows && cached.sceneId === scene.id) return cached;
            const length = stride * rows;
            const field = {x, y, width: stride, height: rows, sceneId: scene.id,
                face: new Uint8Array(length), ground: new Uint8Array(length)};
            // Include artwork just above the field whose elevated surface projects into it.
            const firstX = Math.max(scene.x, Math.floor(x / tileSize));
            const firstY = Math.max(scene.y, Math.floor((y - maxHeight) / tileSize));
            const lastX = Math.min(scene.x + scene.width, Math.ceil((x + stride) / tileSize));
            const lastY = Math.min(scene.y + scene.height, Math.ceil((y + rows + tileSize) / tileSize));
            for (let ty = firstY; ty < lastY; ty++) {
                for (let tx = firstX; tx < lastX; tx++) {
                    const cell = this.map.data[ty * this.map.width + tx];
                    if (!cell) continue;
                    for (const id of Array.isArray(cell) ? cell : [cell]) {
                        const stamp = this.tile(id);
                        if (stamp) place(field, stamp, tx * tileSize, ty * tileSize);
                    }
                }
            }
            this.staticField = field;
            return field;
        }

        draw(ctx, view, scene, light, actors, spriteImages, options, scenery) {
            const width = ctx.canvas.width, height = ctx.canvas.height;
            const left = -Math.round(-view.cameraX), top = -Math.round(-view.cameraY);
            const terrain = this.terrain(left, top, width, height, scene);
            if (!this.mask || this.mask.width !== width || this.mask.height !== height) {
                this.surface = new OffscreenCanvas(width, height);
                this.output = this.surface.getContext('2d');
                this.mask = this.output.createImageData(width, height);
                this.samples = new Uint8Array((width + 1) * (height + 1));
                for (let i = 0; i < this.mask.data.length; i += 4) {
                    this.mask.data[i] = 24; this.mask.data[i + 1] = 32; this.mask.data[i + 2] = 52;
                }
                this.face = new Uint8Array(terrain.face.length);
                this.ground = new Uint8Array(terrain.ground.length);
            }
            this.face.set(terrain.face);
            if (options.shadows) this.ground.set(terrain.ground);
            else this.ground.fill(0);
            const field = {...terrain, face: this.face, ground: this.ground};
            for (const tree of scenery) {
                const {image, width, height, body} = tree;
                const stamp = this.sprite(image, 0, 0, image.width, image.height, width, height, body);
                place(field, stamp, tree.x, tree.y, tree.flipX, options.shadows);
            }
            const scale = view.scale;
            for (const actor of actors) {
                if (actor.globalAlpha < .25 || actor.dissolve?.visible < .5) continue;
                const draw = actor.drawData.find(part => part.shadowBody);
                const image = draw && spriteImages[draw.spriteName]?.image;
                if (!image) continue;
                const w = Math.round(draw.dW / scale), h = Math.round(draw.dH / scale);
                if (w < 1 || h < 1 || w > 256 || h > 256) continue;
                const flipX = actor.scaleX === -1, flipY = actor.scaleY === -1;
                const x = (actor.translateX + (flipX ? -draw.dx - draw.dW : draw.dx)) / scale;
                const y = (actor.translateY + (flipY ? -draw.dy - draw.dH : draw.dy)) / scale;
                const base = Math.round(actor.depthY - y);
                const body = {base, front: Math.round(h * .46), slope: .68, depth: Math.max(2, Math.min(12, Math.round(w * .18)))};
                const stamp = this.sprite(image, draw.sx, draw.sy, draw.sW, draw.sH, w, h, body, flipY);
                place(field, stamp, x, y, flipX, draw.shadowBody === 'player' ? options.playerShadow : options.shadows);
            }
            shade(field, left, top, this.mask, light, this.samples);
            this.output.putImageData(this.mask, 0, 0);
            ctx.drawImage(this.surface, 0, 0);
        }
    }
    return {Pass, skyLight, bodyHeight, makeStamp, place, shade};
});

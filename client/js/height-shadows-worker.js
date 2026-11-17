// Native-pixel height fields for the main map's outdoor lighting.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HeightShadows = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    const tileSize = 16;
    const maxHeight = 160;
    const maxReach = 2.05;
    const maxNorthReach = .5;
    const marginX = Math.ceil(maxHeight * maxReach) + 2;
    const marginY = Math.ceil(maxHeight * maxNorthReach) + 2;
    const cacheStep = 48;
    function casterClip(width, height) {
        // Both visible receivers and offscreen artwork project down to their footprint.
        return {left: -marginX, right: width + marginX, top: -marginY - maxHeight, bottom: height + marginY + maxHeight};
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
        const reach = .4 + (maxReach - .4) * (1 - elevation);
        const strength = sun ? .39 * daylight : .19 * (1 - daylight) * Math.min(1, elevation * 5);
        return {x: Math.cos(angle) * reach, y: -maxNorthReach + .28 * elevation, strength};
    }

    function bodyHeight(rise, front, slope) {
        return Math.min(maxHeight, Math.max(0, Math.round(Math.min(rise, front) + Math.max(0, rise - front) * slope)));
    }

    // Screen y + height is the ground coordinate beneath the receiver. Extrude
    // backwards by its physical depth to build the surface that casts shadows.
    function project(face, width, depths) {
        let groundTop = Infinity, groundBottom = -Infinity;
        for (let i = 0; i < face.length; i++) {
            if (!face[i]) continue;
            const end = Math.floor(i / width) + face[i];
            const depth = typeof depths === 'number' ? depths : depths[i];
            groundTop = Math.min(groundTop, end - depth);
            groundBottom = Math.max(groundBottom, end);
        }
        if (!Number.isFinite(groundTop)) return {width, face, ground: new Uint8Array(0), groundTop: 0};
        const ground = new Uint8Array(width * (groundBottom - groundTop + 1));
        for (let i = 0; i < face.length; i++) {
            const z = face[i];
            if (!z) continue;
            const end = i + (z - groundTop) * width;
            const depth = typeof depths === 'number' ? depths : depths[i];
            for (let p = end - depth * width; p <= end; p += width) {
                if (ground[p] < z) ground[p] = z;
            }
        }
        return {width, face, ground, groundTop};
    }

    function makeStamp(rgba, width, height, body) {
        const face = new Uint8Array(width * height);
        for (let y = 0; y < height; y++) {
            const z = bodyHeight(body.base - y, body.front, body.slope);
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                if (rgba[i * 4 + 3] >= 176) face[i] = z;
            }
        }
        return project(face, width, body.depth);
    }

    function readProxyTile(atlas, id) {
        const columns = atlas.width / tileSize;
        const left = (id - 1) % columns * tileSize;
        const top = Math.floor((id - 1) / columns) * tileSize;
        if (id < 1 || top + tileSize > atlas.height) return null;
        let face, depths;
        for (let y = 0; y < tileSize; y++) {
            let source = ((top + y) * atlas.width + left) * 4;
            for (let x = 0; x < tileSize; x++, source += 4) {
                if (!atlas.data[source + 3]) continue;
                if (!face) {
                    face = new Uint8Array(tileSize * tileSize);
                    depths = new Uint8Array(tileSize * tileSize);
                }
                const i = y * tileSize + x;
                face[i] = atlas.data[source + 1];
                depths[i] = 255 - atlas.data[source + 2];
            }
        }
        return face ? project(face, tileSize, depths) : null;
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

    // The tallest obstruction along a digital ray can sit between two point
    // samples. Cache its apparent height to the sunward edge of each block,
    // so five probes include every native pixel across the full shadow reach.
    function shade(field, left, top, mask, light, peaks = new Float32Array(field.ground.length)) {
        const {face, ground, width, height} = field;
        const horizontal = Math.abs(light.x) >= Math.abs(light.y);
        const reach = Math.abs(horizontal ? light.x : light.y);
        const sign = Math.sign(horizontal ? light.x : light.y) || 1;
        const majorStride = horizontal ? 1 : width;
        const minorStride = horizontal ? width : 1;
        const majorSize = horizontal ? width : height;
        const majorOrigin = horizontal ? field.x : field.y;
        const block = Math.max(1, Math.ceil(maxHeight * reach / 4));
        const slope = reach ? (horizontal ? light.y : light.x) / reach : 0;
        const risePerPixel = reach ? 1 / reach : maxHeight;
        const minorOffsets = new Int32Array(majorSize);
        const nextBlock = new Int32Array(majorSize);
        for (let i = 0; i < majorSize; i++) {
            // Both the ray and its block boundaries are anchored to the world.
            const q = sign * (i + majorOrigin);
            minorOffsets[i] = Math.round(q * slope);
            nextBlock[i] = i + sign * (block - ((q % block + block) % block));
        }
        const x = left - field.x, y = top - field.y;
        const farX = Math.round(maxHeight * light.x), farY = Math.round(maxHeight * light.y);
        const x0 = Math.max(0, x + Math.min(0, farX) - 1);
        const x1 = Math.min(width - 1, x + mask.width + Math.max(0, farX) + 1);
        const y0 = Math.max(0, y + Math.min(0, farY) - 1);
        const y1 = Math.min(height - 1, y + mask.height + maxHeight + Math.max(0, farY) + 1);
        const majorMin = horizontal ? x0 : y0, majorMax = horizontal ? x1 : y1;
        const minorMin = horizontal ? y0 : x0, minorMax = horizontal ? y1 : x1;
        const start = sign > 0 ? majorMax : majorMin, end = sign > 0 ? majorMin : majorMax;
        for (let i = start; sign * (i - end) >= 0; i -= sign) {
            const minorStep = minorOffsets[i + sign] - minorOffsets[i];
            const step = sign * majorStride + minorStep * minorStride;
            const reset = nextBlock[i] === i + sign || i === start;
            let index = i * majorStride + minorMin * minorStride;
            for (let j = minorMin; j <= minorMax; j++, index += minorStride) {
                const beyond = !reset && j + minorStep >= minorMin && j + minorStep <= minorMax;
                peaks[index] = beyond ? Math.max(ground[index], peaks[index + step] - risePerPixel) : ground[index];
            }
        }
        // Adjacent receivers share their last four probes. Resolve those block
        // starts once, in the opposite order so every source is still local.
        for (let i = end; sign * (start - i) >= 0; i += sign) {
            if (nextBlock[i] !== i + sign * block) continue;
            for (let j = minorMin; j <= minorMax; j++) {
                const index = i * majorStride + j * minorStride;
                let peak = peaks[index];
                for (let tap = 1; tap < 4; tap++) {
                    const k = i + tap * sign * block;
                    if (k < majorMin || k > majorMax) break;
                    const across = j + minorOffsets[k] - minorOffsets[i];
                    if (across < minorMin || across > minorMax) break;
                    peak = Math.max(peak, peaks[k * majorStride + across * minorStride] - tap * block * risePerPixel);
                }
                peaks[index] = peak;
            }
        }
        for (let row = 0, pixel = 3; row < mask.height; row++) {
            for (let col = 0; col < mask.width; col++, pixel += 4) {
                const fx = x + col, fy = y + row;
                // Sloped surfaces can project several artwork rows into one ground
                // cell. Sample the visible (front) edge of an elevated receiver.
                const z = face[fy * width + fx], footY = fy + z + (z > 0 ? 1 : 0);
                const first = horizontal ? fx : footY, minor = horizontal ? footY : fx;
                let clearance = 0;
                if (minor >= minorMin && minor <= minorMax && first >= majorMin && first <= majorMax) {
                    clearance = peaks[first * majorStride + minor * minorStride] - z;
                    const next = nextBlock[first];
                    if (clearance < 4 && next >= majorMin && next <= majorMax) {
                        const across = minor + minorOffsets[next] - minorOffsets[first];
                        if (across >= minorMin && across <= minorMax) {
                            const heightAtNext = z + Math.abs(next - first) * risePerPixel;
                            clearance = Math.max(clearance, peaks[next * majorStride + across * minorStride] - heightAtNext);
                        }
                    }
                }
                // Several steep roof rows may round onto the same footprint pixel.
                // Bound the correction so a taller wall still shades its lower face.
                if (z) {
                    const contact = ground[(fy + z) * width + fx] - z;
                    clearance -= .5 + Math.max(0, Math.min(3, contact));
                }
                mask.data[pixel] = 255 * light.strength * Math.min(1, clearance / 4);
            }
        }
    }

    class Pass {
        constructor(map, proxyAtlas) {
            this.map = map;
            this.tiles = new Map();
            this.sprites = new WeakMap();
            this.reader = new OffscreenCanvas(proxyAtlas.width, proxyAtlas.height);
            this.readContext = this.reader.getContext('2d', {willReadFrequently: true});
            this.readContext.drawImage(proxyAtlas, 0, 0);
            this.atlas = this.readContext.getImageData(0, 0, proxyAtlas.width, proxyAtlas.height);
            // Keep only the decoded atlas. The small reader is reused for actor frames.
            this.reader.width = this.reader.height = 1;
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
            if (!this.tiles.has(id)) this.tiles.set(id, readProxyTile(this.atlas, id));
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
            const x = Math.floor(left / cacheStep) * cacheStep - marginX;
            const y = Math.floor(top / cacheStep) * cacheStep - marginY;
            const stride = width + 2 * marginX + cacheStep, rows = height + 2 * marginY + maxHeight + cacheStep;
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

        draw(ctx, view, scene, light, actors, spriteImages, options, scenery, inspect = false) {
            const width = ctx.canvas.width, height = ctx.canvas.height;
            const left = -Math.round(-view.cameraX), top = -Math.round(-view.cameraY);
            const terrain = this.terrain(left, top, width, height, scene);
            if (!this.mask || this.mask.width !== width || this.mask.height !== height) {
                this.surface = new OffscreenCanvas(width, height);
                this.output = this.surface.getContext('2d');
                this.mask = this.output.createImageData(width, height);
                this.proxyPixels = null;
                this.rayPeaks = new Float32Array(terrain.ground.length);
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
            if (inspect) {
                this.proxyPixels ??= this.output.createImageData(width, height);
                const pixels = this.proxyPixels.data;
                for (let y = 0, i = 0; y < height; y++) {
                    let cell = (top - field.y + y) * field.width + left - field.x;
                    for (let x = 0; x < width; x++, cell++, i += 4) {
                        const z = field.face[cell];
                        pixels[i] = Math.min(255, z * 3);
                        pixels[i + 1] = z;
                        pixels[i + 2] = z ? 255 : 0;
                        pixels[i + 3] = 255;
                    }
                }
                this.output.putImageData(this.proxyPixels, 0, 0);
                return this.surface;
            }
            shade(field, left, top, this.mask, light, this.rayPeaks);
            this.output.putImageData(this.mask, 0, 0);
            ctx.drawImage(this.surface, 0, 0);
        }
    }
    return {Pass, skyLight, casterClip, bodyHeight, makeStamp, readProxyTile, place, shade};
});

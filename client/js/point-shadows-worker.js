// Height-tested visibility from one finite light to the native terrain pixels it illuminates.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PointShadows = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    const spacing = 4, blockShift = 4, blockSize = 1 << blockShift;
    const voxel = 2, words = 3; // two native pixels per height bit, up to Z=160

    function sourcePosition(field, light) {
        const x = Math.round(light.x), y = Math.round(light.y);
        const col = x - field.x, row = y - field.y;
        const surface = col >= 0 && col < field.width && row >= 0 && row < field.height ? field.face[row * field.width + col] : 0;
        // Move a mounted emitter just out from the visible face of its own wall.
        const z = Math.max(light.animation === 'fire' ? 10 : 14, surface + 2);
        return {x, y: y + z, z};
    }

    // A conservative block maximum lets a ray jump through empty ground
    // without undersampling thin legs or changing an occupied pixel's test.
    function blockField(frame, field, owner) {
        const width = Math.ceil(field.width / blockSize), height = Math.ceil(field.height / blockSize);
        const terrain = frame.terrain;
        let peaks;
        if (!terrain.ground || terrain.ground.length !== field.ground.length) return;
        if (frame.sceneShadows) {
            if (!terrain.pointBlocks) {
                const staticPeaks = new Uint8Array(width * height);
                for (let y = 0, i = 0; y < field.height; y++) {
                    const row = (y >> blockShift) * width;
                    for (let x = 0; x < field.width; x++, i++) {
                        const z = terrain.ground[i], cell = row + (x >> blockShift);
                        if (z > staticPeaks[cell]) staticPeaks[cell] = z;
                    }
                }
                terrain.pointBlocks = staticPeaks;
            }
            peaks = terrain.pointBlocks.slice();
        } else peaks = new Uint8Array(width * height);
        for (let i = 0; i < frame.dynamic.length; i++) {
            const p = frame.dynamic[i], stamp = p.stamp;
            if (!p.casts || owner === 'player' && p.player || !stamp.ground.length) continue;
            const x = p.x - field.x, y = p.y + stamp.groundTop - field.y;
            markBlocks(peaks, width, height, x, y, x + stamp.width - 1, y + stamp.ground.length / stamp.width - 1);
        }
        return {peaks, width, height};
    }

    function markBlocks(peaks, width, height, x, y, right, bottom) {
        const x0 = Math.max(0, x >> blockShift), x1 = Math.min(width - 1, right >> blockShift);
        const y0 = Math.max(0, y >> blockShift), y1 = Math.min(height - 1, bottom >> blockShift);
        if (x0 > x1) return;
        for (let row = y0; row <= y1; row++) peaks.fill(255, row * width + x0, row * width + x1 + 1);
    }

    // Retain gaps between separate elevated surfaces in the same column. Solid
    // terrain already has an exact native-pixel top in the shared sky field.
    function raisedVoxels(field, source, bounds, highestReceiver, blocks) {
        if (!field.raised?.length) return;
        const left = Math.min(source.x, bounds.x), right = Math.max(source.x, bounds.right);
        const top = Math.min(source.y, bounds.y), bottom = Math.max(source.y, bounds.bottom + highestReceiver);
        const x = Math.floor((left - field.x) / voxel), y = Math.floor((top - field.y) / voxel);
        const width = Math.ceil((right - field.x) / voxel) - x + 1, height = Math.ceil((bottom - field.y) / voxel) - y + 1;
        const ceiling = Math.max(source.z, highestReceiver) + 1;
        let bits;
        for (let p = 0; p < field.raised.length; p++) {
            const {stamp, x: px, y: py, flip} = field.raised[p], elevated = stamp.elevated;
            if (elevated.minZ > ceiling || px + stamp.width < left - field.x || px > right - field.x ||
                py + elevated.bottom < top - field.y || py + elevated.top > bottom - field.y) continue;
            if (blocks) markBlocks(blocks.peaks, blocks.width, blocks.height, px, py + elevated.top, px + stamp.width - 1, py + elevated.bottom);
            bits ??= new Uint32Array(width * height * words);
            const lastZ = Math.min(elevated.levels.length - 1, ceiling);
            for (let z = elevated.minZ; z <= lastZ; z++) {
                const strips = elevated.levels[z];
                if (!strips) continue;
                const level = z >> 1, word = level >> 5, bit = 1 << (level & 31);
                for (let i = 0; i < strips.length; i++) {
                    const strip = strips[i], sx = px + (flip ? stamp.width - strip.x - strip.width : strip.x);
                    const x0 = Math.max(0, Math.floor(sx / voxel) - x);
                    const x1 = Math.min(width - 1, Math.floor((sx + strip.width - 1) / voxel) - x);
                    const y0 = Math.max(0, Math.floor((py + strip.y) / voxel) - y);
                    const y1 = Math.min(height - 1, Math.floor((py + strip.y + strip.depth) / voxel) - y);
                    for (let row = y0; row <= y1; row++) {
                        for (let col = x0; col <= x1; col++) bits[(row * width + col) * words + word] |= bit;
                    }
                }
            }
        }
        if (bits) return {x, y, width, bits};
    }

    function blocked(field, raised, source, rx, ry, rz, penumbra, index, blocks) {
        // Trace from the emitter's ground projection up to the visible receiver.
        const dx = rx - source.x, dy = ry + rz - source.y, dz = rz - source.z;
        const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
        if (steps < 3) return 0;
        const sx = dx / steps, sy = dy / steps, sz = dz / steps;
        const originX = source.x - field.x + .5, originY = source.y - field.y + .5;
        const invX = sx ? 1 / Math.abs(sx) : Infinity, invY = sy ? 1 / Math.abs(sy) : Infinity;
        const ground = field.ground;
        let insideSource = ground[Math.floor(originY) * field.width + Math.floor(originX)] >= source.z;
        let shade = 0;
        for (let step = 1; step < steps; step++) {
            const x = originX + sx * step, y = originY + sy * step, z = source.z + sz * step;
            const col = Math.floor(x), row = Math.floor(y);
            if (col < 0 || col >= field.width || row < 0 || row >= field.height) continue;
            if (blocks && !insideSource) {
                const bx = col >> blockShift, by = row >> blockShift;
                const peak = blocks.peaks[by * blocks.width + bx];
                if (peak === 0 || peak < z + Math.min(0, sz * blockSize) + .75) {
                    const distX = sx >= 0 ? (bx + 1) * blockSize - x : x - bx * blockSize;
                    const distY = sy >= 0 ? (by + 1) * blockSize - y : y - by * blockSize;
                    // Leave the boundary sample for the next block, including
                    // rays landing exactly on the integer pixel at that edge.
                    const jump = Math.ceil(Math.min(distX * invX, distY * invY)) - 1;
                    if (jump > 0) step += jump;
                    continue;
                }
            }
            const solid = ground[row * field.width + col];
            if (insideSource) {
                if (solid >= z - .5) continue;
                insideSource = false;
            }
            const remaining = steps - step;
            const penetration = solid - z - .75;
            let hit = penetration > 0 ? Math.min(1, penetration / (1.2 + .025 * remaining)) : 0;
            // The last few steps on a raised surface can share a quantized
            // column with the receiver itself. Keep that surface illuminated.
            if (raised && remaining > (rz ? 4 : 1)) {
                const cell = ((row >> 1) - raised.y) * raised.width + (col >> 1) - raised.x;
                const level = Math.max(0, Math.round(z) >> 1);
                if (raised.bits[cell * words + (level >> 5)] & (1 << (level & 31))) hit = 1;
            }
            if (hit > shade) {
                shade = hit;
                // The flame has a finite area. The penumbra grows in proportion
                // to the blocker–receiver distance divided by source–blocker distance.
                if (penumbra) penumbra[index] = Math.min(255, 110 * remaining / step);
                if (shade === 1) return 1;
            }
        }
        return shade;
    }

    function highestReceiver(frame, bounds) {
        const {field, terrain} = frame, stride = Math.ceil(field.width / blockSize);
        if (!terrain.face) return 160;
        if (!terrain.receiverBlocks) {
            const peaks = new Uint8Array(stride * Math.ceil(field.height / blockSize));
            for (let y = 0, i = 0; y < field.height; y++) {
                const row = (y >> blockShift) * stride;
                for (let x = 0; x < field.width; x++, i++) {
                    const cell = row + (x >> blockShift), z = terrain.face[i];
                    if (z > peaks[cell]) peaks[cell] = z;
                }
            }
            terrain.receiverBlocks = peaks;
        }
        let highest = 0;
        const left = Math.max(0, bounds.x - field.x) >> blockShift;
        const right = Math.min(field.width - 1, bounds.right - field.x) >> blockShift;
        const top = Math.max(0, bounds.y - field.y) >> blockShift;
        const bottom = Math.min(field.height - 1, bounds.bottom - field.y) >> blockShift;
        for (let y = top; y <= bottom; y++) {
            for (let x = left; x <= right; x++) highest = Math.max(highest, terrain.receiverBlocks[y * stride + x]);
        }
        for (let i = 0; i < frame.dynamic.length; i++) {
            const p = frame.dynamic[i], s = p.stamp;
            if (p.receives && p.x < bounds.right && p.x + s.width > bounds.x && p.y < bounds.bottom &&
                p.y + s.face.length / s.width > bounds.y) highest = Math.max(highest, casterExtent(s).height);
        }
        return highest;
    }

    function affectedPlacements(frame, bounds, source, highest, owner) {
        const result = [];
        const top = Math.min(bounds.y, source.y), bottom = Math.max(bounds.bottom + highest, source.y);
        for (let i = 0; i < frame.dynamic.length; i++) {
            const p = frame.dynamic[i], s = p.stamp;
            if (owner === 'player' && p.player || !p.casts && !p.receives ||
                s.elevated?.minZ > Math.max(source.z, highest) && !p.receives) continue;
            if (p.x + s.width < Math.min(bounds.x, source.x) || p.x > Math.max(bounds.right, source.x)) continue;
            const footprintTop = s.elevated?.top ?? s.groundTop;
            const footprintBottom = s.elevated?.bottom ?? s.groundTop + s.ground.length / s.width;
            if (p.y + footprintBottom >= top && p.y + footprintTop <= bottom ||
                p.receives && p.y + s.face.length / s.width >= bounds.y && p.y <= bounds.bottom) result.push(p);
        }
        return result;
    }

    function samePlacements(a, b) {
        if (!a || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i].stamp !== b[i].stamp || a[i].x !== b[i].x || a[i].y !== b[i].y ||
                a[i].flip !== b[i].flip || a[i].casts !== b[i].casts || a[i].receives !== b[i].receives) return false;
        }
        return true;
    }

    function casterExtent(stamp) {
        if (stamp.pointExtent) return stamp.pointExtent;
        let x = stamp.width, y = Infinity, right = 0, bottom = -Infinity, height = 0;
        for (let i = 0; i < stamp.ground.length; i++) {
            const z = stamp.ground[i];
            if (!z) continue;
            const col = i % stamp.width, row = Math.floor(i / stamp.width) + stamp.groundTop;
            x = Math.min(x, col); right = Math.max(right, col + 1);
            y = Math.min(y, row); bottom = Math.max(bottom, row + 1);
            height = Math.max(height, z);
        }
        if (stamp.elevated) {
            x = 0; right = stamp.width; y = Math.min(y, stamp.elevated.top);
            bottom = Math.max(bottom, stamp.elevated.bottom + 1); height = Math.max(height, stamp.elevated.levels.length - 1);
        }
        return stamp.pointExtent = {x, y, right, bottom, height};
    }

    function changedRegion(old, active, source, radius, highest, bounds) {
        let x = bounds.right, y = bounds.bottom, right = bounds.x, bottom = bounds.y;
        function include(p) {
            const s = p.stamp, extent = casterExtent(s);
            const left = p.x + (p.flip ? s.width - extent.right : extent.x) - 2;
            const last = p.x + (p.flip ? s.width - extent.x : extent.right) + 2;
            const top = p.y + extent.y - 2, end = p.y + extent.bottom + 2;
            if (extent.height > 0) {
                // A point below the light projects a finite distance. Taller
                // solids can reach the rim, but only in the wedge behind them.
                const topZ = extent.height + (s.elevated ? voxel : 0);
                const scale = topZ < source.z ? source.z / (source.z - topZ) : Infinity;
                const reach = radius + highest + source.z + spacing;
                const nearX = Math.max(0, left - source.x, source.x - last);
                const nearY = Math.max(0, top - source.y, source.y - end);
                for (const px of [left - source.x, last - source.x]) {
                    const projected = px * Math.min(scale, reach / (Math.hypot(px, nearY) || 1));
                    x = Math.min(x, source.x + Math.min(px, projected));
                    right = Math.max(right, source.x + Math.max(px, projected));
                }
                for (const py of [top - source.y, end - source.y]) {
                    const projected = py * Math.min(scale, reach / (Math.hypot(py, nearX) || 1));
                    y = Math.min(y, source.y + Math.min(py, projected) - highest);
                    bottom = Math.max(bottom, source.y + Math.max(py, projected));
                }
            }
            if (p.receives) {
                x = Math.min(x, p.x); right = Math.max(right, p.x + s.width);
                y = Math.min(y, p.y); bottom = Math.max(bottom, p.y + s.face.length / s.width);
            }
        }
        function different(a, b) {
            for (let i = 0; i < a.length; i++) {
                const p = a[i];
                if (!b.some(q => q.stamp === p.stamp && q.x === p.x && q.y === p.y && q.flip === p.flip &&
                    q.casts === p.casts && q.receives === p.receives)) include(p);
            }
        }
        different(old, active); different(active, old);
        // One native pixel for raster rounding and three samples for the tent
        // penumbra and interpolation. Both entering and disappearing casts count.
        const pad = 1 + 3 * spacing;
        return {x: Math.max(bounds.x, Math.floor(x - pad)), y: Math.max(bounds.y, Math.floor(y - pad)),
            right: Math.min(bounds.right, Math.ceil(right + pad)), bottom: Math.min(bounds.bottom, Math.ceil(bottom + pad))};
    }

    function makeMask(field, source, radius, bounds, output, blocks) {
        const w = bounds.right - bounds.x, h = bounds.bottom - bounds.y;
        const stride = Math.ceil(w / spacing) + 1, rows = Math.ceil(h / spacing) + 1;
        const samples = new Uint8Array(stride * rows);
        const penumbra = new Uint8Array(samples.length);
        const receivers = new Uint8Array(samples.length);
        let highest = 0;
        for (let row = 0, i = 0; row < rows; row++) {
            const y = Math.min(bounds.bottom - 1, bounds.y + row * spacing) - field.y;
            for (let col = 0; col < stride; col++, i++) {
                const x = Math.min(bounds.right - 1, bounds.x + col * spacing) - field.x;
                if (x < 0 || x >= field.width || y < 0 || y >= field.height) continue;
                receivers[i] = field.face[y * field.width + x];
                if (receivers[i] > highest) highest = receivers[i];
            }
        }
        const raised = raisedVoxels(field, source, bounds, highest, blocks);
        let any = false;
        for (let row = 0, i = 0; row < rows; row++) {
            const y = Math.min(bounds.bottom - 1, bounds.y + row * spacing);
            for (let col = 0; col < stride; col++, i++) {
                const x = Math.min(bounds.right - 1, bounds.x + col * spacing);
                if ((x - source.x) ** 2 + (y - source.y + source.z) ** 2 > (radius + spacing) ** 2) continue;
                samples[i] = Math.round(255 * blocked(field, raised, source, x, y, receivers[i], penumbra, i, blocks));
                if (samples[i]) any = true;
            }
        }
        if (!any) return false;
        const soft = samples.slice();
        const kernel = [1, 4, 6, 4, 1];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < stride; col++) {
                const i = row * stride + col;
                let total = 0, weight = 0, spread = 0;
                for (let v = Math.max(-2, -row); v <= Math.min(2, rows - row - 1); v++) {
                    for (let u = Math.max(-2, -col); u <= Math.min(2, stride - col - 1); u++) {
                        const j = i + v * stride + u;
                        if (Math.abs(receivers[i] - receivers[j]) > 4) continue;
                        const k = kernel[v + 2] * kernel[u + 2];
                        total += k * samples[j]; weight += k;
                        if (penumbra[j] > spread) spread = penumbra[j];
                    }
                }
                soft[i] += (total / weight - soft[i]) * spread / 255;
            }
        }
        // Resolve at the native receiver height. Across an atlas silhouette,
        // interpolate only from samples on the corresponding surface.
        for (let y = 0, p = 3; y < h; y++) {
            const sy = Math.floor(y / spacing) * stride, v = y % spacing / spacing;
            const line = (bounds.y + y - field.y) * field.width + bounds.x - field.x;
            for (let x = 0; x < w; x++, p += 4) {
                const i = sy + Math.floor(x / spacing), u = x % spacing / spacing;
                const z = field.face[line + x] || 0;
                const a = Math.abs(z - receivers[i]) <= 4 ? (1 - v) * (1 - u) : 0;
                const b = Math.abs(z - receivers[i + 1]) <= 4 ? (1 - v) * u : 0;
                const c = Math.abs(z - receivers[i + stride]) <= 4 ? v * (1 - u) : 0;
                const d = Math.abs(z - receivers[i + stride + 1]) <= 4 ? v * u : 0;
                const weight = a + b + c + d;
                output[p] = weight ? (a * soft[i] + b * soft[i + 1] + c * soft[i + stride] + d * soft[i + stride + 1]) / weight :
                    255 * blocked(field, raised, source, bounds.x + x, bounds.y + y, z, null, 0, blocks);
            }
        }
        return true;
    }

    class Pass {
        constructor() { this.lights = new Map(); this.pixels = 0; }

        mask(frame, light, fieldForSource = () => frame.field, beam) {
            if (frame.terrain !== this.terrain) {
                this.terrain = frame.terrain;
                this.version = (this.version || 0) + 1;
            }
            const radius = Math.ceil((light.radius || 1) * 16), source = sourcePosition(frame.field, light);
            const key = light.owner || [source.x, source.y, source.z, radius, light.spread || 0, light.angle || 0].join(',');
            let entry = this.lights.get(key);
            const baseX = source.x - radius, baseY = source.y - source.z - radius;
            const aligned = (v, origin) => origin + Math.floor((v - origin) / spacing) * spacing;
            const halo = 3 * spacing;
            const startX = Math.max(baseX, beam ? aligned(beam.x - halo, baseX) : baseX);
            const startY = Math.max(baseY, beam ? aligned(beam.y - halo, baseY) : baseY);
            const stopX = Math.min(baseX + 2 * radius, beam ? aligned(beam.right + halo + spacing, baseX) : Infinity);
            const stopY = Math.min(baseY + 2 * radius, beam ? aligned(beam.bottom + halo + spacing, baseY) : Infinity);
            const viewX = Math.max(startX, frame.left - halo), viewY = Math.max(startY, frame.top - halo);
            const viewRight = Math.min(stopX, frame.left + frame.width + halo), viewBottom = Math.min(stopY, frame.top + frame.height + halo);
            if (viewRight <= viewX || viewBottom <= viewY) return;
            // Keep a world-anchored crop across small camera movements.
            const keepCrop = entry && entry.sourceX === source.x && entry.sourceY === source.y && entry.z === source.z && entry.radius === radius &&
                entry.x <= viewX && entry.y <= viewY && entry.right >= viewRight && entry.bottom >= viewBottom;
            const x = keepCrop ? entry.x : Math.max(startX, aligned(viewX - 32, baseX));
            const y = keepCrop ? entry.y : Math.max(startY, aligned(viewY - 32, baseY));
            const right = keepCrop ? entry.right : Math.min(stopX, aligned(viewRight + 32 + spacing, baseX));
            const bottom = keepCrop ? entry.bottom : Math.min(stopY, aligned(viewBottom + 32 + spacing, baseY));
            const bounds = {x, y, right, bottom};
            const highest = highestReceiver(frame, bounds);
            const active = affectedPlacements(frame, bounds, source, highest, light.owner);
            // Terrain patches on either side of a camera-cache boundary contain
            // the same static map. Reuse a light only when all of its rays fit
            // within both patches; scene changes still invalidate it.
            const fieldRect = frame.terrain;
            const enclosed = Math.min(source.x, x) > fieldRect.x && Math.min(source.y, y) > fieldRect.y &&
                Math.max(source.x, right) < fieldRect.x + fieldRect.width &&
                Math.max(source.y, bottom + highest) < fieldRect.y + fieldRect.height;
            const sameTerrain = entry && (entry.version === this.version || enclosed && entry.enclosed &&
                fieldRect.sceneId != null && fieldRect.sceneId === entry.sceneId);
            const stable = sameTerrain && entry.sceneShadows === frame.sceneShadows &&
                entry.sourceX === source.x && entry.sourceY === source.y && entry.z === source.z && entry.radius === radius &&
                entry.x === x && entry.y === y && entry.right === right && entry.bottom === bottom;
            if (stable && samePlacements(entry.active, active)) {
                return entry.visible ? entry : null;
            }
            if (!entry) {entry = {}; this.lights.set(key, entry);}
            const width = right - x, height = bottom - y;
            if (!entry.canvas || entry.canvas.width !== width || entry.canvas.height !== height) {
                if (entry.canvas) this.pixels -= entry.canvas.width * entry.canvas.height;
                // Limit the combined canvas/readback allocation, including a
                // moving lantern, a large window and many overlapping torches.
                this.lights.delete(key);
                while (this.lights.size && (this.lights.size >= 48 || this.pixels + width * height > 1024 * 1024)) {
                    const oldest = this.lights.keys().next().value, oldCanvas = this.lights.get(oldest).canvas;
                    this.pixels -= oldCanvas.width * oldCanvas.height;
                    oldCanvas.width = oldCanvas.height = 0;
                    this.lights.delete(oldest);
                }
                this.lights.set(key, entry);
                this.pixels += width * height;
                entry.canvas = new OffscreenCanvas(width, height);
                entry.context = entry.canvas.getContext('2d');
                entry.image = entry.context.createImageData(width, height);
            }
            const field = fieldForSource(bounds, source, highest), blocks = blockField(frame, field, light.owner);
            const dirty = stable ? changedRegion(entry.active, active, source, radius, Math.max(entry.highest, highest), bounds) : bounds;
            const dw = Math.max(0, dirty.right - dirty.x), dh = Math.max(0, dirty.bottom - dirty.y);
            let visible = entry.visible;
            if (dw * dh >= width * height * .72 || !stable) {
                visible = makeMask(field, source, radius, bounds, entry.image.data, blocks);
                if (visible) entry.context.putImageData(entry.image, 0, 0);
                else entry.image.data.fill(0);
            } else if (dw > 0 && dh > 0) {
                // Trace the changed wedge with its own sampling halo. Adjacent
                // receivers keep their previous native pixels and heights.
                const patch = {x: Math.max(x, aligned(dirty.x - halo, x)), y: Math.max(y, aligned(dirty.y - halo, y)),
                    right: Math.min(right, aligned(dirty.right + halo + spacing, x)),
                    bottom: Math.min(bottom, aligned(dirty.bottom + halo + spacing, y))};
                const stride = patch.right - patch.x, size = stride * (patch.bottom - patch.y) * 4;
                if (!this.patch || this.patch.length < size) this.patch = new Uint8ClampedArray(size);
                const hasShadow = makeMask(field, source, radius, patch, this.patch, blocks);
                for (let row = dirty.y; row < dirty.bottom; row++) {
                    const from = ((row - patch.y) * stride + dirty.x - patch.x) * 4;
                    const dst = ((row - y) * width + dirty.x - x) * 4;
                    if (hasShadow) entry.image.data.set(this.patch.subarray(from, from + dw * 4), dst);
                    else entry.image.data.fill(0, dst, dst + dw * 4);
                }
                visible = hasShadow;
                if (!visible && entry.visible) {
                    for (let i = 3; i < entry.image.data.length; i += 4) {
                        if (entry.image.data[i]) {visible = true; break;}
                    }
                }
                if (visible && !entry.visible) entry.context.putImageData(entry.image, 0, 0);
                else if (visible) entry.context.putImageData(entry.image, 0, 0, dirty.x - x, dirty.y - y, dw, dh);
            }
            Object.assign(entry, bounds, {sourceX: source.x, sourceY: source.y, z: source.z, radius, version: this.version,
                sceneShadows: frame.sceneShadows, active, visible, highest, enclosed, sceneId: fieldRect.sceneId});
            return visible ? entry : null;
        }
    }

    return {Pass, sourcePosition, makeMask};
});

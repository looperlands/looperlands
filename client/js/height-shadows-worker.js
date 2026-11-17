// Native-pixel height fields for scenery, characters and scene lighting.
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
    const feather = 2; // native pixels of coverage on either side of a silhouette
    // These sprites are drawn from above, with tails lying on the ground.
    const lowAnimals = new Set(['rat', 'snake'].flatMap(name => [name, name + '_silhouette']));
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
        const strength = sun ? .33 * daylight : .15 * (1 - daylight) * Math.min(1, elevation * 5);
        return {x: Math.cos(angle) * reach, y: -maxNorthReach + .28 * elevation, strength};
    }

    function bodyHeight(rise, front, slope) {
        return Math.min(maxHeight, Math.max(0, Math.round(Math.min(rise, front) + Math.max(0, rise - front) * slope)));
    }

    // Screen y + height is the ground coordinate beneath the receiver. Extrude
    // backwards by its physical depth to build the surface that casts shadows.
    function project(face, width, depths, raised, supports) {
        let groundTop = Infinity, groundBottom = -Infinity;
        // Adjacent raised pixels at the same elevation/depth form a horizontal
        // strip. Keep the strips separate from solids that extend to the ground.
        const elevated = raised ? {levels: [], top: Infinity, bottom: -Infinity, minZ: maxHeight} : null;
        for (let i = 0; i < face.length; i++) {
            if (!face[i]) continue;
            const end = Math.floor(i / width) + face[i];
            const depth = typeof depths === 'number' ? depths : depths[i];
            if (raised?.[i]) {
                const z = face[i], x = i % width;
                let count = 1;
                while (x + count < width && raised[i + count] && face[i + count] === z &&
                    (typeof depths === 'number' || depths[i + count] === depth)) count++;
                (elevated.levels[z] ??= []).push({x, y: end - depth, width: count, depth});
                elevated.top = Math.min(elevated.top, end - depth);
                elevated.bottom = Math.max(elevated.bottom, end);
                elevated.minZ = Math.min(elevated.minZ, z);
                i += count - 1;
                continue;
            }
            groundTop = Math.min(groundTop, end - depth);
            groundBottom = Math.max(groundBottom, end);
        }
        if (!Number.isFinite(groundTop)) return {width, face, elevated, ground: new Uint8Array(0), groundTop: 0};
        const ground = new Uint8Array(width * (groundBottom - groundTop + 1));
        for (let i = 0; i < face.length; i++) {
            const z = face[i];
            if (!z || raised?.[i]) continue;
            const end = i + (z - groundTop) * width;
            const depth = typeof depths === 'number' ? depths : depths[i];
            const peak = supports?.[i] || z;
            for (let p = end - depth * width; p <= end; p += width) {
                if (ground[p] < peak) ground[p] = peak;
            }
        }
        return {width, face, elevated, ground, groundTop};
    }

    function makeStamp(rgba, width, height, body) {
        const face = new Uint8Array(width * height);
        if (body.raised) {
            const depths = new Uint8Array(face.length);
            // Each column through the leaf silhouette cuts a rounded crown. Its
            // ground depth shrinks toward the tips while its center stays rooted.
            for (let x = 0; x < width; x++) {
                let top = 0, bottom = height - 1;
                while (top <= bottom && rgba[(top * width + x) * 4 + 3] < 176) top++;
                while (bottom >= top && rgba[(bottom * width + x) * 4 + 3] < 176) bottom--;
                const span = bottom - top + 1, middle = (top + bottom) / 2;
                for (let y = top; y <= bottom; y++) {
                    const i = y * width + x;
                    if (rgba[i * 4 + 3] < 176) continue;
                    const normalized = 2 * (y - middle) / span;
                    const section = span / height * Math.sqrt(1 - normalized * normalized);
                    const depth = Math.round(body.depth * section);
                    depths[i] = depth;
                    face[i] = Math.max(0, bodyHeight(body.base - y, body.front, body.slope) - Math.round((body.depth - depth) / 2));
                }
            }
            return project(face, width, depths, face);
        }
        for (let y = 0; y < height; y++) {
            const z = bodyHeight(body.base - y, body.front, body.slope);
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                if (rgba[i * 4 + 3] >= 176) face[i] = z;
            }
        }
        return project(face, width, body.depth);
    }

    function makeActorStamp(rgba, width, height, pose) {
        const face = new Uint8Array(width * height);
        let top = height, bottom = -1, left = width, right = -1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (rgba[(y * width + x) * 4 + 3] < 176) continue;
                left = Math.min(left, x); right = Math.max(right, x);
                top = Math.min(top, y); bottom = Math.max(bottom, y);
            }
        }
        if (bottom < top) return project(face, width, 0);
        if (pose === 'low') {
            // Two distance sweeps round the torso while leaving narrow tails at ground level.
            for (let y = top; y <= bottom; y++) {
                for (let x = left; x <= right; x++) {
                    const i = y * width + x;
                    if (rgba[i * 4 + 3] >= 176) {
                        face[i] = 1 + Math.min(x === left ? 0 : face[i - 1], y === top ? 0 : face[i - width]);
                    }
                }
            }
            for (let y = bottom; y >= top; y--) {
                for (let x = right; x >= left; x--) {
                    const i = y * width + x;
                    face[i] = Math.min(face[i], 1 + (x === right ? 0 : face[i + 1]),
                        1 + (y === bottom ? 0 : face[i + width]));
                }
            }
            // These top-down poses show the full width of the back. The distance
            // to its outline is a radius; use the diameter for torso height.
            // Whiskers, toes and one-pixel tails stay one pixel above the floor.
            for (let i = 0; i < face.length; i++) {
                if (face[i]) face[i] = Math.min(maxHeight, 2 * face[i] - 1);
            }
            return project(face, width, 2);
        }
        // Animation cells often contain considerable transparent padding. The
        // visible figure sets its height and foot contact, even on flipped frames.
        return makeStamp(rgba, width, height, {base: bottom + 1, front: (bottom - top + 1) * .55,
            slope: .7, depth: Math.max(1, Math.min(8, Math.round((right - left + 1) * .12)))});
    }

    function readProxyTile(atlas, id) {
        const columns = atlas.width / tileSize;
        const left = (id - 1) % columns * tileSize;
        const top = Math.floor((id - 1) / columns) * tileSize;
        if (id < 1 || top + tileSize > atlas.height) return null;
        let face, depths, raised, supports;
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
                const marker = atlas.data[source] - Math.min(255, 3 * face[i]);
                if (face[i] && marker === -1) {
                    raised ??= new Uint8Array(tileSize * tileSize);
                    raised[i] = 1;
                } else if (face[i] && marker > 0) {
                    // The visible bark ends below foliage that hides the rest
                    // of its solid trunk. That trunk keeps the same footprint.
                    supports ??= new Uint8Array(tileSize * tileSize);
                    supports[i] = Math.min(maxHeight, face[i] + marker);
                }
            }
        }
        return face ? project(face, tileSize, depths, raised, supports) : null;
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

    function place(field, stamp, worldX, worldY, flip = false, casts = true, receives = true) {
        const x = Math.round(worldX) - field.x, y = Math.round(worldY) - field.y;
        if (receives) blit(field.face, field.width, field.height, stamp.face, stamp.width, x, y, flip);
        if (!casts) return;
        blit(field.ground, field.width, field.height, stamp.ground, stamp.width, x, y + stamp.groundTop, flip);
        if (stamp.elevated?.levels.length) {
            field.raised ??= [];
            field.raised.push({stamp, x, y, flip});
        }
    }

    function shadowBuffers(field, mask) {
        return {peaks: new Float32Array(field.ground.length), blockerHeights: new Uint8Array(field.ground.length),
            coverage: new Uint8ClampedArray((mask.width + 2 * feather) * (mask.height + 2 * feather))};
    }

    // Project both caster and receiver along the light onto z=0. They share a
    // ray exactly when the projected cells overlap; the higher surface blocks
    // the lower one. No material is assumed between a raised strip and earth.
    function projectRaised(field, light, buffers, left, top, mask) {
        if (!field.raised?.length) return;
        const cache = buffers.raised ??= {heights: new Uint8Array(field.ground.length), rasters: new WeakMap(),
            dx: new Int16Array(maxHeight + 1), dy: new Int16Array(maxHeight + 1)};
        // A change smaller than half a native pixel at maximum height can reuse
        // the same light direction for every swaying tree and map tile.
        const lightX = Math.round(-light.x * maxHeight), lightY = Math.round(-light.y * maxHeight);
        const turned = lightX !== cache.lightX || lightY !== cache.lightY;
        const previous = cache.placements;
        let moved = cache.count !== field.raised.length;
        if (!turned && !moved && previous !== field.raised) {
            for (let i = 0; i < field.raised.length; i++) {
                const a = previous[i], b = field.raised[i];
                if (a.stamp !== b.stamp || a.x !== b.x || a.y !== b.y || a.flip !== b.flip) {moved = true; break;}
            }
        }
        if (turned) {
            cache.lightX = lightX; cache.lightY = lightY;
            for (let z = 1; z <= maxHeight; z++) {
                cache.dx[z] = Math.round(lightX * z / maxHeight);
                cache.dy[z] = Math.round(lightY * z / maxHeight);
            }
        }
        // Only rays passing through visible receivers can contribute. Forest
        // crowns sit above the drawing layer, so the visible ground and roots
        // usually restrict the work to the viewport even at a low sun angle.
        const viewX = Math.max(0, left - field.x - feather), viewY = Math.max(0, top - field.y - feather);
        const endX = Math.min(field.width, left - field.x + mask.width + feather);
        const endY = Math.min(field.height, top - field.y + mask.height + feather);
        let receiverHeight = 0;
        for (let y = viewY; y < endY; y++) {
            const end = y * field.width + endX;
            for (let i = y * field.width + viewX; i < end; i++) if (field.face[i] > receiverHeight) receiverHeight = field.face[i];
        }
        const x0 = Math.max(0, viewX + Math.min(0, cache.dx[receiverHeight]));
        const x1 = Math.min(field.width, endX + Math.max(0, cache.dx[receiverHeight]));
        const projectedY = receiverHeight + cache.dy[receiverHeight];
        const y0 = Math.max(0, viewY + Math.min(0, projectedY));
        const y1 = Math.min(field.height, endY + Math.max(0, projectedY));
        const window = cache.window;
        const outside = !window || x0 < window.x0 || x1 > window.x1 || y0 < window.y0 || y1 > window.y1;
        if (!turned && !moved && !outside) return cache;
        cache.window = {x0: Math.max(0, x0 - cacheStep), x1: Math.min(field.width, x1 + cacheStep),
            y0: Math.max(0, y0 - cacheStep), y1: Math.min(field.height, y1 + cacheStep)};
        cache.placements = field.raised;
        cache.count = field.raised.length;
        cache.heights.fill(0);
        for (let i = 0; i < field.raised.length; i++) {
            const {stamp, x, y, flip} = field.raised[i];
            const raster = raisedRaster(stamp, flip, cache, x, y);
            if (!raster) continue;
            const left = x + raster.x, top = y + raster.y;
            const firstX = Math.max(left, cache.window.x0), lastX = Math.min(left + raster.width, cache.window.x1);
            const firstY = Math.max(top, cache.window.y0), lastY = Math.min(top + raster.height, cache.window.y1);
            // The projected blocks are column-major so only on-screen columns are copied.
            for (let col = firstX; col < lastX; col++) {
                let source = (col - left) * raster.height + firstY - top;
                const end = col * field.height + lastY;
                for (let target = col * field.height + firstY; target < end; target++, source++) {
                    const z = raster.pixels[source];
                    if (z > cache.heights[target]) cache.heights[target] = z;
                }
            }
        }
        return cache;
    }

    function raisedRaster(stamp, flip, cache, worldX, worldY) {
        const {levels, top, bottom, minZ} = stamp.elevated, maxZ = levels.length - 1;
        const {dx, dy, window} = cache;
        const x = Math.min(dx[minZ - 1], dx[maxZ]), y = top + Math.min(dy[minZ - 1], dy[maxZ]);
        const width = stamp.width + Math.max(dx[minZ - 1], dx[maxZ]) - x;
        const height = bottom + Math.max(dy[minZ - 1], dy[maxZ]) - y + 1;
        if (worldX + x >= window.x1 || worldX + x + width <= window.x0 ||
            worldY + y >= window.y1 || worldY + y + height <= window.y0) return;
        let directions = cache.rasters.get(stamp);
        if (!directions) {directions = []; cache.rasters.set(stamp, directions);}
        const raster = directions[flip ? 1 : 0] ??= {};
        if (raster.lightX === cache.lightX && raster.lightY === cache.lightY) return raster;
        const length = width * height;
        if (!raster.workspace || raster.workspace.length < length) raster.workspace = new Uint8Array(length);
        const pixels = raster.workspace.subarray(0, length);
        pixels.fill(0);
        // Paint low to high in the stamp's own coordinates. Each strip fills a
        // contiguous run down a column; moving, mirrored and repeated trees
        // only have to copy this small silhouette while the sun holds its angle.
        for (let z = minZ; z <= maxZ; z++) {
            const strips = levels[z];
            if (!strips) continue;
            const minX = Math.min(dx[z], dx[z - 1]) - x, maxX = Math.max(dx[z], dx[z - 1]) - x;
            const minY = Math.min(dy[z], dy[z - 1]) - y, maxY = Math.max(dy[z], dy[z - 1]) - y;
            for (let i = 0; i < strips.length; i++) {
                const strip = strips[i];
                const left = flip ? stamp.width - strip.x - strip.width : strip.x;
                const right = left + strip.width + maxX;
                const y0 = strip.y + minY, y1 = strip.y + strip.depth + 1 + maxY;
                for (let col = left + minX; col < right; col++) pixels.fill(z, col * height + y0, col * height + y1);
            }
        }
        return Object.assign(raster, {x, y, width, height, pixels, lightX: cache.lightX, lightY: cache.lightY});
    }

    // The tallest obstruction along a digital ray can sit between two point
    // samples. Cache its apparent height to the sunward edge of each block,
    // so five probes include every native pixel across the full shadow reach.
    function shade(field, left, top, mask, light, buffers = shadowBuffers(field, mask)) {
        const {face, ground, width, height} = field;
        const {peaks, blockerHeights, coverage} = buffers;
        const raised = projectRaised(field, light, buffers, left, top, mask);
        const sampleWidth = mask.width + 2 * feather, sampleHeight = mask.height + 2 * feather;
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
        const x = left - field.x - feather, y = top - field.y - feather;
        const farX = Math.round(maxHeight * light.x), farY = Math.round(maxHeight * light.y);
        const x0 = Math.max(0, x + Math.min(0, farX) - 1);
        const x1 = Math.min(width - 1, x + sampleWidth + Math.max(0, farX) + 1);
        const y0 = Math.max(0, y + Math.min(0, farY) - 1);
        const y1 = Math.min(height - 1, y + sampleHeight + maxHeight + Math.max(0, farY) + 1);
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
                const incoming = beyond ? peaks[index + step] - risePerPixel : 0;
                if (incoming > ground[index]) {
                    peaks[index] = incoming;
                    blockerHeights[index] = blockerHeights[index + step];
                } else {
                    peaks[index] = ground[index];
                    blockerHeights[index] = ground[index];
                }
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
                    const probe = k * majorStride + across * minorStride;
                    const candidate = peaks[probe] - tap * block * risePerPixel;
                    if (candidate > peak) {
                        peak = candidate;
                        blockerHeights[index] = blockerHeights[probe];
                    }
                }
                peaks[index] = peak;
            }
        }
        for (let row = 0, i = 0; row < sampleHeight; row++) {
            for (let col = 0; col < sampleWidth; col++, i++) {
                const fx = x + col, fy = y + row;
                if (fx < 0 || fy < 0 || fx >= width || fy >= height) {coverage[i] = 0; continue;}
                // Sloped surfaces can project several artwork rows into one ground
                // cell. Sample the visible (front) edge of an elevated receiver.
                const z = face[fy * width + fx], footY = fy + z + (z > 0 ? 1 : 0);
                const first = horizontal ? fx : footY, minor = horizontal ? footY : fx;
                let clearance = 0, rayDistance = 0;
                if (minor >= minorMin && minor <= minorMax && first >= majorMin && first <= majorMax) {
                    const origin = first * majorStride + minor * minorStride;
                    clearance = peaks[origin] - z;
                    rayDistance = blockerHeights[origin] - peaks[origin];
                    const next = nextBlock[first];
                    if (next >= majorMin && next <= majorMax) {
                        const across = minor + minorOffsets[next] - minorOffsets[first];
                        if (across >= minorMin && across <= minorMax) {
                            const heightAtNext = z + Math.abs(next - first) * risePerPixel;
                            const probe = next * majorStride + across * minorStride;
                            const candidate = peaks[probe] - heightAtNext;
                            if (candidate > clearance) {
                                clearance = candidate;
                                rayDistance = blockerHeights[probe] - z - clearance;
                            }
                        }
                    }
                }
                // Several steep roof rows may round onto the same footprint pixel.
                // Bound the correction so a taller wall still shades its lower face.
                if (z) {
                    const contact = ground[(fy + z) * width + fx] - z;
                    clearance -= .5 + Math.max(0, Math.min(3, contact));
                }
                if (raised) {
                    const px = fx + raised.dx[z], py = fy + z + raised.dy[z];
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const distance = raised.heights[px * height + py] - z;
                        // Quantizing a curved surface can put neighboring pixels
                        // on the same ray. Allow the same tolerance as a solid roof.
                        const above = distance - (z ? 3.5 : 0);
                        if (above > 0 && above > clearance) {clearance = above; rayDistance = distance;}
                    }
                }
                // Preserve contact contrast and fade the far end of a long shadow.
                const distance = Math.min(1, rayDistance / 90);
                coverage[i] = 255 * light.strength * (1 - .28 * distance) * Math.min(1, clearance / (4 + 8 * distance));
            }
        }
        resolveCoverage(field, x, y, mask, coverage);
    }

    function resolveCoverage(field, x, y, mask, coverage) {
        const {width, face} = field;
        // A separable tent feathers the mask at native resolution. The two-pixel
        // border is traced in world coordinates so panning never changes its edges.
        // Keep elevated surfaces sharp against neighboring ground shadows.
        const stride = mask.width + 2 * feather;
        for (let row = 0; row < mask.height + 2 * feather; row++) {
            const line = row * stride;
            for (let col = 0; col < mask.width; col++) {
                const i = line + col, center = i + feather;
                const world = (y + row) * width + x + col + feather;
                if (!face[world] && !face[world - feather] && !face[world + feather]) {
                    coverage[i] = (coverage[i] + 4 * coverage[i + 1] + 6 * coverage[center]
                        + 4 * coverage[i + 3] + coverage[i + 4]) / 16;
                } else coverage[i] = coverage[center];
            }
        }
        for (let row = 0, pixel = 3; row < mask.height; row++) {
            for (let col = 0; col < mask.width; col++, pixel += 4) {
                const i = row * stride + col, center = i + feather * stride;
                const world = (y + row + feather) * width + x + col + feather;
                if (!face[world] && !face[world - feather * width] && !face[world + feather * width]) {
                    mask.data[pixel] = (coverage[i] + 4 * coverage[i + stride] + 6 * coverage[center]
                        + 4 * coverage[center + stride] + coverage[center + 2 * stride]) / 16;
                } else mask.data[pixel] = coverage[center];
            }
        }
    }

    function casterDraw(actor, spriteImages, scale) {
        if (actor.globalAlpha < .25 || actor.dissolve?.visible < .5) return;
        const draw = actor.drawData.find(part => part.shadowBody);
        if (!draw || !spriteImages[draw.spriteName]?.image) return;
        const width = Math.round(draw.dW / scale), height = Math.round(draw.dH / scale);
        if (width >= 1 && width <= 256 && height >= 1 && height <= 256) return draw;
    }

    class Pass {
        constructor(map, proxyAtlas) {
            this.map = map;
            this.tiles = new Map();
            this.sprites = new WeakMap();
            this.reader = new OffscreenCanvas(proxyAtlas?.width || 1, proxyAtlas?.height || 1);
            this.readContext = this.reader.getContext('2d', {willReadFrequently: true});
            if (proxyAtlas) {
                this.readContext.drawImage(proxyAtlas, 0, 0);
                this.atlas = this.readContext.getImageData(0, 0, proxyAtlas.width, proxyAtlas.height);
                // Keep only the decoded atlas. Reuse the small reader for actor frames.
                this.reader.width = this.reader.height = 1;
            }
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
            const pixels = ctx.getImageData(0, 0, width, height).data;
            return typeof body === 'string' ? makeActorStamp(pixels, width, height, body) : makeStamp(pixels, width, height, body);
        }

        tile(id) {
            if (!this.tiles.has(id)) this.tiles.set(id, readProxyTile(this.atlas, id));
            return this.tiles.get(id);
        }

        ownsPointBlocker(owner, scenery) {
            if (!owner) return false;
            if (owner.gid) {
                if (!this.map?.data) return false;
                const {tileX, tileY, gid} = owner;
                if (tileX < 0 || tileX >= this.map.width || tileY < 0) return false;
                const cell = this.map.data[tileY * this.map.width + tileX];
                return (Array.isArray(cell) ? cell.includes(gid) : cell === gid) && !!this.tile(gid);
            }
            return Number.isInteger(owner.rootX) && Number.isInteger(owner.rootY) &&
                scenery.some(tree => tree.rootX === owner.rootX && tree.rootY === owner.rootY);
        }

        sprite(image, sx, sy, sw, sh, width, height, body, flipY = false) {
            let frames = this.sprites.get(image);
            if (!frames) {frames = new Map(); this.sprites.set(image, frames);}
            const profile = typeof body === 'string' ? body : [body.base, body.front, body.slope, body.depth, !!body.raised];
            const key = [sx, sy, sw, sh, width, height, profile, flipY].join(',');
            if (!frames.has(key)) {
                if (frames.size >= 128) frames.delete(frames.keys().next().value);
                frames.set(key, this.read(image, sx, sy, sw, sh, width, height, body, flipY));
            }
            return frames.get(key);
        }

        terrain(left, top, width, height, scene) {
            const padX = this.map ? marginX : tileSize * 2, padY = this.map ? marginY : tileSize * 2;
            const x = Math.floor(left / cacheStep) * cacheStep - padX;
            const y = Math.floor(top / cacheStep) * cacheStep - padY;
            const stride = width + 2 * padX + cacheStep, rows = height + 2 * padY + maxHeight + cacheStep;
            const cached = this.staticField;
            if (cached && cached.x === x && cached.y === y && cached.width === stride && cached.height === rows && cached.sceneId === scene.id) return cached;
            const length = stride * rows;
            const field = {x, y, width: stride, height: rows, sceneId: scene.id,
                face: new Uint8Array(length), ground: new Uint8Array(length)};
            if (!this.map) { this.staticField = field; return field; }
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

        prepare(canvas, view, scene, actors, spriteImages, options, scenery, inspect = false) {
            const {width, height} = canvas;
            const left = -Math.round(-view.cameraX), top = -Math.round(-view.cameraY);
            const terrain = this.terrain(left, top, width, height, scene);
            if (!this.face || this.face.length !== terrain.face.length) {
                this.face = new Uint8Array(terrain.face.length);
                this.ground = new Uint8Array(terrain.ground.length);
            }
            this.face.set(terrain.face);
            if (options.shadows) this.ground.set(terrain.ground);
            else this.ground.fill(0);
            const raised = options.shadows ? terrain.raised : null;
            // Live scenery has its own placements, including swaying foliage.
            const field = {...terrain, face: this.face, ground: this.ground, raised: scenery.length && options.shadows ? [...(raised || [])] : raised};
            const dynamic = [];
            for (const tree of scenery) {
                const {image, width, height, body} = tree;
                const stamp = this.sprite(image, 0, 0, image.width, image.height, width, height, body);
                // Sorted trunks and foreground foliage are drawn after the
                // ground mask. Roots painted into the ground can receive it.
                place(field, stamp, tree.x, tree.y, tree.flipX, options.shadows, inspect || tree.receivesOnGround === true);
                if (options.shadows || tree.receivesOnGround) dynamic.push({stamp, x: Math.round(tree.x), y: Math.round(tree.y),
                    flip: !!tree.flipX, casts: options.shadows, receives: tree.receivesOnGround === true});
            }
            const scale = view.scale;
            for (const actor of actors) {
                const draw = casterDraw(actor, spriteImages, scale);
                if (!draw) continue;
                const image = spriteImages[draw.spriteName].image;
                const w = Math.round(draw.dW / scale), h = Math.round(draw.dH / scale);
                const flipX = actor.scaleX === -1, flipY = actor.scaleY === -1;
                const x = (actor.translateX + (flipX ? -draw.dx - draw.dW : draw.dx)) / scale;
                const y = (actor.translateY + (flipY ? -draw.dy - draw.dH : draw.dy)) / scale;
                const body = lowAnimals.has(draw.spriteName) ? 'low' : 'upright';
                const stamp = this.sprite(image, draw.sx, draw.sy, draw.sW, draw.sH, w, h, body, flipY);
                // Actors cast onto the world layer drawn underneath them. Their
                // visible pixels only belong in the diagnostic height image.
                const casts = draw.shadowBody === 'player' ? options.playerShadow : options.shadows;
                place(field, stamp, x, y, flipX, casts, inspect);
                dynamic.push({stamp, x: Math.round(x), y: Math.round(y), flip: flipX, casts, player: draw.shadowBody === 'player'});
            }
            this.pointFrame = {field, terrain, dynamic, scenery, left, top, width, height, sceneShadows: options.shadows};
            return this.pointFrame;
        }

        draw(canvas, view, scene, light, actors, spriteImages, options, scenery, inspect = false) {
            const {field, terrain, left, top, width, height} = this.prepare(canvas, view, scene, actors, spriteImages, options, scenery, inspect);
            if (!inspect && light.strength <= .001) return;
            if (!this.mask || this.mask.width !== width || this.mask.height !== height) {
                this.surface = new OffscreenCanvas(width, height);
                this.output = this.surface.getContext('2d');
                this.mask = this.output.createImageData(width, height);
                this.proxyPixels = null;
                this.shadowBuffers = shadowBuffers(terrain, this.mask);
                for (let i = 0; i < this.mask.data.length; i += 4) {
                    this.mask.data[i] = 24; this.mask.data[i + 1] = 32; this.mask.data[i + 2] = 52;
                }
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
            shade(field, left, top, this.mask, light, this.shadowBuffers);
            this.output.putImageData(this.mask, 0, 0);
            return this.surface;
        }

        pointMask(light, beam) {
            if (!this.pointPass) {
                if (!self.PointShadows) importScripts('point-shadows-worker.js');
                this.pointPass = new self.PointShadows.Pass();
            }
            return this.pointPass.mask(this.pointFrame, light, (bounds, source, highest) => this.pointField(light.owner, bounds, source, highest), beam);
        }

        pointField(owner, bounds, source, highest) {
            const frame = this.pointFrame;
            if (owner !== 'player' || !frame.dynamic.some(p => p.player && p.casts)) return frame.field;
            if (frame.heldField) return frame.heldField;
            // Only the carried light omits its carrier. Recompose the solid
            // cells so a mob or wall sharing the player's footprint still blocks.
            if (this.heldGround?.length !== frame.field.ground.length) this.heldGround = new Uint8Array(frame.field.ground.length);
            const {field} = frame;
            const left = bounds ? Math.max(0, Math.min(source.x, bounds.x) - field.x - 1) : 0;
            const right = bounds ? Math.min(field.width, Math.max(source.x, bounds.right) - field.x + 1) : field.width;
            const top = bounds ? Math.max(0, Math.min(source.y, bounds.y) - field.y - 1) : 0;
            const bottom = bounds ? Math.min(field.height, Math.max(source.y, bounds.bottom + highest) - field.y + 1) : field.height;
            for (let row = top; row < bottom; row++) {
                const start = row * field.width + left, end = row * field.width + right;
                if (frame.sceneShadows) this.heldGround.set(frame.terrain.ground.subarray(start, end), start);
                else this.heldGround.fill(0, start, end);
            }
            for (const p of frame.dynamic) {
                if (p.player || !p.casts || !p.stamp.ground.length) continue;
                const x = p.x - field.x, y = p.y - field.y + p.stamp.groundTop;
                if (x >= right || y >= bottom || x + p.stamp.width <= left || y + p.stamp.ground.length / p.stamp.width <= top) continue;
                blit(this.heldGround, field.width, field.height, p.stamp.ground, p.stamp.width, x, y, p.flip);
            }
            frame.heldField = {...frame.field, ground: this.heldGround};
            return frame.heldField;
        }
    }
    return {Pass, skyLight, casterClip, casterDraw, bodyHeight, makeStamp, makeActorStamp, readProxyTile, place, shade};
});

(function (factory) {
    if (typeof define === 'function' && define.amd) define(['watersurfaces'], factory);
    else if (typeof module === 'object' && module.exports) module.exports = factory(require('./watersurfaces'));
}(function (Water) {
    'use strict';

    // Neighbouring parts of a placed tree or building keep their relative positions in the tilesheet.
    function placedScenery(map, high, oceanTiles, seen, start, firstGid) {
        const {width, height, tilesetColumns: columns, data} = map, size = width * height;
        const parts = [];
        let left = start % width, right = left, top = Math.floor(start / width), bottom = top;
        function add(x, y, gid) {
            if (x < 0 || x >= width || y < 0 || y >= height || gid < 1 || oceanTiles.has(gid)) return;
            const index = y * width + x, stack = data[index];
            const overhead = high.has(gid);
            const placed = Array.isArray(stack) ? stack.indexOf(gid, overhead ? 0 : 1) >= 0 : overhead && stack === gid;
            if (!placed) return;
            const key = gid * size + index;
            if (seen.has(key)) return;
            seen.add(key);
            parts.push({x, y, gid});
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        add(start % width, Math.floor(start / width), firstGid);
        for (let i = 0; i < parts.length; i++) {
            const {x, y, gid} = parts[i], column = (gid - 1) % columns;
            if (column > 0) add(x - 1, y, gid - 1);
            if (column + 1 < columns) add(x + 1, y, gid + 1);
            add(x, y - 1, gid - columns);
            add(x, y + 1, gid + columns);
        }
        return {parts, area:{x:left, y:top, width:right-left+1, height:bottom-top+1}};
    }

    function overlapsArea(part, a) {
        return part.x >= a.x && part.x < a.x + a.width && part.y >= a.y && part.y < a.y + a.height;
    }

    class WaterReflections {
        constructor(map, field) {
            this.width = map.width;
            this.height = map.height;
            this.water = new Uint8Array(map.width * map.height);
            const oceanTiles = new Set();
            for (const a of field.wet) {
                if (a.kind === 'ocean') for (const gid of a.tiles) oceanTiles.add(gid);
                for (let y = 0; y < a.height; y++) {
                    const offset = (a.y + y) * map.width + a.x;
                    if (a.rows) {
                        const row = a.rows[y];
                        for (let i = 0; i < row.length; i += 2) this.water.fill(1, offset + row[i], offset + row[i + 1]);
                    } else this.water.fill(1, offset, offset + a.width);
                }
            }
            const manual = field.reflectionSources(map);
            this.sources = this.findScenery(map, field.scenery, oceanTiles).concat(manual);
        }

        // A cheap tile-level test; the worker clips the final pixels to the exact bank and dry decks.
        hasWater(x, y, width, height) {
            const left = Math.max(0, Math.floor(x)), right = Math.min(this.width, Math.ceil(x + width));
            const top = Math.max(0, Math.floor(y)), bottom = Math.min(this.height, Math.ceil(y + height));
            for (let row = top; row < bottom; row++) {
                const offset = row * this.width;
                for (let col = left; col < right; col++) if (this.water[offset + col]) return true;
            }
            return false;
        }

        reflectsActor(x, y) {
            const {width, height} = Water.actorMirror;
            return this.hasWater((x - width / 2) / Water.tile, y / Water.tile, width / Water.tile, height / Water.tile);
        }

        standsInWater({x,y,width,height}) {
            if (width < 2 || height < 2) return false;
            return (this.hasWater(x - 1, y + height - 1, 1, 1) && this.hasWater(x + width, y + height - 1, 1, 1)) ||
                (this.hasWater(x, y - 1, width, 1) && this.hasWater(x, y + height, width, 1));
        }

        scenerySource({area, parts}, high, overrides) {
            const {x, y, width, height} = area;
            if (width > Water.maxScenerySize || height > Water.maxScenerySize || !this.hasWater(x, y + height, width, height / 2)) return;
            // Untagged boats and dock sections have water on opposite sides. Sand transitions do not.
            if (!parts.some(p => high.has(p.gid)) && !this.standsInWater(area)) return;
            if (overrides.some(a => parts.some(p => overlapsArea(p, a)))) return;
            return {area, cells:parts.map(p => ({x:p.x-x, y:p.y-y, layers:[p.gid]}))};
        }

        findScenery(map, overrides, oceanTiles) {
            const result = [], high = new Set(map.high), seen = new Set();
            if (!map.tilesetColumns) return result;
            const limit = Water.maxScenerySize, size = map.width * map.height;
            const nextWater = new Int32Array(map.width).fill(map.height + limit * 2);
            for (let row = map.height - 1; row >= 0; row--) {
                for (let col = 0; col < map.width; col++) {
                    const i = row * map.width + col, stack = map.data[i];
                    if (this.water[i]) nextWater[col] = row;
                    if (!stack || nextWater[col] - row > limit * 1.5) continue;
                    const layered = Array.isArray(stack);
                    if (!layered && !high.has(stack)) continue;
                    const overOcean = layered && oceanTiles.has(stack[0]);
                    for (const gid of layered ? stack : [stack]) {
                        if ((!high.has(gid) && !overOcean) || oceanTiles.has(gid) || seen.has(gid * size + i)) continue;
                        const placement = placedScenery(map, high, oceanTiles, seen, i, gid);
                        const source = this.scenerySource(placement, high, overrides);
                        if (source) result.push(source);
                    }
                }
            }
            return result.sort((a,b) => (a.area.y + a.area.height) - (b.area.y + b.area.height));
        }
    }
    return WaterReflections;
}));

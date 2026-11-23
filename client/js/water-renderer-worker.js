// Water is drawn on the native world canvas. Positions, wake spacing and reflection bands are art pixels.
(function (root) {
    'use strict';
    const {tile, actorMirror, currents, bankRow, shore, immerse} = root.WaterSurfaces;
    const bounds = a => ({x: a.x * tile, y: a.y * tile, w: a.width * tile, h: a.height * tile});
    const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const grain = (x, y) => (Math.imul(x + 31, 73856093) ^ Math.imul(y + 17, 19349663)) >>> 0;
    const wrap = (value, span) => ((value % span) + span) % span;

    function oceanPath(area, left, top, right, bottom) {
        const path = new Path2D();
        let wet = false;
        for (let y = Math.max(0, top - area.y); y < Math.min(area.height, bottom - area.y); y++) {
            const row = area.rows[y];
            for (let i = 0; i < row.length; i += 2) {
                const start = Math.max(left, area.x + row[i]), end = Math.min(right, area.x + row[i + 1]);
                if (end <= start) continue;
                path.rect(start * tile, (area.y + y) * tile, (end - start) * tile, tile);
                wet = true;
            }
        }
        return wet ? path : null;
    }

    function visiblePath(surface, screen) {
        if (!surface.area.rows) return surface.path;
        // Cache a little beyond the viewport so camera movement reuses the same coastline clip.
        const block = 16 * tile;
        const left = Math.floor(screen.x / block), top = Math.floor(screen.y / block);
        const right = Math.ceil((screen.x + screen.w) / block), bottom = Math.ceil((screen.y + screen.h) / block);
        const cached = surface.clip;
        if (cached && cached.left === left && cached.top === top && cached.right === right && cached.bottom === bottom) return cached.path;
        const path = oceanPath(surface.area, left * 16, top * 16, right * 16, bottom * 16);
        surface.clip = {left, top, right, bottom, path};
        return path;
    }

    function footprint(area, inset = 0) {
        if (area.rows) return oceanPath(area, area.x, area.y, area.x + area.width, area.y + area.height) || new Path2D();
        const p = new Path2D(), box = bounds(area);
        const x = box.x + inset, y = box.y + inset, w = box.w - 2 * inset, h = box.h - 2 * inset;
        if (w <= 0 || h <= 0) return p;
        if (!['oval', 'natural'].includes(area.shape)) p.rect(x, y, w, h);
        else {
            // Whole-pixel scan lines keep the shore and its clip crisp at every zoom.
            for (let row = 0; row < h; row++) {
                const span = bankRow(area, y + row + .5, inset);
                const left = Math.ceil(span.left - .5), right = Math.ceil(span.right - .5);
                p.rect(left, y + row, right - left, 1);
            }
        }
        return p;
    }

    function reflectionBitmap(source, sheet, columns) {
        const {area, cells} = source, w = area.width * tile, h = area.height * tile;
        const image = new OffscreenCanvas(w, h), ctx = image.getContext('2d');
        const size = columns ? sheet.width / columns : tile;
        const stride = columns || Math.floor(sheet.width / size);
        ctx.imageSmoothingEnabled = false;
        for (const cell of cells) for (const gid of cell.layers) {
            const index = gid - 1;
            ctx.drawImage(sheet, index % stride * size, Math.floor(index / stride) * size, size, size,
                cell.x * tile, cell.y * tile, tile, tile);
        }
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(38,103,124,.51)';
        ctx.fillRect(0, 0, w, h);
        const mirror = new OffscreenCanvas(w, h / 2), out = mirror.getContext('2d');
        out.imageSmoothingEnabled = false;
        out.translate(0, h / 2);
        out.scale(1, -.5);
        out.drawImage(image, 0, 0);
        return mirror;
    }

    class Painter {
        constructor({wet, dry, sources, columns}) {
            this.columns = columns;
            const areas = wet.concat(dry);
            const width = Math.max(0, ...areas.map(a => (a.x + a.width) * tile));
            const height = Math.max(0, ...areas.map(a => (a.y + a.height) * tile));
            const paths = new Map(areas.map(a => [a, footprint(a)])), exclusions = new Map();
            function outside(area) {
                if (!exclusions.has(area)) {
                    const inverse = new Path2D(paths.get(area));
                    inverse.rect(0, 0, width, height);
                    exclusions.set(area, inverse);
                }
                return exclusions.get(area);
            }
            this.surfaces = wet.map((area, i) => {
                const box = bounds(area);
                const excluded = dry.concat(wet.slice(i + 1)).filter(other => overlaps(box, bounds(other)));
                return {area, box, path: paths.get(area), holes: excluded.map(outside),
                    shelves: area.paint ? [1, 3, 7].map(n => footprint(area, n)) : []};
            });
            this.sources = sources.map(s => ({...s, box: {x: s.area.x * tile, y: (s.area.y + s.area.height) * tile,
                w: s.area.width * tile, h: s.area.height * tile / 2}}));
            this.byId = new Map(this.surfaces.map(s => [s.area.id, s]));
            this.waists = new WeakMap();
            this.actors = new Map();
            this.marks = [];
        }
        standingWaist(sprite, groundOffset) {
            if (!sprite?.image || !sprite.animationData?.idle_down) return 10;
            if (this.waists.has(sprite)) return this.waists.get(sprite);
            const {width, height, sourceScale = 1} = sprite;
            // Read one standing frame once per skin. Weapons and moving attack frames cannot raise the waterline.
            let drop = 10;
            try {
                const canvas = this.measureCanvas ||= new OffscreenCanvas(1,1);
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d', {willReadFrequently:true});
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(sprite.image, 0, sprite.animationData.idle_down.row * height * sourceScale,
                    width * sourceScale, height * sourceScale, 0, 0, width, height);
                const rgba = ctx.getImageData(0,0,width,height).data;
                let top = height, bottom = -1;
                for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
                    if (rgba[(y * width + x) * 4 + 3] < 32) continue;
                    top = Math.min(top, y); bottom = y; break;
                }
                if (bottom > top) drop = Math.max(0, 15 - sprite.offsetY - groundOffset - (top + bottom + 1) / 2);
            } catch (_) { /* A cross-origin sheet can still render with the standard Looper waist. */ }
            this.waists.set(sprite, drop);
            return drop;
        }
        prepare(view, sprites) {
            const bob = !view.reducedMotion && Math.sin(view.healthTime / 290) > .4 ? 1 : 0;
            for (const actor of view.entityData) if (actor.immersion !== undefined) {
                const waist = this.standingWaist(sprites[actor.waterBody], actor.groundOffsetY || 0);
                immerse(actor, actor.immersion, view.scale, actor.immersion > .75 ? bob : 0, waist);
            }
        }
        mark(type, x, y, now, dx = 0, dy = 0) {
            this.marks.push({type, x, y, now, dx, dy});
            if (this.marks.length > 96) this.marks.shift();
        }
        track(actors, now, reduced) {
            if (reduced) { this.marks.length = 0; this.actors.clear(); return; }
            const seen = new Set();
            this.marks = this.marks.filter(m => now >= m.now && now - m.now < 950);
            for (const actor of actors) {
                if (actor.waterPlayer == null) continue;
                const id = actor.waterPlayer, x = actor.waterX, y = actor.waterY, wet = actor.immersion !== undefined;
                seen.add(id);
                const last = this.actors.get(id), dx = x - (last?.x ?? x), dy = y - (last?.y ?? y);
                const distance = Math.hypot(dx, dy);
                const next = {x, y, wet, now, travel: 0, lastMark: now};
                if (last && now >= last.now && now - last.now < 250 && distance <= 24) {
                    next.lastMark = last.lastMark;
                    if (wet !== last.wet) {
                        this.mark('splash', wet ? x : last.x, wet ? y : last.y, now);
                        next.lastMark = now;
                    } else if (wet && distance > 0) {
                        next.travel = last.travel + distance;
                        if (next.travel >= 7) {
                            this.mark('wake', x, y, now, dx / distance, dy / distance);
                            next.travel %= 7;
                            next.lastMark = now;
                        }
                    } else if (wet && now - last.lastMark > 1550) {
                        this.mark('idle', x, y, now);
                        next.lastMark = now;
                    } else next.travel = last.travel;
                }
                this.actors.set(id, next);
            }
            for (const id of this.actors.keys()) if (!seen.has(id)) this.actors.delete(id);
        }
        ground(ctx, view, sheet, drawPart) {
            const screen = {x: Math.round(view.cameraX), y: Math.round(view.cameraY), w: ctx.canvas.width, h: ctx.canvas.height};
            const visible = this.surfaces.filter(surface => overlaps(screen, surface.box));
            if (!visible.length) { this.actors.clear(); this.marks.length = 0; return; }
            const now = view.healthTime, tick = view.reducedMotion ? 0 : Math.floor(now / 125);
            this.track(view.entityData, now, view.reducedMotion);
            ctx.save();
            ctx.translate(-screen.x, -screen.y);
            for (const surface of visible) {
                const {area, box, holes, shelves} = surface;
                const path = visiblePath(surface, screen);
                if (!path) continue;
                ctx.save();
                ctx.clip(path);
                for (const hole of holes) ctx.clip(hole, 'evenodd');
                if (area.paint) {
                    ctx.fillStyle = '#4e7869'; ctx.fill(path);
                    ctx.fillStyle = '#78af9d'; ctx.fill(shelves[0]);
                    ctx.fillStyle = '#67a8ac'; ctx.fill(shelves[1]);
                    ctx.fillStyle = '#4f94ab'; ctx.fill(shelves[2]);
                    // Broken sky bands give the pool depth, with the darkest water under the far bank.
                    ctx.save(); ctx.clip(shelves[1]);
                    const bandLeft = Math.max(box.x, Math.floor(screen.x / 4) * 4), bandRight = Math.min(box.x + box.w, screen.x + screen.w);
                    for (let x = bandLeft; x < bandRight; x += 4) {
                        const d = Math.round(2 * Math.sin(x / 13) + Math.sin(x / 6));
                        ctx.fillStyle = '#43869e'; ctx.fillRect(x, box.y, 4, Math.round(box.h * .51) + d);
                        ctx.fillStyle = '#3d7d95'; ctx.fillRect(x, box.y, 4, Math.round(box.h * .23) + d);
                    }
                    ctx.restore();
                }
                this.drawScenery(ctx, box, screen, sheet, tick, area.kind === 'stream');
                for (const actor of view.entityData) {
                    if (!actor.waterMirror) continue;
                    const silhouette = {x: actor.waterX - actorMirror.width/2, y: actor.waterY, w: actorMirror.width, h: actorMirror.height};
                    if (overlaps(silhouette, box)) this.drawMirror(ctx, actor, view.scale, tick, drawPart);
                }
                this.surfaceDetails(ctx, area, box, screen, tick);
                for (const mark of this.marks) this.drawMark(ctx, mark, area, now);
                ctx.restore();
            }
            ctx.restore();
        }
        drawScenery(ctx, box, screen, sheet, tick, flowing) {
            if (this.sheet !== sheet) {
                for (const s of this.sources) s.image = null;
                this.sheet = sheet;
            }
            for (const source of this.sources) {
                if (!overlaps(screen, source.box) || !overlaps(box, source.box)) continue;
                const {x, y, w, h} = source.box;
                const image = source.image ||= reflectionBitmap(source, sheet, this.columns);
                for (let row = 0; row < h; row += 2) {
                    const disturbed = this.marks.some(m => m.type !== 'idle' && Math.abs(m.y - y - row) < 6 && m.x >= x - 5 && m.x < x + w + 5);
                    const offset = row < 3 ? 0 : Math.round(Math.sin(row * .31 + tick * .24) * (disturbed || flowing ? 2 : 1));
                    ctx.globalAlpha = .63 - .33 * row / h;
                    const band = row > 6 && (row / 2 + (flowing ? 1 : 0)) % 5 === 0 ? 1 : 2;
                    ctx.drawImage(image, 0, row, w, band, x + offset, y + row, w, band);
                }
            }
            ctx.globalAlpha = 1;
        }
        drawMirror(ctx, actor, scale, tick, drawPart) {
            const canvas = this.actorMirror ||= new OffscreenCanvas(64, 64), ink = canvas.getContext('2d');
            ink.clearRect(0, 0, 64, 64);
            ink.save();
            ink.imageSmoothingEnabled = false;
            ink.translate(32 + actor.translateX / scale - actor.waterX, 60 + actor.translateY / scale - actor.waterY);
            ink.scale((actor.scaleX || 1) / scale, (actor.scaleY || 1) / scale);
            for (const part of actor.drawData) {
                if (!part.renderAbove && part.spriteName !== 'shadow16') drawPart(ink, actor, part, scale);
            }
            ink.restore();
            const x = Math.round(actor.waterX) - 32, y = Math.round(actor.waterY);
            for (let row = 0; row < actorMirror.height; row++) {
                if (row > 5 && row % 4 === 1) continue;
                ctx.globalAlpha = (actor.globalAlpha ?? 1) * (.34 - .016 * row);
                const shift = row < 2 ? 0 : Math.round(Math.sin(row * .55 + tick * .28));
                ctx.drawImage(canvas, 0, 58 - row * 2, 64, 2, x + shift, y + row, 64, 1);
            }
            ctx.globalAlpha = 1;
        }
        surfaceDetails(ctx, area, box, screen, tick) {
            const flow = currents[area.flow] || [0, 0], stream = area.kind === 'stream';
            const cell = 26, phase = stream ? tick % cell : 0;
            const left = Math.max(box.x, screen.x), top = Math.max(box.y, screen.y);
            const right = Math.min(box.x + box.w, screen.x + screen.w), bottom = Math.min(box.y + box.h, screen.y + screen.h);
            for (let gy = Math.floor(top / cell) - 1; gy <= bottom / cell + 1; gy++) {
                for (let gx = Math.floor(left / cell) - 1; gx <= right / cell + 1; gx++) {
                    // Advect a stable world-space lattice in the current, including across cell boundaries.
                    const cycle = stream ? Math.floor(tick / cell) : 0;
                    const seed = grain(gx - cycle * flow[0], gy - cycle * flow[1]);
                    const x = gx * cell + seed % 23 + flow[0] * phase, y = gy * cell + (seed >>> 8) % 23 + flow[1] * phase;
                    if (x < left - 5 || x > right || y < top - 3 || y > bottom) continue;
                    if (area.paint && !stream) {
                        const edge = shore(area, x + .5, y + .5);
                        if (edge > 1 && edge < 8) {
                            ctx.fillStyle = '#4e8c90'; ctx.fillRect(x, y, 4, 2);
                            ctx.fillStyle = '#83b4aa'; ctx.fillRect(x + 1, y, 2, 1);
                            ctx.fillStyle = '#76aaa2'; ctx.fillRect(x + 5, y - 2, 2, 1);
                        }
                    }
                    const light = wrap(tick + seed % 57, 24);
                    if (stream && seed % 7 === 0) {
                        ctx.fillStyle = '#bfc277'; ctx.fillRect(x, y, 3, 1);
                        ctx.fillStyle = '#819653'; ctx.fillRect(x + 1, y - 1, 2, 1);
                    } else if (light < 8 || stream) {
                        ctx.fillStyle = stream ? 'rgba(187,229,216,.61)' : 'rgba(190,230,210,.58)';
                        ctx.fillRect(x, y, flow[1] ? 1 : 3 + (light < 4 ? 2 : 0), flow[1] ? 3 : 1);
                        if (light < 3) ctx.fillRect(x + 2, y + 1, 1, 1);
                    }
                }
            }
        }
        drawMark(ctx, mark, area, now) {
            if (shore(area, mark.x, mark.y) < -1) return;
            const p = (now - mark.now) / 950, flow = currents[area.flow] || [0, 0];
            const x = Math.round(mark.x + flow[0] * p * 5), y = Math.round(mark.y + flow[1] * p * 5);
            ctx.fillStyle = 'rgba(211,240,222,' + ((1 - p) * .8) + ')';
            if (mark.type === 'wake') {
                for (const side of [-1, 1]) for (let i = 1; i < 5; i++) {
                    const back = i + p * 3, spread = side * (i + 2 + 4 * p);
                    ctx.fillRect(x + Math.round(-mark.dx * back - mark.dy * spread),
                        y + Math.round(-mark.dy * back + mark.dx * spread * .65), 2, 1);
                }
            } else {
                const radius = (mark.type === 'splash' ? 4 : 2) + Math.round(p * (mark.type === 'splash' ? 11 : 7));
                for (let i = 0; i < 24; i++) {
                    if ((i + radius) % 7 < 2) continue;
                    const angle = i * Math.PI / 12;
                    ctx.fillRect(x + Math.round(Math.cos(angle) * radius), y + Math.round(Math.sin(angle) * radius * .47), 2, 1);
                }
            }
        }
        contact(ctx, actor, view) {
            const x = Math.round(actor.waterX), y = Math.round(actor.waterY);
            ctx.save();
            ctx.scale(view.scale, view.scale);
            ctx.translate(-Math.round(view.cameraX), -Math.round(view.cameraY));
            const surface = this.byId.get(actor.waterArea);
            if (surface && actor.immersion < .55) {
                ctx.clip(surface.clip?.path || surface.path);
                for (const hole of surface.holes) ctx.clip(hole, 'evenodd');
            }
            ctx.globalAlpha = (actor.globalAlpha ?? 1) * Math.min(1, actor.immersion * 3);
            ctx.fillStyle = '#427f8d'; ctx.fillRect(x - 5, y, 10, 1);
            ctx.fillStyle = '#c0e4d6'; ctx.fillRect(x - 4, y, 3, 1); ctx.fillRect(x + 2, y, 3, 1);
            ctx.fillRect(x - 6, y - 1, 2, 1); ctx.fillRect(x + 5, y - 1, 2, 1);
            ctx.restore();
        }
    }
    root.WaterPainter = Painter;
}(self));

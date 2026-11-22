(function (root, factory) {
    if (typeof define === 'function' && define.amd) define(factory);
    else if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.WaterSurfaces = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const tile = 16;
    const currents = {east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1]};
    function validate(areas, map) {
        const fail = message => { throw Object.assign(new Error(message), {status: 400}); };
        if (!Array.isArray(areas) || areas.length > 100) fail('Choose up to 100 water areas.');
        const ids = new Set();
        for (const a of areas) {
            if (!a || !['pond', 'stream', 'dry', 'reflection'].includes(a.kind)) fail('Choose a valid water area type.');
            const wet = a.kind === 'pond' || a.kind === 'stream';
            const keys = ['id', 'name', 'kind', 'x', 'y', 'width', 'height'];
            if (wet) keys.push('depth', 'paint');
            if (a.kind !== 'reflection') keys.push('shape');
            if (a.kind === 'stream') keys.push('flow');
            if (Object.keys(a).some(k => !keys.includes(k))) fail('Unsupported water area field.');
            if (typeof a.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(a.id) || ids.has(a.id)) fail('Water areas need unique IDs.');
            ids.add(a.id);
            if (typeof a.name !== 'string' || !a.name.trim() || a.name.length > 100 || /[<>\x00-\x1f]/.test(a.name)) fail('Give each water area a plain-text name.');
            if (![a.x,a.y,a.width,a.height].every(Number.isSafeInteger) || a.x < 0 || a.y < 0 || a.width < 1 || a.height < 1 ||
                a.x + a.width > map.width || a.y + a.height > map.height) fail('Draw the water area within the map.');
            if (a.kind === 'reflection' && (a.width > 12 || a.height > 12)) fail('Choose scenery up to 12 by 12 tiles for each reflection.');
            if (a.shape !== undefined && !['natural','oval','rect'].includes(a.shape)) fail('Choose a natural shoreline, oval or rectangle.');
            if (wet && (!['swim','wade'].includes(a.depth) || typeof a.paint !== 'boolean')) fail('Choose the water depth and artwork.');
            if (a.kind === 'stream' && !Object.hasOwn(currents, a.flow)) fail('Choose a stream direction.');
        }
    }

    // A cross section of the bank. The rendered outline and foot sampling use the same curve.
    function bankRow(a, y, inset = 0) {
        const rx = a.width * tile / 2 - inset, ry = a.height * tile / 2 - inset;
        const cx = (a.x + a.width / 2) * tile, cy = (a.y + a.height / 2) * tile;
        const v = (y - cy) / ry;
        if (rx <= 0 || ry <= 0 || Math.abs(v) >= 1) return null;
        const natural = a.shape === 'natural';
        const center = cx + (natural ? rx * (.13 * Math.sin(v * 4 + .8) + .04 * Math.sin(v * 9)) : 0);
        const radius = rx * Math.sqrt(1 - v * v) * (natural ? .87 + .07 * Math.sin(v * 7 - .6) : 1);
        return {left: Math.max(cx - rx, center - radius), right: Math.min(cx + rx, center + radius)};
    }

    function shore(a, x, y) {
        const rx = a.width * tile / 2, ry = a.height * tile / 2;
        const dx = Math.abs(x - a.x * tile - rx), dy = Math.abs(y - a.y * tile - ry);
        if (a.shape === 'natural') {
            const span = bankRow(a, y);
            return span ? Math.min(x - span.left, span.right - x, ry - dy) : Math.min(rx - dx, ry - dy);
        }
        if (a.shape === 'oval') return (1 - Math.hypot(dx / rx, dy / ry)) * Math.min(rx, ry);
        return Math.min(rx - dx, ry - dy);
    }

    class Field {
        constructor(areas) {
            this.wet = areas.filter(a => a.kind === 'pond' || a.kind === 'stream');
            this.dry = areas.filter(a => a.kind === 'dry');
            this.scenery = areas.filter(a => a.kind === 'reflection');
        }
        sample(x, y) {
            // When zones overlap the last water area wins. A deck always supports dry feet.
            for (let i = this.wet.length - 1; i >= 0; i--) {
                const area = this.wet[i];
                let distance = shore(area, x, y);
                if (distance <= 0) continue;
                for (const deck of this.dry) distance = Math.min(distance, -shore(deck, x, y));
                if (distance <= 0) return null;
                return {area, depth: Math.min(1, distance / 18) * (area.depth === 'wade' ? .3 : 1)};
            }
            return null;
        }
        reflectionSources(map) {
            return this.scenery.map(area => {
                const cells = [];
                for (let y = 0; y < area.height; y++) for (let x = 0; x < area.width; x++) {
                    const stack = map.data[(area.y + y) * map.width + area.x + x];
                    // Map exports store the ground first, then the prop layers in paint order.
                    const layers = Array.isArray(stack) ? stack.slice(1) : map.high?.includes(stack) ? [stack] : [];
                    if (layers.length) cells.push({x, y, layers});
                }
                return {area, cells};
            });
        }
    }

    // All equipped layers share the standing foot anchor, including flipped facing and recoil.
    function immerse(actor, depth, scale, bob, waistDrop = 10) {
        const sign = actor.scaleY === -1 ? -1 : 1;
        const line = (actor.waterY - actor.translateY / scale) * scale * sign;
        const sink = Math.round(waistDrop * depth + bob) * scale * sign;
        actor.drawData = actor.drawData.filter(part => {
            if (part.renderAbove) return true;
            if (part.spriteName === 'shadow16') return false;
            delete part.shadowBody;
            part.dy += sink;
            const top = sign === 1 ? 0 : Math.max(0, line - part.dy);
            const end = sign === 1 ? Math.min(part.dH, line - part.dy) : part.dH;
            if (end <= top || part.dH <= 0) return false;
            const ratio = part.sH / part.dH;
            part.dy += top;
            part.sy += top * ratio;
            part.sH = (end - top) * ratio;
            part.dH = end - top;
            return true;
        });
    }
    return {tile, currents, validate, bankRow, shore, Field, immerse};
}));

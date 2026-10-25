(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.MapmakerLighting = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const propertyNames = ['intensity', 'color', 'radius', 'innerRadius', 'spread', 'innerSpread', 'angle', 'shadow', 'animation'];
    function light(row, tilesize) {
        const result = {id: Number(row.id), x: parseInt(row.x), y: parseInt(row.y)};
        if (row.shape === 'ellipse') {
            result.x += parseInt(row.width) / 2;
            result.y += parseInt(row.height) / 2;
            result.radius = Math.ceil(parseInt(row.width) / 2 / tilesize);
        } else Object.assign(result, {global: true, w: row.width, h: row.height});
        for (const [name, value] of Object.entries(row.properties || {})) {
            if (value === null || value === undefined || value === '') continue;
            const key = name === 'light' ? 'intensity' : name;
            if (!propertyNames.includes(key)) continue;
            if (key === 'color') {
                const [r, g, b] = String(value).split(',').map(Number);
                result.color = {r, g, b};
            } else if (key === 'animation') result.animation = value;
            else result[key] = ['intensity', 'shadow'].includes(key)
                ? parseFloat(String(value).replace(',', '.')) : parseInt(value);
        }
        return result;
    }
    function obstacle(row) {
        if (row.shape === 'polygon') return {x: row.x, y: row.y, polygon: {points: row.points}};
        return {x: row.x, y: row.y, width: row.width, height: row.height};
    }
    function preset(type, x, y, size = 16) {
        const shadow = type.startsWith('shadow');
        const row = {id: null, kind: shadow ? 'shadow' : 'light', name: '', shape: 'rectangle',
            x: x * size, y: y * size, width: size * 2, height: size * 2, properties: {}};
        if (type === 'shadow-polygon') {
            row.shape = 'polygon'; row.width = row.height = 0;
            row.points = `0,0 ${size * 2},0 ${size * 2},${size * 2} 0,${size * 2}`;
        } else if (!shadow) {
            row.name = type === 'torch' ? 'Torch' : type === 'area' ? 'Area light' : 'Lamp';
            row.properties = {intensity: '0.8', color: type === 'torch' ? '255,180,90' : '255,245,220', shadow: type === 'area' ? '0' : '0.8'};
            if (type !== 'area') {
                row.shape = 'ellipse'; row.width = row.height = size * 8;
                row.x -= row.width / 2; row.y -= row.height / 2;
                if (type === 'torch') row.properties.animation = 'fire';
            }
        }
        return row;
    }
    function position(row, dimensions) {
        const centered = row.kind === 'light' && row.shape === 'ellipse';
        return {x: (row.x + (centered ? row.width / 2 : 0)) / dimensions.tilewidth,
            y: (row.y + (centered ? row.height / 2 : 0)) / dimensions.tileheight};
    }
    function move(row, point, dimensions) {
        const centered = row.kind === 'light' && row.shape === 'ellipse';
        const x = Math.max(0, Math.min(dimensions.width * dimensions.tilewidth - 1, Math.round(point.x * dimensions.tilewidth)));
        const y = Math.max(0, Math.min(dimensions.height * dimensions.tileheight - 1, Math.round(point.y * dimensions.tileheight)));
        row.x = x - (centered ? row.width / 2 : 0);
        row.y = y - (centered ? row.height / 2 : 0);
        return row;
    }
    function setRadius(row, radius) {
        radius = Math.max(1, Math.min(64, Math.round(radius)));
        const inner = Number(row.properties.innerRadius || 0);
        row.properties.radius = String(radius);
        if (inner > radius) row.properties.innerRadius = String(radius);
        return radius;
    }
    function hit(objects, selected, context, dimensions) {
        const current = objects.find(row => row === selected);
        if (current?.kind === 'light' && current.shape === 'ellipse') {
            const p = position(current, dimensions), handle = context.project({x: p.x + light(current, dimensions.tilewidth).radius, y: p.y});
            if (Math.hypot(handle.x - context.screen.x, handle.y - context.screen.y) <= 10) return {row: current, kind: 'radius'};
        }
        return objects.map(row => {
            const p = context.project(position(row, dimensions));
            return {row, distance: Math.hypot(p.x - context.screen.x, p.y - context.screen.y)};
        }).filter(target => target.distance <= 14).sort((a, b) => a.distance - b.distance).map(target => ({row: target.row, kind: 'move'}))[0];
    }
    return {light, obstacle, preset, propertyNames, position, move, setRadius, hit};
});

(function (root, factory) {
    if (typeof define === 'function' && define.amd) define(factory);
    else if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.AmbientConfig = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const presets = {
        campfire: {file: 'campfire.wav', name: 'Campfire', radius: 9, volume: .55, description: 'Warm embers with small, irregular crackles.'},
        water: {file: 'water.wav', name: 'Flowing water', radius: 12, volume: .45, description: 'A stream, fountain or waterfall.'},
        surf: {file: 'surf.wav', name: 'Sea shore', radius: 22, volume: .45, description: 'Slow waves washing onto the shore.'},
        wind: {file: 'wind.wav', name: 'Wind', radius: 18, volume: .3, description: 'Soft gusts around exposed ground and trees.'},
        birds: {file: 'birds.wav', name: 'Birds', radius: 16, volume: .35, description: 'Sparse birdsong around a tree or grove.'},
        lava: {name: 'Lava', radius: 12, volume: .45, description: 'Low rumbling and bubbling near molten rock.'}
    };
    function uploadFile(preset) {
        return typeof preset === 'string' && /^upload:([a-z0-9][a-z0-9-]{0,47}--[a-f0-9]{64}\.wav)$/.exec(preset)?.[1] || null;
    }
    function validate(entries, map) {
        const fail = message => {throw Object.assign(new Error(message), {status: 400});};
        if (!Array.isArray(entries) || entries.length > 100) fail('Use at most 100 ambient sound sources per map.');
        const ids = new Set();
        for (const row of entries) {
            if (!row || Object.keys(row).some(key => !['id', 'name', 'preset', 'x', 'y', 'radius', 'volume'].includes(key))) fail('Ambient sound contains unsupported fields.');
            if (typeof row.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(row.id) || ids.has(row.id)) fail('Ambient source IDs must be unique letters, numbers, underscores or hyphens.');
            ids.add(row.id);
            if (typeof row.name !== 'string' || !row.name.trim() || row.name.length > 120 || /[<>\u0000-\u001f]/.test(row.name)) fail('Give each ambient sound a plain-text name (up to 120 characters).');
            if (!Object.hasOwn(presets, row.preset) && !uploadFile(row.preset)) fail('Choose an ambient sound preset or uploaded clip.');
            if (uploadFile(row.preset) && map?.customSounds && !map.customSounds.some(sound => sound.id === row.preset)) fail('This uploaded sound is missing. Upload it again or choose another sound.');
            for (const key of ['x', 'y']) if (!Number.isInteger(row[key]) || row[key] < 0 || row[key] >= (map?.[key === 'x' ? 'width' : 'height'] ?? 10000)) fail('Place ambient sounds on a tile inside the map.');
            if (!Number.isFinite(row.radius) || row.radius < 1 || row.radius > 64) fail('Sound radius must be between 1 and 64 tiles.');
            if (!Number.isFinite(row.volume) || row.volume < 0 || row.volume > 1) fail('Sound volume must be between 0 and 1.');
        }
        return entries;
    }
    // Positions use tile origins on both sides, so the half-tile centers cancel out.
    function spatial(source, listener) {
        const dx = source.x - listener.x, dy = source.y - listener.y;
        const distance = Math.hypot(dx, dy), radius = source.radius;
        const t = Math.max(0, Math.min(1, 1 - distance / radius));
        return {gain: source.volume * t * t * (3 - 2 * t), pan: Math.max(-.9, Math.min(.9, dx / Math.max(3, radius * .65)))};
    }
    return {presets, uploadFile, validate, spatial};
}));

// Shared authoring contract: AMD client, renderer worker and map/server tooling.
(function (root, factory) {
    if (typeof define === 'function' && define.amd) define([], factory);
    else if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.WorldFxConfig = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
    const names = {stage: 'Tile-stage particles', loot: 'Loot bounce',
        fireflies: 'Reactive fireflies', leaves: 'Leaf wake', heat: 'Heat shimmer', ambience: 'Ambience particles'};
    const defaults = Object.fromEntries(Object.keys(names).map(name => [name, true]));
    const presets = {
        soil: {colors: ['#8c5c3b', '#c69765', '#e6bc80'], count: 18, speed: 28, gravity: 85, lifetimeMs: 650, spread: 12, size: 2},
        leaves: {colors: ['#729b45', '#a9bb55', '#d3c779'], count: 16, speed: 22, gravity: 28, lifetimeMs: 900, spread: 12, size: 2},
        water: {colors: ['#8ac9e6', '#c0e7ed', '#f0f4dd'], count: 18, speed: 32, gravity: 100, lifetimeMs: 600, spread: 10, size: 2},
        pollen: {colors: ['#dedaa9', '#e8bc62', '#f5e7b0'], count: 14, speed: 14, gravity: -8, lifetimeMs: 1000, spread: 12, size: 1},
        sparks: {colors: ['#ffb13b', '#fff2bf', '#d78940'], count: 20, speed: 32, gravity: 40, lifetimeMs: 700, spread: 10, size: 2},
    };
    const ambience = {forest: [{type: 'leaves', count: 9}, {type: 'pollen', count: 4}], meadow: [{type: 'pollen', count: 12}],
        fireflies: [{type: 'fireflies', count: 14}], beach: [{type: 'sand', count: 8}, {type: 'spray', count: 4}],
        cave: [{type: 'dust', count: 8}, {type: 'mist', count: 3}], campfire: [{type: 'embers', count: 10}], none: []};
    const types = ['fireflies', 'leaves', 'pollen', 'dust', 'gusts', 'spray', 'sand', 'embers', 'ash', 'mist', 'custom'];
    const shapes = ['pixel', 'spark', 'star', 'soft'];
    const customDefaults = {colors: ['#b7dfff', '#ffffff'], shape: 'pixel', size: 2, opacity: 0.8,
        velocityX: 3, velocityY: 8, sway: 6, pulse: 0.2, glow: 0, spin: 0};
    function number(value, fallback, min, max, key, integer = false) {
        if (value === undefined) return fallback;
        if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error('Invalid particle ' + key);
        return value;
    }
    function parse(value) {
        if (typeof value !== 'string') return value;
        const text = value.trim();
        return /^[\[{]/.test(text) || ['false', 'true'].includes(text) ? JSON.parse(text) : text;
    }
    function burst(value = 'soil') {
        value = parse(value);
        if (value === false) return null;
        if (typeof value === 'string') value = {preset: value};
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Particles need a preset, object, or false');
        const preset = value.preset || 'soil', base = presets[preset];
        if (!base) throw new Error('Unknown particle preset: ' + preset);
        for (const key of Object.keys(value)) if (!['preset', 'colors', 'count', 'speed', 'gravity', 'lifetimeMs', 'spread', 'size', 'design'].includes(key)) throw new Error('Unknown particle setting: ' + key);
        const design = value.design === undefined ? null : custom(value.design);
        const colors = design ? design.colors : value.colors ?? base.colors;
        if (!Array.isArray(colors) || !colors.length || colors.length > 6 || colors.some(color => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) throw new Error('Particles need 1–6 hex colors');
        return {preset, colors: colors.slice(), count: number(value.count, base.count, 0, 48, 'count', true),
            speed: number(value.speed, base.speed, 0, 100, 'speed'), gravity: number(value.gravity, base.gravity, -100, 250, 'gravity'),
            lifetimeMs: number(value.lifetimeMs, base.lifetimeMs, 100, 2000, 'lifetimeMs'), spread: number(value.spread, base.spread, 0, 40, 'spread'),
            size: design ? design.size : number(value.size, base.size, 1, 4, 'size', true), ...(design ? {design} : {})};
    }
    function ambient(value) {
        value = parse(value);
        if (value === false || value === 'none') return [];
        if (typeof value === 'string') {
            if (ambience[value]) return ambience[value].map(effect => ({...effect}));
            value = [{type: value, count: 8}];
        }
        if (!Array.isArray(value) || value.length > 3 || value.some(effect => !effect || !types.includes(effect.type) ||
            !Number.isInteger(effect.count) || effect.count < 1 || effect.count > 24) || value.reduce((sum, e) => sum + e.count, 0) > 24) throw new Error('Ambience needs up to 3 effects and 24 particles per patch');
        return value.map(effect => ({type: effect.type, count: effect.count,
            ...(effect.nightOpacity === undefined ? {} : {nightOpacity: number(effect.nightOpacity, 1, 0, 1, 'night opacity')}),
            ...(effect.type === 'custom' ? {design: custom(effect.design)} : {})}));
    }
    function custom(value = {}) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Custom particle design must be an object');
        for (const key of Object.keys(value)) if (!Object.hasOwn(customDefaults, key)) throw new Error('Unknown custom particle setting: ' + key);
        const colors = value.colors ?? customDefaults.colors, shape = value.shape ?? customDefaults.shape;
        if (!Array.isArray(colors) || !colors.length || colors.length > 6 || colors.some(color => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) throw new Error('Custom particles need 1–6 hex colors');
        if (!shapes.includes(shape)) throw new Error('Choose a supported custom particle shape');
        const result = {colors: colors.slice(), shape};
        for (const [key, min, max, integer] of [['size',1,8,true],['opacity',0,1],['velocityX',-80,80],
            ['velocityY',-80,80],['sway',0,32],['pulse',0,1],['glow',0,24],['spin',-6,6]]) {
            result[key] = number(value[key], customDefaults[key], min, max, key, integer);
        }
        return result;
    }
    function stageBurst(config, stage) {
        config = parse(config);
        if (config === false || config?.enabled === false) return null;
        const defaults = {prepare: 'soil', plant: 'leaves', water: 'water', grow: 'pollen', harvest: 'leaves'};
        return burst(config?.stages?.[stage] ?? config?.stages?.default ?? defaults[stage] ?? 'soil');
    }
    function rectangles(value) {
        if (value === undefined) return [];
        if (!Array.isArray(value) || value.length > 128 || value.some(rect => !rect ||
            !['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])) || rect.width <= 0 || rect.height <= 0 || rect.width > 1024 || rect.height > 1024)) throw new Error('FX regions need bounded x/y/width/height rectangles in map pixels');
        return value.map(({x, y, width, height}) => ({x, y, width, height}));
    }
    function scenery(value = {}) {
        value = parse(value);
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Scene FX must be an object');
        const result = {enabled: toggles(value.enabled)};
        if (value.fires !== undefined) result.fires = rectangles(value.fires);
        return result;
    }
    function toggles(value) {
        if (value === undefined) return {};
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
            Object.entries(value).some(([key, enabled]) => !(key in names) || typeof enabled !== 'boolean')) throw new Error('FX enabled values must be named boolean toggles');
        return {...value};
    }
    return {names, defaults, presets, ambience, types, shapes, customDefaults, custom, number, parse, burst, ambient, stageBurst, scenery, toggles};
});

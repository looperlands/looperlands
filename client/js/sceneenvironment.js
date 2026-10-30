// Shared authoring contract. Renderers accept only bounded, local scene effects.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SceneEnvironment = factory();
})(typeof self !== 'undefined' ? self : null, function () {
    const assets = ['clouds', 'mist', 'canopy', 'forest-roots', 'forest-trunk', 'forest-canopy-lower',
        'forest-canopy-upper', 'desert-dust', 'volcanic-smoke', 'embers', 'meadow-seeds', 'lava-depth', 'dragon-shadow', 'bird-shadow'];
    const validImage = image => typeof image === 'string' && /^\/img\/parallax\/[a-z0-9][a-z0-9-]{0,79}\.png$/.test(image);
    const types = ['clear', 'rain', 'sunrays', 'cloudy'];
    const planes = ['background', 'ground', 'entities', 'foreground'];
    function fail(message) {throw Object.assign(new Error(message), {status: 400});}
    function fields(value, keys, label) {
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail(label + ' contains unsupported fields.');
    }
    function number(value, min, max, label, integer = false) {
        if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(label + ' must be between ' + min + ' and ' + max + '.');
    }
    function color(value) {if (!/^#[0-9a-f]{6}$/i.test(value)) fail('Use a six-digit hex color.');}
    function optionalNumbers(value, specs) {
        for (const [key, min, max] of specs) if (value[key] !== undefined) number(value[key], min, max, key);
    }
    function dayNight(value) {
        fields(value, ['dawn', 'dawnDuration', 'dusk', 'duskDuration', 'dayColor', 'nightColor', 'dawnColor', 'duskColor'], 'Day/night');
        number(value.dawn, 0, 23, 'Dawn hour'); number(value.dusk, 0, 23, 'Dusk hour');
        number(value.dawnDuration, .25, 6, 'Dawn duration'); number(value.duskDuration, .25, 6, 'Dusk duration');
        if (value.dawn + value.dawnDuration > value.dusk || value.dusk + value.duskDuration > 24) fail('Dawn must finish before dusk, and dusk must finish by midnight.');
        for (const key of ['dayColor', 'nightColor', 'dawnColor', 'duskColor']) color(value[key]);
        return value;
    }
    function weather(value) {
        fields(value, ['mode', 'type', 'intensity', 'wind', 'transition', 'sequence', 'nightOpacity'], 'Weather');
        if (!['fixed', 'cycle'].includes(value.mode) || !types.includes(value.type)) fail('Choose fixed or cycling weather and a supported effect.');
        number(value.intensity, 0, 1, 'Weather intensity'); number(value.wind, -1, 1, 'Wind'); number(value.transition, 1, 30, 'Weather transition seconds');
        optionalNumbers(value, [['nightOpacity', 0, 1]]);
        if (!Array.isArray(value.sequence) || value.sequence.length < 1 || value.sequence.length > 8) fail('Use one to eight weather phases.');
        for (const phase of value.sequence) {
            fields(phase, ['type', 'intensity', 'duration'], 'Weather phase');
            if (!types.includes(phase.type)) fail('Choose a supported weather phase.');
            number(phase.intensity, 0, 1, 'Phase intensity'); number(phase.duration, 10, 1800, 'Phase seconds');
            if (value.transition > phase.duration / 2) fail('Transitions must fit within half of each phase.');
        }
        return value;
    }
    function parallax(value) {
        fields(value, ['layers', 'placements', 'cutoutColors', 'backgroundColor'], 'Parallax');
        if (!Array.isArray(value.layers) || value.layers.length > 8) fail('Use at most eight parallax layers.');
        for (const layer of value.layers) {
            fields(layer, ['image', 'plane', 'width', 'height', 'factorX', 'factorY', 'opacity', 'nightOpacity', 'nightBrightness', 'swayX', 'swayY', 'swayPeriod', 'driftX', 'driftY', 'offsetX', 'offsetY', 'placed', 'anchorX', 'anchorY', 'repeatX', 'repeatY', 'spacingX', 'spacingY', 'orbitRadius', 'orbitPeriod', 'orbitVariation', 'scaleVariation', 'rotateToPath', 'activeSceneOnly'], 'Parallax layer');
            if (!validImage(layer.image)) fail('Choose a registered local parallax PNG image.');
            if (!planes.includes(layer.plane)) fail('Choose a parallax plane.');
            if (layer.plane === 'entities' && !layer.placed) fail('Depth-sorted layers need sprite placements.');
            for (const key of ['placed', 'repeatX', 'repeatY', 'rotateToPath', 'activeSceneOnly']) if (layer[key] !== undefined && typeof layer[key] !== 'boolean') fail(key + ' must be enabled or disabled.');
            number(layer.width, layer.placed ? 8 : 32, layer.placed ? 512 : 4096, 'Layer width');
            number(layer.height, layer.placed ? 8 : 32, layer.placed ? 512 : 4096, 'Layer height');
            optionalNumbers(layer, [['factorX', layer.placed ? .5 : 0, 2], ['factorY', layer.placed ? .5 : 0, 2], ['opacity', 0, 1],
                ['nightOpacity', 0, 1], ['nightBrightness', 0, 1], ['swayX', 0, 12], ['swayY', 0, 12], ['swayPeriod', 1, 30], ['driftX', -32, 32], ['driftY', -32, 32], ['offsetX', layer.placed ? -512 : -4096, layer.placed ? 512 : 4096],
                ['offsetY', layer.placed ? -512 : -4096, layer.placed ? 512 : 4096], ['anchorX', 0, 1], ['anchorY', 0, 1], ['spacingX', layer.width, 4096], ['spacingY', layer.height, 4096], ['orbitRadius', 0, 256], ['orbitPeriod', 2, 60], ['orbitVariation', 0, 1], ['scaleVariation', 0, .75]]);
        }
        if (value.placements !== undefined) {
            if (!Array.isArray(value.placements) || value.placements.length > 256) fail('Use at most 256 sprite placements.');
            for (const point of value.placements) {
                fields(point, ['x', 'y', 'scale', 'flipX'], 'Placement');
                number(point.x, 0, 65536, 'Placement X'); number(point.y, 0, 65536, 'Placement Y');
                optionalNumbers(point, [['scale', .5, 2]]);
                if (point.flipX !== undefined && typeof point.flipX !== 'boolean') fail('Mirror must be enabled or disabled.');
            }
        }
        if (value.cutoutColors !== undefined) {
            if (!Array.isArray(value.cutoutColors) || value.cutoutColors.length > 8) fail('Use at most eight terrain replacement colors.');
            for (const rgb of value.cutoutColors) {
                if (!Array.isArray(rgb) || rgb.length !== 3) fail('Terrain replacement colors need RGB values.');
                rgb.forEach(value => number(value, 0, 255, 'RGB component', true));
            }
            if (value.cutoutColors.length && !value.layers.some(layer => layer.plane === 'background' && !layer.placed)) fail('Terrain replacement needs a background layer.');
        }
        if (value.backgroundColor !== undefined) color(value.backgroundColor);
        return value;
    }
    const defaults = {
        dayNight: {dawn: 5, dawnDuration: 2, dusk: 17, duskDuration: 2, dayColor: '#162a38', nightColor: '#111b38', dawnColor: '#ae7966', duskColor: '#9c5e4c'},
        weather: {mode: 'fixed', type: 'clear', intensity: .6, wind: .2, transition: 8, nightOpacity: .45,
            sequence: [{type: 'sunrays', intensity: .5, duration: 120}, {type: 'rain', intensity: .55, duration: 90}, {type: 'clear', intensity: 0, duration: 90}]}
    };
    function outdoors(scene) {
        if (scene?.weatherExposure && scene.weatherExposure !== 'auto') return scene.weatherExposure === 'outdoor';
        return scene?.dn_cycle === true || scene?.dn_cycle === 'true';
    }
    return {assets, types, planes, dayNight, weather, parallax, defaults, outdoors, validImage};
});

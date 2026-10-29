(() => {
    'use strict';
    const E = window.SceneEnvironment;
    const clone = value => JSON.parse(JSON.stringify(value));
    const choices = values => values.map(id => ({id, name: id.replaceAll('-', ' ')}));
    function render(form, config, ui) {
        const {section, grid, field, check, button, touch, refresh} = ui;
        const cycle = section(form, 'Dawn & dusk', 'Use the shared game clock with a custom daylight window and smoothly blended tints. Other scenes and timed quests keep the same clock.');
        check(cycle, 'Customize daylight hours and colors', {enabled: !!config.dayNight}, 'enabled', function () {
            if (config.dayNight) delete config.dayNight; else config.dayNight = clone(E.defaults.dayNight);
            refresh();
        });
        if (config.dayNight) {
            const row = grid(cycle), day = config.dayNight;
            for (const [key, label, min, max] of [['dawn', 'Dawn starts at hour', 0, 23], ['dawnDuration', 'Dawn length in game hours', .25, 6], ['dusk', 'Dusk starts at hour', 0, 23], ['duskDuration', 'Dusk length in game hours', .25, 6]]) field(row, label, day, key, {type: 'number', min, max, step: 'any'});
            for (const [key, label] of [['dayColor', 'Day tint'], ['nightColor', 'Night tint'], ['dawnColor', 'Dawn tint'], ['duskColor', 'Dusk tint']]) field(row, label, day, key, {type: 'color'});
            cycle.append(Object.assign(document.createElement('p'), {className: 'field-hint', textContent: 'Enable the day/night cycle above to use these settings. Dawn must end before dusk; dusk must end by midnight.'}));
        }
        const weather = section(form, 'Weather', 'Rain and sunrays share the scene clock. Weather fades smoothly between phases; sunrays fade out at night.');
        check(weather, 'Enable scene weather', {enabled: !!config.weather}, 'enabled', () => {
            if (config.weather) delete config.weather; else config.weather = clone(E.defaults.weather);
            refresh();
        });
        if (config.weather) {
            const value = config.weather, row = grid(weather);
            field(row, 'Weather mode', value, 'mode', {choices: [{id: 'fixed', name: 'Fixed weather'}, {id: 'cycle', name: 'Repeating weather sequence'}], change: refresh});
            field(row, 'Wind direction / strength', value, 'wind', {type: 'number', min: -1, max: 1, step: 'any', hint: 'Negative blows left; positive blows right.'});
            if (value.mode === 'fixed') {
                field(row, 'Weather effect', value, 'type', {choices: choices(E.types)});
                field(row, 'Weather intensity', value, 'intensity', {type: 'number', min: 0, max: 1, step: 'any'});
            } else {
                field(row, 'Transition seconds', value, 'transition', {type: 'number', min: 1, max: 30, hint: 'At most half the duration of the shortest phase.'});
                value.sequence.forEach((phase, index) => {
                    const block = section(weather, 'Weather phase ' + (index + 1)), row = grid(block);
                    field(row, 'Phase effect', phase, 'type', {choices: choices(E.types)});
                    field(row, 'Phase intensity', phase, 'intensity', {type: 'number', min: 0, max: 1, step: 'any'});
                    field(row, 'Phase duration in seconds', phase, 'duration', {type: 'number', min: 10, max: 1800});
                    if (index) button(block, 'Move phase earlier', () => { [value.sequence[index - 1], value.sequence[index]] = [phase, value.sequence[index - 1]]; touch(); refresh(); });
                    button(block, 'Remove phase', () => {value.sequence.splice(index, 1); touch(); refresh();}, {disabled: value.sequence.length === 1});
                });
                button(weather, 'Add weather phase', () => {value.sequence.push({type: 'clear', intensity: 0, duration: 90}); touch(); refresh();}, {disabled: value.sequence.length >= 8});
            }
        }
        const parallax = section(form, 'Parallax layers', 'Layer images above or below the terrain. Scroll factor 1 follows the map; lower values look deeper and higher values look closer. Sizes, drift and offsets use map pixels.');
        check(parallax, 'Enable scene parallax', {enabled: !!config.parallax}, 'enabled', () => {
            if (config.parallax) delete config.parallax; else config.parallax = {layers: []};
            refresh();
        });
        if (!config.parallax) return;
        const value = config.parallax;
        value.layers.forEach((layer, index) => {
            const block = document.createElement('details'), summary = document.createElement('summary');
            summary.textContent = 'Layer ' + (index + 1) + ' · ' + layer.image.split('/').pop() + ' · ' + layer.plane;
            block.append(summary); parallax.append(block);
            const row = grid(block);
            field(row, 'Layer image', layer, 'image', {choices: E.assets.map(name => ({id: '/img/parallax/' + name + '.png', name: name.replaceAll('-', ' ')}))});
            field(row, 'Layer plane', layer, 'plane', {choices: [{id: 'background', name: 'Below terrain'}, {id: 'ground', name: 'On terrain'}, {id: 'entities', name: 'Among characters'}, {id: 'foreground', name: 'Above characters'}]});
            check(block, 'Use sprite placements', layer, 'placed', refresh);
            const fields = [['width', 'Image width', layer.placed ? 8 : 32, layer.placed ? 512 : 4096, 1, 384], ['height', 'Image height', layer.placed ? 8 : 32, layer.placed ? 512 : 4096, 1, 384],
                ['factorX', 'Horizontal scroll factor', layer.placed ? .5 : 0, 2, .01, 1], ['factorY', 'Vertical scroll factor', layer.placed ? .5 : 0, 2, .01, 1],
                ['opacity', 'Opacity', 0, 1, .05, 1], ['offsetX', 'Horizontal offset', layer.placed ? -512 : -4096, layer.placed ? 512 : 4096, 1, 0], ['offsetY', 'Vertical offset', layer.placed ? -512 : -4096, layer.placed ? 512 : 4096, 1, 0]];
            if (layer.placed) fields.push(['anchorX', 'Horizontal anchor', 0, 1, .05, .5], ['anchorY', 'Vertical anchor', 0, 1, .05, .5]);
            else fields.push(['driftX', 'Horizontal drift per second', -32, 32, .05, 0], ['driftY', 'Vertical drift per second', -32, 32, .05, 0]);
            for (const [key, label, min, max, , fallback] of fields) {
                // Display defaults without silently modifying the saved draft.
                const input = field(row, label, layer, key, {type: 'number', min, max, step: 'any'});
                if (layer[key] === undefined) input.value = fallback;
            }
            if (index) button(block, 'Move layer earlier', () => {[value.layers[index - 1], value.layers[index]] = [layer, value.layers[index - 1]]; touch(); refresh();});
            button(block, 'Remove layer', () => {
                value.layers.splice(index, 1);
                if (!value.layers.some(layer => layer.plane === 'background')) delete value.cutoutColors;
                touch(); refresh();
            });
        });
        button(parallax, 'Add parallax layer', () => {value.layers.push({image: '/img/parallax/clouds.png', plane: 'foreground', width: 384, height: 320, factorX: 1.15, factorY: 1.15, opacity: .25, driftX: .5, driftY: .1}); touch(); refresh();}, {disabled: value.layers.length >= 8});
        if (value.layers.some(layer => layer.plane === 'background')) {
            const below = section(parallax, 'Reveal depth below terrain', 'Replace exact flat terrain colors to reveal the lower layers. Cliff edges, bridges, characters and collisions stay in place. Leave empty for maps that already have transparent gaps.');
            const bg = field(below, 'Background fill', value, 'backgroundColor', {type: 'color'});
            if (!value.backgroundColor) bg.value = '#142438';
            (value.cutoutColors || []).forEach((rgb, index) => {
                const proxy = {color: '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('')};
                field(below, 'Terrain color ' + (index + 1), proxy, 'color', {type: 'color', update: () => {value.cutoutColors[index] = [1, 3, 5].map(i => parseInt(proxy.color.slice(i, i + 2), 16));}});
                button(below, 'Remove terrain color ' + (index + 1), () => {value.cutoutColors.splice(index, 1); touch(); refresh();});
            });
            button(below, 'Add terrain color', () => {(value.cutoutColors ||= []).push([72, 196, 248]); touch(); refresh();}, {disabled: value.cutoutColors?.length >= 8});
        }
        if (value.layers.some(layer => layer.placed)) {
            const placements = document.createElement('details');
            placements.append(Object.assign(document.createElement('summary'), {textContent: 'Sprite placements · ' + (value.placements?.length || 0)})); parallax.append(placements);
            placements.append(Object.assign(document.createElement('p'), {className: 'field-hint', textContent: 'All placed layers share these roots. X and Y are map pixels relative to the top-left corner of this scene.'}));
            (value.placements || []).forEach((point, index) => {
                const row = grid(placements);
                field(row, 'Root ' + (index + 1) + ' X', point, 'x', {type: 'number', min: 0, max: 65536, step: 'any'});
                field(row, 'Root ' + (index + 1) + ' Y', point, 'y', {type: 'number', min: 0, max: 65536, step: 'any'});
                const input = field(row, 'Root scale', point, 'scale', {type: 'number', min: .5, max: 2, step: 'any'}); if (point.scale === undefined) input.value = 1;
                check(row, 'Mirror root', point, 'flipX');
                button(row, 'Remove root ' + (index + 1), () => {value.placements.splice(index, 1); touch(); refresh();});
            });
            button(placements, 'Add sprite root', () => {(value.placements ||= []).push({x: 128, y: 128, scale: 1}); touch(); refresh();}, {disabled: value.placements?.length >= 256});
        }
    }
    window.ToolboxEnvironment = {render};
})();

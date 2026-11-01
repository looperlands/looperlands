(() => {
    'use strict';
    const pane = document.getElementById('seasons-pane');
    if (!pane) return;
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    const categories = {schedule: 'Schedule', actors: 'Actors', decorations: 'Decorations', tiles: 'Tile appearance', parallax: 'Layers', ambientSounds: 'Sounds', story: 'Story text'};
    const markerColors = {actors: '#2b579a', decorations: '#a85813', tiles: '#7056a4', ambientSounds: '#17785c'};
    pane.innerHTML = `<header class="pane-heading"><h2>Temporary content</h2><p>Create seasonal events, set their UTC calendar and change the map temporarily. Scheduled content stays visible here even when it is inactive in the game. <a href="#documentation/mapmaker-temporary-content">Read the guide</a></p></header>
        <div class="world-toolbar seasons-toolbar"><div class="field"><label for="seasons-map">Map</label><select id="seasons-map"></select></div><button type="button" class="seasons-save primary" disabled>Save temporary content</button><button type="button" class="seasons-reload">Reload</button><a class="seasons-build" href="#build">Build this map</a><p class="seasons-status" role="status" aria-live="polite">Choose a map.</p></div>
        <div class="asset-discard seasons-discard" hidden><p>Discard unsaved temporary-content changes to continue?</p><button type="button" class="seasons-discard-yes">Discard changes</button><button type="button" class="seasons-discard-no">Keep editing</button></div>
        <div class="seasons-workspace" hidden><aside class="seasons-library"><h3>Events</h3><button type="button" class="seasons-new">New event</button><div class="world-list seasons-events"></div><p class="field-hint">Event IDs stay fixed. Registered story events and their linked actors are protected; disable them to hide their content.</p></aside>
        <div class="seasons-main"><div class="seasons-tabs" role="group" aria-label="Temporary content categories"></div><p class="seasons-preview field-hint"></p>
        <div class="seasons-columns"><div class="seasons-map-column"><div class="world-toolbar"><button type="button" class="seasons-select">Select on map</button><button type="button" class="seasons-focus">Focus selected content</button><label class="seasons-check"><input class="seasons-collisions" type="checkbox"> Show blocked tiles</label></div><p class="seasons-mode field-hint">Select a map marker to edit it. Drag to pan; scroll to zoom.</p><div class="seasons-map-host"></div><p class="seasons-legend field-hint">Blue: actors · Orange: decorations · Purple: tile appearance · Green: sounds. Decorations are drawn over the built map; markers include inactive content.</p><div class="world-list seasons-items"></div></div><div class="seasons-editor"></div></div></div></div>`;
    const $ = selector => pane.querySelector(selector);
    let data, original, selectedEvent = 0, tab = 'schedule', selectedIndex = 0, canvas, moving, pending, busy = false, booting, loaded = false, fieldId = 0;
    let actorLibrary, actorRequest, storySearch = '';
    const imageCache = new Map();
    const current = () => data?.events[selectedEvent];
    const registration = () => data?.catalog.registeredEvents?.find(event => event.id === current()?.id);
    const requiredActor = row => registration()?.requiredActors?.some(actor => actor.key === row.key);
    const rows = () => current()?.[tab] || [];
    const selected = () => rows()[selectedIndex];
    const dirty = () => !!data && JSON.stringify(data.events) !== original;
    function status(message, error = false) {$('.seasons-status').textContent = message; $('.seasons-status').classList.toggle('error', error);}
    function controls() {
        $('.seasons-save').disabled = busy || !dirty(); $('.seasons-reload').disabled = busy;
        $('.seasons-new').disabled = busy || !data || data.events.length >= 10;
        $('#seasons-map').disabled = busy; $('.seasons-workspace').inert = busy;
    }
    function button(parent, label, run, attrs = {}) {const b = el('button', label, {type: 'button', ...attrs}); b.onclick = run; parent.append(b); return b;}
    function section(parent, title, help) {
        const block = el('section', '', {className: 'world-section'}); block.append(el('h3', title));
        if (help) block.append(el('p', help, {className: 'field-hint'})); parent.append(block); return block;
    }
    function grid(parent) {const row = el('div', '', {className: 'asset-field-grid'}); parent.append(row); return row;}
    function field(parent, label, object, key, options = {}) {
        const id = 'seasons-field-' + ++fieldId, wrap = el('div', '', {className: 'field'});
        const input = el(options.choices ? 'select' : options.multiline ? 'textarea' : 'input', '', {id});
        if (options.choices) {
            input.append(...options.choices.map(row => el('option', row.name ?? String(row.id), {value: String(row.id)})));
            if (object[key] !== undefined && !options.choices.some(row => String(row.id) === String(object[key]))) input.prepend(el('option', String(object[key]) + ' · current value', {value: String(object[key])}));
        } else if (options.multiline) input.rows = 3;
        else input.type = options.type || 'text';
        input.value = object[key] ?? options.fallback ?? ''; input.required = options.required !== false;
        if (options.type === 'number') {input.min = options.min ?? 0; input.max = options.max ?? 65536; input.step = options.step ?? 1;}
        if (options.maxLength) input.maxLength = options.maxLength;
        if (options.pattern) input.pattern = options.pattern;
        if (options.placeholder) input.placeholder = options.placeholder;
        const update = () => {
            object[key] = options.type === 'number' ? (input.value === '' ? null : Number(input.value)) : input.value;
            options.update?.(); touch();
        };
        input.oninput = update;
        if (options.change) input.onchange = () => {update(); options.change();};
        wrap.append(el('label', label, {htmlFor: id}), input);
        if (options.hint) wrap.append(el('span', options.hint, {className: 'field-hint'}));
        parent.append(wrap); return input;
    }
    function check(parent, label, object, key, update) {
        const input = el('input', '', {type: 'checkbox', checked: !!object[key]}), wrap = el('label', '', {className: 'seasons-check'});
        wrap.append(input, document.createTextNode(label)); parent.append(wrap);
        input.onchange = () => {object[key] = input.checked; update?.(); touch();}; return input;
    }
    function touch() {
        controls(); renderEvents(); renderItems(); refreshMap();
        status(dirty() ? 'Unsaved temporary content. Save, then build ' + data.mapId + ' and start a fresh playtest.' : 'All temporary-content changes are saved.');
    }
    function guard(action) {
        if (busy) return;
        if (!dirty()) return action();
        pending = action; $('.seasons-discard').hidden = false; $('.seasons-discard-no').focus();
    }
    $('.seasons-discard-yes').onclick = () => {const action = pending; pending = null; $('.seasons-discard').hidden = true; return action?.();};
    $('.seasons-discard-no').onclick = () => {pending = null; $('.seasons-discard').hidden = true;};
    function setMove(row, label) {
        moving = row ? {row, label} : null;
        $('.seasons-mode').textContent = row ? 'Click a tile to move ' + label + ', or edit its coordinate fields. Select on map cancels placement.' : 'Select a map marker to edit it. Drag to pan; scroll to zoom.';
    }
    function positions() {
        const points = [];
        for (const [eventIndex, event] of (data?.events || []).entries()) for (const category of Object.keys(markerColors)) {
            for (const [index, row] of (event[category] || []).entries()) if (Number.isFinite(row.x) && Number.isFinite(row.y)) points.push({eventIndex, category, index, row});
        }
        return points;
    }
    function scene(row) {return data?.catalog.scenes.find(s => String(s.id) === String(row?.sceneId));}
    function fitSelected() {
        const row = selected(), region = tab === 'parallax' && scene(row);
        if (region) return canvas?.fit({x: region.x, y: region.y, width: region.w, height: region.h});
        if (row && Number.isFinite(row.x) && Number.isFinite(row.y)) return canvas?.fit({x: row.x - 10, y: row.y - 8, width: 21, height: 17});
        const points = positions().filter(point => point.eventIndex === selectedEvent);
        if (!points.length) return canvas?.fit();
        const xs = points.map(p => p.row.x), ys = points.map(p => p.row.y), x = Math.min(...xs), y = Math.min(...ys);
        canvas?.fit({x: x - 3, y: y - 3, width: Math.max(...xs) - x + 7, height: Math.max(...ys) - y + 7});
    }
    function imageFor(url) {
        if (!url) return null;
        if (!imageCache.has(url)) {
            const image = new Image(), entry = {image, ready: false}; imageCache.set(url, entry);
            image.onload = () => {entry.ready = true; canvas?.draw();}; image.onerror = () => {entry.failed = true;}; image.src = url;
        }
        const entry = imageCache.get(url); return entry.ready ? entry.image : null;
    }
    function decorationUrl(row) {
        const catalog = data.catalog.decorationImages.find(entry => entry.image === row.image);
        if (catalog?.url) return catalog.url;
        const match = /^\/img\/1\/(?:item-)?([A-Za-z][A-Za-z0-9_]*)\.png$/.exec(row.image);
        return match ? './api/entity-sprites/' + match[1] : row.image;
    }
    function drawMap(context, {project, scale}) {
        context.save(); context.imageSmoothingEnabled = false;
        for (const {row, category, eventIndex, index} of positions()) {
            const point = project({x: row.x + .5, y: row.y + .5});
            if (category === 'decorations') {
                const image = imageFor(decorationUrl(row)), frame = row.frame || {x: 0, y: 0, width: row.width ?? 16, height: row.height ?? 16};
                if (image) {
                    const origin = project({x: row.x + (row.offsetX || 0) / 16, y: row.y + (row.offsetY || 0) / 16});
                    context.drawImage(image, frame.x, frame.y, frame.width, frame.height, origin.x, origin.y, (row.width || frame.width) / 16 * scale, (row.height || frame.height) / 16 * scale);
                }
            }
            const active = eventIndex === selectedEvent && category === tab && index === selectedIndex;
            context.strokeStyle = active ? '#172638' : markerColors[category]; context.fillStyle = markerColors[category]; context.lineWidth = active ? 3 : 1.5;
            context.beginPath(); context.arc(point.x, point.y, active ? 8 : 5, 0, Math.PI * 2); context.stroke();
            if (active) {context.font = '12px system-ui'; context.fillText(itemLabel(category, row, index), point.x + 11, point.y - 9);}
            if (active && category === 'ambientSounds') {context.globalAlpha = .3; context.beginPath(); context.arc(point.x, point.y, row.radius * scale, 0, Math.PI * 2); context.stroke(); context.globalAlpha = 1;}
        }
        context.restore();
    }
    function refreshMap() {
        const actor = tab === 'actors' && selected(), region = tab === 'parallax' && scene(selected());
        canvas?.set({collisions: $('.seasons-collisions').checked,
            regions: region ? [{x: region.x, y: region.y, width: region.w, height: region.h}] : actor?.area ? [actor.area] : [],
            links: actor?.route?.length ? [{path: [actor, ...actor.route]}] : [],
            points: actor?.route || []});
    }
    function pick(point) {
        if (busy) return;
        if (moving) {Object.assign(moving.row, point); setMove(null); renderEditor(); touch(); return;}
        const nearby = positions().filter(p => Math.hypot(p.row.x - point.x, p.row.y - point.y) < 1.5)
            .sort((a, b) => Math.hypot(a.row.x - point.x, a.row.y - point.y) - Math.hypot(b.row.x - point.x, b.row.y - point.y));
        if (nearby[0]) {
            const hit = nearby[0]; selectedEvent = hit.eventIndex; tab = hit.category; selectedIndex = hit.index; render();
        }
    }
    function itemLabel(category, row, index) {
        if (category === 'actors') return row.label || row.key;
        if (category === 'decorations') return (row.image || '').split('/').pop() + ' · ' + row.x + ', ' + row.y;
        if (category === 'tiles') return 'Tile ' + row.from + ' · ' + row.x + ', ' + row.y;
        if (category === 'parallax') return (scene(row)?.name || 'Scene ' + row.sceneId) + ' · ' + row.layers.length + ' layers';
        return row.name || 'Sound ' + (index + 1);
    }
    function renderEvents() {
        const list = $('.seasons-events'); list.replaceChildren();
        data?.events.forEach((event, index) => button(list, event.name + (event.enabled ? '' : ' · disabled'), () => {selectedEvent = index; selectedIndex = 0; setMove(null); render(); fitSelected();}, {ariaPressed: String(index === selectedEvent)}));
        if (!data?.events.length) list.append(el('p', 'No events yet. Create one to add temporary content to this map.', {className: 'field-hint'}));
    }
    function addEvent() {
        if (busy || !data || data.events.length >= 10) return;
        let suffix = 1; while (data.events.some(event => event.id === 'seasonal_event_' + suffix)) suffix++;
        const start = new Date(), end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        data.events.push({id: 'seasonal_event_' + suffix, name: 'New seasonal event', enabled: true,
            availability: {annual: {start: start.toISOString().slice(5, 10), end: end.toISOString().slice(5, 10)}},
            actors: [], decorations: [], tiles: [], ambientSounds: [], parallax: [], textOverrides: {}});
        selectedEvent = data.events.length - 1; tab = 'schedule'; selectedIndex = 0; setMove(null); render(); touch();
    }
    function removeEvent() {
        if (busy || registration()) return;
        data.events.splice(selectedEvent, 1); selectedEvent = Math.max(0, selectedEvent - 1);
        tab = 'schedule'; selectedIndex = 0; setMove(null); render(); touch();
    }
    function renderTabs() {
        const host = $('.seasons-tabs'); host.replaceChildren();
        for (const [key, name] of Object.entries(categories)) button(host, name + (['schedule', 'story'].includes(key) ? '' : ' (' + (current()?.[key]?.length || 0) + ')'), () => {tab = key; selectedIndex = 0; setMove(null); render();}, {ariaPressed: String(tab === key), disabled: !current()});
    }
    function renderItems() {
        const list = $('.seasons-items'); list.replaceChildren(); list.hidden = ['schedule', 'story'].includes(tab);
        rows().forEach((row, index) => button(list, itemLabel(tab, row, index), () => {selectedIndex = index; setMove(null); renderEditor(); renderItems(); refreshMap(); fitSelected();}, {ariaPressed: String(index === selectedIndex)}));
    }
    function render() {renderEvents(); renderTabs(); renderItems(); renderEditor(); refreshMap();}
    function coordinates(parent, row, label = 'Tile') {
        const pair = grid(parent);
        field(pair, label + ' X', row, 'x', {type: 'number', max: data.catalog.width - 1});
        field(pair, label + ' Y', row, 'y', {type: 'number', max: data.catalog.height - 1});
        button(parent, 'Move ' + label.toLowerCase() + ' on map', () => setMove(row, label.toLowerCase()));
    }
    function readOnly(parent, label, value) {
        const wrap = el('div', '', {className: 'field'}); wrap.append(el('span', label, {className: 'field-hint'}), el('code', String(value))); parent.append(wrap);
    }
    function removeRow() {rows().splice(selectedIndex, 1); selectedIndex = Math.max(0, selectedIndex - 1); setMove(null); render(); touch();}
    function basePosition() {const row = selected(); return Number.isFinite(row?.x) ? {x: row.x, y: row.y} : {x: current()?.actors[0]?.x || 1, y: current()?.actors[0]?.y || 1};}
    function baseTile(row) {return [].concat(canvas?.map?.tiles[row.y * data.catalog.width + row.x] || []).filter(Boolean).at(-1) || 1;}
    function addRow(value) {rows().push(value); selectedIndex = rows().length - 1; render(); touch(); if (Number.isFinite(value.x)) setMove(value, categories[tab].toLowerCase());}
    function addActor() {
        if (busy || !current() || !data.catalog.npcs.length || rows().length >= 100) return;
        let suffix = 1; while (rows().some(actor => actor.key === current().id + ':actor_' + suffix)) suffix++;
        const kind = data.catalog.npcs[0];
        addRow({key: current().id + ':actor_' + suffix, kind: kind.id, label: kind.name, ...basePosition()});
    }
    function renderEditor() {
        const host = $('.seasons-editor'); host.replaceChildren();
        const event = current();
        $('.seasons-map-column').hidden = tab === 'story'; $('.seasons-columns').classList.toggle('seasons-text-layout', tab === 'story');
        $('.seasons-preview').textContent = event ? 'Authoring preview · ' + (event.enabled ? 'event enabled' : 'event disabled') + '. All saved and draft placements are shown, including content outside its window. Build and start a fresh playtest to use the saved configuration in the game.' : 'Create a new event to place temporary content on this map.';
        if (!event) return;
        const form = el('form', '', {className: 'seasons-form'}); form.onsubmit = e => {e.preventDefault(); save();};
        form.addEventListener('invalid', e => {for (let node = e.target.parentElement; node && node !== form; node = node.parentElement) if (node.tagName === 'DETAILS') node.open = true;}, true);
        host.append(form);
        if (tab === 'schedule') return renderSchedule(form, event);
        if (tab === 'story') return renderStory(form, event);
        const row = selected();
        const heading = section(form, categories[tab], tab === 'actors' ? 'Add NPCs and set their labels, placement and patrol routes. Stable keys identify individual actors; registered story actors keep their required kind.' : null);
        if (tab === 'actors') button(heading, 'Add actor', addActor, {disabled: !data.catalog.npcs.length || rows().length >= 100});
        if (tab === 'decorations') button(heading, 'Add decoration', () => addRow({image: data.catalog.decorationImages[0].image, ...basePosition()}), {disabled: !data.catalog.decorationImages.length});
        if (tab === 'tiles') button(heading, 'Add tile appearance', () => {const position = basePosition(); addRow({...position, from: baseTile(position), colorShift: {colorDifference: {r: 0, g: 0, b: 0}, progress: 1}});});
        if (tab === 'ambientSounds') button(heading, 'Add sound source', () => {const preset = data.catalog.ambientPresets[0]; let id = 1; while (rows().some(s => s.id === 'sound_' + id)) id++; addRow({id: 'sound_' + id, name: preset.name, preset: preset.id, ...basePosition(), radius: preset.radius || 12, volume: preset.volume ?? .4});}, {disabled: !data.catalog.ambientPresets.length});
        if (tab === 'parallax') renderAddScene(heading);
        if (!row) {heading.append(el('p', 'No ' + categories[tab].toLowerCase() + ' selected.', {className: 'field-hint'})); return;}
        if (tab === 'actors') renderActor(form, row);
        if (tab === 'decorations') renderDecoration(form, row);
        if (tab === 'tiles') renderTile(form, row);
        if (tab === 'ambientSounds') renderSound(form, row);
        if (tab === 'parallax') {
            field(form, 'Scene', row, 'sceneId', {choices: data.catalog.scenes.filter(s => !rows().some(other => other !== row && String(other.sceneId) === String(s.id))).map(s => ({id: s.id, name: s.name})), change: () => {render(); fitSelected();}});
            window.ToolboxEnvironment.renderParallax(form, {parallax: row}, {section, grid, field, check, button, touch, refresh: () => {renderEditor(); refreshMap();}}, {allowDisable: false, allowPlaced: false, planes: ['ground', 'foreground']});
        }
        if (tab !== 'actors' || !requiredActor(row)) button(form, 'Remove ' + (tab === 'actors' ? 'actor' : tab === 'parallax' ? 'scene layers' : tab === 'ambientSounds' ? 'sound source' : tab === 'tiles' ? 'tile appearance' : 'decoration') + ' from draft', removeRow, {className: 'destructive'});
    }
    function renderSchedule(form, event) {
        const block = section(form, event.name, 'Availability uses UTC calendar time, independently of the game clock. The end is exclusive: choose the first day or time when this content should be unavailable.');
        readOnly(block, 'Event ID', event.id); field(block, 'Event name', event, 'name', {maxLength: 120}); check(block, 'Enable this event', event, 'enabled');
        const mode = {value: event.availability.annual ? 'annual' : 'once'};
        field(block, 'Availability', mode, 'value', {choices: [{id: 'annual', name: 'Every year'}, {id: 'once', name: 'One-time window'}], change: () => {
            const old = event.availability, year = new Date().getUTCFullYear();
            if (mode.value === 'annual') event.availability = {annual: {start: old.startsAt.slice(5, 10), end: old.endsAt.slice(5, 10)}};
            else {const {start, end} = old.annual; event.availability = {startsAt: year + '-' + start + 'T00:00:00Z', endsAt: (year + (end <= start ? 1 : 0)) + '-' + end + 'T00:00:00Z'};}
            renderEditor(); touch();
        }});
        const pair = grid(block);
        if (event.availability.annual) {
            field(pair, 'Start month-day (UTC, included)', event.availability.annual, 'start', {pattern: '[0-9]{2}-[0-9]{2}', placeholder: '10-15', maxLength: 5});
            field(pair, 'End month-day (UTC, excluded)', event.availability.annual, 'end', {pattern: '[0-9]{2}-[0-9]{2}', placeholder: '11-09', maxLength: 5});
            block.append(el('p', 'Use MM-DD. A window ending 11-09 includes November 8. Windows may cross New Year.', {className: 'field-hint'}));
        } else for (const [key, label] of [['startsAt', 'Starts at (UTC, included)'], ['endsAt', 'Ends at (UTC, excluded)']]) {
            const value = {time: event.availability[key].replace(/Z$/, '')};
            const input = field(pair, label, value, 'time', {type: 'datetime-local', update: () => {event.availability[key] = value.time ? value.time + (value.time.length === 16 ? ':00Z' : 'Z') : '';}}); input.step = '1';
        }
        const links = data.catalog.storyLinks.filter(link => link.eventId === event.id);
        if (links.length) {
            const story = section(form, 'Linked story', 'Quest IDs and actor keys remain fixed. After moving a clue, update its directions in Story text and playtest the complete route. Conditions, choices and rewards keep their authored behavior.');
            for (const link of links) {
                if (link.note) story.append(el('p', link.note, {className: 'field-hint'}));
                for (const id of link.questIds) story.append(el('a', id, {href: '#quests/?map=' + encodeURIComponent(data.mapId) + '&quest=' + encodeURIComponent(id), className: 'seasons-story-link'}));
                if (link.shopId) readOnly(story, 'Linked shop', link.shopId);
            }
        }
        if (registration()) form.append(el('p', 'This registered story event cannot be removed. Turn off Enable this event to hide it while keeping its saved identities.', {className: 'field-hint'}));
        else button(form, 'Remove event from draft', removeEvent, {className: 'destructive'});
    }
    function renderStory(form, event) {
        const block = section(form, 'Story text', 'Edit clue directions, quest descriptions and dialogue copy. Stable IDs, choice destinations, conditions and rewards are unchanged. Reset removes an override and restores the original text.');
        const eventTexts = (data.catalog.storyTexts || []).filter(entry => entry.eventId === event.id);
        if (!eventTexts.length) {
            block.append(el('p', 'This event has no authored story text. Create a quest in Quest builder and choose “' + event.name + '” under Availability to use this event’s schedule.'));
            block.append(el('a', 'Open Quest builder', {href: '#quests/?map=' + encodeURIComponent(data.mapId)})); return;
        }
        if (data.catalog.storyTextWarning) block.append(el('p', data.catalog.storyTextWarning, {className: 'seasons-story-warning'}));
        if (data.catalog.storyTextConflicts?.some(conflict => eventTexts.some(entry => entry.id === conflict.id))) {
            const notice = el('p', 'Some text is overridden by Quest builder and will take precedence over these seasonal edits. ', {className: 'seasons-story-warning'});
            notice.append(el('a', 'Open Quest builder', {href: '#quests/?map=' + encodeURIComponent(data.mapId)})); block.append(notice);
        }
        const search = field(block, 'Search story text', {query: storySearch}, 'query', {type: 'search', required: false});
        const host = el('div', '', {className: 'seasons-story-fields'}); block.append(host);
        const draw = () => {
            host.replaceChildren();
            const entries = eventTexts.filter(entry =>
                [entry.label, entry.id, event.textOverrides?.[entry.id] ?? entry.original ?? entry.value].join(' ').toLowerCase().includes(storySearch.toLowerCase()));
            for (const entry of entries) {
                const originalText = entry.original ?? entry.value, proxy = {value: event.textOverrides?.[entry.id] ?? originalText};
                const group = section(host, entry.label); readOnly(group, 'Text ID', entry.id);
                const conflict = data.catalog.storyTextConflicts?.find(value => value.id === entry.id);
                if (conflict) {
                    const notice = el('aside', '', {className: 'seasons-story-warning'});
                    notice.append(el('p', 'Quest builder currently supplies the effective text for this field. This seasonal value will be used only after that override is removed.'));
                    if (typeof conflict.value === 'string') notice.append(el('p', conflict.value, {className: 'seasons-effective-text'}));
                    else if (Array.isArray(conflict.value) && conflict.value.every(value => typeof value === 'string')) notice.append(el('p', conflict.value.join('\n'), {className: 'seasons-effective-text'}));
                    else notice.append(el('p', 'Open Quest builder to inspect its effective value.'));
                    notice.append(el('a', 'Edit ' + conflict.questId + ' in Quest builder', {href: '#quests/?map=' + encodeURIComponent(data.mapId) + '&quest=' + encodeURIComponent(conflict.questId)})); group.append(notice);
                }
                const input = field(group, entry.label, proxy, 'value', {multiline: true, maxLength: entry.maxLength || 4000, update: () => {
                    event.textOverrides ||= {};
                    if (proxy.value === originalText) delete event.textOverrides[entry.id]; else event.textOverrides[entry.id] = proxy.value;
                }});
                if (entry.format && entry.format !== 'plain') window.ToolboxDialogueEditor?.attach(input, {tags: entry.format === 'quest-dialogue' ? [{key: 'remaining', sample: 2}, {key: 'done', sample: 1}, {key: 'amount', sample: 3}] : []});
                button(group, 'Reset to original text', () => {if (event.textOverrides) delete event.textOverrides[entry.id]; draw(); touch();});
            }
            if (!entries.length) host.append(el('p', storySearch ? 'No story text matches this search.' : 'This event has no editable story text.', {className: 'field-hint'}));
        };
        search.oninput = () => {storySearch = search.value; draw();}; draw();
    }
    function thumbnail(parent, preview, label) {
        const holder = el('div', '', {className: 'seasons-thumbnail'}), picture = el('canvas', '', {width: 96, height: 96, ariaLabel: label});
        holder.append(picture, el('span', label)); parent.append(holder);
        const image = new Image(); image.onload = () => {
            const frame = preview.frame || {x: 0, y: (preview.row || 0) * preview.height, width: preview.width, height: preview.height};
            const scale = Math.min(80 / frame.width, 80 / frame.height, 4), context = picture.getContext('2d'); context.imageSmoothingEnabled = false;
            context.drawImage(image, frame.x, frame.y, frame.width, frame.height, (96 - frame.width * scale) / 2, (96 - frame.height * scale) / 2, frame.width * scale, frame.height * scale);
        }; image.src = preview.url;
    }
    function renderActor(form, row) {
        readOnly(form, 'Actor key', row.key);
        if (requiredActor(row)) readOnly(form, 'NPC kind', row.kind);
        else {
            const kind = field(form, 'NPC kind', row, 'kind', {choices: data.catalog.npcs, change: renderEditor});
            window.ToolboxEntityPicker?.attach(kind, {type: 'npc', label: 'NPC kind'});
        }
        if (actorLibrary) {
            const entry = actorLibrary.find(asset => asset.id.toLowerCase() === row.kind.toLowerCase());
            if (entry?.preview) thumbnail(form, entry.preview, entry.name || row.kind);
        } else if (!actorRequest) actorRequest = request('./api/entity-library').then(result => {actorLibrary = result.entries; if (tab === 'actors') renderEditor();}).catch(() => {actorLibrary = [];});
        field(form, 'Actor label', row, 'label', {maxLength: 120}); coordinates(form, row);
        if (!requiredActor(row)) {
            const greeting = field(form, 'Greeting (optional)', row, 'greeting', {multiline: true, required: false, maxLength: 400,
                hint: 'A short conversation while this event is available. Patrolling actors also use it as their greeting. Leave empty to keep their normal interactions.',
                update: () => {if (!row.greeting?.trim()) delete row.greeting;}});
            window.ToolboxDialogueEditor?.attach(greeting, {label: 'Seasonal actor greeting'});
        } else form.append(el('p', 'This actor has an authored conversation. Use Story text to edit its dialogue while preserving the quest flow.', {className: 'field-hint'}));
        const route = section(form, 'Patrol route', 'The actor starts at its placement and follows these stops in order. Keep its origin and stops inside the patrol area, on walkable tiles. Give simultaneous actors distinct stopping tiles.');
        check(route, 'Enable a patrol route', {enabled: !!row.route?.length}, 'enabled', () => {
            if (row.route?.length) {delete row.route; delete row.area;}
            else {row.route = [{x: row.x, y: row.y, waitSeconds: 8, activity: 'patrolling'}]; row.area = {x: row.x, y: row.y, width: 1, height: 1};}
            renderEditor();
        });
        if (!row.route?.length) return;
        const bounds = grid(route);
        for (const [key, label, max] of [['x', 'Area X', data.catalog.width - 1], ['y', 'Area Y', data.catalog.height - 1], ['width', 'Area width', data.catalog.width], ['height', 'Area height', data.catalog.height]]) field(bounds, label, row.area, key, {type: 'number', min: ['width', 'height'].includes(key) ? 1 : 0, max});
        row.route.forEach((stop, index) => {
            const block = section(route, 'Stop ' + (index + 1)); coordinates(block, stop, 'Stop ' + (index + 1));
            field(block, 'Wait seconds', stop, 'waitSeconds', {type: 'number', min: 1, max: 300, step: 'any', fallback: 8});
            field(block, 'Activity', stop, 'activity', {required: false, maxLength: 120, update: () => {if (!stop.activity) delete stop.activity;}});
            if (index) button(block, 'Move stop ' + (index + 1) + ' earlier', () => {[row.route[index - 1], row.route[index]] = [stop, row.route[index - 1]]; renderEditor(); touch();});
            button(block, 'Remove stop ' + (index + 1), () => {row.route.splice(index, 1); renderEditor(); touch();}, {disabled: row.route.length <= 1});
        });
        button(route, 'Add stop', () => {row.route.push({...row.route.at(-1)}); renderEditor(); touch();});
    }
    function renderDecoration(form, row) {
        field(form, 'Decoration image', row, 'image', {choices: data.catalog.decorationImages.map(image => ({id: image.image, name: image.name})), change: renderEditor});
        thumbnail(form, {url: decorationUrl(row), frame: row.frame || {x: 0, y: 0, width: row.width ?? 16, height: row.height ?? 16}}, row.image.split('/').pop()); coordinates(form, row);
        const size = grid(form);
        for (const [key, label] of [['width', 'Width (pixels)'], ['height', 'Height (pixels)']]) field(size, label, row, key, {type: 'number', min: 1, max: 256, step: 'any', fallback: row.frame?.[key] || 16});
        for (const [key, label] of [['offsetX', 'Horizontal offset (pixels)'], ['offsetY', 'Vertical offset (pixels)']]) field(size, label, row, key, {type: 'number', min: -256, max: 256, step: 'any', fallback: 0});
        check(form, 'Use a frame from a sprite sheet', {enabled: !!row.frame}, 'enabled', () => {if (row.frame) delete row.frame; else row.frame = {x: 0, y: 0, width: 16, height: 16}; renderEditor();});
        if (row.frame) {
            const frame = grid(form);
            for (const [key, label] of [['x', 'Frame X'], ['y', 'Frame Y'], ['width', 'Frame width'], ['height', 'Frame height']]) field(frame, label + ' (pixels)', row.frame, key, {type: 'number', min: ['width', 'height'].includes(key) ? 1 : 0, max: ['width', 'height'].includes(key) ? 256 : 16384});
        }
    }
    function renderTile(form, row) {
        form.append(el('p', 'Appearance changes apply only when the original tile ID matches the guard. The baseline map and collisions stay intact; the original appearance returns outside the window.', {className: 'field-hint'}));
        coordinates(form, row); field(form, 'Original tile ID (guard)', row, 'from', {type: 'number', min: 1});
        button(form, 'Use top tile at this position as guard', () => {row.from = baseTile(row); renderEditor(); touch();}, {disabled: !canvas?.map});
        check(form, 'Replace the tile image', {enabled: row.to !== undefined}, 'enabled', () => {if (row.to !== undefined) delete row.to; else row.to = row.from; renderEditor();});
        if (row.to !== undefined) field(form, 'Replacement tile ID', row, 'to', {type: 'number', min: 1});
        check(form, 'Shift the tile colors', {enabled: !!row.colorShift}, 'enabled', () => {if (row.colorShift) delete row.colorShift; else row.colorShift = {colorDifference: {r: 0, g: 0, b: 0}, progress: 1}; renderEditor();});
        if (row.colorShift) {
            const colors = grid(form);
            for (const [key, label] of [['r', 'Red shift'], ['g', 'Green shift'], ['b', 'Blue shift']]) field(colors, label, row.colorShift.colorDifference, key, {type: 'number', min: -255, max: 255});
            field(form, 'Color shift strength', row.colorShift, 'progress', {type: 'number', min: 0, max: 1, step: .05});
        }
    }
    function renderSound(form, row) {
        readOnly(form, 'Sound source ID', row.id); field(form, 'Sound name', row, 'name', {maxLength: 120});
        field(form, 'Sound preset', row, 'preset', {choices: [...data.catalog.ambientPresets, ...data.catalog.customSounds]}); coordinates(form, row);
        const values = grid(form); field(values, 'Radius (tiles)', row, 'radius', {type: 'number', min: 1, max: 64, step: .5}); field(values, 'Volume (0–1)', row, 'volume', {type: 'number', min: 0, max: 1, step: .05});
        form.append(el('p', 'Volume fades with distance and pans relative to the player. Use the Ambience slider in a fresh playtest to hear the result.', {className: 'field-hint'}));
    }
    function renderAddScene(parent) {
        const available = data.catalog.scenes.filter(s => !rows().some(row => String(row.sceneId) === String(s.id)));
        if (!available.length) return;
        const draft = {sceneId: available[0].id}; field(parent, 'Add layers to scene', draft, 'sceneId', {choices: available.map(s => ({id: s.id, name: s.name}))});
        button(parent, 'Add scene layers', () => addRow({sceneId: draft.sceneId, layers: []}));
    }
    async function request(url, body) {
        const response = await (window.ToolboxMapData?.fetch || fetch)(url, {signal: AbortSignal.timeout(45000), ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})});
        const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Temporary content could not be loaded.'); return result;
    }
    async function load(mapId) {
        busy = true; controls(); status('Loading temporary content…');
        try {
            const result = await request('./api/seasons?mapId=' + encodeURIComponent(mapId));
            data = result; original = JSON.stringify(data.events); selectedEvent = 0; selectedIndex = 0; setMove(null);
            $('#seasons-map').value = mapId; $('.seasons-build').href = '#build/?map=' + encodeURIComponent(mapId); $('.seasons-workspace').hidden = false;
            canvas?.destroy(); $('.seasons-map-host').replaceChildren();
            canvas = window.MapmakerCanvas.attach($('.seasons-map-host'), mapId, {onPick: pick, onLoad: () => {refreshMap(); fitSelected();}, interaction: {draw: drawMap}});
            render(); status('Loaded ' + data.source + '. Editor preview includes inactive content.');
            window.ToolboxEnvironment.loadImages().then(() => {if (tab === 'parallax') renderEditor();}).catch(() => {});
        } catch (error) {status(error.message + (data ? ' Your current draft is still here.' : ''), true);}
        finally {busy = false; controls();}
    }
    async function boot(params = window.ToolboxNavigation.params()) {
        if (booting) return booting;
        booting = (async () => {
            try {
                if (!loaded) {
                    const result = await request('./api/seasons'); $('#seasons-map').replaceChildren(...result.maps.map(id => el('option', id, {value: id}))); loaded = true;
                }
                const mapId = params.get('map') || data?.mapId || window.ToolboxMapData?.preferred($('#seasons-map').value) || $('#seasons-map').value;
                if (!data) await load(mapId);
                else if (mapId !== data.mapId) guard(() => load(mapId));
            } catch (error) {loaded = false; status(error.message, true);}
        })().finally(() => {booting = null;}); return booting;
    }
    async function save() {
        if (busy || !dirty()) return;
        const form = $('.seasons-editor').querySelector('form'); if (form && !form.reportValidity()) return;
        busy = true; controls(); status('Saving temporary content…');
        try {
            const eventId = current()?.id;
            const result = await request('./api/seasons', {mapId: data.mapId, revision: data.revision, events: data.events});
            data = result; original = JSON.stringify(data.events); selectedEvent = Math.max(0, data.events.findIndex(event => event.id === eventId));
            selectedIndex = Math.min(selectedIndex, Math.max(0, rows().length - 1)); setMove(null); render();
            status('Saved ' + result.source + '. Build ' + data.mapId + ' to restart the local game, then start a fresh playtest.');
        } catch (error) {status(error.message + ' Your draft is still here. Reload only to discard it.', true);}
        finally {busy = false; controls();}
    }
    $('.seasons-save').onclick = save;
    $('.seasons-new').onclick = addEvent;
    $('.seasons-reload').onclick = () => guard(() => {if (!data) return boot(); window.MapmakerCanvas.invalidate(data.mapId); return load(data.mapId);});
    $('#seasons-map').onchange = e => {const mapId = e.target.value; e.target.value = data?.mapId || mapId; guard(() => load(mapId));};
    $('.seasons-select').onclick = () => setMove(null); $('.seasons-focus').onclick = fitSelected; $('.seasons-collisions').onchange = refreshMap;
    window.addEventListener('beforeunload', e => {if (dirty()) {e.preventDefault(); e.returnValue = '';}});
    window.ToolboxNavigation.route('seasons', boot);
})();

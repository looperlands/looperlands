(() => {
    'use strict';
    const pane = document.getElementById('npc-behaviour');
    if (!pane) return;
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    pane.innerHTML = `<header class="pane-heading"><h2>NPC behaviour & schedule</h2><p>Set routines for individual NPC placements in a map. <a href="#documentation/mapmaker-npcs">Read the guide</a></p></header>
    <div class="asset-library"><div class="field"><label for="npc-map">Map</label><select id="npc-map"></select></div><button type="button" id="npc-reload">Reload routines</button><button type="button" id="npc-new" disabled>New routine</button><button type="button" id="npc-save-top" class="primary" disabled>Save routine</button></div>
    <p id="npc-status" role="status" aria-live="polite">Choose a map to load its routines.</p>
    <div id="npc-discard" class="asset-discard" hidden><p>You have unsaved changes. Discard them to continue?</p><button type="button" id="npc-discard-yes">Discard changes</button><button type="button" id="npc-discard-no">Keep editing</button></div>
    <div class="npc-workspace"><aside><div class="field"><label for="npc-search">Search routines</label><input id="npc-search" type="search" placeholder="Name, ID or NPC type"></div><p id="npc-count" class="field-hint"></p><div id="npc-list" class="npc-list" aria-label="NPC routines"></div></aside><form id="npc-form" hidden><div id="npc-fields"></div><div class="asset-save"><button type="submit" class="primary" id="npc-save">Save routine</button><button type="button" id="npc-reset">Reset saved override</button><span id="npc-dirty"></span></div><p id="npc-source" class="field-hint"></p><p class="field-hint">Save, then <a href="#build">build this map</a> to restart the game and load its NPC files. Placement and collision checks use the most recent map build.</p></form></div>`;
    const $ = selector => pane.querySelector(selector), form = $('#npc-form');
    let data, draft, originalKey, dirty = false, busy = false, sequence = 0, pending, loaded = false, fieldId = 0;
    function status(message, error = false) {$('#npc-status').textContent = message; $('#npc-status').classList.toggle('error', error);}
    function changed(value = true) {dirty = value; $('#npc-dirty').textContent = value ? 'Unsaved changes' : ''; $('#npc-save-top').disabled = busy || !draft || !value; $('#npc-save').disabled = busy || !value;}
    function guard(action) {if (!dirty) return action(); pending = action; $('#npc-discard').hidden = false; $('#npc-discard-no').focus();}
    $('#npc-discard-yes').onclick = () => {const action = pending; pending = null; $('#npc-discard').hidden = true; changed(false); action?.();};
    $('#npc-discard-no').onclick = () => {pending = null; $('#npc-discard').hidden = true;};
    async function request(url, body) {const response = await fetch(url, body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {}); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not load NPC routines. Try again.'); return result;}
    function field(parent, object, key, label, options = {}) {
        const id = 'npc-field-' + ++fieldId, wrap = el('div', '', {className: 'field'});
        const input = options.choices ? el('select') : el(options.multiline ? 'textarea' : 'input');
        if (options.choices) for (const [value, text] of options.choices) input.append(el('option', text, {value}));
        else if (!options.multiline) input.type = options.type || 'text';
        Object.assign(input, {id, value: object[key] ?? '', disabled: !!options.disabled});
        if (options.type === 'number') {input.min = String(options.min ?? 0); input.max = String(options.max ?? 10000); input.step = String(options.step ?? 1);}
        if (options.multiline) input.rows = 3;
        if (options.maxLength) input.maxLength = options.maxLength;
        if (options.required) input.required = true;
        input.addEventListener('input', () => {object[key] = options.type === 'number' ? Number(input.value) : input.value; changed();});
        wrap.append(el('label', label, {htmlFor: id}), input); if (options.hint) wrap.append(el('span', options.hint, {className: 'field-hint'})); parent.append(wrap); return input;
    }
    function check(parent, label, value, update) {const input = el('input', '', {type: 'checkbox', checked: value}); const wrap = el('label', '', {className: 'asset-check'}); wrap.append(input, document.createTextNode(label)); parent.append(wrap); input.onchange = () => {update(input.checked); changed();};}
    function grid(parent) {const node = el('div', '', {className: 'asset-field-grid'}); parent.append(node); return node;}
    function section(parent, heading, help) {const node = el('section', '', {className: 'asset-section'}); node.append(el('h3', heading)); if (help) node.append(el('p', help, {className: 'field-hint'})); parent.append(node); return node;}
    function collapsible(parent, heading, help) {const node = el('details', '', {className: 'npc-detail'}); node.append(el('summary', heading)); if (help) node.append(el('p', help, {className: 'field-hint'})); parent.append(node); return node;}
    function button(parent, label, action) {const node = el('button', label, {type: 'button'}); node.onclick = action; parent.append(node); return node;}
    function area(parent, object) {const row = grid(parent); for (const [key, label] of [['x','Area X'],['y','Area Y'],['width','Area width'],['height','Area height']]) field(row, object, key, label, {type: 'number', min: ['width','height'].includes(key) ? 1 : 0, required: true});}
    function point(parent, object, prefix) {const row = grid(parent); field(row, object, 'x', prefix + ' X', {type: 'number', required: true}); field(row, object, 'y', prefix + ' Y', {type: 'number', required: true});}
    function route(parent, points) {
        const container = el('div', '', {className: 'npc-route'}); parent.append(container);
        function draw() {
            container.replaceChildren(); points.forEach((p, index) => {
                const row = el('div', '', {className: 'npc-waypoint'}); row.append(el('h4', 'Waypoint ' + (index + 1))); const fields = grid(row);
                field(fields, p, 'x', 'Tile X', {type: 'number', required: true}); field(fields, p, 'y', 'Tile Y', {type: 'number', required: true}); field(fields, p, 'waitSeconds', 'Wait · seconds', {type: 'number', min: 1, step: 'any', required: true});
                field(fields, p, 'activity', 'Activity', {maxLength: 240}); field(fields, p, 'line', 'Ambient message', {maxLength: 240}); field(fields, p, 'sound', 'Sound', {choices: [['','None'],['npc','NPC'],['watersplash','Water splash'],['honk','Honk']]});
                const actions = el('div', '', {className: 'npc-row-actions'}); row.append(actions);
                button(actions, 'Move up', () => {if (index) {[points[index-1], points[index]] = [points[index], points[index-1]]; changed(); draw();}}).disabled = index === 0;
                button(actions, 'Remove waypoint', () => {points.splice(index, 1); changed(); draw();}); container.append(row);
            });
            button(container, 'Add waypoint', () => {points.push({x: draft.origin.x, y: draft.origin.y, waitSeconds: 10}); changed(); draw();});
        }
        draw();
    }
    function formatHour(hour) {
        if (!Number.isFinite(hour) || hour < 0 || hour >= 24) return 'Invalid hour';
        const minutes = Math.floor(hour * 60 + 1e-7);
        return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
    }
    function schedule(parent) {
        const wrapper = section(parent, 'Daily schedule', 'Game-time hours: 0–24. The first phase starts at 0; later phases must be in ascending order. One game day lasts one real hour. Without a schedule, the normal route repeats.');
        check(wrapper, 'Use a daily schedule', !!draft.schedule, enabled => {if (enabled) draft.schedule = {buildings: [], phases: [{at: 0, key: 'work', activity: 'following my route', label: 'outside', location: 'outside', explanation: 'I am following my daily route.', travelling: 'walking to my next stop', route: structuredClone(draft.route)}]}; else delete draft.schedule; render();});
        if (!draft.schedule) return;
        const buildings = el('div'), phases = el('div'); wrapper.append(buildings, phases);
        function drawBuildings() {
            buildings.replaceChildren(el('h4', 'Buildings & door routes'), el('p', 'Use public doors with a matching return door on this same map. The entrance lies in the outside area; the return tile lies in the building area.', {className: 'field-hint'}));
            draft.schedule.buildings.forEach((building, index) => {
                const details = el('details', '', {className: 'npc-detail'}); details.append(el('summary', building.label || 'New building')); const row = grid(details);
                field(row, building, 'key', 'Building ID', {required: true, hint: 'Use this ID in a schedule phase’s Location.'}); field(row, building, 'label', 'Building description', {required: true, maxLength: 240});
                point(details, building.entrance, 'Outside entrance'); point(details, building.exit, 'Inside return door'); area(details, building.area);
                button(details, 'Remove building', () => {draft.schedule.buildings.splice(index, 1); changed(); drawBuildings();}); buildings.append(details);
            });
            button(buildings, 'Add building', () => {draft.schedule.buildings.push({key: 'building-' + (draft.schedule.buildings.length + 1), label: 'New building', entrance: {...draft.origin}, exit: {...draft.origin}, area: {...draft.area}}); changed(); drawBuildings();});
        }
        function drawPhases() {
            phases.replaceChildren(el('h4', 'Daily phases'));
            draft.schedule.phases.forEach((phase, index) => {
                const details = el('details', '', {className: 'npc-detail', open: false}); const summary = el('summary', formatHour(phase.at) + ' · ' + phase.activity); details.append(summary); const row = grid(details);
                const at = field(row, phase, 'at', 'Start hour', {type: 'number', min: 0, max: 23.99, step: 'any', required: true, hint: 'Decimals allowed: 6.5 is 06:30.'});
                field(row, phase, 'key', 'Activity type', {choices: [['work','Work'],['free-time','Free time'],['home','Home'],['sleep','Sleep']]});
                const activity = field(row, phase, 'activity', 'Activity description', {required: true, maxLength: 240});
                for (const input of [at, activity]) input.addEventListener('input', () => {summary.textContent = formatHour(phase.at) + ' · ' + phase.activity;});
                field(row, phase, 'location', 'Location ID', {required: true, hint: 'outside, or a Building ID above.'}); field(row, phase, 'label', 'Location description', {required: true, maxLength: 240}); field(row, phase, 'travelling', 'Travelling description', {required: true, maxLength: 240});
                field(details, phase, 'explanation', 'Routine dialogue', {multiline: true, required: true, maxLength: 240}); details.append(el('h4', 'Phase route')); route(details, phase.route);
                button(details, 'Move phase up', () => {if (index) {[draft.schedule.phases[index-1], draft.schedule.phases[index]] = [draft.schedule.phases[index], draft.schedule.phases[index-1]]; changed(); drawPhases();}}).disabled = index === 0;
                button(details, 'Remove phase', () => {draft.schedule.phases.splice(index, 1); changed(); drawPhases();}); phases.append(details);
            });
            button(phases, 'Add phase', () => {draft.schedule.phases.push({at: 12, key: 'free-time', activity: 'taking a break', label: 'outside', location: 'outside', explanation: 'I am taking a break.', travelling: 'walking to my break', route: structuredClone(draft.route)}); changed(); drawPhases();});
        }
        drawBuildings(); drawPhases();
    }
    function render() {
        const content = $('#npc-fields'); content.replaceChildren(); form.hidden = !draft; if (!draft) return;
        content.append(el('h3', draft.label || 'New routine'));
        const identity = section(content, 'Behaviour', 'A routine controls one placed NPC. Origin must exactly match its tile in the built map. Existing story reactions and quest references are preserved.');
        let row = grid(identity); field(row, draft, 'key', 'Routine ID', {disabled: !!originalKey, required: true}); field(row, draft, 'label', 'Name', {required: true, maxLength: 100});
        if (originalKey) field(row, draft, 'kind', 'NPC type', {disabled: true});
        else {const available = data.placements.filter(p => !data.config.npcs.some(n => n.kind === p.kind && n.origin.x === p.x && n.origin.y === p.y)); const choice = {placement: available.findIndex(p => p.kind === draft.kind && p.x === draft.origin.x && p.y === draft.origin.y)}; const select = field(row, choice, 'placement', 'NPC placement', {choices: available.map((p, i) => [String(i), p.kind + ' · ' + p.x + ', ' + p.y])}); select.onchange = () => {const p = available[Number(select.value)]; draft.kind = p.kind; draft.origin = {x: p.x, y: p.y}; draft.area = {...draft.origin, width: 1, height: 1}; draft.route = [{...draft.origin, waitSeconds: 10}]; delete draft.schedule; changed(); render();};}
        field(row, draft, 'preset', 'Behaviour preset', {choices: [['patrol','Patrol'],['work','Work'],['socialise','Socialise']]}); field(row, draft, 'stepMs', 'Step duration · ms', {type: 'number', min: 300, max: 2000, required: true, hint: 'Lower values make walking faster.'});
        check(identity, 'Preserve the original click-through dialogue', draft.preserveDialogue === true, value => {draft.preserveDialogue = value;});
        point(identity, draft.origin, 'Spawn tile'); area(identity, draft.area);
        route(collapsible(content, 'Normal route · ' + draft.route.length + ' waypoints', 'Waypoints repeat in this order. Keep tiles walkable, inside the outside area and away from doors. Used when no daily schedule or during scene overrides.'), draft.route);
        const lines = collapsible(content, 'Ambient dialogue', 'One short plain-text message per line. These messages accompany behaviour; quest dialogue stays in the Quest builder.'); draft.lines ||= {};
        for (const [key, label] of [['greeting','First greeting'],['return','Returning player'],['talk','Conversation'],['kill','Nearby combat'],['quest','Quest completed']]) {
            const proxy = {text: (draft.lines[key] || []).join('\n')}; const input = field(lines, proxy, 'text', label, {multiline: true}); input.addEventListener('input', () => {draft.lines[key] = input.value.split('\n').filter(line => line.trim());});
        }
        schedule(content);
        $('#npc-reset').hidden = !data.customized.includes(originalKey); $('#npc-reset').textContent = data.bundled.includes(originalKey) ? 'Reset to bundled routine' : 'Remove saved routine';
        $('#npc-source').textContent = 'Source: ' + data.source + (data.config.enabled ? '' : ' · Map behaviours are disabled in the bundled configuration.');
    }
    function list() {
        const query = $('#npc-search').value.toLowerCase(), rows = data.config.npcs.filter(npc => [npc.key, npc.kind, npc.label].join(' ').toLowerCase().includes(query));
        $('#npc-count').textContent = rows.length + ' of ' + data.config.npcs.length + ' routines'; $('#npc-list').replaceChildren();
        for (const npc of rows) {const node = button($('#npc-list'), npc.label + ' · ' + npc.kind + ' (' + npc.origin.x + ', ' + npc.origin.y + ')', () => guard(() => select(npc.key))); node.setAttribute('aria-pressed', String(originalKey === npc.key));}
        if (!rows.length) $('#npc-list').append(el('p', data.config.npcs.length ? 'No matching routines.' : 'No routines yet. Create one for a placed NPC.', {className: 'field-hint'}));
    }
    function select(key) {draft = structuredClone(data.config.npcs.find(npc => npc.key === key)); originalKey = draft?.key; changed(false); render(); list(); status(draft ? 'Loaded ' + draft.label + '.' : 'No routine selected.');}
    async function load(mapId, preferred) {
        const token = ++sequence; busy = true; form.inert = true; $('#npc-new').disabled = true; $('#npc-save-top').disabled = true; status('Loading map routines…');
        try {const next = await request('./api/npcs?mapId=' + encodeURIComponent(mapId)); if (token !== sequence) return; data = next; $('#npc-map').value = mapId; select(data.config.npcs.some(npc => npc.key === preferred) ? preferred : data.config.npcs[0]?.key); status('Loaded ' + mapId + ' · ' + data.placements.length + ' NPC placements.');}
        catch (error) {if (token === sequence) {status(error.message, true); $('#npc-map').value = data?.mapId || mapId;}}
        finally {if (token === sequence) {busy = false; form.inert = false; $('#npc-new').disabled = !data?.placements.length; changed(dirty);}}
    }
    async function save(resetKey) {
        if (!data || busy || !draft || (!resetKey && !form.reportValidity())) return; busy = true; form.inert = true; changed(dirty); status('Saving NPC routine…');
        try {data = await request('./api/npcs', {mapId: data.mapId, revision: data.revision, ...(resetKey ? {resetKey} : {npc: draft, originalKey})}); select(resetKey ? data.config.npcs[0]?.key : draft.key); status('Saved. Build ' + data.mapId + ' to restart the game and load these NPC files.');}
        catch (error) {status(error.message, true);} finally {busy = false; form.inert = false; changed(dirty);}
    }
    $('#npc-new').onclick = () => guard(() => {
        const placement = data.placements.find(p => !data.config.npcs.some(n => n.kind === p.kind && n.origin.x === p.x && n.origin.y === p.y));
        if (!placement) {status('Every placed NPC already has a routine. Place another NPC in Tiled and build this map first.', true); return;}
        originalKey = undefined; draft = {key: '', label: placement.kind, kind: placement.kind, preset: 'patrol', preserveDialogue: true, origin: {x: placement.x, y: placement.y}, area: {x: placement.x, y: placement.y, width: 1, height: 1}, stepMs: 600, route: [{x: placement.x, y: placement.y, waitSeconds: 10}], lines: {}}; changed(); render(); list(); status('New routine. Choose an ID and movement area.');
    });
    form.addEventListener('invalid', event => {for (let node = event.target.closest('details'); node; node = node.parentElement.closest('details')) node.open = true;}, true);
    form.onsubmit = event => {event.preventDefault(); save();}; $('#npc-save-top').onclick = () => save();
    $('#npc-reset').onclick = () => guard(() => save(originalKey));
    $('#npc-map').onchange = () => {const map = $('#npc-map').value; $('#npc-map').value = data?.mapId || map; guard(() => load(map));};
    $('#npc-reload').onclick = () => guard(() => load($('#npc-map').value, originalKey)); $('#npc-search').oninput = () => {if (data) list();};
    async function routeScreen() {
        const active = location.hash.startsWith('#npcs/behaviour'); document.getElementById('npc-assets').hidden = active; pane.hidden = !active;
        for (const link of document.querySelectorAll('.npc-subnav a')) {if (link.hash === (active ? '#npcs/behaviour' : '#npcs')) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');}
        if (!active || loaded) return; loaded = true;
        try {const result = await request('./api/npcs'); $('#npc-map').replaceChildren(...result.maps.map(map => el('option', map, {value: map}))); await load(result.maps[0]);}
        catch (error) {status(error.message, true); loaded = false;}
    }
    window.addEventListener('hashchange', routeScreen); routeScreen();
    window.addEventListener('beforeunload', event => {if (dirty) {event.preventDefault(); event.returnValue = '';}});
})();

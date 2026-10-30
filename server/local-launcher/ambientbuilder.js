(() => {
    'use strict';
    const pane = document.getElementById('ambient-pane'), Config = window.AmbientConfig;
    if (!pane || !Config) return;
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    pane.innerHTML = `<header class="pane-heading"><h2>Ambient sounds</h2><p>Place sounds in the world. They fade with distance and pan left or right relative to the player. <a href="#documentation/mapmaker-audio">Read the guide</a></p></header>
        <div class="world-toolbar"><div class="field"><label for="ambient-map">Map</label><select id="ambient-map"></select></div><button class="ambient-save primary" disabled>Save sounds</button><button class="ambient-reload">Reload</button><a class="ambient-build" href="#build">Build this map</a></div>
        <p class="ambient-status" role="status" aria-live="polite">Choose a map.</p>
        <div class="asset-discard ambient-discard" hidden><p>Discard unsaved sound changes to continue?</p><button class="ambient-discard-yes">Discard changes</button><button class="ambient-discard-no">Keep editing</button></div>
        <div class="zones-workspace ambient-workspace" hidden><div class="zones-map-column"><div class="world-toolbar"><div class="field"><label for="ambient-preset">New sound</label><select id="ambient-preset"></select></div><button class="ambient-add">Place sound</button><button class="ambient-preview">Start listening preview</button><button class="ambient-stop" disabled>Stop preview</button></div><div class="world-toolbar"><div class="field"><label for="ambient-upload">Upload a sound</label><input id="ambient-upload" type="file" accept="audio/*,.wav,.mp3,.ogg"></div><button class="ambient-upload-button">Add to sound library</button></div><p class="field-hint">WAV, MP3 or Ogg · up to 30 seconds and 10 MB. Use clips you have permission to distribute. Uploads are available on all maps.</p><p class="ambient-mode field-hint">Select a sound to edit it.</p><div class="ambient-map-host"></div><div class="ambient-listener asset-field-grid"></div><p class="ambient-meter field-hint" aria-live="polite"></p></div>
        <aside class="zones-inspector"><div class="ambient-editor"></div><label for="ambient-search">Search sounds</label><input id="ambient-search" type="search"><div class="world-list ambient-list"></div></aside></div>`;
    const $ = selector => pane.querySelector(selector);
    let data, original, selected, canvas, pending, loaded = false, busy = false, mode = 'select', preview, timer, fieldId = 0;
    let listener = {x: 0, y: 0};
    const sounds = () => ({...Config.presets, ...Object.fromEntries((data?.catalog.customSounds || []).map(sound => [sound.id, {...sound, radius: 12, volume: .45}]))});
    const choices = () => Object.entries(sounds()).map(([id, sound]) => [id, sound.name + (Config.uploadFile(id) ? ' (uploaded)' : '')]);
    function fillSounds(value = $('#ambient-preset').value) {
        $('#ambient-preset').replaceChildren(...choices().map(([id, name]) => el('option', name, {value: id})));
        if (Object.hasOwn(sounds(), value)) $('#ambient-preset').value = value;
    }
    const current = () => data?.entries.find(row => row.id === selected);
    const dirty = () => data && JSON.stringify(data.entries) !== original;
    function status(message, error = false) {$('.ambient-status').textContent = message; $('.ambient-status').classList.toggle('error', error);}
    function controls() {
        $('.ambient-save').disabled = busy || !dirty(); $('.ambient-reload').disabled = busy;
        $('#ambient-map').disabled = busy; $('.ambient-workspace').inert = busy;
        $('.ambient-stop').disabled = !preview; $('.ambient-preview').disabled = !!preview;
    }
    function button(parent, name, action, attrs = {}) {const b = el('button', name, {type: 'button', ...attrs}); b.onclick = action; parent.append(b); return b;}
    function guard(action) {if (busy) return; if (!dirty()) return action(); pending = action; $('.ambient-discard').hidden = false; $('.ambient-discard-no').focus();}
    $('.ambient-discard-yes').onclick = () => {const action = pending; pending = null; $('.ambient-discard').hidden = true; action?.();};
    $('.ambient-discard-no').onclick = () => {pending = null; $('.ambient-discard').hidden = true;};
    function setMode(value) {
        mode = value;
        $('.ambient-mode').textContent = value === 'place' ? 'Click a tile to place the selected sound preset. Or focus the map and press Enter, then edit Tile X/Y. Drag to pan.'
            : value === 'move' ? 'Click a tile to move this sound. Drag to pan.'
                : value === 'listen' ? 'Click the map to move the listener, or use Listener X/Y. The dark dot is your listening position.'
                    : 'Click a sound marker to edit it. The circle shows its audible radius. Drag to pan; scroll to zoom.';
    }
    function refresh() {
        canvas?.set({points: data?.entries || [], selected: data?.entries.findIndex(row => row.id === selected), actor: preview ? listener : null});
        if (preview) {
            preview.update(data.entries, listener);
            const mix = current() && Config.spatial(current(), listener);
            const error = current() && preview.errors.get(current().preset);
            if (error) {$('.ambient-meter').textContent = current().name + ': ' + error; return;}
            $('.ambient-meter').textContent = mix ? current().name + ': ' + Math.round(mix.gain * 100) + '% level · ' + (Math.abs(mix.pan) < .02 ? 'center' : Math.round(Math.abs(mix.pan) * 100) + '% ' + (mix.pan < 0 ? 'left' : 'right')) : 'Listening to nearby sounds.';
        }
    }
    function stop() {clearInterval(timer); timer = null; preview?.destroy(); preview = null; $('.ambient-meter').textContent = ''; setMode('select'); renderListener(); controls(); refresh();}
    function touch() {controls(); renderList(); refresh(); status(dirty() ? 'Unsaved sounds. Save, then start a fresh playtest.' : 'All sound changes are saved.');}
    function field(parent, label, row, key, options = {}, onChange = touch) {
        const id = 'ambient-field-' + (++fieldId), wrap = el('div', '', {className: 'field'});
        const input = el(options.choices ? 'select' : 'input', '', {id});
        if (options.choices) input.append(...options.choices.map(([value, name]) => el('option', name, {value})));
        else {input.type = options.number ? 'number' : 'text'; if (options.number) {input.min = options.min ?? 0; input.max = options.max ?? 10000; input.step = options.step ?? 1;} else input.maxLength = 120;}
        input.value = row[key]; input.required = true;
        input.oninput = () => {row[key] = options.number ? (input.value === '' ? null : Number(input.value)) : input.value; onChange();};
        wrap.append(el('label', label, {htmlFor: id}), input); parent.append(wrap); return input;
    }
    function renderList() {
        const list = $('.ambient-list'), search = $('#ambient-search').value.toLowerCase(); list.replaceChildren();
        for (const row of data?.entries || []) if ((row.name + ' ' + row.preset).toLowerCase().includes(search)) {
            button(list, row.name + ' · ' + row.x + ', ' + row.y, () => select(row.id, true), {ariaPressed: String(selected === row.id)});
        }
        if (!list.children.length) list.append(el('p', search ? 'No matching sounds.' : 'No sounds yet. Choose a preset and place one on the map.'));
    }
    function select(id, focus = false) {
        selected = id; renderEditor(); renderList(); refresh();
        const row = current(); if (focus && row) canvas?.fit({x: row.x - row.radius, y: row.y - row.radius, width: row.radius * 2, height: row.radius * 2});
    }
    function renderEditor() {
        const host = $('.ambient-editor'), row = current(); host.replaceChildren();
        if (!row) {host.append(el('h3', 'Place a sound'), el('p', 'Choose a preset and click Place sound, then click its location on the map. Sources can sit on scenery or blocked tiles.')); return;}
        const form = el('form'); form.onsubmit = e => {e.preventDefault(); save();}; host.append(form);
        form.append(el('h3', 'Sound source')); field(form, 'Name', row, 'name');
        field(form, 'Sound', row, 'preset', {choices: choices()});
        const grid = el('div', '', {className: 'asset-field-grid'}); form.append(grid);
        field(grid, 'Tile X', row, 'x', {number: true, max: data.catalog.width - 1});
        field(grid, 'Tile Y', row, 'y', {number: true, max: data.catalog.height - 1});
        field(grid, 'Radius (tiles)', row, 'radius', {number: true, min: 1, max: 64, step: .5});
        field(grid, 'Volume (0–1)', row, 'volume', {number: true, min: 0, max: 1, step: .05});
        form.append(el('p', 'Full volume at the source, fading smoothly to silence at the radius. Overlapping sources share the mix.', {className: 'field-hint'}));
        const actions = el('div', '', {className: 'world-inline-actions'}); form.append(actions);
        button(actions, 'Move on map', () => setMode('move'));
        button(actions, 'Focus on sound', () => select(row.id, true));
        button(actions, 'Duplicate', () => {const copy = {...row, id: nextId(), name: row.name + ' copy'}; data.entries.push(copy); select(copy.id); setMode('move'); touch();});
        button(actions, 'Remove from draft', () => {data.entries = data.entries.filter(r => r.id !== row.id); select(data.entries[0]?.id); touch();}, {className: 'destructive'});
    }
    function nextId() {let i = 1; while (data.entries.some(row => row.id === 'sound_' + i)) i++; return 'sound_' + i;}
    function pick(point) {
        if (busy) return;
        if (mode === 'listen') {Object.assign(listener, point); renderListener(); refresh(); return;}
        if (mode === 'place') {
            const preset = $('#ambient-preset').value, p = sounds()[preset];
            const row = {id: nextId(), name: p.name, preset, ...point, radius: p.radius, volume: p.volume};
            data.entries.push(row); select(row.id); setMode('select'); touch(); return;
        }
        if (mode === 'move' && current()) {Object.assign(current(), point); renderEditor(); setMode('select'); touch(); return;}
        const row = data.entries.find(row => Math.hypot(row.x - point.x, row.y - point.y) < 2); if (row) select(row.id);
    }
    function renderListener() {
        const host = $('.ambient-listener'); host.replaceChildren(); host.hidden = !preview;
        if (preview) {field(host, 'Listener X', listener, 'x', {number: true, max: data.catalog.width - 1}, refresh); field(host, 'Listener Y', listener, 'y', {number: true, max: data.catalog.height - 1}, refresh);}
    }
    async function request(mapId, body) {
        const response = await (window.ToolboxMapData?.fetch || fetch)('./api/world-authoring' + (mapId ? '?tool=ambient&mapId=' + encodeURIComponent(mapId) : ''), {signal: AbortSignal.timeout(45000), ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})});
        const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Sounds could not load.'); return value;
    }
    async function load(id) {
        stop(); busy = true; controls(); status('Loading map sounds…');
        try {
            const next = await request(id); data = next; original = JSON.stringify(data.entries); $('#ambient-map').value = id; fillSounds();
            $('.ambient-workspace').hidden = false; $('.ambient-build').href = '#build/?map=' + encodeURIComponent(id);
            canvas?.destroy(); $('.ambient-map-host').replaceChildren();
            canvas = window.MapmakerCanvas.attach($('.ambient-map-host'), id, {onPick: pick, label: 'Ambient sound map. Click to select, place or move a sound; coordinate fields are available alongside.',
                interaction: {keydown(event) {if (event.key === 'Enter' && mode === 'place') {pick(current() ? {x: current().x, y: current().y} : {x: 0, y: 0}); return true;} if (event.key === 'Escape') {setMode('select'); return true;}}, draw(ctx, view) {const row = current(); if (!row || !Number.isFinite(row.radius) || row.radius < 1) return; const p = view.project({x: row.x + .5, y: row.y + .5}); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, row.radius * view.scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);}}});
            select(data.entries.some(r => r.id === selected) ? selected : data.entries[0]?.id);
            status('Loaded ' + data.entries.length + ' sounds.');
        } catch (error) {status(error.message, true);} finally {busy = false; controls();}
    }
    async function save() {
        if (busy || !dirty()) return;
        if ($('.ambient-editor').querySelector('form')?.reportValidity() === false) return;
        try {Config.validate(data.entries, data.catalog);} catch (error) {status(error.message, true); return;}
        busy = true; controls();
        try {
            data = await request(null, {mapId: data.mapId, tool: 'ambient', revision: data.revision, entries: data.entries}); original = JSON.stringify(data.entries);
            select(selected); status('Saved ' + data.entries.length + ' sounds. Start a fresh local playtest; production builds include these sources.');
        } catch (error) {status(error.message + ' Your draft is still here.', true);} finally {busy = false; controls();}
    }
    async function boot(params) {
        if (!loaded) {try {const setup = await request(); $('#ambient-map').replaceChildren(...setup.maps.map(id => el('option', id, {value: id}))); loaded = true;} catch (error) {status(error.message, true); return;}}
        const id = params.get('map') || data?.mapId || $('#ambient-map').value;
        if (id !== data?.mapId) return guard(() => load(id));
    }
    fillSounds();
    $('.ambient-upload-button').onclick = async () => {
        if (busy || !data) return;
        const file = $('#ambient-upload').files[0];
        if (!file) {status('Choose an audio file first.', true); return;}
        stop(); busy = true; controls(); status('Preparing and uploading sound…');
        try {
            const body = await window.AmbientUpload.encode(file);
            const response = await (window.ToolboxMapData?.fetch || fetch)('./api/ambient-assets', {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(45000)
            });
            const sound = await response.json(); if (!response.ok) throw new Error(sound.error || 'Upload failed.');
            data.catalog.customSounds = [...(data.catalog.customSounds || []).filter(row => row.id !== sound.id), sound];
            fillSounds(sound.id); renderEditor(); $('#ambient-upload').value = '';
            status('Uploaded ' + sound.name + '. Click Place sound, then save your map. Your current draft is preserved.');
        } catch (error) {status(error.message, true);} finally {busy = false; controls();}
    };
    $('.ambient-add').onclick = () => {if (preview) stop(); setMode('place');};
    $('.ambient-preview').onclick = () => {
        listener = {x: current()?.x || 0, y: current()?.y || 0}; preview = new window.Soundscape(); preview.unlock();
        if (!preview.context) {stop(); status('This browser does not support the audio preview.', true); return;}
        setMode('listen'); renderListener(); controls(); refresh(); timer = setInterval(refresh, 100);
    };
    $('.ambient-stop').onclick = () => {stop(); renderListener();};
    $('.ambient-save').onclick = save; $('.ambient-reload').onclick = () => guard(() => load(data?.mapId || $('#ambient-map').value));
    $('#ambient-map').onchange = event => {const id = event.target.value; event.target.value = data?.mapId || id; guard(() => load(id));};
    $('#ambient-search').oninput = renderList;
    window.addEventListener('beforeunload', event => {if (dirty()) {event.preventDefault(); event.returnValue = '';}});
    document.addEventListener('toolbox:pane', () => {if (pane.hidden) {stop(); renderListener();}});
    document.addEventListener('visibilitychange', () => {if (document.hidden) {stop(); renderListener();}});
    window.ToolboxNavigation.route('ambient', boot);
})();

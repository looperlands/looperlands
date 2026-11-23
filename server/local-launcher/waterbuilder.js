(() => {
    'use strict';
    const pane = document.getElementById('water-pane'), config = window.WaterSurfaces;
    const $ = selector => pane.querySelector(selector);
    const el = (tag, text, props = {}) => Object.assign(document.createElement(tag), {textContent: text, ...props});
    const kinds = {pond: 'Pond', stream: 'Stream', ocean: 'Ocean from map tiles', dry: 'Dry deck or island', reflection: 'Scenery reflection'};
    pane.innerHTML = `<header class="pane-heading"><h2>Water &amp; swimming</h2><p>Draw a crossing or pick the ocean tiles on your map. Add dry decks and shoreline reflections where you need them.</p></header>
        <div class="world-toolbar"><div class="field"><label for="water-map">Map</label><select id="water-map"></select></div>
        <button class="water-save primary" disabled>Save water</button><button class="water-reload">Reload</button><a class="water-build" href="#build">Build this map</a></div>
        <p class="water-status" role="status"></p><div class="water-discard" hidden><p>Discard the unsaved water changes?</p>
        <button class="discard">Discard changes</button> <button class="keep">Keep editing</button></div>
        <div class="water-workspace" hidden><div class="world-inline-actions"><label for="water-kind">Area type</label><select id="water-kind"></select><button class="water-add">Add area</button></div>
        <div class="world-workspace"><div class="world-list-sidebar"><div class="water-list world-list"></div><form class="water-fields"></form></div><div class="water-canvas world-content"></div></div></div>`;
    $('.water-fields').onsubmit = event => event.preventDefault();
    const choices = (select, items) => select.replaceChildren(...Object.entries(items).map(([id, label]) => el('option', label, {value: id})));
    choices($('#water-kind'), kinds);
    let data, selected, editor, snapshot, pending, busy = false, mapsLoaded = false;
    let artwork, picking = false;
    const oceanPreviews = new Map();
    const current = () => data?.entries.find(a => a.id === selected);
    const dirty = () => data && JSON.stringify(data.entries) !== snapshot;
    const defaultRegion = {x: 0, y: 0, width: 1, height: 1};
    function status(message, error = false) {
        $('.water-status').textContent = message;
        $('.water-status').classList.toggle('error', error);
    }
    function controls() {
        $('.water-save').disabled = busy || !dirty();
        $('.water-reload').disabled = busy;
        $('#water-map').disabled = busy;
        $('.water-workspace').inert = busy;
    }
    function guard(action) {
        if (busy) return;
        if (!dirty()) { action(); return; }
        pending = action;
        $('.water-discard').hidden = false;
    }
    $('.discard').onclick = () => { $('.water-discard').hidden = true; const run = pending; pending = null; run?.(); };
    $('.keep').onclick = () => { $('.water-discard').hidden = true; pending = null; };
    function list() {
        const buttons = data.entries.map(area => {
            const b = el('button', area.name || kinds[area.kind], {type: 'button'});
            b.setAttribute('aria-pressed', String(area.id === selected));
            b.onclick = () => { select(area.id); editor.fit(); };
            return b;
        });
        $('.water-list').replaceChildren(...buttons);
    }
    function touch() {
        controls(); list(); editor?.refresh();
        status('Unsaved water changes.');
    }
    function field(form, a, key, label, values) {
        const id = 'water-' + key, wrap = el('div', '', {className: 'field'});
        const input = el(values ? 'select' : 'input', '', {id});
        if (values) choices(input, values);
        else if (key === 'name') Object.assign(input, {type: 'text', maxLength: 100, required: true});
        else Object.assign(input, {type: 'number', min: ['x', 'y'].includes(key) ? 0 : 1, step: 1, required: true});
        input.value = a[key];
        input.oninput = () => {
            a[key] = key === 'paint' ? input.value === 'true' : input.type === 'number' ? input.valueAsNumber : input.value;
            touch();
        };
        wrap.append(el('label', label, {htmlFor: id}), input); form.append(wrap);
    }
    function oceanTiles(form, area) {
        const input = el('input', '', {id:'water-tiles', type:'text', required:true, maxLength:3000, value:area.tiles.join(', ')});
        input.oninput = () => { area.tiles = input.value.trim().split(/[\s,]+/).filter(Boolean).map(Number); touch(); };
        const pick = el('button', picking ? 'Cancel tile picker' : 'Pick a water tile on the map', {type:'button', disabled:!artwork});
        pick.onclick = () => {
            picking = !picking;
            editor.setMode(picking ? 'pan' : 'select');
            select(area.id);
            if (picking) status('Click an ocean tile to add it. Drag to pan or scroll to zoom.');
        };
        form.append(el('label', 'Ocean tile IDs', {htmlFor:input.id}), input, pick);
    }
    function select(id) {
        if (selected !== id && picking) { picking = false; editor?.setMode('select'); }
        selected = id;
        const form = $('.water-fields'), a = current();
        form.replaceChildren(); list(); editor?.refresh();
        if (!a) { form.append(el('p', 'Choose an area type, click Add area, then drag on the map.')); return; }
        form.append(el('h3', kinds[a.kind]));
        field(form, a, 'name', 'Name');
        const geometry = el('div', '', {className: 'asset-field-grid'});
        for (const [key, label] of Object.entries({x: 'X', y: 'Y', width: 'Width', height: 'Height'})) field(geometry, a, key, label);
        form.append(geometry);
        if (a.kind === 'ocean') oceanTiles(form, a);
        else if (a.kind !== 'reflection') field(form, a, 'shape', 'Footprint', {rect: 'Rectangle', oval: 'Oval', natural: 'Natural shore'});
        if (a.kind === 'pond' || a.kind === 'stream') {
            field(form, a, 'depth', 'At the center', {swim: 'Swim at waist depth', wade: 'Wade in the shallows'});
            field(form, a, 'paint', 'Surface artwork', {false: 'Use existing map art', true: 'Paint a water surface'});
            if (a.kind === 'stream') field(form, a, 'flow', 'Current', {east: 'East →', west: 'West ←', north: 'North ↑', south: 'South ↓'});
        }
        const help = a.kind === 'ocean' ? 'Pick each water tile used in the area. The highlighted tiles support swimming. Docks and islands stay dry where their artwork covers the water.' :
            a.kind === 'reflection' ? 'Box the scenery tiles, finishing at the base of the tree or dock. Its reflection extends south into nearby water.' :
            a.kind === 'dry' ? 'Players stand at full height here. Draw over bridges, decks or islands.' :
                'Swimming follows the map’s walkability. To open a blocked route, update its collision in Tiled.';
        form.append(el('p', help, {className: 'field-hint'}));
        const remove = el('button', 'Remove area', {type: 'button', className: 'destructive'});
        remove.onclick = () => { data.entries = data.entries.filter(row => row !== a); select(data.entries[0]?.id); touch(); };
        form.append(remove);
    }
    function oceanPreview(a) {
        if (!artwork || ![a.x,a.y,a.width,a.height].every(Number.isSafeInteger) || a.x < 0 || a.y < 0 ||
            a.x + a.width > artwork.width || a.y + a.height > artwork.height) return;
        const key = [a.x,a.y,a.width,a.height,...a.tiles].join(',');
        if (oceanPreviews.get(a.id)?.key !== key) {
            const path = new Path2D();
            config.oceanRows(a, artwork.tiles, artwork.width).forEach((row, y) => {
                for (let i = 0; i < row.length; i += 2) path.rect(row[i], y, row[i + 1] - row[i], 1);
            });
            oceanPreviews.set(a.id, {key, path});
        }
        return oceanPreviews.get(a.id).path;
    }
    function draw(ctx, view) {
        for (const a of data.entries) {
            if (![a.x,a.y,a.width,a.height].every(Number.isFinite) || a.width <= 0 || a.height <= 0) continue;
            const p = view.project(a), w = a.width * view.scale, h = a.height * view.scale;
            ctx.fillStyle = a.kind === 'dry' ? 'rgba(168,125,73,.5)' : a.kind === 'reflection' ? 'rgba(123,102,183,.4)' : 'rgba(42,170,192,.5)';
            if (a.kind === 'ocean') {
                const path = oceanPreview(a);
                if (path) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(view.scale, view.scale); ctx.fill(path); ctx.restore(); }
                continue;
            }
            ctx.beginPath();
            if (a.shape === 'natural') {
                const left = [], right = [];
                for (let row=0; row<32; row++) {
                    const y = a.y + (row + .5) * a.height / 32;
                    const span = config.bankRow(a, y * 16);
                    left.push(view.project({x:span.left/16,y})); right.push(view.project({x:span.right/16,y}));
                }
                for (const [i,pt] of left.concat(right.reverse()).entries()) ctx[i ? 'lineTo' : 'moveTo'](pt.x, pt.y);
                ctx.closePath();
            } else if (a.shape === 'oval') ctx.ellipse(p.x + w/2, p.y + h/2, w/2, h/2, 0, 0, 2*Math.PI);
            else ctx.rect(p.x, p.y, w, h);
            ctx.fill();
            if (a.kind === 'stream') {
                ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 20px sans-serif';
                ctx.fillText({east:'→',west:'←',north:'↑',south:'↓'}[a.flow], p.x + w/2, p.y + h/2);
            }
        }
    }
    async function request(mapId, body) {
        const url = './api/world-authoring' + (mapId ? '?tool=water&mapId=' + encodeURIComponent(mapId) : '');
        const options = body ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)} : {};
        const response = await (window.ToolboxMapData?.fetch || fetch)(url, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Water areas could not load.');
        return result;
    }
    async function load(id) {
        busy = true; controls(); status('Loading water areas…');
        try {
            data = await request(id); snapshot = JSON.stringify(data.entries);
            $('#water-map').value = id; $('.water-workspace').hidden = false;
            $('.water-build').href = '#build/?map=' + encodeURIComponent(id);
            editor?.destroy(); $('.water-canvas').replaceChildren(); selected = data.entries[0]?.id;
            artwork = null; picking = false; oceanPreviews.clear();
            editor = window.MapmakerRegionEditor.attach($('.water-canvas'), id, {
                area: () => current(), getRegion: () => current() || defaultRegion, getRegions: () => [], editable: () => !!current(),
                onLoad: map => { artwork = map; select(selected); },
                onPick: point => {
                    if (!picking || current()?.kind !== 'ocean') return;
                    const gid = config.topTile(artwork.tiles[point.y * artwork.width + point.x]);
                    if (!gid) { status('Choose a tile with ocean artwork.'); return; }
                    if (!current().tiles.includes(gid)) current().tiles.push(gid);
                    picking = false; editor.setMode('select'); select(selected); touch();
                },
                onChange: region => { Object.assign(current(), region); touch(); }, onCommit: () => select(selected),
                onSelect: point => { const a = data.entries.slice().reverse().find(r => config.shore(r, point.x * 16, point.y * 16) >= 0); if (a) select(a.id); }, draw
            });
            select(selected);
            status(data.entries.length ? 'Loaded ' + data.entries.length + ' water areas.' : 'Water is off for this map. Add an area to opt in.');
        } catch (error) { status(error.message, true); }
        finally { busy = false; controls(); }
    }
    $('.water-add').onclick = () => {
        const kind = $('#water-kind').value;
        let i = 1; while (data.entries.some(a => a.id === 'water_' + i)) i++;
        const a = {id: 'water_' + i, name: kinds[kind] + ' ' + i, kind, x: current()?.x || 0, y: current()?.y || 0, width: 1, height: 1};
        if (kind === 'ocean') a.tiles = [];
        else if (kind !== 'reflection') a.shape = kind === 'pond' ? 'oval' : 'rect';
        if (kind === 'pond' || kind === 'stream') Object.assign(a, {depth: 'swim', paint: false});
        if (kind === 'stream') a.flow = 'east';
        data.entries.push(a); select(a.id); editor.setMode('draw'); touch();
    };
    $('.water-save').onclick = async () => {
        if (busy || !dirty() || !$('.water-fields').reportValidity()) return;
        try {
            config.validate(data.entries, data.catalog); busy = true; controls();
            data = await request(null, {tool:'water', mapId:data.mapId, entries:data.entries, revision:data.revision});
            snapshot = JSON.stringify(data.entries); select(selected);
            status('Water saved. Start a fresh playtest to try this crossing.');
        } catch (error) { status(error.message + ' Your draft is still here.', true); }
        finally { busy = false; controls(); }
    };
    $('.water-reload').onclick = () => guard(() => load(data?.mapId || $('#water-map').value));
    $('#water-map').onchange = event => { const id = event.target.value; event.target.value = data?.mapId || id; guard(() => load(id)); };
    window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
    window.ToolboxNavigation.route('water', async params => {
        try {
            if (!mapsLoaded) { const {maps} = await request(); choices($('#water-map'), Object.fromEntries(maps.map(id => [id,id]))); mapsLoaded = true; }
            const id = params.get('map') || data?.mapId || $('#water-map').value;
            if (id !== data?.mapId) guard(() => load(id));
        } catch (error) { status(error.message, true); }
    });
})();

(() => {
    'use strict';
    const fetchData = (...args) => (window.ToolboxMapData?.fetch || fetch)(...args);
    const pane = document.getElementById('lighting-pane'), L = window.MapmakerLighting;
    if (!pane || !L) return;
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    const clone = value => JSON.parse(JSON.stringify(value));
    const presets = [['torch', 'Torch'], ['lamp', 'Lamp'], ['area', 'Area light'], ['shadow-rectangle', 'Rectangle shadow'], ['shadow-polygon', 'Polygon shadow']];
    pane.innerHTML = `<header class="pane-heading"><h2>Lights &amp; shadows</h2><p>Choose a light, then click the map. Drag its marker to move it. <a href="#documentation/mapmaker-lighting">Read the guide</a></p></header>
        <div class="world-toolbar"><div class="field"><label for="lighting-map">Map</label><select id="lighting-map"></select></div><button type="button" class="lighting-reload">Reload</button><button type="button" class="lighting-save primary" disabled>Save changes</button><a class="lighting-build" href="#build">Build this map</a><a class="lighting-atmosphere" href="#scenes">Ambient lighting</a></div>
        <p class="lighting-status" role="status" aria-live="polite">Choose a map.</p>
        <div class="asset-discard lighting-discard" hidden><p>Discard the unsaved changes to continue?</p><button type="button" class="lighting-discard-yes">Discard changes</button><button type="button" class="lighting-discard-no">Keep editing</button></div>
        <div class="lighting-workspace" hidden><div class="lighting-map-column"><div class="lighting-tools" role="group" aria-label="Map tools"></div><p class="lighting-mode-hint field-hint" role="status" aria-live="polite"></p><div class="lighting-map-host"></div><div class="lighting-view-controls"></div><p class="lighting-preview-status field-hint" role="status"></p></div><aside class="lighting-inspector"><div class="world-content"></div><details class="lighting-object-browser"><summary>Map objects <span class="lighting-count"></span></summary><label for="lighting-search">Search objects</label><input type="search" id="lighting-search"><label for="lighting-filter">Show</label><select id="lighting-filter"><option value="">Lights and shadows</option><option value="light">Light sources</option><option value="shadow">Shadow blockers</option></select><div class="world-list" aria-label="Lighting objects"></div></details></aside></div>`;
    const $ = selector => pane.querySelector(selector);
    let data, draft, selected = null, busy = false, loaded = false, booting, pending, fieldId = 0;
    let mapView, mapId, startPoint, creation = null, ghost = null, gesture, snap = true, previewEnabled = true, darkness = .65;
    let inspectorFields = [], cleanupPreview = () => {}, refreshPreview = () => {}, renderedView;
    let previewBitmap, previewKey, previewObjects = 0;
    const modeButtons = new Map();
    let collection;
    const dirty = () => !!collection?.count;
    const position = row => L.position(row, data.dimensions);
    const editable = row => row && !row.rotation && row.shape !== 'unsupported' && !(row.kind === 'shadow' && row.shape === 'ellipse') && !(row.kind === 'light' && row.shape === 'polygon');
    function status(message, error = false) {$('.lighting-status').textContent = message;$('.lighting-status').classList.toggle('error', error);}
    function button(parent, label, run, attrs = {}) {const b = el('button', label, {type: 'button', ...attrs});b.onclick = run;parent.append(b);return b;}
    function controls() {
        $('.lighting-save').textContent='Save all changes'+(collection?.count?' ('+collection.count+')':'');
        $('.lighting-save').disabled = busy || !dirty();$('.lighting-reload').disabled = busy;$('#lighting-map').disabled = busy;
        $('.lighting-workspace').inert = busy;pane.setAttribute('aria-busy', String(busy));
    }
    function guard(action) {
        if (busy) return;
        if (!dirty()) return action();
        pending = action;$('.lighting-discard').hidden = false;$('.lighting-discard-no').focus();
    }
    $('.lighting-discard-yes').onclick = () => {const action = pending;pending = null;$('.lighting-discard').hidden = true;action?.();};
    $('.lighting-discard-no').onclick = () => {pending = null;$('.lighting-discard').hidden = true;};
    function rows() {return data ? data.objects.filter(row => row.id !== selected).concat(draft ? [draft] : []) : [];}
    function title(row) {return (row.name || (row.kind === 'light' ? row.shape === 'ellipse' ? 'Round light' : 'Area light' : row.shape === 'polygon' ? 'Polygon shadow' : 'Rectangle shadow')) + (collection?.isNew(row.id) ? ' · unsaved' : ' · #' + row.id);}
    function touch() {if(draft)collection.set(draft);renderList();
        controls();status(collection.count+' unsaved changes · keep editing, then save them together.');
        inspectorFields.forEach(sync => sync());invalidatePreview();
    }
    function invalidatePreview() {previewObjects++;mapView?.draw();}
    function setMode(template = null, label = '') {
        creation = template ? {template, label} : null;ghost = null;
        for (const [id, b] of modeButtons) b.setAttribute('aria-pressed', String(creation ? id === label : id === 'select'));
        $('.lighting-mode-hint').textContent = creation ? 'Click the map to place ' + label.toLowerCase() + '. Shift-drag pans. Escape cancels.' : 'Drag markers to move; drag the round handle to resize. Shift-drag pans; scroll zooms.';
        invalidatePreview();
    }
    function arm(type) {setMode(L.preset(type, 0, 0, data.dimensions.tilewidth), presets.find(p => p[0] === type)[1]);}
    function select(row, focus = false) {
        if(row&&!row.id)row=collection.add(row);
        selected = row?.id ?? null;draft = row || null;
        setMode();renderList();renderInspector();controls();
        status('Loaded ' + data.source + ' · ' + data.objects.length + ' lighting objects.');
        if (focus && row) focusObject();
    }
    function focusObject() {
        if (!draft) return;
        const p = position(draft), radius = draft.kind === 'light' && draft.shape === 'ellipse' ? L.light(draft, data.dimensions.tilewidth).radius : 5;
        mapView?.fit({x: p.x - radius - 2, y: p.y - radius - 2, width: radius * 2 + 4, height: radius * 2 + 4});
    }
    async function request(body, id) {
        const response = await fetchData('./api/lighting' + (id ? '?mapId=' + encodeURIComponent(id) : ''), {
            signal: AbortSignal.timeout(45000), ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})});
        const value = await response.json();if (!response.ok) throw new Error(value.error || 'Lighting could not load. Try again.');return value;
    }
    async function load(id) {
        busy = true;controls();status('Loading lights and shadows…');
        try {
            const [result, catalog] = await Promise.all([request(null, id), fetchData('./api/catalog').then(r => r.ok ? r.json() : null).catch(() => null)]);
            const changedMap = mapId !== id;data = result;collection = new window.MapmakerObjectDrafts(data.objects);data.objects = collection.rows;$('#lighting-map').value = id;$('.lighting-workspace').hidden = false;
            $('.lighting-build').href = '#build/?map=' + encodeURIComponent(id);$('.lighting-atmosphere').href = '#scenes/?map=' + encodeURIComponent(id);
            const checkpoint = catalog?.maps?.find(map => map.id === id)?.checkpoints?.find(p => p.starting);
            startPoint = checkpoint || {x: data.dimensions.width / 2, y: data.dimensions.height / 2};
            const objectId = window.ToolboxNavigation.params().get('object');
            select(data.objects.find(row => row.id === objectId) || data.objects.find(row => row.id === selected) || data.objects[0]);
            if (changedMap || !mapView) mountMap(id);
            status('Loaded ' + data.objects.filter(r => r.kind === 'light').length + ' lights and ' + data.objects.filter(r => r.kind === 'shadow').length + ' shadow blockers · ' + data.source);
        } catch (error) {status(error.message, true);}
        finally {busy = false;controls();}
    }
    async function boot(params) {
        if (!loaded) {
            if (booting) return booting;
            booting = request().then(catalog => {$('#lighting-map').replaceChildren(...catalog.maps.map(id => el('option', id, {value: id})));loaded = true;}).catch(error => status(error.message, true)).finally(() => {booting = null;});
            await booting;if (!loaded) return;
        }
        const id = params.get('map') || window.ToolboxMapData?.preferred(data?.mapId || $('#lighting-map').value) || data?.mapId || $('#lighting-map').value;
        if (data?.mapId !== id) return guard(() => load(id));
        const objectId = params.get('object');
        if (objectId && objectId !== selected) select(data.objects.find(row => row.id === objectId), true);
        else refreshPreview();
    }
    async function save(operation) {
        if(busy||!collection)return;
        if(operation==='remove'){collection.remove(draft.id);select(undefined);renderList();mapView?.draw();status(collection.count+' unsaved changes · removal is in the draft.');return;}
        if(!dirty()||($('.lighting-form')&&!$('.lighting-form').reportValidity()))return;
        const operations=collection.changes(), selectedBefore=draft?clone(draft):null;
        busy=true;controls();status('Saving '+operations.length+' map changes together…');
        try{
            data=await request({mapId:data.mapId,revision:data.revision,operations});
            collection=new window.MapmakerObjectDrafts(data.objects);data.objects=collection.rows;
            select(data.objects.find(row=>row.id===selectedBefore?.id)||data.objects.find(row=>row.kind===selectedBefore?.kind&&row.x===selectedBefore?.x&&row.y===selectedBefore?.y));
            status('Saved '+operations.length+' changes to Tiled. Build '+data.mapId+' to update the game.');
        }catch(error){status(error.message,true);}finally{busy=false;controls();mapView?.draw();}
    }
    function renderList() {
        const list = $('.world-list'), query = $('#lighting-search').value.toLowerCase(), kind = $('#lighting-filter').value;
        list.replaceChildren();$('.lighting-count').textContent = '(' + (data?.objects.length || 0) + ')';
        for (const row of data?.objects || []) {
            if ((kind && row.kind !== kind) || ![title(row), row.kind].join(' ').toLowerCase().includes(query)) continue;
            button(list, title(row), () => select(row, true), {ariaPressed: String(selected === row.id)});
        }
        if (!list.childElementCount) list.append(el('p', data?.objects.length ? 'No matching objects.' : 'No objects yet. Choose Torch or Lamp, then click the map.', {className: 'field-hint'}));
    }
    function field(parent, label, get, set, options = {}) {
        const wrap = el('div', '', {className: 'field'}), id = 'lighting-field-' + (++fieldId);
        const input = el(options.choices ? 'select' : options.multiline ? 'textarea' : 'input', '', {id});
        if (options.choices) for (const [value, name] of options.choices) input.append(el('option', name, {value}));
        else if (!options.multiline) input.type = options.type || 'text';
        if (['number', 'range'].includes(options.type)) {input.min = String(options.min ?? 0);input.max = String(options.max ?? 10000);input.step = String(options.step ?? 1);}
        const sync = () => {if (document.activeElement !== input) input.value = get();};sync();inspectorFields.push(sync);
        input.required = options.required !== false;if (options.multiline) input.rows = 4;
        input.oninput = () => {
            const numeric = ['number', 'range'].includes(options.type);
            if (numeric && (input.value === '' || !Number.isFinite(Number(input.value)))) return;
            set(numeric ? Number(input.value) : input.value);touch();
        };
        wrap.append(el('label', label, {htmlFor: id}), input);if (options.hint) wrap.append(el('span', options.hint, {className: 'field-hint'}));parent.append(wrap);return input;
    }
    function grid(parent) {const row = el('div', '', {className: 'asset-field-grid'});parent.append(row);return row;}
    function property(parent, key, label, fallback, options) {return field(parent, label, () => String(draft.properties[key] ?? fallback).replace(',', '.'), value => {draft.properties[key] = String(value);}, options);}
    function details(parent, label) {const node = el('details');node.append(el('summary', label));parent.append(node);return node;}
    function renderInspector() {
        inspectorFields = [];const content = $('.world-content');content.replaceChildren();
        if (!draft) {
            content.append(el('h3', 'Place your first light'), el('p', 'Choose Torch or Lamp above the map, then click where you want it. You can drag it afterwards.'), el('p', 'Lights are invisible emitters. Add matching artwork separately.', {className: 'field-hint'}));return;
        }
        const form = el('form', '', {className: 'lighting-form'});form.onsubmit = e => {e.preventDefault();save();};content.append(form);
        form.append(el('h3', title(draft)));
        if (!editable(draft)) {form.append(el('p', 'Edit this rotated or unsupported shape in Tiled.'));return;}
        const name = field(form, 'Name', () => draft.name, value => {draft.name = value;}, {required: false});name.maxLength = 120;
        if (draft.kind === 'light') {
            const round = draft.shape === 'ellipse', row = grid(form);
            if (round) field(row, 'Radius (tiles)', () => L.light(draft, data.dimensions.tilewidth).radius, value => L.setRadius(draft, value), {type: 'number', min: 1, max: 64});
            property(row, 'intensity', 'Intensity', draft.properties.light ?? '1', {type: 'number', min: 0, max: 1, step: 'any'}).addEventListener('input', () => {if (Object.hasOwn(draft.properties, 'light')) draft.properties.light = null;});
            field(row, 'Color', () => {const c = L.light(draft, data.dimensions.tilewidth).color || {r: 255, g: 255, b: 255};return '#' + [c.r, c.g, c.b].map(v => Number(v).toString(16).padStart(2, '0')).join('');}, value => {draft.properties.color = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).join(',');}, {type: 'color'});
            field(row, 'Animation', () => draft.properties.animation || '', value => {draft.properties.animation = value || null;}, {choices: [['', 'Steady'], ['fire', 'Fire flicker']], required: false});
            if (round) property(form, 'shadow', 'Shadow strength', '0', {type: 'number', min: 0, max: 1, step: 'any'});
            else form.append(el('p', 'Area lights fill their rectangle. Use a round light for projected shadows.', {className: 'field-hint'}));
            if (round) {
                const advanced = details(form, 'Spotlight & falloff'), fields = grid(advanced);
                property(fields, 'innerRadius', 'Inner radius (tiles)', '0', {type: 'number', min: 0, max: 64});
                property(fields, 'spread', 'Beam spread (degrees)', '0', {type: 'number', min: 0, max: 360, hint: '0 lights every direction.'});
                property(fields, 'innerSpread', 'Inner spread (degrees)', '0', {type: 'number', min: 0, max: 360});
                property(fields, 'angle', 'Beam angle (degrees)', '0', {type: 'number', min: 0, max: 360});
            }
        } else form.append(el('p', 'Place this between a light and the area you want shaded. That source needs Shadow strength above 0.', {className: 'field-hint'}));
        const precise = details(form, 'Coordinates & shape'), coords = grid(precise);
        for (const axis of ['x', 'y']) {
            const dimension = axis === 'x' ? 'tilewidth' : 'tileheight', bound = axis === 'x' ? 'width' : 'height';
            field(coords, axis.toUpperCase() + ' (tiles)', () => position(draft)[axis], value => L.move(draft, {...position(draft), [axis]: value}, data.dimensions), {type: 'number', step: 'any', max: data.dimensions[bound] - 1 / data.dimensions[dimension]});
        }
        if (draft.shape === 'polygon') field(precise, 'Polygon points (relative pixels)', () => draft.points, value => {draft.points = value;}, {multiline: true, hint: 'One tile is ' + data.dimensions.tilewidth + ' px. Use x,y pairs separated by spaces.'});
        else for (const [key, size] of [['width', 'tilewidth'], ['height', 'tileheight']]) field(coords, (key === 'width' ? 'Width' : 'Height') + ' (tiles)', () => draft[key] / data.dimensions[size], value => {
            const p = position(draft);draft[key] = value * data.dimensions[size];L.move(draft, p, data.dimensions);
        }, {type: 'number', min: 1 / data.dimensions[size], step: 'any'});
        if (draft.kind === 'light' && draft.shape === 'ellipse') button(precise, 'Use shape radius', () => {draft.properties.radius = null;touch();});
        const actions = el('div', '', {className: 'lighting-object-actions'});form.append(actions);
        button(actions, 'Focus on map', focusObject);
        button(actions, 'Duplicate', () => {
            const copy = clone(draft);copy.id = null;copy.name = (copy.name || 'Light').slice(0, 114) + ' copy';
            copy.properties = Object.fromEntries(Object.entries(copy.properties).filter(([key]) => [...L.propertyNames, 'light'].includes(key)));
            setMode(copy, 'Copy');
        });
        if (collection.isNew(draft.id)) button(actions, 'Discard this addition', () => {collection.remove(draft.id);select(undefined);invalidatePreview();});
        else {
            const remove = details(form, 'Remove object');remove.append(el('p', 'This stages a removal. Save all changes to update the map.'));
            const confirm = el('div', '', {className: 'lighting-delete-confirm', hidden: true});
            button(remove, 'Delete object', () => {confirm.hidden = false;}, {className: 'destructive'});
            button(confirm, 'Confirm deletion', () => save('remove'));button(confirm, 'Cancel', () => {confirm.hidden = true;});remove.append(confirm);
        }
    }
    function place(template, point) {
        const row = clone(template);row.id = null;
        const centered = row.kind === 'light' && row.shape === 'ellipse';
        L.move(row, snap ? {x: Math.floor(point.x) + (centered ? .5 : 0), y: Math.floor(point.y) + (centered ? .5 : 0)} : point, data.dimensions);
        return row;
    }
    function mountMap(id) {
        cleanupPreview();mapView?.destroy();$('.lighting-map-host').replaceChildren();mapId = id;previewBitmap?.close();previewBitmap = null;
        const interaction = {
            start(context) {
                if (context.shiftKey) return false;
                if (creation) {gesture = {kind: 'place', start: context.tile};return true;}
                const target = L.hit(rows().filter(editable), draft, context, data.dimensions);
                if (!target) return false;
                if (target.row !== draft) {
                    select(data.objects.find(row => row.id === target.row.id));
                }
                gesture = {kind: target.kind, start: context.tile, screen: context.screen, object: clone(draft), wasDirty: dirty()};return true;
            },
            move(context) {
                if (!gesture || gesture.kind === 'place') return;
                if (Math.hypot(context.screen.x - gesture.screen.x, context.screen.y - gesture.screen.y) < 3) return;
                if (gesture.kind === 'radius') {
                    const p = position(draft);L.setRadius(draft, Math.hypot(context.tile.x - p.x, context.tile.y - p.y));
                } else {
                    const p = L.position(gesture.object, data.dimensions), dx = context.tile.x - gesture.start.x, dy = context.tile.y - gesture.start.y;
                    L.move(draft, {x: p.x + (snap ? Math.round(dx) : dx), y: p.y + (snap ? Math.round(dy) : dy)}, data.dimensions);
                }
                touch();
            },
            end(context, cancelled) {
                const g = gesture;if (!g) return;
                if (cancelled) {
                    if (g.object) {draft = g.object;collection.set(draft);inspectorFields.forEach(sync => sync());controls();invalidatePreview();status(dirty() ? 'Unsaved changes.' : 'Move cancelled.');}
                } else if (g.kind === 'place' && creation) {const preset=creation;const row = place(preset.template, context.tile);select(row);setMode(preset.template,preset.label);touch();}
                else interaction.move(context);
                gesture = null;
            },
            cursor(context) {
                if (context.shiftKey) return 'grab';
                if (creation) {
                    ghost = place(creation.template, context.tile);invalidatePreview();return 'crosshair';
                }
                const target = L.hit(rows().filter(editable), draft, context, data.dimensions);
                return target?.kind === 'radius' ? 'ew-resize' : target ? 'move' : 'grab';
            },
            draw: drawMapOverlay,
            keydown(event) {
                if (event.key === 'Escape') {if (gesture?.object) {draft = gesture.object;collection.set(draft);inspectorFields.forEach(sync => sync());controls();status(dirty() ? 'Unsaved changes.' : 'Move cancelled.');}gesture = null;setMode();return true;}
                if (!draft || !editable(draft) || creation) return false;
                const delta = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[event.key];
                if (!delta) return false;
                const p = position(draft);L.move(draft, {x: p.x + delta[0], y: p.y + delta[1]}, data.dimensions);touch();return true;
            }
        };
        mapView = window.MapmakerCanvas.attach($('.lighting-map-host'), id, {
            label: 'Lighting map. Choose a preset and click to place. Drag markers to move; drag the round radius handle to resize. Shift and drag pans. Arrow keys move the selected object.',
            area: () => {
                const p = draft ? position(draft) : startPoint, r = draft?.kind === 'light' && draft.shape === 'ellipse' ? Math.max(10, L.light(draft, data.dimensions.tilewidth).radius + 2) : 10;
                return {x: p.x - r, y: p.y - r, width: r * 2, height: r * 2};
            }, interaction
        });
        cleanupPreview = attachMapPreview();
        mapView.ready.then(() => mapView?.draw());
    }
    function drawMapOverlay(ctx, {project, scale}) {
        if (!data) return;
        const origin = project({x: 0, y: 0}), size = data.dimensions.tilewidth;
        const view = {x: -origin.x / scale * size, y: -origin.y / scale * size, width: ctx.canvas.width / scale * size, height: ctx.canvas.height / scale * size};
        renderedView = view;const key = JSON.stringify([view, previewObjects, darkness, previewEnabled]);
        refreshPreview(key, view);
        if (previewEnabled && previewBitmap && previewKey === JSON.stringify(view)) {
            ctx.save();ctx.globalCompositeOperation = 'multiply';ctx.drawImage(previewBitmap, 0, 0, ctx.canvas.width, ctx.canvas.height);ctx.restore();
        }
        for (const row of rows().concat(ghost ? [ghost] : []).filter(editable)) {
            const p = project(position(row)), active = row === draft || row === ghost;
            ctx.save();ctx.strokeStyle = active ? '#ffffff' : '#2563eb';ctx.fillStyle = active ? '#1e4f9d' : '#2563eb';ctx.lineWidth = active ? 2 : 1;
            if (row.kind === 'light' && row.shape === 'ellipse') {
                const radius = L.light(row, size).radius * scale;
                if (Number.isFinite(radius) && radius > 0) {ctx.setLineDash(active ? [5, 4] : [2, 5]);ctx.beginPath();ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);ctx.stroke();ctx.setLineDash([]);}
                if (active && row !== ghost) {ctx.beginPath();ctx.arc(p.x + radius, p.y, 6, 0, Math.PI * 2);ctx.fill();ctx.stroke();}
            } else if (row.shape === 'rectangle') ctx.strokeRect(p.x, p.y, row.width / size * scale, row.height / data.dimensions.tileheight * scale);
            else if (row.shape === 'polygon') {
                const points = row.points.trim().split(/\s+/).map(value => value.split(',').map(Number));
                if (points.every(v => v.length === 2 && v.every(Number.isFinite))) {ctx.beginPath();points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](p.x + x / size * scale, p.y + y / data.dimensions.tileheight * scale));ctx.closePath();ctx.stroke();}
            }
            ctx.beginPath();if (row.kind === 'light') ctx.arc(p.x, p.y, active ? 8 : 6, 0, Math.PI * 2);else ctx.rect(p.x - 6, p.y - 6, 12, 12);ctx.fill();ctx.stroke();
            if (active) {ctx.fillStyle = '#202936';const label = row === ghost ? 'Click to place' : row.kind === 'light' && row.shape === 'ellipse' ? L.light(row, size).radius + ' tiles' : 'Drag to move';ctx.font = '12px system-ui';const width = ctx.measureText(label).width;ctx.fillRect(p.x + 12, p.y - 24, width + 12, 22);ctx.fillStyle = '#ffffff';ctx.fillText(label, p.x + 18, p.y - 9);}
            ctx.restore();
        }
    }
    function attachMapPreview() {
        let worker, stopped = false, inFlight = false, queued, lastSent, requestId = 0, latest;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const note = $('.lighting-preview-status');note.textContent = 'Preview darkness is for editing only. Player lights and tile-emitted lights are excluded.';
        function send(key, view) {
            if (stopped || pane.hidden || !previewEnabled || !view) return;
            latest = {key, view};if (!worker || key === lastSent) return;
            if (inFlight) {queued = latest;return;}
            inFlight = true;lastSent = key;const id = ++requestId;
            worker.postMessage({objects: rows().filter(row => row.shape !== 'unsupported').concat(ghost ? [ghost] : []), dimensions: data.dimensions, view, darkness, motion: !reduced.matches, requestId: id});
            workerView = JSON.stringify(view);
        }
        let workerView;
        try {
            worker = new Worker('./lightingpreview-worker.js');
            worker.onmessage = event => {
                inFlight = false;if (stopped) {event.data.bitmap?.close();return;}
                if (event.data.error) note.textContent = 'Preview: ' + event.data.error + '. Check the selected object.';
                else {previewBitmap?.close();previewBitmap = event.data.bitmap;previewKey = workerView;note.textContent = 'Live lighting preview · preview darkness does not change the map atmosphere.';}
                if (queued) {const next = queued;queued = null;send(next.key, next.view);}
                mapView?.draw();
            };
            worker.onerror = () => {inFlight = false;worker.terminate();worker = null;note.textContent = 'Lighting preview is unavailable. Map placement still works; reload to retry.';};
        } catch (_) {note.textContent = 'Lighting preview requires Web Worker and OffscreenCanvas support. Map placement still works.';}
        refreshPreview = (key, view) => send(key || latest?.key, view || latest?.view);
        const timer = setInterval(() => {
            if (!reduced.matches && renderedView && rows().concat(ghost ? [ghost] : []).some(row => row.properties.animation === 'fire')) {lastSent = null;refreshPreview(JSON.stringify([renderedView, previewObjects, darkness, previewEnabled]), renderedView);}
        }, 150);
        return () => {stopped = true;clearInterval(timer);worker?.terminate();refreshPreview = () => {};};
    }
    button($('.lighting-tools'), 'Select / move', () => setMode(), {ariaPressed: 'true'});modeButtons.set('select', $('.lighting-tools button'));
    for (const [type, label] of presets) modeButtons.set(label, button($('.lighting-tools'), label, () => arm(type), {ariaPressed: 'false'}));
    function checkbox(parent, label, checked, change) {const wrap = el('label', '', {className: 'asset-check'}), input = el('input', '', {type: 'checkbox', checked});wrap.append(input, document.createTextNode(label));input.onchange = () => change(input.checked);parent.append(wrap);return input;}
    checkbox($('.lighting-view-controls'), 'Snap to tiles', true, value => {snap = value;});
    checkbox($('.lighting-view-controls'), 'Preview lighting', true, value => {previewEnabled = value;invalidatePreview();});
    const darknessField = el('label', 'Preview darkness', {className: 'lighting-darkness'}), darknessInput = el('input', '', {type: 'range', min: 0, max: 1, step: .05, value: darkness});darknessField.append(darknessInput);$('.lighting-view-controls').append(darknessField);
    darknessInput.oninput = () => {darkness = Number(darknessInput.value);invalidatePreview();};
    $('#lighting-search').oninput = renderList;$('#lighting-filter').onchange = renderList;
    $('.lighting-save').onclick = () => save();$('.lighting-reload').onclick = () => guard(() => {window.MapmakerCanvas.invalidate?.(data?.mapId);mapId = null;return load(data?.mapId || $('#lighting-map').value);});
    $('#lighting-map').onchange = event => {const id = event.target.value;event.target.value = data?.mapId || id;guard(() => load(id));};
    window.addEventListener('beforeunload', event => {if (dirty()) {event.preventDefault();event.returnValue = '';}});
    window.ToolboxNavigation.route('lighting', boot);
})();

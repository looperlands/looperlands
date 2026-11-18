(() => {
    'use strict';
    const pane = document.getElementById('shadow-profiles-pane');
    if (!pane) return;
    const api = './api/shadow-profiles', clone = value => JSON.parse(JSON.stringify(value));
    const titles = {bodies: 'Shadow bodies', paint: 'Paint removal', outdoors: 'Outdoor areas'};
    const singular = {bodies: 'body', paint: 'paint region', outdoors: 'outdoor area'};
    const shapeNames = {wall: 'Wall or solid object', gable: 'Gabled roof', rock: 'Rock', column: 'Column', glass: 'Glass',
        'round-crown': 'Rounded tree crown', 'bare-tree': 'Branching tree', crown: 'Main oak', 'slate-house': 'Slate house', board: 'Event board'};
    pane.innerHTML = `<header class="pane-heading"><h2>Scenery shadows</h2><p>Edit height profiles for tilesheet objects to shape the shadows they cast in the game.</p></header>
        <div class="world-toolbar"><div class="field"><label for="sp-map">Map</label><select id="sp-map"></select></div><button type="button" id="sp-save" class="primary" disabled>Save changes</button><button type="button" id="sp-reload">Reload</button><a id="sp-lights" href="#lighting">Lights &amp; shadows</a></div>
        <p class="sp-status" role="status"></p>
        <div class="asset-discard sp-discard" hidden><p>Discard the unsaved changes to continue?</p><button type="button" class="sp-discard-yes">Discard changes</button> <button type="button" class="sp-discard-no">Keep editing</button></div>
        <div class="sp-workspace" hidden><div class="sp-modes" role="group" aria-label="Profile settings"></div>
        <div class="sp-columns"><div class="sp-main"><div class="sp-sheet-heading"><h3 id="sp-surface-title">Tilesheet</h3><div class="sp-zoom"><button type="button" id="sp-pan" aria-pressed="false">Pan</button><button type="button" id="sp-fit">Fit width</button><label for="sp-zoom">Zoom</label><select id="sp-zoom"></select><button type="button" id="sp-focus">Focus selection</button></div></div>
        <p class="field-hint sp-hint"></p><div class="sp-scroll" tabindex="0" aria-labelledby="sp-surface-title"><div class="sp-stage"><img class="sp-image" alt="" draggable="false"><div class="sp-outlines"></div></div></div><p class="sp-dimensions field-hint"></p>
        <section class="sp-preview" aria-label="Selected body preview"><div class="sp-sheet-heading"><h3>Body preview</h3><label for="sp-hour">Sun position <output id="sp-time" for="sp-hour">12:00</output></label><input id="sp-hour" type="range" min="6" max="18" step="0.5" value="12"></div><p class="sp-preview-status field-hint" role="status"></p>
        <div class="sp-samples"><figure><div><canvas id="sp-proxy" width="1" height="1"></canvas></div><figcaption>Height proxy</figcaption></figure><figure><div><canvas id="sp-cast" width="1" height="1"></canvas></div><figcaption>Projected shadow</figcaption></figure></div></section></div>
        <aside class="sp-inspector"><div class="field"><label for="sp-record">Selected object</label><select id="sp-record"></select></div><div class="world-inline-actions"><button type="button" id="sp-add"></button><button type="button" id="sp-delete"></button></div>
        <form class="sp-fields"></form></aside></div></div>`;
    const $ = selector => pane.querySelector(selector);
    const el = (tag, text, attrs) => Object.assign(document.createElement(tag), {textContent: text || ''}, attrs);
    const modes = $('.sp-modes'), form = $('.sp-fields'), sheet = $('.sp-scroll'), stage = $('.sp-stage');
    const mapChoice = $('#sp-map'), record = $('#sp-record'), zoomChoice = $('#sp-zoom');
    let data, draft, type = 'bodies', selected = -1, zoom = 1, request, discard, busy = false, boot, dragged, pending;
    let worker, previewAbort, generation = 0, renderKey = 0, ready = false, tileImage;
    const fields = ['bodies', 'paint', 'outdoors'];
    const content = row => Object.fromEntries(fields.map(key => [key, row[key] || []]));
    const dirty = () => data && JSON.stringify(draft) !== JSON.stringify(content(data));
    const entry = () => draft?.[type]?.[selected];
    const outdoors = () => type === 'outdoors';
    const dimensions = () => outdoors() ? [data.mapWidth, data.mapHeight] : [data.artWidth, data.artHeight];
    function rect(row) {
        if (type === 'bodies') return row.bounds;
        if (type === 'paint') return row;
        return [row.x, row.y, row.x + row.width, row.y + row.height];
    }
    function setRect(box) {
        if (type === 'bodies') entry().bounds = box;
        else if (type === 'paint') draft.paint[selected] = box;
        else Object.assign(entry(), {x: box[0], y: box[1], width: box[2] - box[0], height: box[3] - box[1]});
    }
    function status(message, error = false) {
        $('.sp-status').textContent = message;
        $('.sp-status').classList.toggle('error', error);
    }
    function controls() {
        const changed = dirty();
        $('#sp-save').disabled = busy || !changed;
        mapChoice.disabled = busy;
        $('#sp-reload').disabled = busy || !mapChoice.value;
        $('.sp-workspace').inert = busy;
    }
    function touch() {
        controls();
        status(dirty() ? 'Unsaved changes.' : 'All changes saved.');
        outlines();
        schedulePreview();
    }
    function guarding(action) {
        if (!dirty()) return action();
        discard = action;
        $('.sp-discard').hidden = false;
        $('.sp-discard-no').focus();
    }
    $('.sp-discard-yes').onclick = () => {const action = discard; discard = null; $('.sp-discard').hidden = true; action?.();};
    $('.sp-discard-no').onclick = () => {discard = null; $('.sp-discard').hidden = true;};
    window.addEventListener('beforeunload', e => {if (dirty()) {e.preventDefault(); e.returnValue = '';}});

    async function json(url, options) {
        const response = await fetch(url, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load shadow profiles.');
        return result;
    }
    function description(row, i) {
        if (type === 'bodies') return row.name || 'Unnamed body';
        const box = rect(row);
        return (outdoors() ? 'Area ' : 'Region ') + (i + 1) + ' · ' + box[0] + ', ' + box[1] + ' · ' + (box[2] - box[0]) + ' × ' + (box[3] - box[1]);
    }
    function recordOptions() {
        record.replaceChildren(...draft[type].map((row, i) => el('option', description(row, i), {value: String(i)})));
        if (!draft[type].length) record.append(el('option', 'No ' + titles[type].toLowerCase() + ' yet', {value: '-1'}));
        record.value = String(selected);
        record.disabled = !draft[type].length;
        $('#sp-focus').disabled = $('#sp-delete').disabled = !entry();
    }
    function displaySurface() {
        const [w, h] = dimensions(), image = $('.sp-image');
        const src = outdoors() ? '/img/common/miniMap_' + encodeURIComponent(data.mapId) + '.png' : data.artwork;
        image.onerror = () => {image.hidden = true; $('.sp-dimensions').textContent = w + ' × ' + h + (outdoors() ? ' tiles · Map image unavailable. The grid still uses map coordinates.' : ' pixels · Tilesheet could not be loaded.');};
        image.hidden = false;
        if (image.getAttribute('src') !== src) image.src = src;
        $('#sp-surface-title').textContent = outdoors() ? 'Map area' : 'Tilesheet';
        $('.sp-dimensions').textContent = w + ' × ' + h + (outdoors() ? ' map tiles' : ' native pixels · ' + data.tileset);
        $('.sp-preview').hidden = type !== 'bodies';
        $('.sp-hint').textContent = type === 'bodies' ? 'Drag around the complete object, including its foot. Click an outline to select an existing body.' :
            outdoors() ? 'Drag across the outdoor map tiles that receive sunlight. Keep interiors outside the selected areas.' :
            'Drag around painted shadow ink. The baker removes translucent neutral ink inside the selection.';
    }
    function drawBox(box, current) {
        const [w, h] = dimensions();
        const outline = el('span', '', {className: current ? 'sp-outline selected' : 'sp-outline'});
        Object.assign(outline.style, {left: 100 * box[0] / w + '%', top: 100 * box[1] / h + '%',
            width: 100 * (box[2] - box[0]) / w + '%', height: 100 * (box[3] - box[1]) / h + '%'});
        return outline;
    }
    function outlines() {
        const overlay = $('.sp-outlines'), nodes = [];
        draft[type].forEach((row, i) => {if (i !== selected) nodes.push(drawBox(rect(row), false));});
        if (entry()) nodes.push(drawBox(dragged?.box || rect(entry()), true));
        if (!entry() && dragged?.box) nodes.push(drawBox(dragged.box, true));
        overlay.replaceChildren(...nodes);
    }
    function resize(value) {
        const [w, h] = dimensions();
        zoom = value === 'fit' ? Math.min(4, (sheet.clientWidth || 600) / w) : Number(value);
        stage.style.width = Math.max(1, w * zoom) + 'px';
        stage.style.height = Math.max(1, h * zoom) + 'px';
        zoomChoice.value = value;
    }
    for (const value of [0.125, .25, .5, 1, 2, 4, 8]) zoomChoice.append(el('option', value * 100 + '%', {value: String(value)}));
    zoomChoice.prepend(el('option', 'Fit', {value: 'fit'}));
    zoomChoice.onchange = () => resize(zoomChoice.value);
    $('#sp-fit').onclick = () => {resize('fit'); sheet.scrollTo(0, 0);};
    $('#sp-focus').onclick = () => {
        if (!entry()) return;
        const [l, t, r, b] = rect(entry());
        const ideal = Math.min(sheet.clientWidth / Math.max(1, r - l + 24), sheet.clientHeight / Math.max(1, b - t + 24));
        const choice = [8, 4, 2, 1, .5, .25, .125].find(v => v <= ideal) || .125;
        resize(String(choice));
        sheet.scrollTo((l + r) * zoom / 2 - sheet.clientWidth / 2, (t + b) * zoom / 2 - sheet.clientHeight / 2);
    };
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => {if (data && zoomChoice.value === 'fit' && sheet.clientWidth) resize('fit');}).observe(sheet);

    function pick(index) {
        selected = index; dragged = null; clearPreview();
        recordOptions(); inspector(); outlines(); schedulePreview();
    }
    function mode(key) {
        type = key;
        for (const button of modes.children) button.setAttribute('aria-pressed', String(button.dataset.key === key));
        const label = singular[key];
        $('#sp-add').textContent = 'Add ' + label; $('#sp-delete').textContent = 'Delete ' + label;
        $('label[for="sp-record"]').textContent = 'Selected ' + label;
        displaySurface(); resize('fit'); sheet.scrollTo(0, 0);
        pick(draft[type].length ? 0 : -1);
    }
    for (const [key, label] of Object.entries(titles)) {
        const button = el('button', label, {type: 'button'});
        button.dataset.key = key; button.onclick = () => mode(key); modes.append(button);
    }
    function add(box) {
        const item = type === 'bodies' ? {name: 'New body', bounds: box, shape: 'wall', front: Math.min(12, box[3] - box[1]), slope: .5, depth: 4} :
            outdoors() ? {x: box[0], y: box[1], width: box[2] - box[0], height: box[3] - box[1]} : box;
        draft[type].push(item); pick(draft[type].length - 1); touch();
    }
    $('#sp-add').onclick = () => {
        const [w, h] = dimensions(), size = outdoors() ? 8 : 16;
        const x = Math.min(w - 1, Math.floor(sheet.scrollLeft / zoom)), y = Math.min(h - 1, Math.floor(sheet.scrollTop / zoom));
        add([x, y, Math.min(w, x + size), Math.min(h, y + size)]); form.querySelector('input')?.focus();
    };
    $('#sp-delete').onclick = () => {draft[type].splice(selected, 1); pick(Math.min(selected, draft[type].length - 1)); touch();};

    function point(event) {
        const r = stage.getBoundingClientRect(), [w, h] = dimensions();
        return [Math.max(0, Math.min(w - 1, Math.floor((event.clientX - r.left) * w / r.width))),
            Math.max(0, Math.min(h - 1, Math.floor((event.clientY - r.top) * h / r.height)))];
    }
    let pan = false;
    const panButton = $('#sp-pan');
    panButton.onclick = () => {
        pan = !pan; panButton.setAttribute('aria-pressed', String(pan)); stage.classList.toggle('sp-panning', pan);
    };
    stage.onpointerdown = e => {
        if (busy || e.button !== 0 || dragged) return;
        if (pan && e.pointerType === 'touch') return;
        const [x, y] = point(e);
        dragged = {pan, left: sheet.scrollLeft, top: sheet.scrollTop, id: e.pointerId, x, y, screenX: e.clientX, screenY: e.clientY};
        stage.setPointerCapture(e.pointerId);
    };
    stage.onpointermove = e => {
        if (dragged?.id !== e.pointerId) return;
        if (dragged.pan) {sheet.scrollTo(dragged.left + dragged.screenX - e.clientX, dragged.top + dragged.screenY - e.clientY); return;}
        if (!dragged.box && Math.hypot(e.clientX - dragged.screenX, e.clientY - dragged.screenY) < 3) return;
        const [x, y] = point(e);
        dragged.box = [Math.min(x, dragged.x), Math.min(y, dragged.y), Math.max(x, dragged.x) + 1, Math.max(y, dragged.y) + 1];
        outlines();
    };
    stage.onpointerup = e => {
        if (dragged?.id !== e.pointerId) return;
        stage.onpointermove(e);
        const {box, x, y, pan: movedView} = dragged; dragged = null; stage.releasePointerCapture(e.pointerId);
        if (movedView) return;
        if (box) {
            if (!entry()) add(box);
            else {setRect(box); pick(selected); touch();}
        } else {
            const hits = draft[type].map((row, i) => ({i, b: rect(row)})).filter(({b}) => x >= b[0] && x < b[2] && y >= b[1] && y < b[3]);
            hits.sort((a, b) => (a.b[2] - a.b[0]) * (a.b[3] - a.b[1]) - (b.b[2] - b.b[0]) * (b.b[3] - b.b[1]));
            if (hits.length) pick(hits[0].i);
        }
    };
    stage.onpointercancel = () => {dragged = null; outlines();};

    let fieldLimits = [], nextField = 0;
    function field(parent, label, value, update, options = {}) {
        const id = 'sp-field-' + (++nextField);
        const wrap = el('div', '', {className: 'field'}), title = el('label', label, {htmlFor: id});
        const control = el(options.choices ? 'select' : 'input', '', {id});
        if (options.choices) {
            for (const [v, name] of options.choices) control.append(el('option', name, {value: v}));
        } else {
            control.type = options.text ? 'text' : 'number';
            if (!options.text) {
                const limit = value => typeof value === 'function' ? value() : value;
                const limits = () => {
                    control.min = String(limit(options.min) ?? 0);
                    control.max = String(limit(options.max) ?? 255);
                };
                limits(); fieldLimits.push(limits);
                control.step = String(options.step ?? 1);
            }
        }
        if (options.pattern) control.pattern = options.pattern;
        control.value = value ?? ''; control.required = !options.optional;
        control.addEventListener(options.choices ? 'change' : 'input', () => {
            if (control.value === '' && control.required) {control.reportValidity(); return;}
            if (!control.checkValidity()) return;
            update(!options.choices && !options.text && control.value !== '' ? Number(control.value) : control.value);
            fieldLimits.forEach(refresh => refresh());
            recordOptions(); touch();
        });
        wrap.append(title, control); parent.append(wrap);
        return control;
    }
    function section(label) {
        form.append(el('h4', label));
        const grid = el('div', '', {className: 'sp-field-grid'}); form.append(grid); return grid;
    }
    function inspector() {
        form.replaceChildren(); fieldLimits = [];
        const row = entry();
        if (!row) {form.append(el('p', 'Add a ' + singular[type] + ' or drag a rectangle to start.', {className: 'field-hint'})); return;}
        if (type === 'bodies') {
            field(form, 'Body name', row.name, v => {row.name = v;}, {text: true});
            const known = ['wall', 'gable', 'rock', 'column', 'glass', 'round-crown'];
            const shape = row.shape || 'wall';
            if (!known.includes(shape)) known.push(shape);
            field(form, 'Shape', shape, value => {
                row.shape = value;
                const w = row.bounds[2] - row.bounds[0], h = row.bounds[3] - row.bounds[1];
                if (value === 'round-crown' && !row.crownBottom) {
                    row.crownBottom = Math.max(1, Math.round(h * .72));
                    row.trunk ??= [Math.floor(w * .42), Math.ceil(w * .58)];
                    row.depth = Math.max(1, Math.min(255, Math.round(Math.min(w * .48, row.crownBottom * .6))));
                }
                row.front ??= Math.min(160, Math.round(h * .45));
                row.slope ??= .5; row.depth ??= Math.min(255, Math.max(1, Math.round(w * .25)));
                inspector();
            }, {choices: known.map(v => [v, shapeNames[v] || v])});
        }
        const [w, h] = dimensions(), box = rect(row);
        const grid = section(outdoors() ? 'Map bounds · tiles' : 'Artwork bounds · pixels');
        const labels = outdoors() ? ['Left', 'Top', 'Width', 'Height'] : ['Left', 'Top', 'Right edge', 'Bottom edge'];
        labels.forEach((label, i) => {
            const extent = i % 2 ? h : w;
            const value = outdoors() && i >= 2 ? box[i] - box[i - 2] : box[i];
            field(grid, label, value, v => {
                const next = rect(entry()).slice();
                if (outdoors() && i < 2) next[i + 2] += v - next[i];
                next[i] = outdoors() && i >= 2 ? next[i - 2] + v : v;
                setRect(next);
            }, {min: i >= 2 ? 1 : 0, max: i >= 2 ? extent : extent - 1});
        });
        if (!outdoors()) form.append(el('p', 'Right and bottom edges are exclusive.', {className: 'field-hint'}));
        if (type !== 'bodies') return;
        const parameters = section('Body geometry');
        const change = (key, v) => {if (v === '') delete row[key]; else row[key] = v;};
        const bodyWidth = () => row.bounds[2] - row.bounds[0], bodyHeight = () => row.bounds[3] - row.bounds[1];
        const specs = row.shape === 'bare-tree' ? [
            ['trunkX', 'Trunk center X', .5, 0, () => bodyWidth() - .5],
            ['trunkRadius', 'Trunk radius', .5, .5, bodyWidth], ['forkY', 'First fork Y', 1, 1, bodyHeight]
        ] : [['front', 'Front height', 1, 0, 160], ['slope', 'Roof slope', .01, 0, 1], ['depth', 'Ground depth', 1, 0, 255]];
        for (const [key, label, step, min, max] of specs) field(parameters, label, row[key], v => change(key, v), {step, min, max});
        if (row.shape === 'round-crown') {
            field(parameters, 'Crown bottom', row.crownBottom, v => change('crownBottom', v), {min: 1, max: bodyHeight});
            field(form, 'Foliage colors', (row.foliageColors || []).join(', '), v => {
                if (v.trim()) row.foliageColors = v.trim().split(/[\s,]+/);
                else delete row.foliageColors;
            }, {text: true, optional: true, pattern: '#[0-9a-fA-F]{6}(?:[,\\s]+#[0-9a-fA-F]{6})*'});
            form.append(el('p', 'Optional hex colors, separated by commas. Leave empty to include all opaque crown colors.', {className: 'field-hint'}));
        }
        if (row.shape !== 'bare-tree') {
            const advanced = el('details'); advanced.append(el('summary', 'Raised sections and supports')); form.append(advanced);
            const opts = el('div', '', {className: 'sp-field-grid'}); advanced.append(opts);
            field(opts, 'Raised above row', row.raisedAbove, v => change('raisedAbove', v), {optional: true, max: bodyHeight});
            ['Trunk left', 'Trunk right'].forEach((label, side) => field(opts, label, row.trunk?.[side], v => {
                if (v === '') delete row.trunk;
                else {row.trunk ??= [0, Math.max(1, row.bounds[2] - row.bounds[0])]; row.trunk[side] = v;}
            }, {optional: row.shape !== 'round-crown',
                min: () => side ? (row.trunk?.[0] ?? 0) + 1 : 0,
                max: () => side ? bodyWidth() : (row.trunk?.[1] ?? bodyWidth()) - 1}));
        }
    }
    record.onchange = () => {pick(Number(record.value)); $('#sp-focus').click();};
    form.onsubmit = e => e.preventDefault();

    function previewStatus(message) {$('.sp-preview-status').textContent = message;}
    function previewBitmap(selector, bitmap) {
        const canvas = $(selector);
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close();
    }
    function clearPreview() {
        for (const id of ['#sp-proxy', '#sp-cast']) {const c = $(id); c.width = c.height = 1;}
    }
    function renderer() {
        if (worker) return worker;
        worker = new Worker('./shadowprofilepreview-worker.js');
        worker.onmessage = ({data: result}) => {
            if (result.generation === generation && result.proxy) previewBitmap('#sp-proxy', result.proxy);
            else result.proxy?.close();
            if (result.request !== renderKey) {result.cast?.close(); return;}
            if (result.error) {ready = false; clearPreview(); previewStatus(result.error); return;}
            if (result.cast) previewBitmap('#sp-cast', result.cast);
            previewStatus('');
        };
        worker.onerror = () => {ready = false; clearPreview(); previewStatus('The shadow renderer could not load.'); worker?.terminate(); worker = null;};
        return worker;
    }
    function schedulePreview() {
        const version = ++generation;
        clearTimeout(pending); previewAbort?.abort(); ready = false; ++renderKey;
        if (type !== 'bodies' || !entry()) {clearPreview(); previewStatus('Select a body to preview its shadow.'); return;}
        previewStatus('Updating preview…');
        const body = clone(entry()), owner = data, art = tileImage;
        pending = setTimeout(async () => {
            const abort = new AbortController(); previewAbort = abort;
            let proxy, artwork;
            try {
                const response = await fetch(api + '/preview', {method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({mapId: owner.mapId, body}), signal: abort.signal});
                if (!response.ok) {
                    const detail = await response.json().catch(() => ({}));
                    throw new Error(detail.error || 'The height proxy could not be generated.');
                }
                const [l, t, r, b] = body.bounds;
                proxy = await createImageBitmap(await response.blob(), {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
                const image = await art;
                artwork = await createImageBitmap(image, l, t, r - l, Math.min(image.naturalHeight - t, Math.max(b - t, proxy.height)));
                if (version !== generation) return;
                renderer().postMessage({request: ++renderKey, generation, proxy, artwork, bounds: body.bounds, paint: draft.paint,
                    hour: Number($('#sp-hour').value)}, [proxy, artwork]);
                proxy = artwork = null; ready = true;
            } catch (error) {
                if (version === generation && error.name !== 'AbortError') {clearPreview(); previewStatus(error.message);}
            } finally {proxy?.close(); artwork?.close();}
        }, 300);
    }
    $('#sp-hour').oninput = () => {
        const hour = Number($('#sp-hour').value);
        $('#sp-time').textContent = String(Math.floor(hour)).padStart(2, '0') + (hour % 1 ? ':30' : ':00');
        if (ready && worker) worker.postMessage({request: ++renderKey, generation, hour});
    };
    function sourceImage(url) {
        const promise = new Promise((resolve, reject) => {
            const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Tilesheet artwork could not be loaded.')); image.src = url;
        });
        promise.catch(() => {});
        return promise;
    }
    function apply(result, selection = 0) {
        const inputChanged = data?.artwork !== result.artwork;
        data = result; draft = clone(content(data)); mapChoice.value = data.mapId;
        if (inputChanged || !tileImage) tileImage = sourceImage(data.artwork);
        $('.sp-workspace').hidden = false;
        $('#sp-lights').href = '#lighting/?map=' + encodeURIComponent(data.mapId);
        mode(type);
        if (selection > 0 && selection < draft[type].length) pick(selection);
    }
    async function load(id) {
        if (!id) return;
        const key = Symbol('load'); request = key; busy = true; controls(); status('Loading shadow profiles…');
        try {
            const result = await json(api + '?mapId=' + encodeURIComponent(id));
            if (request !== key) return;
            apply(result); status(data.mapId === data.tileset ? 'Loaded ' + data.mapId + '.' : 'Artwork profiles are shared by maps using the ' + data.tileset + ' tilesheet.');
        } catch (error) {if (request === key) {mapChoice.value = data?.mapId || id; status(error.message, true);}}
        finally {if (request === key) {busy = false; controls();}}
    }
    async function save() {
        if (!dirty() || busy || !form.reportValidity()) return;
        const key = Symbol('save'); request = key; busy = true; controls(); status('Saving shadow profiles…');
        try {
            const result = await json(api, {method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({mapId: data.mapId, revision: data.revision, ...draft})});
            if (request !== key) return;
            apply(result, selected);
            status('Saved. Reload an open playtest to see the new shadows.');
        } catch (error) {if (request === key) status(error.message, true);}
        finally {if (request === key) {busy = false; controls();}}
    }
    $('#sp-save').onclick = save;
    $('#sp-reload').onclick = () => guarding(() => load(mapChoice.value));
    mapChoice.onchange = () => {const id = mapChoice.value; if (data) mapChoice.value = data.mapId; guarding(() => load(id));};
    window.ToolboxNavigation.route('shadow-profiles', async params => {
        if (!boot) boot = json(api).then(result => {
            mapChoice.replaceChildren(...result.maps.map(map => el('option', map.name || map.id, {value: map.id})));
        }).catch(error => {boot = null; throw error;});
        try {
            await boot;
            const requested = params.get('map'), options = [...mapChoice.options];
            const id = options.some(o => o.value === requested) ? requested : data?.mapId || (options.some(o => o.value === 'main') ? 'main' : options[0]?.value);
            if (data?.mapId !== id) guarding(() => load(id));
        } catch (error) {status(error.message, true);}
    });
})();

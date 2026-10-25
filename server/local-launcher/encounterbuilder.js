(() => {
    'use strict';
    const pane = document.getElementById('encounters-pane'), G = window.MapmakerRegionGeometry;
    if (!pane || !G) return;
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    const clone = value => JSON.parse(JSON.stringify(value));
    const labels = {chest: 'Chest', encounter: 'Mob encounter', reward: 'Clear-area reward'};
    const colors = {chest: '#9b5b14', encounter: '#a52828', reward: '#145f52'};
    pane.innerHTML = `<header class="pane-heading"><h2>Chests &amp; encounters</h2><p>Place treasure, populate an area and reward players for clearing it. <a href="#documentation/mapmaker-encounters">Read the guide</a></p></header>
      <div class="world-toolbar encounter-toolbar"><div class="field"><label for="encounter-map">Map</label><select id="encounter-map"></select></div><button type="button" class="encounter-save primary" disabled>Save changes</button><button type="button" class="encounter-reload">Reload</button><a class="encounter-build" href="#build">Build this map</a><a class="encounter-validate" href="#validator">Validate map</a></div>
      <p class="encounter-status" role="status" aria-live="polite">Choose a map.</p>
      <div class="asset-discard encounter-discard" hidden><p>Discard your unsaved changes to continue?</p><button type="button" class="encounter-discard-yes">Discard changes</button><button type="button" class="encounter-discard-no">Keep editing</button></div>
      <div class="encounter-workspace" hidden><div class="encounter-map-column"><div class="world-inline-actions encounter-tools" role="group" aria-label="Chest and encounter map tools"></div><p class="encounter-mode field-hint" role="status"></p><div class="encounter-map-host"></div><p class="field-hint">Chest · brown, mob encounter · red, clear-area reward · green. Chest markers use the game artwork. Saves update the Tiled source; build to update the game.</p></div>
      <aside class="encounter-inspector"><div class="encounter-editor"></div><details class="encounter-browser" open><summary>Map objects <span class="encounter-count"></span></summary><div class="field"><label for="encounter-search">Search objects</label><input id="encounter-search" type="search" placeholder="Name, type, ID or coordinates"></div><div class="field"><label for="encounter-filter">Object type</label><select id="encounter-filter"><option value="">All types</option><option value="chest">Chests</option><option value="encounter">Mob encounters</option><option value="reward">Clear-area rewards</option></select></div><div class="world-list encounter-list"></div><div class="world-inline-actions encounter-pages"></div></details></aside></div>`;
    const $ = selector => pane.querySelector(selector);
    let data, catalog, draft, original = '', selected = null, loaded = false, booting, busy = false, pending, mode = 'select', gesture, mapView, map, page = 0, fieldId = 0;
    let syncFields = [];
    const modeButtons = new Map(), chestImage = new Image();chestImage.src = './encounter-chest.png';chestImage.onload = () => mapView?.draw();
    const dirty = () => !!draft && (draft.id === null || JSON.stringify(draft) !== original);
    const rows = () => (data?.objects || []).filter(row => row.id !== selected).concat(draft ? [draft] : []);
    const title = row => (row.name || labels[row.kind]) + (row.id ? ' · #' + row.id : ' · unsaved');
    const region = row => ({x: row.x, y: row.y, width: row.width, height: row.height});
    const point = row => row.kind === 'reward' ? {x: row.rewardX, y: row.rewardY} : row;
    function status(message, error = false) {$('.encounter-status').textContent = message;$('.encounter-status').classList.toggle('error', error);}
    function button(parent, label, run, attrs = {}) {const b = el('button', label, {type: 'button', ...attrs});b.onclick = run;parent.append(b);return b;}
    function controls() {$('.encounter-save').disabled = busy || !dirty() || !draft.editable;$('.encounter-reload').disabled = busy;$('#encounter-map').disabled = busy;$('.encounter-workspace').inert = busy;pane.setAttribute('aria-busy', String(busy));const rewardButton = $('.encounter-link-reward');if (rewardButton) rewardButton.disabled = busy || dirty();}
    function guard(action) {if (busy) return;if (!dirty()) return action();pending = action;$('.encounter-discard').hidden = false;$('.encounter-discard-no').focus();}
    $('.encounter-discard-yes').onclick = () => {const action = pending;pending = null;$('.encounter-discard').hidden = true;action?.();};
    $('.encounter-discard-no').onclick = () => {pending = null;$('.encounter-discard').hidden = true;};
    function setMode(value) {
        mode = value;gesture = null;
        for (const [key, b] of modeButtons) b.setAttribute('aria-pressed', String(key === mode));
        $('.encounter-mode').textContent = mode === 'select' ? 'Select an object, drag it to move, or drag a corner to resize. Shift-drag pans; scroll zooms.' : mode === 'chest' ? 'Click a walkable tile to place a chest. Escape cancels.' : mode === 'reward-position' ? 'Click a walkable tile for the reward chest. Escape cancels.' : 'Drag a box for the ' + labels[mode].toLowerCase() + '. Escape cancels.';
        mapView?.draw();
    }
    function touch() {controls();syncFields.forEach(sync => sync());mapView?.draw();status('Unsaved ' + labels[draft.kind].toLowerCase() + ' · save changes, then build this map.');}
    function select(row, focus = false) {
        selected = row?.id ?? null;draft = row ? clone(row) : null;original = JSON.stringify(draft);setMode('select');renderEditor();renderList();controls();
        if (focus && row) mapView?.fit(row.kind === 'chest' ? {x: row.x - 5, y: row.y - 5, width: 11, height: 11} : region(row));
    }
    function newObject(kind, p) {
        return {id: null, kind, name: '', x: p.x, y: p.y, width: kind === 'chest' ? 0 : 1, height: kind === 'chest' ? 0 : 1,
            mob: catalog.mobs.find(m => m.id === 'rat')?.id || catalog.mobs[0]?.id, count: 3, editable: true,
            loot: [{item: catalog.items.find(i => i.id === 'GOLD')?.id || catalog.items[0]?.id, weight: 1}], lootMode: 'weighted', respawnSeconds: 30, rewardX: p.x, rewardY: p.y};
    }
    async function request(body, id) {
        const response = await fetch('./api/encounters' + (id ? '?mapId=' + encodeURIComponent(id) : ''), {signal: AbortSignal.timeout(45000), ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})});
        const value = await response.json();if (!response.ok) throw new Error(value.error || 'The chest or encounter could not load.');return value;
    }
    async function load(id) {
        busy = true;controls();status('Reading Tiled chests and encounter areas…');
        try {
            const changedMap = data?.mapId !== id;data = await request(null, id);$('#encounter-map').value = id;$('.encounter-workspace').hidden = false;
            $('.encounter-build').href = '#build/?map=' + encodeURIComponent(id);$('.encounter-validate').href = '#validator/?map=' + encodeURIComponent(id);
            const objectId = window.ToolboxNavigation.params().get('object');select(data.objects.find(row => row.id === objectId) || data.objects.find(row => row.id === selected));
            if (changedMap || !mapView) mountMap(id);
            status('Loaded ' + data.objects.length + ' objects from ' + data.source + '.');
        } catch (error) {status(error.message, true);} finally {busy = false;controls();}
    }
    async function boot(params) {
        if (!loaded) {
            booting ||= request().then(value => {catalog = value.catalog;$('#encounter-map').replaceChildren(...value.maps.map(id => el('option', id, {value: id})));loaded = true;}).catch(error => status(error.message, true)).finally(() => {booting = null;});
            await booting;if (!loaded) return;
        }
        const id = params.get('map') || data?.mapId || $('#encounter-map').value;
        if (data?.mapId !== id) return guard(() => load(id));
        const objectId = params.get('object');if (objectId && objectId !== selected) guard(() => select(data.objects.find(row => row.id === objectId), true));
    }
    async function save(operation = draft?.id ? 'update' : 'add') {
        if (!draft || busy || (operation !== 'remove' && !$('.encounter-form').reportValidity())) return;
        busy = true;controls();status('Saving ' + data.source + '…');
        try {
            const before = new Set(data.objects.map(row => row.id)), id = draft.id;
            data = await request({mapId: data.mapId, revision: data.revision, operation, objectId: id, object: draft});
            select(operation === 'remove' ? undefined : data.objects.find(row => row.id === id) || data.objects.find(row => !before.has(row.id)));
            status('Saved to Tiled. Build ' + data.mapId + ' to update playtests and the production map exports.');
        } catch (error) {status(error.message, true);} finally {busy = false;controls();}
    }
    function renderList() {
        const list = $('.encounter-list'), q = $('#encounter-search').value.toLowerCase(), filter = $('#encounter-filter').value;
        const matches = (data?.objects || []).filter(row => (!filter || row.kind === filter) && [title(row), labels[row.kind], row.x + ',' + row.y].join(' ').toLowerCase().includes(q));
        list.replaceChildren();page = Math.max(0, Math.min(page, Math.ceil(matches.length / 20) - 1));$('.encounter-count').textContent = '(' + matches.length + ')';
        for (const row of matches.slice(page * 20, page * 20 + 20)) button(list, title(row) + ' · ' + labels[row.kind] + ' · ' + row.x + ', ' + row.y, () => guard(() => select(row, true)), {ariaPressed: String(selected === row.id)});
        if (!matches.length) list.append(el('p', data?.objects.length ? 'No objects match these filters.' : 'No objects yet. Choose Place chest or Draw encounter to start.', {className: 'field-hint'}));
        const pages = $('.encounter-pages');pages.replaceChildren();if (matches.length > 20) {button(pages, 'Previous', () => {page--;renderList();}, {disabled: page === 0});pages.append(el('span', (page + 1) + ' / ' + Math.ceil(matches.length / 20)));button(pages, 'Next', () => {page++;renderList();}, {disabled: (page + 1) * 20 >= matches.length});}
    }
    function field(parent, label, key, options = {}) {
        const wrap = el('div', '', {className: 'field'}), id = 'encounter-field-' + (++fieldId), input = el(options.choices ? 'select' : 'input', '', {id});
        if (options.choices) for (const [value, text] of options.choices) input.append(el('option', text, {value}));
        else input.type = options.numeric ? 'number' : 'text';
        if (options.numeric) {input.min = String(options.min ?? 1);input.max = String(options.max ?? 10000);input.step = '1';}
        input.required = key !== 'name';if (key === 'name') input.maxLength = 120;
        const sync = () => {if (document.activeElement !== input) input.value = String(draft[key] ?? '');};sync();syncFields.push(sync);
        input.oninput = () => {if (options.numeric && (!input.value || !Number.isFinite(Number(input.value)))) return;draft[key] = options.numeric ? Number(input.value) : input.value;touch();options.change?.();};
        wrap.append(el('label', label, {htmlFor: id}), input);parent.append(wrap);return input;
    }
    function grid(parent) {const row = el('div', '', {className: 'asset-field-grid'});parent.append(row);return row;}
    function renderLoot(parent) {
        const section = el('section', '', {className: 'encounter-loot'});section.append(el('h3', 'Chest loot'), el('p', 'Each opening chooses one item from this table.', {className: 'field-hint'}));parent.append(section);
        field(section, 'Selection', 'lootMode', {choices: [['weighted', 'Weighted chances'], ['uniform', 'Equal chances']], change: () => renderEditor()});
        const list = el('datalist', '', {id: 'encounter-loot-items'});list.append(...catalog.items.map(item => el('option', item.name, {value: item.id})));section.append(list);
        const total = draft.loot.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);
        for (const [index, row] of draft.loot.entries()) {
            const line = el('div', '', {className: 'encounter-loot-row'}), item = el('input', '', {id: 'encounter-loot-item-' + index, type: 'search', value: row.item, required: true, autocomplete: 'off'});
            item.setAttribute('list', list.id);const itemWrap = el('div', '', {className: 'field'});itemWrap.append(el('label', 'Item', {htmlFor: item.id}), item);
            const weight = el('input', '', {id: 'encounter-loot-weight-' + index, type: 'number', value: row.weight, min: '.000001', max: '1000000', step: 'any', required: true, disabled: draft.lootMode === 'uniform'}), weightWrap = el('div', '', {className: 'field'});weightWrap.append(el('label', 'Weight', {htmlFor: weight.id}), weight);
            const chance = el('span', '', {className: 'field-hint encounter-chance'});
            const refresh = () => {const sum = draft.loot.reduce((s, r) => s + (Number(r.weight) || 0), 0);for (const [i, node] of [...section.querySelectorAll('.encounter-chance')].entries()) node.textContent = (draft.lootMode === 'uniform' ? 100 / draft.loot.length : sum ? draft.loot[i].weight / sum * 100 : 0).toFixed(1) + '%';};
            item.oninput = () => {row.item = item.value.trim();item.setCustomValidity(catalog.items.some(i => i.id === row.item) ? '' : 'Choose a registered item from the suggestions.');touch();};
            weight.oninput = () => {row.weight = Number(weight.value);touch();refresh();};
            line.append(itemWrap, weightWrap, chance);button(line, 'Remove', () => {draft.loot.splice(index, 1);touch();renderEditor();}, {ariaLabel: 'Remove loot item ' + (row.item || index + 1)});section.append(line);
            chance.textContent = (draft.lootMode === 'uniform' ? 100 / draft.loot.length : total ? row.weight / total * 100 : 0).toFixed(1) + '%';
        }
        if (!draft.loot.length) section.append(el('p', 'Add at least one loot item before saving.', {className: 'error'}));
        button(section, 'Add loot item', () => {draft.loot.push({item: '', weight: 1});touch();renderEditor();$('.encounter-editor').querySelector('#encounter-loot-item-' + (draft.loot.length - 1))?.focus();});
    }
    function renderEditor() {
        syncFields = [];const editor = $('.encounter-editor');editor.replaceChildren();
        if (!draft) {editor.append(el('h3', 'Build an encounter'), el('p', 'Place a chest, draw a mob area, or select an existing object on the map. Changes stay in your draft until you save.'));return;}
        const form = el('form', '', {className: 'encounter-form'});form.onsubmit = event => {event.preventDefault();save();};form.append(el('h3', labels[draft.kind]), el('p', draft.id ? 'Tiled object #' + draft.id : 'New object · unsaved', {className: 'field-hint'}));editor.append(form);
        if (!draft.editable) form.append(el('p', 'This shape or rotation is supported for viewing. Edit it in Tiled.', {className: 'error'}));
        field(form, 'Name (optional)', 'name');const bounds = grid(form);field(bounds, 'Tile X', 'x', {numeric: true, min: draft.kind === 'chest' ? 1 : 0, max: data.dimensions.width - 1});field(bounds, 'Tile Y', 'y', {numeric: true, min: draft.kind === 'chest' ? 1 : 0, max: data.dimensions.height - 1});
        if (draft.kind !== 'chest') {field(bounds, 'Width in tiles', 'width', {numeric: true, max: data.dimensions.width});field(bounds, 'Height in tiles', 'height', {numeric: true, max: data.dimensions.height});}
        if (draft.kind === 'encounter') {
            field(form, 'Mob type', 'mob', {choices: catalog.mobs.map(m => [m.id, m.name + ' · ' + m.id])});field(form, 'Mob population', 'count', {numeric: true, max: 1000});
            form.append(el('p', 'Mobs spawn on walkable tiles inside this area. Their respawn timing comes from the mob definition.', {className: 'field-hint'}));
            button(form, 'Add clear-area reward', () => guard(() => {const row = newObject('reward', draft);Object.assign(row, region(draft), {name: (draft.name || 'Encounter') + ' reward'});select(row);touch();}), {className: 'encounter-link-reward', disabled: dirty()});
            form.append(el('p', 'Save the encounter before adding its reward.', {className: 'field-hint'}));
        } else {
            if (draft.kind === 'chest') field(form, 'Respawn delay (seconds)', 'respawnSeconds', {numeric: true, max: 604800});
            else {
                form.append(el('h3', 'Reward chest position'), el('p', 'The chest appears after every tracked mob is defeated. The area tracks static and roaming mobs whose first spawn is inside its bounds. A new reward becomes available after the whole group respawns.', {className: 'field-hint'}));
                const position = grid(form);field(position, 'Reward tile X', 'rewardX', {numeric: true, max: data.dimensions.width - 1});field(position, 'Reward tile Y', 'rewardY', {numeric: true, max: data.dimensions.height - 1});
                button(form, 'Place reward chest', () => setMode('reward-position'));
            }
            renderLoot(form);
        }
        const actions = el('div', '', {className: 'world-inline-actions encounter-object-actions'});button(actions, 'Duplicate', () => guard(() => {const copy = clone(draft);copy.id = null;copy.name = (copy.name.slice(0, 110) || labels[copy.kind]) + ' copy';select(copy);touch();}));
        if (draft.id) {const remove = el('details');remove.append(el('summary', 'Remove object'));remove.append(el('p', 'Remove this object from the Tiled source? Build the map to update the game.'));button(remove, 'Confirm removal', () => save('remove'));actions.append(remove);}form.append(actions);
    }
    function hit(context) {
        return rows().slice().reverse().sort((a, b) => (a.kind === 'chest' ? -1 : 0) - (b.kind === 'chest' ? -1 : 0)).find(row => {
            const p = point(row), screen = context.project({x: p.x + .5, y: p.y + .5});
            return (row.kind !== 'encounter' && Math.hypot(screen.x - context.screen.x, screen.y - context.screen.y) < 13) || (row.kind !== 'chest' && context.tile.x >= row.x && context.tile.y >= row.y && context.tile.x < row.x + row.width && context.tile.y < row.y + row.height);
        });
    }
    function mountMap(id) {
        mapView?.destroy();$('.encounter-map-host').replaceChildren();map = null;
        const interaction = {
            start(context) {
                if (!map || context.shiftKey || busy) return false;
                const p = {x: Math.max(1, Math.min(map.width - 1, Math.floor(context.tile.x))), y: Math.max(1, Math.min(map.height - 1, Math.floor(context.tile.y)))};
                if (mode === 'reward-position') {draft.rewardX = p.x;draft.rewardY = p.y;setMode('select');touch();return true;}
                if (mode !== 'select') {
                    const kind = mode;select(newObject(kind, p));gesture = {kind: kind === 'chest' ? 'move' : 'draw', start: kind === 'chest' ? context.tile : p, before: clone(draft)};touch();return true;
                }
                const selectedHandle = draft?.editable && draft.kind !== 'chest' && G.handles(region(draft)).find(h => {const q = context.project(h);return Math.abs(q.x - context.screen.x) < 9 && Math.abs(q.y - context.screen.y) < 9;});
                const row = selectedHandle ? draft : hit(context);if (!row) return false;
                if (row.id !== selected) {if (dirty()) {guard(() => select(row));return true;}select(row);}
                if (!draft.editable) return true;
                let handle = selectedHandle;
                if (!handle && draft.kind !== 'chest') handle = G.handles(region(draft)).find(h => {const q = context.project(h);return Math.abs(q.x - context.screen.x) < 9 && Math.abs(q.y - context.screen.y) < 9;});
                gesture = {kind: handle?.id || 'move', start: context.tile, before: clone(draft), anchor: handle};return true;
            },
            move(context) {
                if (!gesture) return;const g = gesture, delta = {x: Math.round(context.tile.x - g.start.x), y: Math.round(context.tile.y - g.start.y)};
                if (draft.kind === 'chest') {draft.x = Math.max(1, Math.min(map.width - 1, g.before.x + delta.x));draft.y = Math.max(1, Math.min(map.height - 1, g.before.y + delta.y));}
                else Object.assign(draft, g.kind === 'draw' ? G.draw(g.start, context.tile, map) : g.kind === 'move' ? G.move(region(g.before), delta, map) : G.resize(region(g.before), g.kind, {x: g.anchor.x + delta.x, y: g.anchor.y + delta.y}, map));
                touch();
            },
            end(context, cancelled) {if (!gesture) return;if (cancelled) {draft = gesture.before;renderEditor();touch();}else interaction.move(context);gesture = null;},
            cursor(context) {return context.shiftKey ? 'grab' : mode !== 'select' ? 'crosshair' : hit(context) ? 'move' : 'grab';},
            keydown(event) {
                if (event.key === 'Escape') {if (gesture) {draft = gesture.before;gesture = null;renderEditor();touch();}setMode('select');return true;}
                if (!draft || !draft.editable) return false;
                const delta = {ArrowLeft: {x: -1, y: 0}, ArrowRight: {x: 1, y: 0}, ArrowUp: {x: 0, y: -1}, ArrowDown: {x: 0, y: 1}}[event.key];if (!delta) return false;
                if (draft.kind === 'chest') {draft.x = Math.max(1, Math.min(map.width - 1, draft.x + delta.x));draft.y = Math.max(1, Math.min(map.height - 1, draft.y + delta.y));}
                else Object.assign(draft, event.shiftKey ? G.resize(region(draft), 'se', {x: draft.x + draft.width + delta.x, y: draft.y + draft.height + delta.y}, map) : G.move(region(draft), delta, map));
                touch();return true;
            },
            draw(ctx, context) {
                for (const row of rows()) {
                    const chosen = row === draft, color = colors[row.kind], p = context.project(row), q = context.project({x: row.x + row.width, y: row.y + row.height});ctx.strokeStyle = color;ctx.fillStyle = color;ctx.lineWidth = chosen ? 3 : 1.5;
                    if (row.kind !== 'chest') {ctx.globalAlpha = chosen ? .2 : .08;ctx.fillRect(p.x, p.y, q.x - p.x, q.y - p.y);ctx.globalAlpha = 1;ctx.strokeRect(p.x, p.y, q.x - p.x, q.y - p.y);}
                    if (row.kind !== 'encounter') {
                        const location = point(row), a = context.project(location), b = context.project({x: location.x + 1, y: location.y + 1}), size = Math.max(18, b.x - a.x);
                        if (chestImage.complete && chestImage.naturalWidth) {ctx.imageSmoothingEnabled = false;ctx.drawImage(chestImage, 0, 0, 16, 16, a.x, a.y, size, size);}else ctx.fillRect(a.x, a.y, size, size);
                        if (chosen) ctx.strokeRect(a.x - 2, a.y - 2, size + 4, size + 4);
                    }
                    if (chosen && row.kind !== 'chest') for (const handle of G.handles(region(row))) {const h = context.project(handle);ctx.fillStyle = '#ffffff';ctx.fillRect(h.x - 4, h.y - 4, 8, 8);ctx.strokeRect(h.x - 4, h.y - 4, 8, 8);}
                }
            }
        };
        mapView = window.MapmakerCanvas.attach($('.encounter-map-host'), id, {label: 'Chests and encounter map. Use placement buttons, drag objects to move and corners to resize. Arrow keys move selected objects; Shift and arrows resize areas.', interaction, onLoad(value) {map = value;mapView.set({collisions: true});}});
    }
    for (const [id, label] of [['select', 'Select / move'], ['chest', 'Place chest'], ['encounter', 'Draw encounter'], ['reward', 'Draw reward area']]) modeButtons.set(id, button($('.encounter-tools'), label, () => id === 'select' ? setMode(id) : guard(() => setMode(id)), {ariaPressed: String(id === 'select')}));
    button($('.encounter-tools'), 'Focus selected', () => {if (draft) mapView?.fit(draft.kind === 'chest' ? {x: draft.x - 5, y: draft.y - 5, width: 11, height: 11} : region(draft));});
    $('.encounter-save').onclick = () => save();$('.encounter-reload').onclick = () => guard(() => {window.MapmakerCanvas.invalidate(data.mapId);return load(data.mapId);});
    $('#encounter-map').onchange = event => {const id = event.target.value;event.target.value = data?.mapId || id;guard(() => load(id));};
    for (const selector of ['#encounter-search', '#encounter-filter']) $(selector).oninput = () => {page = 0;renderList();};
    window.addEventListener('beforeunload', event => {if (dirty()) {event.preventDefault();event.returnValue = '';}});
    window.ToolboxNavigation.route('encounters', boot);
})();

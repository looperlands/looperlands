(() => {
    'use strict';
    const sheets = new Map(), drawings = new WeakMap();
    let nextId = 0;

    function appearance(action, mapId) {
        const configured = action.appearances?.[mapId];
        return configured ? {initialTile: configured.initialTile || 0, stages: configured.stages || {}} : {initialTile: action.initialTile || 0,
            stages: Object.fromEntries(action.stages.map(s => [s.id, s.tile || 0]))};
    }

    function sheet(mapId) {
        if (!sheets.has(mapId)) sheets.set(mapId, window.MapmakerCanvas.load(mapId).then(data => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({image, data, size: data.tilesize || 16});
            image.onerror = () => reject(new Error('Map artwork could not load. Build this map, then reload Interactions.'));
            image.src = data.tileset;
        })).catch(error => {sheets.delete(mapId); throw error;}));
        return sheets.get(mapId);
    }

    function drawTile(context, source, tile, x, y, scale) {
        if (!tile) return;
        const {image, size} = source, index = tile - 1, columns = image.width / size;
        context.drawImage(image, index % columns * size, Math.floor(index / columns) * size, size, size, x, y, scale, scale);
    }

    async function preview(canvas, mapId, tile, placement, radius = 0) {
        const version = (drawings.get(canvas) || 0) + 1;
        drawings.set(canvas, version);
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        const source = await sheet(mapId);
        if (!canvas.isConnected || drawings.get(canvas) !== version) return;
        const {data} = source, cells = radius * 2 + 1, scale = canvas.width / cells;
        context.imageSmoothingEnabled = false;
        context.fillStyle = '#f7f8fa';
        context.fillRect(0, 0, canvas.width, canvas.height);
        if (placement) for (let row = 0; row < cells; row++) for (let col = 0; col < cells; col++) {
            const x = placement.x + col - radius, y = placement.y + row - radius;
            if (x < 0 || y < 0 || x >= data.width || y >= data.height) continue;
            for (const id of [].concat(data.tiles[y * data.width + x] || [])) drawTile(context, source, id, col * scale, row * scale, scale);
        }
        drawTile(context, source, tile, radius * scale, radius * scale, scale);
        if (radius) {
            context.strokeStyle = '#2563eb'; context.lineWidth = 2;
            context.strokeRect(radius * scale + 1, radius * scale + 1, scale - 2, scale - 2);
        }
    }

    function picker(parent, c, value, choose, close) {
        const {el, button} = c;
        parent.replaceChildren();
        const original = button(parent, 'Use original map artwork', () => choose(0));
        button(parent, 'Close tile browser', close);
        original.focus({preventScroll: true});
        const notice = el('p', 'Loading tiles…', {className: 'field-hint', role: 'status'});
        parent.append(notice);
        sheet(c.mapId).then(source => {
            if (!parent.isConnected) return;
            const {image, size, data} = source, count = image.width / size * image.height / size;
            const used = [...new Set(data.tiles.flat().filter(id => Number.isInteger(id) && id > 0 && id <= count))].sort((a, b) => a - b);
            const settings = el('div', '', {className: 'interaction-inline-controls'});
            const sourceLabel = el('label', 'Browse '), filter = el('select');
            filter.append(el('option', 'Tiles used on this map', {value: 'used'}), el('option', 'Entire tilesheet', {value: 'all'}));
            filter.value = used.length && (!value || used.includes(value)) ? 'used' : 'all';
            sourceLabel.append(filter);
            const tileLabel = el('label', 'Find tile ID '), jump = el('input', '', {type: 'text', inputMode: 'numeric'});
            // A browsing aid must never prevent saving the interaction form.
            jump.oninput = () => {notice.textContent = 'Enter a tile ID, then choose Show tile.';};
            tileLabel.append(jump); settings.append(sourceLabel, tileLabel);
            const show = button(settings, 'Show tile', () => {
                const id = Number(jump.value);
                if (!Number.isInteger(id) || id < 1 || id > count) {notice.textContent = 'Enter a tile ID from 1 to ' + count + '.'; return;}
                filter.value = 'all'; populate(id);
            });
            jump.onkeydown = event => {if (event.key === 'Enter') {event.preventDefault(); show.onclick();}};
            parent.append(settings);
            const canvas = el('canvas', '', {width: 512, height: 256, tabIndex: 0, role: 'img', ariaLabel: 'Map tiles. Arrow keys move, Enter chooses, Escape closes.'});
            parent.append(canvas);
            let tiles, cursor = 0, page = 0;
            const navigation = el('div', '', {className: 'interaction-inline-controls'});
            parent.append(navigation);
            const previous = button(navigation, 'Previous tiles', () => {cursor = --page * 128; draw();});
            const next = button(navigation, 'Next tiles', () => {cursor = ++page * 128; draw();});
            function populate(selected = value) {
                tiles = filter.value === 'used' ? used : Array.from({length: count}, (_, i) => i + 1);
                cursor = Math.max(0, tiles.indexOf(selected)); page = Math.floor(cursor / 128); draw();
            }
            function draw() {
                const context = canvas.getContext('2d');
                context.clearRect(0, 0, canvas.width, canvas.height); context.imageSmoothingEnabled = false;
                for (let cell = 0; cell < 128; cell++) {
                    const index = page * 128 + cell, tile = tiles[index];
                    if (!tile) break;
                    const x = cell % 16 * 32, y = Math.floor(cell / 16) * 32;
                    context.strokeStyle = '#dde2e8'; context.lineWidth = 1; context.strokeRect(x + .5, y + .5, 31, 31);
                    drawTile(context, source, tile, x, y, 32);
                    if (tile === value || index === cursor) {
                        context.strokeStyle = index === cursor ? '#2563eb' : '#202936'; context.lineWidth = 2;
                        context.strokeRect(x + 2, y + 2, 28, 28);
                    }
                }
                previous.disabled = page === 0; next.disabled = (page + 1) * 128 >= tiles.length;
                notice.textContent = tiles.length + ' tiles · page ' + (page + 1) + ' of ' + Math.max(1, Math.ceil(tiles.length / 128)) +
                    (tiles[cursor] ? ' · tile ' + tiles[cursor] : '') + '. Click a tile to use it. Arrow keys move; Enter selects.';
                canvas.setAttribute('aria-label', notice.textContent);
            }
            function indexAt(event) {
                const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
                return x >= 0 && x < 1 && y >= 0 && y < 1 ? page * 128 + Math.floor(x * 16) + Math.floor(y * 8) * 16 : -1;
            }
            canvas.onclick = event => {const tile = tiles[indexAt(event)]; if (tile) choose(tile);};
            canvas.onmousemove = event => {const index = indexAt(event); if (tiles[index] && cursor !== index) {cursor = index; draw();}};
            canvas.onkeydown = event => {
                const offset = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -16, ArrowDown: 16}[event.key];
                if (offset) {event.preventDefault(); cursor = Math.max(0, Math.min(tiles.length - 1, cursor + offset)); page = Math.floor(cursor / 128); draw();}
                if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); if (tiles[cursor]) choose(tiles[cursor]);}
                if (event.key === 'Escape') {event.preventDefault(); close();}
            };
            filter.onchange = () => populate();
            populate();
        }).catch(error => {notice.textContent = error.message; notice.className = 'error';});
    }

    function render(c) {
        const {action: a, el, button, section} = c;
        const panel = section(c.form, 'Appearance on ' + c.mapId, 'Optional: draw one tilesheet tile over each placement, before use and after each successful action. Useful for opened chests, depleted resources and switches.');
        const states = [{id: '', label: 'Before the first action'}, ...a.stages.map(s => ({id: s.id, label: 'After “' + s.name + '”'}))];
        let selected = '', placementIndex = 0, editing;
        const cards = el('div', '', {className: 'interaction-appearance-grid'});
        panel.append(cards);
        const rows = states.map(state => {
            const row = el('div', '', {className: 'interaction-artwork'}), image = el('canvas', '', {width: 48, height: 48, ariaLabel: state.label + ' artwork'});
            const select = button(row, '', () => {selected = state.id; refresh();});
            const title = el('span', state.label), description = el('span', '', {className: 'field-hint'});
            select.append(image, title, description);
            const change = button(row, 'Choose tile', () => {
                selected = state.id; editing = state; browser.hidden = false; refresh();
                browser.replaceChildren(); browser.append(el('h4', 'Choose artwork · ' + state.label));
                const body = el('div'); browser.append(body);
                picker(body, c, tileFor(state.id), tile => {
                    if (tile === tileFor(state.id)) {close(); return;}
                    a.appearances ||= {};
                    const current = appearance(a, c.mapId);
                    a.appearances[c.mapId] = {initialTile: current.initialTile || 0, stages: {...current.stages}};
                    if (state.id === '') a.appearances[c.mapId].initialTile = tile;
                    else a.appearances[c.mapId].stages[state.id] = tile;
                    c.touch(); close(); refresh();
                }, close);
            }, {ariaLabel: 'Choose tile · ' + state.label, ariaExpanded: 'false'});
            cards.append(row);
            return {state, image, select, description, change};
        });
        const browser = el('div', '', {className: 'interaction-tile-picker', id: 'interaction-artwork-' + ++nextId, hidden: true});
        for (const row of rows) row.change.setAttribute('aria-controls', browser.id);
        panel.append(browser);
        const context = el('div', '', {className: 'interaction-map-preview'}), picture = el('canvas', '', {width: 240, height: 240, ariaLabel: 'Interaction artwork in the built map'});
        const explanation = el('div'), caption = el('p', '', {role: 'status', className: 'interaction-artwork-caption'});
        const locationLabel = el('label', 'Preview placement '), location = el('select'); locationLabel.append(location);
        location.onchange = () => {placementIndex = Number(location.value); refresh();};
        explanation.append(el('h4', 'Preview on the map'), caption, locationLabel,
            el('p', 'The outlined tile is the interaction. Transparent pixels show the map underneath. Original map artwork removes only the overlay.', {className: 'field-hint'}));
        context.append(picture, explanation); panel.append(context);
        const timing = el('p', '', {className: 'field-hint'}); panel.append(timing);
        panel.append(el('p', 'One tile per placement. This does not erase a larger object, replace an NPC or change collisions. Configure gates in Doors & portals. Artwork is separate for each map.', {className: 'field-hint'}));

        function tileFor(id) {const visuals = appearance(a, c.mapId); return id === '' ? visuals.initialTile || 0 : visuals.stages[id] || 0;}
        function close() {browser.hidden = true; rows.find(r => r.state === editing)?.change.focus({preventScroll: true}); editing = null; refresh();}
        function refresh() {
            const placements = c.data.document.placements.filter(p => p.action === c.interactionId);
            placementIndex = Math.max(0, Math.min(placementIndex, placements.length - 1));
            const placement = placements[placementIndex];
            location.replaceChildren(...placements.map((p, i) => el('option', 'Tile ' + p.x + ', ' + p.y + (p.width * p.height > 1 ? ' · region start' : ''), {value: String(i)})));
            location.value = String(placementIndex); locationLabel.hidden = !placement;
            const tile = tileFor(selected);
            caption.textContent = states.find(s => s.id === selected).label + ' · ' + (tile ? 'Tile ' + tile + ' overlay' : 'Original map artwork');
            if (!placement) caption.append(' · Place this interaction on the map to preview its surroundings.');
            picture.hidden = !placement && !tile;
            preview(picture, c.mapId, tile, placement, placement ? 2 : 0).catch(error => {caption.textContent = error.message;});
            for (const row of rows) {
                const value = tileFor(row.state.id);
                row.select.setAttribute('aria-pressed', String(selected === row.state.id));
                row.change.setAttribute('aria-expanded', String(editing === row.state));
                row.description.textContent = value ? 'Tile ' + value + ' overlay' : 'Original map artwork';
                row.change.textContent = value ? 'Change tile' : 'Choose tile';
                preview(row.image, c.mapId, value, placement).catch(() => {row.description.textContent = 'Artwork unavailable · build this map and reload';});
            }
            timing.textContent = (a.scope === 'player' ? 'Each player sees their own artwork. ' : 'Everyone sees the same artwork. ') +
                (a.repeat === 'cooldown' ? 'After the last action, the completed artwork stays for ' + a.cooldownSeconds + ' seconds, then the initial artwork returns.' :
                    a.repeat === 'immediate' ? 'The last action’s artwork stays while the interaction is ready to use again.' : 'After the last action, the completed artwork stays.');
        }
        refresh();
        return refresh;
    }
    window.MapmakerInteractionArtwork = {appearance, preview, render};
})();

(() => {
    'use strict';
    const entries = new Map(), versions = new Map(), images = new Map(), panes = new Map();
    const network = (...args) => fetch(...args);
    const section = document.getElementById('map-data-status');
    const title = document.getElementById('map-data-title'), detail = document.getElementById('map-data-detail');
    const progress = document.getElementById('map-data-progress'), reload = document.getElementById('map-data-reload');
    const resources = new Set(['map-canvas', 'map-inspector', 'map-validation', 'doors', 'lighting', 'encounters', 'fishing', 'zones', 'npcs', 'quests', 'tile-authoring', 'world-authoring']);
    const bindings = {ambient:['ambient-map','.ambient-reload'],inspector:['inspector-map','.analysis-refresh'],validator:['validator-map','.analysis-refresh'],doors:['door-map','#door-reload'],
        zones:['zones-map','.zones-reload'],fishing:['fishing-map','.fishing-reload'],lighting:['lighting-map','.lighting-reload'],encounters:['encounter-map','.encounter-reload'],npcs:['npc-map','#npc-reload'],
        quests:['quest-map','#quest-retry'],tiles:['tiles-map','#tiles-reload'],events:['events-map','.world-reload'],
        dialogues:['dialogues-map','.world-reload'],scenes:['scenes-map','.world-reload'],sequences:['sequence-map','.sequence-reload']};
    let active, building = false, observedBuild, buildWasRunning = false, syncing = false, gameCatalog;
    const stamp = id => versions.get(id) || 0;
    function show(id, label, value, text, busy = false, error = false) {
        if (id !== active || !section) return;
        section.hidden = false; section.setAttribute('aria-busy', String(busy));
        section.classList.toggle('map-data-error', error);
        title.textContent = label; detail.textContent = text; progress.value = value;
        reload.disabled = busy || building; reload.textContent = error ? 'Retry loading' : 'Reload map data';
    }
    function image(url, revision) {
        const target = new URL(url, location.href);
        if (revision) target.searchParams.set('v', revision);
        const key = target.href;
        if (!images.has(key)) {
            const promise = new Promise((resolve, reject) => {
                const img = new Image(), timer = setTimeout(() => reject(new Error('Map artwork timed out.')), 15000);
                img.onload = () => {clearTimeout(timer); resolve(img);};
                img.onerror = () => {clearTimeout(timer); reject(new Error('Map artwork is unavailable.'));};
                img.src = key;
            }).catch(error => {images.delete(key); throw error;});
            images.set(key, promise);
            if (images.size > 4) images.delete(images.keys().next().value);
        }
        return images.get(key);
    }
    function invalidate(id) {
        const ids = id ? [id] : [...new Set([...entries.keys(), active].filter(Boolean))];
        for (const key of ids) {entries.delete(key); versions.set(key, stamp(key) + 1);}
        document.dispatchEvent(new CustomEvent('toolbox:map-data-changed', {detail: {mapId: id}}));
        if (!id || id === active) show(active, active + ' · map data changed', 0, 'Reload to refresh the shared map data.');
    }
    function expand(entry, key, tool) {
        if (key === 'world-authoring') {
            const part = entry.data.get(key);
            if (part?.error) return part;
            const value = part?.data.tools[tool];
            return value ? {data: {...value, catalog: part.data.catalog}} : {error: 'Choose a world authoring tool.', status: 400};
        }
        if (key === 'map-validation' || key === 'map-inspector') {
            const analysis = entry.data.get('analysis');
            if (analysis?.error) return analysis;
            if (!analysis?.data) return {error: 'Map analysis is unavailable. Retry loading.', status: 503};
            const value = analysis?.data[key === 'map-validation' ? 'validation' : 'inspector'];
            if (key === 'map-validation') return {data: value};
            const geometry = entry.data.get('map-canvas');
            if (geometry?.error) return geometry;
            return {data: {...value, tiles: geometry.data.tiles, collisions: geometry.data.serverCollisions || geometry.data.collisions, tileset: geometry.data.tileset,
                artworkRevision: geometry.data.artworkRevision, revision: entry.revision}};
        }
        return entry.data.get(key) || {error: 'This map section is unavailable. Reload map data to retry.', status: 503};
    }
    async function readStream(response, receive) {
        if (!response.ok) {const data = await response.json(); throw new Error(data.error || 'Map data could not load.');}
        const reader = response.body.getReader(), decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const {value, done} = await reader.read();
                buffer += decoder.decode(value, {stream: !done});
                let end;
                while ((end = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
                    if (line) receive(JSON.parse(line));
                }
                if (done) break;
            }
            if (buffer.trim()) receive(JSON.parse(buffer));
        } finally {reader.releaseLock();}
    }
    function load(id, options = {}) {
        if (options.activate) active = id;
        if (options.refresh) invalidate(id);
        let entry = entries.get(id);
        if (entry) {
            entries.delete(id); entries.set(id, entry);
            if (entry.done) show(id, id + ' ready', 100, entry.message, false, entry.hasErrors);
            else show(id, 'Loading ' + id, entry.percent || 0, entry.label || 'Preparing shared map data…', true);
            return entry.promise;
        }
        if (building) return Promise.reject(new Error('Wait for the map build to finish before loading map data.'));
        entry = {data: new Map(), version: stamp(id)};
        entries.set(id, entry);
        if (entries.size > 2) entries.delete(entries.keys().next().value);
        const current = () => entries.get(id) === entry;
        show(id, 'Loading ' + id, 0, 'Preparing shared map data…', true);
        entry.promise = (async () => {
            const response = await network('./api/map-workspace?mapId=' + encodeURIComponent(id), {signal: AbortSignal.timeout(90000)});
            await readStream(response, event => {
                if (event.type === 'failed') throw new Error(event.error);
                if (event.type === 'resource') entry.data.set(event.key, event);
                if (event.type === 'ready') entry.revision = event.revision;
                if (event.type === 'progress') {
                    entry.percent = Math.round(event.completed * 100 / (event.total + 1));
                    entry.label = event.label + ' · ' + event.completed + ' of ' + (event.total + 1) + ' parts loaded';
                    if (current()) show(id, 'Loading ' + id, entry.percent, entry.label, true);
                }
            });
            if (!entry.revision) throw new Error('Map loading stopped before completion. Retry loading.');
            const geometry = entry.data.get('map-canvas');
            if (geometry?.data) {
                geometry.data.revision = entry.revision;
                if (current()) show(id, 'Loading ' + id, 92, 'Map artwork', true);
                try {await image(geometry.data.tileset, geometry.data.artworkRevision || entry.revision);} catch (error) {entry.artworkError = error.message;}
            }
            entry.done = true;
            const errors = [...entry.data.values()].filter(value => value.error).length;
            entry.message = errors ? errors + ' sections unavailable. Open a tool for details or retry loading.' : entry.artworkError || 'Map data is shared across all map tools.';
            entry.hasErrors = !!errors || !!entry.artworkError;
            if (current()) show(id, id + ' ready', 100, entry.message, false, entry.hasErrors);
            return entry;
        })().catch(error => {
            if (current()) {entries.delete(id); show(id, 'Could not load ' + id, entry.percent || 0, error.message, false, true);}
            throw error;
        });
        return entry.promise;
    }
    const paneFor = (key, tool) => ({'map-inspector':'inspector','map-validation':'validator','tile-authoring':'tiles','world-authoring':tool})[key] || key;
    function remember(id, key, tool) {
        const pane = paneFor(key, tool);
        if (bindings[pane]) panes.set(pane, {id, version: stamp(id)});
    }
    const result = part => ({ok: !part?.error, status: part?.error ? part.status || 500 : 200,
        json: async () => structuredClone(part?.error ? {error: part.error} : part.data)});
    async function request(url, options = {}) {
        const target = new URL(url, location.href), method = (options.method || 'GET').toUpperCase();
        if (target.origin !== new URL(location.href).origin) return network(url, options);
        const key = target.pathname.replace('/local/api/', ''), id = target.searchParams.get('mapId');
        if (method === 'GET' && key === 'catalog' && gameCatalog) return result({data: gameCatalog});
        if (method === 'GET' && !id && active && resources.has(key)) {
            const entry = await load(active), list = entry.data.get('map-list');
            if (list?.data) return result({data: key === 'encounters' ? list.data : key === 'zones' ? {maps:list.data.maps,catalog:list.data.zoneCatalog} : key === 'fishing' ? {maps:list.data.maps,catalog:list.data.fishingCatalog} : {maps: list.data.maps}});
        }
        if (method === 'GET' && key === 'assets' && active) {
            const library = expand(await load(active), 'entity-library');
            if (library?.data) return result({data: {revision: library.data.revision, entries: library.data.entries.map(({preview, ...entry}) => entry)}});
        }
        if (method === 'GET' && key === 'map-preview' && id !== active && !entries.has(id)) return network(url, options);
        if (method === 'GET' && id && (resources.has(key) || key === 'map-preview')) {
            try {
                const activate = !['map-canvas', 'map-preview'].includes(key);
                const binding = bindings[paneFor(key, target.searchParams.get('tool'))];
                if (activate && binding) {
                    const select = document.getElementById(binding[0]);
                    if (select?.options.length) select.value = id;
                }
                const entry = await load(id, {activate});
                options.signal?.throwIfAborted();
                if (key === 'map-preview') {
                    const part = entry.data.get('map-canvas');
                    if (part.error) return result(part);
                    const number = key => /^-?\d+$/.test(target.searchParams.get(key) || '') ? Number(target.searchParams.get(key)) : NaN;
                    const x = number('x'), y = number('y'), map = part.data;
                    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y) || Math.abs(x) > 1000000 || Math.abs(y) > 1000000) return result({error: 'Choose whole tile coordinates.', status: 400});
                    const tiles = [];
                    for (let row = 0; row < 13; row++) for (let col = 0; col < 13; col++) {
                        const tx = x + col - 6, ty = y + row - 6;
                        tiles.push(tx < 0 || ty < 0 || tx >= map.width || ty >= map.height ? null : map.tiles[ty * map.width + tx] ?? 0);
                    }
                    return result({data: {mapId: id, x, y, size: 13, width: map.width, height: map.height, tilesize: map.tilesize, tileset: map.tileset,
                        artworkRevision: map.artworkRevision, tiles, revision: entry.revision}});
                }
                if (activate) remember(id, key, target.searchParams.get('tool'));
                return result(expand(entry, key, target.searchParams.get('tool')));
            } catch (error) {if (options.signal?.aborted) throw error; return result({error: error.message, status: 503});}
        }
        if (method === 'GET' && key === 'entity-library' && active) {
            try {return result(expand(await load(active), key));} catch (error) {return result({error: error.message, status: 503});}
        }
        const response = await network(url, options);
        if (method === 'GET' && key === 'catalog' && response.ok) gameCatalog = await response.clone().json();
        if (target.pathname.startsWith('/local/api/') && method === 'POST' && (response.ok || response.status === 409) && key !== 'session') {
            if (key === 'build') {if (response.ok) {building = true; buildWasRunning = true; gameCatalog = null; invalidate(); show(active, 'Map build in progress', 0, 'Map data refreshes when the build finishes.', true);}}
            else {
                invalidate();
                if (response.ok) {try {const input = JSON.parse(options.body); if (input.mapId) remember(input.mapId, key, input.tool);} catch (_) {}}
                if (active && !building) load(active).catch(() => {});
            }
        }
        if (method === 'GET' && key === 'build' && response.ok) {
            const {job} = await response.clone().json();
            const wasBuilding = building;
            building = job?.status === 'running';
            if (building) {
                buildWasRunning = true;
                if (!wasBuilding) invalidate();
                show(active, 'Map build in progress', 0, 'Map data refreshes when the build finishes.', true);
            }
            else if (buildWasRunning || (observedBuild && job?.id !== observedBuild)) {
                buildWasRunning = false; gameCatalog = null; invalidate(); if (active) load(active).catch(() => {});
            }
            observedBuild = job?.id;
        }
        return response;
    }
    function syncPane(pane, refreshCurrent = false) {
        // Deep links own their map and object selection; each editor's route
        // applies it through that editor's unsaved-change guard.
        const linkedMap = window.ToolboxNavigation?.params?.().get('map');
        if (linkedMap && !refreshCurrent) {
            if (pane === 'build' && linkedMap !== active) load(linkedMap, {activate: true}).catch(() => {});
            return;
        }
        if (['playtest', 'build'].includes(pane) && active) {
            const select = document.getElementById(pane === 'playtest' ? 'map' : 'build-map');
            if (select?.options.length && !select.disabled && select.value !== active) {select.value = active; select.dispatchEvent(new Event('change', {bubbles: true}));}
            return;
        }
        const binding = bindings[pane], previous = panes.get(pane);
        if (!binding || !previous || !active) return;
        const select = document.getElementById(binding[0]);
        if (!select?.options.length || select.disabled) return;
        if (previous.id !== active) {select.value = active; select.dispatchEvent(new Event('change', {bubbles: true}));}
        else if (previous.version !== stamp(active)) {
            syncing = true;
            try {document.getElementById(pane + '-pane')?.querySelector(binding[1])?.click();} finally {syncing = false;}
        }
    }
    if (reload) reload.onclick = () => {if (active) return load(active, {activate: true, refresh: true}).then(() => syncPane(window.ToolboxNavigation?.screen(), true)).catch(() => {});};
    document.addEventListener('toolbox:pane', event => queueMicrotask(() => syncPane(event.detail)));
    document.addEventListener('click', event => {
        const pane = window.ToolboxNavigation?.screen(), binding = bindings[pane];
        if (!binding) return;
        if (!syncing && event.target.closest?.(binding[1])) invalidate(active);
        if (event.target.closest?.('button')?.textContent.trim() === 'Keep editing') {
            const previous = panes.get(pane);
            if (previous) load(previous.id, {activate: true}).catch(() => {});
        }
    }, true);
    window.addEventListener('focus', () => checkRevision());
    async function checkRevision() {
        const id = active, entry = entries.get(id);
        if (!id || document.hidden) return;
        try {
            if (building) {await request('./api/build'); return;}
            if (!entry?.done) return;
            const response = await network('./api/map-workspace?' + new URLSearchParams({mapId: id, revision: '1'}), {signal: AbortSignal.timeout(5000)});
            if (response.status === 409) {building = true; buildWasRunning = true; invalidate(); show(id, 'Map build in progress', 0, 'Map data refreshes when the build finishes.', true); return;}
            if (!response.ok) return;
            const data = await response.json();
            if (entries.get(id) === entry && data.revision !== entry.revision) {invalidate(id); await load(id);}
        } catch (_) {} // Keep working data during transient server restarts.
    }
    setInterval(checkRevision, 10000);
    window.ToolboxMapData = {fetch: request, load, select: id => load(id, {activate: true}), invalidate, image, stamp,
        preferred: fallback => active || fallback};
})();

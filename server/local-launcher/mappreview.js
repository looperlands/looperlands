(() => {
    'use strict';
    const fetchData = (...args) => (window.ToolboxMapData?.fetch || fetch)(...args);
    const locations = new WeakMap(), images = new Map();
    const popup = document.createElement('section');
    popup.id = 'map-location-preview';
    popup.className = 'map-location-preview';
    popup.hidden = true;
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Map location preview');
    popup.innerHTML = '<div class="map-preview-heading"><strong></strong><button type="button" aria-label="Close map preview">Close</button></div><canvas width="260" height="260" role="img"></canvas><p class="field-hint" role="status"></p>';
    document.body.append(popup);
    const title = popup.querySelector('strong'), canvas = popup.querySelector('canvas'), status = popup.querySelector('p');
    let active, timer, exitTimer, controller, generation = 0;
    function valid(p) {return p && typeof p.mapId === 'string' && Number.isSafeInteger(p.x) && Number.isSafeInteger(p.y);}
    function resolve(node) {const value = locations.get(node);return typeof value === 'function' ? value() : value;}
    function mark(node, location, focusable = true) {
        locations.set(node, location); node.dataset.mapLocation = '';
        if (focusable && !node.matches('button,input,select,a,textarea') && !node.closest('button,a')) node.tabIndex = 0;
        return node;
    }
    function coordinate(mapId, x, y, text = (x ?? '?') + ', ' + (y ?? '?'), focusable = true) {
        return mark(Object.assign(document.createElement('span'), {className: 'map-coordinate', textContent: text}), {mapId, x: x === undefined || x === null || x === '' ? NaN : Number(x), y: y === undefined || y === null || y === '' ? NaN : Number(y)}, focusable);
    }
    function fields(x, y, mapId) {
        const location = () => ({mapId: typeof mapId === 'function' ? mapId() : mapId, x: x.value.trim() === '' ? NaN : Number(x.value), y: y.value.trim() === '' ? NaN : Number(y.value)});
        mark(x, location); mark(y, location);
    }
    function position() {
        if (!active?.isConnected) {hide();return;}
        const anchor = active.getBoundingClientRect(), rect = popup.getBoundingClientRect();
        if (anchor.bottom < 0 || anchor.top > innerHeight || anchor.right < 0 || anchor.left > innerWidth) {hide();return;}
        const beside = anchor.left >= rect.width + 16 ? anchor.left - rect.width - 8 : anchor.right + rect.width + 16 <= innerWidth ? anchor.right + 8 : null;
        popup.style.left = Math.max(8, Math.min(innerWidth - rect.width - 8, beside ?? anchor.left)) + 'px';
        const below = anchor.bottom + 8;
        const top = beside !== null ? anchor.top : below + rect.height <= innerHeight - 8 ? below : anchor.top - rect.height - 8;
        popup.style.top = Math.max(8, Math.min(innerHeight - rect.height - 8, top)) + 'px';
    }
    function hide() {
        clearTimeout(timer); clearTimeout(exitTimer); controller?.abort(); generation++;
        if (active) {
            const ids = (active.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== popup.id);
            if (ids.length) active.setAttribute('aria-describedby', ids.join(' ')); else active.removeAttribute('aria-describedby');
        }
        active = undefined; popup.hidden = true;
    }
    function imageFor(url) {
        let promise = images.get(url);
        if (!promise) {
            promise = new Promise((resolve, reject) => {const image = new Image();image.onload = () => resolve(image);image.onerror = () => reject(new Error('Tile artwork is unavailable. The grid still marks the requested coordinate.'));image.src = url;});
            images.set(url, promise);
            promise.catch(() => images.delete(url));
            if (images.size > 8) images.delete(images.keys().next().value);
        }
        return promise;
    }
    function draw(data, image) {
        const ctx = canvas.getContext('2d'), cell = canvas.width / 13;
        ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < 13; row++) for (let col = 0; col < 13; col++) {
            const value = data?.tiles[row * 13 + col];
            ctx.fillStyle = value === null ? '#dde2e8' : '#ffffff'; ctx.fillRect(col * cell, row * cell, cell, cell);
            if (image && value !== null) for (const raw of Array.isArray(value) ? value : [value]) {
                const id = Number(raw) - 1, tile = data.tilesize, columns = image.width / tile;
                if (id >= 0) ctx.drawImage(image, (id % columns) * tile, Math.floor(id / columns) * tile, tile, tile, col * cell, row * cell, cell, cell);
            }
        }
        ctx.strokeStyle = '#59657599'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= 13; i++) {const p = Math.min(259.5, i * cell + .5);ctx.moveTo(p, 0);ctx.lineTo(p, 260);ctx.moveTo(0, p);ctx.lineTo(260, p);} ctx.stroke();
        ctx.fillStyle = '#2563eb30';ctx.fillRect(6 * cell, 6 * cell, cell, cell);
        ctx.strokeStyle = '#ffffff';ctx.lineWidth = 4;ctx.strokeRect(6 * cell, 6 * cell, cell, cell);
        ctx.strokeStyle = '#2563eb';ctx.lineWidth = 2;ctx.strokeRect(6 * cell, 6 * cell, cell, cell);
    }
    async function show(node) {
        const location = resolve(node); if (!valid(location)) {hide();return;}
        hide(); active = node; const token = generation;
        node.setAttribute('aria-describedby', [node.getAttribute('aria-describedby'), popup.id].filter(Boolean).join(' '));
        title.textContent = location.mapId + ' · ' + location.x + ', ' + location.y;
        canvas.setAttribute('aria-label', '13 by 13 tile preview of ' + location.mapId + ', centered on tile ' + location.x + ', ' + location.y + '. Blue outline marks the center tile.');
        status.textContent = 'Loading built map…';draw();popup.hidden = false;position();controller = new AbortController();
        try {
            const params = new URLSearchParams(location), response = await fetchData('./api/map-preview?' + params, {signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])});
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Map preview could not load.');
            if (token !== generation) return;
            draw(data);status.textContent = 'Built map · 13 × 13 tiles · blue center';position();
            try {const image = await (window.ToolboxMapData ? window.ToolboxMapData.image(data.tileset, data.artworkRevision || data.revision) : imageFor(data.tileset + '?v=' + encodeURIComponent(data.revision)));if (token === generation) draw(data, image);}
            catch (error) {if (token === generation) status.textContent = error.message;}
        } catch (error) {if (token === generation && error.name !== 'AbortError') status.textContent = error.name === 'TimeoutError' ? 'Preview timed out. Hover or focus the coordinates to retry.' : error.message;}
        if (token === generation) position();
    }
    function target(event) {return event.target.closest?.('[data-map-location]');}
    function schedule(node, delay = 160) {clearTimeout(exitTimer);clearTimeout(timer);if (node !== active) timer = setTimeout(() => show(node), delay);}
    document.addEventListener('pointerover', event => {const node = target(event);if (node && !node.contains(event.relatedTarget)) schedule(node);});
    document.addEventListener('pointerout', event => {const node = target(event);if (node && !node.contains(event.relatedTarget) && !popup.contains(event.relatedTarget)) {clearTimeout(timer);if (document.activeElement !== active) exitTimer = setTimeout(hide, 200);}});
    popup.addEventListener('pointerenter', () => clearTimeout(exitTimer));
    popup.addEventListener('pointerleave', event => {if (!active?.contains(event.relatedTarget) && !popup.contains(document.activeElement) && document.activeElement !== active) exitTimer = setTimeout(hide, 200);});
    document.addEventListener('focusin', event => {const node = target(event);if (node) {clearTimeout(timer);show(node);} else if (!popup.contains(event.target)) hide();});
    document.addEventListener('focusout', event => {if (!popup.contains(event.relatedTarget) && !active?.contains(event.relatedTarget)) exitTimer = setTimeout(hide, 200);});
    document.addEventListener('click', event => {const node = event.target.closest?.('.map-coordinate');if (node?.closest('button')) {event.preventDefault();event.stopPropagation();show(node);}}, true);
    document.addEventListener('pointerdown', event => {const node = target(event);if (node && event.pointerType === 'touch') show(node);else if (!node && !popup.contains(event.target)) hide();});
    document.addEventListener('input', event => {if (target(event) === active) {const node = active;clearTimeout(timer);timer = setTimeout(() => show(node), 180);}});
    document.addEventListener('keydown', event => {if (event.key === 'Escape' && !popup.hidden) {event.preventDefault();hide();}});
    popup.querySelector('button').onclick = () => {const trigger = active;hide();trigger?.focus({preventScroll:true});hide();};
    window.addEventListener('resize', () => {if (!popup.hidden) position();});
    window.addEventListener('scroll', event => {if (!popup.hidden && !popup.contains(event.target)) position();}, true);
    window.addEventListener('hashchange', hide);
    new MutationObserver(() => {if (active && !active.isConnected) hide();}).observe(document.body, {childList: true, subtree: true});
    window.MapLocation = {mark, coordinate, fields};
})();

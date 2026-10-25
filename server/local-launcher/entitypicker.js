(() => {
    'use strict';
    const el = (tag, text = '', attrs = {}) => Object.assign(document.createElement(tag), {textContent: text, ...attrs});
    const instances = new WeakMap();
    let libraryRequest, libraryVersion = 0, nextId = 0;
    function library() {
        libraryRequest ||= fetch('./api/entity-library', {signal: AbortSignal.timeout(15000)})
            .then(async response => {if (!response.ok) throw new Error('Sprite previews could not load.');return (await response.json()).entries;})
            .catch(error => {libraryRequest = null;throw error;});
        return libraryRequest;
    }
    function resolve(entry, entries, type) {
        const id = String(entry.entityId ?? entry.id);
        return entries.find(row => (!type || row.type === type) &&
            (row.id.toLowerCase() === id.toLowerCase() || String(row.kind) === id));
    }
    function matches(entry, query, asset) {
        const text = [entry.name, entry.id, entry.entityId, asset?.id, asset?.name, asset?.kind, asset?.type].join(' ').toLocaleLowerCase();
        return query.trim().toLocaleLowerCase().split(/\s+/).every(word => text.includes(word));
    }
    function thumbnail(entry) {
        const frame = el('span', '', {className: 'entity-picker-thumbnail', ariaHidden: 'true'});
        const fallback = el('span', entry ? (entry.name || entry.id).slice(0, 2).toUpperCase() : '—');frame.append(fallback);
        const p = entry?.preview;
        if (!p || !(p.width > 0 && p.height > 0)) return frame;
        const canvas = el('canvas', '', {width: 48, height: 48}), image = new Image();
        image.onload = () => {
            const context = canvas.getContext('2d'), scale = Math.min(48 / p.width, 48 / p.height, 3);
            context.imageSmoothingEnabled = false;
            context.drawImage(image, 0, p.row * p.height, p.width, p.height,
                Math.round((48 - p.width * scale) / 2), Math.round((48 - p.height * scale) / 2), p.width * scale, p.height * scale);
            frame.replaceChildren(canvas);
        };
        image.src = p.url;
        return frame;
    }
    function attach(control, options = {}) {
        if (instances.has(control)) {const instance = instances.get(control);instance.update(options);return instance;}
        const root = el('div', '', {className: 'entity-picker'}), trigger = el('button', '', {type: 'button', className: 'entity-picker-trigger'});
        const validation = el('span', '', {className: 'field-hint error', role: 'alert', hidden: true}), originalTabIndex = control.tabIndex;
        const id = 'entity-picker-' + ++nextId;
        trigger.id = id;trigger.setAttribute('aria-haspopup', 'dialog');
        control.before(root);root.append(control, trigger, validation);
        control.classList.add('entity-picker-source');control.tabIndex = -1;control.setAttribute('aria-hidden', 'true');
        // Keep the original control and its events as the form/model boundary.
        // Proxy focus and invalid events to the visible, labelled trigger.
        control.addEventListener('focus', () => trigger.focus());
        control.addEventListener('invalid', event => {if (config.enabled === false) return;event.preventDefault();trigger.focus();trigger.setAttribute('aria-invalid', 'true');validation.textContent = control.validationMessage;validation.hidden = false;});
        let config = options, assets = [], assetsVersion = -1, dialog, refreshDialog;
        const labels = [...(control.labels || [])];
        for (const label of labels) label.htmlFor = trigger.id;
        function label() {return config.label || labels.map(row => row.textContent.trim()).join(' ') || control.getAttribute('aria-label') || 'Entity';}
        function choices() {
            if (config.libraryEntries) return assets.filter(row => !config.type || row.type === config.type);
            return config.entries || [...(control.options || [])].filter(row => !row.disabled && (row.value !== '' || !control.required))
                .map(row => ({id: row.value, name: row.textContent}));
        }
        function asset(entry) {return entry?.preview ? entry : entry ? resolve(entry, assets, config.type) : null;}
        function content(entry, selected = false) {
            const resolved = asset(entry), text = el('span', '', {className: 'entity-picker-text'});
            const name = entry?.name || resolved?.name || resolved?.id || entry?.id || config.emptyLabel || 'Choose an entity';
            text.append(el('span', name));
            if (entry && String(entry.id) !== '' && name !== String(entry.id) && !name.includes(' · ')) text.append(el('small', String(entry.id) + (resolved?.id && resolved.id !== String(entry.id) ? ' · ' + resolved.id : '')));
            return [thumbnail(resolved), text, ...(selected ? [el('span', 'Choose…', {className: 'entity-picker-action'})] : [])];
        }
        function refresh() {
            const enabled = config.enabled !== false;
            trigger.hidden = !enabled;control.classList.toggle('entity-picker-source', enabled);
            control.tabIndex = enabled ? -1 : originalTabIndex;
            if (enabled) control.setAttribute('aria-hidden', 'true');else control.removeAttribute('aria-hidden');
            for (const row of labels) row.htmlFor = enabled ? trigger.id : control.id;
            const value = String(control.value), entry = choices().find(row => String(row.id) === value);
            trigger.replaceChildren(...content(entry || (value ? {id: value, name: value + ' · unavailable'} : null), true));
            trigger.disabled = control.matches(':disabled') || control.readOnly;
            trigger.setAttribute('aria-label', label() + ': ' + (entry?.name || value || config.emptyLabel || 'Choose an entity'));
            if (control.validity?.valid || !enabled) {trigger.removeAttribute('aria-invalid');validation.hidden = true;}
            refreshDialog?.();
        }
        function close() {if (dialog?.open) dialog.close();dialog?.remove();dialog = null;refreshDialog = null;if (trigger.isConnected) trigger.focus();}
        function choose(entry) {
            if (control.matches(':disabled') || control.readOnly || control.closest('[inert]')) {close();return;}
            const changed = String(control.value) !== String(entry.id);
            control.value = String(entry.id);close();
            if (changed) {control.dispatchEvent(new Event('input', {bubbles: true}));control.dispatchEvent(new Event('change', {bubbles: true}));}
            refresh();if (trigger.isConnected) trigger.focus();
        }
        function open() {
            if (trigger.disabled || control.closest('[inert]')) return;
            close();dialog = el('dialog', '', {className: 'entity-picker-dialog'});
            dialog.setAttribute('aria-labelledby', id + '-title');
            const header = el('div', '', {className: 'entity-picker-heading'}), dismiss = el('button', 'Close', {type: 'button'});
            header.append(el('h2', 'Choose ' + label().toLocaleLowerCase(), {id: id + '-title'}), dismiss);
            const search = el('input', '', {type: 'search', id: id + '-search', placeholder: 'Search by name or ID', autocomplete: 'off'});
            const searchLabel = el('label', 'Search entities', {htmlFor: search.id});
            const category = el('select', '', {ariaLabel: 'Entity category'});
            category.append(...[['', 'All entities'], ['item', 'Items'], ['mob', 'Mobs'], ['npc', 'NPCs']].map(([value, name]) => el('option', name, {value})));
            category.hidden = !!config.type;
            const results = el('div', '', {className: 'entity-picker-results', role: 'group', ariaLabel: 'Matching entities'});
            const count = el('p', '', {className: 'field-hint', role: 'status'}), more = el('button', 'Show more results', {type: 'button'});
            const custom = el('button', 'Use this ID', {type: 'button', hidden: true});
            let limit = 60;
            function render() {
                category.hidden = !!config.type || new Set(choices().map(entry => asset(entry)?.type).filter(Boolean)).size < 2;
                const entries = choices().filter(entry => matches(entry, search.value, asset(entry)) && (!category.value || asset(entry)?.type === category.value));
                results.replaceChildren();
                for (const entry of entries.slice(0, limit)) {
                    const button = el('button', '', {type: 'button', className: 'entity-picker-option'});
                    button.append(...content(entry));button.setAttribute('aria-pressed', String(String(entry.id) === String(control.value)));
                    button.onclick = () => choose(entry);results.append(button);
                }
                more.hidden = entries.length <= limit;
                custom.hidden = !config.allowCustom || !search.value.trim();
                count.textContent = entries.length ? Math.min(limit, entries.length) + ' of ' + entries.length + ' matching entities' : 'No entities match. Try another name or ID, or clear the search.';
                if (!entries.length) results.append(el('p', 'No matching entities.', {className: 'field-hint'}));
            }
            search.oninput = category.onchange = () => {limit = 60;render();};
            more.onclick = () => {limit += 60;render();};dismiss.onclick = close;
            custom.onclick = () => choose({id: search.value.trim()});
            dialog.addEventListener('cancel', event => {event.preventDefault();close();trigger.focus();});
            let startedOutside = false;
            const outside = event => {
                if (event.target !== dialog) return false;
                const bounds = dialog.getBoundingClientRect();
                return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
            };
            dialog.addEventListener('pointerdown', event => {startedOutside = outside(event);});
            dialog.addEventListener('click', event => {if (startedOutside && outside(event)) close();startedOutside = false;});
            search.onkeydown = event => {if (event.key === 'ArrowDown') {event.preventDefault();results.querySelector('button')?.focus();}if (event.key === 'Enter') {event.preventDefault();if (results.childElementCount === 1) results.querySelector('button')?.click();}};
            results.onkeydown = event => {
                const buttons = [...results.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
                if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {event.preventDefault();buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();}
            };
            const body = el('div', '', {className: 'entity-picker-body'});
            body.append(searchLabel, search, category, count, results, more, custom);dialog.append(header, body);document.body.append(dialog);
            refreshDialog = render;render();dialog.showModal();search.focus();
            if (assetsVersion !== libraryVersion) loadPreviews();
        }
        function loadPreviews() {
            const version = libraryVersion;
            library().then(entries => {if (version !== libraryVersion) return;assets = entries;assetsVersion = version;refresh();})
                .catch(() => {/* Text choices remain usable when previews are unavailable. */});
        }
        trigger.onclick = open;control.addEventListener('input', refresh);control.addEventListener('change', refresh);
        const observer = new MutationObserver(refresh);observer.observe(control, {childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'readonly', 'required', 'selected', 'value']});
        const instance = {root, trigger, update(next = {}) {config = {...config, ...next};refresh();if (assetsVersion !== libraryVersion) loadPreviews();}, refresh, reload: loadPreviews};
        instances.set(control, instance);refresh();loadPreviews();return instance;
    }
    document.addEventListener('toolbox:assets-saved', () => {
        libraryRequest = null;libraryVersion++;
        for (const control of document.querySelectorAll('.entity-picker-source')) instances.get(control)?.reload();
    });
    window.ToolboxEntityPicker = {attach, resolve, matches, thumbnail};
})();

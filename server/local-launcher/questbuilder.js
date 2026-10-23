(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const clone = value => JSON.parse(JSON.stringify(value));
    const eventNames = {NPC_TALKED: 'Talk to NPC', KILL_MOB: 'Defeat mob', LOOT_ITEM: 'Collect item', AREA_ENTERED: 'Visit area', DELIVER_ITEM: 'Deliver item'};
    const drafts = new Map();
    let maps = [], data, selected = -1, bundledId, mapId, loading = false, saving = false, requestId = 0;
    const fieldNames = {'quest-id': 'id', 'quest-name': 'name', 'quest-npc': 'npc', 'quest-level': 'level', 'quest-required-level': 'requiredLevel',
        'quest-prerequisite': 'requiredQuest', 'quest-start': 'startText', 'quest-progress': 'inProgressText', 'quest-end': 'endText', 'quest-return': 'returnToNpc',
        'quest-long-text': 'longText', 'quest-log-text': 'questLogText', 'quest-npc-text': 'npcText'};
    const numeric = new Set(['npc', 'level', 'requiredLevel', 'returnToNpc']);
    const editableFields = ['name', 'startText', 'inProgressText', 'endText', 'longText', 'questLogText', 'npcText', 'level', 'requiredLevel', 'requiredQuest', 'returnToNpc', 'reward', 'eventType', 'target', 'amount', 'needToReturn'];
    const bundled = () => data?.existingQuests.find(item => item.id === bundledId);
    const quest = () => bundledId ? bundled()?.effective : data?.quests[selected];
    const snapshot = value => JSON.stringify({quests: value.quests, overrides: value.overrides || []});
    function dialogueSource(value) {return Array.isArray(value) ? value.join('\n') : String(value ?? '');}
    function updateOverride() {
        if (!bundledId) return;
        const entry = bundled(), changes = {};
        for (const key of editableFields) {
            if (JSON.stringify(entry.original[key]) !== JSON.stringify(entry.effective[key])) changes[key] = entry.effective[key] ?? null;
        }
        data.overrides = data.overrides.filter(item => item.id !== bundledId);
        if (Object.keys(changes).length) data.overrides.push({id: bundledId, changes});
    }
    function node(tag, text, className) {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        return element;
    }
    function option(value, text) {const element = node('option', text); element.value = String(value); return element;}
    function error(message) {
        $('quest-error').textContent = message; $('quest-error').hidden = !message;
    }
    async function request(url, options) {
        const response = await fetch(url, {...options, signal: AbortSignal.timeout(20000)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'The quest builder could not complete the request. Try again.');
        return result;
    }
    function dirty() {return data && snapshot(data) !== data.saved;}
    function updateStatus(message) {
        const changed = dirty();
        $('quest-save').disabled = !data || !changed || loading || saving;
        $('quest-map').disabled = loading || saving || !maps.length;
        $('quest-retry').disabled = loading || saving;
        $('quest-new').disabled = saving;
        $('quest-form').inert = saving;
        $('quest-form').setAttribute('aria-busy', String(saving));
        $('quest-first').disabled = saving;
        $('quest-save').textContent = saving ? 'Saving…' : 'Save quests';
        $('quest-status').dataset.dirty = String(!!changed);
        $('quest-status').textContent = message || (changed ? 'Unsaved changes in this map. Save quests when you are ready.' : `${data?.quests.length || 0} custom quests · ${data?.overrides?.length || 0} local overrides · ${data?.source || 'Choose a map'}`);
    }
    function changed() {
        updateOverride();
        renderList(); renderPreview(); updateStatus();
    }
    function populate(select, entries, value, empty) {
        select.replaceChildren(...(empty ? [option('', empty)] : [option('', 'Choose a target')]), ...entries.map(item => option(item.id, `${item.name} · ${item.id}`)));
        if (value !== undefined && value !== '' && !entries.some(item => String(item.id) === String(value))) select.append(option(value, `${value} · unavailable in this map`));
        select.value = value === undefined ? '' : String(value);
    }
    function renderList() {
        const list = $('quest-list'); list.replaceChildren();
        data.quests.forEach((item, index) => {
            const li = node('li'), button = node('button', item.name || 'Untitled quest');
            button.type = 'button'; button.setAttribute('aria-current', String(!bundledId && index === selected));
            button.append(node('small', item.id || 'No ID yet'));
            button.disabled = saving;
            button.addEventListener('click', () => {
                bundledId = undefined; selected = index; renderEditor(); renderList();
                $('quest-list').querySelectorAll('button')[index].focus();
            });
            li.append(button); list.append(li);
        });
        $('quest-empty').hidden = data.quests.length > 0;
    }
    function renderPreview() {
        if (!quest()) return;
        $('quest-json').textContent = JSON.stringify(quest(), null, 2);
        $('quest-editor-title').textContent = quest().name || 'Untitled quest';
    }
    function renderEditor() {
        const current = quest();
        $('quest-form').hidden = !current; $('quest-welcome').hidden = !!current;
        if (!current) return;
        const isBundled = !!bundledId;
        $('quest-builtin-note').hidden = !isBundled;
        $('quest-bubbles-hint').hidden = !isBundled;
        $('quest-id').readOnly = isBundled;
        $('quest-id-hint').textContent = isBundled ? 'This ID stays fixed to preserve existing quest progress.' : 'Keep this stable after playtesting. Progress uses this ID.';
        $('quest-npc').disabled = isBundled;
        $('quest-delete').textContent = isBundled ? 'Restore original' : 'Remove quest';
        $('quest-end').required = !isBundled || bundled().original.endText !== undefined;
        $('quest-objectives-section').hidden = isBundled;
        $('quest-legacy-section').hidden = !isBundled;
        $('quest-objectives-section').querySelectorAll('input, select, button').forEach(control => {control.disabled = isBundled;});
        $('quest-legacy-section').querySelectorAll('input, select, textarea').forEach(control => {control.disabled = !isBundled;});
        for (const [id, key] of Object.entries(fieldNames)) {
            if (id === 'quest-npc' || id === 'quest-return') populate($(id), data.catalog.npcs, current[key], id === 'quest-return' ? 'Complete without a final report' : undefined);
            else if (isBundled && !numeric.has(key) && key !== 'id' && key !== 'name' && key !== 'requiredQuest') $(id).value = dialogueSource(current[key]);
            else $(id).value = current[key] ?? (['level', 'requiredLevel'].includes(key) ? 1 : '');
        }
        $('quest-return').disabled = isBundled && bundled().lockedObjective;
        $('quest-ordered').checked = current.ordered !== false;
        populate($('quest-reward'), data.catalog.items, current.reward?.item, 'No item reward');
        $('quest-reward-amount').value = current.reward?.amount || 1;
        $('quest-reward-amount').disabled = !current.reward;
        const prerequisites = [...data.existingQuests, ...data.quests].filter(item => item.id !== current.id);
        $('quest-prerequisites').replaceChildren(...prerequisites.map(item => option(item.id, item.name)));
        if (isBundled) renderLegacy(); else renderObjectives();
        renderProgressHelp();
        renderPreview();
        document.dispatchEvent(new Event('toolbox:dialogue'));
    }
    function renderProgressHelp() {
        const current = quest();
        const supported = !bundledId || (!bundled().lockedObjective && ['KILL_MOB', 'LOOT_ITEM'].includes(current.eventType));
        $('quest-progress-tags').hidden = !supported;
        $('quest-progress').setAttribute('aria-describedby', supported ? 'quest-progress-context quest-progress-tags-note' : 'quest-progress-context');
        let noun;
        if (!bundledId) {
            $('quest-progress-context').textContent = 'For this quest, progress tags count objective steps. They do not count individual monsters or items within a step.';
            noun = 'objectives';
        } else if (!supported) {
            $('quest-progress-context').textContent = bundled().lockedObjective ?
                'This goal is controlled by story dialogue. Keep its original progress text or use a plain reminder; the quantity tags may not match its story progress.' :
                'This talk quest uses a single conversation. Use a plain reminder; it has no remaining or completed quantity counter.';
            return;
        } else if (current.eventType === 'KILL_MOB') {
            $('quest-progress-context').textContent = 'For this defeat quest, the tags use the game’s existing defeat count and the required amount.';
            noun = 'blue monsters';
        } else {
            $('quest-progress-context').textContent = 'For this collect quest, {{done}} uses the item quantity currently in inventory. {{remaining}} is the required amount minus that quantity.';
            noun = 'items';
        }
        const ending = noun === 'blue monsters' ? 'slay' : noun === 'items' ? 'collect' : 'complete';
        $('quest-progress-example').textContent = `Keep up the great work friend!\nYou only have {{remaining}} ${noun} left to ${ending}!`;
        $('quest-progress-example-result').textContent = `For a total of 10 with 3 done, {{remaining}} becomes 7. The player sees: “You only have 7 ${noun} left to ${ending}!”`;
    }
    function renderLegacy() {
        const current = quest(), locked = bundled().lockedObjective;
        $('quest-legacy-action').value = current.eventType;
        populate($('quest-legacy-target'), targetEntries(current.eventType), current.target);
        $('quest-legacy-amount').value = current.amount ?? 1;
        $('quest-need-return').checked = !!current.needToReturn;
        $('quest-flow-note').hidden = !locked;
        ['quest-legacy-action', 'quest-legacy-target', 'quest-legacy-amount', 'quest-need-return'].forEach(id => {$(id).disabled = locked;});
        if (current.eventType === 'NPC_TALKED') { $('quest-legacy-amount').value = 1; $('quest-legacy-amount').disabled = true; }
    }
    function field(label, input, hint) {
        const wrapper = node('div', undefined, 'field'), caption = node('label', label);
        caption.htmlFor = input.id; wrapper.append(caption, input);
        if (hint) wrapper.append(node('span', hint, 'field-hint'));
        return wrapper;
    }
    function input(id, value, settings = {}) {
        const element = node('input'); element.id = id; element.value = value ?? '';
        Object.assign(element, settings); return element;
    }
    function select(id, entries, value, empty) {
        const element = node('select'); element.id = id; element.required = true;
        populate(element, entries, value, empty); return element;
    }
    function targetEntries(type) {
        return data.catalog[type === 'NPC_TALKED' ? 'npcs' : type === 'KILL_MOB' ? 'mobs' : type === 'AREA_ENTERED' ? 'areas' : 'items'];
    }
    function firstTarget(type) {return targetEntries(type)[0]?.id;}
    function objectiveDefault() {
        let number = 1;
        while (quest().objectives.some(item => item.id === `step_${number}`)) number++;
        return {id: `step_${number}`, label: '', eventType: 'NPC_TALKED', target: firstTarget('NPC_TALKED'), amount: 1};
    }
    function renderObjectives() {
        const current = quest(), container = $('quest-objectives'); container.replaceChildren();
        $('quest-add-objective').disabled = current.objectives.length >= 20;
        current.objectives.forEach((objective, index) => {
            const prefix = `objective-${index}`, group = node('fieldset', undefined, 'objective');
            group.append(node('legend', `Objective ${index + 1}`));
            const actions = node('div', undefined, 'objective-actions');
            const action = (title, disabled, handler) => {
                const button = node('button', title, 'text-button'); button.type = 'button'; button.disabled = disabled;
                button.setAttribute('aria-label', `${title} objective ${index + 1}`); button.addEventListener('click', handler); actions.append(button);
            };
            action('Move up', index === 0, () => move(index, index - 1));
            action('Move down', index === current.objectives.length - 1, () => move(index, index + 1));
            action('Remove', current.objectives.length === 1, () => {
                current.objectives.splice(index, 1); renderObjectives(); changed();
                $(`objective-${Math.min(index, current.objectives.length - 1)}-label`).focus();
            });
            group.append(actions);
            const grid = node('div', undefined, 'two-columns');
            const identifier = input(prefix + '-id', objective.id, {maxLength: 64, pattern: '[A-Za-z][A-Za-z0-9_-]*', required: true});
            identifier.addEventListener('input', () => {objective.id = identifier.value; changed();});
            const label = input(prefix + '-label', objective.label, {maxLength: 160, required: true, placeholder: 'What should the player do?'});
            label.addEventListener('input', () => {objective.label = label.value; changed();});
            const type = node('select'); type.id = prefix + '-type';
            type.replaceChildren(...Object.entries(eventNames).map(([id, name]) => option(id, name))); type.value = objective.eventType;
            type.addEventListener('change', () => {
                objective.eventType = type.value; objective.target = firstTarget(type.value); delete objective.npcKey; delete objective.recipient;
                if (type.value === 'DELIVER_ITEM') objective.recipient = {npc: data.catalog.npcs[0]?.id};
                renderObjectives(); changed(); $(prefix + '-type').focus();
            });
            const target = select(prefix + '-target', targetEntries(objective.eventType), objective.target);
            target.addEventListener('change', () => {objective.target = objective.eventType === 'AREA_ENTERED' ? target.value : target.value === '' ? undefined : Number(target.value); changed();});
            const amount = input(prefix + '-amount', objective.amount || 1, {type: 'number', min: '1', max: '100000', required: true});
            amount.addEventListener('input', () => {objective.amount = Number(amount.value); changed();});
            grid.append(field('Objective ID', identifier), field('Player-facing label', label), field('Action', type), field('Target', target), field('Amount', amount));
            if (objective.eventType === 'NPC_TALKED') {
                const key = input(prefix + '-key', objective.npcKey, {maxLength: 100, placeholder: 'Any NPC of this kind'});
                key.addEventListener('input', () => {if (key.value.trim()) objective.npcKey = key.value.trim(); else delete objective.npcKey; changed();});
                grid.append(field('Placed NPC key (optional)', key));
            }
            if (objective.eventType === 'DELIVER_ITEM') {
                const recipientType = node('select'); recipientType.id = prefix + '-recipient-type';
                recipientType.append(option('npc', 'NPC'), option('area', 'Area')); recipientType.value = objective.recipient?.area !== undefined ? 'area' : 'npc';
                recipientType.addEventListener('change', () => {
                    const category = recipientType.value === 'npc' ? 'npcs' : 'areas';
                    objective.recipient = {[recipientType.value]: data.catalog[category][0]?.id}; renderObjectives(); changed(); $(prefix + '-recipient-type').focus();
                });
                const category = recipientType.value, entries = data.catalog[category === 'npc' ? 'npcs' : 'areas'];
                const recipient = select(prefix + '-recipient', entries, objective.recipient?.[category]);
                recipient.addEventListener('change', () => {objective.recipient = {[category]: category === 'npc' ? Number(recipient.value) : recipient.value}; changed();});
                grid.append(field('Deliver to', recipientType), field('Recipient', recipient));
                if (category === 'npc') {
                    const key = input(prefix + '-recipient-key', objective.recipient?.npcKey, {maxLength: 100, placeholder: 'Any NPC of this kind'});
                    key.addEventListener('input', () => {if (key.value.trim()) objective.recipient.npcKey = key.value.trim(); else delete objective.recipient.npcKey; changed();});
                    grid.append(field('Recipient NPC key (optional)', key));
                }
            }
            group.append(grid);
            if (!targetEntries(objective.eventType).length) group.append(node('p', 'No targets found. Build the map after adding its NPCs, mobs or named areas, then reload quests.', 'field-hint'));
            container.append(group);
        });
    }
    function move(from, to) {
        const entries = quest().objectives, item = entries.splice(from, 1)[0]; entries.splice(to, 0, item);
        renderObjectives(); changed();
        $(`objective-${to}-id`).focus();
    }
    function renderData() {
        $('quest-workspace').hidden = false;
        error(data.validationError || '');
        renderList(); renderEditor();
        $('quest-bundled-count').textContent = `(${data.existingQuests.length})`;
        $('quest-bundled-list').replaceChildren(...data.existingQuests.map(item => {
            const entry = node('li', item.effective?.name || item.name || item.id); entry.append(node('div', item.id));
            const edit = node('button', item.editMapId && item.editMapId !== mapId ? 'Edit in ' + item.editMapId : 'Edit quest', 'text-button');
            edit.type = 'button'; edit.addEventListener('click', () => editBundled(item)); entry.append(edit); return entry;
        }));
        updateStatus();
    }
    async function loadMap(id, reload = false) {
        const token = ++requestId;
        if (data) drafts.set(mapId, {data, selected, bundledId});
        mapId = id; error(''); loading = true; updateStatus('Loading quests…');
        $('quest-workspace').hidden = true;
        try {
            const cached = drafts.get(id);
            if (cached && !reload) {data = cached.data; selected = cached.selected; bundledId = cached.bundledId;}
            else {
                const result = await request(`/local/api/quests?mapId=${encodeURIComponent(id)}`);
                if (token !== requestId) return;
                data = {...result, overrides: result.overrides || []}; data.saved = snapshot(data);
                bundledId = undefined; selected = data.quests.length ? 0 : -1;
            }
            if (token !== requestId) return;
            drafts.set(id, {data, selected, bundledId});
            loading = false; renderData();
        } catch (failure) {
            if (token !== requestId) return;
            data = undefined; loading = false;
            error(failure.name === 'TimeoutError' ? 'Loading quests timed out. Check the toolbox and reload quests.' : failure.message);
            updateStatus('Quests could not load. Reload quests to try again.');
        }
    }
    async function editBundled(item) {
        if (saving) return;
        const owner = item.editMapId || mapId;
        if (owner !== mapId) {
            if (!maps.some(map => map.id === owner)) {error('This quest belongs to map ' + owner + ', which is not configured for this local game.'); return;}
            $('quest-map').value = owner;
            await loadMap(owner);
        }
        const entry = data?.existingQuests.find(candidate => candidate.id === item.id);
        if (!entry?.effective || mapId !== owner) return;
        bundledId = item.id; selected = -1; renderList(); renderEditor(); updateStatus(); $('quest-name').focus();
    }
    async function boot() {
        if (loading || data) return;
        loading = true; updateStatus('Loading maps…');
        try {
            const catalog = await request('/local/api/catalog'); maps = catalog.maps || [];
            $('quest-map').replaceChildren(...maps.map(map => option(map.id, map.name || map.id)));
            if (!maps.length) throw new Error('No maps are ready. Check Troubleshoot, then reload quests.');
            const initial = maps.find(map => map.id === $('map').value) || maps[0]; $('quest-map').value = initial.id;
            loading = false; await loadMap(initial.id);
        } catch (failure) {loading = false; error(failure.message); updateStatus('Quest builder is unavailable. Reload quests to try again.');}
    }
    function addQuest() {
        if (!data || saving) return;
        bundledId = undefined;
        let n = data.quests.length + 1, id;
        const taken = new Set([...data.quests, ...data.existingQuests].map(item => item.id));
        do {id = `${mapId}_quest_${n++}`;} while (taken.has(id));
        // Map IDs may start with a number or be too long for quest identifiers.
        id = ('quest_' + id).slice(0, 57);
        while (taken.has(id)) id = `quest_${Date.now().toString(36)}_${n++}`;
        data.quests.push({id, name: 'New quest', npc: data.catalog.npcs[0]?.id, level: 1, requiredLevel: 1,
            startText: '', endText: '', ordered: true, objectives: []});
        selected = data.quests.length - 1; quest().objectives.push(objectiveDefault());
        renderList(); renderEditor(); updateStatus(); $('quest-name').focus();
    }
    for (const [id, key] of Object.entries(fieldNames)) $(id).addEventListener('input', () => {
        if (!quest()) return;
        const value = $(id).value;
        if (!value && ['requiredQuest', 'inProgressText', 'returnToNpc', 'longText', 'questLogText', 'npcText'].includes(key)) delete quest()[key];
        else if (bundledId && Array.isArray(bundled().original[key])) quest()[key] = value.split('\n').filter(line => line.trim());
        else quest()[key] = numeric.has(key) ? value === '' ? undefined : Number(value) : value;
        changed();
    });
    $('quest-ordered').addEventListener('change', () => {quest().ordered = $('quest-ordered').checked; changed();});
    $('quest-legacy-action').addEventListener('change', () => {
        quest().eventType = $('quest-legacy-action').value;
        quest().amount = quest().eventType === 'NPC_TALKED' ? 1 : quest().amount ?? 1;
        quest().target = firstTarget(quest().eventType);
        renderLegacy(); changed(); $('quest-legacy-action').focus();
        renderProgressHelp();
        document.dispatchEvent(new Event('toolbox:dialogue'));
    });
    $('quest-legacy-target').addEventListener('change', () => {quest().target = Number($('quest-legacy-target').value); changed();});
    $('quest-legacy-amount').addEventListener('input', () => {quest().amount = Number($('quest-legacy-amount').value); changed();});
    $('quest-need-return').addEventListener('change', () => {quest().needToReturn = $('quest-need-return').checked; changed();});
    $('quest-reward').addEventListener('change', () => {
        if ($('quest-reward').value === '') delete quest().reward;
        else quest().reward = {item: Number($('quest-reward').value), amount: Number($('quest-reward-amount').value) || 1};
        $('quest-reward-amount').disabled = !quest().reward; changed();
    });
    $('quest-reward-amount').addEventListener('input', () => {if (quest().reward) quest().reward.amount = Number($('quest-reward-amount').value); changed();});
    $('quest-form').addEventListener('submit', event => event.preventDefault());
    $('quest-map').addEventListener('change', () => loadMap($('quest-map').value));
    $('quest-retry').addEventListener('click', () => {
        if (dirty() && !window.confirm('Reload quests and discard unsaved changes for this map?')) return;
        if (mapId && maps.length) loadMap(mapId, true); else boot();
    });
    $('quest-new').addEventListener('click', addQuest); $('quest-first').addEventListener('click', addQuest);
    $('quest-delete').addEventListener('click', () => {
        if (!quest() || saving) return;
        if (bundledId) {
            bundled().effective = clone(bundled().original);
            data.overrides = data.overrides.filter(item => item.id !== bundledId);
            renderEditor(); updateStatus('Original definition restored in this draft. Save quests and restart the game to apply it.');
            $('quest-name').focus(); return;
        }
        data.quests.splice(selected, 1); selected = Math.min(selected, data.quests.length - 1);
        renderList(); renderEditor(); updateStatus('Quest removed from this draft. Save quests to apply the change, or reload to discard it.');
        $(quest() ? 'quest-name' : 'quest-new').focus();
    });
    $('quest-add-objective').addEventListener('click', () => {
        if (!quest() || quest().objectives.length >= 20) return;
        quest().objectives.push(objectiveDefault()); renderObjectives(); changed();
        $(`objective-${quest().objectives.length - 1}-label`).focus();
    });
    $('quest-save').addEventListener('click', async () => {
        if (!data || !dirty() || loading || saving) return;
        // Validate every quest, including forms the author is not currently viewing.
        const previousSelection = selected;
        const previousBundled = bundledId;
        bundledId = undefined;
        for (let index = 0; index < data.quests.length; index++) {
            selected = index; renderEditor(); renderList();
            if (!$('quest-form').reportValidity()) return;
        }
        for (const override of data.overrides) {
            bundledId = override.id; renderEditor(); renderList();
            if (!$('quest-form').reportValidity()) return;
        }
        selected = previousSelection; bundledId = previousBundled; renderEditor(); renderList();
        const payload = {mapId, quests: clone(data.quests), overrides: clone(data.overrides), revision: data.revision};
        saving = true; error(''); updateStatus('Saving quests…'); renderList();
        try {
            const result = await request('/local/api/quests', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
            data = {...result, overrides: result.overrides || []}; data.saved = snapshot(data);
            selected = Math.min(selected, data.quests.length - 1); drafts.set(mapId, {data, selected, bundledId});
            saving = false; renderData(); updateStatus('Quests saved. Build this map in Build tools to load them into the game.');
        } catch (failure) {error(failure.message); saving = false; renderList(); updateStatus('Quests were not saved. Your draft is still here.');}
    });
    document.addEventListener('toolbox:pane', event => {if (event.detail === 'quests') boot();});
    window.addEventListener('beforeunload', event => {
        if (dirty() || [...drafts.values()].some(draft => snapshot(draft.data) !== draft.data.saved)) {event.preventDefault(); event.returnValue = '';}
    });
    if (location.hash.split('/')[0] === '#quests') boot();
})();

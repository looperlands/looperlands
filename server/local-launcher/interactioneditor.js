(() => {
    'use strict';
    const artwork = new Map();
    function sheet(mapId) {
        if (!artwork.has(mapId)) artwork.set(mapId, window.MapmakerCanvas.load(mapId).then(data => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({image, size: data.tilesize || 16});
            image.onerror = () => reject(new Error('Map artwork could not load. Build this map and try again.'));
            image.src = data.tileset;
        })).catch(error => {artwork.delete(mapId); throw error;}));
        return artwork.get(mapId);
    }
    function thumbnail(canvas, mapId, tile) {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, 48, 48);
        if (!tile) return;
        sheet(mapId).then(({image, size}) => {
            if (!canvas.isConnected) return;
            const columns = image.width / size, i = tile - 1;
            context.imageSmoothingEnabled = false;
            context.drawImage(image, i % columns * size, Math.floor(i / columns) * size, size, size, 0, 0, 48, 48);
        }).catch(() => {canvas.setAttribute('aria-label', 'Artwork unavailable');});
    }
    function tilePicker(parent, c, label, value, choose) {
        const {el, button} = c, wrap = el('div', '', {className: 'interaction-artwork'});
        const canvas = el('canvas', '', {width: 48, height: 48, ariaLabel: label + ' artwork'});
        const open = button(wrap, label, () => browse.hidden = !browse.hidden);
        open.prepend(canvas);
        open.append(el('span', value ? 'Change artwork' : 'Original map artwork', {className: 'field-hint'}));
        thumbnail(canvas, c.mapId, value);
        const browse = el('div', '', {className: 'interaction-tile-picker', hidden: true});
        wrap.append(browse); parent.append(wrap);
        button(browse, 'Use original map artwork', () => choose(0));
        const notice = el('p', 'Loading tiles…', {className: 'field-hint', role: 'status'});
        browse.append(notice);
        const grid = el('canvas', '', {width: 512, height: 256, tabIndex: 0, role: 'img', ariaLabel: 'Tile picker. Arrow keys move; Enter selects artwork.'});
        browse.append(grid);
        sheet(c.mapId).then(({image, size}) => {
            if (!grid.isConnected) return;
            const columns = image.width / size, count = columns * image.height / size;
            let cursor = Math.max(0, value - 1), page = Math.floor(cursor / 128);
            const controls = el('div', '', {className: 'interaction-inline-controls'});
            browse.append(controls);
            const previous = button(controls, 'Previous tiles', () => {page--; cursor = page * 128; draw();});
            const next = button(controls, 'Next tiles', () => {page++; cursor = page * 128; draw();});
            const jump = el('input', '', {type: 'number', min: 1, max: Math.ceil(count / 128), value: page + 1, ariaLabel: 'Tilesheet page'});
            jump.onchange = () => {page = Math.max(0, Math.min(Math.ceil(count / 128) - 1, Number(jump.value) - 1)); cursor = page * 128; draw();};
            controls.append(jump);
            function draw() {
                const context = grid.getContext('2d');
                context.clearRect(0, 0, grid.width, grid.height); context.imageSmoothingEnabled = false;
                for (let cell = 0; cell < 128; cell++) {
                    const i = page * 128 + cell;
                    if (i >= count) break;
                    const x = cell % 16 * 32, y = Math.floor(cell / 16) * 32;
                    context.drawImage(image, i % columns * size, Math.floor(i / columns) * size, size, size, x, y, 32, 32);
                    if (i === cursor) {context.strokeStyle = '#2563eb'; context.lineWidth = 3; context.strokeRect(x + 2, y + 2, 28, 28);}
                }
                previous.disabled = page === 0; next.disabled = (page + 1) * 128 >= count; jump.value = page + 1;
                notice.textContent = 'Page ' + (page + 1) + ' of ' + Math.ceil(count / 128) + '. Click artwork, or use arrow keys and Enter.';
            }
            grid.onclick = event => {
                const rect = grid.getBoundingClientRect();
                const cell = Math.floor((event.clientX - rect.left) / rect.width * 16) + Math.floor((event.clientY - rect.top) / rect.height * 8) * 16;
                const tile = page * 128 + cell + 1;
                if (tile <= count) choose(tile);
            };
            grid.onkeydown = event => {
                const offset = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -16, ArrowDown: 16}[event.key];
                if (offset) {event.preventDefault(); cursor = Math.max(0, Math.min(count - 1, cursor + offset)); page = Math.floor(cursor / 128); draw();}
                if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); choose(cursor + 1);}
            };
            draw();
        }).catch(error => {notice.textContent = error.message; notice.className = 'error';});
    }

    function render(c) {
        const {form, action: a, el, button, section, grid, field, touch, data} = c;
        const Templates = window.InteractionTemplates;
        const itemName = id => {
            const name = data.catalog.items.find(i => String(i.id) === String(id))?.name || String(id);
            return name.replace(/^M88N/, 'M88N ').replaceAll('_', ' ').toLowerCase();
        };
        const items = data.catalog.items.map(i => ({id: String(i.id), name: itemName(i.id)})).sort((a, b) => a.name.localeCompare(b.name));
        const step = a.stages.find(s => s.id === c.currentStep) || a.stages[0];
        const behavior = section(form, 'Who can use it?', 'Progress belongs to each placed tile. Choose whether players share that progress.');
        const behaviorGrid = grid(behavior);
        field(behaviorGrid, 'Progress', a, 'scope', {choices: [{id: 'shared', name: 'Shared by everyone'}, {id: 'player', name: 'Separate for each player'}]});
        field(behaviorGrid, 'After the last action', a, 'repeat', {choices: [{id: 'once', name: 'Stay completed'}, {id: 'immediate', name: 'Ready again immediately'}, {id: 'cooldown', name: 'Ready again after a cooldown'}], change: c.redraw});
        if (a.repeat === 'cooldown') field(behaviorGrid, 'Cooldown · seconds', a, 'cooldownSeconds', {number: true, min: 1, max: 604800, hint: 'Artwork and availability restore automatically.'});
        if (a.repeat !== 'immediate') field(behaviorGrid, 'Completed state name', a, 'completedName', {hint: 'For example: Opened, Depleted or Repaired.'});

        const actions = section(form, 'What does the player do?', a.stages.length === 1 ? 'One action is enough for most interactions. Add another step only when the player needs to do more.' : 'Select an action to edit its requirements and result.');
        if (a.stages.length > 1) {
            const flow = el('div', '', {className: 'interaction-step-list'});
            for (const s of a.stages) button(flow, s.name, () => c.selectStep(s.id), {ariaPressed: String(step === s)});
            actions.append(flow);
        }
        const actionGrid = grid(actions);
        field(actionGrid, 'Action label', step, 'name', {required: true, hint: 'The player sees this when using the object.'});
        field(actionGrid, 'Time to perform · seconds', step, 'duration', {number: true, min: 0, max: 30, step: .1});
        field(actions, 'Required tool or key · kept', step, 'tool', {choices: [{id: '', name: 'None'}, ...items], hint: 'Must be in the inventory. Add it to costs below if it should be consumed.'});
        itemRows(actions, 'Costs', step.costs);

        const result = section(form, 'What happens?', 'Rewards and effects apply only when the action succeeds.');
        itemRows(result, 'Rewards', step.rewards, true);
        field(result, 'XP gained', step, 'xp', {number: true, max: 100000});
        field(result, 'Player message', step, 'message', {hint: 'Optional feedback after completing this action.'});
        const links = el('p', '', {className: 'interaction-inline-controls'});
        links.append(el('a', 'Use in a quest', {href: '#quests/?' + new URLSearchParams({map: c.mapId})}),
            el('a', 'Connect this action to an event', {href: '#events/?' + new URLSearchParams({map: c.mapId, interaction: c.interactionId, stage: step.id})}));
        result.append(links);

        const appearance = section(form, 'Appearance on ' + c.mapId, 'Choose artwork from this map’s tilesheet. Other maps keep their own appearance. Original artwork does not change collisions.');
        const visuals = a.appearances?.[c.mapId] || {initialTile: 0, stages: {}};
        function choose(key, tile) {
            a.appearances ||= {}; a.appearances[c.mapId] = structuredClone(visuals);
            if (key === 'initial') a.appearances[c.mapId].initialTile = tile;
            else a.appearances[c.mapId].stages[step.id] = tile;
            touch(); c.redraw();
        }
        const appearanceGrid = el('div', '', {className: 'interaction-appearance-grid'}); appearance.append(appearanceGrid);
        tilePicker(appearanceGrid, c, 'Before the first action', visuals.initialTile || 0, tile => choose('initial', tile));
        tilePicker(appearanceGrid, c, 'After “' + step.name + '”', visuals.stages[step.id] || 0, tile => choose('step', tile));

        const more = section(form, 'More steps');
        button(more, 'Add another step', () => {
            const next = Templates.stage('step_' + crypto.randomUUID().slice(0, 8), 'Next action');
            next.next = step.next; step.next = next.id; a.stages.splice(a.stages.indexOf(step) + 1, 0, next);
            touch(); c.selectStep(next.id);
        });
        if (a.stages.length > 1) button(more, 'Remove this step', () => {
            for (const other of a.stages) {
                if (other.next === step.id) other.next = step.next;
                if (other.failureNext === step.id) other.failureNext = '';
            }
            if (a.start === step.id) a.start = a.stages.find(s => s !== step).id;
            a.stages = a.stages.filter(s => s !== step); touch(); c.selectStep(a.start);
        });

        const advanced = el('details', '', {className: 'editor-disclosure'});
        advanced.append(el('summary', 'Advanced requirements, outcomes and references')); form.append(advanced);
        const settings = section(advanced, 'Advanced settings');
        const settingsGrid = grid(settings);
        field(settingsGrid, 'Required level', step, 'level', {number: true, min: 1, max: 1000});
        field(settingsGrid, 'Completed quest required', step, 'quest', {choices: [{id: '', name: 'None'}, ...data.catalog.quests]});
        field(settingsGrid, 'Success chance · %', step, 'successChance', {number: true, percent: true});
        field(settingsGrid, 'Wait before this action · seconds', step, 'waitSeconds', {number: true, max: 604800, hint: 'After the previous action. The player still performs this action.'});
        const targets = a.stages.map(s => ({id: s.id, name: s.name}));
        field(settingsGrid, 'On success', step, 'next', {choices: [{id: '', name: 'Finish this interaction'}, ...targets]});
        field(settingsGrid, 'On failure', step, 'failureNext', {choices: [{id: '', name: 'Retry this action'}, ...targets]});
        field(settings, 'Failure message', step, 'failureMessage');
        const triggerInput = field(settings, 'Map trigger', step, 'trigger', {hint: 'Shared map effect. Select an existing trigger or enter an ID, then connect it in Doors & portals or Triggers & events.'});
        if (triggerInput) {
            const suggestions = el('datalist', '', {id: 'interaction-trigger-options'});
            for (const event of data.catalog.events || []) suggestions.append(el('option', '', {value: event.id}));
            settings.append(suggestions); triggerInput.setAttribute('list', suggestions.id);
        }
        field(settings, 'Trigger outcome', step, 'triggerMode', {choices: [{id: 'activate', name: 'Activate'}, {id: 'deactivate', name: 'Deactivate'}, {id: 'toggle', name: 'Toggle'}]});
        settings.append(el('p', 'Interaction ID: ' + c.interactionId + ' · action ID: ' + step.id, {className: 'field-hint'}),
            el('p', 'Changing gameplay rules starts fresh progress for these placements. Names and messages can be edited without resetting progress.', {className: 'field-hint'}));

        return renderTest(c, itemName, items);

        function itemRows(parent, label, rows, open = false) {
            const details = el('details', '', {className: 'interaction-items', open: open || rows.length > 0});
            details.append(el('summary', label + (rows.length ? ' · ' + rows.length + ' items' : ' · none'))); parent.append(details);
            const list = el('div'); details.append(list);
            function draw() {
                list.replaceChildren();
                for (const [i, row] of rows.entries()) {
                    const line = grid(list);
                    field(line, label === 'Costs' ? 'Use item' : 'Give item', row, 'item', {choices: items});
                    field(line, 'Amount', row, 'amount', {number: true, min: 1, max: 100000});
                    button(line, 'Remove item', () => {rows.splice(i, 1); touch(); draw();});
                }
                button(list, label === 'Costs' ? 'Add cost' : 'Add reward', () => {
                    const item = items.find(item => !rows.some(row => String(row.item) === item.id));
                    if (!item || rows.length >= 20) return;
                    rows.push({item: item.id, amount: 1}); touch(); draw();
                });
            }
            draw();
        }
    }

    function renderTest(c, itemName, items) {
        const {action: a, section, el, field, button, grid} = c, Templates = window.InteractionTemplates;
        const panel = section(c.form, 'Test interaction', 'A sandbox for this definition: try inventory requirements, costs, rewards and cooldowns. Saved game data is never changed. Use a fresh playtest session to verify it in the game.');
        panel.dataset.view = 'preview';
        let state;
        const setup = el('details', '', {className: 'editor-disclosure'}); setup.append(el('summary', 'Test player and inventory')); panel.append(setup);
        const setupBody = el('div'); setup.append(setupBody);
        const output = el('p', '', {role: 'status', ariaLive: 'polite', className: 'interaction-test-state'});
        const picture = el('canvas', '', {width: 48, height: 48, ariaLabel: 'Current test artwork'});
        panel.append(picture, output);
        const controls = el('div', '', {className: 'interaction-inline-controls'}); panel.append(controls);
        const use = button(controls, 'Try action', () => attempt());
        const fail = button(controls, 'Force failed attempt', () => attempt(true));
        const advance = button(controls, 'Skip waiting', () => {state.time = Math.max(state.time, state.readyAt); refresh();});
        button(controls, 'Reset test', reset);
        const inventory = el('p'), log = el('ol', '', {className: 'interaction-test-log'}); panel.append(inventory, log);
        function supply() {
            state.items = {};
            for (const s of a.stages) for (const row of s.costs) state.items[row.item] = (state.items[row.item] || 0) + row.amount;
            for (const s of a.stages) if (s.tool) state.items[s.tool] = Math.max(1, state.items[s.tool] || 0);
        }
        function reset() {
            state = {stage: a.start, time: 0, readyAt: 0, xp: 0, level: Math.max(...a.stages.map(s => s.level)), quests: new Set(a.stages.map(s => s.quest).filter(Boolean)),
                tile: a.appearances?.[c.mapId]?.initialTile || 0, log: []};
            supply(); drawSetup(); refresh();
        }
        function drawSetup() {
            setupBody.replaceChildren(); field(setupBody, 'Player level', state, 'level', {number: true, min: 1, max: 1000, preview: true});
            for (const id of [...new Set(a.stages.map(s => s.quest).filter(Boolean))]) {
                const label = el('label', '', {className: 'interaction-quest-check'}), input = el('input', '', {type: 'checkbox', checked: state.quests.has(id)});
                input.onchange = () => input.checked ? state.quests.add(id) : state.quests.delete(id);
                label.append(input, 'Completed: ' + (c.data.catalog.quests.find(q => q.id === id)?.name || id)); setupBody.append(label);
            }
            const row = grid(setupBody), add = {item: items[0]?.id || '', amount: 1};
            field(row, 'Inventory item', add, 'item', {choices: items, preview: true});
            field(row, 'Amount to add', add, 'amount', {number: true, min: 1, max: 100000, preview: true});
            button(row, 'Add to test inventory', () => {state.items[add.item] = (state.items[add.item] || 0) + add.amount; refresh();});
            button(setupBody, 'Empty inventory', () => {state.items = {}; refresh();});
            button(setupBody, 'Give required items', () => {supply(); refresh();});
        }
        function refresh() {
            if (state.stage === null && a.repeat === 'cooldown' && state.time >= state.readyAt) {
                state.stage = a.start; state.readyAt = 0; state.tile = a.appearances?.[c.mapId]?.initialTile || 0;
                state.log.push('Cooldown finished. The interaction is ready again.');
            }
            const s = a.stages.find(s => s.id === state.stage), waiting = state.time < state.readyAt;
            output.textContent = waiting ? 'Ready in ' + (state.readyAt - state.time) + ' seconds.' : s ? 'Player action: ' + s.name : a.completedName || 'Completed';
            use.textContent = s?.name || 'Completed'; use.disabled = !s || waiting;
            fail.hidden = !s || s.successChance >= 1; fail.disabled = !s || waiting; advance.disabled = !waiting;
            inventory.textContent = 'Test inventory: ' + (Object.entries(state.items).filter(([, n]) => n).map(([id, n]) => n + ' × ' + itemName(id)).join(', ') || 'empty') + ' · ' + state.xp + ' XP gained';
            log.replaceChildren(...state.log.slice(-12).map(message => el('li', message)));
            thumbnail(picture, c.mapId, state.tile);
        }
        function attempt(forceFailure = false) {
            const s = a.stages.find(s => s.id === state.stage);
            if (!s || state.time < state.readyAt) return;
            const missing = Templates.requiredItems(s).filter(row => (state.items[row.item] || 0) < row.quantity);
            if (state.level < s.level) state.log.push('Blocked: needs level ' + s.level + '.');
            else if (s.quest && !state.quests.has(s.quest)) state.log.push('Blocked: complete the required quest first.');
            else if (missing.length) state.log.push('Blocked: needs ' + missing.map(row => row.quantity + ' × ' + itemName(row.item)).join(', ') + '.');
            else {
                const success = !forceFailure && Math.random() < s.successChance;
                for (const cost of s.costs) state.items[cost.item] -= cost.amount;
                state.time += s.duration;
                if (success) {
                    for (const reward of s.rewards) state.items[reward.item] = (state.items[reward.item] || 0) + reward.amount;
                    state.xp += s.xp; state.tile = a.appearances?.[c.mapId]?.stages?.[s.id] || 0;
                    state.log.push(s.message || s.name + ' succeeded.');
                    if (s.trigger) state.log.push((s.triggerMode || 'activate') + ' map trigger: ' + s.trigger);
                    state.stage = s.next || (a.repeat === 'immediate' ? a.start : null);
                } else {state.stage = s.failureNext || s.id; state.log.push(s.failureMessage || 'Failed: costs spent, no rewards or XP.');}
                const next = a.stages.find(s => s.id === state.stage);
                state.readyAt = state.time + (success && !s.next && a.repeat === 'cooldown' ? a.cooldownSeconds : next?.waitSeconds || 0);
            }
            refresh();
        }
        reset();
        return reset;
    }
    window.MapmakerInteractionEditor = {render};
})();

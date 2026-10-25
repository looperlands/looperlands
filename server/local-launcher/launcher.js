(() => {
    'use strict';
    const fetchData = (...args) => (window.ToolboxMapData?.fetch || fetch)(...args);
    const byId = id => document.getElementById(id);
    const lastKey = 'looperlands.localLauncher.last.v1';
    const presetsKey = 'looperlands.localLauncher.presets.v1';
    const fields = byId('launcher-fields');
    const form = byId('launcher-form');
    const notice = byId('notice');
    const status = byId('form-status');
    let catalog, avatarPicker, weaponPicker, presets = [];
    let storageUnavailable = false;
    let buildJob = null, buildTimer = null, buildLoaded = false;

    function readStorage(key, fallback) {
        try {return JSON.parse(localStorage.getItem(key)) || fallback;}
        catch {return fallback;}
    }
    function writeStorage(key, value) {
        try {localStorage.setItem(key, JSON.stringify(value)); return true;}
        catch {
            storageUnavailable = true;
            status.textContent = 'This browser cannot save setups. You can still start a game.';
            return false;
        }
    }
    function showError(message, focus = false) {
        notice.textContent = message;
        notice.hidden = false;
        if (focus) notice.focus();
    }
    function clearError() {notice.hidden = true; notice.textContent = '';}
    function titleCase(value) {return String(value).charAt(0).toUpperCase() + String(value).slice(1);}
    function option(value, label) {const node = document.createElement('option'); node.value = String(value); node.textContent = label; return node;}

    function preview(element, asset, kind) {
        const sprite = element.querySelector('.sprite');
        element.setAttribute('aria-label', asset ? `${kind}: ${asset.name}` : `No ${kind.toLowerCase()} selected`);
        if (!asset?.sprite) {sprite.style.display = 'none'; return;}
        const frame = asset.sprite;
        const width = Number(frame.width), height = Number(frame.height);
        if (!(width > 0 && height > 0)) {sprite.style.display = 'none'; return;}
        sprite.style.width = width + 'px';
        sprite.style.height = height + 'px';
        sprite.style.backgroundImage = `url("${frame.url}")`;
        sprite.style.backgroundPosition = `0px -${height * (Number(frame.row) || 0)}px`;
        sprite.style.transform = `scale(${Math.max(1, Math.min(2, Math.floor(72 / Math.max(width, height))))})`;
        sprite.style.display = 'block';
    }

    class AssetPicker {
        constructor(kind, items, selected) {
            this.kind = kind;
            this.items = items;
            this.root = byId(kind + '-picker');
            this.input = byId(kind + '-search');
            this.list = byId(kind + '-results');
            this.hint = byId(kind + '-hint');
            this.onSelect = selected;
            this.selected = null;
            this.matches = [];
            this.active = -1;
            this.searchable = items.map(item => ({item, text: `${item.name} ${item.id} ${item.nftId || ''}`.toLowerCase()}));
            this.input.addEventListener('input', () => {
                this.selected = null;
                this.onSelect(null);
                this.open(this.input.value);
            });
            this.input.addEventListener('focus', () => this.open(this.selected ? '' : this.input.value));
            this.input.addEventListener('keydown', event => this.keydown(event));
            this.input.addEventListener('blur', () => requestAnimationFrame(() => {
                if (!this.root.contains(document.activeElement)) this.close();
            }));
            this.root.querySelector('button').addEventListener('click', () => {this.input.focus(); this.open('');});
            this.list.addEventListener('pointerdown', event => event.preventDefault());
            this.list.addEventListener('click', event => {
                const target = event.target.closest('[data-result]');
                if (target) {this.select(this.matches[Number(target.dataset.result)]); this.input.focus(); this.close();}
            });
            document.addEventListener('pointerdown', event => {if (!this.root.contains(event.target)) this.close();});
        }
        select(item, notify = true) {
            this.selected = item || null;
            this.input.value = item ? item.name : '';
            this.input.setCustomValidity('');
            preview(byId(this.kind + '-preview'), item, titleCase(this.kind));
            this.close();
            if (notify) {
                this.onSelect(item);
                if (!fields.disabled) this.root.dispatchEvent(new Event('change', {bubbles: true}));
            }
        }
        open(query) {
            const search = query.trim().toLowerCase();
            const found = search ? this.searchable.filter(entry => entry.text.includes(search)) : this.searchable;
            this.matches = found.slice(0, 24).map(entry => entry.item);
            this.active = -1;
            this.list.replaceChildren();
            if (!this.matches.length) {
                const empty = document.createElement('div');
                empty.className = 'no-results';
                empty.textContent = 'No matches. Try part of a name or NFT ID.';
                this.list.append(empty);
            }
            this.matches.forEach((item, index) => {
                const row = document.createElement('div');
                row.id = `${this.kind}-option-${index}`;
                row.className = 'asset-option';
                row.dataset.result = index;
                row.setAttribute('role', 'option');
                row.setAttribute('aria-selected', 'false');
                const name = document.createElement('span');
                name.textContent = item.name;
                row.append(name);
                if (item.nftId && item.nftId !== item.name) {
                    const identifier = document.createElement('small');
                    identifier.textContent = item.nftId;
                    row.append(identifier);
                }
                this.list.append(row);
            });
            this.hint.textContent = found.length > 24 ? `${found.length} matches. Showing the first 24; type to narrow them down.` : `${found.length} ${this.kind}${found.length === 1 ? '' : 's'} found.`;
            this.list.hidden = false;
            this.input.setAttribute('aria-expanded', 'true');
            this.input.removeAttribute('aria-activedescendant');
        }
        close() {
            this.list.hidden = true;
            this.input.setAttribute('aria-expanded', 'false');
            this.input.removeAttribute('aria-activedescendant');
            this.active = -1;
        }
        keydown(event) {
            if (event.key === 'Escape' || event.key === 'Tab') {this.close(); return;}
            if (event.key === 'Enter' && !this.list.hidden) {
                event.preventDefault();
                if (this.active >= 0) {this.select(this.matches[this.active]); this.close();}
                return;
            }
            if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
            event.preventDefault();
            if (this.list.hidden) this.open(this.selected ? '' : this.input.value);
            if (!this.matches.length) return;
            this.active = (this.active + (event.key === 'ArrowDown' ? 1 : -1) + this.matches.length) % this.matches.length;
            this.list.querySelectorAll('[role=option]').forEach((row, index) => row.setAttribute('aria-selected', String(index === this.active)));
            const active = byId(`${this.kind}-option-${this.active}`);
            this.input.setAttribute('aria-activedescendant', active.id);
            active.scrollIntoView({block: 'nearest'});
        }
    }

    function checkpoints(preferred) {
        const map = catalog.maps.find(item => item.id === byId('map').value);
        const points = map?.checkpoints || [];
        const select = byId('checkpoint');
        select.replaceChildren(...points.map(point => option(point.id, `Checkpoint ${point.id}${point.starting ? ' · Starting point' : ''}`)));
        if (!points.length) select.append(option('', 'No checkpoint available'));
        const chosen = points.find(point => String(point.id) === String(preferred)) || points.find(point => point.starting) || points[0];
        select.value = chosen ? String(chosen.id) : '';
        checkpointHint();
    }
    function checkpointHint() {
        const map = catalog.maps.find(item => item.id === byId('map').value);
        const point = map?.checkpoints.find(item => String(item.id) === byId('checkpoint').value);
        byId('checkpoint-hint').replaceChildren(...(point ? ['Map position: ', window.MapLocation.coordinate(map.id, point.x, point.y)] : ['Choose a map with a checkpoint.']));
    }
    function safeLevel(value, fallback) {
        const number = Number(value);
        return Number.isInteger(number) && number >= 1 && number <= catalog.maxLevel ? number : fallback;
    }
    function fixedWeaponLevel(item) {
        return Number.isSafeInteger(item?.fixedLevel) && item.fixedLevel >= 0 ? item.fixedLevel : 0;
    }
    function weaponLevelState(item, preferred) {
        const input = byId('weapon-level');
        const configurable = Boolean(item?.nftId);
        input.disabled = !configurable;
        input.min = configurable ? 1 : 0;
        input.max = item?.maxLevel || catalog.maxLevel;
        input.setCustomValidity('');
        input.value = configurable ? Math.min(Number(input.max), safeLevel(preferred ?? input.value, 1)) : fixedWeaponLevel(item);
        byId('weapon-level-hint').textContent = item?.fishingRod ? 'Fishing rod level, 1–45. Uses the tool XP curve and the Upper hand trait.' : configurable ? 'Set the level for this NFT weapon.' : item ? 'Built-in weapons keep their game default. Only NFT weapons have a configurable level.' : 'Choose an NFT weapon to set its level.';
    }
    function progressRow(kind, saved) {
        const inventory = kind === 'item';
        const container = byId(inventory ? 'starting-inventory' : 'finished-quests');
        const row = document.createElement('div');
        row.className = 'inline-controls';
        const input = document.createElement('input');
        input.type = 'text'; input.required = true;
        input.setAttribute('list', inventory ? 'starting-item-options' : 'finished-quest-options');
        input.setAttribute('aria-label', inventory ? 'Inventory item' : 'Finished quest');
        input.placeholder = inventory ? 'Search item name or key' : 'Search quest name or ID';
        input.value = inventory ? catalog.items?.find(item => item.id === saved?.item)?.key || '' : saved || '';
        row.append(input);
        if (inventory) window.ToolboxEntityPicker.attach(input,{type:'item',label:'Inventory item',entries:catalog.items.map(item=>({id:item.key,name:item.name}))});
        if (inventory) {
            const amount = document.createElement('input');
            amount.type = 'number'; amount.min = '1'; amount.max = '1000000'; amount.step = '1'; amount.required = true;
            amount.value = saved?.amount ?? 1; amount.setAttribute('aria-label', 'Item amount');
            row.append(amount);
        }
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'text-button destructive'; remove.textContent = 'Remove';
        remove.setAttribute('aria-label', inventory ? 'Remove inventory item' : 'Remove finished quest');
        remove.addEventListener('click', () => {row.remove(); form.dispatchEvent(new Event('change', {bubbles: true}));});
        row.append(remove); container.append(row);
        return input;
    }
    function doorAccessHint() {
        const mode = byId('door-access').value;
        byId('door-access-hint').textContent = mode === 'allow-all'
            ? 'Enter any door or portal, ignoring ownership, items, quests, levels, time windows and triggers.'
            : mode === 'live'
                ? (catalog.liveOwnershipAvailable ? 'Check NFT and collection access using this wallet and the real API. Other requirements use local progress.' : 'Real ownership checks need to be configured on this local server before you can start in this mode.')
                : 'NFT and collection access always passes. Items, quests, levels, time windows and triggers still apply.';
    }
    function apply(settings) {
        const value = {...catalog.defaults, ...settings};
        byId('time-of-day').value = typeof value.timeOfDay === 'string' ? value.timeOfDay : '';
        byId('door-access').value = ['local', 'live', 'allow-all'].includes(value.localDoorAccess) ? value.localDoorAccess : 'local';
        doorAccessHint();
        byId('starting-inventory').replaceChildren(); byId('finished-quests').replaceChildren();
        for (const row of Array.isArray(value.startingInventory) ? value.startingInventory : []) progressRow('item', row);
        for (const id of Array.isArray(value.finishedQuests) ? value.finishedQuests : []) progressRow('quest', id);
        byId('map').value = catalog.maps.some(map => map.id === value.mapId) ? value.mapId : catalog.defaults.mapId;
        checkpoints(value.checkpointId);
        const avatar = catalog.avatars.find(item => item.nftId?.toLowerCase() === String(value.nftId).toLowerCase()) || catalog.avatars.find(item => item.nftId === catalog.defaults.nftId) || catalog.avatars[0];
        avatarPicker.select(avatar);
        const weapon = catalog.weapons.find(item => item.id === value.weaponId) || catalog.weapons.find(item => item.id === catalog.defaults.weaponId) || catalog.weapons[0];
        weaponPicker.select(weapon);
        byId('avatar-level').value = safeLevel(value.level, catalog.defaults.level);
        weaponLevelState(weapon, value.weaponLevel);
        byId('wallet').value = typeof value.walletId === 'string' ? value.walletId : catalog.defaults.walletId;
        byId('display-name').value = typeof value.title === 'string' ? value.title : '';
        byId('trait').value = catalog.traits.includes(value.trait) ? value.trait : catalog.defaults.trait;
        byId('spawn-x').value = Number.isInteger(value.x) && value.x >= 0 ? value.x : '';
        byId('spawn-y').value = Number.isInteger(value.y) && value.y >= 0 ? value.y : '';
        byId('advanced-spawn').open = byId('spawn-x').value !== '' || byId('spawn-y').value !== '';
    }
    function settings() {
        const startingInventory = [], finishedQuests = [];
        for (const row of byId('starting-inventory').children) {
            const input = row.querySelector('input');
            const item = catalog.items?.find(item => item.key === input.value);
            input.setCustomValidity(item ? '' : 'Choose an item from the list.');
            if (item) startingInventory.push({item: item.id, amount: Number(row.querySelector('input[type=number]').value)});
        }
        for (const row of byId('finished-quests').children) {
            const input = row.querySelector('input');
            const quest = catalog.quests?.find(quest => quest.id === input.value);
            input.setCustomValidity(quest ? '' : 'Choose a quest from the list.');
            if (quest) finishedQuests.push(quest.id);
        }
        avatarPicker.input.setCustomValidity(avatarPicker.selected ? '' : 'Choose an avatar from the results, or paste its NFT ID below.');
        weaponPicker.input.setCustomValidity(weaponPicker.selected ? '' : 'Choose a weapon from the results.');
        const x = byId('spawn-x'), y = byId('spawn-y');
        x.setCustomValidity(''); y.setCustomValidity('');
        if ((x.value === '') !== (y.value === '')) {
            const empty = x.value === '' ? x : y;
            empty.setCustomValidity('Enter both coordinates, or clear both to use the checkpoint.');
            byId('advanced-spawn').open = true;
        }
        if (!form.reportValidity()) return null;
        const data = {startingInventory, finishedQuests, timeOfDay: byId('time-of-day').value, localDoorAccess: byId('door-access').value, mapId: byId('map').value, checkpointId: byId('checkpoint').value,
            walletId: byId('wallet').value.trim(), nftId: avatarPicker.selected.nftId,
            level: Number(byId('avatar-level').value), weaponId: weaponPicker.selected.id,
            weaponLevel: weaponPicker.selected.nftId ? Number(byId('weapon-level').value) : fixedWeaponLevel(weaponPicker.selected), trait: byId('trait').value,
            title: byId('display-name').value.trim()};
        if (x.value !== '' && y.value !== '') {data.x = Number(x.value); data.y = Number(y.value);}
        return data;
    }
    function renderPresets(selected = '') {
        const select = byId('preset-select');
        select.replaceChildren(option('', presets.length ? 'Choose a setup' : 'No saved setups yet'), ...presets.map(preset => option(preset.id, preset.name)));
        select.value = selected;
        byId('preset-load').disabled = !select.value;
        byId('preset-delete').disabled = !select.value;
    }

    async function request(url, options) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await fetchData(url, {...options, signal: controller.signal});
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || `The local server returned HTTP ${response.status}.`);
            return body;
        } finally {clearTimeout(timer);}
    }
    async function start(event) {
        event.preventDefault(); clearError();
        if (fields.disabled) return;
        if (buildJob?.status === 'running') {showError('A map is building. Wait for it to finish before starting a game.', true); return;}
        const value = settings();
        if (!value) return;
        // Open synchronously with the click so browsers allow the new tab.
        const gameTab = window.open('about:blank', '_blank');
        if (!gameTab) {showError('Allow pop-ups for this local Toolbox, then click Start game again. Your editor stays open.', true); return;}
        writeStorage(lastKey, value);
        fields.disabled = true;
        form.setAttribute('aria-busy', 'true');
        byId('start-game').textContent = 'Starting game…';
        status.textContent = 'Preparing your local session…';
        try {
            gameTab.opener = null;
            gameTab.document.title = 'Starting LooperLands…';
            gameTab.document.body.textContent = 'Preparing your local game. Your editor stays open in the Toolbox tab.';
            const result = await request('/local/api/session', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(value)});
            if (typeof result.url !== 'string') throw new Error('The server did not return a game URL. Try again.');
            const destination = new URL(result.url, window.location.origin);
            const localHosts = ['127.0.0.1', 'localhost', '[::1]'];
            const localDestination = localHosts.includes(destination.hostname) && localHosts.includes(window.location.hostname);
            if (!['http:', 'https:'].includes(destination.protocol) || (destination.hostname !== window.location.hostname && !localDestination)) throw new Error('The server returned a game URL outside this local server.');
            if (gameTab.closed) throw new Error('The game tab was closed. Click Start game to open another one.');
            gameTab.location.replace(destination.href);
            status.textContent = 'Game opened in a new tab. Your editor stays open here.';
        } catch (error) {
            if (!gameTab.closed) gameTab.close();
            showError(error.name === 'AbortError' ? 'The server took too long to respond. Check that it is running, then try again.' : error.message, true);
            status.textContent = 'Your settings are ready. Try starting again.';
        } finally {
            fields.disabled = false;
            form.setAttribute('aria-busy', 'false');
            byId('start-game').textContent = 'Start game';
        }
    }
    async function boot() {
        clearError(); byId('retry').hidden = true;
        byId('catalog-status').textContent = 'Loading maps and avatars…';
        try {
            catalog = await request('/local/api/catalog');
            byId('starting-item-options').replaceChildren(...(catalog.items || []).map(item => option(item.key, item.name + ' · ' + item.key)));
            byId('finished-quest-options').replaceChildren(...(catalog.quests || []).map(quest => option(quest.id, quest.name + ' · ' + quest.id)));
            if (!catalog.maps?.length || !catalog.avatars?.length || !catalog.weapons?.length || !catalog.defaults) throw new Error('The local catalog is incomplete. Restart the server and try again.');
            byId('map').replaceChildren(...catalog.maps.map(map => option(map.id, map.name || map.id)));
            buildMaps();
            byId('trait').replaceChildren(...catalog.traits.map(trait => option(trait, titleCase(trait))));
            byId('avatar-level').max = catalog.maxLevel;
            byId('weapon-level').max = catalog.maxLevel;
            avatarPicker = new AssetPicker('avatar', catalog.avatars, item => {
                byId('avatar-nft').value = item?.nftId || '';
                byId('avatar-nft').setCustomValidity('');
                preview(byId('avatar-preview'), item, 'Avatar');
            });
            weaponPicker = new AssetPicker('weapon', catalog.weapons, item => {
                preview(byId('weapon-preview'), item, 'Weapon');
                weaponLevelState(item);
            });
            byId('avatar-nft').addEventListener('input', () => {
                const nft = byId('avatar-nft').value.trim().replace(/^NFT_/, '0x').toLowerCase();
                const item = catalog.avatars.find(avatar => avatar.nftId?.toLowerCase() === nft);
                avatarPicker.select(item, false);
                byId('avatar-nft').setCustomValidity(item ? '' : 'Use the NFT ID of an avatar included in the game.');
            });
            apply(readStorage(lastKey, {}));
            window.ToolboxMapData?.select(window.ToolboxNavigation?.params().get('map') || window.ToolboxMapData.preferred(byId('map').value)).catch(() => {});
            presets = readStorage(presetsKey, []);
            if (!Array.isArray(presets)) presets = [];
            presets = presets.filter(preset => preset && typeof preset.id === 'string' && typeof preset.name === 'string' && preset.settings && typeof preset.settings === 'object');
            renderPresets();
            fields.disabled = false;
            form.setAttribute('aria-busy', 'false');
            byId('catalog-status').textContent = '';
            byId('build-start').disabled = buildJob?.status === 'running';
            byId('build-map').disabled = buildJob?.status === 'running';
            byId('start-game').disabled = buildJob?.status === 'running';
        } catch (error) {
            showError(error.name === 'AbortError' ? 'The local server did not respond. Check that it is running, then try again.' : error.message);
            byId('catalog-status').textContent = 'The launcher could not load.';
            byId('retry').hidden = false;
        }
    }

    byId('map').addEventListener('change', () => {checkpoints(); byId('spawn-x').value = ''; byId('spawn-y').value = ''; window.ToolboxMapData?.select(byId('map').value).catch(() => {});});
    byId('checkpoint').addEventListener('change', checkpointHint);
    byId('door-access').addEventListener('change', doorAccessHint);
    byId('add-starting-item').addEventListener('click', () => progressRow('item').focus());
    byId('add-finished-quest').addEventListener('click', () => progressRow('quest').focus());
    byId('clear-spawn').addEventListener('click', () => {byId('spawn-x').value = ''; byId('spawn-y').value = ''; byId('spawn-x').setCustomValidity(''); byId('spawn-y').setCustomValidity(''); byId('advanced-spawn').open = false; form.dispatchEvent(new Event('change', {bubbles: true}));});
    byId('preset-select').addEventListener('change', () => {
        const selected = presets.find(preset => preset.id === byId('preset-select').value);
        byId('preset-load').disabled = !selected;
        byId('preset-delete').disabled = !selected;
        if (selected) byId('preset-name').value = selected.name;
        byId('preset-save').disabled = !byId('preset-name').value.trim();
    });
    byId('preset-name').addEventListener('input', () => {byId('preset-save').disabled = !byId('preset-name').value.trim();});
    byId('preset-load').addEventListener('click', () => {
        const preset = presets.find(item => item.id === byId('preset-select').value);
        if (!preset) return;
        clearError(); apply(preset.settings); writeStorage(lastKey, preset.settings);
        status.textContent = `Loaded “${preset.name}”.`;
    });
    byId('preset-save').addEventListener('click', () => {
        const value = settings(), name = byId('preset-name').value.trim();
        if (!value || !name) return;
        const existing = presets.find(preset => preset.name.toLowerCase() === name.toLowerCase());
        const preset = {id: existing?.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name, settings: value};
        const next = existing ? presets.map(item => item.id === existing.id ? preset : item) : [...presets, preset];
        if (!writeStorage(presetsKey, next)) return;
        presets = next; renderPresets(preset.id); writeStorage(lastKey, value);
        status.textContent = `Saved “${name}”.`;
    });
    byId('preset-delete').addEventListener('click', () => {
        const preset = presets.find(item => item.id === byId('preset-select').value);
        if (!preset) return;
        const next = presets.filter(item => item.id !== preset.id);
        if (!writeStorage(presetsKey, next)) return;
        presets = next; renderPresets(); byId('preset-name').value = ''; byId('preset-save').disabled = true;
        status.textContent = `Deleted “${preset.name}”.`;
    });
    form.addEventListener('submit', start);
    form.addEventListener('change', event => {
        if (!catalog || event.target.closest('.presets') || !avatarPicker.selected || !weaponPicker.selected) return;
        const data = {timeOfDay: byId('time-of-day').value, mapId: byId('map').value, checkpointId: byId('checkpoint').value, walletId: byId('wallet').value,
            nftId: avatarPicker.selected.nftId, level: Number(byId('avatar-level').value), weaponId: weaponPicker.selected.id,
            weaponLevel: weaponPicker.selected.nftId ? Number(byId('weapon-level').value) : fixedWeaponLevel(weaponPicker.selected), trait: byId('trait').value, title: byId('display-name').value};
        if (byId('spawn-x').value !== '') data.x = Number(byId('spawn-x').value);
        if (byId('spawn-y').value !== '') data.y = Number(byId('spawn-y').value);
        writeStorage(lastKey, data);
    });
    window.MapLocation.fields(byId('spawn-x'), byId('spawn-y'), () => byId('map').value);
    ['spawn-x', 'spawn-y'].forEach(id => byId(id).addEventListener('input', () => {byId('spawn-x').setCustomValidity(''); byId('spawn-y').setCustomValidity('');}));
    byId('retry').addEventListener('click', boot);
    window.addEventListener('pageshow', event => {
        if (event.persisted && catalog) {fields.disabled = false; form.setAttribute('aria-busy', 'false'); byId('start-game').textContent = 'Start game'; status.textContent = storageUnavailable ? 'This browser cannot save setups.' : 'Ready for another local game.';}
    });
    byId('build-map').addEventListener('change', () => window.ToolboxMapData?.select(byId('build-map').value).catch(() => {}));
    function buildMaps() {
        const select = byId('build-map');
        const linkedMap = window.ToolboxNavigation?.screen()==='build' ? window.ToolboxNavigation.params().get('map') : undefined;
        const previous = linkedMap || select.value;
        select.replaceChildren(...catalog.maps.map(map => option(map.id, map.name || map.id)));
        select.value = catalog.maps.some(map => map.id === previous) ? previous : catalog.defaults.mapId;
    }
    function buildError(message) {
        byId('build-error').textContent = message;
        byId('build-error').hidden = false;
    }
    function renderBuild(job) {
        const previous = buildJob;
        buildJob = job || null;
        const running = job?.status === 'running';
        byId('build-start').disabled = running || !catalog;
        byId('build-map').disabled = running || !catalog;
        byId('start-game').disabled = running;
        byId('build-start').textContent = running ? 'Building map…' : 'Build map and restart game';
        byId('build-form').setAttribute('aria-busy', String(running));
        byId('build-steps').hidden = !job;
        if (!job) return;
        if (running) {
            byId('build-status').textContent = 'Build in progress';
            byId('build-step').textContent = job.step || 'Preparing the build…';
            status.textContent = 'A map is building. Start your game when the build finishes.';
        } else if (job.status === 'succeeded') {
            byId('build-status').textContent = 'Build complete';
            byId('build-step').textContent = 'The local game is ready. Switch to Playtest to start a new session.';
            status.textContent = 'Build complete. Your local game is ready.';
        } else {
            byId('build-status').textContent = 'Build failed';
            byId('build-step').textContent = job.error || 'Check the build output, fix the map, and try again.';
            status.textContent = 'The last build failed. Check Build tools for details.';
        }
        const steps = [...byId('build-steps').children];
        const current = steps.findIndex(step => step.textContent.toLowerCase() === String(job.step).toLowerCase());
        steps.forEach((step, index) => {step.dataset.state = job.status === 'succeeded' || current > index ? 'complete' : current === index ? 'active' : 'pending';});
        const log = byId('build-log');
        const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 60;
        log.textContent = Array.isArray(job.logs) && job.logs.length ? job.logs.join('\n') : 'Waiting for build output…';
        if (atBottom || previous?.id !== job.id) log.scrollTop = log.scrollHeight;
        if (running) {
            clearTimeout(buildTimer);
            buildTimer = setTimeout(loadBuild, 1000);
        } else {
            clearTimeout(buildTimer);
            if (previous?.status === 'running' && job.status === 'succeeded') refreshMaps();
        }
    }
    async function refreshMaps() {
        if (!catalog) return;
        try {
            const fresh = await request('/local/api/catalog');
            const currentMap = byId('map').value, currentCheckpoint = byId('checkpoint').value;
            if (!fresh.maps?.length) return;
            catalog.maps = fresh.maps;
            byId('map').replaceChildren(...catalog.maps.map(map => option(map.id, map.name || map.id)));
            byId('map').value = catalog.maps.some(map => map.id === currentMap) ? currentMap : catalog.defaults.mapId;
            checkpoints(currentCheckpoint); buildMaps();
        } catch {buildError('The build finished, but the map list could not refresh. Reload this toolbox before starting a game.');}
    }
    async function loadBuild() {
        try {
            const data = await request('/local/api/build');
            buildLoaded = true;
            renderBuild(data.job);
        } catch (error) {
            buildError(error.name === 'AbortError' ? 'The build server did not respond. Check the terminal and try again.' : error.message);
            if (buildJob?.status === 'running') {
                clearTimeout(buildTimer);
                buildTimer = setTimeout(loadBuild, 1000);
            }
        }
    }
    byId('build-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (!catalog || buildJob?.status === 'running') return;
        byId('build-error').hidden = true;
        byId('build-start').disabled = true;
        byId('build-start').textContent = 'Starting build…';
        try {
            const data = await request('/local/api/build', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({mapId: byId('build-map').value})});
            if (!data.job) throw new Error('The server did not start a build. Try again.');
            renderBuild(data.job);
        } catch (error) {
            buildError(error.name === 'AbortError' ? 'The build request timed out. Check the output before trying again.' : error.message);
            byId('build-start').disabled = false;
            byId('build-start').textContent = 'Build map and restart game';
            loadBuild();
        }
    });
    byId('run-checks').addEventListener('click', async () => {
        const button = byId('run-checks');
        button.disabled = true; button.textContent = 'Checking…';
        byId('checks-error').hidden = true;
        byId('checks-status').textContent = 'Checking your local environment…';
        byId('checks-results').setAttribute('aria-busy', 'true');
        try {
            const data = await request('/local/api/checks');
            if (!Array.isArray(data.checks)) throw new Error('The server did not return any checks. Try again.');
            const rows = data.checks.map(check => {
                const row = document.createElement('li'); row.className = 'environment-check';
                const heading = document.createElement('div'); heading.className = 'check-heading';
                const title = document.createElement('h3'); title.textContent = check.label;
                const result = document.createElement('span'); result.className = 'check-result'; result.dataset.status = check.status;
                result.textContent = {pass: 'Ready', fail: 'Needs attention', warn: 'Check this'}[check.status] || 'Unknown';
                heading.append(title, result); row.append(heading);
                const detail = document.createElement('p'); detail.className = 'check-detail'; detail.textContent = check.detail; row.append(detail);
                if (check.fix) {const fix = document.createElement('p'); fix.className = 'check-fix'; fix.textContent = check.fix; row.append(fix);}
                return row;
            });
            byId('checks-results').replaceChildren(...rows);
            const failed = data.checks.filter(check => check.status === 'fail').length;
            const warnings = data.checks.filter(check => check.status === 'warn').length;
            const when = new Date(data.checkedAt);
            const timestamp = Number.isNaN(when.getTime()) ? '' : ` Checked at ${when.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}.`;
            byId('checks-status').textContent = (failed ? `${failed} check${failed === 1 ? '' : 's'} need attention.` : warnings ? `Ready, with ${warnings} thing${warnings === 1 ? '' : 's'} to check.` : 'All checks passed.') + timestamp;
        } catch (error) {
            byId('checks-error').textContent = error.name === 'AbortError' ? 'The checks took too long. Check that the toolbox is running, then try again.' : error.message;
            byId('checks-error').hidden = false;
            byId('checks-status').textContent = 'Checks could not finish. You can run them again.';
        } finally {
            button.disabled = false; button.textContent = 'Run checks';
            byId('checks-results').setAttribute('aria-busy', 'false');
        }
    });
    byId('check-updates').addEventListener('click', async () => {
        const button = byId('check-updates');
        button.disabled = true; button.textContent = 'Checking main…';
        byId('updates-status').textContent = 'Checking the latest main branch…';
        byId('updates-result').hidden = true; byId('copy-status').textContent = '';
        try {
            const data = await request('/local/api/updates');
            const labels = {'up-to-date': 'Up to date with main.', behind: 'Updates are available on main.', ahead: 'Your branch is ahead of main.', diverged: 'Your branch and main have different commits.', unknown: 'Update status is unavailable.'};
            byId('updates-status').textContent = labels[data.status] || labels.unknown;
            byId('updates-detail').textContent = typeof data.message === 'string' ? data.message : 'Try checking again.';
            const revisions = [];
            if (data.localBranch) revisions.push(`Branch: ${data.localBranch}`);
            if (data.localCommit) revisions.push(`Local: ${String(data.localCommit).slice(0, 12)}`);
            if (data.mainCommit) revisions.push(`Main: ${String(data.mainCommit).slice(0, 12)}`);
            byId('updates-revisions').textContent = revisions.join(' · ');
            const commands = Array.isArray(data.commands) ? data.commands.filter(command => typeof command === 'string') : [];
            byId('updates-commands').textContent = commands.join('\n');
            byId('updates-command-section').hidden = !commands.length;
            byId('updates-result').hidden = false;
        } catch (error) {
            byId('updates-status').textContent = error.name === 'AbortError' ? 'The update check took too long. Check your connection, then try again.' : `Could not check main: ${error.message}`;
        } finally {button.disabled = false; button.textContent = 'Check main updates';}
    });
    byId('copy-commands').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(byId('updates-commands').textContent);
            byId('copy-status').textContent = 'Commands copied.';
        } catch {
            byId('copy-status').textContent = 'Select the commands above and copy them.';
            const selection = window.getSelection();
            const range = document.createRange(); range.selectNodeContents(byId('updates-commands'));
            selection.removeAllRanges(); selection.addRange(range);
            byId('updates-commands').focus();
        }
    });
    const tools = [...document.querySelectorAll('.tool-tabs [data-pane]')];
    const mobileTool = byId('mobile-tool');
    for (const entry of document.querySelector('.tool-tabs').children) {
        if (entry.matches('.tool-group')) {
            const group = document.createElement('optgroup');
            group.label = entry.querySelector('summary').textContent;
            for (const tool of entry.querySelectorAll('[data-pane]')) group.append(option(tool.dataset.pane, tool.textContent));
            mobileTool.append(group);
        } else if (entry.matches('[data-pane]')) mobileTool.append(option(entry.dataset.pane, entry.textContent));
    }
    mobileTool.onchange = () => {location.hash = mobileTool.value;};
    let activePane;
    function openPane(tool) {
        mobileTool.value = tool.dataset.pane;
        for (const item of tools) {
            const selected = item === tool;
            if (selected) item.setAttribute('aria-current', 'page');
            else item.removeAttribute('aria-current');
            byId(item.getAttribute('aria-controls')).hidden = !selected;
        }
        const group = tool.closest('.tool-group');
        if (group) group.open = true;
        if (activePane !== tool.dataset.pane) window.scrollTo(0, 0);
        if (window.matchMedia('(min-width: 821px)').matches) tool.scrollIntoView({block: 'nearest'});
        activePane = tool.dataset.pane;
        if (tool.dataset.pane === 'build' && !buildLoaded) loadBuild();
        document.dispatchEvent(new CustomEvent('toolbox:pane', {detail: tool.dataset.pane}));
    }
    function routePane() {
        const pane = location.hash.slice(1).split('/')[0].split('?')[0] || 'playtest';
        if(pane==='atmosphere'){location.replace(location.hash.replace('#atmosphere','#scenes'));return;}
        openPane(tools.find(tool => tool.dataset.pane === pane) || tools[0]);
    }
    window.addEventListener('hashchange', routePane);
    routePane();
    window.ToolboxNavigation?.route('build',params=>{if(params.has('map')&&catalog?.maps.some(m=>m.id===params.get('map')))byId('build-map').value=params.get('map');});
    boot();
    loadBuild();
})();

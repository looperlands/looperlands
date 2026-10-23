(() => {
    'use strict';
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
        byId('checkpoint-hint').textContent = point ? `Map position: ${point.x}, ${point.y}` : 'Choose a map with a checkpoint.';
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
        input.setCustomValidity('');
        input.value = configurable ? safeLevel(preferred ?? input.value, 1) : fixedWeaponLevel(item);
        byId('weapon-level-hint').textContent = configurable ? 'Set the level for this NFT weapon.' : item ? 'Built-in weapons keep their game default. Only NFT weapons have a configurable level.' : 'Choose an NFT weapon to set its level.';
    }
    function apply(settings) {
        const value = {...catalog.defaults, ...settings};
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
        const data = {mapId: byId('map').value, checkpointId: byId('checkpoint').value,
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
            const response = await fetch(url, {...options, signal: controller.signal});
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || `The local server returned HTTP ${response.status}.`);
            return body;
        } finally {clearTimeout(timer);}
    }
    async function start(event) {
        event.preventDefault(); clearError();
        if (buildJob?.status === 'running') {showError('A map is building. Wait for it to finish before starting a game.', true); return;}
        const value = settings();
        if (!value) return;
        writeStorage(lastKey, value);
        fields.disabled = true;
        form.setAttribute('aria-busy', 'true');
        byId('start-game').textContent = 'Starting game…';
        status.textContent = 'Preparing your local session…';
        try {
            const result = await request('/local/api/session', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(value)});
            if (typeof result.url !== 'string') throw new Error('The server did not return a game URL. Try again.');
            const destination = new URL(result.url, window.location.origin);
            const localHosts = ['127.0.0.1', 'localhost', '[::1]'];
            const localDestination = localHosts.includes(destination.hostname) && localHosts.includes(window.location.hostname);
            if (!['http:', 'https:'].includes(destination.protocol) || (destination.hostname !== window.location.hostname && !localDestination)) throw new Error('The server returned a game URL outside this local server.');
            window.location.assign(destination.href);
        } catch (error) {
            showError(error.name === 'AbortError' ? 'The server took too long to respond. Check that it is running, then try again.' : error.message, true);
            fields.disabled = false;
            form.setAttribute('aria-busy', 'false');
            byId('start-game').textContent = 'Start game';
            status.textContent = 'Your settings are ready. Try starting again.';
        }
    }
    async function boot() {
        clearError(); byId('retry').hidden = true;
        byId('catalog-status').textContent = 'Loading maps and avatars…';
        try {
            catalog = await request('/local/api/catalog');
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

    byId('map').addEventListener('change', () => {checkpoints(); byId('spawn-x').value = ''; byId('spawn-y').value = '';});
    byId('checkpoint').addEventListener('change', checkpointHint);
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
        const data = {mapId: byId('map').value, checkpointId: byId('checkpoint').value, walletId: byId('wallet').value,
            nftId: avatarPicker.selected.nftId, level: Number(byId('avatar-level').value), weaponId: weaponPicker.selected.id,
            weaponLevel: weaponPicker.selected.nftId ? Number(byId('weapon-level').value) : fixedWeaponLevel(weaponPicker.selected), trait: byId('trait').value, title: byId('display-name').value};
        if (byId('spawn-x').value !== '') data.x = Number(byId('spawn-x').value);
        if (byId('spawn-y').value !== '') data.y = Number(byId('spawn-y').value);
        writeStorage(lastKey, data);
    });
    ['spawn-x', 'spawn-y'].forEach(id => byId(id).addEventListener('input', () => {byId('spawn-x').setCustomValidity(''); byId('spawn-y').setCustomValidity('');}));
    byId('retry').addEventListener('click', boot);
    window.addEventListener('pageshow', event => {
        if (event.persisted && catalog) {fields.disabled = false; form.setAttribute('aria-busy', 'false'); byId('start-game').textContent = 'Start game'; status.textContent = storageUnavailable ? 'This browser cannot save setups.' : 'Ready for another local game.';}
    });
    function buildMaps() {
        const select = byId('build-map');
        const previous = select.value;
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
    const tabs = [...document.querySelectorAll('.tool-tabs [role=tab]')];
    function openPane(tab) {
        for (const item of tabs) {
            const selected = item === tab;
            item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1;
            byId(item.getAttribute('aria-controls')).hidden = !selected;
        }
        if (tab.dataset.pane === 'build' && !buildLoaded) loadBuild();
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => openPane(tab));
        tab.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabs.length - 1;
            else return;
            event.preventDefault(); tabs[next].focus(); openPane(tabs[next]);
        });
    });
    boot();
    loadBuild();
})();

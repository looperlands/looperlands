define(['jquery', 'mapnames', 'sprites'], function ($, mapNames, sprites) {
    const categories = {items: ['Items', 'collected'], fish: ['Fish', 'caught'], monsters: ['Monsters', 'defeated']};
    function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text != null) element.textContent = String(text);
        return element;
    }
    function button(text, action, className = 'fg-button') {
        const element = node('button', className, text);
        element.type = 'button'; element.addEventListener('click', action); return element;
    }
    function status(entry) {
        if (entry.state === 'completed') return {obtain: 'Collected', loot: 'Looted', catch: 'Caught', defeat: 'Defeated'}[entry.completion];
        if (entry.state === 'unknown') return 'Undiscovered';
        return entry.category === 'monsters' ? 'Encountered' : entry.category === 'fish' ? 'Obtained · Not caught' : 'Discovered';
    }
    function remaining(entry) {
        return entry.state === 'unknown' ? entry.hint : {obtain: 'Collect this item', loot: 'Loot from a defeated monster', catch: 'Catch one yourself', defeat: 'Defeat this monster'}[entry.completion];
    }
    function visible(entries, category, filter, query) {
        return entries.filter(entry => entry.category === category &&
            (filter === 'all' || filter === 'undiscovered' && entry.state === 'unknown' || filter === 'unfinished' && entry.state !== 'completed' || filter === 'completed' && entry.state === 'completed') &&
            (!query || entry.name?.toLowerCase().includes(query.toLowerCase())));
    }
    function spriteStyle(name) {
        const definition = sprites[name];
        if (!definition) return null;
        const scale = Math.min(2, 40 / Math.max(definition.width, definition.height));
        return {width: definition.width + 'px', height: definition.height + 'px',
            backgroundImage: 'url("img/1/' + name + '.png")',
            backgroundPosition: '0px ' + (-(definition.animations?.idle_down?.row || 0) * definition.height) + 'px',
            transform: 'scale(' + scale + ')'};
    }

    class Journal {
        constructor(app) {
            this.app = app; this.opened = false; this.request = 0; this.data = null;
            this.filter = 'all'; this.query = ''; this.selected = null; this.pinned = null;
            this.view = 'quests'; this.quests = null; this.questFilter = 'IN_PROGRESS'; this.selectedQuest = null;
            this.root = node('div', 'field-guide'); this.root.hidden = true;
            this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true'); this.root.setAttribute('aria-label', 'Journal');
            for (const type of ['click', 'mousedown', 'touchstart', 'touchend', 'wheel']) this.root.addEventListener(type, event => event.stopPropagation());
            document.body.append(this.root);
            this.reminder = node('aside', 'fg-reminder'); this.reminder.hidden = true;
            this.reminder.setAttribute('aria-label', 'Pinned discovery');
            document.body.append(this.reminder);
            this.onKeyboard = event => this.keyboard(event);
            document.addEventListener('keydown', this.onKeyboard, true);
            this.timer = setInterval(() => {
                if (this.opened && (!app.game.started || app.game.player?.isDead)) this.close();
                else if (this.opened && this.worldMap !== app.game.mapId) {this.worldMap = app.game.mapId; this.mapId = app.game.mapId; this.selected = null; this.load();}
                else if (this.opened) this.load(true);
            }, 5000);
        }
        async open(view = 'field-guide') {
            if (!this.app.game.started || this.app.game.player?.isDead) return;
            this.returnFocus = document.activeElement;
            this.app.hideWindows(); this.app.hideChat(); this.app.eventBoard?.close();
            this.app.game.keyboardHandler?.handleBlur();
            this.opened = true; this.root.hidden = false; document.body.classList.add('field-guide-open');
            this.view = view;
            $('#achievementsbutton').addClass('active');
            this.worldMap = this.app.game.mapId; this.mapId = this.worldMap; this.data = null; this.selected = null;
            this.render('Opening your Journal…'); this.root.querySelector('button')?.focus();
            await this.load();
        }
        close() {
            this.opened = false; this.request++; this.root.hidden = true;
            document.body.classList.remove('field-guide-open');
            $('#achievementsbutton').removeClass('active');
            this.returnFocus?.focus?.();
        }
        async load(quiet = false) {
            if (!this.opened || quiet && this.loadingRequest) return;
            const request = ++this.request, map = this.mapId, view = this.view;
            this.loadingRequest = request;
            try {
                const response = await axios.get('/session/' + encodeURIComponent(this.app.sessionId) + (view === 'quests' ? '/quests' : '/field-guide'), {params: view === 'quests' ? {} : {map}});
                if (!this.opened || request !== this.request || map !== this.mapId || view !== this.view) return;
                if (view === 'quests') {
                    if (!Array.isArray(response.data)) throw new Error('Invalid quest log response');
                    const unchanged = JSON.stringify(this.quests) === JSON.stringify(response.data);
                    this.quests = response.data;
                    if (!quiet || !unchanged || this.error) this.render();
                    this.error = false; return;
                }
                const unchanged = JSON.stringify(this.data) === JSON.stringify(response.data);
                this.data = response.data;
                const pinned = this.data.entries.find(entry => entry.id === this.pinned?.id);
                if (pinned?.state === 'completed') this.pin(null);
                if (!quiet || !unchanged || this.error) this.render();
                this.error = false;
            } catch (error) {
                if (!this.opened || request !== this.request) return;
                this.error = true;
                this.render(error.response?.data?.error || 'Your Journal could not refresh. Please retry.', true);
            } finally {if (this.loadingRequest === request) this.loadingRequest = null;}
        }
        keyboard(event) {
            if (!this.opened) return;
            event.stopImmediatePropagation();
            if (event.key === 'Escape') {event.preventDefault(); this.close(); return;}
            if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.target?.matches?.('input, textarea, select, [contenteditable="true"]') && ['x', 'j'].includes(event.key.toLowerCase())) {
                event.preventDefault();
                const view = event.key.toLowerCase() === 'x' ? 'quests' : 'field-guide';
                if (this.view === view) this.close(); else this.switchView(view);
                return;
            }
            if (event.key !== 'Tab') return;
            const controls = [...this.root.querySelectorAll('button, input, select')].filter(element => !element.disabled);
            const first = controls[0], last = controls[controls.length - 1];
            if (!this.root.contains(document.activeElement)) {event.preventDefault(); first?.focus();}
            else if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
            else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
        }
        switchView(view) {this.view = view; this.error = false; this.render(); this.load();}
        render(message, failure = false) {
            const active = document.activeElement, focus = active?.dataset?.fgFocus;
            const position = active?.selectionStart;
            const wasInside = this.root.contains(active);
            const scroll = this.root.querySelector('.fg-sections')?.scrollTop || 0;
            this.root.replaceChildren();
            const panel = node('section', 'fg-panel');
            panel.append(node('h1', 'fg-title', 'Journal'));
            const close = button('', () => this.close(), 'fg-close'); close.dataset.fgFocus = 'close'; close.setAttribute('aria-label', 'Close Journal');
            close.append(node('span', 'fg-close-sprite')); panel.append(close);
            const tabs = node('nav', 'journal-tabs'); tabs.setAttribute('aria-label', 'Journal sections');
            for (const [view, title] of [['quests', 'Quests'], ['field-guide', 'Field Guide']]) {
                const tab = button(title, () => this.switchView(view), 'journal-tab');
                tab.setAttribute('aria-pressed', String(this.view === view)); tab.dataset.fgFocus = 'tab-' + view; tabs.append(tab);
            }
            panel.append(tabs);
            if (this.view === 'quests') {
                this.renderQuests(panel, message, failure);
                this.root.append(panel); this.restoreFocus(focus, position, wasInside, scroll); return;
            }
            const tools = node('div', 'fg-tools');
            const maps = node('select', 'fg-map'); maps.setAttribute('aria-label', 'Map'); maps.dataset.fgFocus = 'map';
            for (const map of this.data?.maps || [this.mapId]) {const option = node('option', '', mapNames[map] || map); option.value = map; maps.append(option);}
            maps.value = this.mapId;
            maps.addEventListener('change', () => {this.mapId = maps.value; this.selected = null; this.data = null; this.render('Opening this map…'); this.load();});
            const search = node('input', 'fg-search'); search.type = 'search'; search.placeholder = 'Search discoveries…'; search.value = this.query;
            search.setAttribute('aria-label', 'Search revealed entries'); search.dataset.fgFocus = 'search';
            search.addEventListener('input', () => {this.query = search.value; this.render();});
            const filter = node('select', 'fg-filter'); filter.setAttribute('aria-label', 'Entry status'); filter.dataset.fgFocus = 'filter';
            for (const [value, text] of [['all', 'All'], ['undiscovered', 'Undiscovered'], ['unfinished', 'Unfinished'], ['completed', 'Completed']]) {const option = node('option', '', text); option.value = value; filter.append(option);}
            filter.value = this.filter; filter.addEventListener('change', () => {this.filter = filter.value; this.render();});
            tools.append(maps, search, filter);
            if (this.data) {
                const totals = this.data.totals, summary = node('div', 'fg-summary');
                summary.append(node('span', '', totals.discovered + ' / ' + totals.total + ' discovered'), node('span', '', totals.completed + ' / ' + totals.total + ' completed'));
                tools.append(summary);
            }
            panel.append(tools);
            if (message) {
                const notice = node('div', 'fg-notice', message); notice.setAttribute('role', failure ? 'alert' : 'status');
                if (failure) notice.append(button('Retry', () => this.load()));
                panel.append(notice);
            }
            if (this.data) {
                const sections = node('div', 'fg-sections');
                for (const category of Object.keys(categories)) sections.append(this.section(category));
                panel.append(sections);
                const legend = node('footer', 'fg-legend', '✓ Complete   • Discovered   ? Undiscovered');
                if (this.data.bonusDiscoveries) legend.append(node('span', '', 'Bonus discoveries: ' + this.data.bonusDiscoveries));
                if (this.data.temporary) legend.append(node('span', '', 'Free-to-play: progress lasts for this session.'));
                if (!this.data.totals.total) legend.append(node('span', '', 'No standard entries published for this map.'));
                panel.append(legend);
            }
            this.root.append(panel);
            this.restoreFocus(focus, position, wasInside, scroll);
        }
        restoreFocus(focus, position, wasInside, scroll) {
            const next = [...this.root.querySelectorAll('[data-fg-focus]')].find(element => element.dataset.fgFocus === focus);
            (next || (wasInside ? this.root.querySelector('button') : null))?.focus();
            if (next?.type === 'search' && position != null) next.setSelectionRange(position, position);
            const sections = this.root.querySelector('.fg-sections');
            if (sections) sections.scrollTop = scroll;
        }
        renderQuests(panel, message, failure) {
            const tools = node('div', 'journal-quest-tools');
            for (const [value, title] of [['IN_PROGRESS', 'In progress'], ['COMPLETED', 'Completed'], ['all', 'All quests']]) {
                const filter = button(title, () => {this.questFilter = value; this.render();});
                filter.dataset.fgFocus = 'quest-filter-' + value;
                filter.setAttribute('aria-pressed', String(value === this.questFilter)); tools.append(filter);
            }
            panel.append(tools);
            if (message) {
                const notice = node('div', 'fg-notice', message); notice.setAttribute('role', failure ? 'alert' : 'status');
                if (failure) notice.append(button('Retry', () => this.load()));
                panel.append(notice);
            }
            const entries = (this.quests || []).filter(quest => this.questFilter === 'all' || quest.status === this.questFilter);
            const content = node('div', 'journal-quests');
            if (!entries.length) content.append(node('p', 'fg-empty', this.quests ? this.questFilter === 'COMPLETED' ? 'No completed quests yet.' : 'No quests here yet. Talk to the people you meet.' : 'Loading quests…'));
            const list = node('div', 'journal-quest-list'); list.setAttribute('aria-label', 'Quest log');
            const selected = entries.find(quest => quest.id === this.selectedQuest) || entries[0];
            for (const quest of entries) {
                const row = button('', () => {this.selectedQuest = quest.id; this.render();}, 'journal-quest');
                row.dataset.fgFocus = 'quest-' + quest.id; row.setAttribute('aria-pressed', String(quest === selected));
                row.append(node('strong', '', quest.name), node('span', '', quest.status === 'COMPLETED' ? '✓ Completed' : 'In progress'));
                if (Number.isFinite(quest.amount) && quest.amount > 0) row.append(node('small', '', (quest.status === 'COMPLETED' ? quest.amount : quest.progressCount || 0) + ' / ' + quest.amount));
                list.append(row);
            }
            content.append(list);
            if (selected) {
                const detail = node('aside', 'journal-quest-detail'); detail.setAttribute('aria-label', 'Quest details');
                detail.append(node('h2', '', selected.name), node('p', '', selected.status === 'COMPLETED' ? '✓ Completed' : 'In progress'));
                const description = String(selected.longDesc || selected.desc || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '');
                detail.append(node('p', 'journal-description', description));
                if (selected.level) detail.append(node('p', '', 'Level ' + selected.level));
                if (selected.objectives?.length) {
                    const objectives = node('ul', 'journal-objectives');
                    for (const objective of selected.objectives) objectives.append(node('li', '', (objective.done ? '✓ ' : '') + objective.label + ' · ' + objective.count + ' / ' + objective.amount));
                    detail.append(objectives);
                }
                content.append(detail);
            }
            panel.append(content);
        }
        section(category) {
            const [title, verb] = categories[category], section = node('section', 'fg-section'); section.setAttribute('aria-label', title);
            const required = this.data.entries.filter(entry => entry.category === category && !entry.bonus);
            section.append(node('h2', '', title), node('p', 'fg-category-progress', required.filter(entry => entry.state === 'completed').length + ' / ' + required.length + ' ' + verb));
            const entries = visible(this.data.entries, category, this.filter, this.query), slots = node('div', 'fg-slots');
            for (const entry of entries) {
                const slot = button('', () => {this.selected = this.selected === entry.id ? null : entry.id; this.render();}, 'fg-slot' + (this.selected === entry.id ? ' fg-selected' : ''));
                slot.dataset.fgFocus = entry.id; slot.setAttribute('aria-pressed', String(entry.id === this.selected));
                slot.setAttribute('aria-label', (entry.name || 'Undiscovered entry') + ' · ' + status(entry)); slot.title = (entry.name || 'Undiscovered') + ' · ' + status(entry);
                const style = entry.sprite && spriteStyle(entry.sprite);
                if (style) {const viewport = node('span', 'fg-sprite-viewport'), sprite = node('span', 'fg-sprite'); Object.assign(sprite.style, style); viewport.append(sprite); slot.append(viewport);}
                else slot.append(node('span', 'fg-unknown', '?'));
                if (entry.state !== 'unknown') slot.append(node('span', 'fg-badge ' + (entry.state === 'completed' ? 'fg-complete' : ''), entry.state === 'completed' ? '✓' : entry.bonus ? '✧' : '•'));
                slots.append(slot);
            }
            section.append(slots);
            if (!entries.length) section.append(node('p', 'fg-empty', required.length ? 'No matching entries.' : 'No entries published.'));
            const selected = entries.find(entry => entry.id === this.selected);
            if (selected) {
                const details = node('aside', 'fg-parchment'); details.setAttribute('aria-label', 'Entry details');
                details.append(node('h3', '', selected.name || 'Undiscovered'), node('p', '', status(selected)), node('p', 'fg-requirement', selected.state === 'completed' ? 'Entry complete' : remaining(selected)));
                if (selected.state !== 'unknown') details.append(node('p', '', selected.hint));
                if (selected.bonus) details.append(node('p', '', 'Bonus discovery · Outside standard completion.'));
                if (selected.state !== 'completed') {
                    const pin = button(this.pinned?.id === selected.id ? 'Unpin discovery' : this.pinned ? 'Replace pinned discovery' : 'Pin discovery', () => {this.pin(this.pinned?.id === selected.id ? null : selected); this.render();});
                    pin.dataset.fgFocus = 'pin-' + selected.id; details.append(pin);
                }
                section.append(details);
            }
            return section;
        }
        pin(entry) {
            this.pinned = entry ? {...entry, map: this.mapId} : null;
            this.reminder.replaceChildren(); this.reminder.hidden = !entry;
            if (entry) this.reminder.append(node('strong', '', 'Pinned discovery · ' + (mapNames[this.mapId] || this.mapId)), node('span', '', entry.name ? remaining(entry) + ' · ' + entry.name : entry.hint), button('Unpin', () => {this.pin(null); if (this.opened) this.render();}));
            this.reminder.onclick = event => event.stopPropagation();
        }
        destroy() {
            this.close(); clearInterval(this.timer); this.request++;
            document.removeEventListener('keydown', this.onKeyboard, true);
            this.root.remove(); this.reminder.remove();
        }
    }
    Journal.visible = visible; Journal.status = status; Journal.spriteStyle = spriteStyle;
    return Journal;
});

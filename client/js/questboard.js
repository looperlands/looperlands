define(['mapnames'], function (mapNames) {
    'use strict';
    const ACTIVE = ['accepted', 'ready'];
    const node = (tag, className, text) => {
        const value = document.createElement(tag);
        if (className) value.className = className;
        if (text !== undefined && text !== null) value.textContent = String(text);
        return value;
    };
    const button = (text, action, className = '') => {
        const value = node('button', className, text); value.type = 'button';
        value.addEventListener('click', action); return value;
    };
    const timestamp = value => typeof value === 'number' ? value : Date.parse(value);
    const boundsDistance = (bounds, x, y) => bounds ? Math.max(bounds.x - x, 0, x - bounds.x - (bounds.width || bounds.w || 1) + 1) + Math.max(bounds.y - y, 0, y - bounds.y - (bounds.height || bounds.h || 1) + 1) : Infinity;
    const humanize = value => String(value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
    const category = quest => quest.category || (quest.objectives?.some(objective => objective.eventType === 'DELIVER_ITEMS') ? 'requests' : 'challenges');
    const required = objective => Number(objective.amount || 1);
    function basketFor(quest) {
        const items = new Map();
        for (const objective of quest.objectives || []) if (objective.eventType === 'DELIVER_ITEMS') {
            for (const item of objective.items || []) {
                const previous = items.get(String(item.item));
                items.set(String(item.item), {...item, amount: Number(item.amount || item.quantity || 0) + (previous?.amount || 0)});
            }
        }
        return [...items.values()];
    }
    function readiness(occurrence, attempt, inventory, now) {
        const quest = occurrence.snapshot || {}, basket = basketFor(quest);
        const active = !!attempt && ACTIVE.includes(attempt.status);
        const actionsDone = (quest.objectives || []).filter(objective => objective.eventType !== 'DELIVER_ITEMS').every(objective => Number(attempt?.progress?.[objective.id] || 0) >= required(objective));
        const goodsReady = basket.every(item => Number(inventory?.[item.item] || 0) >= item.amount);
        const expired = Number.isFinite(timestamp(occurrence.endsAt)) && timestamp(occurrence.endsAt) <= now;
        return {basket, active, actionsDone, goodsReady, expired, canSettle: active && actionsDone && goodsReady && (!expired || (!basket.length && attempt.status === 'ready'))};
    }
    function objectiveLabel(objective) {
        if (objective.label) return objective.label;
        const target = objective.targetLabel || (Array.isArray(objective.target) ? objective.target.map(humanize).join(', ') : humanize(objective.target));
        const verb = {KILL_MOB: 'Defeat', LOOT_ITEM: 'Collect', NPC_TALKED: 'Talk to', AREA_ENTERED: 'Visit', FISHING: 'Catch'}[objective.eventType];
        if (verb) return verb + (target && target !== '*' ? ' ' + target : ' qualifying targets');
        if (objective.eventType === 'TILE_ACTION') return [humanize(objective.stage || objective.action || 'Complete tile actions'), target && target !== '*' ? target : null].filter(Boolean).join(' · ');
        return 'Complete this objective';
    }
    function itemName(item) {
        const label = item.itemLabel || item.label;
        if (!label || label === String(item.item) || /^[A-Z\d_]+$/.test(label)) return humanize(label || item.item);
        return label.charAt(0).toUpperCase() + label.slice(1);
    }
    function countdown(value, now) {
        const milliseconds = timestamp(value) - now;
        if (!Number.isFinite(milliseconds) || timestamp(value) >= 253402300000000) return 'No deadline';
        if (milliseconds <= 0) return 'Ended';
        const minutes = Math.ceil(milliseconds / 60000);
        return minutes >= 1440 ? Math.floor(minutes / 1440) + 'd ' + Math.floor(minutes % 1440 / 60) + 'h left' : minutes >= 60 ? Math.floor(minutes / 60) + 'h ' + minutes % 60 + 'm left' : minutes + 'm left';
    }
    function uuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, letter => {const value = Math.floor(Math.random() * 16); return (letter === 'x' ? value : (value & 3) | 8).toString(16);});
    }
    class QuestBoard {
        constructor(app) {
            this.app = app; this.discovery = {boards: [], handInLocations: []};
            this.data = {occurrences: [], attempts: [], inventory: {}, stories: []}; this.journal = {occurrences: [], attempts: [], inventory: {}};
            this.offset = 0; this.mapId = null; this.opened = false; this.mode = 'board'; this.tab = 'available'; this.filter = 'all';
            this.selected = null; this.pending = false; this.loading = false; this.disabled = false; this.lastPoll = 0; this.requests = new Map();
            this.root = node('div', 'quest-boards');
            this.dialog = node('section', 'qb-dialog'); this.dialog.hidden = true;
            this.dialog.setAttribute('role', 'dialog'); this.dialog.setAttribute('aria-modal', 'true'); this.dialog.setAttribute('aria-label', 'Quest board');
            this.hud = node('aside', 'qb-hud'); this.hud.hidden = true; this.hud.setAttribute('aria-label', 'Tracked quest');
            this.launcher = button('Quest journal', () => this.openJournal(), 'qb-launcher'); this.launcher.title = 'Quest journal [J]'; this.launcher.hidden = true;
            this.root.append(this.dialog, this.hud, this.launcher); document.body.append(this.root);
            for (const event of ['click', 'mousedown', 'touchstart', 'wheel']) this.root.addEventListener(event, event => event.stopPropagation());
            document.addEventListener('keydown', event => this.keyboard(event), true);
            this.timer = setInterval(() => this.tick(), 1000);
            document.getElementById('quest-board-journal')?.addEventListener('click', () => {this.app.hideWindows(); this.openJournal();});
        }
        base() { return '/session/' + encodeURIComponent(this.app.sessionId); }
        now() { return Date.now() + this.offset; }
        near(target, mapId = this.mapId) { const player = this.app.game.player; return mapId === this.app.game.mapId && !!player && [target?.bounds, ...(target?.placements || [])].some(bounds => boundsDistance(bounds, player.gridX, player.gridY) <= 1); }
        setTime(value) { const offset = timestamp(value) - Date.now(); if (Number.isFinite(offset)) this.offset = offset; }
        pinKey() {return 'looperlands.quest-pin.' + (this.data.nftId || this.journal.nftId || this.app.game.player?.nftId || this.app.sessionId);}
        readPin() {try {return localStorage.getItem(this.pinKey());} catch (error) {return this.pinned || null;}}
        setPin(id) {this.pinned = id; try {id ? localStorage.setItem(this.pinKey(), id) : localStorage.removeItem(this.pinKey());} catch (error) {} this.renderHud(); this.updateScenery(); if (this.opened) this.render();}
        tick() {
            const game = this.app.game;
            if (this.disabled || !game.started || !game.client?.connection?.connected || game.player?.isDead) {this.launcher.hidden = this.hud.hidden = true; if (this.opened) this.close(); return;}
            this.launcher.hidden = this.opened || !!this.app.eventBoard?.opened;
            this.positionHud();
            if (this.mapId !== game.mapId) {
                this.mapId = game.mapId; this.discovery = {boards: [], handInLocations: []}; this.discoveryLoaded = false; this.lastPoll = 0;
                if (this.opened && this.mode === 'board') this.close();
                this.updateScenery();
            }
            if (this.opened && this.mode === 'board' && !this.near(this.currentBoard)) this.close();
            if (!this.polling && Date.now() - this.lastPoll >= 10000) this.poll();
            this.renderHud(); this.updateTimers();
        }
        positionHud() {
            const bounds = this.app.game.renderer?.canvas?.getBoundingClientRect?.();
            if (!bounds || !bounds.width || !bounds.height) return;
            const left = Math.max(10, bounds.left + 12), top = Math.max(10, bounds.top + 12);
            this.launcher.style.left = left + 'px'; this.launcher.style.top = top + 'px';
            this.hud.style.left = left + 'px'; this.hud.style.top = (top + 46) + 'px';
            this.hud.style.maxHeight = Math.max(100, bounds.height - 82) + 'px';
        }
        async poll() {
            this.polling = true; this.lastPoll = Date.now(); const mapId = this.mapId;
            try {
                if (!this.discoveryLoaded) {
                    const result = await axios.get(this.base() + '/quest-boards');
                    if (this.disabled || mapId !== this.mapId) return;
                    this.discovery = result.data; this.discoveryLoaded = true; this.setTime(result.data.serverTime); this.updateScenery();
                }
                const result = await axios.get(this.base() + '/quest-board-journal');
                if (this.disabled || mapId !== this.mapId) return;
                this.journal = result.data; this.setTime(result.data.serverTime); this.journalStale = false;
                if (this.opened && this.mode !== 'board' && !this.pending) {this.data = this.journal; this.render();}
                this.renderHud(); this.updateScenery();
                if (this.opened && this.mode === 'board' && !this.pending) await this.load();
            } catch (error) {this.journalStale = true; this.renderHud();}
            finally {this.polling = false;}
        }
        updateScenery() {
            const game = this.app.game;
            if (!game.renderer?.registerExtension) return;
            if (!this.rendererRegistered) {game.renderer.registerExtension('quest-board-renderer-worker.js'); this.rendererRegistered = true;}
            const pinned = (this.journal.attempts || []).find(attempt => attempt.id === this.readPin() && ACTIVE.includes(attempt.status));
            const occurrence = pinned?.occurrence || this.journal.occurrences?.find(value => value.id === pinned?.occurrenceId);
            const recipient = occurrence?.snapshot?.recipient;
            let destination = occurrence?.mapId === game.mapId ? recipient?.bounds : null;
            if (!destination && occurrence?.mapId === game.mapId) destination = occurrence.snapshot?.objectives?.find(objective => objective.area)?.area;
            game.renderer.setExtensionData('quest-board', {boards: (this.discovery.boards || []).filter(board => board.enabled !== false), handInLocations: this.discovery.handInLocations || [], destination});
        }
        findAction(x, y, radius = 1) {
            const targets = [
                ...(this.discovery.boards || []).filter(board => board.enabled !== false).flatMap(board => [board.bounds, ...(board.placements || [])].map(bounds => ({...board, bounds, action: 'quest_board'}))),
                ...(this.discovery.handInLocations || []).filter(location => location.kind !== 'board').map(location => ({...location, action: 'quest_hand_in'})),
            ];
            const target = targets.filter(value => boundsDistance(value.bounds, x, y) <= radius).sort((a, b) => boundsDistance(a.bounds, x, y) - boundsDistance(b.bounds, x, y))[0];
            if (!target) return null;
            const gridX = Math.max(target.bounds.x, Math.min(x, target.bounds.x + (target.bounds.width || 1) - 1));
            const gridY = Math.max(target.bounds.y, Math.min(y, target.bounds.y + (target.bounds.height || 1) - 1));
            return {id: 'quest-' + target.action + '-' + target.id, targetId: target.id, action: target.action, label: target.label, gridX, gridY, x: gridX * 16, y: gridY * 16};
        }
        interact(action) { if (action.action === 'quest_board') return this.open(action.targetId); return this.openRecipient(action.targetId); }
        clickAt(position) {
            if (position.keyboard) return false;
            const action = this.findAction(position.x, position.y, 0);
            if (!action) return false;
            const target = [...(this.discovery.boards || []), ...(this.discovery.handInLocations || [])].find(value => value.id === action.targetId);
            if (this.near(target)) this.interact(action);
            else {this.app.game.makePlayerGoTo(position.x, position.y); this.app.game.showNotification('Approach ' + (target.label || 'the quest board') + ' and press E.');}
            return true;
        }
        async open(boardId) {
            const board = (this.discovery.boards || []).find(value => value.id === boardId) || (this.discovery.boards || []).find(value => this.near(value));
            if (!board || !this.near(board)) return;
            this.currentBoard = board; this.mode = 'board'; this.tab = 'available'; this.recipientId = null; this.show(); await this.load();
        }
        async openJournal() { this.mode = 'journal'; this.tab = 'mine'; this.currentBoard = null; this.recipientId = null; this.show(); await this.load(); }
        async openRecipient(id) {
            const location = this.discovery.handInLocations?.find(value => value.id === id);
            if (!location || !this.near(location)) return;
            this.mode = 'recipient'; this.tab = 'mine'; this.currentBoard = location; this.recipientId = id; this.show(); await this.load();
        }
        show() {
            this.opener = document.activeElement; this.opened = true; this.selected = null; this.filter = 'all'; this.error = this.notice = this.confirming = null;
            this.app.eventBoard?.close(); this.app.hideChat(); this.app.game.keyboardHandler?.handleBlur(); this.app.game.player?.stop();
            this.dialog.hidden = false; this.hud.hidden = this.launcher.hidden = true; this.root.classList.add('qb-open'); this.loading = true; this.render();
            this.dialog.querySelector('[data-focus="close"]')?.focus();
        }
        close() {this.opened = false; this.dialog.hidden = true; this.root.classList.remove('qb-open'); this.confirming = null; this.opener?.focus?.(); this.renderHud();}
        async load() {
            const mode = this.mode, boardId = this.currentBoard?.id;
            try {
                const result = await axios.get(this.base() + (mode === 'board' ? '/quest-boards/' + encodeURIComponent(boardId) : '/quest-board-journal'));
                if (!this.opened || this.mode !== mode || this.currentBoard?.id !== boardId) return;
                this.data = result.data; this.setTime(result.data.serverTime); this.error = null;
                if (mode !== 'board') {this.journal = result.data; this.journalStale = false;}
            } catch (error) {if (this.opened) this.error = error.response?.data?.error || 'The board could not be refreshed. Please try again.';}
            finally {if (this.opened && this.mode === mode) {this.loading = false; this.render();}}
        }
        keyboard(event) {
            if (!this.opened) {
                const input = event.target?.closest?.('input,textarea,select,[contenteditable="true"],#global');
                if (event.key?.toLowerCase() === 'j' && !event.repeat && !input && !event.ctrlKey && !event.metaKey && !event.altKey && this.app.game.started && !this.app.game.player?.isDead && !this.app.game.keyboardHandler?.hasOpenPanel()) {
                    event.preventDefault(); event.stopImmediatePropagation(); this.openJournal();
                }
                return;
            }
            if (event.key === 'Escape') {event.preventDefault(); this.confirming ? (this.confirming = null, this.render()) : this.close();}
            if (event.key === 'Tab') {
                const controls = [...this.dialog.querySelectorAll('button,a,input,select,[tabindex="0"]')].filter(control => !control.disabled && !control.hidden);
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && (document.activeElement === first || !this.dialog.contains(document.activeElement))) {event.preventDefault(); last?.focus();}
                else if (!event.shiftKey && (document.activeElement === last || !this.dialog.contains(document.activeElement))) {event.preventDefault(); first?.focus();}
            }
            event.stopImmediatePropagation();
        }
        rows() {
            const attempts = this.data.attempts || [];
            const occurrenceMap = new Map((this.data.occurrences || []).map(value => [value.id, value]));
            for (const attempt of attempts) if (attempt.occurrence) occurrenceMap.set(attempt.occurrence.id, attempt.occurrence);
            const rows = [...occurrenceMap.values()].map(occurrence => ({...occurrence, attempt: attempts.find(attempt => attempt.occurrenceId === occurrence.id), quest: occurrence.snapshot || {}}));
            let visible = rows.filter(row => this.tab === 'mine' ? !!row.attempt : this.tab === 'schedule' ? row.enabled !== false && timestamp(row.opensAt) > this.now() : row.enabled !== false && timestamp(row.opensAt) <= this.now() && timestamp(row.acceptUntil) > this.now() && (!row.attempt || row.attempt.status === 'withdrawn'));
            if (this.recipientId) visible = visible.filter(row => row.quest.recipient?.id === this.recipientId && row.mapId === this.mapId);
            if (this.tab === 'available') visible.push(...(this.data.stories || []).map(story => ({id: 'story-' + story.id, story, quest: {...story, category: 'adventures'}})));
            if (this.mode === 'board' && Array.isArray(this.currentBoard?.categories)) visible = visible.filter(row => this.currentBoard.categories.includes(category(row.quest)));
            if (this.filter !== 'all') visible = visible.filter(row => category(row.quest) === this.filter);
            return visible.sort((a, b) => (this.tab === 'schedule' ? timestamp(a.opensAt) - timestamp(b.opensAt) : 0) || (a.quest.name || '').localeCompare(b.quest.name || ''));
        }
        status(row) {
            if (row.story) return humanize(row.story.status || 'Adventure');
            if (row.lockedReason && !row.attempt) return 'Locked';
            const state = readiness(row, row.attempt, this.data.inventory, this.now());
            if (row.attempt?.status === 'completed') return 'Completed';
            if (row.attempt?.status === 'withdrawn') return state.expired ? 'Ended' : 'Withdrawn';
            if (state.canSettle) return state.basket.length ? 'Ready to hand in' : 'Reward ready';
            if (state.expired || row.attempt?.status === 'expired') return 'Expired';
            if (row.attempt) return 'In progress';
            return timestamp(row.opensAt) > this.now() ? 'Upcoming' : 'Available';
        }
        date(value) { const time = timestamp(value); return Number.isFinite(time) && time < 253402300000000 ? new Date(time).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'No deadline'; }
        label(key, fallback) {return this.currentBoard?.labels?.[key] || fallback;}
        render() {
            if (!this.opened) return;
            const focus = this.dialog.contains(document.activeElement) ? document.activeElement.dataset.focus : null;
            const scroll = this.dialog.querySelector('.qb-content')?.scrollTop || 0;
            this.dialog.replaceChildren();
            const header = node('header', 'qb-header'), titles = node('div', 'qb-heading');
            const art = node('img', 'qb-header-art'); art.src = 'img/common/quest-board.png'; art.alt = ''; art.draggable = false;
            titles.append(node('span', 'qb-eyebrow', this.mode === 'journal' ? 'YOUR ADVENTURE CONTINUES' : mapNames[this.mapId] || humanize(this.mapId)), node('h2', '', this.mode === 'journal' ? 'Quest journal' : this.currentBoard?.label || 'Quest board'), node('p', '', this.mode === 'journal' ? 'Your accepted work, wherever the road takes you.' : this.currentBoard?.description || 'A little help. A new adventure. Something worth doing.'));
            const close = button('×', () => this.close(), 'qb-close'); close.dataset.focus = 'close'; close.setAttribute('aria-label', 'Close quest board'); header.append(art, titles, close); this.dialog.append(header);
            const tabs = node('nav', 'qb-tabs'); tabs.setAttribute('aria-label', 'Quest views');
            const views = this.mode === 'board' ? [['available', this.label('available', 'Available')], ['mine', this.label('myQuests', 'My quests')], ...(this.currentBoard?.showSchedule === false ? [] : [['schedule', this.label('schedule', 'Schedule')]])] : [['mine', this.recipientId ? 'Hand in requests' : 'My quests']];
            for (const [id, label] of views) {const control = button(label, () => {this.tab = id; this.selected = this.confirming = null; this.render();}, this.tab === id ? 'qb-selected' : ''); control.dataset.focus = 'tab-' + id; control.setAttribute('aria-current', this.tab === id ? 'page' : 'false'); tabs.append(control);}
            if (this.mode === 'board') {const journal = button('Open journal ↗', () => this.openJournal(), 'qb-journal-link'); journal.dataset.focus = 'journal'; tabs.append(journal);}
            this.dialog.append(tabs);
            if (this.loading) {this.dialog.append(node('div', 'qb-empty', 'Gathering the latest notices…')); return;}
            if (this.error) {const alert = node('div', 'qb-alert'); alert.setAttribute('role', 'alert'); alert.append(node('span', '', this.error), button('Retry', () => this.load())); this.dialog.append(alert);}
            const rows = this.rows();
            const row = rows.find(value => value.id === this.selected) || rows.find(value => ACTIVE.includes(value.attempt?.status)) || rows[0]; this.selected = row?.id || null;
            const body = node('div', 'qb-body'), sidebar = node('aside', 'qb-sidebar');
            const summary = node('div', 'qb-list-heading'); summary.append(node('span', 'qb-eyebrow', this.tab === 'schedule' ? 'COMING UP' : this.tab === 'mine' ? 'YOUR NOTICES' : 'FIND YOUR NEXT TASK'), node('span', 'qb-count', rows.length)); sidebar.append(summary);
            if (this.mode === 'board') {
                const filter = node('select', 'qb-filter'); filter.setAttribute('aria-label', 'Filter quest category'); filter.dataset.focus = 'filter';
                for (const [value, label] of [['all', 'All notices'], ['adventures', this.label('adventures', 'Adventures')], ['challenges', this.label('challenges', 'Challenges')], ['requests', this.label('requests', 'Requests')]]) {if (value !== 'all' && Array.isArray(this.currentBoard?.categories) && !this.currentBoard.categories.includes(value)) continue; const option = node('option', '', label); option.value = value; option.selected = this.filter === value; filter.append(option);}
                filter.addEventListener('change', () => {this.filter = filter.value; this.selected = this.confirming = null; this.render();}); sidebar.append(filter);
            }
            const list = node('div', 'qb-list'); list.setAttribute('aria-label', 'Quest notices');
            let day = null;
            for (const value of rows) {
                if (this.tab === 'schedule') {const nextDay = new Date(timestamp(value.opensAt)).toLocaleDateString([], {weekday: 'long', month: 'short', day: 'numeric'}); if (day !== nextDay) {day = nextDay; list.append(node('h3', 'qb-day', day));}}
                const card = button('', () => {this.selected = value.id; this.confirming = null; this.render();}, 'qb-card' + (row?.id === value.id ? ' qb-selected' : '')); card.dataset.focus = 'notice-' + value.id; card.setAttribute('aria-pressed', String(row?.id === value.id));
                card.append(node('span', 'qb-card-category', this.label(category(value.quest), humanize(category(value.quest)))), node('strong', '', value.quest.name || 'Quest'));
                const detail = node('span', 'qb-card-meta'); detail.append(node('span', '', this.status(value)), node('span', 'qb-gold', value.quest.rewards?.xp ? value.quest.rewards.xp + ' XP' : 'View rewards')); card.append(detail);
                if (!value.story) {const timer = node('small', 'qb-card-time', this.tab === 'schedule' ? 'Opens ' + this.date(value.opensAt) : countdown(value.endsAt, this.now())); if (this.tab !== 'schedule') timer.dataset.deadline = value.endsAt; card.append(timer);}
                list.append(card);
            }
            if (!rows.length) list.append(node('p', 'qb-muted qb-list-empty', this.tab === 'schedule' ? 'No upcoming notices.' : this.tab === 'mine' ? 'No quests here yet.' : 'No notices match this view.'));
            sidebar.append(list); body.append(sidebar);
            if (row) body.append(this.renderDetails(row));
            else {const empty = node('section', 'qb-empty'); const image = node('img'); image.src = 'img/common/quest-board.png'; image.alt = ''; empty.append(image, node('h3', '', this.tab === 'mine' ? 'Your next chapter awaits' : 'A quiet moment at the board'), node('p', '', this.tab === 'mine' ? 'Accept a notice at a local quest board. Your progress will travel with you.' : this.tab === 'schedule' ? 'New work will appear here when the map maker publishes it.' : 'Try another category or return for the next round of notices.')); body.append(empty);}
            this.dialog.append(body);
            const content = this.dialog.querySelector('.qb-content'); if (content) content.scrollTop = scroll;
            if (focus) [...this.dialog.querySelectorAll('[data-focus]')].find(control => control.dataset.focus === focus)?.focus();
        }
        renderDetails(row) {
            const quest = row.quest, attempt = row.attempt, state = readiness(row, attempt, this.data.inventory, this.now());
            // A refresh can confirm a committed action after its response was lost.
            if (this.confirming === row.id && (!attempt || !ACTIVE.includes(attempt.status))) this.confirming = null;
            const detail = node('section', 'qb-detail'), content = node('div', 'qb-content');
            const top = node('div', 'qb-detail-top'); top.append(node('span', 'qb-tag', this.label(category(quest), humanize(category(quest)))), node('span', 'qb-status' + (state.canSettle ? ' qb-ready' : ''), this.status(row))); content.append(top, node('h3', 'qb-title', quest.name || 'Quest'));
            const description = quest.description || quest.longText || quest.startText;
            if (description) content.append(node('p', 'qb-description', Array.isArray(description) ? description.join('\n') : description));
            const facts = node('div', 'qb-facts');
            const place = quest.recipient?.label || mapNames[row.mapId] || humanize(row.mapId || this.mapId);
            const destination = node('div'); destination.append(node('small', '', quest.recipient ? 'HAND-IN LOCATION' : 'WHERE IT COUNTS'), node('strong', '', place)); facts.append(destination);
            if (!row.story) {const timing = node('div'); timing.append(node('small', '', this.tab === 'schedule' ? 'OPENS' : 'DEADLINE'), node('strong', '', this.date(this.tab === 'schedule' ? row.opensAt : row.endsAt))); const timer = node('span', 'qb-muted', countdown(row.endsAt, this.now())); timer.dataset.deadline = row.endsAt; timing.append(timer); facts.append(timing);}
            content.append(facts);
            content.append(node('h4', '', state.basket.length ? 'What’s needed' : 'Your objectives'));
            if (state.basket.length) {
                content.append(node('p', 'qb-muted', 'Items can come from anywhere: your inventory, trading, loot, or any activity.'));
                const basket = node('div', 'qb-basket');
                for (const item of state.basket) {
                    const owned = Number(this.data.inventory?.[item.item] || 0), complete = owned >= item.amount;
                    const line = node('div', 'qb-item' + (complete ? ' qb-item-ready' : '')); line.append(this.itemIcon(item), node('strong', '', itemName(item)));
                    const quantity = node('span', 'qb-item-count'); quantity.append(node('strong', '', item.amount + ' needed'), node('small', '', owned + ' in inventory')); line.append(quantity, node('span', 'qb-item-check', complete ? '✓' : '–')); basket.append(line);
                }
                content.append(basket);
            }
            for (const objective of quest.objectives || []) {
                if (objective.eventType === 'DELIVER_ITEMS') continue;
                const current = Math.min(required(objective), Number(attempt?.progress?.[objective.id] || 0));
                const line = node('div', 'qb-objective'), text = node('div'); text.append(node('strong', '', objectiveLabel(objective)), node('span', '', current + ' / ' + required(objective)));
                line.append(text); const meter = node('progress'); meter.max = required(objective); meter.value = current; meter.setAttribute('aria-label', objectiveLabel(objective)); line.append(meter);
                if (objective.area) line.append(node('small', 'qb-muted', 'Only actions in the marked area count.'));
                content.append(line);
            }
            if ((quest.objectives || []).some(objective => objective.eventType !== 'DELIVER_ITEMS')) content.append(node('p', 'qb-muted', 'Your own activity counts after acceptance.' + (quest.ordered ? ' Complete these objectives in order.' : '')));
            if (row.story && !quest.objectives?.length) content.append(node('p', 'qb-muted', 'Follow the adventure in your story quest journal.'));
            content.append(node('h4', '', 'Your reward'));
            const rewards = node('div', 'qb-rewards');
            if (quest.rewards?.xp || quest.xpReward) {const xp = node('div', 'qb-reward'); xp.append(node('span', 'qb-xp-icon', 'XP'), node('strong', '', (quest.rewards?.xp || quest.xpReward) + ' experience')); rewards.append(xp);}
            for (const item of quest.rewards?.items || []) {const reward = node('div', 'qb-reward'); reward.append(this.itemIcon(item), node('strong', '', (item.amount || item.quantity || 1) + ' × ' + itemName(item))); rewards.append(reward);}
            if (!rewards.children.length) rewards.append(node('p', 'qb-muted', row.story ? 'See the adventure for its rewards.' : 'No item or XP reward.'));
            content.append(rewards);
            if (attempt?.status === 'completed') {const complete = node('div', 'qb-success', 'Completed. Your reward has been recorded.'); complete.setAttribute('role', 'status'); content.append(complete);}
            if (attempt && ACTIVE.includes(attempt.status)) content.append(node('p', 'qb-muted', 'Progress and rewards belong to the Looper that accepted this quest.'));
            if (this.confirming === row.id) {
                const confirmation = node('div', 'qb-confirm'); confirmation.setAttribute('role', 'group'); confirmation.setAttribute('aria-label', this.confirmAction === 'withdraw' ? 'Confirm withdrawal' : 'Confirm complete hand-in');
                confirmation.append(node('h4', '', this.confirmAction === 'withdraw' ? 'Withdraw from this quest?' : 'Hand in the complete request?'));
                confirmation.append(node('p', '', this.confirmAction === 'withdraw' ? (quest.policy?.withdrawal?.retainProgress === false ? 'Your progress will be reset. Your inventory stays yours.' : 'Your inventory stays yours. Progress is kept if you accept this occurrence again.') : 'This removes ' + state.basket.map(item => item.amount + ' × ' + itemName(item)).join(' and ') + ' from your inventory and awards the reward shown above.'));
                content.append(confirmation);
            }
            detail.append(content);
            const footer = node('footer', 'qb-footer');
            const message = node('span', 'qb-footer-note', this.notice || this.actionHint(row, state)); message.setAttribute('role', 'status'); footer.append(message);
            const actions = node('div', 'qb-actions');
            if (this.confirming === row.id) {
                const back = button('Go back', () => {this.confirming = null; this.render();}); back.disabled = this.pending; actions.append(back);
                const submit = button(this.pending ? 'Saving…' : this.confirmAction === 'withdraw' ? 'Confirm withdrawal' : 'Confirm hand-in', () => this.mutate(this.confirmAction, row), 'qb-primary'); submit.dataset.focus = 'confirm'; submit.disabled = this.pending || attempt?.isCurrentLooper === false || (this.confirmAction === 'settle' && (!state.canSettle || !this.near(quest.recipient, row.mapId))); actions.append(submit);
            } else if (row.story) {
                const accept = button(this.pending ? 'Starting…' : 'Start adventure', () => this.mutate('story', row), 'qb-primary'); accept.disabled = this.pending || !row.story.canAccept; accept.dataset.focus = 'primary'; actions.append(accept);
            } else if (attempt && ACTIVE.includes(attempt.status)) {
                const pin = button(this.readPin() === attempt.id ? 'Unpin' : 'Pin quest', () => this.setPin(this.readPin() === attempt.id ? null : attempt.id)); pin.dataset.focus = 'pin'; actions.append(pin);
                if (quest.policy?.withdrawal?.allowed !== false) {const withdraw = button('Withdraw', () => {this.confirming = row.id; this.confirmAction = 'withdraw'; this.render(); this.dialog.querySelector('[data-focus="confirm"]')?.focus();}, 'qb-subtle'); withdraw.dataset.focus = 'withdraw'; withdraw.disabled = this.pending || attempt.isCurrentLooper === false; actions.append(withdraw);}
                const claim = button(this.pending ? 'Saving…' : state.basket.length ? 'Hand in items' : 'Claim reward', () => {if (state.basket.length) {this.confirming = row.id; this.confirmAction = 'settle'; this.render(); this.dialog.querySelector('[data-focus="confirm"]')?.focus();} else this.mutate('settle', row);}, 'qb-primary'); claim.dataset.focus = 'primary'; claim.disabled = this.pending || attempt.isCurrentLooper === false || !state.canSettle || (!!state.basket.length && !this.near(quest.recipient, row.mapId)); actions.append(claim);
            } else if (!attempt || attempt.status === 'withdrawn') {
                const upcoming = timestamp(row.opensAt) > this.now();
                const accept = button(this.pending ? 'Saving…' : upcoming ? 'Not open yet' : attempt ? 'Accept again' : 'Accept quest', () => this.mutate('accept', row), 'qb-primary'); accept.dataset.focus = 'primary'; accept.disabled = this.pending || row.enabled === false || !!row.lockedReason || upcoming || state.expired || timestamp(row.acceptUntil) <= this.now() || this.mode !== 'board' || !this.near(this.currentBoard) || (attempt?.status === 'withdrawn' && quest.policy?.withdrawal?.allowReaccept === false); actions.append(accept);
            }
            footer.append(actions); detail.append(footer); return detail;
        }
        itemIcon(item) {
            const frame = node('span', 'qb-item-icon'), image = node('img');
            const id = String(item.item || ''); const name = /^\d+$/.test(id) && typeof Types !== 'undefined' ? Types.getKindAsString(Number(id)) : id;
            if (/^[a-zA-Z0-9_-]+$/.test(name || '')) {image.src = 'img/1/' + (/^[a-zA-Z0-9_-]+$/.test(item.image || '') ? item.image : 'item-' + name) + '.png'; image.alt = ''; image.draggable = false; image.addEventListener('error', () => {if (!image.dataset.fallback) {image.dataset.fallback = 'true'; image.src = 'img/1/' + name + '.png';} else {image.hidden = true; frame.textContent = '·';}}); frame.append(image);}
            return frame;
        }
        actionHint(row, state) {
            if (row.attempt?.isCurrentLooper === false) return 'Switch to the Looper that accepted this quest to continue.';
            if (row.lockedReason && !row.attempt) return row.lockedReason;
            if (row.story) return row.story.lockedReason || 'An adventure from this map’s story collection.';
            if (row.attempt?.status === 'completed') return 'Reward received. Thank you for lending a hand.';
            if (state.canSettle && state.basket.length) return this.near(row.quest.recipient, row.mapId) ? 'Everything is ready. Hand in the full basket together.' : 'Bring the complete basket to ' + (row.quest.recipient?.label || 'the hand-in location') + '.';
            if (state.canSettle) return 'Your hard work has paid off. Your reward is ready.';
            if (state.expired) return 'This occurrence has ended. Your goods remain in your inventory.';
            if (timestamp(row.opensAt) > this.now()) return 'Preview the requirements now and return when this notice opens.';
            if (row.attempt && ACTIVE.includes(row.attempt.status)) return state.actionsDone && !state.goodsReady ? 'Gather the missing goods before handing in.' : 'Pin this quest to follow your progress while you play.';
            if (this.mode !== 'board') return 'Visit this quest’s board to accept it again.';
            if (timestamp(row.acceptUntil) >= 253402300000000) return 'Accept this quest to start tracking your progress.';
            return 'Accept before ' + this.date(row.acceptUntil) + '. The deadline stays the same.';
        }
        async mutate(action, row) {
            if (this.pending || row.attempt?.isCurrentLooper === false) return;
            const key = action + ':' + (row.attempt?.id || row.id);
            if (!this.requests.has(key)) this.requests.set(key, uuid());
            const requestId = this.requests.get(key);
            const board = this.currentBoard;
            const path = action === 'accept' || action === 'story' ? '/quest-boards/' + encodeURIComponent(board?.id) + '/' + action : '/quest-board-attempts/' + encodeURIComponent(row.attempt.id) + '/' + action;
            const payload = {requestId, confirmed: true};
            if (action === 'accept') payload.occurrenceId = row.id;
            if (action === 'story') payload.questId = row.story.id;
            if (action === 'settle' && row.quest.recipient) payload.recipientId = row.quest.recipient.id;
            this.pending = true; this.notice = null; this.error = null; this.render();
            try {
                const result = await axios.post(this.base() + path, payload);
                this.requests.delete(key); this.confirming = null;
                this.notice = action === 'accept' ? 'Quest accepted. Your adventure starts here.' : action === 'withdraw' ? 'Quest withdrawn.' : action === 'story' ? 'Adventure started. Find it in your story journal.' : 'Quest completed. Your reward is yours!';
                if (action === 'accept') {this.tab = 'mine'; if (!this.readPin() && result.data.attempt?.id) this.setPin(result.data.attempt.id); this.selected = result.data.attempt?.occurrenceId || row.id;}
                if (action === 'settle' || action === 'withdraw') {if (this.readPin() === row.attempt.id) this.setPin(null);}
                if (action === 'settle') this.app.initResourcesDisplay?.();
                await this.load();
                if (action === 'accept') this.selected = result.data.attempt?.occurrenceId || row.id;
                this.lastPoll = 0;
            } catch (error) {
                // An ambiguous network failure retains the request identity so a
                // retry cannot consume inventory or pay the reward twice.
                if (error.response && error.response.status < 500) this.requests.delete(key);
                this.error = error.response?.data?.error || 'The result could not be confirmed. Retry the same action safely.';
            } finally {this.pending = false; if (this.opened) this.render();}
        }
        updateTimers() {for (const timer of this.dialog.querySelectorAll('[data-deadline]')) timer.textContent = countdown(Number(timer.dataset.deadline) || timer.dataset.deadline, this.now());}
        renderHud() {
            this.hud.hidden = true;
            if (this.disabled || this.opened || this.app.eventBoard?.opened || !this.app.game.started || this.app.game.player?.isDead) return;
            const attempt = (this.journal.attempts || []).find(value => value.id === this.readPin() && ACTIVE.includes(value.status));
            if (!attempt) return;
            const occurrence = attempt.occurrence || this.journal.occurrences?.find(value => value.id === attempt.occurrenceId); if (!occurrence) return;
            const quest = occurrence.snapshot, state = readiness(occurrence, attempt, this.journal.inventory, this.now());
            const signature = JSON.stringify([attempt, state.goodsReady, this.journalStale, countdown(occurrence.endsAt, this.now()), this.journal.inventory]);
            this.hud.hidden = false; if (this.hudSignature === signature) return; this.hudSignature = signature; this.hud.replaceChildren();
            const heading = node('div', 'qb-hud-heading'); const unpin = button('×', () => this.setPin(null), 'qb-hud-unpin'); unpin.setAttribute('aria-label', 'Unpin quest'); heading.append(node('span', 'qb-eyebrow', 'PINNED QUEST'), unpin); this.hud.append(heading);
            this.hud.append(button(quest.name, () => {this.openJournal().then(() => {this.selected = occurrence.id; this.render();});}, 'qb-hud-title'));
            const objective = quest.objectives?.find(value => value.eventType !== 'DELIVER_ITEMS' && Number(attempt.progress?.[value.id] || 0) < required(value));
            const progress = objective ? objectiveLabel(objective) + ' · ' + (attempt.progress?.[objective.id] || 0) + '/' + required(objective) : state.canSettle ? state.basket.length ? 'Ready to hand in' : 'Reward ready to claim' : 'Gather the requested items';
            this.hud.append(node('p', '', this.journalStale ? 'Progress unavailable · reconnecting…' : progress));
            if (state.basket.length) {const basket = node('details', 'qb-hud-basket'); basket.append(node('summary', '', state.basket.length + ' requested item' + (state.basket.length === 1 ? '' : 's'))); for (const item of state.basket) basket.append(node('p', '', itemName(item) + ' · ' + (this.journal.inventory?.[item.item] || 0) + '/' + item.amount)); this.hud.append(basket);}
            if (quest.recipient) this.hud.append(node('small', '', '↗ ' + quest.recipient.label + ' · ' + (mapNames[occurrence.mapId] || humanize(occurrence.mapId))));
            this.hud.append(node('small', 'qb-gold', countdown(occurrence.endsAt, this.now())));
        }
        disconnect() {this.disabled = true; clearInterval(this.timer); this.close(); this.hud.hidden = this.launcher.hidden = true; this.app.game.renderer?.setExtensionData?.('quest-board', null);}
    }
    Object.assign(QuestBoard, {boundsDistance, basketFor, readiness, objectiveLabel, countdown});
    return QuestBoard;
});

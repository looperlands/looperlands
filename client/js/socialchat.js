define(['jquery', 'mapnames'], function ($, mapNames) {
    const key = wallet => String(wallet || '').toLowerCase();
    const element = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };
    const plainMessage = message => {
        // Server-sanitized markup becomes text; no message HTML enters the live DOM.
        const template = document.createElement('template');
        template.innerHTML = message;
        return template.content.textContent;
    };

    class SocialChat {
        constructor(app) {
            this.app = app;
            this.panel = document.getElementById('chatbox');
            this.tab = 'world';
            this.target = '';
            this.scope = 'all';
            this.players = [];
            this.people = new Map();
            this.histories = new Map();
            this.drafts = new Map();
            this.attachments = new Map();
            this.giftRetries = new Map();
            this.transferableItems = [];
            this.unread = new Map();
            this.pending = new Map();
            this.avatarSources = new Map();
            this.connected = false;
            this.showPeople = window.innerWidth > 780;
            this.hudMode = 'hidden';
            this.overlayMessages = [];
            try {
                this.hudMode = localStorage.getItem('chat-hud-mode') === 'compact' ? 'compact' : 'hidden';
            } catch (_) { /* Storage is optional. */ }
            this.bind();
            this.renderHud();
            this.render();
        }

        node(id) { return document.getElementById(id); }
        channelKey() { return this.tab === 'direct' ? 'direct:' + this.target : this.tab; }
        isOpen() { return this.panel.classList.contains('active'); }
        isReading(channel) { return this.isOpen() && !document.hidden && channel === this.channelKey(); }

        bind() {
            this.panel.querySelectorAll('[data-chat-tab]').forEach(button => button.addEventListener('click', () => {
                this.saveDraft(); this.tab = button.dataset.chatTab; this.target = ''; this.clearError(); this.render();
            }));
            this.panel.querySelectorAll('[data-chat-scope]').forEach(button => button.addEventListener('click', () => {
                this.scope = button.dataset.chatScope; this.renderRoster();
            }));
            this.node('chat-player-search').addEventListener('input', () => this.renderRoster());
            this.node('chat-players-toggle').addEventListener('click', () => { this.showPeople = !this.showPeople; this.renderPeopleVisibility(); });
            this.node('chat-players-close').addEventListener('click', () => { this.showPeople = false; this.renderPeopleVisibility(); this.node('chat-players-toggle').focus(); });
            this.node('chat-minimize').addEventListener('click', () => { this.setHudMode('hidden'); this.app.hideChat(); });
            this.node('chat-overlay').addEventListener('click', () => { this.setHudMode('compact'); this.app.hideChat(); });
            // Keep overlay controls from reaching the map's click-to-move handler.
            ['click', 'touchstart', 'keydown'].forEach(type => this.node('chat-mini').addEventListener(type, event => event.stopPropagation()));
            this.node('chat-mini-hide').addEventListener('click', () => this.setHudMode('hidden'));
            this.node('chat-mini-open').addEventListener('click', event => this.openFromOverlay(event));
            this.node('chat-expand').addEventListener('click', () => {
                const expanded = this.panel.classList.toggle('sc-expanded');
                this.node('chat-expand').setAttribute('aria-label', expanded ? 'Compact chat' : 'Expand chat');
                this.node('chat-expand').title = expanded ? 'Compact chat' : 'Expand chat';
            });
            this.node('chatinput').addEventListener('input', () => { this.saveDraft(); this.renderComposerState(); });
            this.node('chat-form').addEventListener('submit', event => { event.preventDefault(); this.send(); });
            this.node('chat-attach').addEventListener('click', () => this.giftPicker());
            document.addEventListener('visibilitychange', () => { this.markRead(); this.renderBadges(); });
        }

        saveDraft() { this.drafts.set(this.channelKey(), this.node('chatinput').value); }
        open() { this.renderHud(); this.markRead(); this.renderBadges(); if (this.connected) this.app.game.client.syncChat(); }
        close() { this.saveDraft(); this.closeProfile(); this.renderHud(); }

        openFromOverlay(event) {
            event.preventDefault();
            event.stopPropagation();
            this.saveDraft();
            this.tab = 'world'; this.target = '';
            this.render(); this.app.showChat();
        }

        recordOverlayMessage(message) {
            if (message.channel === 'direct' || this.overlayMessages.some(item => item.id === message.id)) return;
            this.overlayMessages = [...this.overlayMessages, message].slice(-6);
        }

        setHudMode(mode) {
            this.hudMode = mode;
            try { localStorage.setItem('chat-hud-mode', mode); } catch (_) {}
            this.renderHud();
        }

        renderHud() {
            const mini = this.node('chat-mini');
            mini.hidden = this.isOpen() || this.hudMode === 'hidden' || !this.connected;
            const list = this.node('chat-mini-messages');
            const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 35;
            const scrollTop = list.scrollTop;
            list.replaceChildren();
            this.overlayMessages.forEach(message => {
                const row = element('p');
                row.append(element('strong', '', message.sender.label + ': '), element('span', '', plainMessage(message.message || '')));
                list.append(row);
            });
            list.scrollTop = atBottom ? list.scrollHeight : scrollTop;
        }
        markRead() { if (this.isReading(this.channelKey()) && this.target) this.unread.delete(this.target); }

        disconnect() {
            this.connected = false;
            this.renderHud();
            this.players = [];
            for (const request of this.pending.values()) clearTimeout(request.timer);
            this.pending.clear();
            this.error('Chat disconnected. Your draft has been kept.');
            this.renderRoster(); this.renderComposerState();
        }

        receive(type, data) {
            if (type === Types.Messages.CHAT_STATE) {
                this.connected = true; this.me = data.me;
                this.setRoster(data.players);
                this.histories.set('world', data.world);
                this.histories.set('map', data.map);
                // Replace private history on sync; never combine histories from a different wallet.
                for (const id of this.histories.keys()) if (id.startsWith('direct:')) this.histories.delete(id);
                data.direct.forEach(message => this.storeMessage(message));
                this.clearError(); this.render();
            } else if (type === Types.Messages.CHAT_PLAYERS) {
                this.setRoster(data); this.renderRoster(); this.renderHeader(); this.renderComposerState();
            } else if (type === Types.Messages.CHAT_MESSAGE) {
                const channel = this.storeMessage(data);
                this.recordOverlayMessage(data);
                const retry = [...this.giftRetries.entries()].find(([channel, request]) => request.requestId === data.requestId);
                if (data.requestId && (this.pending.has(data.requestId) || retry)) {
                    const request = this.pending.get(data.requestId) || {...retry[1], channel: retry[0]};
                    clearTimeout(request.timer); this.pending.delete(data.requestId);
                    this.giftRetries.delete(request.channel);
                    if (request.attachment) this.attachments.delete(request.channel);
                    if (this.drafts.get(request.channel) === request.text) this.drafts.set(request.channel, '');
                    if (request.channel === this.channelKey()) this.node('chatinput').value = this.drafts.get(request.channel) || '';
                }
                if (data.channel === 'direct' && key(data.sender.id) !== key(this.me.id) && !this.isReading(channel)) {
                    const other = key(data.sender.id); this.unread.set(other, (this.unread.get(other) || 0) + 1);
                    this.app.game.audioManager?.playSound('chat');
                }
                this.clearError(); this.renderMessages(); this.renderBadges(); this.renderComposerState();
            } else if (type === Types.Messages.CHAT_INVENTORY) {
                this.transferableItems = data; this.inventoryLoading = false;
                if (this.pickerState) this.renderGiftPicker();
                this.renderComposerState();
            } else if (type === Types.Messages.CHAT_ERROR) {
                const request = this.pending.get(data.requestId);
                if (request) { clearTimeout(request.timer); this.pending.delete(data.requestId); }
                const retry = [...this.giftRetries.entries()].find(([channel, request]) => request.requestId === data.requestId);
                if (retry && data.code !== 'gift_pending') this.giftRetries.delete(retry[0]);
                const errors = {
                    history_unavailable: 'Chat history could not be saved. Your message has not been sent. Please retry.',
                    player_offline: 'This player is offline. Your message has not been sent.',
                    item_not_transferable: 'This item cannot be gifted. Remove it and choose another item.',
                    insufficient_items: 'You do not have enough of this item. Adjust or remove the gift.',
                    gift_pending: 'Gift confirmation is pending. Retry to check delivery; it will not send the gift twice.',
                    inventory_unavailable: 'Inventory is unavailable. Your gift has not been sent.',
                    gift_unavailable: 'Gifts are unavailable on this server. Your goods have been kept.'
                };
                this.error(errors[data.code] || 'Your message could not be sent. Your draft has been kept.');
                this.renderComposerState();
            }
        }

        setRoster(players) {
            this.players = players;
            players.forEach(player => this.people.set(key(player.id), player));
            this.me = players.find(player => key(player.id) === key(this.me?.id)) || this.me;
            if (this.profilePlayerId) this.updateProfileLocation();
        }

        storeMessage(message) {
            this.people.set(key(message.sender.id), message.sender);
            if (message.recipient) this.people.set(key(message.recipient.id), message.recipient);
            const channel = message.channel === 'direct'
                ? 'direct:' + (key(message.sender.id) === key(this.me.id) ? key(message.recipient.id) : key(message.sender.id))
                : 'world';
            const history = this.histories.get(channel) || [];
            if (!history.some(item => item.id === message.id)) this.histories.set(channel, [...history, message].slice(-100));
            if (channel === 'world') this.histories.set('map', this.histories.get('world').filter(item => item.mapId === this.me.mapId));
            return channel;
        }

        send() {
            this.saveDraft();
            const channel = this.channelKey(); const text = this.drafts.get(channel) || '';
            const attachment = this.tab === 'direct' && this.attachments.get(channel);
            if (!this.canSend() || (!text.trim() && !attachment)) return;
            const requestId = this.giftRetries.get(channel)?.requestId || Date.now().toString(36) + Math.random().toString(36).slice(2);
            const timer = setTimeout(() => {
                this.pending.delete(requestId);
                this.error(attachment ? 'Gift confirmation is pending. Retry to check delivery; it will not send the gift twice.' : 'No delivery confirmation received. Your draft has been kept.'); this.renderComposerState();
            }, attachment ? 35000 : 10000);
            this.pending.set(requestId, { channel, text, attachment, timer });
            if (attachment) {
                this.giftRetries.set(channel, {requestId, text, attachment});
                this.app.game.client.sendChatGift(this.target, text, attachment.item, attachment.quantity, requestId);
            } else this.app.game.client.sendSocialChat(this.tab, this.target, text, requestId);
            this.clearError(); this.renderComposerState();
        }

        canSend() {
            return this.connected && this.app.game.client?.connection?.connected &&
                (this.tab !== 'direct' || (this.target && (this.players.some(p => key(p.id) === this.target) || this.giftRetries.has(this.channelKey())))) &&
                ![...this.pending.values()].some(p => p.channel === this.channelKey());
        }

        startDirect(player) {
            this.saveDraft(); this.tab = 'direct'; this.target = key(player.id);
            this.closeProfile(); if (window.innerWidth <= 780) this.showPeople = false;
            this.clearError(); this.markRead(); this.render(); this.node('chatinput').focus();
        }

        error(message) { this.node('chat-error').textContent = message; this.node('chat-error').hidden = false; }
        clearError() { this.node('chat-error').hidden = true; }

        render() {
            this.panel.querySelectorAll('[data-chat-tab]').forEach(button => {
                button.classList.toggle('active', button.dataset.chatTab === this.tab);
                button.setAttribute('aria-current', button.dataset.chatTab === this.tab ? 'page' : 'false');
            });
            this.node('chatinput').value = this.drafts.get(this.channelKey()) || '';
            this.renderHeader(); this.renderRoster(); this.renderPeopleVisibility(); this.renderMessages(true); this.renderComposerState(); this.renderBadges();
        }

        renderHeader() {
            const header = this.node('chat-channel-info'); header.replaceChildren();
            const player = this.target && this.people.get(this.target);
            if (player) {
                const back = element('button', 'sc-back', '‹'); back.type = 'button'; back.setAttribute('aria-label', 'Back to direct messages');
                back.onclick = () => { this.saveDraft(); this.target = ''; this.render(); };
                header.append(back, this.avatar(player));
                const info = element('button', 'sc-header-person'); info.type = 'button';
                info.append(this.identity(player)); info.onclick = () => this.profile(player); header.append(info);
            } else {
                header.append(element('strong', '', this.tab === 'world' ? 'World chat' : this.tab === 'map' ? this.mapName(this.me?.mapId || this.app.game.mapId) + ' chat' : 'Direct messages'));
                header.append(element('small', '', this.tab === 'world' ? 'For everyone in Looperlands' : this.tab === 'map' ? 'Messages sent from this map' : 'Private conversations with players'));
            }
        }

        renderPeopleVisibility() {
            this.panel.classList.toggle('sc-hide-people', !this.showPeople);
            this.node('chat-players-toggle').textContent = this.showPeople ? 'Hide players' : 'Players (' + this.players.length + ')';
            this.node('chat-players-toggle').setAttribute('aria-expanded', this.showPeople);
        }

        renderRoster() {
            this.node('chat-online-count').textContent = this.players.length;
            this.panel.querySelectorAll('[data-chat-scope]').forEach(button => {
                button.classList.toggle('active', button.dataset.chatScope === this.scope);
                button.setAttribute('aria-pressed', button.dataset.chatScope === this.scope);
            });
            const query = this.node('chat-player-search').value.toLowerCase();
            const players = this.players.filter(p => key(p.id) !== key(this.me?.id) &&
                (this.scope === 'all' || p.mapId === this.me?.mapId) && (p.label + ' ' + p.walletShort).toLowerCase().includes(query));
            const list = this.node('chat-player-list'); list.replaceChildren();
            if (!players.length) list.append(element('p', 'sc-empty', this.connected ? (query ? 'No players found.' : 'No other players online here yet.') : 'Connecting to chat…'));
            const maps = [...new Set(players.map(p => p.mapId))].sort((a, b) => a === this.me.mapId ? -1 : b === this.me.mapId ? 1 : a.localeCompare(b));
            maps.forEach(map => {
                list.append(element('div', 'sc-group-label', this.mapName(map) + (map === this.me.mapId ? ' · Your map' : '')));
                players.filter(p => p.mapId === map).sort((a, b) => a.label.localeCompare(b.label)).forEach(player => {
                    const row = element('button', 'sc-player-row'); row.type = 'button'; row.onclick = () => this.profile(player);
                    const copy = this.identity(player);
                    copy.append(element('small', 'sc-location', player.sceneName || this.mapName(player.mapId)));
                    row.append(this.avatar(player), copy, element('span', 'sc-status-dot'));
                    row.setAttribute('aria-label', 'View ' + player.label + ', ' + player.walletShort); list.append(row);
                });
            });
            const self = this.node('chat-self'); self.replaceChildren(); self.disabled = !this.me;
            if (this.me) {
                const copy = this.identity(this.me); copy.append(element('small', 'sc-location', this.me.sceneName || this.mapName(this.me.mapId)));
                self.append(this.avatar(this.me), copy, element('span', 'sc-you', 'You')); self.onclick = () => this.profile(this.me);
            }
        }

        renderMessages(reset = false) {
            const list = this.node('chat-messages');
            const scrollTop = list.scrollTop;
            const bottom = reset || list.scrollHeight - list.scrollTop - list.clientHeight < 70;
            list.replaceChildren();
            const directList = this.tab === 'direct' && !this.target;
            this.node('chat-form').hidden = directList;
            if (directList) {
                const threads = [...this.histories.entries()].filter(([id, messages]) => id.startsWith('direct:') && messages.length).sort((a, b) => b[1].at(-1).epoch - a[1].at(-1).epoch);
                threads.forEach(([id, messages]) => {
                    const player = this.people.get(id.slice(7)); const message = messages.at(-1);
                    const row = element('button', 'sc-dm-row'); row.type = 'button'; row.onclick = () => this.startDirect(player);
                    const copy = this.identity(player); copy.append(element('p', 'sc-dm-preview', plainMessage(message.message) || (message.attachment ? 'Gift: ' + message.attachment.quantity + ' × ' + message.attachment.name : '')));
                    row.append(this.avatar(player), copy);
                    if (this.unread.get(key(player.id))) row.append(element('span', 'sc-badge', this.unread.get(key(player.id)))); list.append(row);
                });
                if (!threads.length) list.append(element('p', 'sc-empty', 'Choose an online player, then select Message to start a conversation.'));
            } else {
                const messages = this.histories.get(this.channelKey()) || [];
                let lastDay = '', previous;
                messages.forEach(message => {
                    const day = new Date(message.epoch).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    if (day !== lastDay) { list.append(element('div', 'sc-day-label', day)); lastDay = day; }
                    const row = element('article', 'sc-message');
                    const body = element('div', 'sc-message-body');
                    const time = element('time', '', new Date(message.epoch).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })); time.dateTime = new Date(message.epoch).toISOString();
                    if (this.continues(previous, message)) {
                        row.classList.add('sc-message-continuation');
                        row.setAttribute('aria-label', 'From ' + message.sender.label + ', ' + message.sender.walletShort);
                        body.append(time);
                    } else {
                        const meta = element('div', 'sc-message-meta');
                        const person = element('button', 'sc-message-person'); person.type = 'button'; person.onclick = () => this.profile(message.sender); person.append(this.identity(message.sender, true));
                        meta.append(person, time); body.append(meta); row.append(this.avatar(message.sender));
                    }
                    if (message.message) body.append(element('p', '', plainMessage(message.message)));
                    if (message.attachment) body.append(this.giftReceipt(message));
                    row.append(body); list.append(row); previous = message;
                });
                if (!messages.length) list.append(element('p', 'sc-empty', this.connected ? 'No messages yet. Say hello!' : 'Loading chat…'));
            }
            list.scrollTop = bottom ? list.scrollHeight : scrollTop;
        }

        continues(previous, message) {
            return !!previous && key(previous.sender.id) === key(message.sender.id) &&
                previous.sender.avatar === message.sender.avatar && previous.sender.label === message.sender.label &&
                previous.sender.walletShort === message.sender.walletShort && previous.mapId === message.mapId &&
                message.epoch >= previous.epoch && message.epoch - previous.epoch < 5 * 60 * 1000 &&
                new Date(previous.epoch).toDateString() === new Date(message.epoch).toDateString();
        }

        renderComposerState() {
            const draft = this.node('chatinput').value;
            const player = this.people.get(this.target);
            this.node('chatinput').placeholder = this.tab === 'direct' ? 'Message ' + (player?.label || 'player') + '…' : this.tab === 'world' ? 'Message the world…' : 'Message your map…';
            const channel = this.channelKey();
            const attachment = this.tab === 'direct' && this.attachments.get(channel);
            const locked = this.giftRetries.has(channel);
            this.node('chatinput').readOnly = locked;
            this.node('chat-attach').hidden = this.tab !== 'direct' || !this.target;
            this.node('chat-attach').disabled = !this.canSend() || locked;
            this.node('chatsend').disabled = !this.canSend() || (!draft.trim() && !attachment);
            this.node('chatsend').textContent = locked ? (this.canSend() ? 'Retry' : 'Sending…') : attachment ? 'Send gift' : 'Send';
            this.renderGiftPreview(attachment, locked);
            this.node('chat-delivery').textContent = this.tab === 'direct' ? (this.players.some(p => key(p.id) === this.target) ? 'Direct message' : 'Player offline') : draft.length + '/' + Types.MAX_CHAT_LENGTH;
        }

        renderBadges() {
            this.renderHud();
            this.markRead();
            const count = [...this.unread.values()].reduce((a, b) => a + b, 0);
            const badge = this.node('chat-unread'); badge.hidden = !count; badge.textContent = count;
            document.getElementById('chatbutton').classList.toggle('sc-unread', count > 0);
            document.getElementById('chatbutton').setAttribute('title', count ? 'Chat · ' + count + ' unread direct message' + (count === 1 ? '' : 's') : 'Chat');
        }

        identity(player, inline = false) {
            const copy = element('span', 'sc-identity');
            copy.append(element('strong', '', player.label), element('small', 'sc-wallet', inline ? '(' + player.walletShort + ')' : player.walletShort));
            return copy;
        }

        itemImage(item) {
            const image = element('img', 'sc-item-image'); image.alt = '';
            image.onerror = () => { image.style.visibility = 'hidden'; };
            image.src = 'img/1/' + encodeURIComponent(item.image) + '.png';
            return image;
        }

        giftReceipt(message) {
            const gift = message.attachment;
            const receipt = element('div', 'sc-gift-receipt');
            const copy = element('span');
            copy.append(element('strong', '', gift.quantity + ' × ' + gift.name), element('small', '', key(message.sender.id) === key(this.me.id) ? 'Delivered to ' + message.recipient.label : 'Added to your inventory'));
            receipt.append(this.itemImage(gift), copy); return receipt;
        }

        renderGiftPreview(attachment, locked) {
            const preview = this.node('chat-gift-preview'); preview.replaceChildren(); preview.hidden = !attachment;
            if (!attachment) return;
            preview.append(this.itemImage(attachment), element('span', '', attachment.quantity + ' × ' + attachment.name));
            const remove = element('button', '', '×'); remove.type = 'button'; remove.setAttribute('aria-label', 'Remove gift'); remove.disabled = locked;
            remove.onclick = () => { this.attachments.delete(this.channelKey()); this.renderComposerState(); };
            preview.append(remove);
        }

        giftPicker() {
            if (this.tab !== 'direct' || !this.target || !this.canSend() || this.giftRetries.has(this.channelKey())) return;
            this.profileReturnFocus = document.activeElement;
            this.pickerState = {channel: this.channelKey(), selected: this.attachments.get(this.channelKey())?.item};
            this.inventoryLoading = true; this.renderGiftPicker();
            this.app.game.client.requestChatInventory();
        }

        renderGiftPicker() {
            const state = this.pickerState;
            const shade = this.node('chat-profile'); shade.replaceChildren(); shade.hidden = false;
            const card = element('section', 'sc-profile-card sc-gift-card'); card.tabIndex = -1; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', 'Attach a gift');
            const close = element('button', 'sc-profile-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close gift picker'); close.onclick = () => this.closeProfile();
            const recipient = this.people.get(this.target);
            card.append(close, element('h3', '', 'Share a little adventure'), element('p', 'sc-gift-help', 'Choose an item to give to ' + recipient.label + ' (' + recipient.walletShort + ').'));
            const list = element('div', 'sc-gift-list');
            if (this.inventoryLoading) list.append(element('p', 'sc-empty', 'Loading your inventory…'));
            else if (!this.transferableItems.length) list.append(element('p', 'sc-empty', 'No transferable items in your inventory yet.'));
            else this.transferableItems.forEach(item => {
                const choice = element('button', 'sc-gift-choice'); choice.type = 'button'; choice.setAttribute('aria-pressed', state.selected === item.item);
                const copy = element('span'); copy.append(element('strong', '', item.name), element('small', '', item.quantity + ' available'));
                choice.append(this.itemImage(item), copy); choice.onclick = () => { state.selected = item.item; this.renderGiftPicker(); }; list.append(choice);
            });
            card.append(list);
            const selected = this.transferableItems.find(item => item.item === state.selected);
            if (selected && !this.inventoryLoading) {
                const label = element('label', 'sc-gift-quantity', 'Quantity');
                const input = element('input'); input.type = 'number'; input.min = 1; input.max = Math.min(selected.quantity, 1000000); input.step = 1; input.value = Math.min(this.attachments.get(state.channel)?.quantity || 1, Number(input.max)); input.setAttribute('aria-label', 'Gift quantity'); label.append(input); card.append(label);
                const attach = element('button', 'sc-primary', 'Attach gift'); attach.type = 'button';
                const validate = () => { const quantity = Number(input.value); attach.disabled = !Number.isSafeInteger(quantity) || quantity < 1 || quantity > Number(input.max); };
                input.addEventListener('input', validate); validate();
                attach.onclick = () => { validate(); if (attach.disabled) return; this.attachments.set(state.channel, {...selected, quantity: Number(input.value)}); this.closeProfile(); this.renderComposerState(); };
                card.append(element('p', 'sc-gift-help', 'The goods transfer when you send the message.'), attach);
            }
            shade.append(card); shade.onclick = event => { if (event.target === shade) this.closeProfile(); };
            card.addEventListener('keydown', event => this.dialogKeydown(event, card)); card.focus();
        }

        dialogKeydown(event, card) {
            if (event.key === 'Escape') { event.stopPropagation(); this.closeProfile(); }
            if (event.key !== 'Tab') return;
            const controls = [...card.querySelectorAll('button,input')].filter(node => !node.disabled);
            if (event.shiftKey && (document.activeElement === controls[0] || document.activeElement === card)) { event.preventDefault(); controls.at(-1).focus(); }
            else if (!event.shiftKey && (document.activeElement === controls.at(-1) || document.activeElement === card)) { event.preventDefault(); controls[0].focus(); }
        }

        mapName(map) {
            return Object.prototype.hasOwnProperty.call(mapNames, map) ? mapNames[map] : String(map || '').replace(/[_-]/g, ' ');
        }

        locationName(player) { return this.mapName(player.mapId) + (player.sceneName ? ' · ' + player.sceneName : ''); }

        updateProfileLocation() {
            const status = this.players.find(player => key(player.id) === this.profilePlayerId);
            const node = this.panel.querySelector('.sc-profile-status');
            if (node) node.textContent = status ? 'Online · ' + this.locationName(status) : 'Offline';
        }

        avatar(player) {
            const frame = element('span', 'sc-avatar'); const canvas = element('canvas'); canvas.width = canvas.height = 48;
            canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', player.label + ' avatar'); frame.append(canvas);
            this.avatarSource(player.avatar).then(source => {
                const image = new Image(); image.onload = () => {
                    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(image, 0, source.row * source.height, source.width, source.height, 0, 0, 48, 48);
                }; image.src = source.url;
            }); return frame;
        }

        avatarSource(avatar) {
            if (this.avatarSources.has(avatar)) return this.avatarSources.get(avatar);
            const sprite = this.app.game.sprites?.[avatar];
            const source = new Promise(resolve => {
                // Dynamic sprites always use the 1x sheet, regardless of game render scale.
                const scale = sprite?.dynamicNFT ? 1 : sprite?.scale || 1;
                const url = sprite?.filepath || 'img/1/' + encodeURIComponent(avatar) + '.png';
                const image = new Image();
                image.onload = () => resolve({ url, width: (sprite?.width || 32) * scale, height: (sprite?.height || 32) * scale, row: sprite?.animationData?.idle_down?.row ?? 8 });
                image.onerror = async () => {
                    try {
                        if (!/^(?:NFT_[a-z0-9_-]+|_[a-f0-9]{64}i\d+)$/i.test(avatar)) throw new Error('Unknown sprite');
                        const { data } = await axios.get('/session/' + encodeURIComponent(this.app.sessionId) + '/dynamicnft/' + encodeURIComponent(avatar.replace(/^NFT_/, '0x')) + '/nftid');
                        if (!/^[a-zA-Z0-9_-]+$/.test(data.tokenHash)) throw new Error('Invalid sprite');
                        resolve({ url: 'https://looperlands.sfo3.digitaloceanspaces.com/assets/looper/1/' + data.tokenHash + '.png', width:32, height:32, row:8 });
                    } catch (error) {
                        this.avatarSources.delete(avatar);
                        resolve({url:'img/1/clotharmor.png',width:32,height:32,row:8});
                    }
                }; image.src = url;
            });
            this.avatarSources.set(avatar, source); return source;
        }

        profile(player) {
            this.profilePlayerId = key(player.id);
            this.profileReturnFocus = document.activeElement;
            const shade = this.node('chat-profile'); shade.replaceChildren(); shade.hidden = false;
            const card = element('section', 'sc-profile-card'); card.tabIndex = -1; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', player.label + ' profile');
            const close = element('button', 'sc-profile-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close profile'); close.onclick = () => this.closeProfile();
            const status = this.players.find(p => key(p.id) === key(player.id));
            card.append(close, this.avatar(player), this.identity(player), element('p', 'sc-profile-status', status ? 'Online · ' + this.locationName(status) : 'Offline'));
            if (key(player.id) !== key(this.me.id)) {
                const message = element('button', 'sc-primary', 'Message'); message.type = 'button'; message.disabled = !status; message.onclick = () => this.startDirect(player); card.append(message);
            }
            shade.append(card); shade.onclick = event => { if (event.target === shade) this.closeProfile(); };
            card.addEventListener('keydown', event => {
                if (event.key === 'Escape') { event.stopPropagation(); this.closeProfile(); }
                if (event.key === 'Tab') {
                    const controls = [...card.querySelectorAll('button')].filter(node => !node.disabled);
                    if (event.shiftKey && (document.activeElement === controls[0] || document.activeElement === card)) { event.preventDefault(); controls.at(-1).focus(); }
                    else if (!event.shiftKey && (document.activeElement === controls.at(-1) || document.activeElement === card)) { event.preventDefault(); controls[0].focus(); }
                }
            }); card.focus();
        }

        closeProfile() { this.pickerState = null; this.profilePlayerId = null; this.node('chat-profile').hidden = true; this.profileReturnFocus?.focus(); }
    }

    return SocialChat;
});

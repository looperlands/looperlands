/* Admin-only playtest. Admission and all mutations are checked by the server. */
define(['socialchat'], function (SocialChat) {

    const el = (tag, cls, text) => {
        const node = document.createElement(tag); if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text; return node;
    };
    const button = (text, click, cls = '') => {
        const node = el('button', cls, text); node.type = 'button'; node.onclick = click; return node;
    };
    const time = seconds => Math.floor(Math.max(0, seconds) / 60) + ':' + String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0');
    const modeArt = {checkpoint: 'clotharmor', duel: 'guard', laststand: 'skeleton'};
    const playerCount = mode => mode.players[0] === mode.players[1] ? mode.players[0] + ' players' : mode.players[0] + '–' + mode.players[1] + ' players';

    class ModesWorkshop {
        constructor(app, game) {
            this.app = app; this.game = game; this.prefix = '/session/' + encodeURIComponent(app.sessionId) + '/game-modes'; this.view = 'activities'; this.opened = false;
            this.authorized = false; this.destroyed = false;
            this.modeId = 'checkpoint'; this.venueId = 'town-trail'; this.error = ''; this.busy = false;
            this.root = el('div', 'lm-root'); this.root.hidden = true; this.root.id = 'modes-workshop';
            this.markers = el('canvas', 'lm-markers'); this.markers.setAttribute('aria-hidden', 'true');
            this.toolbar = el('nav', 'lm-toolbar'); this.toolbar.setAttribute('aria-label', 'Activities workshop');
            this.toolbar.append(button('Activities', () => this.open('activities'), 'lm-launch'), button('Players', () => this.open('players')), button('Workshop', () => this.open('workshop')));
            this.chip = button('Your lobby', () => this.open('lobby'), 'lm-chip'); this.chip.hidden = true;
            this.panel = el('section', 'lm-panel'); this.panel.hidden = true; this.panel.tabIndex = -1;
            this.panel.setAttribute('role', 'dialog'); this.panel.setAttribute('aria-label', 'Activities');
            this.toast = el('aside', 'lm-invitation'); this.toast.hidden = true; this.toast.setAttribute('aria-label', 'Activity invitation');
            this.hud = el('section', 'lm-hud'); this.hud.hidden = true; this.hud.setAttribute('aria-label', 'Current activity');
            this.countdown = el('div', 'lm-countdown'); this.countdown.hidden = true; this.countdown.setAttribute('role', 'status');
            this.keeperPrompt = button('Play a round [E]', () => this.open('activities'), 'lm-keeper-prompt'); this.keeperPrompt.hidden = true;
            this.keeperPrompt.setAttribute('aria-label', 'Activity keeper: play a round');
            this.root.append(this.markers, this.toolbar, this.chip, this.hud, this.countdown, this.keeperPrompt, this.panel, this.toast);
            document.body.append(this.root);
            for (const event of ['click', 'pointerdown', 'mousedown', 'touchstart', 'touchend', 'wheel']) {
                for (const node of [this.toolbar, this.panel, this.toast, this.hud, this.chip, this.keeperPrompt]) node.addEventListener(event, e => e.stopPropagation());
            }
            this.onKeydown = event => this.keydown(event);
            document.addEventListener('keydown', this.onKeydown, true);
            const talk = game.makeNpcTalk.bind(game);
            this.originalTalk = talk;
            game.makeNpcTalk = npc => {
                if (String(npc?.id) === String(this.state?.npcId)) { this.open('activities'); return; }
                return talk(npc);
            };
            const pvp = game.map?.isInsidePvpZone;
            this.originalPvp = pvp;
            this.interval = setInterval(() => this.tick(), 250);
            this.frame = () => { this.draw(); this.animation = requestAnimationFrame(this.frame); };
            this.animation = requestAnimationFrame(this.frame);
            window.addEventListener('pagehide', () => this.destroy(), {once: true});
        }

        destroy() {
            if (this.destroyed) return;
            this.destroyed = true; this.authorized = false; this.state = null;
            clearInterval(this.interval); cancelAnimationFrame(this.animation);
            document.removeEventListener('keydown', this.onKeydown, true); this.root.remove();
            this.game.makeNpcTalk = this.originalTalk;
            if (this.pvpInstalled) this.game.map.isInsidePvpZone = this.originalPvp;
        }

        async checkAccess() {
            this.checking = true;
            try {
                const {data} = await axios.get(this.prefix + '/access');
                if (this.destroyed) return;
                if (data?.enabled === true) this.authorized = true;
                else this.destroy();
            } catch (error) {
                if (error.response?.status === 403) this.destroy();
            } finally { this.checking = false; this.nextAccessCheck = Date.now() + 5000; }
        }

        async tick() {
            const active = this.game.started && !this.game.isStopped && this.game.player && !(window.innerWidth < 700 && window.innerHeight > window.innerWidth);
            this.root.hidden = !active || !this.authorized;
            if (!active) return;
            if (!this.authorized) { if (!this.checking && Date.now() >= (this.nextAccessCheck || 0)) this.checkAccess(); return; }
            const bounds = this.game.renderer.canvas.getBoundingClientRect();
            Object.assign(this.root.style, {left: bounds.left + 'px', top: bounds.top + 'px', width: bounds.width + 'px', height: bounds.height + 'px'});
            if (!this.pvpInstalled && this.game.map) {
                this.pvpInstalled = true;
                const map = this.game.map, original = map.isInsidePvpZone.bind(map);
                map.isInsidePvpZone = (x, y) => {
                    const match = this.state?.match;
                    if (match?.modeId === 'duel' && match.phase === 'playing') {
                        const area = this.venue(match.venueId).area;
                        if (x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h) return true;
                    }
                    return original(x, y);
                };
            }
            if (!this.polling && !this.busy && Date.now() - (this.lastPoll || 0) > 650) this.poll();
            this.renderTimers();
        }

        async poll() {
            this.polling = true; this.lastPoll = Date.now();
            try {
                const {data} = await axios.get(this.prefix + '/state', {params: {sessionId: this.game.sessionId}});
                if (this.destroyed) return;
                this.update(data);
                if (!this.initialized) {
                    this.initialized = true;
                    this.keeperActor = this.portrait('guard', 48); this.keeperActor.classList.add('lm-keeper-actor');
                    this.keeperActor.hidden = true; this.root.prepend(this.keeperActor);
                }
            } catch (error) {
                if ([401, 403].includes(error.response?.status)) { this.destroy(); return; }
                if (this.initialized) { this.error = error.response?.data?.error || 'Connection lost. Trying again…'; this.render(); }
            } finally { this.polling = false; }
        }

        update(state) {
            const previous = this.state?.match;
            this.state = state; this.clockOffset = state.serverNow - Date.now();
            const match = state.match;
            if (match && previous?.phase !== match.phase) {
                if (['playing', 'countdown'].includes(match.phase)) this.close();
                if (match.phase === 'results') this.open('lobby');
                if (match.phase === 'lobby' && previous?.phase === 'results') this.open('lobby');
            }
            if (previous && !match && ['lobby', 'invite-players', 'change-venue'].includes(this.view)) this.open('activities');
            const signature = JSON.stringify({...state, serverNow: 0});
            if (signature !== this.signature) { this.signature = signature; this.render(); }
            this.renderTimers();
        }

        async action(action, input = {}, next) {
            if (this.busy) return false;
            this.busy = true; this.error = '';
            this.panel.setAttribute('aria-busy', 'true');
            try {
                const {data} = await axios.post(this.prefix + '/action', {sessionId: this.game.sessionId, action, ...input});
                if (this.destroyed) return false;
                this.busy = false; this.update(data);
                if (next) this.open(next);
                return true;
            } catch (error) {
                this.error = error.response?.data?.error || 'That did not work. Please try again.';
                return false;
            } finally { this.busy = false; this.panel.removeAttribute('aria-busy'); this.render(); }
        }

        mode(id = this.modeId) { return this.state.modes.find(mode => mode.id === id); }
        venue(id = this.venueId) { return this.state.venues.find(venue => venue.id === id); }
        now() { return Date.now() + (this.clockOffset || 0); }

        open(view) {
            if (!this.state) return;
            if (view === 'activities' && this.state.match) view = 'lobby';
            this.view = view; this.opened = true; this.error = ''; this.panel.hidden = false;
            this.render(); this.panel.focus({preventScroll: true});
        }

        close() { this.opened = false; this.panel.hidden = true; this.renderTimers(); }

        canTalkToKeeper() {
            return !this.root.hidden && !this.opened && this.state?.keeper?.near && !['countdown', 'playing'].includes(this.state?.match?.phase)
                && !this.game.minigameLoaded && !document.querySelector('body.inventory,body.settings,body.field-guide-open,#chatbox.active,#dialogue-popup.active,#instructions.active,#achievements.active,#announcement.active,#playerClassSelection.active,#miniMap.active,#keyboardCommands.active,#gamepadCommands.active,#avatarStats.active,#weaponStats.active');
        }

        keydown(event) {
            if (!this.opened) {
                if (event.key.toLowerCase() === 'e' && !event.repeat && this.canTalkToKeeper() && !event.target.closest?.('input,textarea,[contenteditable="true"]')) {
                    event.preventDefault(); event.stopImmediatePropagation(); this.open('activities');
                }
                return;
            }
            if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.close(); return; }
            if (event.target.closest?.('.lm-root')) {
                if (event.key === 'Tab') {
                    const controls = [...this.panel.querySelectorAll('button:not(:disabled),a,input,select')].filter(node => !node.hidden);
                    if (!controls.length) return;
                    if (event.shiftKey && (document.activeElement === controls[0] || document.activeElement === this.panel)) { event.preventDefault(); controls.at(-1).focus(); }
                    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
                }
                event.stopPropagation(); return;
            }
            if (['w', 'a', 's', 'd', 'e', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); }
        }

        portrait(name = 'clotharmor', size = 44) {
            const frame = el('span', 'lm-portrait'); frame.style.width = frame.style.height = size + 'px';
            const canvas = el('canvas'); canvas.width = canvas.height = size; canvas.setAttribute('aria-hidden', 'true'); frame.append(canvas);
            const sprite = this.game.sprites?.[name];
            const width = sprite?.width || 32, height = sprite?.height || 32;
            const scale = sprite?.dynamicNFT ? 1 : sprite?.scale || 1;
            const row = sprite?.animationData?.idle_down?.row ?? (name === 'guard' ? 0 : 8);
            const image = new Image(); image.onload = () => {
                const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
                ctx.drawImage(image, 0, row * height * scale, width * scale, height * scale, 0, 0, size, size);
            }; image.src = sprite?.filepath || 'img/1/' + name + '.png';
            return frame;
        }

        heading(title, subtitle, back) {
            const header = el('header', 'lm-heading');
            const copy = el('div');
            if (back) copy.append(button(back.label, back.click, 'lm-back'));
            copy.append(el('h2', '', title)); if (subtitle) copy.append(el('p', '', subtitle));
            header.append(copy, button('Close', () => this.close(), 'lm-close'));
            this.panel.append(header);
            const error = el('p', 'lm-error', this.error); error.hidden = !this.error; error.setAttribute('role', 'alert'); this.panel.append(error);
            this.body = el('div', 'lm-body'); this.panel.append(this.body);
        }

        render() {
            if (!this.state) return;
            if (this.opened) {
                const scroll = this.renderedView === this.view ? this.body?.scrollTop || 0 : 0;
                this.renderedView = this.view;
                this.panel.replaceChildren(); this.panel.classList.toggle('lm-wide', ['setup', 'change-venue', 'lobby'].includes(this.view));
                if (this.view === 'activities') this.activities();
                else if (this.view === 'setup') this.setup();
                else if (this.view === 'lobby') this.lobby();
                else if (this.view === 'players' || this.view === 'invite-players') this.players();
                else if (this.view === 'change-venue') this.changeVenue();
                else if (this.view === 'invitation') this.invitation();
                else if (this.view === 'workshop') this.workshop();
                else if (this.view === 'author') this.author();
                if (this.body) this.body.scrollTop = scroll;
            }
            this.renderInvite(); this.renderTimers();
        }

        activities() {
            this.heading(this.target ? 'Play with ' + this.target.name : 'Play a round', 'A quick challenge. A friendly rivalry. One more try.');
            const keeper = el('div', 'lm-keeper'); keeper.append(this.portrait('guard', 56), el('p', '', '“Pick your adventure. I’ll keep a place for you.”')); this.body.append(keeper);
            const list = el('div', 'lm-activity-list');
            for (const mode of this.state.modes) {
                const row = button('', () => this.selectMode(mode.id), 'lm-activity');
                const text = el('span', 'lm-row-copy'); text.append(el('strong', '', mode.name), el('span', '', mode.description));
                const meta = el('span', 'lm-meta'); meta.append(el('span', '', mode.kind), el('span', '', playerCount(mode) + ' · ' + Math.round(mode.duration / 60) + ' min'));
                row.append(this.portrait(modeArt[mode.id], 56), text, meta); list.append(row);
            }
            this.body.append(list);
            const foot = el('div', 'lm-bottom-note'); foot.append(el('span', '', 'You can also talk to the activity keeper beside you.'), button('Find players', () => {this.target = null; this.open('players');})); this.body.append(foot);
        }

        selectMode(id) {
            this.modeId = id;
            this.venueId = this.state.venues.find(venue => venue.modes.includes(id) && venue.eligibility.allowed && !venue.busy)?.id
                || this.state.venues.find(venue => venue.modes.includes(id)).id;
            this.open('setup');
        }

        rules(mode, parent) {
            const list = el('ul', 'lm-rules'); for (const rule of mode.rules) list.append(el('li', '', rule)); parent.append(list);
        }

        venues(parent, selected, click) {
            const list = el('div', 'lm-venues');
            for (const venue of this.state.venues.filter(entry => entry.modes.includes(this.state.match && this.view === 'change-venue' ? this.state.match.modeId : this.modeId))) {
                const row = button('', () => click(venue), 'lm-venue' + (venue.id === selected ? ' lm-selected' : ''));
                row.setAttribute('aria-pressed', venue.id === selected ? 'true' : 'false');
                const text = el('span', 'lm-row-copy'); text.append(el('strong', '', venue.name), el('span', '', venue.location));
                const targetAccess = this.target && this.state.people.find(person => person.id === this.target.id)?.accessByVenue?.[venue.id];
                const targetLocked = targetAccess && !targetAccess.allowed;
                const label = !venue.eligibility.allowed ? venue.eligibility.reason : targetLocked ? this.target.name + ' needs access' : venue.busy ? 'Match in progress' : 'Access confirmed';
                row.append(text, el('span', 'lm-access' + (!venue.eligibility.allowed || targetLocked || venue.busy ? ' lm-locked' : ''), label)); list.append(row);
            }
            parent.append(list);
        }

        setup() {
            const mode = this.mode(), venue = this.venue();
            this.heading(mode.name, mode.kind + ' · ' + playerCount(mode), {label: 'All activities', click: () => this.open('activities')});
            const split = el('div', 'lm-split'), about = el('div', 'lm-about'), places = el('div');
            about.append(this.portrait(modeArt[mode.id], 80), el('p', 'lm-description', mode.description)); this.rules(mode, about);
            places.append(el('h3', '', 'Choose a place'));
            this.venues(places, venue.id, next => {this.venueId = next.id; this.error = ''; this.render();});
            places.append(el('p', 'lm-place-description', venue.description));
            if (!venue.eligibility.allowed) places.append(el('p', 'lm-error-inline', 'You need a Crypt pass before you can join or host here. An invitation does not unlock the area.'));
            split.append(about, places); this.body.append(split);
            const footer = el('footer', 'lm-actions');
            const targetAccess = this.target && this.state.people.find(person => person.id === this.target.id)?.accessByVenue?.[venue.id];
            const playable = venue.eligibility.allowed && !venue.busy && (!targetAccess || targetAccess.allowed);
            const primary = button(this.target ? 'Invite ' + this.target.name : mode.players[0] === 1 ? 'Play solo' : 'Create lobby', async () => {
                if (!await this.action('create', {modeId: mode.id, venueId: venue.id})) return;
                if (this.target) {
                    const target = this.target; this.target = null;
                    await this.action('invite', {matchId: this.state.match.id, targetId: target.id}, 'lobby');
                } else if (mode.players[0] === 1) {
                    const matchId = this.state.match.id;
                    if (!await this.action('ready', {matchId}) || !await this.action('start', {matchId})) this.open('lobby');
                } else this.open('lobby');
            }, 'lm-primary'); primary.disabled = !playable; footer.append(primary);
            if (!this.target && mode.players[0] === 1) footer.append(button('Play with others', async () => {
                if (await this.action('create', {modeId: mode.id, venueId: venue.id})) this.open('invite-players');
            }, 'lm-secondary'));
            this.body.append(footer, el('p', 'lm-fine', mode.players[0] === 1 && !this.target ? 'Solo play begins after a short countdown. Groups gather in the shared lobby.' : 'Choose your group in the lobby. Everyone confirms before the round starts.'));
        }

        lobby() {
            const match = this.state.match;
            if (!match) { this.view = 'activities'; this.activities(); return; }
            const mode = this.mode(match.modeId), venue = this.venue(match.venueId), me = match.members.find(member => member.id === this.state.me.id);
            this.heading(match.phase === 'results' ? (match.result.outcome === 'complete' ? 'Nicely played!' : 'Another round?') : mode.name,
                venue.name + ' · ' + mode.kind + ' · ' + (match.visibility === 'open' ? 'Open to nearby players' : 'Invite-only'));
            if (match.phase === 'results') {
                const result = el('div', 'lm-result'); result.append(this.portrait(modeArt[mode.id], 80), el('h3', '', match.result.text), el('p', '', 'Time played · ' + time(match.result.elapsed / 1000)));
                this.body.append(result);
            } else {
                const place = el('div', 'lm-lobby-place'); place.append(el('strong', '', venue.location));
                if (match.isHost) place.append(button('Change venue', () => this.open('change-venue'), 'lm-text-button')); this.body.append(place);
                this.rules(mode, this.body);
            }
            const roster = el('div', 'lm-roster'); roster.append(el('h3', '', 'Your group · ' + match.members.filter(member => member.status !== 'invited').length + '/' + mode.players[1]));
            for (const member of match.members) {
                const row = el('div', 'lm-player');
                const copy = el('span', 'lm-row-copy'); copy.append(el('strong', '', member.name + (member.id === this.state.me.id ? ' · You' : '')),
                    el('span', '', member.demo ? 'Practice partner · responds automatically' : member.id === match.host ? 'Host' : 'Player'));
                const status = !member.access.allowed ? 'Access required' : member.status === 'invited' ? 'Invited' : member.ready ? 'Ready' : 'Not ready';
                row.append(this.portrait(member.demo ? 'leatherarmor' : 'clotharmor'), copy, el('span', 'lm-player-state' + (member.ready ? ' lm-ready' : ''), status));
                if (match.isHost && member.status === 'invited') row.append(button('Cancel invite', () => this.action('uninvite', {matchId: match.id, targetId: member.id}), 'lm-quiet'));
                roster.append(row);
            }
            this.body.append(roster);
            const footer = el('footer', 'lm-actions');
            if (match.phase === 'results') {
                if (match.isHost) footer.append(button('Play again', () => this.action('rematch', {matchId: match.id}, 'lobby'), 'lm-primary'));
                else footer.append(el('span', 'lm-fine', 'Waiting for the host to set up another round.'));
                footer.append(button('Leave group', () => this.action('leave', {matchId: match.id}, 'activities'), 'lm-secondary'));
            } else {
                const ready = button(me?.ready ? 'Not ready' : 'Ready to play', () => this.action('ready', {matchId: match.id}), me?.ready ? 'lm-secondary' : 'lm-primary');
                ready.disabled = !me?.access.allowed || match.phase !== 'lobby'; footer.append(ready);
                if (match.isHost) {
                    const start = button('Start round', () => this.action('start', {matchId: match.id}), 'lm-primary');
                    start.disabled = match.members.length < mode.players[0] || match.members.some(member => !member.ready || member.status === 'invited' || !member.access.allowed); footer.append(start);
                    if (match.members.length < mode.players[1]) footer.append(button('Invite players', () => this.open('invite-players'), 'lm-secondary'));
                }
                footer.append(button('Leave', () => this.action('leave', {matchId: match.id}, 'activities'), 'lm-quiet'));
            }
            this.body.append(footer);
            if (match.phase === 'lobby') {
                this.body.append(el('p', 'lm-fine', 'Ready confirms entry to this practice area. Access is checked again when the host starts.'));
                if (match.isHost) {
                    const label = el('label', 'lm-toggle'); const input = el('input'); input.type = 'checkbox'; input.checked = match.visibility === 'open';
                    input.onchange = () => this.action('visibility', {matchId: match.id, open: input.checked}); label.append(input, 'Let other admins join'); this.body.append(label);
                }
            }
        }

        changeVenue() {
            const match = this.state.match;
            this.heading('Choose another place', 'Changing the venue asks everyone to confirm again.', {label: 'Back to lobby', click: () => this.open('lobby')});
            this.venues(this.body, match.venueId, async venue => {
                if (await this.action('change-venue', {matchId: match.id, venueId: venue.id}, 'lobby')) this.error = '';
            });
        }

        players() {
            const match = this.state.match;
            this.heading(this.view === 'invite-players' ? 'Invite your group' : 'Play together', 'Choose an online player, or try a co-op run with Moss.',
                match ? {label: 'Back to lobby', click: () => this.open('lobby')} : {label: 'All activities', click: () => {this.target = null; this.open('activities');}});
            for (const person of this.state.people) {
                const row = el('div', 'lm-player'); const copy = el('span', 'lm-row-copy');
                copy.append(el('strong', '', person.name), el('span', '', person.demo ? 'Practice partner · scripted lobby response' : 'Platform admin · Town'));
                const already = match?.members.some(member => member.id === person.id);
                const invite = button(already ? 'In your group' : person.busy ? 'In an activity' : match ? 'Invite' : 'Play together', () => {
                    if (match) this.action('invite', {matchId: match.id, targetId: person.id}, 'lobby');
                    else { this.target = person; this.open('activities'); }
                }, 'lm-secondary');
                invite.disabled = already || person.busy || person.demo && match?.modeId === 'duel';
                row.append(this.portrait(person.demo ? 'leatherarmor' : 'clotharmor'), copy, invite); this.body.append(row);
            }
            this.body.append(el('p', 'lm-fine', 'Only platform admins currently testing on this map appear here. Duel needs two different admin wallets. Moss accepts co-op invitations but does not fight.'));
            if (this.state.openMatches.length) {
                this.body.append(el('h3', 'lm-section-title', 'Open groups'));
                for (const entry of this.state.openMatches) {
                    const row = el('div', 'lm-player'); row.append(el('span', 'lm-row-copy', this.mode(entry.modeId).name + ' · ' + this.venue(entry.venueId).name),
                        button('Join lobby', () => this.action('join', {matchId: entry.id}, 'lobby'), 'lm-secondary')); this.body.append(row);
                }
            }
        }

        renderInvite() {
            const invite = this.state.invitations[0]; this.toast.hidden = !invite || this.view === 'invitation' && this.opened;
            if (!invite) return;
            const mode = this.mode(invite.modeId), venue = this.venue(invite.venueId), host = invite.members.find(member => member.id === invite.host);
            this.toast.replaceChildren(el('strong', '', host.name + ' invited you'), el('p', '', mode.name + ' · ' + venue.name));
            const actions = el('div', 'lm-actions'); actions.append(button('Review invite', () => {this.inviteId = invite.id; this.open('invitation');}, 'lm-primary'),
                button('Decline', () => this.action('decline', {matchId: invite.id}), 'lm-quiet')); this.toast.append(actions);
        }

        invitation() {
            const match = this.state.invitations.find(invite => invite.id === this.inviteId) || this.state.invitations[0];
            if (!match) { this.heading('Invitation ended', 'The invitation expired or the host closed the group.'); this.body.append(button('Browse activities', () => this.open('activities'), 'lm-primary')); return; }
            const venue = this.venue(match.venueId), mode = this.mode(match.modeId), member = match.members.find(entry => entry.id === this.state.me.id);
            this.heading('You’re invited', mode.name + ' · ' + venue.name);
            const host = match.members.find(entry => entry.id === match.host);
            const intro = el('div', 'lm-keeper'); intro.append(this.portrait(host.demo ? 'leatherarmor' : 'clotharmor', 64), el('p', '', host.name + ' saved you a place.')); this.body.append(intro);
            this.rules(mode, this.body);
            this.body.append(el('p', 'lm-description', venue.location));
            const access = this.eligibilityMessage(venue); this.body.append(access);
            const actions = el('footer', 'lm-actions'); const accept = button('Join lobby', () => this.action('accept', {matchId: match.id}, 'lobby'), 'lm-primary'); accept.disabled = !member.access.allowed;
            actions.append(accept, button('Decline', () => this.action('decline', {matchId: match.id}, 'activities'), 'lm-secondary')); this.body.append(actions);
            this.body.append(el('p', 'lm-fine', 'Joining reserves a lobby place. The round starts only after you are ready. Invitations expire after one minute.'));
        }

        eligibilityMessage(venue) {
            return el('p', venue.eligibility.allowed ? 'lm-access-note' : 'lm-error-inline', venue.eligibility.allowed ? 'You have access to this venue.' : 'Crypt pass required. The invitation does not grant access. Ask the host to choose Town Green, or unlock the local test pass in Workshop.');
        }

        workshop() {
            this.heading('Admin playtest', 'Try the activity flows before opening them to players.');
            this.body.append(el('p', 'lm-description', 'Matches use live movement and gear. Test passes simulate admission at this public practice ground. Practice kills award no XP or loot.'));
            const controls = el('div', 'lm-workshop-actions');
            controls.append(button('Receive a public invitation', async () => {if (await this.action('demo-invite', {locked: false})) {this.inviteId = this.state.invitations[0]?.id; this.open('invitation');}}, 'lm-secondary'),
                button('Receive a locked invitation', async () => {if (await this.action('demo-invite', {locked: true})) {this.inviteId = this.state.invitations[0]?.id; this.open('invitation');}}, 'lm-secondary'));
            const access = el('label', 'lm-toggle'); const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.checked = this.state.me.cryptAccess;
            checkbox.onchange = () => this.action('access', {allowed: checkbox.checked}); access.append(checkbox, 'Give this player a local Crypt pass'); controls.append(access);
            controls.append(button('Back to the activity keeper', async () => { if (await this.action('meet-keeper')) this.close(); }, 'lm-secondary'), button('Inspect mapmaker setup', () => this.open('author'), 'lm-secondary'));
            this.body.append(controls, el('p', 'lm-fine', 'Leave your current group before retrying invitation scenarios. The keeper is visible only to admins. Area passes here are test fixtures; invitations do not grant platform admin access.'));
        }

        author() {
            const venue = this.venue(this.authorVenue || 'town-green');
            this.heading('Venue setup', 'A read-only view of the configuration driving this PoC.', {label: 'Back to workshop', click: () => this.open('workshop')});
            const selector = el('select'); selector.setAttribute('aria-label', 'Inspect venue');
            for (const entry of this.state.venues) { const option = el('option', '', entry.name); option.value = entry.id; option.selected = entry.id === venue.id; selector.append(option); }
            selector.onchange = () => {this.authorVenue = selector.value; this.showLayout = true; this.render();}; this.body.append(selector);
            const facts = el('dl', 'lm-facts');
            for (const [name, value] of [['Tiled markers', 'Boundary, waiting area, spawns, NPC'], ['Mode preset', venue.modes.map(id => this.mode(id).preset).join(', ')], ['Access policy', venue.access], ['Shared space', venue.sharesSpaceWith || venue.id]]) {
                const row = el('div'); row.append(el('dt', '', name), el('dd', '', value)); facts.append(row);
            }
            this.body.append(facts);
            const layout = el('label', 'lm-toggle'); const input = el('input'); input.type = 'checkbox'; input.checked = !!this.showLayout; input.onchange = () => {this.showLayout = input.checked;}; layout.append(input, 'Show this venue’s boundary on the map'); this.body.append(layout);
            const details = el('details'); details.append(el('summary', '', 'View configuration'));
            const {eligibility, busy, ...definition} = venue; details.append(el('pre', '', JSON.stringify(definition, null, 2))); this.body.append(details);
            this.body.append(el('p', 'lm-fine', 'These files model proposed Tiled output. Tiled authoring/export support is not implemented by this preview.'));
        }

        renderTimers() {
            if (!this.state) return;
            const match = this.state.match, active = match && ['countdown', 'playing'].includes(match.phase);
            this.chip.hidden = !match || this.opened || active;
            if (match) this.chip.textContent = this.mode(match.modeId).name + ' · Your group';
            this.hud.hidden = !active; this.countdown.hidden = match?.phase !== 'countdown';
            if (!active) return;
            const mode = this.mode(match.modeId), me = match.members.find(member => member.id === this.state.me.id);
            let progress = match.modeId === 'checkpoint' ? me.progress + '/3 checkpoints' : match.modeId === 'laststand' ? 'Wave ' + Math.max(1, match.wave) + '/3 · ' + match.mobIds.length + ' marked enemies left' : 'Best of three · ' + match.members.map(member => member.name + ' ' + member.rounds).join(' : ');
            this.hud.replaceChildren(el('strong', '', mode.name), el('span', '', progress), el('span', 'lm-timer', time(Math.min(mode.duration, (match.endsAt - this.now()) / 1000))), button('Leave round', () => this.action('leave', {matchId: match.id}), 'lm-quiet'));
            if (match.phase === 'countdown') this.countdown.replaceChildren(el('strong', '', String(Math.max(1, Math.ceil((match.startsAt - this.now()) / 1000)))), el('span', '', 'Get ready'));
        }

        draw() {
            if (this.root.hidden || !this.game.renderer?.canvas) return;
            const source = this.game.renderer.canvas;
            if (this.markers.width !== source.width || this.markers.height !== source.height) {this.markers.width = source.width; this.markers.height = source.height;}
            const ctx = this.markers.getContext('2d'); ctx.clearRect(0, 0, source.width, source.height);
            const match = this.state?.match;
            const scale = this.game.renderer.scale, camera = this.game.camera;
            const project = point => ({x: (point.x * 16 - camera.x) * scale, y: (point.y * 16 - camera.y) * scale});
            const keeper = this.state?.keeper;
            this.keeperPrompt.hidden = !this.canTalkToKeeper();
            if (this.keeperActor) this.keeperActor.hidden = this.keeperPrompt.hidden;
            if (!this.keeperPrompt.hidden) {
                const point = project(keeper);
                Object.assign(this.keeperPrompt.style, {left: (point.x + 8 * scale) * this.root.clientWidth / source.width + 'px',
                    top: (point.y - 8 * scale) * this.root.clientHeight / source.height + 'px'});
                if (this.keeperActor) Object.assign(this.keeperActor.style, {left: (point.x + 8 * scale) * this.root.clientWidth / source.width + 'px',
                    top: (point.y + 16 * scale) * this.root.clientHeight / source.height + 'px',
                    width: 16 * scale * this.root.clientWidth / source.width + 'px', height: 16 * scale * this.root.clientHeight / source.height + 'px'});
            }
            const venue = this.showLayout && this.view === 'author' && this.opened ? this.venue(this.authorVenue || 'town-green')
                : match && ['countdown', 'playing'].includes(match.phase) ? this.venue(match.venueId) : null;
            if (!venue) return;
            const p = project(venue.area); ctx.strokeStyle = '#f6d980'; ctx.lineWidth = Math.max(1, scale); ctx.setLineDash([scale * 4, scale * 3]);
            ctx.strokeRect(p.x, p.y, venue.area.w * 16 * scale, venue.area.h * 16 * scale); ctx.setLineDash([]);
            if (match?.modeId === 'checkpoint' && venue.checkpoints) {
                const member = match.members.find(entry => entry.id === this.state.me.id);
                for (const [index, point] of venue.checkpoints.entries()) {
                    const loc = project(point), done = index < member.progress, current = index === member.progress;
                    ctx.fillStyle = done ? '#75cba555' : current ? '#f6d98066' : '#e4d0b622';
                    ctx.fillRect(loc.x, loc.y, 16 * scale, 16 * scale); ctx.strokeStyle = done ? '#75cba5' : '#f6d980'; ctx.lineWidth = scale;
                    ctx.strokeRect(loc.x, loc.y, 16 * scale, 16 * scale);
                    ctx.font = Math.round(10 * scale) + 'px GraphicPixel'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff4d9';
                    ctx.fillText(String(index + 1), loc.x + 8 * scale, loc.y + 11 * scale);
                }
            }
            if (match?.modeId === 'laststand') for (const id of match.mobIds) {
                const mob = this.game.entities[id];
                if (!mob || mob.isDead) continue;
                const loc = project({x: mob.x / 16, y: mob.y / 16});
                ctx.strokeStyle = '#f6d980'; ctx.lineWidth = scale;
                ctx.strokeRect(loc.x, loc.y, 16 * scale, 16 * scale);
                ctx.font = Math.round(7 * scale) + 'px GraphicPixel'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff4d9';
                ctx.fillText('WAVE', loc.x + 8 * scale, loc.y - 5 * scale);
            }
        }
    }

    const profile = SocialChat.prototype.profile;
    SocialChat.prototype.profile = function (player) {
        profile.call(this, player);
        const workshop = this.app.gameModes;
        const target = workshop?.state?.people.find(person => !person.demo && person.name === player.label);
        if (!target) return;
        const action = button('Play together', () => {this.closeProfile(); this.app.hideChat(); workshop.target = target; workshop.open(workshop.state.match ? 'invite-players' : 'activities');}, 'sc-primary');
        this.panel.querySelector('.sc-profile-card')?.append(action);
    };
    return ModesWorkshop;
});

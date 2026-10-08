define(['jquery', 'mapnames'], function ($, mapNames) {
    function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined && text !== null) element.textContent = String(text);
        return element;
    }
    function button(text, action, primary) {
        const element = node('button', primary ? 'ev-primary' : 'ev-button', text);
        element.type = 'button'; element.addEventListener('click', action);
        return element;
    }
    function visibleEvents(events, map, now) {
        return events.filter(event => event.isCompetition !== false && event.status === 'live' && Array.isArray(event.maps) && event.maps.includes(map) && Date.parse(event.startsAt) <= now && Date.parse(event.endsAt) > now);
    }
    function safeDetailsUrl(base, path) {
        try {
            const url = new URL(base);
            if (!['https:', 'http:'].includes(url.protocol) || !/^\/events\/[a-f\d-]{36}$/i.test(path)) return null;
            url.pathname = path; url.search = ''; url.hash = '';
            return url.href;
        } catch (error) {return null;}
    }
    function selectionLabel(value, all) {
        return (Array.isArray(value) ? value : [value]).map(entry => entry === '*' ? all : entry).join(', ');
    }
    function ruleLabel(rule) {
        const target = rule.targetLabel || selectionLabel(rule.target, 'All targets');
        const activity = {kill: 'Defeat', loot: 'Collect', pvp: 'PvP victories', fishing: 'Catch fish', playtime: 'Active playtime', activeDays: 'Active days', tile: selectionLabel(rule.stage || '*', 'Tile actions')}[rule.type] || rule.type;
        const unit = rule.type === 'activeDays' ? 'active day' : rule.measurement === 'activeSeconds' ? 'active second' : rule.measurement === 'quantity' ? 'item' : 'action';
        return activity + (rule.type === 'playtime' || rule.type === 'activeDays' ? '' : ' · ' + target) + (rule.lake && rule.lake !== '*' ? ' · ' + rule.lake : '') + (rule.action && rule.action !== '*' ? ' · ' + selectionLabel(rule.action, 'Any tile action') : '') + ' — ' + rule.points + (rule.points === 1 ? ' point per ' : ' points per ') + unit;
    }

    class EventBoard {
        constructor(app) {
            this.app = app; this.live = []; this.events = []; this.offset = 0;
            this.tab = 'upcoming'; this.selected = null; this.panelRun = null;
            this.opened = false; this.minimized = false; this.pending = false; this.joining = false;
            this.lastLive = 0; this.lastBoard = 0; this.mapId = null; this.disabled = false;
            this.root = node('div', 'game-events');
            this.board = node('section', 'ev-board'); this.board.hidden = true;
            this.board.setAttribute('role', 'dialog'); this.board.setAttribute('aria-modal', 'true'); this.board.setAttribute('aria-label', 'Town event board');
            this.panel = node('aside', 'ev-live'); this.panel.hidden = true; this.panel.setAttribute('aria-label', 'Active event standings');
            this.root.append(this.board, this.panel); document.body.append(this.root);
            this.root.addEventListener('click', event => event.stopPropagation());
            document.addEventListener('keydown', event => this.keyboard(event), true);
            this.timer = setInterval(() => this.tick(), 1000);
        }

        nearBoard() {
            const game = this.app.game, player = game.player;
            return !!player && (game.map?.eventBoards || []).some(board => Math.max(board.x - player.gridX, 0, player.gridX - board.x - board.w + 1) + Math.max(board.y - player.gridY, 0, player.gridY - board.y - board.h + 1) <= 1);
        }

        now() {return Date.now() + this.offset;}

        tick() {
            const game = this.app.game;
            if (this.disabled || !game.started || !game.client?.connection?.connected || game.player?.isDead) {
                this.panel.hidden = true; if (this.opened) this.close(); return;
            }
            if (this.mapId !== game.mapId) {
                this.mapId = game.mapId; this.live = []; this.lastLive = 0; this.panelRun = null;
                if (this.opened) this.close();
            }
            if (this.opened && !this.nearBoard()) this.close();
            this.live = visibleEvents(this.live, game.mapId, this.now());
            this.renderPanel();
            if (!this.pending && Date.now() - this.lastLive >= 15000) this.loadLive();
            if (this.opened && !this.joining && Date.now() - this.lastBoard >= 15000) this.loadBoard();
        }

        async loadLive() {
            this.pending = true; this.lastLive = Date.now(); const map = this.app.game.mapId;
            try {
                const response = await axios.get('/session/' + encodeURIComponent(this.app.sessionId) + '/events/live');
                if (this.disabled || this.app.game.mapId !== map) return;
                this.offset = Date.parse(response.data.serverTime) - Date.now();
                if (!Number.isFinite(this.offset)) this.offset = 0;
                this.website = response.data.websiteUrl;
                this.live = visibleEvents(response.data.events || [], map, this.now());
                this.renderPanel();
            } catch (error) {
                // A stale score is not presented as current after a failed refresh.
                this.live = []; this.renderPanel();
            } finally {this.pending = false;}
        }

        async open() {
            if (!this.nearBoard()) return;
            this.opener = document.activeElement; this.opened = true; this.confirming = null; this.error = null; this.notice = null;
            this.app.hideChat(); this.app.game.keyboardHandler?.handleBlur?.();
            this.board.hidden = false; this.root.classList.add('ev-open'); this.renderBoard('Loading events…'); this.board.querySelector('button')?.focus();
            await this.loadBoard();
        }

        close() {
            this.opened = false; this.board.hidden = true; this.root.classList.remove('ev-open'); this.confirming = null;
            this.opener?.focus?.(); this.opener = null;
        }

        async loadBoard() {
            this.lastBoard = Date.now();
            try {
                const response = await axios.get('/session/' + encodeURIComponent(this.app.sessionId) + '/events');
                if (!this.opened || !this.nearBoard()) return;
                this.website = response.data.websiteUrl;
                this.offset = Date.parse(response.data.serverTime) - Date.now();
                if (!Number.isFinite(this.offset)) this.offset = 0;
                this.events = (response.data.events || []).filter(event => Date.parse(event.endsAt) > this.now());
                if (this.confirming) {
                    const pending = this.events.find(event => event.runId === this.confirming);
                    if (!pending || !(this.action === 'join' ? pending.canJoin : pending.canWithdraw)) {
                        this.confirming = null; this.accepted = false;
                    }
                }
                this.error = null; this.renderBoard();
            } catch (error) {
                if (!this.opened) return;
                this.error = error.response?.data?.error || 'Events are temporarily unavailable.';
                this.renderBoard();
            }
        }

        keyboard(event) {
            if (!this.opened && !this.root.contains(event.target)) return;
            if (event.key === 'Escape') {event.preventDefault(); this.close();}
            if (this.opened && event.key === 'Tab') {
                const controls = Array.from(this.board.querySelectorAll('button,a,input,select')).filter(control => !control.disabled && !control.hidden);
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
                else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
            }
            // Prevent game/chat shortcuts; preserve native button, input and Tab behavior.
            event.stopImmediatePropagation();
        }

        detailsLink(event, text) {
            const url = safeDetailsUrl(this.website, event.detailsPath);
            if (!url) return null;
            const link = node('a', 'ev-button', text); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
            return link;
        }

        renderBoard(message) {
            const focusKey = this.board.contains(document.activeElement) ? document.activeElement.dataset.focus : null;
            const scroll = this.board.querySelector('.ev-content')?.scrollTop || 0;
            this.board.replaceChildren();
            const header = node('header', 'ev-header'); const title = node('div'); title.append(node('small', '', 'TOWN NOTICE BOARD'), node('h2', '', 'Find your next event'));
            const close = button('×', () => this.close()); close.setAttribute('aria-label', 'Close event board'); close.dataset.focus = 'close'; header.append(title, close); this.board.append(header);
            const tabs = node('nav', 'ev-tabs'); tabs.setAttribute('aria-label', 'Event lists');
            for (const [id, label] of [['upcoming', 'Coming up'], ['live', 'Live now'], ['mine', 'My events']]) {
                const tab = button(label, () => {this.tab = id; this.selected = null; this.confirming = null; this.renderBoard(); this.board.querySelector('[data-focus="tab-'+id+'"]')?.focus();});
                tab.classList.toggle('ev-selected', this.tab === id); tab.setAttribute('aria-pressed', String(this.tab === id)); tab.dataset.focus = 'tab-'+id; tabs.append(tab);
            }
            this.board.append(tabs);
            if (message || this.error) {const status = node('div', 'ev-empty', message || this.error); status.setAttribute('role', this.error ? 'alert' : 'status'); this.board.append(status); if (this.error) status.append(button('Try again', () => this.loadBoard())); this.board.querySelector('[data-focus="close"]')?.focus(); return;}
            const events = this.events.filter(event => Date.parse(event.endsAt) > this.now() && (this.tab === 'mine' ? event.signedUp : this.tab === 'live' ? Date.parse(event.startsAt) <= this.now() : Date.parse(event.startsAt) > this.now()));
            const body = node('div', 'ev-body'); const list = node('aside', 'ev-list'); list.setAttribute('aria-label', 'Choose an event');
            const selected = events.find(event => event.runId === this.selected) || events[0]; this.selected = selected?.runId || null;
            for (const event of events) {
                const choice = button('', () => {this.selected = event.runId; this.confirming = null; this.notice = null; this.renderBoard(); this.board.querySelector('[data-focus="event-'+event.runId+'"]')?.focus();});
                choice.className = 'ev-event'+(event === selected ? ' ev-selected' : ''); choice.dataset.focus = 'event-'+event.runId;
                choice.setAttribute('aria-pressed', String(event === selected));
                choice.append(node('small', 'ev-gold', event.signedUp ? 'SIGNED UP' : event.status === 'live' ? 'LIVE NOW' : this.date(event.startsAt)), node('strong', '', event.name), node('small', '', this.maps(event) + ' · ' + (event.isCompetition === false ? 'Community event' : event.teams.length ? 'Teams' : 'Solo'))); list.append(choice);
            }
            if (!events.length) list.append(node('p', 'ev-empty', this.tab === 'mine' ? 'No sign-ups yet.' : 'No events to show here.'));
            body.append(list); this.board.append(body);
            if (selected) body.append(this.renderDetails(selected));
            else {const empty = node('section', 'ev-empty'); empty.append(node('h3', '', this.tab === 'mine' ? 'Your next adventure awaits' : 'More adventures on the way'), node('p', '', this.tab === 'mine' ? 'Choose an upcoming event to sign up.' : 'Check the town board again later.')); body.append(empty);}
            const content = this.board.querySelector('.ev-content'); if (content) content.scrollTop = scroll;
            if (focusKey) Array.from(this.board.querySelectorAll('[data-focus]')).find(control => control.dataset.focus === focusKey)?.focus();
        }

        date(value) {return new Date(value).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});}
        maps(event) {return event.maps.map(map => mapNames[map] || map).join(', ') || 'All maps';}

        renderDetails(event) {
            const detail = node('section', 'ev-detail'); const content = node('div', 'ev-content');
            content.append(node('small', 'ev-gold', event.status === 'live' ? 'LIVE NOW' : 'COMING UP'), node('h3', 'ev-title', event.name), node('p', '', event.description));
            const facts = node('div', 'ev-facts');
            for (const [label, value] of [['When', this.date(event.startsAt)+' – '+this.date(event.endsAt)], ['Where', this.maps(event)+(event.locationDescription ? ' · '+event.locationDescription : '')], ['Format', event.isCompetition === false ? 'Community event' : (event.groupBy === 'wallet' ? 'Per player' : 'Per Looper')+' · '+(event.teams.length ? 'Teams' : 'Solo')]]) {const fact = node('div'); fact.append(node('small', '', label), node('strong', '', value)); facts.append(fact);} content.append(facts);
            if (event.isCompetition === false) {
                content.append(node('p', 'ev-muted', 'See the event description for attendance, prizes and RSVP instructions.'));
                detail.append(content);
                const footer = node('footer', 'ev-footer');
                footer.append(node('small', '', 'Community event · In-game scoring and sign-up are not configured.'));
                detail.append(footer);
                return detail;
            }
            if (event.signedUp) {const team = event.teams.find(team => team.id === event.teamId); content.append(node('p', 'ev-success', 'You’re signed up.'+(team ? ' Team: '+team.name+'.' : event.teams.length ? ' Your organizer will assign your team.' : '')));}
            content.append(node('h4', '', 'How to score')); for (const rule of event.rules) content.append(node('p', 'ev-rule', ruleLabel(rule)));
            content.append(node('p', 'ev-muted', event.scoringMaps.length ? 'Only activity on these maps counts: '+event.scoringMaps.map(map => mapNames[map] || map).join(', ')+'.' : 'Qualifying activity counts across all maps.'));
            if (event.dailyCap || event.milestone || event.communityGoal) content.append(node('p', 'ev-muted', [event.dailyCap ? 'Daily cap: '+event.dailyCap+' points (UTC)' : null, event.milestone ? 'Milestone: '+event.milestone+' points' : null, event.communityGoal ? 'Community goal: '+event.communityScore+' / '+event.communityGoal : null].filter(Boolean).join(' · ')));
            if (event.teams.length) {content.append(node('h4', '', 'Teams & sign-up'), node('p', '', event.assignment === 'manual' ? 'Sign up now. The organizer assigns your team before the round starts.' : 'You are assigned to the smaller team when you sign up.')); const teams = node('div', 'ev-teams'); for (const team of event.teams) {const chip = node('span', '', team.name); if (/^#[a-f\d]{6}$/i.test(team.color)) chip.style.borderColor = team.color; teams.append(chip);} content.append(teams);}
            if (event.equipment) {const equipment = event.equipment; content.append(node('h4', '', 'Equipment & levels'), node('p', '', [equipment.teamEquipment ? 'Equipment is assigned by team.' : equipment.sharedEquipment ? 'Event equipment is available to every signed-up player.' : null, equipment.avatarAvailable ? 'An event avatar is available.' : null, equipment.weaponAvailable ? 'An event weapon is available.' : null, equipment.avatarLevel ? 'Avatar level '+equipment.avatarLevel+'.' : null, equipment.weaponLevel ? 'Weapon level '+equipment.weaponLevel+'.' : null, 'Applies during the round on its linked maps. Your normal levels return outside the event.'].filter(Boolean).join(' ')));}
            content.append(node('h4', '', 'Prizes')); if (!event.prizes.length) content.append(node('p', 'ev-muted', 'No prizes configured.'));
            for (const prize of event.prizes) {const reward = node('p', 'ev-reward'); reward.append(node('strong', '', prize.label), node('span', '', (prize.awardTo === 'winningTeam' ? 'Winning team contributors' : prize.awardTo === 'milestone' ? 'Milestone achievers' : 'Rank '+prize.rankFrom+(prize.rankTo !== prize.rankFrom ? '–'+prize.rankTo : ''))+' · '+(prize.delivery === 'inventory' ? prize.quantity+' × '+(prize.itemLabel || prize.item)+' · Automatic in-game delivery after finalization' : 'Delivered manually by the organizer'))); content.append(reward);}
            content.append(node('p', 'ev-muted', (event.registrationRequired ? 'Only activity after sign-up counts. ' : 'No sign-up needed; qualifying activity counts automatically. ')+(event.groupBy === 'wallet' ? 'One score across your Loopers. ' : 'Each Looper has its own score. ')+'Ties use the last scoring time, then participant ID. Results can finalize after '+Math.ceil(event.graceSeconds/60)+' minutes for queued activity.'));
            if (event.status === 'live') {content.append(node('h4', '', 'Live standings')); this.standings(content, event);}
            const confirm = this.confirming === event.runId;
            if (confirm) {const confirmation = node('div', 'ev-confirm'); confirmation.append(node('h4', '', this.action === 'withdraw' ? 'Withdraw from this round?' : 'Join '+event.name+'?')); const label = node('label'); const check = node('input'); check.type = 'checkbox'; check.checked = !!this.accepted; check.dataset.focus = 'accept'; check.addEventListener('change', () => {this.accepted = check.checked; const submit = detail.querySelector('[data-focus="submit"]'); if (submit) submit.disabled = !this.accepted || this.joining;}); label.append(check, node('span', '', this.action === 'withdraw' ? 'Remove my entry and team assignment for this round.' : 'I’ve read the competition rules and want to take part.')); confirmation.append(label); content.append(confirmation);}
            detail.append(content); const footer = node('footer', 'ev-footer'); footer.append(node('small', '', this.notice || (event.registrationRequired ? event.participants+' signed up · All sign-up times are for this round.' : 'No sign-up needed. Play to take part.')));
            footer.querySelector('small')?.setAttribute('role', 'status');
            if (confirm) {footer.append(button('Back', () => {this.confirming = null; this.renderBoard(); this.board.querySelector('[data-focus="signup"]')?.focus();})); const submit = button(this.joining ? 'Saving…' : this.action === 'withdraw' ? 'Withdraw' : 'Confirm sign-up', () => this.register(event), true); submit.disabled = !this.accepted || this.joining; submit.dataset.focus = 'submit'; footer.append(submit);}
            else if (event.canJoin || event.canWithdraw) {const action = event.canJoin ? 'join' : 'withdraw'; const trigger = button(action === 'join' ? 'Sign up for event' : 'Withdraw sign-up', () => {this.confirming = event.runId; this.action = action; this.accepted = false; this.renderBoard(); this.board.querySelector('[data-focus="accept"]')?.focus();}, action === 'join'); trigger.dataset.focus = 'signup'; footer.append(trigger);}
            else if (event.registrationRequired && !event.signedUp) footer.append(node('strong', 'ev-muted', 'Sign-ups closed'));
            const link = this.detailsLink(event, 'Full event page'); if (link && !confirm) footer.append(link); detail.append(footer); return detail;
        }

        async register(event) {
            if (!this.accepted || this.joining || !this.nearBoard()) return;
            const action = this.action;
            this.joining = true; this.notice = null; this.renderBoard();
            try {await axios.post('/session/'+encodeURIComponent(this.app.sessionId)+'/events/'+event.id+'/'+event.runId+'/'+action, {confirmed: true}); if (this.confirming === event.runId) this.confirming = null; this.notice = action === 'withdraw' ? 'Your sign-up for '+event.name+' has been withdrawn.' : 'You’re signed up for '+event.name+'.'; await this.loadBoard(); this.lastLive = 0;}
            catch (error) {this.notice = error.response?.data?.error || 'Sign-up could not be confirmed. Refresh the board before trying again.'; await this.loadBoard();}
            finally {this.joining = false; if (this.opened) {this.renderBoard(); (this.board.querySelector('[data-focus="signup"]') || this.board.querySelector('[data-focus="close"]'))?.focus();}}
        }

        standings(container, event) {
            if (event.teams.length) for (const team of event.teams) {const row = node('div', 'ev-row'); row.append(node('strong', '', team.name), node('span', '', team.score+' points')); container.append(row);}
            if (!event.leaderboard.length) container.append(node('p', 'ev-muted', 'No scores yet. Be the first to take part.'));
            for (const player of event.leaderboard) {const row = node('div', 'ev-row'+(player.isYou ? ' ev-you' : '')); row.append(node('span', '', '#'+player.rank+' '+player.label), node('strong', '', player.score)); container.append(row);}
        }

        renderPanel() {
            const events = visibleEvents(this.live, this.app.game.mapId, this.now()); this.panel.hidden = this.opened || !events.length;
            if (!events.length) return;
            const focusKey = this.panel.contains(document.activeElement) ? document.activeElement.dataset.focus : null;
            const event = events.find(event => event.runId === this.panelRun) || events[0]; this.panelRun = event.runId;
            const signature = JSON.stringify([event, events.map(value => [value.runId, value.name]), this.minimized, this.website]);
            const select = this.panel.querySelector('[data-focus="event-select"]');
            // Keep the native dropdown intact during countdown ticks and while choosing.
            // Fresh scores can render on blur; a confirmed event change renders immediately.
            if (signature === this.panelSignature || (select && document.activeElement === select && this.renderedPanelRun === event.runId && !this.minimized)) {
                this.updatePanelTimer(event);
                return;
            }
            this.panelSignature = signature; this.renderedPanelRun = event.runId;
            this.panel.replaceChildren();
            if (this.minimized) {const open = button(event.name+' · Open', () => {this.minimized = false; this.renderPanel();}); open.dataset.focus = 'minimize'; this.panel.append(open); return;}
            const header = node('header', 'ev-header'); header.append(node('strong', '', event.name)); const minimize = button('−', () => {this.minimized = true; this.renderPanel(); this.panel.querySelector('button')?.focus();}); minimize.dataset.focus = 'minimize'; minimize.setAttribute('aria-label', 'Minimize event panel'); header.append(minimize); this.panel.append(header);
            const content = node('div', 'ev-panel-content');
            if (events.length > 1) {const select = node('select'); select.setAttribute('aria-label', 'Choose active event'); select.dataset.focus = 'event-select'; for (const value of events) {const option = node('option', '', value.name); option.value = value.runId; option.selected = value === event; select.append(option);} select.addEventListener('change', () => {this.panelRun = select.value; this.renderPanel();}); content.append(select);}
            content.append(node('p', 'ev-timer'));
            const team = event.teams.find(team => team.id === event.teamId);
            content.append(node('p', 'ev-score', event.registrationRequired && !event.signedUp ? 'You’re not signed up.' : (event.myScore ? 'Your rank #'+event.myScore.rank+' · '+event.myScore.score+' points' : 'Your score: 0 points')+(team ? ' · '+team.name : event.teams.length && event.signedUp ? ' · Team pending' : '')));
            this.standings(content, event);
            content.append(node('p', 'ev-muted', event.rules.map(ruleLabel).join(' · ')));
            if (event.prizes.length) content.append(node('p', 'ev-muted', 'Prizes: '+event.prizes.map(prize => prize.label).join(' · ')));
            const link = this.detailsLink(event, 'Full standings & rules'); if (link) {link.dataset.focus = 'details'; content.append(link);} this.panel.append(content);
            this.updatePanelTimer(event);
            if (focusKey) Array.from(this.panel.querySelectorAll('[data-focus]')).find(control => control.dataset.focus === focusKey)?.focus();
        }

        updatePanelTimer(event) {
            const timer = this.panel.querySelector('.ev-timer');
            if (!timer) return;
            const remaining = Math.max(0, Math.ceil((Date.parse(event.endsAt)-this.now())/1000));
            timer.textContent = 'LIVE · '+(remaining >= 3600 ? Math.floor(remaining/3600)+'h ' : '')+Math.floor(remaining%3600/60)+'m '+remaining%60+'s left';
        }

        disconnect() {this.disabled = true; clearInterval(this.timer); this.live = []; this.panel.hidden = true; this.close();}
    }
    EventBoard.visibleEvents = visibleEvents; EventBoard.safeDetailsUrl = safeDetailsUrl; EventBoard.ruleLabel = ruleLabel;
    return EventBoard;
});

/* Player and equipped-item cards. Authoritative state never waits for animation. */
define(['equipmenticon'], function (EquipmentIcon) {
    const node = (tag, cls, text) => {
        const el = document.createElement(tag); if (cls) el.className = cls;
        if (text != null) el.textContent = text; return el;
    };
    const button = (text, click, cls = '') => {
        const el = node('button', cls, text); el.type = 'button'; el.addEventListener('click', click); return el;
    };
    const titleCase = text => String(text || '').replace(/(^|[_ -])\w/g, s => s.replace('_', ' ').toUpperCase());
    class ProgressionCards {
        constructor(app, game) {
            this.app = app; this.game = game; this.cards = {}; this.previous = null; this.opened = new Set();
            this.temporary = new Set(); this.random = Math.random; this.xpBaselines = new Map();
            this.timers = new Set(); this.animations = new Set(); this.busy = false;
            this.root = node('div', 'progression-cards'); this.root.hidden = true;
            this.deck = node('div', 'lc-deck'); this.deck.setAttribute('aria-label', 'Player and weapon info cards');
            this.effects = node('div', 'lc-effects'); this.effects.setAttribute('aria-hidden', 'true');
            this.root.append(this.deck, this.effects); document.body.append(this.root);
            this.status = node('p', 'lc-status lc-sr-only'); this.status.setAttribute('role', 'status');
            this.root.append(this.status);
            for (const event of ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'wheel']) this.root.addEventListener(event, e => e.stopPropagation());
            this.root.addEventListener('keydown', e => {if (['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.stopPropagation();});
            this.onKey = e => {if (e.key === 'Escape') {this.closeAll(); this.cancel();}};
            document.addEventListener('keydown', this.onKey);
            this.onVisibility = () => {
                if (document.hidden) {this.cancel(); this.previous = null; this.xpBaselines.clear();}
                else this.lastRefresh = 0;
            };
            document.addEventListener('visibilitychange', this.onVisibility);
            this.onPageHide = () => this.destroy();
            window.addEventListener('pagehide', this.onPageHide, {once: true});
            this.interval = setInterval(() => this.tick(), 180);
        }
        destroy() {
            if (this.destroyed) return;
            this.destroyed = true; clearInterval(this.interval); this.cancel();
            document.removeEventListener('keydown', this.onKey);
            document.removeEventListener('visibilitychange', this.onVisibility);
            window.removeEventListener('pagehide', this.onPageHide);
            if (this.projectiles && this.projectileParent) this.projectileParent.append(this.projectiles);
            if (this.buff && this.buffParent) this.buffParent.append(this.buff);
            this.root.remove();
        }
        context() {return this.game.sessionId + ':' + this.game.mapId;}
        ensureContext() {
            const key = this.context();
            if (this.key === key) return;
            this.closeAll(); this.cancel(); this.previous = null; this.stats = null;
            this.xpBaselines.clear(); this.key = key; this.modifiers = null; this.modifiersFailed = false;
        }
        quiet() {return this.app.settings.getReducedMotion() || !this.app.settings.getCombatEffectsEnabled() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
        later(ms, fn) {
            const id = setTimeout(() => {this.timers.delete(id); fn();}, ms); this.timers.add(id); return id;
        }
        jitter(min = 0, max = 24) {return this.quiet() ? 0 : min + this.random() * (max - min);}
        animate(el, frames, duration, delay = 0, easing = 'cubic-bezier(.22,.7,.2,1)', fill = 'backwards') {
            if (this.quiet() || !el?.isConnected) return;
            const anim = el.animate(frames, {duration, delay, easing, fill});
            this.animations.add(anim); anim.finished.catch(() => {}).finally(() => this.animations.delete(anim)); return anim;
        }
        cancel({restoreVisibility = true} = {}) {
            for (const id of this.timers) clearTimeout(id); this.timers.clear();
            for (const anim of this.animations) anim.cancel(); this.animations.clear();
            this.effects.replaceChildren(); this.busy = false;
            if (restoreVisibility) {
                for (const type of this.temporary) {this.opened.delete(type); this.cards[type].el.hidden = true;}
                this.temporary.clear();
            }
            for (const [type, card] of Object.entries(this.cards)) {
                card.fill.style.transition = ''; card.exitAnimation?.cancel(); card.exitAnimation = null;
                card.el.classList.remove('lc-charged'); card.banner.hidden = true; card.note.textContent = ''; card.delta.textContent = '';
                if (this.stats) this.renderCard(type);
            }
        }
        tick() {
            if (this.destroyed) return;
            const active = this.game.started && !this.game.isStopped && this.game.player && !this.game.player.isDead;
            if (!active) {
                if (!this.root.hidden) {this.closeAll(); this.cancel(); this.previous = null; this.xpBaselines.clear();}
                this.root.hidden = true; return;
            }
            this.root.hidden = false; this.ensureContext();
            if (this.stats) this.position();
            // One cached statistics read also catches XP from farming and other
            // awards that have no client reward event. Never overlap fallback reads.
            if (!document.hidden && !this.refreshing && Date.now() - (this.lastRefresh || 0) >= 2000) {
                this.lastRefresh = Date.now(); this.refreshing = true;
                Promise.resolve(this.game.renderStatistics()).finally(() => {this.refreshing = false;});
            }
        }
        captureXp(assets) {
            const gains = [], active = new Set();
            for (const asset of assets) {
                if (!Number.isFinite(asset.xp) || !asset.id) continue;
                const key = asset.type + ':' + asset.id, previous = this.xpBaselines.get(key);
                active.add(key);
                if (previous !== undefined && asset.xp > previous) gains.push({...asset, amount: asset.xp - previous});
                // A stale lower total must not create a second popup on recovery.
                this.xpBaselines.set(key, Math.max(previous ?? asset.xp, asset.xp));
            }
            for (const key of this.xpBaselines.keys()) if (!active.has(key)) this.xpBaselines.delete(key);
            return gains;
        }
        showXp(assets) {
            for (const gain of this.captureXp(assets)) {
                if (gain.type === 'weapon') continue;
                const label = gain.type === 'avatar' ? 'XP' : titleCase(gain.type) + ' XP';
                this.game.infoManager?.addDamageInfo('+' + gain.amount.toLocaleString('en-US', {maximumFractionDigits: 2}) + ' ' + label,
                    this.game.player.x, this.game.player.y - 15, 'xp', this.game.player.id);
            }
        }
        position() {
            const container = document.getElementById('container').getBoundingClientRect();
            const hud = document.getElementById('bar-container').getBoundingClientRect();
            this.deck.style.right = Math.max(16, innerWidth - container.right + 18) + 'px';
            this.deck.style.bottom = Math.max(92, innerHeight - hud.top + 17) + 'px';
        }
        makeCard(type) {
            const player = type === 'avatar';
            const el = node('article', 'lc-card ' + (player ? 'lc-player' : 'lc-weapon'));
            el.setAttribute('aria-label', player ? 'Player info card' : 'Weapon info card'); el.hidden = true;
            const top = node('header', 'lc-card-top'); top.append(node('span', '', player ? 'Your Looper' : 'Equipped weapon'), button('×', () => this.close(type), 'lc-close'));
            top.lastChild.setAttribute('aria-label', 'Close ' + (player ? 'player' : 'weapon') + ' card');
            const name = node('h2', 'lc-name'); const subtitle = node('p', 'lc-subtitle');
            const front = node('div', 'lc-front');
            const art = node('div', 'lc-art'); const sprite = node('span', 'lc-sprite'); art.append(node('span', 'lc-pedestal'), sprite);
            const line = node('div', 'lc-level-line'); const level = node('strong', 'lc-level');
            const delta = node('span', 'lc-delta'); line.append(node('span', '', 'Level'), level, delta);
            const progressText = node('div', 'lc-progress-text'); const percent = node('span'); progressText.append(node('span', '', 'Level progress'), percent);
            const track = node('div', 'lc-track'); track.setAttribute('role', 'progressbar'); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100');
            const fill = node('span', 'lc-fill'); track.append(fill);
            const facts = node('div', 'lc-facts'); const note = node('p', 'lc-note');
            front.append(art, line, progressText, track, facts, note);
            const back = node('div', 'lc-back'); back.hidden = true;
            back.append(node('h3', '', player ? 'Class modifiers' : 'Weapon details'));
            const details = node('dl', 'lc-details'); back.append(details);
            if (!player) {
                const projectiles = document.getElementById('projectileContainer');
                if (projectiles) {this.projectiles = projectiles; this.projectileParent = projectiles.parentNode; back.append(projectiles);}
            }
            if (player) {
                const buff = document.getElementById('buffInfo');
                if (buff) {this.buff = buff; this.buffParent = buff.parentNode; back.append(buff);}
            }
            const footer = button(player ? 'View class modifiers' : 'View weapon details', () => this.flip(type), 'lc-flip');
            const banner = node('div', 'lc-banner', 'LEVEL UP'); banner.hidden = true;
            el.append(top, name, subtitle, front, back, footer, banner); this.deck.append(el);
            const card = {el, name, subtitle, art, sprite, level, delta, percent, track, fill, facts, note, front, back, details, footer, banner, flipped: false};
            this.cards[type] = card; return card;
        }
        async loadModifiers() {
            const key = this.context();
            try {
                const response = await axios.get('/session/' + this.game.sessionId + '/playerclassmodifiers');
                if (this.destroyed || this.context() !== key) return;
                this.modifiers = response.data; this.modifiersFailed = false;
                if (this.stats) this.renderCard('avatar');
            } catch {
                if (!this.destroyed && this.context() === key) {
                    this.modifiersFailed = true;
                    this.status.textContent = 'Class modifiers could not load. Reopen the player card to retry.';
                    if (this.stats) this.renderCard('avatar');
                }
            }
        }
        renderCard(type) {
            const card = this.cards[type] || this.makeCard(type), player = type === 'avatar';
            const info = player ? this.stats.avatarLevelInfo : this.stats.weaponInfo?.weaponLevelInfo;
            const level = Number(info?.currentLevel) || 1, percent = Math.max(0, Math.min(100, Number(info?.percentage) || 0));
            const gamePlayer = this.game.player, weaponName = gamePlayer.getWeaponName();
            const sprite = player ? gamePlayer.sprite : this.game.sprites['item-' + weaponName];
            const tool = this.stats.weaponInfo?.constructor === 'NFTSpecialItem';
            if (!player) card.el.querySelector('.lc-card-top span').textContent = tool ? 'Equipped tool' : 'Equipped weapon';
            card.track.hidden = !Number.isFinite(Number(info?.percentage)); card.track.previousElementSibling.hidden = card.track.hidden;
            const weaponLabel = typeof AltNames !== 'undefined' ? AltNames.getName(weaponName) : null;
            card.name.textContent = player ? gamePlayer.name : weaponLabel && weaponLabel !== weaponName ? weaponLabel : titleCase(weaponName?.startsWith('NFT_') ? (tool ? 'Equipped tool' : 'Equipped weapon') : weaponName);
            card.subtitle.textContent = player ? titleCase(this.modifiers?.playerClass || this.app.storage.trait || 'Looper') : titleCase(this.stats.weaponInfo?.trait || 'Melee weapon') + ' trait';
            card.level.textContent = level; card.percent.textContent = percent.toFixed(1) + '%';
            card.track.setAttribute('aria-label', (player ? 'Player' : 'Weapon') + ' progress to level ' + (level + 1));
            card.track.setAttribute('aria-valuenow', String(percent)); card.fill.style.transform = 'scaleX(' + percent / 100 + ')';
            card.facts.replaceChildren();
            const facts = player ? [['Class', titleCase(this.modifiers?.playerClass || this.app.storage.trait || 'Looper')], ['Max HP', this.stats.maxHp]] : [['Trait', titleCase(this.stats.weaponInfo?.trait)], ['Next level', level + 1]];
            if (player && Number.isFinite(Number(this.stats.botInfo?.currentLevel))) facts.push(['Companion', 'Lv ' + this.stats.botInfo.currentLevel + ' · ' + Number(this.stats.botInfo.percentage || 0).toFixed(1) + '%']);
            for (const [label, value] of facts) {const fact = node('div'); fact.append(node('span', '', label), node('strong', '', value ?? '—')); card.facts.append(fact);}
            const completeIcon = !player && EquipmentIcon.get(weaponName);
            if (completeIcon) {
                Object.assign(card.sprite.style, completeIcon.style, {
                    width: completeIcon.width + 'px', height: completeIcon.height + 'px',
                    transform: 'scale(' + Math.min(6, 114 / Math.max(completeIcon.width, completeIcon.height)) + ')'
                });
            } else if (sprite) {
                card.sprite.style.backgroundSize = '';
                const width = sprite.width, height = sprite.height;
                card.sprite.style.width = width + 'px'; card.sprite.style.height = height + 'px';
                const url = sprite.getUrlByScale(1); card.sprite.style.backgroundImage = 'url("' + new URL(url, document.baseURI).href + '")';
                card.sprite.style.backgroundPosition = '0px ' + (-(sprite.animationData.idle_down?.row || 0) * height) + 'px';
                card.sprite.style.transform = 'scale(' + Math.min(player ? 3.5 : 6, 114 / Math.max(width, height)) + ')';
            } else if (!player) {
                const icon = this.app.dynamicNFTIconURL[weaponName]?.replace('/3/', '/1/') || new URL('img/1/item-' + weaponName + '.png', document.baseURI).href;
                Object.assign(card.sprite.style, {width: '16px', height: '16px', backgroundSize: '',
                    backgroundImage: 'url("' + icon + '")', backgroundPosition: '0 0', transform: 'scale(6)'});
            }
            card.details.replaceChildren();
            let rows = player ? [['Melee damage', this.modifiers?.meleeDamageDealt], ['Damage taken', this.modifiers?.meleeDamageTaken],
                ['Ranged damage', this.modifiers?.rangedDamageDealt], ['Move speed', this.modifiers?.moveSpeed], ['Attack rate', this.modifiers?.attackRate],
                ['HP regeneration', this.modifiers?.hpRegen], ['Max HP', this.modifiers?.maxHp], ['Enemy attention', this.modifiers?.hate], ['Stealth', this.modifiers?.stealth],
                ['XP gained', this.modifiers?.xp], ['Fishing', this.modifiers?.fishing]] :
                [['Weapon level', level], ['Trait', titleCase(this.stats.weaponInfo?.trait)], ['Progress', percent.toFixed(1) + '%']];
            if (player && !this.modifiers) rows = [['Modifiers', this.modifiersFailed ? 'Unavailable. Reopen to retry.' : 'Loading…']];
            for (const [label, value] of rows) {const row = node('div'); row.append(node('dt', '', label), node('dd', '', value == null ? 'Loading…' : (player && this.modifiers ? '×' : '') + value)); card.details.append(row);}
        }
        open(type, reveal = true, temporary = false, delay = 0) {
            if (!this.stats || !this.game.started || this.game.player.isDead) return;
            const card = this.cards[type] || this.makeCard(type); const wasOpen = this.opened.has(type);
            if (temporary) {if (!wasOpen) this.temporary.add(type);}
            else {this.temporary.delete(type); card.exitAnimation?.cancel(); card.exitAnimation = null;}
            this.opened.add(type); card.el.hidden = false; this.position();
            if (!wasOpen && reveal && !this.quiet()) {
                this.animate(card.el, [{opacity: 0, transform: 'translate(24px,12px) scale(.97)'},
                    {opacity: 1, transform: 'none'}], 300 + this.jitter(0, 30), delay);
            }
            if (innerWidth < 760) card.el.scrollIntoView({block: 'nearest', inline: 'center', behavior: this.quiet() ? 'instant' : 'smooth'});
        }
        close(type) {this.opened.delete(type); if (this.cards[type]) this.cards[type].el.hidden = true; if (this.busy) this.cancel();}
        closeAll() {this.close('avatar'); this.close('weapon');}
        toggle(type, event) {event?.preventDefault(); event?.stopImmediatePropagation(); this.opened.has(type) ? this.close(type) : this.open(type); if (type === 'avatar' && this.opened.has(type)) this.loadModifiers(); return false;}
        flip(type, manual = true) {
            const card = this.cards[type];
            if (manual && type === 'avatar') this.loadModifiers();
            if (manual) {this.temporary.delete(type); card.exitAnimation?.cancel(); card.exitAnimation = null;} card.flipped = !card.flipped;
            card.front.hidden = card.flipped; card.back.hidden = !card.flipped;
            card.footer.textContent = card.flipped ? 'Back to card' : type === 'avatar' ? 'View class modifiers' : 'View weapon details';
            this.animate(card.el, [{transform: 'perspective(900px) rotateY(-10deg)', opacity: .4}, {transform: 'perspective(900px) rotateY(0deg)', opacity: 1}], 260);
        }
        origin() {
            const player = this.game.player, renderer = this.game.renderer, canvas = renderer.canvas;
            const rect = canvas.getBoundingClientRect();
            return {x: rect.left + (player.x - renderer.camera.x + 8) * renderer.scale * rect.width / canvas.width,
                y: rect.top + (player.y - renderer.camera.y + 1) * renderer.scale * rect.height / canvas.height};
        }
        motes(type) {
            if (this.quiet()) return;
            const from = this.origin(), rect = this.cards[type].track.getBoundingClientRect();
            const to = {x: rect.left + rect.width * .6, y: rect.top + rect.height / 2};
            for (let i = 0; i < 18; i++) {
                const mote = node('i', 'lc-mote ' + (type === 'weapon' ? 'lc-blue' : ''));
                Object.assign(mote.style, {left: from.x + 'px', top: from.y + 'px'}); this.effects.append(mote);
                const dx = to.x - from.x, dy = to.y - from.y;
                this.animate(mote, [{opacity: 0, transform: 'translate(0,0) scale(.5)', offset: 0},
                    {opacity: 1, offset: .12},
                    {opacity: 1, transform: `translate(${dx * .45 + this.jitter(-12, 12)}px,${dy * .5 - 36 - this.jitter(0, 18)}px) scale(1.1)`, offset: .5},
                    {opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.45)`, offset: 1}], 480 + this.jitter(0, 80), i * 14 + this.jitter(0, 22), 'linear');
            }
        }
        burst(type) {
            if (this.quiet()) return;
            const rect = this.cards[type].art.getBoundingClientRect(); const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
            for (let i = 0; i < 44; i++) {
                const spark = node('i', 'lc-spark'); spark.style.width = spark.style.height = (i % 6 === 0 ? 8 : i % 2 === 0 ? 5 : 3) + 'px'; spark.style.left = x + 'px'; spark.style.top = y + 'px'; this.effects.append(spark);
                const angle = i / 44 * Math.PI * 2 + this.jitter(-.06, .06), distance = 90 + i % 5 * 19;
                this.animate(spark, [{opacity: 0, transform: 'translate(0,0) scale(2)'}, {opacity: 1, offset: .08},
                    {opacity: 0, transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance}px) scale(.4)`}], 580 + this.jitter(0, 130), i * 3 + this.jitter(0, 22));
            }
        }
        returnToHud(type) {
            const card = this.cards[type], hud = document.getElementById(type === 'avatar' ? 'armor' : 'weapon');
            if (!this.quiet() && hud) {
                const clone = card.sprite.cloneNode(true); clone.classList.add('lc-return-icon');
                const source = card.art.getBoundingClientRect(), dest = hud.getBoundingClientRect();
                Object.assign(clone.style, {position: 'fixed', left: source.left + source.width / 2 + 'px', top: source.top + source.height / 2 + 'px', transformOrigin: 'center'});
                this.effects.append(clone);
                const dx = dest.left + dest.width / 2 - source.left - source.width / 2, dy = dest.top + dest.height / 2 - source.top - source.height / 2;
                const flight = this.animate(clone, [{transform: 'translate(-50%,-50%) scale(3)', opacity: .9},
                    {transform: `translate(calc(-50% + ${dx * .5}px),calc(-50% + ${dy * .5 - 18}px)) scale(1.8)`, opacity: 1, offset: .5},
                    {transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.6)`, opacity: 0}], 380, 0, 'cubic-bezier(.22,.7,.2,1)', 'forwards');
                // A finished animation must never reveal the sprite clone again.
                flight?.finished.then(() => clone.remove(), () => clone.remove());
            }
            this.later(340, () => this.animate(hud, [{filter: 'brightness(2)'}, {filter: 'brightness(1)'}], 260));
        }
        update(statistics) {
            if (this.destroyed) return;
            this.ensureContext();
            const old = this.previous; this.stats = statistics;
            const assets = statistics.experience || [];
            if (!document.hidden && this.game.started && !this.game.player.isDead) this.showXp(assets);
            else this.captureXp(assets);
            const levels = {avatar: Number(statistics.avatarLevelInfo?.currentLevel), weapon: Number(statistics.weaponInfo?.weaponLevelInfo?.currentLevel),
                avatarId: assets.find(asset => asset.type === 'avatar')?.id ?? this.game.sessionId,
                weaponId: statistics.weaponInfo?.assetId ?? this.game.player.getWeaponName(),
                avatarPercent: Number(statistics.avatarLevelInfo?.percentage) || 0, weaponPercent: Number(statistics.weaponInfo?.weaponLevelInfo?.percentage) || 0};
            if (old && old.weaponId !== levels.weaponId) this.cancel();
            const targets = ['avatar', 'weapon'].filter(type => !document.hidden && this.game.started && !this.game.player.isDead && old && old[type + 'Id'] === levels[type + 'Id'] && Number.isInteger(old[type]) && old[type] > 0 &&
                Number.isInteger(levels[type]) && levels[type] > old[type]);
            this.previous = levels;
            if (!this.busy || targets.length) {this.renderCard('avatar'); this.renderCard('weapon');}
            if (targets.length) this.sequence(targets, old);
        }
        sequence(targets, old) {
            // Keep ownership across overlapping awards: an auto-opened card never
            // becomes a manually opened card merely because another award arrived.
            this.cancel({restoreVisibility: false}); this.busy = true;

            const timeline = targets.map((type, index) => ({type, offset: this.quiet() ? 0 : index * 85 + this.jitter()}));
            for (const {type, offset} of timeline) {
                this.open(type, true, true, offset); const card = this.cards[type];
                if (card.flipped) this.flip(type, false);
                card.note.textContent = 'Level complete'; card.delta.textContent = old[type] + ' → ' + this.previous[type];
                card.fill.style.transition = 'none'; card.fill.style.transform = 'scaleX(' + (old?.[type + 'Percent'] || 0) / 100 + ')';
                card.percent.textContent = (old?.[type + 'Percent'] || 0).toFixed(1) + '%';
                card.level.textContent = old[type];
                this.later(this.quiet() ? 0 : 110 + offset, () => this.motes(type));
                this.later(this.quiet() ? 60 : 620 + offset, () => {
                    card.fill.style.transition = ''; card.el.classList.add('lc-charged');
                    card.fill.style.transform = 'scaleX(1)'; card.percent.textContent = '100%';
                    if (type === targets[0]) this.game.audioManager?.playSound('loot');
                });
                this.later(this.quiet() ? 120 : 1020 + offset, () => {
                        card.level.textContent = this.previous[type];
                        card.banner.hidden = false; this.burst(type);
                        this.animate(card.el, [{transform: 'none'}, {transform: 'translateY(-3px) scale(1.01)', offset: .35}, {transform: 'none'}], 520);
                        this.animate(card.level, [{opacity: .2, transform: 'translateY(6px) scale(.96)'}, {opacity: 1, transform: 'none'}], 380);
                        this.animate(card.banner, [{opacity: 0, clipPath: 'inset(0 48%)'}, {opacity: 1, clipPath: 'inset(0)'}], 260);
                        if (type === targets[0]) this.game.audioManager?.playSound('achievement');
                });
                this.later(this.quiet() ? 300 : 1390 + offset, () => {
                    card.fill.style.transition = 'none'; card.fill.style.transform = 'scaleX(0)';
                    card.fill.getBoundingClientRect(); card.fill.style.transition = '';
                    this.renderCard(type); card.note.textContent = 'New level reached';
                });
                this.later(this.quiet() ? 500 : 1580 + offset + this.jitter(0, 25), () => this.returnToHud(type));
            }
            this.status.textContent = targets.map(type => (type === 'avatar' ? 'Player' : 'Equipped item') + ' reached level ' + this.previous[type]).join('. ');
            const lastOffset = Math.max(0, ...timeline.map(item => item.offset));
            this.later(this.quiet() ? 1200 : 2200 + lastOffset, () => this.finish());
        }
        finish() {
            const temporary = [...this.temporary];
            let exitEnd = 0;
            temporary.forEach((type, index) => {
                const card = this.cards[type];
                const delay = this.quiet() ? 0 : index * 45 + this.jitter(0, 16);
                const duration = this.quiet() ? 0 : 170;
                card.exitAnimation = this.animate(card.el, [{opacity: 1, transform: 'none'},
                    {opacity: 0, transform: 'translate(12px,6px) scale(.98)'}], duration, delay, 'cubic-bezier(.4,0,.8,.4)', 'forwards');
                this.later(delay + duration, () => {
                    // Explicitly opening or inspecting a temporary card keeps it open.
                    if (!this.temporary.has(type)) return;
                    const survivors = [...this.opened].filter(other => other !== type && !this.temporary.has(other))
                        .map(other => [this.cards[other].el, this.cards[other].el.getBoundingClientRect()]);
                    this.temporary.delete(type); this.opened.delete(type); card.el.hidden = true;
                    for (const [el, before] of survivors) {
                        const after = el.getBoundingClientRect();
                        this.animate(el, [{transform: `translate(${before.left - after.left}px,${before.top - after.top}px)`}, {transform: 'none'}], 230);
                    }
                });
                exitEnd = Math.max(exitEnd, delay + duration);
            });
            this.later(exitEnd + 260, () => this.cancel());
        }
    }
    return ProgressionCards;
});

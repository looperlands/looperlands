define(function () {
    class ConsumableHud {
        constructor(app) {
            this.app = app;
            this.items = {};
            this.cooling = new Map();
            this.readyUntil = new Map();
            this.pending = new Set();
            this.effects = new Map();
            this.effectPanels = new Map();
            const bar = document.getElementById('bar-container');
            if (!bar) return;
            this.anchor = document.createElement('div');
            this.anchor.id = 'consumable-hud-anchor';
            bar.insertAdjacentElement('beforebegin', this.anchor);
            this.root = document.createElement('div');
            this.root.id = 'consumable-hud';
            this.root.setAttribute('aria-label', 'Consumables and active effects');
            // Clicking the HUD must not send a move or attack through to the map.
            for (const type of ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'click']) {
                this.root.addEventListener(type, event => event.stopPropagation());
            }
            this.slots = document.createElement('div');
            this.slots.className = 'hud-consumables';
            this.effectsRoot = document.createElement('div');
            this.effectsRoot.className = 'hud-effects';
            this.effectsRoot.setAttribute('aria-label', 'Active effects');
            this.root.appendChild(this.slots);
            this.root.appendChild(this.effectsRoot);
            this.anchor.appendChild(this.root);
            this.buttons = new Map();
            this.tick(Date.now());
            this.interval = setInterval(() => this.tick(Date.now()), 250);
        }

        sync(items) {
            const empty = Object.fromEntries(Object.entries(this.items).map(([id, item]) => [id, {...item, qty: 0}]));
            this.items = {...empty, ...items};
            for (const [id, item] of Object.entries(items || {})) {
                this.app.cooldownMap[id] = Math.max(this.app.cooldownMap[id] || 0, Number(item.cooldown) || 0);
            }
            this.tick(Date.now());
        }

        setEffect(stat, percent, duration) {
            // The legacy socket message describes only the fish buff.
            if (duration > 0) this.effects.set('fish', {label: '+' + percent + '% ' + stat, expires: Date.now() + duration,
                minuteCells: String(Math.floor(Math.ceil(duration / 1000) / 60)).length});
            else this.effects.delete('fish');
            this.tick(Date.now());
        }

        syncEffects(effects, serverTime = Date.now()) {
            if (!Array.isArray(effects) || !Number.isFinite(serverTime) || serverTime < (this.effectsSyncedAt || 0)) return [];
            const now = Date.now(), next = new Map(), changed = [];
            for (const effect of effects) {
                if (!effect || typeof effect.id !== 'string' || typeof effect.label !== 'string' || !Number.isFinite(effect.expiresAt)) continue;
                const duration = effect.expiresAt - serverTime;
                if (duration <= 0) continue;
                const previous = this.effects.get(effect.id);
                const expires = now + duration;
                next.set(effect.id, {label: effect.label, expires,
                    minuteCells: Math.max(previous?.minuteCells || 1, String(Math.floor(Math.ceil(duration / 1000) / 60)).length)});
                if (!previous || previous.label !== effect.label || expires > previous.expires + 1000) {
                    changed.push({...effect, duration});
                }
            }
            this.effectsSyncedAt = serverTime;
            this.effects = next;
            this.tick(now);
            return changed;
        }

        createEffectPanel(id) {
            const label = document.createElement('div');
            label.className = 'hud-effect';
            label.dataset.effect = id;
            const name = document.createElement('span');
            name.className = 'hud-effect-name';
            const timer = document.createElement('span');
            timer.className = 'hud-effect-timer';
            const timeGroup = document.createElement('span');
            timeGroup.className = 'hud-effect-time';
            const separator = document.createElement('span');
            separator.textContent = '·';
            separator.setAttribute('aria-hidden', 'true');
            timeGroup.appendChild(separator);
            timeGroup.appendChild(timer);
            label.appendChild(name);
            label.appendChild(timeGroup);
            this.effectsRoot.appendChild(label);
            return {label, name, timer, timeGroup};
        }

        createButton(id) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'hud-consumable';
            button.dataset.item = id;
            const icon = document.createElement('img');
            icon.alt = '';
            icon.src = 'img/3/' + this.items[id].image + '.png';
            const key = document.createElement('span');
            key.className = 'hud-key';
            const count = document.createElement('span');
            count.className = 'hud-count';
            const timer = document.createElement('span');
            timer.className = 'hud-cooldown';
            button.appendChild(icon);
            button.appendChild(key);
            button.appendChild(count);
            button.appendChild(timer);
            button.addEventListener('click', () => {
                if (button.disabled) return;
                this.pending.add(id);
                this.tick(Date.now());
                Promise.resolve(this.app.consumeItem(id)).finally(() => {
                    this.pending.delete(id);
                    this.tick(Date.now());
                });
                button.blur();
            });
            return {button, key, count, timer};
        }

        tick(now) {
            if (!this.root) return;
            for (const id of Object.keys(this.items)) {
                const active = now < (this.app.cooldownMap[id] || 0);
                if (this.cooling.get(id) && !active && !document.hidden) this.readyUntil.set(id, now + 450);
                this.cooling.set(id, active);
            }
            const assigned = (this.app.settings.getInventorySlots() || []).slice(0, 4).map(String);
            const active = Object.keys(this.items).filter(id => this.cooling.get(id) || now < this.readyUntil.get(id));
            const ids = [...new Set([...assigned, ...active])].filter(id => this.items[id]?.consumable).slice(0, 4);
            for (const [id, slot] of this.buttons) {
                if (!ids.includes(id)) { slot.button.remove(); this.buttons.delete(id); }
            }
            for (const [index, id] of ids.entries()) {
                if (!this.buttons.has(id)) this.buttons.set(id, this.createButton(id));
                const slot = this.buttons.get(id);
                if (this.slots.children[index] !== slot.button) {
                    this.slots.insertBefore(slot.button, this.slots.children[index] || null);
                }
                const item = this.items[id];
                const seconds = Math.max(0, Math.ceil(((this.app.cooldownMap[id] || 0) - now) / 1000));
                const key = assigned.indexOf(id);
                slot.key.textContent = key >= 0 ? String(key + 1) : '';
                slot.count.textContent = String(item.qty || 0);
                slot.timer.textContent = seconds >= 60 ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
                    : seconds ? String(seconds) + 's' : '';
                slot.timer.hidden = !seconds;
                slot.button.disabled = Boolean(seconds || !(Number(item.qty) > 0) || this.pending.has(id) ||
                    this.app.game?.started === false || this.app.game?.player?.isDead);
                slot.button.classList.toggle('cooling', seconds > 0);
                slot.button.classList.toggle('cooldown-ready', now < (this.readyUntil.get(id) || 0));
                const name = item.description || 'Consumable';
                slot.button.setAttribute('aria-label', name + ', ' + (item.qty || 0) + ' remaining' +
                    (seconds ? ', ready in ' + seconds + ' seconds' : ', ready'));
                slot.button.title = name + (seconds ? ' · ' + seconds + 's' : key >= 0 ? ' · ' + (key + 1) : '');
            }
            for (const [id, effect] of this.effects) {
                if (effect.expires <= now) this.effects.delete(id);
            }
            for (const [id, panel] of this.effectPanels) {
                if (!this.effects.has(id)) { panel.label.remove(); this.effectPanels.delete(id); }
            }
            for (const [id, effect] of this.effects) {
                if (!this.effectPanels.has(id)) this.effectPanels.set(id, this.createEffectPanel(id));
                const panel = this.effectPanels.get(id);
                const seconds = Math.ceil((effect.expires - now) / 1000);
                const name = effect.label;
                if (panel.name.textContent !== name) panel.name.textContent = name;
                const showTimer = this.app.settings.getEffectTimersEnabled?.() !== false;
                panel.timeGroup.hidden = !showTimer;
                panel.label.title = effect.label + (showTimer ? '' : ' · ' + seconds + 's remaining');
                panel.label.setAttribute('aria-label', effect.label + ', ' + seconds + ' seconds remaining');
                const timer = String(Math.floor(seconds / 60)).padStart(effect.minuteCells, '\u00a0') +
                    ':' + String(seconds % 60).padStart(2, '0');
                if (panel.timer.textContent !== timer) {
                    panel.timer.replaceChildren(...Array.from(timer, character => {
                        const cell = document.createElement('span');
                        cell.textContent = character;
                        return cell;
                    }));
                }
            }
            this.effectsRoot.hidden = !this.effects.size;
            this.root.hidden = !ids.length && !this.effects.size;
        }

        destroy() {
            clearInterval(this.interval);
            this.root?.remove();
            this.anchor?.remove();
        }
    }
    return ConsumableHud;
});

define(function () {
    class ConsumableHud {
        constructor(app) {
            this.app = app;
            this.items = {};
            this.cooling = new Map();
            this.readyUntil = new Map();
            this.pending = new Set();
            const bar = document.getElementById('bar-container');
            if (!bar) return;
            this.root = document.createElement('div');
            this.root.id = 'consumable-hud';
            this.root.setAttribute('aria-label', 'Consumables and active effect');
            // Clicking the HUD must not send a move or attack through to the map.
            for (const type of ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'click']) {
                this.root.addEventListener(type, event => event.stopPropagation());
            }
            this.slots = document.createElement('div');
            this.slots.className = 'hud-consumables';
            this.effectLabel = document.createElement('div');
            this.effectLabel.className = 'hud-effect';
            this.effectLabel.setAttribute('role', 'status');
            this.root.appendChild(this.slots);
            this.root.appendChild(this.effectLabel);
            bar.appendChild(this.root);
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
            this.effect = duration > 0 ? {stat, percent, expires: Date.now() + duration} : null;
            this.tick(Date.now());
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
                slot.timer.textContent = seconds ? String(seconds) + 's' : '';
                slot.timer.hidden = !seconds;
                slot.button.disabled = Boolean(seconds || !(Number(item.qty) > 0) || this.pending.has(id) || this.app.game?.player?.isDead);
                slot.button.classList.toggle('cooling', seconds > 0);
                slot.button.classList.toggle('cooldown-ready', now < (this.readyUntil.get(id) || 0));
                const name = item.description || 'Consumable';
                slot.button.setAttribute('aria-label', name + ', ' + (item.qty || 0) + ' remaining' +
                    (seconds ? ', ready in ' + seconds + ' seconds' : ', ready'));
                slot.button.title = name + (seconds ? ' · ' + seconds + 's' : key >= 0 ? ' · ' + (key + 1) : '');
            }
            if (this.effect && this.effect.expires <= now) this.effect = null;
            this.effectLabel.hidden = !this.effect;
            if (this.effect) {
                const seconds = Math.ceil((this.effect.expires - now) / 1000);
                const text = '+' + this.effect.percent + '% ' + this.effect.stat + ' · ' +
                    Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
                if (this.effectLabel.textContent !== text) this.effectLabel.textContent = text;
            }
            this.root.hidden = !ids.length && !this.effect;
        }

        destroy() {
            clearInterval(this.interval);
            this.root?.remove();
        }
    }
    return ConsumableHud;
});

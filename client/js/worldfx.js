define(['worldfxconfig'], function (Config) {
    const PARTICLE_LIMIT = 256;
    class WorldFx {
        constructor(game, random = Math.random) {
            this.game = game;
            this.random = random;
            this.flags = {...Config.defaults};
            this.sceneFlags = {};
            this.particles = [];
            this.rings = [];
            this.drops = new Map();
            this.mapId = game.mapId;
            this.sessionId = game.sessionId;
        }

        enabled(id, animated = true) {
            if (id === 'levelup') return !this.game.app?.settings?.getReducedMotion?.();
            return (this.sceneFlags[id] ?? this.flags[id]) === true && (!animated || !this.game.app?.settings?.getReducedMotion?.());
        }

        clear() {
            if (this.mapId !== this.game.mapId || this.sessionId !== this.game.sessionId) {
                this.packet = null;
                this.flags = {...Config.defaults};
                this.sceneFlags = {};
                this.sceneryKey = undefined;
            }
            this.particles = [];
            this.rings = [];
            this.drops.clear();
            this.lastActor = null;
            this.actor = null;
            this.mapId = this.game.mapId;
            this.sessionId = this.game.sessionId;
            this.game.renderer?.setExtensionData('world-fx', null);
            this.game.renderer?.setExtensionData('world-fx-ground', null);
        }

        sync() {
            if (this.mapId !== this.game.mapId || this.sessionId !== this.game.sessionId) this.clear();
        }

        configure(packet) {
            this.sync();
            this.packet = packet;
            this.flags = {...Config.defaults};
            try { Object.assign(this.flags, Config.toggles(packet?.worldFx?.enabled)); }
            catch (error) { console.warn('Invalid world FX:', error.message); }
            this.sceneryKey = undefined;
        }

        scene() {
            const scene = this.game.getViewScene ? this.game.getViewScene()
                : this.game.player && this.game.map?.getCurrentScene?.(this.game.player);
            const value = scene?.fx ?? this.packet?.worldFx?.scenery ?? null;
            if (this.sceneryKey !== value) {
                this.sceneryKey = value;
                try { this.scenery = Config.scenery(value ?? {}); }
                catch (error) { this.scenery = Config.scenery(); console.warn('Invalid scene FX:', error.message); }
                this.sceneFlags = this.scenery.enabled;
            }
            return scene;
        }

        burst(x, y, spec) {
            if (!spec || !this.enabled('stage')) return;
            const time = this.game.currentTime || Date.now();
            for (let i = 0; i < spec.count; i++) {
                this.particles.push({x: x + (this.random() - 0.5) * spec.spread, y, startedAt: time,
                    vx: (this.random() * 2 - 1) * spec.speed, vy: -(0.5 + this.random()) * spec.speed,
                    gravity: spec.gravity, lifetimeMs: spec.lifetimeMs, size: 1 + Math.floor(this.random() * spec.size),
                    color: spec.colors[Math.floor(this.random() * spec.colors.length)],
                    ...(spec.design ? {design: spec.design, seed: i * 1.618 + 0.5} : {})});
            }
            if (this.particles.length > PARTICLE_LIMIT) this.particles.splice(0, this.particles.length - PARTICLE_LIMIT);
        }

        levelUp(entity, asset) {
            this.sync();
            if (!entity || entity.isDead || !this.enabled('levelup') ||
                !Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return;
            // Equipped items share their owner's map entity; originate at the held item.
            const held = asset === 'Weapon' || asset === 'Tool';
            // Down-facing equipment is drawn on the left side of the avatar.
            const left = entity.orientation === 2 || entity.orientation === 3;
            const x = entity.x + (held ? (left ? 0 : 16) : 8);
            const y = entity.y + (held ? 5 : 2);
            const startedAt = this.game.currentTime || Date.now();
            const colors = ['#fff9d6', '#ffe078', '#f5af45', '#9cefe6'];
            for (let i = 0; i < 44; i++) {
                const radial = i < 28;
                const angle = i / 28 * Math.PI * 2;
                const speed = 24 + this.random() * 32;
                this.particles.push({x: x + (this.random() - 0.5) * 6, y,
                    vx: radial ? Math.cos(angle) * speed : (this.random() - 0.5) * 22,
                    vy: radial ? Math.sin(angle) * speed * 0.65 - 18 : -28 - this.random() * 30,
                    gravity: radial ? 24 : -4, startedAt, lifetimeMs: 1000 + this.random() * 550,
                    size: i % 4 === 0 ? 2 : 1, shape: i % 4 === 0 ? 'star' : 'spark',
                    color: colors[i % colors.length], owner: 'levelup'});
            }
            if (this.particles.length > PARTICLE_LIMIT) this.particles.splice(0, this.particles.length - PARTICLE_LIMIT);
            this.rings.push({x: entity.x + 8, y: entity.y + 12, coreX: x, coreY: y,
                startedAt, owner: 'levelup', radius: 38, lifetimeMs: 1600});
            if (this.rings.length > 64) this.rings.shift();
        }

        tileChanged(stage) {
            this.sync();
            this.scene();
            if (stage.particlesOnly !== true || !Number.isInteger(stage.x) || !Number.isInteger(stage.y)) return;
            try { this.burst(stage.x * 16 + 8, stage.y * 16 + 12, Config.burst(stage.particles ?? 'soil')); }
            catch (error) { console.warn('Invalid tile particles:', error.message); }
        }

        drop(item) {
            this.sync();
            this.scene();
            if (!this.enabled('loot')) return;
            this.drops.set(item.id, {entity: item, startedAt: this.game.currentTime || Date.now()});
            if (this.drops.size > 64) this.drops.delete(this.drops.keys().next().value);
        }

        decorate(entity, data, scale) {
            if (!data) return;
            const time = this.game.currentTime || Date.now();
            const drop = this.drops.get(entity.id);
            if (drop && drop.entity === entity && this.enabled('loot')) {
                const age = (time - drop.startedAt) / 1000;
                if (age >= 0 && age < 0.75) {
                    const hop = age < 0.45 ? Math.sin(age / 0.45 * Math.PI) * 13 : Math.sin((age - 0.45) / 0.3 * Math.PI) * 3;
                    for (const draw of data.drawData) if (draw.spriteName !== 'shadow16') draw.dy -= Math.round(hop) * scale;
                }
            }
        }

        ambience(base) {
            this.sync();
            const scene = this.scene();
            let effects = base?.effects || [{type: base?.particles || 'none', count: base?.particleCount || 0}];
            const preset = scene?.ambience ?? this.packet?.worldFx?.ambience;
            if (preset !== undefined) {
                try { effects = Config.ambient(preset); }
                catch (_) { effects = []; }
            }
            if (!this.enabled('ambience')) effects = [];
            const bounds = scene ? {x: scene.x * 16, y: scene.y * 16, width: scene.width * 16, height: scene.height * 16} : base?.bounds;
            return {...base, effects, bounds, reducedMotion: Boolean(base?.reducedMotion || this.game.app?.settings?.getReducedMotion?.()),
                fx: {actor: this.actor, flags: {fireflies: this.enabled('fireflies'), leaves: this.enabled('leaves')}}};
        }

        render(renderer, time) {
            this.sync();
            if (!this.game.started || this.game.isStopped || !this.game.player || this.game.player.isDead || this.game.app?.settings?.getReducedMotion?.()) {
                this.clear();
                return;
            }
            this.scene();
            const player = this.game.player;
            const elapsed = this.lastActor ? Math.max(1, time - this.lastActor.time) / 1000 : 1;
            this.actor = {x: player.x + 8, y: player.y + 12,
                vx: this.lastActor ? Math.max(-200, Math.min(200, (player.x - this.lastActor.x) / elapsed)) : 0,
                vy: this.lastActor ? Math.max(-200, Math.min(200, (player.y - this.lastActor.y) / elapsed)) : 0};
            this.lastActor = {x: player.x, y: player.y, time};
            this.particles = this.particles.filter(p => time - p.startedAt < p.lifetimeMs && this.enabled(p.owner || 'stage'));
            this.rings = this.rings.filter(r => time - r.startedAt < r.lifetimeMs);
            for (const [id, drop] of this.drops) if (!this.enabled('loot') || time - drop.startedAt > 800 || this.game.getEntityById(id) !== drop.entity) this.drops.delete(id);
            if (this.registeredRenderer !== renderer) {
                renderer.registerExtension('world-fx-renderer-worker.js');
                this.registeredRenderer = renderer;
            }
            const particles = this.particles.map(p => {
                const age = Math.max(0, time - p.startedAt), seconds = age / 1000;
                return {x: p.x + p.vx * seconds, y: p.y + p.vy * seconds + 0.5 * p.gravity * seconds * seconds,
                    color: p.color, size: p.size, shape: p.shape, trailX: p.vx * 0.055,
                    trailY: (p.vy + p.gravity * seconds) * 0.055, alpha: 1 - age / p.lifetimeMs,
                    ...(p.design ? {design: {...p.design, colors: [p.color], size: p.size}, seed: p.seed, elapsed: seconds} : {})};
            });
            const data = {time, actor: this.actor, flags: Object.fromEntries(Object.keys(this.flags).map(id => [id, this.enabled(id)])),
                scenery: this.scenery, particles, rings: this.rings};
            renderer.setExtensionData('world-fx', data);
            renderer.setExtensionData('world-fx-ground', data);
        }
    }
    return WorldFx;
});

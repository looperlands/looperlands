define(['worldfxconfig'], function (Config) {
    const PARTICLE_LIMIT = 256;
    class WorldFx {
        constructor(game, random = Math.random) {
            this.game = game;
            this.random = random;
            this.flags = {...Config.defaults};
            this.sceneFlags = {};
            this.particles = [];
            this.drops = new Map();
            this.teleports = [];
            this.mapId = game.mapId;
            this.sessionId = game.sessionId;
        }

        enabled(id) {
            return (this.sceneFlags[id] ?? this.flags[id]) === true && !this.game.app?.settings?.getReducedMotion?.();
        }

        clear() {
            if (this.mapId !== this.game.mapId || this.sessionId !== this.game.sessionId) {
                this.packet = null;
                this.flags = {...Config.defaults};
                this.sceneFlags = {};
                this.sceneryKey = undefined;
            }
            this.particles = [];
            this.drops.clear();
            this.teleports = [];
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
            const scene = this.game.player && this.game.map?.getCurrentScene?.(this.game.player);
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
                    color: spec.colors[Math.floor(this.random() * spec.colors.length)]});
            }
            if (this.particles.length > PARTICLE_LIMIT) this.particles.splice(0, this.particles.length - PARTICLE_LIMIT);
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
            const warp = this.teleports.find(w => w.entityId === entity.id && time - w.startedAt < 350);
            if (warp && this.enabled('teleport')) data.globalAlpha = (data.globalAlpha ?? 1) * Math.min(1, 0.25 + (time - warp.startedAt) / 300);
        }

        teleport(entity, x, y) {
            this.sync();
            this.scene();
            if (!this.enabled('teleport') || !entity?.sprite || !entity.currentAnimation?.currentFrame) return;
            const sprite = entity.sprite, frame = entity.currentAnimation.currentFrame;
            if (![sprite.width, sprite.height, x, y].every(Number.isFinite) || sprite.width <= 0 || sprite.height <= 0) return;
            let step = Math.max(2, Math.ceil(Math.sqrt(sprite.width * sprite.height / 180)));
            while (Math.ceil(sprite.width / step) * Math.ceil(sprite.height / step) > 180) step++;
            const fragments = [];
            for (let py = 0; py < sprite.height; py += step) for (let px = 0; px < sprite.width; px += step) {
                fragments.push({sx: px, sy: py, x: px + sprite.offsetX, y: py + sprite.offsetY,
                    width: Math.min(step, sprite.width - px), height: Math.min(step, sprite.height - py),
                    dx: (this.random() - 0.5) * 65, dy: -this.random() * 40});
            }
            // NFT image pixels live exclusively in the renderer worker. Sample them there.
            this.teleports.push({entityId: entity.id, from: {x: entity.x, y: entity.y}, to: {x: x * 16, y: y * 16},
                startedAt: this.game.currentTime || Date.now(),
                frame: {spriteName: sprite.name, x: frame.x, y: frame.y, scale: sprite.scale || 1}, fragments});
            this.teleports = this.teleports.slice(-8);
            if (entity === this.game.player) this.lastActor = null;
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
            this.particles = this.particles.filter(p => time - p.startedAt < p.lifetimeMs && this.enabled('stage'));
            this.teleports = this.teleports.filter(w => time - w.startedAt < 650 && this.enabled('teleport'));
            for (const [id, drop] of this.drops) if (!this.enabled('loot') || time - drop.startedAt > 800 || this.game.getEntityById(id) !== drop.entity) this.drops.delete(id);
            if (this.registeredRenderer !== renderer) {
                renderer.registerExtension('world-fx-renderer-worker.js');
                this.registeredRenderer = renderer;
            }
            const particles = this.particles.map(p => {
                const age = Math.max(0, time - p.startedAt), seconds = age / 1000;
                return {x: p.x + p.vx * seconds, y: p.y + p.vy * seconds + 0.5 * p.gravity * seconds * seconds,
                    color: p.color, size: p.size, alpha: 1 - age / p.lifetimeMs};
            });
            const data = {time, actor: this.actor, flags: Object.fromEntries(Object.keys(this.flags).map(id => [id, this.enabled(id)])),
                scenery: this.scenery, particles, teleports: this.teleports};
            renderer.setExtensionData('world-fx', data);
            renderer.setExtensionData('world-fx-ground', data);
        }
    }
    return WorldFx;
});

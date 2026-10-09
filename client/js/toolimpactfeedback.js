// Feature-owned tool particles; positions are native map pixels, independent of camera/scale.
define(function () {
    const MAX_PARTICLES = 192;
    const MAX_ACTIONS = 64;
    class ToolImpactFeedback {
        constructor(game, random = Math.random) {
            this.game = game;
            this.random = random;
            this.actions = new Map();
            this.particles = [];
            this.mapId = game.mapId;
            this.sessionId = game.sessionId;
        }

        clear() {
            this.actions.clear();
            this.particles = [];
            this.mapId = this.game.mapId;
            this.sessionId = this.game.sessionId;
            this.game.renderer?.setExtensionData('tool-impact', null);
        }

        enabled() {
            const settings = this.game.app?.settings;
            return !settings?.getReducedMotion?.() && settings?.getCombatEffectsEnabled?.() !== false;
        }

        startAction(entity, state, animation) {
            if (this.mapId !== this.game.mapId || this.sessionId !== this.game.sessionId) this.clear();
            const effect = state.impactFeedback;
            if (!effect || !Number.isInteger(state.tileX) || !Number.isInteger(state.tileY)) return;
            const colors = (Array.isArray(effect.colors) ? effect.colors : [])
                .filter(color => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 4);
            if (!colors.length) return;
            const clamp = (value, fallback, min, max) => Number.isFinite(value)
                ? Math.max(min, Math.min(max, value)) : fallback;
            const frames = animation?.length || 5;
            const config = {
                colors,
                impactFrame: Math.floor(clamp(effect.impactFrame, 3, 0, frames - 1)),
                count: Math.floor(clamp(effect.count, 8, 1, 16)),
                lifetimeMs: clamp(effect.lifetimeMs, 450, 100, 1500),
                speed: clamp(effect.speed, 20, 0, 60),
                gravity: clamp(effect.gravity, 80, 0, 150),
            };
            this.stopAction(entity, true);
            if (this.actions.size >= MAX_ACTIONS) this.actions.delete(this.actions.keys().next().value);
            this.actions.set(entity.id, {entity, animation, config, previousFrame: -1,
                x: state.tileX * 16 + 8, y: state.tileY * 16 + 12});
        }

        stopAction(entity, interrupted) {
            this.actions.delete(entity.id);
            if (interrupted) this.particles = this.particles.filter(particle => particle.owner !== entity.id);
        }

        emit(action, time) {
            const {config, x, y, entity} = action;
            for (let i = 0; i < config.count; i++) {
                this.particles.push({owner: entity.id, x, y, startedAt: time,
                    vx: (this.random() * 2 - 1) * config.speed,
                    vy: -(0.5 + this.random()) * config.speed,
                    size: 1 + Math.floor(this.random() * 2),
                    color: config.colors[Math.floor(this.random() * config.colors.length)],
                    gravity: config.gravity, lifetimeMs: config.lifetimeMs});
            }
            if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
        }

        getFrame(time) {
            if (this.mapId !== this.game.mapId || this.sessionId !== this.game.sessionId ||
                !this.game.started || this.game.isStopped || this.game.player?.isDead) {
                this.clear();
                return [];
            }
            const enabled = this.enabled();
            if (!enabled) this.particles = [];
            for (const action of this.actions.values()) {
                const {entity, animation, config} = action;
                if (this.game.getEntityById(entity.id) !== entity || entity.isDead || entity.isMoving() ||
                    entity.currentAnimation !== animation) {
                    this.stopAction(entity, true);
                    continue;
                }
                const index = animation?.currentFrame?.index;
                if (enabled && index === config.impactFrame && index !== action.previousFrame) this.emit(action, time);
                // Consume contact frames even while disabled, so enabling effects cannot replay a hit.
                action.previousFrame = index;
            }
            this.particles = this.particles.filter(particle => time - particle.startedAt < particle.lifetimeMs);
            return this.particles.map(particle => {
                const age = Math.max(0, time - particle.startedAt);
                const seconds = age / 1000;
                return {x: particle.x + particle.vx * seconds,
                    y: particle.y + particle.vy * seconds + 0.5 * particle.gravity * seconds * seconds,
                    size: particle.size, color: particle.color, alpha: 1 - age / particle.lifetimeMs};
            });
        }

        render(renderer, time) {
            if (this.renderer !== renderer) {
                renderer.registerExtension('tool-impact-renderer-worker.js');
                this.renderer = renderer;
            }
            const particles = this.getFrame(time);
            renderer.setExtensionData('tool-impact', particles.length ? particles : null);
        }
    }
    return ToolImpactFeedback;
});

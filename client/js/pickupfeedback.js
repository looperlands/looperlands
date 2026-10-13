define(function () {
    const DURATION = 240;
    const OFFSETS = [[-6, 0], [6, 0], [0, -5], [0, 5]];
    class PickupFeedback {
        constructor(game) {
            this.game = game;
            this.clear();
        }

        clear() {
            this.pickups = [];
            this.mapId = this.game.mapId;
            this.sessionId = this.game.sessionId;
            this.game.renderer?.setExtensionData('pickup', null);
        }

        enabled() {
            const settings = this.game.app.settings;
            return settings.getCombatEffectsEnabled() && !settings.getReducedMotion();
        }

        sync() {
            if (this.mapId !== this.game.mapId || this.sessionId !== this.game.sessionId) this.clear();
        }

        add(item, time) {
            this.sync();
            if (!this.enabled() || !item) return;
            this.pickups.push({x: item.x + 8, y: item.y + 8, startedAt: time});
            if (this.pickups.length > 16) this.pickups.shift();
        }

        getFrame(time) {
            this.sync();
            const player = this.game.player;
            if (!this.enabled() || !this.game.started || this.game.isStopped || !player || player.isDead) {
                this.clear();
                return [];
            }
            this.pickups = this.pickups.filter(pickup => time - pickup.startedAt < DURATION);
            return this.pickups.flatMap(pickup => {
                const progress = Math.max(0, (time - pickup.startedAt) / DURATION);
                const ease = 1 - Math.pow(1 - progress, 2);
                return OFFSETS.map(([dx, dy]) => ({
                    x: Math.round(pickup.x + dx + (player.x + 8 - pickup.x - dx) * ease),
                    y: Math.round(pickup.y + dy + (player.y + 5 - pickup.y - dy) * ease),
                    alpha: 1 - progress,
                }));
            });
        }

        render(renderer, time) {
            if (this.renderer !== renderer) {
                renderer.registerExtension('pickup-renderer-worker.js');
                this.renderer = renderer;
            }
            const frame = this.getFrame(time);
            renderer.setExtensionData('pickup', frame.length ? frame : null);
        }
    }
    return PickupFeedback;
});

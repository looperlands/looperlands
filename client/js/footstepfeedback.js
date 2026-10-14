define(function () {
    function surfaceFor(name) {
        if (/beach|desert/i.test(name || '')) return 'sand';
        if (/forest/i.test(name || '')) return 'grass';
        if (/cave|castle|tower|fortress/i.test(name || '')) return 'stone';
        return 'ground';
    }
    class FootstepFeedback {
        constructor(game) { this.game = game; this.clear(); }
        clear() {
            this.steps = [];
            this.previous = null;
            this.distance = 0;
            this.lastStep = 0;
            this.mapId = this.game.mapId;
            this.sessionId = this.game.sessionId;
            this.game.renderer?.setExtensionData('footsteps', null);
        }
        getFrame(time) {
            if (this.mapId !== this.game.mapId || this.sessionId !== this.game.sessionId) this.clear();
            const player = this.game.player;
            if (!this.game.started || this.game.isStopped || !player || player.isDead ||
                (typeof document !== 'undefined' && document.hidden)) {
                this.clear();
                return [];
            }
            const reduced = this.game.app.settings.getReducedMotion();
            const effects = this.game.app.settings.getCombatEffectsEnabled();
            if (reduced || !effects) this.steps = [];
            const previous = this.previous;
            this.previous = {x: player.x, y: player.y, time};
            const delta = previous ? Math.hypot(player.x - previous.x, player.y - previous.y) : 0;
            if (!previous || delta > 24 || time - previous.time > 250 || !player.isMoving()) {
                this.distance = 0;
            } else {
                this.distance += delta;
                if (this.distance >= 12 && time - this.lastStep >= 90) {
                    this.distance %= 12;
                    this.lastStep = time;
                    const surface = surfaceFor(player.getScene()?.name);
                    if (!reduced && effects && surface !== 'stone') {
                        this.steps.push({x: player.x + 8, y: player.y + 14, startedAt: time,
                            surface, lifetime: surface === 'sand' ? 650 : 380});
                        if (this.steps.length > 24) this.steps.shift();
                    }
                }
            }
            this.steps = this.steps.filter(step => time - step.startedAt < step.lifetime);
            return this.steps.map(step => ({x: step.x, y: step.y, surface: step.surface,
                progress: Math.max(0, (time - step.startedAt) / step.lifetime)}));
        }
        render(renderer, time) {
            if (this.renderer !== renderer) {
                renderer.registerExtension('footstep-renderer-worker.js');
                this.renderer = renderer;
            }
            const frame = this.getFrame(time);
            renderer.setExtensionData('footsteps', frame.length ? frame : null);
        }
    }
    FootstepFeedback.surfaceFor = surfaceFor;
    return FootstepFeedback;
});

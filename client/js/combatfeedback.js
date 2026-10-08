define(['mob'], function (Mob) {
    const IMPACT_DURATION = 300;
    const MAX_IMPACTS = 24;

    class CombatFeedback {
        constructor(game) {
            this.game = game;
            this.mapId = game.mapId;
            this.impacts = [];
        }

        clear() {
            this.impacts = [];
            this.mapId = this.game.mapId;
        }

        addImpact(entity, damage, time) {
            if (!(damage > 0) || !entity || !this.effectsEnabled()) return;
            this.syncMap();
            this.impacts.push({x: entity.x + 8, y: entity.y + 4, startedAt: time});
            if (this.impacts.length > MAX_IMPACTS) this.impacts.shift();
        }

        effectsEnabled() {
            const settings = this.game.app.settings;
            return settings.getCombatEffectsEnabled() && !settings.getReducedMotion();
        }

        syncMap() {
            if (this.mapId !== this.game.mapId) this.clear();
        }

        getFrame(time) {
            this.syncMap();
            if (!this.game.started || this.game.isStopped || this.game.player.isDead) {
                this.clear();
                return {target: null, impacts: []};
            }
            this.impacts = this.effectsEnabled()
                ? this.impacts.filter(impact => time - impact.startedAt < IMPACT_DURATION)
                : [];
            const target = this.game.player.target;
            const activeTarget = target instanceof Mob && !target.isDead && !target.isFriendly
                && this.game.entities[target.id] === target && target.isVisible();
            return {
                target: activeTarget ? {
                    x: target.x - 2,
                    y: target.y - 2,
                    width: 20,
                    height: 20,
                } : null,
                impacts: this.impacts.map(impact => ({
                    x: impact.x, y: impact.y,
                    progress: Math.max(0, (time - impact.startedAt) / IMPACT_DURATION),
                })),
            };
        }
    }

    return CombatFeedback;
});

define(['mob'], function (Mob) {
    const IMPACT_DURATION = 220;
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
            const source = this.game.player;
            const dx = Number.isFinite(source?.x) ? entity.x - source.x : 0;
            const dy = Number.isFinite(source?.y) ? entity.y - source.y : 0;
            this.impacts.push({x: entity.x + 8, y: entity.y + 4, startedAt: time, entity,
                recoilX: Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0,
                recoilY: Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0});
            if (this.impacts.length > MAX_IMPACTS) this.impacts.shift();
        }

        effectsEnabled() {
            const settings = this.game.app.settings;
            return settings.getCombatEffectsEnabled() && !settings.getReducedMotion();
        }

        syncMap() {
            if (this.mapId !== this.game.mapId) this.clear();
        }

        getOffset(entity, time) {
            this.syncMap();
            if (!this.effectsEnabled() || !this.game.started || this.game.isStopped ||
                !this.game.player || this.game.player.isDead || entity.isDead ||
                this.game.entities[entity.id] !== entity) return {x: 0, y: 0};
            for (let index = this.impacts.length - 1; index >= 0; index--) {
                const impact = this.impacts[index];
                if (impact.entity !== entity) continue;
                const age = Math.max(0, time - impact.startedAt);
                if (age >= 160) break;
                const distance = Math.round(2 * Math.pow(1 - age / 160, 2));
                return {x: impact.recoilX * distance, y: impact.recoilY * distance};
            }
            return {x: 0, y: 0};
        }

        getFrame(time) {
            this.syncMap();
            if (!this.game.started || this.game.isStopped || !this.game.player || this.game.player.isDead) {
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

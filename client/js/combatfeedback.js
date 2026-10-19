define(['mob', 'hitfeel'], function (Mob, HitFeel) {
    const IMPACT_DURATION = 220;
    const MAX_IMPACTS = 24;
    const SHAKE_DURATION = 180;

    class CombatFeedback {
        constructor(game) {
            this.game = game;
            this.mapId = game.mapId;
            this.impacts = [];
            this.shakeStartedAt = null;
            this.hitFeel = new HitFeel(game);
        }

        clear() {
            this.hitFeel.clear();
            this.impacts = [];
            this.shakeStartedAt = null;
            this.mapId = this.game.mapId;
        }

        addImpact(entity, damage, time, critical = false) {
            if (!(damage > 0) || !entity) return;
            this.syncMap();
            this.hitFeel.addImpact(entity, damage, time, critical);
            if (critical) this.addShake(time);
            if (!this.effectsEnabled()) return;
            const source = this.game.player;
            const dx = Number.isFinite(source?.x) ? entity.x - source.x : 0;
            const dy = Number.isFinite(source?.y) ? entity.y - source.y : 0;
            this.impacts.push({x: entity.x + 8, y: entity.y + 4, startedAt: time, entity,
                recoilX: Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0,
                recoilY: Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0});
            if (this.impacts.length > MAX_IMPACTS) this.impacts.shift();
        }

        addShake(time) {
            if (!this.shakeEnabled()) return;
            this.syncMap();
            // Simultaneous charge hits and rapid/AoE crits share one bounded pulse.
            if (this.shakeStartedAt === null || time - this.shakeStartedAt >= SHAKE_DURATION) this.shakeStartedAt = time;
        }

        addCounterShake(time) {
            if (this.hitFeel.enabled) this.hitFeel.addShake(time, true);
            else this.addShake(time);
        }

        effectsEnabled() {
            const settings = this.game.app.settings;
            return settings.getCombatEffectsEnabled() && !settings.getReducedMotion();
        }

        shakeEnabled() {
            const settings = this.game.app.settings;
            return (settings.getCameraShakeEnabled?.() ?? settings.getCombatEffectsEnabled()) && !settings.getReducedMotion();
        }

        syncMap() {
            if (this.mapId !== this.game.mapId) this.clear();
        }

        getOffset(entity, time) {
            this.syncMap();
            if (this.hitFeel.enabled) return this.hitFeel.getOffset(entity, time);
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

        getShake(time) {
            const age = time - this.shakeStartedAt;
            if (!this.shakeEnabled() || this.shakeStartedAt === null || age < 0 || age >= SHAKE_DURATION) {
                this.shakeStartedAt = null;
                return {x: 0, y: 0};
            }
            const strength = 2 * (1 - age / SHAKE_DURATION);
            return {x: Math.round(Math.cos(age / 13) * strength),
                y: Math.round(Math.sin(age / 17 + 1) * strength * 0.65)};
        }

        getFrame(time) {
            this.syncMap();
            if (!this.game.started || this.game.isStopped || !this.game.player || this.game.player.isDead) {
                this.clear();
                return {target: null, impacts: [], shake: {x: 0, y: 0}};
            }
            this.impacts = this.effectsEnabled()
                ? this.impacts.filter(impact => time - impact.startedAt < IMPACT_DURATION)
                : [];
            const target = this.game.player.target;
            const activeTarget = this.game.app.settings.getHitTargetIndicatorEnabled?.() !== false && target instanceof Mob && !target.isDead && !target.isFriendly
                && this.game.entities[target.id] === target && target.isVisible();
            return {
                shake: this.getShake(time),
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
                ...(this.hitFeel.enabled ? this.hitFeel.frame(time) : {}),
            };
        }
    }

    return CombatFeedback;
});

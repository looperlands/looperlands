define([], function () {
    const receipts = new Map();
    const prefix = 'looperlands.daily-play-reward.v1:';
    function node(tag, className, text) {
        const el = document.createElement(tag);
        el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }
    function receipt(wallet) {
        let saved;
        try {saved = JSON.parse(localStorage.getItem(prefix + wallet));} catch (_) {}
        if (!saved || typeof saved.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(saved.day) || !Number.isSafeInteger(saved.points) || saved.points < 0) saved = null;
        const memory = receipts.get(wallet);
        if (!memory) return saved;
        if (!saved || memory.day > saved.day || (memory.day === saved.day && memory.points > saved.points)) return memory;
        return saved;
    }
    class DailyPlayCelebration {
        constructor(app) {
            this.app = app;
            this.root = node('aside', 'daily-play-reward');
            this.root.hidden = true;
            this.root.setAttribute('role', 'status');
            this.root.setAttribute('aria-live', 'polite');
            this.root.setAttribute('aria-atomic', 'true');
            document.body.append(this.root);
        }
        consider(progress, boardOpen = false) {
            const wallet = this.app.storage?.walletId?.toLowerCase().split(':')[0];
            if (wallet !== this.wallet) {this.hide(); this.wallet = wallet;}
            const game = this.app.game;
            if (document.hidden || !game.started || !game.player || game.player.isDead || game.isStopped) {this.hide(); return false;}
            if (!wallet || !progress?.checkedInToday || boardOpen || this.app.progressionCards?.busy ||
                ['inventory', 'settings', 'credits'].some(name => document.body.classList.contains(name)) || !this.root.hidden) return false;
            const end = Date.parse(progress.resetsAt);
            if (!Number.isFinite(end) || end <= Date.now() || !Number.isSafeInteger(progress.todayPoints) || progress.todayPoints < 1) return false;
            const day = new Date(end).toISOString().slice(0, 10), seen = receipt(wallet);
            if (seen?.day > day) return false;
            const previous = seen?.day === day ? seen.points : 0;
            const earned = progress.todayPoints - previous;
            if (earned <= 0) return false;
            const next = {day, points: progress.todayPoints};
            receipts.set(wallet, next);
            try {localStorage.setItem(prefix + wallet, JSON.stringify(next));} catch (_) {}
            this.show(progress, earned, previous === 0 ? 1 : 0);
            return true;
        }
        show(progress, earned, daily) {
            const bonus = earned - daily;
            const quiet = this.app.settings?.getReducedMotion?.() || this.app.settings?.getCombatEffectsEnabled?.() === false ||
                window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            const content = node('div', 'dr-content' + (quiet ? '' : ' dr-motion'));
            content.append(node('h3', 'dr-title', bonus > 0 ? progress.streak + '-day streak!' : 'Welcome back!'));
            content.append(node('strong', 'dr-points', '+' + earned + (earned === 1 ? ' point' : ' points')));
            const breakdown = [daily ? '1 daily play point' : null, bonus > 0 ? '+' + bonus + ' streak bonus' : null].filter(Boolean).join(' · ');
            content.append(node('p', 'dr-detail', breakdown));
            content.append(node('small', 'dr-total', progress.points + ' total points · Day ' + progress.streak));
            if (!quiet) {
                const sparks = node('div', 'dr-sparks'); sparks.setAttribute('aria-hidden', 'true');
                for (let i = 0; i < 10; i++) {
                    const spark = node('i', 'dr-spark'), angle = i / 10 * Math.PI * 2;
                    spark.style.setProperty('--dr-x', Math.round(Math.cos(angle) * 65) + 'px');
                    spark.style.setProperty('--dr-y', Math.round(Math.sin(angle) * 45) + 'px');
                    spark.style.animationDelay = (100 + i * 15) + 'ms'; sparks.append(spark);
                }
                content.append(sparks);
            }
            this.root.replaceChildren(content); this.root.hidden = false;
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.hide(), 4200);
        }
        hide() {clearTimeout(this.timer); this.root.hidden = true;}
        destroy() {this.hide(); this.root.remove();}
    }
    return DailyPlayCelebration;
});

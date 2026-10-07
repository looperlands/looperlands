const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// One append-only spool per server process. Retry the same IDs after ambiguous responses.
class ActivityTracker {
    constructor(platformClient, options = {}) {
        this.client = platformClient;
        this.enabled = options.enabled ?? process.env.ACTIVITY_TRACKING_ENABLED === 'true';
        this.now = options.now || Date.now;
        this.id = options.id || crypto.randomUUID;
        this.sessions = new Map();
        const configuredIdleSeconds = Number(process.env.ACTIVITY_IDLE_SECONDS || 300);
        this.activeWindowMs = options.activeWindowMs ?? (Number.isFinite(configuredIdleSeconds) ? Math.max(30, Math.min(3600, configuredIdleSeconds)) * 1000 : 300000);
        this.spool = options.spool || process.env.ACTIVITY_SPOOL_PATH || path.resolve('data/activity.jsonl');
        this.pending = [];
        this.flushing = false;
        if (!this.enabled) return;
        try {
        fs.mkdirSync(path.dirname(this.spool), {recursive: true});
        if (fs.existsSync(this.spool)) {
            // A crash can leave a partial last line; retain it for investigation instead of truncating it.
            const text = fs.readFileSync(this.spool, 'utf8');
            for (const line of text.split('\n').filter(Boolean)) {
                try { this.pending.push(JSON.parse(line)); }
                catch { throw new Error('Invalid activity spool. Preserve the file and repair its last record before enabling tracking.'); }
            }
        }
        } catch (error) {
            this.enabled = false;
            console.error('[activity] tracking disabled; preserve and inspect its spool:', error.message);
            return;
        }
        if (options.timer !== false) {
            this.timer = setInterval(() => { this.tick(); this.flush().catch(error => console.error('[activity]', error.message)); }, 30000);
            this.timer.unref?.();
        }
    }
    identity(player) {
        return {nftId: player.nftId, actorWallet: player.walletId.toLowerCase(), sessionId: player.sessionId, mapId: player.mapId};
    }
    start(player) {
        if (!this.enabled || !player.nftId || !player.walletId || !player.sessionId || player.isBot?.()) return;
        // One active avatar per wallet across maps within this server process.
        for (const [id, session] of this.sessions) if (session.identity.actorWallet === player.walletId.toLowerCase()) this.stop(id);
        this.sessions.set(player.sessionId, {identity: this.identity(player), since: this.now(), activeUntil: 0});
    }
    meaningful(player) {
        if (!this.enabled) return;
        const session = this.sessions.get(player.sessionId);
        if (session) {
            const now = this.now();
            // End the idle interval before starting a new active window.
            if (now > session.activeUntil) this.sample(session, now);
            session.activeUntil = now + this.activeWindowMs;
        }
    }
    record(player, type, data) {
        if (!this.enabled || !this.sessions.has(player.sessionId)) return;
        this.meaningful(player);
        this.enqueue({...this.identity(player), type, data, occurredAt: new Date(this.now()).toISOString()});
    }
    enqueue(row) {
        if (!this.enabled) return;
        const event = {...row, id: this.id()};
        try {
            fs.appendFileSync(this.spool, JSON.stringify(event) + '\n');
            this.pending.push(event);
        } catch (error) {
            // Telemetry must never prevent a successful gameplay action.
            console.error('[activity] storage unavailable; tracking disabled:', error.message);
            this.enabled = false;
            clearInterval(this.timer);
        }
    }
    sample(session, now) {
        if (!this.enabled) return;
        // Each sample is <= 30s and does not cross a UTC day. No credit for a stalled process.
        let from = Math.max(session.since, now - 30000);
        while (from + 1000 <= now) {
            const midnight = Math.floor(from / 86400000 + 1) * 86400000;
            const to = Math.min(now, midnight);
            const seconds = Math.floor((to - from) / 1000);
            if (seconds) this.enqueue({...session.identity, type: 'playtime', occurredAt: new Date(from).toISOString(), data: {target: '*', connectedSeconds: seconds, activeSeconds: Math.max(0, Math.floor((Math.min(to, session.activeUntil) - from) / 1000))}});
            from = to;
        }
        session.since = now;
    }
    tick() { if (this.enabled) for (const session of this.sessions.values()) this.sample(session, this.now()); }
    stop(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) { this.sample(session, this.now()); this.sessions.delete(sessionId); }
    }
    async flush() {
        if (!this.enabled || this.flushing || !this.pending.length) return;
        this.flushing = true;
        const batch = this.pending.slice(0, 500);
        try {
            const receipt = await this.client.storeActivity(batch);
            const accepted = new Set(receipt?.accepted || []);
            if (!batch.every(row => accepted.has(row.id))) throw new Error('Incomplete activity receipt');
            this.pending = this.pending.filter(row => !accepted.has(row.id));
            const temp = this.spool + '.tmp';
            fs.writeFileSync(temp, this.pending.map(row => JSON.stringify(row) + '\n').join(''));
            fs.renameSync(temp, this.spool);
        } finally { this.flushing = false; }
    }
    close() { clearInterval(this.timer); this.tick(); }
}
module.exports = ActivityTracker;

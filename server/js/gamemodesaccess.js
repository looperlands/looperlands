// Only the platform response can grant admission. A lease bounds revocation
// latency; mutations always request a fresh check and failures discard the lease.
class GameModesAccess {
    constructor(platform, {now = Date.now, ttl = 30000, refreshAfter = 15000} = {}) {
        this.platform = platform;
        this.now = now;
        this.ttl = ttl;
        this.refreshAfter = refreshAfter;
        this.leases = new Map();
        this.pending = new Map();
    }

    key(wallet) { return typeof wallet === 'string' ? wallet.toLowerCase() : ''; }

    allowed(wallet) {
        const lease = this.leases.get(this.key(wallet));
        return lease?.allowed === true && lease.expiresAt > this.now();
    }

    async verify(wallet, fresh = false) {
        const key = this.key(wallet);
        if (!/^0x[a-f0-9]{40}$/.test(key)) return false;
        const lease = this.leases.get(key);
        if (!fresh && lease && lease.refreshAt > this.now()) return this.allowed(key);
        if (this.pending.has(key)) return this.pending.get(key);
        const request = Promise.resolve().then(async () => {
            try {
                const allowed = await this.platform.isServerAdminWallet(wallet) === true;
                this.leases.set(key, {allowed, expiresAt: this.now() + this.ttl, refreshAt: this.now() + this.refreshAfter});
                return allowed;
            } catch (_) {
                this.leases.delete(key);
                return false;
            }
        }).finally(() => this.pending.delete(key));
        this.pending.set(key, request);
        return request;
    }
}

module.exports = GameModesAccess;

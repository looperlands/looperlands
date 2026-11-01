const {normalizeRows} = require('./inventoryexchange');
const failure = code => Object.assign(new Error(code), {code});

// Application owner for exchanges spanning persisted inventory and live sessions.
// Transport adapters share this instance when deciding whether a session may move.
class InventoryExchanges {
    constructor(dao, cache) {
        this.dao = dao;
        this.cache = cache;
        this.pending = new Set();
        this.unconfirmed = new Set();
    }

    isPending(nftId) {return this.pending.has(nftId);}

    updateSessions(nftId, update, allowedSessions) {
        const updated = new Set();
        for (const candidate of this.cache.keys()) {
            if (allowedSessions && !allowedSessions.has(candidate)) continue;
            const data = this.cache.get(candidate);
            if (data?.nftId !== nftId || !data.gameData) continue;
            data.gameData.items ||= {};
            update(data.gameData.items);
            this.cache.set(candidate, data);
            updated.add(candidate);
        }
        return updated;
    }

    async exchange({sessionId, costs, rewards}) {
        const session = this.cache.get(sessionId);
        if (!session?.gameData) throw failure('session_unavailable');
        const nftId = session.nftId;
        if (this.unconfirmed.has(nftId)) throw failure('exchange_unconfirmed');
        if (this.isPending(nftId)) throw failure('exchange_in_progress');
        costs = normalizeRows(costs); rewards = normalizeRows(rewards);
        const reserved = Object.fromEntries(costs.map(row => [row.item, (session.gameData.items?.[row.item] || 0) - row.amount]));
        if (Object.values(reserved).some(amount => !Number.isSafeInteger(amount) || amount < 0)) throw failure('insufficient_items');
        this.pending.add(nftId);
        // Other shops, gifts and consumables read this cache. Reserve inputs
        // before waiting, and only release sessions which held that reservation.
        const reservedSessions = this.updateSessions(nftId, items => Object.assign(items, reserved));
        try {
            const receipt = await this.dao.exchangeInventory({nftId, costs, rewards});
            this.updateSessions(nftId, items => Object.assign(items, receipt.quantities));
            return receipt;
        } catch (error) {
            if (error.exchangeUncertain) this.unconfirmed.add(nftId);
            else this.updateSessions(nftId, items => {
                for (const row of costs) items[row.item] = (items[row.item] || 0) + row.amount;
            }, reservedSessions);
            throw error;
        } finally {this.pending.delete(nftId);}
    }
}

module.exports = InventoryExchanges;

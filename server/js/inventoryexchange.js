const failure = (code, uncertain = false) => Object.assign(new Error(code), {code, exchangeUncertain: uncertain});

function normalizeRows(rows) {
    if (!Array.isArray(rows) || !rows.length) throw failure('invalid_exchange');
    const quantities = new Map();
    for (const row of rows) {
        if (typeof row?.item !== 'string' || !row.item || !Number.isSafeInteger(row.amount) || row.amount < 1) throw failure('invalid_exchange');
        const amount = (quantities.get(row.item) || 0) + row.amount;
        if (!Number.isSafeInteger(amount)) throw failure('invalid_exchange');
        quantities.set(row.item, amount);
    }
    return [...quantities].map(([item, amount]) => ({item, amount}));
}

// The legacy inventory endpoint has no atomic exchange or idempotency contract.
// Submit one batch only, then independently confirm every affected balance.
async function exchange(platform, {nftId, costs, rewards}) {
    costs = normalizeRows(costs); rewards = normalizeRows(rewards);
    const deltas = new Map();
    for (const [rows, sign] of [[costs, -1], [rewards, 1]]) {
        for (const row of rows) {
            deltas.set(row.item, (deltas.get(row.item) || 0) + row.amount * sign);
        }
    }
    const read = async () => {
        const balances = {};
        for (const item of deltas.keys()) {
            const result = await platform.getInventoryItem(nftId, item);
            if (!Number.isSafeInteger(result?.amount) || result.amount < 0) throw failure('inventory_unavailable');
            balances[item] = result.amount;
        }
        return balances;
    };
    const before = await read();
    if (costs.some(({item, amount}) => before[item] < amount)) throw failure('insufficient_items');
    const expected = Object.fromEntries([...deltas].map(([item, amount]) => [item, before[item] + amount]));
    if (Object.values(expected).some(amount => !Number.isSafeInteger(amount) || amount < 0)) throw failure('invalid_exchange');
    const batch = [...deltas].filter(([, amount]) => amount !== 0).map(([item, amount]) => ({nftId, item, amount}));
    try {await platform.storeInventoryTransaction(batch);} catch (_) {
        // A lost response can follow a successful commit. Read it back without
        // sending the same non-idempotent batch again.
    }
    let after;
    try {after = await read();} catch (_) {throw Object.assign(failure('exchange_pending', true), {before, expected});}
    if (Object.entries(expected).some(([item, amount]) => after[item] !== amount)) {
        throw Object.assign(failure('exchange_pending', true), {before, expected, actual: after});
    }
    return {quantities: after};
}

module.exports = {exchange, normalizeRows};

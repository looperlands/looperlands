// Sequence states share the Platform's atomic revision, receipt and inventory
// writer. Their namespace keeps them separate from ordinary farming plots.
function namespace(mapId, signature) {
    if (!/^[A-Za-z0-9_-]+$/.test(mapId) || !/^[a-f0-9]{64}$/.test(signature)) throw new Error('Invalid tile sequence identity');
    return 'tile-sequence:' + mapId + ':' + signature;
}

function state(plot, revision, signature) {
    if (!plot) return {revision};
    if (plot.state !== 'sequence' || plot.signature !== signature ||
        !(plot.sequenceStage === null || (typeof plot.sequenceStage === 'string' && /^[a-z][a-z0-9_-]{0,79}$/.test(plot.sequenceStage))) ||
        typeof plot.success !== 'boolean' ||
        !Number.isSafeInteger(plot.readyAt) || plot.readyAt < 0 || !Number.isSafeInteger(plot.tile) || plot.tile < 0) {
        throw new Error('Invalid tile sequence state response');
    }
    return {revision, stage: plot.sequenceStage, readyAt: plot.readyAt, tile: plot.tile};
}

async function read(platform, mapId, x, y, signature) {
    const result = await platform.getFarmState(namespace(mapId, signature), x, y);
    return state(result.plot, result.revision, signature);
}

async function commit(platform, transaction) {
    const t = transaction, mapId = namespace(t.mapId, t.signature);
    const deltas = new Map();
    for (const row of t.items) deltas.set(row.item, (deltas.get(row.item) || 0) + row.amount);
    const request = {requestId: t.requestId, nftId: t.nftId, mapId, x: t.x, y: t.y,
        expectedRevision: t.expectedRevision, action: 'sequence', item: null,
        plot: {mapId, x: t.x, y: t.y, ownerNftId: t.nftId, state: 'sequence', stage: 0,
            createdAt: Date.now(), signature: t.signature, sequenceStage: t.stage,
            readyAt: t.readyAt, tile: t.tile, success: t.success},
        items: [...deltas].filter(([, amount]) => amount !== 0).map(([item, amount]) => ({item, amount})), requiredItems: t.requiredItems, xp: t.xp};
    try {
        const receipt = await platform.commitFarmTransaction(request);
        return {state: state(receipt.plot, receipt.revision, t.signature), xp: receipt.xp,
            quantities: receipt.quantities, success: receipt.plot.success, replayed: receipt.replayed};
    } catch (error) {
        if (error.code === 'plot_changed') error.code = 'tile_changed';
        throw error;
    }
}

module.exports = {namespace, read, commit};

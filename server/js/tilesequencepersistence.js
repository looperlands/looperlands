// Sequence states share the Platform's atomic revision, receipt and inventory writer.
const crypto = require('crypto');
function identity(mapId, signature, owner) {
    if (!/^[A-Za-z0-9_-]+$/.test(mapId) || !/^[a-f0-9]{64}$/.test(signature) ||
        (owner !== undefined && (typeof owner !== 'string' || !owner))) throw new Error('Invalid tile sequence identity');
    // Personal progress uses a separate signature while retaining the Platform namespace contract.
    const key = owner === undefined ? signature : crypto.createHash('sha256').update(JSON.stringify([signature, owner])).digest('hex');
    return {mapId: 'tile-sequence:' + mapId + ':' + key, signature: key};
}
function namespace(mapId, signature, owner) {return identity(mapId, signature, owner).mapId;}

function state(plot, revision, signature) {
    if (!plot) return {revision};
    const effects = plot.sequenceEffects;
    if (effects !== undefined && (!Array.isArray(effects) || effects.some(row => !row ||
        typeof row.trigger !== 'string' || !/^[^<>\x00-\x1f]{1,100}$/.test(row.trigger) || typeof row.active !== 'boolean'))) {
        throw new Error('Invalid tile sequence state response');
    }
    if (plot.state !== 'sequence' || plot.signature !== signature ||
        !(plot.sequenceStage === null || (typeof plot.sequenceStage === 'string' && /^[a-z][a-z0-9_-]{0,79}$/.test(plot.sequenceStage))) ||
        typeof plot.success !== 'boolean' ||
        !Number.isSafeInteger(plot.readyAt) || plot.readyAt < 0 || !Number.isSafeInteger(plot.tile) || plot.tile < 0) {
        throw new Error('Invalid tile sequence state response');
    }
    return {revision, stage: plot.sequenceStage, readyAt: plot.readyAt, tile: plot.tile,
        ...(effects === undefined ? {} : {effects: Object.fromEntries(effects.map(row => [row.trigger, row.active]))})};
}

async function read(platform, mapId, x, y, signature, owner) {
    const id = identity(mapId, signature, owner);
    const result = await platform.getFarmState(id.mapId, x, y);
    return state(result.plot, result.revision, id.signature);
}

async function commit(platform, transaction) {
    const t = transaction, id = identity(t.mapId, t.signature, t.owner);
    const deltas = new Map();
    for (const row of t.items) deltas.set(row.item, (deltas.get(row.item) || 0) + row.amount);
    const request = {requestId: t.requestId, nftId: t.nftId, mapId: id.mapId, x: t.x, y: t.y,
        expectedRevision: t.expectedRevision, action: 'sequence', item: null,
        plot: {mapId: id.mapId, x: t.x, y: t.y, ownerNftId: t.nftId, state: 'sequence', stage: 0,
            createdAt: Date.now(), signature: id.signature, sequenceStage: t.stage,
            readyAt: t.readyAt, tile: t.tile, success: t.success,
            ...(t.effects === undefined ? {} : {sequenceEffects: Object.entries(t.effects).map(([trigger, active]) => ({trigger, active}))})},
        items: [...deltas].filter(([, amount]) => amount !== 0).map(([item, amount]) => ({item, amount})), requiredItems: t.requiredItems, xp: t.xp};
    try {
        const receipt = await platform.commitFarmTransaction(request);
        return {state: state(receipt.plot, receipt.revision, id.signature), xp: receipt.xp,
            quantities: receipt.quantities, success: receipt.plot.success, replayed: receipt.replayed};
    } catch (error) {
        if (error.code === 'plot_changed') error.code = 'tile_changed';
        throw error;
    }
}

async function reset(platform, transaction) {
    const t = transaction, id = identity(t.mapId, t.signature, t.owner);
    const current = await platform.getFarmState(id.mapId, t.x, t.y);
    const saved = state(current.plot, current.revision, id.signature);
    if (!current.plot || current.revision !== t.expectedRevision || saved.stage !== null ||
        !saved.readyAt || saved.readyAt > t.now || !current.plot.ownerNftId) {
        throw Object.assign(new Error('tile_changed'), {code: 'tile_changed'});
    }
    const requestId = crypto.createHash('sha256').update(JSON.stringify(['reset', id.mapId, t.x, t.y, current.revision])).digest('hex');
    const receipt = await commit(platform, {...t, requestId, nftId: current.plot.ownerNftId,
        readyAt: 0, items: [], requiredItems: [], xp: 0, success: true, effects: saved.effects});
    return receipt.state;
}

module.exports = {namespace, read, commit, reset};

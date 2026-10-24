const {isLocalPlaytest} = require('./localplaytest');

function configuration() {
    const baseUrl = process.env.LOOPERLANDS_OWNERSHIP_BASE_URL;
    const apiKey = process.env.LOOPERLANDS_OWNERSHIP_API_KEY;
    try {
        const url = new URL(baseUrl);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !apiKey) return null;
        return {baseUrl: url.href.replace(/\/$/, ''), apiKey};
    } catch {return null;}
}

function allowAll(session) {
    return isLocalPlaytest() && session?.localDoorAccess === 'allow-all';
}

async function checkOwnership(kind, id, wallet, session) {
    if (session?.localDoorAccess !== 'live') return true;
    const config = configuration();
    if (!config) throw new Error('Real ownership checks are not configured.');
    const route = kind === 'collection' ? 'collection' : 'asset/nft';
    try {
        const response = await fetch(`${config.baseUrl}/api/${route}/${encodeURIComponent(id)}/owns?wallet=${encodeURIComponent(wallet)}`, {
            headers: {'x-api-key': config.apiKey, Accept: 'application/json'},
            signal: AbortSignal.timeout(10000), redirect: 'error'
        });
        if (!response.ok) throw new Error('Ownership API unavailable');
        const result = await response.json();
        if (typeof result !== 'boolean') throw new Error('Invalid ownership response');
        return result;
    } catch {throw new Error('Real ownership could not be checked. Access was denied; try again.');}
}

module.exports = {configuration, allowAll, checkOwnership};

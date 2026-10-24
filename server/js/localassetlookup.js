const assetTypes = ['looper', 'weapon', 'ranged_weapon', 'fishingrod', 'companion', 'tracker'];
const pageSize = 25;
const defaultBase = 'https://api.looperlands.io/api/';
const fail = (message, status = 400) => {throw Object.assign(new Error(message), {status});};
function configuration(env = process.env) {
    const dedicated = !!(env.LOOPERLANDS_ASSET_API_BASE_URL || env.LOOPERLANDS_ASSET_API_KEY);
    const base = dedicated ? env.LOOPERLANDS_ASSET_API_BASE_URL || defaultBase : env.LOOPERLANDS_OWNERSHIP_BASE_URL || defaultBase;
    const key = dedicated ? env.LOOPERLANDS_ASSET_API_KEY : env.LOOPERLANDS_OWNERSHIP_API_KEY;
    try {
        const url = new URL(base);
        if (url.username || url.password || url.search || url.hash || !['https:', 'http:'].includes(url.protocol) ||
            (url.protocol === 'http:' && !['localhost','127.0.0.1','[::1]'].includes(url.hostname))) return null;
        // Accept both the Platform origin and the API base supplied by the user.
        const pathname = url.pathname.replace(/\/+$/, '');
        url.pathname = pathname.endsWith('/api') ? pathname : pathname + '/api';
        return {base: url.href.replace(/\/$/, ''), key: key || null};
    } catch {return null;}
}
function metadata(env) {const config = configuration(env); return {configured: !!config?.key, baseUrl: config?.base || defaultBase.replace(/\/$/, ''), assetTypes, pageSize};}
function validate(input) {
    const keyword = input?.keyword ?? '', type = input?.assetType ?? '', offset = input?.offset ?? 0;
    if (typeof keyword !== 'string' || keyword.length > 255 || /[\u0000-\u001f]/.test(keyword)) fail('Search text must contain at most 255 characters.');
    if (type !== '' && !assetTypes.includes(type)) fail('Choose a supported asset type.');
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000 || offset % pageSize) fail('Choose a valid results page.');
    return {keyword: keyword.trim(), type, offset};
}
async function readJson(response) {
    const reader = response.body.getReader(); let size = 0; const chunks = [];
    try {while (true) {const {done, value} = await reader.read(); if (done) break; size += value.length; if (size > 8*1024*1024) {await reader.cancel(); fail('The Platform response is too large. Narrow your search.', 502);} chunks.push(Buffer.from(value));}}
    finally {reader.releaseLock();}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function asset(row) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !row.id || typeof row.nftId !== 'string') fail('The Platform returned an unexpected asset response.', 502);
    // Never forward holders, rentals, wallet information, game progress or credentials.
    const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
    return {id: text(row.id, 100), nftId: text(row.nftId, 150), name: text(row.name, 300), assetType: text(row.assetType, 80), collection: text(row.collection, 300)};
}
async function searchAssets(input, options = {}) {
    const config = configuration(options.env), query = validate(input);
    if (!config?.key) fail('Configure LOOPERLANDS_ASSET_API_KEY with asset_read access, then restart the toolbox.', 503);
    const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(query.keyword), nft = /^0x[0-9a-f]{64}$/i.test(query.keyword);
    const exact = uuid || nft;
    const route = uuid ? '/asset/' + encodeURIComponent(query.keyword) : nft ? '/asset/nft/' + encodeURIComponent(query.keyword) : '/asset/search';
    try {
        const response = await fetch(config.base + route, {method: exact ? 'GET' : 'POST', headers: {'x-api-key': config.key, Accept: 'application/json', 'Content-Type': 'application/json'},
            ...(!exact ? {body: JSON.stringify({...(query.keyword ? {keyword: query.keyword} : {}), offset: query.offset, limit: pageSize+1, ...(query.type ? {assetType: [query.type]} : {})})} : {}),
            redirect: 'error', signal: AbortSignal.timeout(options.timeout ?? 10000)});
        if ([401,403].includes(response.status)) fail('The Platform denied access. Check the API key and its asset_read scope.', 502);
        if (response.status === 429) fail('The Platform is rate limiting searches. Wait a moment and try again.', 503);
        if (exact && response.status === 404) return {assets: [], offset: 0, hasMore: false};
        if (!response.ok) fail('The Platform could not complete this search. Try again shortly.', 502);
        const payload = await readJson(response);
        const envelope = !exact && payload && !Array.isArray(payload) && Array.isArray(payload.assets) && Number.isSafeInteger(payload.total) && payload.total >= 0;
        const rows = exact ? (payload ? [payload] : []) : envelope ? payload.assets : payload;
        if (!Array.isArray(rows)) fail('The Platform returned an unexpected asset response.', 502);
        const entries = rows.map(asset).filter(row => !query.type || row.assetType === query.type);
        return {assets: entries.slice(0,pageSize), offset: exact ? 0 : query.offset, hasMore: !exact && (envelope ? query.offset + pageSize < payload.total : entries.length > pageSize)};
    } catch (error) {
        if (error.status) throw error;
        fail('The live Platform search is unavailable or timed out. Check the connection and try again.', 502);
    }
}
function install(app, toolbox) {
    app.get('/local/api/live-assets', (req,res) => res.json(metadata()));
    app.post('/local/api/live-assets/search', async (req,res) => {
        try {if (toolbox.closed) fail('The toolbox is shutting down.', 503); res.json(await searchAssets(req.body));}
        catch (error) {res.status(error.status || 500).json({error: error.message});}
    });
}
module.exports = {configuration, metadata, validate, searchAssets, install, pageSize};

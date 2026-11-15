// Pure scene geometry shared by local authoring catalogs and game map loading.
function validateScenes(scenes, map) {
    const fail = message => {throw Object.assign(new Error(message), {status: 400});};
    if (!Array.isArray(scenes) || scenes.length > 100) fail('Use at most 100 scenes per map.');
    const ids = new Set();
    for (const scene of scenes) {
        if (!scene || Object.keys(scene).some(key => !['id', 'name', 'x', 'y', 'w', 'h', 'weatherExposure'].includes(key))) fail('Scene contains unsupported fields.');
        if (scene.weatherExposure !== undefined && !['auto', 'outdoor', 'indoor'].includes(scene.weatherExposure)) fail('Choose automatic, outdoor or indoor weather exposure.');
        if (!/^[A-Za-z0-9_-]{1,100}$/.test(scene.id) || ['__proto__', 'constructor', 'prototype', 'mapmaker-default'].includes(String(scene.id)) || ids.has(String(scene.id))) fail('Scenes need unique IDs containing letters, numbers, underscores or hyphens.');
        ids.add(String(scene.id));
        if (typeof scene.name !== 'string' || scene.name.length > 120 || /[<>\u0000-\u001f]/.test(scene.name)) fail('Scene names must be plain text, up to 120 characters.');
        if (!['x', 'y', 'w', 'h'].every(key => Number.isInteger(scene[key])) || scene.x < 0 || scene.y < 0 || scene.w < 1 || scene.h < 1 || scene.x + scene.w > map.width || scene.y + scene.h > map.height) fail('Scene bounds must use whole tiles and stay inside the map.');
    }
    return scenes;
}
const layoutFields = ['id', 'name', 'x', 'y', 'w', 'h', 'weatherExposure'];
function sceneBaseline(scenes) {
    return scenes.map(scene => ({name: scene.name || '', ...Object.fromEntries(layoutFields.filter(key => scene[key] !== undefined).map(key => [key, scene[key]]))}));
}
function applyScenes(map, scenes, baseline) {
    if (scenes == null) return map;
    validateScenes(scenes, baseline ? {width: Number.MAX_SAFE_INTEGER, height: Number.MAX_SAFE_INTEGER} : map);
    // Atmosphere adds this synthetic region after layout reconciliation, including in baked exports.
    const built = new Map((map.scenes || []).filter(scene => scene.id !== 'mapmaker-default').map(scene => [String(scene.id), scene]));
    const previous = new Map((baseline || []).map(scene => [String(scene.id), scene]));
    const merged = [];
    for (const scene of scenes) {
        const id = String(scene.id), current = built.get(id), original = previous.get(id);
        // A removed Tiled region must not survive as a copied Toolbox region.
        if (original && !current) continue;
        const next = {...current, ...scene};
        if (original) for (const key of layoutFields) {
            if (key !== 'id' && (key === 'name' ? scene[key] || '' : scene[key]) === (key === 'name' ? original[key] || '' : original[key])) {
                if (current[key] === undefined) delete next[key];
                else next[key] = current[key];
            }
        }
        merged.push(next);
    }
    if (baseline) for (const [id, scene] of built) {
        if (!previous.has(id) && !scenes.some(saved => String(saved.id) === id)) merged.push({...scene});
    }
    validateScenes(sceneBaseline(merged), map);
    return {...map, scenes: merged};
}
module.exports = {validateScenes, applyScenes, sceneBaseline};

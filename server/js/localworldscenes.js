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
function applyScenes(map, scenes) {
    if (scenes == null) return map;
    validateScenes(scenes, map);
    return {...map, scenes: scenes.map(scene => ({...(map.scenes || []).find(base => String(base.id) === String(scene.id)), ...scene}))};
}
module.exports = {validateScenes, applyScenes};

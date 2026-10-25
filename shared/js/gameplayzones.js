(function(root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.GameplayZones = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    const kinds = {checkpoint: {label: 'Checkpoint', layer: 'checkpoints'}, trigger: {label: 'Trigger area', layer: 'triggers'},
        pvp: {label: 'PvP area', layer: 'pvpzones'}, music: {label: 'Music area', layer: 'music'}, eventboard: {label: 'Event-board area', layer: 'eventBoards'}};
    function properties(object) {return Object.fromEntries([].concat(object.properties || []).flatMap(group => [].concat(group.property || [])).map(p => [p.name, p.value]));}
    function starting(object) {const p = properties(object);return p.starting == null ? !!(object.type || object.class) : ['1','true'].includes(String(p.starting));}
    function checkpointId(object, index) {return Number(properties(object).checkpointId ?? index + 1);}
    function contains(area, x, y) {return x >= area.x && y >= area.y && x < area.x + (area.width ?? area.w) && y < area.y + (area.height ?? area.h);}
    return {kinds, properties, starting, checkpointId, contains};
});

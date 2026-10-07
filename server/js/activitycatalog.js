// Export the actual runtime kind registry and map tile-action definitions.
function buildActivityCatalog(types, stageDefinitions, maps = []) {
    const mobs = new Map(), items = new Map();
    types.forEachKind((kind, name) => {
        if (kind === undefined || typeof kind === 'function') return;
        const value = String(kind);
        const label = name.startsWith('NFT_') ? name : name.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
        const entry = {value, label, kind: name};
        if (types.isMob(kind)) mobs.set(value, entry);
        if (types.isItem(kind)) items.set(value, entry);
    });
    const tileActions = [];
    for (const [map, definitions] of Object.entries(stageDefinitions)) {
        for (const [action, definition] of Object.entries(definitions)) {
            const stages = ['prepare', 'plant', 'water', 'boost', 'harvest'].filter(stage => stage === 'plant' || stage === 'harvest' || definition[stage] || (stage === 'boost' && definition.careBoosts?.length));
            tileActions.push({map, action, stages, targets: Object.entries(definition.crops || {}).map(([value,crop]) => ({value,label:crop.displayName || crop.name || value}))});
        }
    }
    const sorted = entries => [...entries.values()].sort((a,b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value));
    return {schemaVersion: 1, mobs: sorted(mobs), items: sorted(items), tileActions, maps: [...new Set([...maps, ...Object.keys(stageDefinitions)])].sort()};
}
module.exports = {buildActivityCatalog};

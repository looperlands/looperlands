// Export the actual runtime kind registry and map tile-action definitions.
function buildActivityCatalog(types, stageDefinitions, maps = [], lakeDefinitions = {}, itemName = value => value, transferable = () => false) {
    const mobs = new Map(), items = new Map();
    types.forEachKind((kind, name) => {
        if (kind === undefined || typeof kind === 'function') return;
        const value = String(kind);
        const label = name.startsWith('NFT_') ? name : name.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
        const entry = {value, label, kind: name};
        if (types.isMob(kind)) mobs.set(value, entry);
        if (types.isItem(kind)) items.set(value, entry);
    });
    const prizeItems = new Map([...items.values()].filter(entry => transferable(Number(entry.value))).map(entry => [entry.value, entry]));
    const tileActions = [];
    for (const [map, definitions] of Object.entries(stageDefinitions)) {
        for (const [action, definition] of Object.entries(definitions)) {
            const stages = ['prepare', 'plant', 'water', 'boost', 'harvest'].filter(stage => stage === 'plant' || stage === 'harvest' || definition[stage] || (stage === 'boost' && definition.careBoosts?.length));
            tileActions.push({map, action, stages, targets: Object.entries(definition.crops || {}).map(([value,crop]) => ({value,label:crop.displayName || crop.name || value}))});
        }
    }
    const fish = new Map(), lakes = new Map();
    for (const [lake, definition] of Object.entries(lakeDefinitions)) {
        if (!definition || typeof definition !== 'object' || !definition.fish) continue;
        lakes.set(lake, {value: lake, label: lake.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')});
        for (const [value, rarity] of Object.entries(definition.fish)) {
            fish.set(value + '/' + lake, {value, label: itemName(value), lake, rarity});
            if (transferable(value)) prizeItems.set(value, {value, label: itemName(value)});
        }
    }
    const sorted = entries => [...entries.values()].sort((a,b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value));
    return {schemaVersion: 1, mobs: sorted(mobs), items: sorted(items), prizeItems: sorted(prizeItems), fish: sorted(fish), lakes: sorted(lakes), tileActions, maps: [...new Set([...maps, ...Object.keys(stageDefinitions)])].sort()};
}
module.exports = {buildActivityCatalog};

// These are extra seasonal actors, never replacements for a resident's shop,
// quest or daily routine. Stable keys connect placement, dialogue and objectives.
const placements = [
    {key: 'halloween:witch', kind: 'WHISPYWITCH', label: 'Whispy, the Unreliable Witch', x: 46, y: 214},
    {key: 'halloween:footprints', kind: 'halloween_footprints', label: 'Abandoned Shoes', x: 46, y: 181},
    {key: 'halloween:pumpkin', kind: 'halloween_pumpkin', label: 'The Whispering Pumpkin', x: 19, y: 164},
    {key: 'halloween:gravedigger-left', kind: 'halloween_ghost', label: 'Mara, the Gravedigger', x: 23, y: 118},
    {key: 'halloween:gravedigger-right', kind: 'halloween_ghost', label: 'Rowan, the Gravedigger', x: 26, y: 118},
    {key: 'halloween:memorial', kind: 'halloween_memorial', label: 'The Burial Register', x: 25, y: 115},
    {key: 'halloween:well', kind: 'halloween_well', label: 'The Whispering Well', x: 46, y: 297},
    {key: 'halloween:keepsake', kind: 'halloween_keepsake', label: 'A Lost Ring', x: 19, y: 297}
];

// A loop through the western Graveyard. Each ghost has its own stopping tiles:
// shared occupied destinations would make the whole procession wait in a cycle.
// Normal NPC pathfinding still avoids residents, doors, players and other ghosts.
const stops = [{x: 22, y: 123}, {x: 29, y: 130}, {x: 30, y: 120}];
for (const [i, offset] of [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}].entries()) {
    const route = stops.map(point => ({x: point.x + offset.x, y: point.y + offset.y}));
    placements.push({key: 'halloween:procession-' + (i + 1), kind: 'halloween_ghost',
        label: ['The Late Fisherman', 'The Wandering Musician', 'A Very Convincing Ghost'][i], ...route[0],
        area: {x: 18, y: 117, width: 16, height: 16},
        route: [...route.slice(1), route[0]].map(point => ({...point, waitSeconds: 8, activity: 'following the lantern road'}))});
}

module.exports = {placements};

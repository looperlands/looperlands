// These are extra seasonal actors, never replacements for a resident's shop,
// quest or daily routine. Stable keys connect placement, dialogue and objectives.
const placements = [
    {key: 'halloween:witch', kind: 'WHISPYWITCH', label: 'Whispy, the Unreliable Witch', x: 46, y: 214},
    {key: 'halloween:footprints', kind: 'halloween_footprints', label: 'Abandoned Shoes', x: 36, y: 211},
    {key: 'halloween:pumpkin', kind: 'halloween_pumpkin', label: 'The Whispering Pumpkin', x: 29, y: 213},
    {key: 'halloween:gravedigger-left', kind: 'halloween_ghost', label: 'Mara, the Gravedigger', x: 51, y: 225},
    {key: 'halloween:gravedigger-right', kind: 'halloween_ghost', label: 'Rowan, the Gravedigger', x: 54, y: 225},
    {key: 'halloween:memorial', kind: 'halloween_memorial', label: 'The Burial Register', x: 52, y: 222},
    {key: 'halloween:well', kind: 'halloween_well', label: 'The Whispering Well', x: 16, y: 241},
    {key: 'halloween:keepsake', kind: 'halloween_keepsake', label: 'A Lost Ring', x: 32, y: 234}
];

// A compact loop on the market paths. Each ghost begins at a different stop;
// normal NPC pathfinding avoids residents, doors, players and other ghosts.
const stops = [{x: 41, y: 211}, {x: 45, y: 223}, {x: 29, y: 214}];
for (let i = 0; i < 3; i++) placements.push({key: 'halloween:procession-' + (i + 1), kind: 'halloween_ghost',
    label: ['The Late Fisherman', 'The Wandering Musician', 'A Very Convincing Ghost'][i], ...stops[i],
    route: [...stops.slice(i + 1), ...stops.slice(0, i + 1)].map(point => ({...point, waitSeconds: 8, activity: 'following the lantern road'}))});

module.exports = {placements};

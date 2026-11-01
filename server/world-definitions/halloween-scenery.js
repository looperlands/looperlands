// Seasonal dressing is a runtime overlay. Tile guards refer to the current
// export so a later map edit cannot accidentally recolor a different object.
const {placements} = require('./halloween-actors');
const witch = placements.find(actor => actor.key === 'halloween:witch');
const well = placements.find(actor => actor.key === 'halloween:well');
const cauldron = {x: witch.x + 1, y: witch.y};
const pumpkin = (x, y) => ({image: '/img/1/item-m88npumpkin.png', x, y});
const decorations = [
    // Town remains the meeting place; clues lead north and south from here.
    [39, 211], [43, 213], [48, 215], [41, 224], [49, 224], [31, 215],
    // Forest bridge, fork and western camp.
    [45, 183], [48, 180], [42, 158], [17, 164], [21, 163], [21, 165],
    // Graveyard crypts and procession stops.
    [21, 119], [29, 119], [24, 113], [21, 124], [32, 129], [32, 121],
    // Beach approach and the two shoreline palms.
    [36, 258], [45, 278], [45, 297], [47, 296], [22, 297], [18, 296]
].map(([x, y]) => pumpkin(x, y));
decorations.push({image: '/img/1/item-m88ncauldron.png', ...cauldron});

function recolor(x, y, first, width, height, colorDifference) {
    return Array.from({length: width * height}, (_, i) => ({x: x + i % width, y: y + Math.floor(i / width),
        from: first + i % width + Math.floor(i / width) * 20, colorShift: {colorDifference, progress: 1}}));
}
const tiles = [
    ...recolor(33, 202, 213, 4, 4, {r: 65, g: -52, b: -28}),
    ...recolor(51, 208, 213, 4, 4, {r: 65, g: -52, b: -28}),
    ...recolor(33, 216, 44, 8, 4, {r: 36, g: -24, b: 22})
];

const ambientSounds = [
    {id: 'cauldron', name: 'The bubbling cauldron', preset: 'lava', ...cauldron, radius: 7, volume: .24},
    {id: 'well', name: 'The whispering well', preset: 'water', x: well.x, y: well.y, radius: 6, volume: .25}
];

module.exports = {decorations, tiles, ambientSounds};

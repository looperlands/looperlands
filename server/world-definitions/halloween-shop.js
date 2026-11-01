const Types = require('../../shared/js/gametypes');
const {availability} = require('./halloween-season');

module.exports = {
    id: 'halloween-cauldron', mapId: 'main', npcKey: 'halloween:witch', availability,
    inventory: [
        {id: 1, item: Types.Entities.BOTTLED_MIDNIGHT, name: 'Bottled Midnight', amount: 1, minPlayerLevel: 1,
            description: 'A keepsake with a little night inside.',
            longDescription: 'Bottle the shadow hiding in a pumpkin. A permanent Halloween souvenir; it is not consumed.',
            price: {m88npumpkin: 1, GOLD: 5}},
        {id: 2, item: Types.Entities.GRAVEYARD_STEW, name: 'Graveyard Stew', amount: 1, minPlayerLevel: 1,
            description: 'Restores 75 HP. Somehow still warm.',
            longDescription: 'Fuel the cauldron with wood and let the witch supply the suspicious ingredients. Restores 75 HP; 15 second cooldown.',
            price: {wood: 2, GOLD: 3}},
        {id: 3, item: Types.Entities.BORROWED_COURAGE, name: 'Borrowed Courage', amount: 1, minPlayerLevel: 1,
            description: 'Take 20% less melee damage for 30 seconds.',
            longDescription: 'The witch steeps iron ore until it becomes courage. Take 20% less melee damage for 30 seconds; 60 second cooldown.',
            price: {ore: 1, GOLD: 3}}
    ]
};

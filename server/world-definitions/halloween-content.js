const path = require('path');
const source = require('../js/seasonalcontent').readDocument(path.resolve(__dirname, '../..'), 'main');
require('./halloween-contract').validate('main', source.events);

// One startup snapshot is shared by the quest, shop, actor and scenery adapters.
// The Toolbox reads the file separately; a fresh game process loads saved edits.
const event = source.events.find(event => event.id === 'halloween');
const availability = {...event.availability, enabled: event.enabled};
module.exports = {event, availability};

const {Cutscene} = require('../js/cutscene');
const definition = require('./lantern-picnic-cutscene');
// Compatibility wrapper for local replay and the existing picnic test fixture.
module.exports = class LanternPicnicScene extends Cutscene {
    constructor(world, now = Date.now) {super(world, definition, now);}
};

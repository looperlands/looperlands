
const classes = require('./playerclassmodifiers.js').classes;

class PlayerClassController {

    getPlayerClasses(req, res) {
        res.json(classes);
    }
}

module.exports.PlayerClassController = PlayerClassController;
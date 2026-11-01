const definition = require('../world-definitions/halloween-shop');
const HalloweenShopController = require('./halloweenshopcontroller');

function installHttp(app, services) {
    const shop = new HalloweenShopController(definition, services);
    // Exact feature routes are installed before the normal shop fallback.
    app.get('/shop/' + definition.id + '/inventory', (req, res) => res.status(200).json(shop.inventory()));
    app.get('/session/:sessionId/shop/' + definition.id + '/buy/:itemId', (req, res) => shop.buy(req, res));
}

module.exports = {installHttp};

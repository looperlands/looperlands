const definition = require('../world-definitions/halloween-shop');
const HalloweenShopController = require('./halloweenshopcontroller');

function installHttp(app, services, source = definition) {
    const shop = new HalloweenShopController(source, services);
    // Exact feature routes are installed before the normal shop fallback.
    app.get('/shop/' + source.id + '/inventory', (req, res) => res.status(200).json(shop.inventory()));
    app.get('/session/:sessionId/shop/' + source.id + '/buy/:itemId', (req, res) => shop.buy(req, res));
}

module.exports = {installHttp};

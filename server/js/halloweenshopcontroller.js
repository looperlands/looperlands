const Availability = require('./contentavailability');
const Types = require('../../shared/js/gametypes');

class HalloweenShopController {
    constructor(definition, {inventoryExchanges, cache, worlds, fieldGuide}) {
        this.definition = definition;
        this.inventoryExchanges = inventoryExchanges;
        this.cache = cache; this.worlds = worlds; this.fieldGuide = fieldGuide;
    }

    inventory() {
        return Availability.isAvailable(this.definition.availability) ? this.definition.inventory : [];
    }

    async buy(req, res) {
        const fail = (status, error) => res.status(status).json({status: false, error});
        const session = this.cache.get(req.params.sessionId);
        if (!session) return fail(404, 'This game session has ended.');
        const world = this.worlds()?.[session.mapId], player = world?.getPlayerById(session.entityId);
        const nearby = player && player.hasEnteredGame && !player.isDead && session.mapId === this.definition.mapId &&
            Object.values(world.npcs || {}).some(npc => npc.behaviorState?.key === this.definition.npcKey &&
                Math.abs(npc.x - player.x) + Math.abs(npc.y - player.y) <= 5);
        if (!nearby) return fail(403, 'Visit the witch beside her cauldron in Town to brew this recipe.');
        if (!Availability.isAvailable(this.definition.availability)) return fail(410, 'The Halloween cauldron has closed for the season.');
        const quantity = req.query.quantity === undefined ? 1 : Number(req.query.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return fail(400, 'Quantity must be a whole number from 1 to 99.');
        const item = this.definition.inventory.find(row => String(row.id) === req.params.itemId);
        if (!item) return fail(404, 'This recipe is not available.');
        if (player.level < item.minPlayerLevel) return fail(400, 'Reach level ' + item.minPlayerLevel + ' before brewing this recipe.');
        const costs = Object.entries(item.price).map(([key, amount]) => ({item: String(Types.getKindFromString(key)), amount: amount * quantity}));
        const rewards = [{item: String(item.item), amount: item.amount * quantity}];
        try {
            await this.inventoryExchanges.exchange({sessionId: req.params.sessionId, costs, rewards});
        } catch (error) {
            if (error.exchangeUncertain) {
                console.error('[Halloween cauldron] Unconfirmed exchange; manual inventory check required.',
                    {nftId: session.nftId, recipe: item.id, quantity, before: error.before, expected: error.expected, actual: error.actual});
                return fail(409, 'The brew could not be confirmed. Do not repeat it; ask a game administrator to check your inventory.');
            }
            if (error.code === 'exchange_unconfirmed') return fail(409, 'Your previous brew could not be confirmed. Ask a game administrator to check your inventory before trying again.');
            if (error.code === 'exchange_in_progress') return fail(409, 'Your cauldron is still brewing. Wait for this purchase to finish.');
            if (error.code === 'session_unavailable') return fail(404, 'This game session has ended.');
            if (error.code === 'insufficient_items') return fail(400, 'You do not have enough ingredients for this recipe.');
            return fail(503, 'The cauldron cannot reach your inventory. Please try again later.');
        }
        try {this.fieldGuide.observe(player, 'obtain', item.item, item.amount * quantity);}
        catch (error) {console.error('[Halloween cauldron] Confirmed purchase; field guide update failed:', error.message);}
        return res.status(200).send({});
    }
}

module.exports = HalloweenShopController;

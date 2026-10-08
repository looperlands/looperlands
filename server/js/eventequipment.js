// Event levels are calculated per session. Saved XP and other players are untouched.
class EventEquipment {
    constructor(platform, enabled = process.env.EVENT_EQUIPMENT_ENABLED === 'true') {
        this.platform = platform;
        this.enabled = enabled;
        this.players = new Set();
        this.timer = enabled ? setInterval(() => this.tick(), 1000) : null;
        this.timer?.unref();
    }
    async register(player) {
        if (!this.enabled) return;
        await this.refresh(player);
        this.players.add(player);
    }
    async refresh(player) {
        const previous = player.eventGrants || [];
        const response = await this.platform.getEventEquipment(player.walletId);
        if (!Array.isArray(response?.grants)) throw new Error('Event equipment service unavailable');
        player.eventGrants = response.grants;
        player.eventGrantsCheckedAt = Date.now();
        const borrowed = new Set(response.grants.flatMap(grant => grant.borrowedNftIds || []));
        const equipped = player.getNFTWeapon?.()?.nftId;
        if (previous.some(grant => (grant.borrowedNftIds || []).some(nft => (nft === player.nftId || nft === equipped) && !borrowed.has(nft)))) {
            player.connection.close('Event rental access ended. Choose your own equipment to continue.');
        }
    }
    tick() {
        for (const player of this.players) {
            if (player.connection.closed || player.isDead && !player.hasEnteredGame) { this.players.delete(player); continue; }
            const equipped = player.getNFTWeapon?.()?.nftId;
            if ((player.eventGrants || []).some(grant => Date.parse(grant.endsAt) <= Date.now() && (grant.borrowedNftIds || []).some(nft => nft === player.nftId || nft === equipped))) {
                player.connection.close('Event rentals have expired. Choose your own equipment to continue.');
                this.players.delete(player); continue;
            }
            const level = effectiveLevel(player, 'avatarLevel', player.level);
            if (level !== player.eventEffectiveLevel && player.hasEnteredGame) {
                player.eventEffectiveLevel = level;
                player.updateHitPoints();
            }
            if (!player.eventRefreshPending && Date.now() - player.eventGrantsCheckedAt > 15000) {
                player.eventRefreshPending = true;
                this.refresh(player).catch(() => {
                    // A signed-up event session cannot continue with unverified team rules.
                    if (player.eventGrants?.length) player.connection.close('Event equipment could not be verified. Reconnect to continue.');
                    player.eventGrantsCheckedAt = Date.now();
                }).finally(() => { player.eventRefreshPending = false; });
            }
        }
    }
    unregister(player) { this.players.delete(player); }
    close() { clearInterval(this.timer); }
}
function activeGrants(player, now = Date.now()) {
    return (player.eventGrants || []).filter(grant => Date.parse(grant.startsAt) <= now && now < Date.parse(grant.endsAt) && grant.maps.includes(player.mapId || player.server?.server?.cache?.get(player.sessionId)?.mapId));
}
function effectiveLevel(player, field, original, now = Date.now()) {
    const grants = activeGrants(player, now).filter(grant => Number.isInteger(grant[field]) && grant[field] >= 1 && grant[field] <= 100);
    // Conflicting signed-up events cannot combine overrides. Close before another combat action.
    if (grants.length > 1 && new Set(grants.map(grant => grant[field])).size > 1) {
        player.connection.close('Overlapping events have conflicting level rules. Contact the event organizer.');
        return original;
    }
    return grants[0]?.[field] ?? original;
}
function effectiveLevelInfo(player, field, original, now = Date.now()) {
    const currentLevel = effectiveLevel(player, field, original.currentLevel, now);
    return currentLevel === original.currentLevel ? original : {...original, currentLevel, percentage: '0.00', normalLevel: original.currentLevel};
}
module.exports = {EventEquipment, effectiveLevel, effectiveLevelInfo, activeGrants};

const Types = require('../../shared/js/gametypes');
const Messages = require('./message');
const {merchant} = require('../world-definitions/points-exchange');
const {gameplayNameFromSession} = require('./socialchat');
const walletKey = wallet => wallet.toLowerCase().split(':')[0];
class PointsStoreController {
    constructor(cache, worlds, platform, socialChat, syncActivity = async () => {}) {
        this.cache = cache; this.worlds = worlds; this.platform = platform; this.socialChat = socialChat;
        this.syncActivity = syncActivity;
        this.rewardCache = new Map(); this.pending = new Set();
    }
    context(sessionId) {
        const session = this.cache.get(sessionId), world = session && this.worlds()[session.mapId], player = world?.getPlayerById(session.entityId);
        if (!player?.hasEnteredGame || player.isDead || player.sessionId !== sessionId || player.walletId !== session.walletId || player.mapId !== session.mapId || player.isBot?.()) return null;
        return {session,player,world};
    }
    nearMerchant({session,player,world}) {
        return session.mapId === merchant.mapId && Object.values(world.npcs || {}).some(npc => npc.behaviorState?.key === merchant.key && Math.abs(npc.x-player.x)+Math.abs(npc.y-player.y)<=3);
    }
    async profile(wallet, force = false) {
        const key = walletKey(wallet), cached = this.rewardCache.get(key);
        if (!force && cached && cached.expires > Date.now()) return cached.value;
        const value = await this.platform.getRewardUnlocks(wallet);
        if (!Array.isArray(value.unlocks) || !Array.isArray(value.rewards)) throw new Error('Invalid rewards response');
        this.rewardCache.set(key,{value,expires:Date.now()+15000});
        return value;
    }
    async canEmote(player, emotion) {
        if (!Object.hasOwn(Types.emotions,emotion)) return false;
        if (!Object.hasOwn(Types.unlockableEmotions,emotion)) return true;
        try {return (await this.profile(player.walletId)).unlocks.includes('emote:'+emotion);}
        catch (_) {return false;}
    }
    applyProfile(wallet, profile) {
        const selected = profile.rewards.find(reward => reward.id === profile.selectedTitle && reward.type === 'title' && profile.unlocks.includes(reward.id));
        let changed = false;
        for (const id of this.cache.keys()) {
            const session = this.cache.get(id);
            if (!session?.walletId || walletKey(session.walletId) !== walletKey(wallet)) continue;
            const label = selected?.label || null;
            const titleChanged = (session.rewardTitle || null) !== label;
            session.rewardTitle = label; this.cache.set(id,session);
            const live = this.context(id);
            if (!live) continue;
            const trail = profile.rewards.find(reward => reward.id === profile.selectedTrail && reward.type === 'trail' && profile.unlocks.includes(reward.id))?.id || null;
            if ((live.player.selectedTrail || null) !== trail) {
                live.player.selectedTrail = trail;
                live.world.pushBroadcast({serialize:()=>[Types.Messages.PLAYER_TRAIL,live.player.id,trail]});
            }
            if (!titleChanged) continue;
            live.player.name = gameplayNameFromSession(session);
            const packet = [Types.Messages.PLAYER_TITLE,live.player.id,live.player.name,session.title];
            live.world.pushBroadcast({serialize:()=>packet}); changed = true;
        }
        if (changed) this.socialChat?.broadcastPresence();
    }
    async refreshPlayer(player) {
        this.applyProfile(player.walletId,await this.profile(player.walletId));
    }
    async list(req,res) {
        const context = this.context(req.params.sessionId);
        if (!context) return res.status(401).json({error:'Your game session is no longer active.'});
        try {
            await this.syncActivity();
            const data = await this.platform.getPointsStore(context.session.walletId, Math.max(1, Math.floor(Number(context.player.level) || 1)));
            const current = this.context(req.params.sessionId);
            if (!current) return res.status(409).json({error:'Your session changed. Reopen the store.'});
            this.applyProfile(context.session.walletId,data);
            return res.json({...data,wallet:walletKey(context.session.walletId),canPurchase:this.nearMerchant(current)});
        } catch (_) {return res.status(503).json({error:'Points are temporarily unavailable.'});}
    }
    async rewards(req,res) {
        const context = this.context(req.params.sessionId);
        if (!context) return res.status(401).json({error:'Your game session is no longer active.'});
        try {
            const data = await this.profile(context.session.walletId,true);
            this.applyProfile(context.session.walletId,data); return res.json(data);
        } catch (_) {return res.status(503).json({error:'Rewards are temporarily unavailable.'});}
    }
    async refreshAsset(wallet,nftId) {
        const asset = await this.platform.getNFT(nftId);
        for (const id of this.cache.keys()) {
            const session = this.cache.get(id);
            if (!session?.walletId || walletKey(session.walletId) !== walletKey(wallet)) continue;
            if (session.nftId === nftId) {session.trait = asset.trait; this.cache.set(id,session);}
            const live = this.context(id);
            if (!live) continue;
            const player = live.player;
            if (session.nftId === nftId) {
                const oldMax = player.playerClassModifiers.maxHp;
                await player.playerClassModifiers.reloadClass(asset.trait);
                if (!this.context(id) || this.context(id).player !== player) continue;
                player.maxHitPoints = Math.round(player.maxHitPoints*player.playerClassModifiers.maxHp/oldMax);
                player.hitPoints = Math.min(player.hitPoints,player.maxHitPoints);
                player.send(new Messages.HitPoints(player.maxHitPoints).serialize());
                player.send(new Messages.Health(player.hitPoints,false).serialize());
            }
            const equipped = player.getNFTWeapon?.();
            if (equipped?.nftId === nftId) equipped.trait = asset.trait;
        }
    }
    async buy(req,res) {
        const context = this.context(req.params.sessionId);
        if (!context) return res.status(401).json({error:'Your game session is no longer active.'});
        if (!this.nearMerchant(context)) return res.status(403).json({error:'Visit the Points Exchange beside the main-map event board.'});
        if (context.player.target || Object.keys(context.player.attackers || {}).length || context.player.pendingFish) return res.status(409).json({error:'Finish combat or fishing before making a purchase.'});
        const body = req.body;
        if (!body || body.confirmed !== true || typeof body.requestId !== 'string' || !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(body.requestId) || typeof body.productId !== 'string' || body.productId.length>100 ||
            ['nftId','choice'].some(key => body[key] != null && (typeof body[key] !== 'string' || body[key].length>255))) return res.status(400).json({error:'Confirm a valid purchase.'});
        const wallet = context.session.walletId, key = walletKey(wallet);
        if (this.pending.has(key)) return res.status(409).json({error:'A purchase is still being processed. Retry the same purchase shortly.'});
        this.pending.add(key);
        let receipt;
        try {
            receipt = await this.platform.purchasePointsItem(wallet,{requestId:body.requestId,productId:body.productId,nftId:body.nftId ?? null,choice:body.choice ?? null});
        } catch (error) {
            this.pending.delete(key);
            const rejected = error.response?.status === 400;
            return res.status(rejected ? 400 : 503).json({error:rejected ? error.response.data?.error || 'Purchase rejected.' : 'Purchase not confirmed. Retry this same purchase to check it safely.',uncertain:!rejected});
        }
        // A confirmed purchase is never reported as a failed purchase because a live refresh failed.
        let refreshRequired = false;
        try {
            if (receipt.nftId) await this.refreshAsset(wallet,receipt.nftId);
            this.applyProfile(wallet,await this.profile(wallet,true));
        } catch (_) {refreshRequired = true;}
        this.pending.delete(key);
        return res.json({...receipt,refreshRequired});
    }
    async title(req,res) {
        const context = this.context(req.params.sessionId);
        if (!context) return res.status(401).json({error:'Your game session is no longer active.'});
        if (!Object.hasOwn(req.body || {},'title') || (req.body.title !== null && typeof req.body.title !== 'string')) return res.status(400).json({error:'Choose an unlocked title.'});
        try {
            await this.platform.selectRewardTitle(context.session.walletId,req.body.title);
            const profile = await this.profile(context.session.walletId,true); this.applyProfile(context.session.walletId,profile);
            return res.json(profile);
        } catch (error) {return res.status(error.response?.status === 400 ? 400 : 503).json({error:error.response?.status === 400 ? error.response.data.error : 'Title could not be confirmed. Refresh your rewards.'});}
    }
    async trail(req,res) {
        const context = this.context(req.params.sessionId);
        if (!context) return res.status(401).json({error:'Your game session is no longer active.'});
        if (!Object.hasOwn(req.body || {},'trail') || (req.body.trail !== null && typeof req.body.trail !== 'string')) return res.status(400).json({error:'Choose an unlocked trail.'});
        try {
            await this.platform.selectRewardTrail(context.session.walletId,req.body.trail);
            const profile = await this.profile(context.session.walletId,true); this.applyProfile(context.session.walletId,profile);
            return res.json(profile);
        } catch (error) {return res.status(error.response?.status === 400 ? 400 : 503).json({error:error.response?.status === 400 ? error.response.data.error : 'Trail could not be confirmed. Refresh your rewards.'});}
    }
}
module.exports = PointsStoreController;

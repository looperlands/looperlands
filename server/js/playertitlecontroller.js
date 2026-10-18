const Types = require('../../shared/js/gametypes');
const Utils = require('./utils');
const {gameplayNameFromSession} = require('./socialchat');

class PlayerTitleController {
    constructor(cache, worlds, platform, socialChat) {
        this.cache = cache;
        this.worlds = worlds;
        this.platform = platform;
        this.socialChat = socialChat;
        this.pending = new Set();
    }

    context(sessionId) {
        const session = this.cache.get(sessionId);
        const world = session && this.worlds()[session.mapId];
        const player = world?.getPlayerById(session.entityId);
        if (!player?.hasEnteredGame || player.sessionId !== sessionId ||
            player.walletId !== session.walletId || player.mapId !== session.mapId || player.isBot()) return null;
        return {session, player, world};
    }

    async prompt(req, res) {
        const context = this.context(req.params.sessionId);
        if (!context) return res.status(401).json({error: 'Your game session is no longer active.'});
        try {
            const result = await this.platform.claimPlayerTitlePrompt(context.session.walletId);
            return res.json({showPrompt: result?.showPrompt === true});
        } catch (_) {
            return res.status(503).json({error: 'Name prompt is temporarily unavailable.'});
        }
    }

    async save(req, res) {
        const context = this.context(req.params.sessionId);
        if (!context) return res.status(401).json({error: 'Your game session is no longer active.'});
        const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
        if (!/^[\p{L}\p{N}][\p{L}\p{N} ._’'-]{1,23}$/u.test(title)) {
            return res.status(400).json({error: 'Use 2–24 letters, numbers, spaces or . _ - and apostrophes.'});
        }
        if (Utils.sanitize(title) !== title) return res.status(400).json({error: 'Please choose another display name.'});
        const wallet = context.session.walletId.toLowerCase();
        if (this.pending.has(wallet)) return res.status(409).json({error: 'Your name is already being saved.'});
        this.pending.add(wallet);
        try {
            const saved = await this.platform.setPlayerTitle(context.session.walletId, title);
            if (typeof saved?.title !== 'string' || saved.displayName !== title) throw new Error('Invalid title response');
            let name = gameplayNameFromSession({...context.session, title: saved.title});
            // Saving can overlap a teleport or reconnect. Refresh the wallet's current sessions.
            for (const id of this.cache.keys()) {
                const session = this.cache.get(id);
                if (session?.walletId?.toLowerCase() !== wallet) continue;
                session.title = saved.title;
                this.cache.set(id, session);
                const currentName = gameplayNameFromSession(session);
                name = currentName;
                const live = this.context(id);
                if (!live) continue;
                live.player.title = saved.title;
                live.player.name = currentName;
                const packet = [Types.Messages.PLAYER_TITLE, live.player.id, currentName, saved.title];
                live.world.pushBroadcast({serialize: () => packet});
            }
            this.socialChat.broadcastPresence();
            return res.json({title: saved.title, displayName: title, name});
        } catch (_) {
            return res.status(503).json({error: 'Your name could not be saved. Please try again.'});
        } finally {
            this.pending.delete(wallet);
        }
    }
}

module.exports = PlayerTitleController;

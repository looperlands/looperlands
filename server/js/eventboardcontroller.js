const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

class EventBoardController {
    constructor(sessions, worlds, platform, decorate = value => value) {
        this.sessions = sessions;
        this.worlds = worlds;
        this.platform = platform;
        this.decorate = decorate;
    }

    context(sessionId) {
        const session = this.sessions.get(sessionId);
        const world = session && this.worlds()[session.mapId];
        const player = world?.getPlayerById(session.entityId);
        if (!player || player.sessionId !== sessionId || player.walletId !== session.walletId || player.mapId !== session.mapId) return null;
        return {session, world, player};
    }

    nearBoard({world, player}) {
        return (world.map.eventBoards || []).some(board => {
            const dx = Math.max(board.x - player.x, 0, player.x - (board.x + board.w - 1));
            const dy = Math.max(board.y - player.y, 0, player.y - (board.y + board.h - 1));
            return dx + dy <= 1;
        });
    }

    async list(req, res, live = false) {
        const context = this.context(req.params.sessionId);
        if (!context) return res.status(401).json({error: 'Your game session is no longer active.'});
        if (!live && !this.nearBoard(context)) return res.status(403).json({error: 'Walk up to the town event board to browse events.'});
        const requestedMap = context.player.mapId;
        try {
            const data = await this.platform.getEventBoard(context.session.walletId, context.session.nftId, live ? context.player.mapId : null);
            // The player may change maps or disconnect while the platform responds.
            const current = this.context(req.params.sessionId);
            if (!current || current.player !== context.player || current.player.mapId !== requestedMap || (!live && !this.nearBoard(current))) {
                return res.status(409).json({error: 'Your location changed. Please reopen the event board.'});
            }
            const now = Date.now();
            if (live) data.events = data.events.filter(event => event.status === 'live' && event.maps.includes(current.player.mapId) && Date.parse(event.startsAt) <= now && Date.parse(event.endsAt) > now);
            return res.json(this.decorate(data));
        } catch (error) {
            return res.status(503).json({error: 'Events are temporarily unavailable. Please try again.'});
        }
    }

    async register(req, res) {
        const context = this.context(req.params.sessionId);
        if (!context) return res.status(401).json({error: 'Your game session is no longer active.'});
        if (!this.nearBoard(context)) return res.status(403).json({error: 'Walk up to the town event board to sign up.'});
        const {eventId, runId, action} = req.params;
        if (!UUID.test(eventId) || !UUID.test(runId) || !['join', 'withdraw'].includes(action) || req.body?.confirmed !== true) {
            return res.status(400).json({error: 'Confirm the event and round before changing your sign-up.'});
        }
        try {
            await this.platform.registerEvent(context.session.walletId, eventId, runId, action);
            return res.json({success: true});
        } catch (error) {
            return res.status(error.response?.status === 409 ? 409 : 503).json({error: error.response?.status === 409 ? error.response.data?.error || 'Sign-ups for this round are closed.' : 'Sign-up could not be confirmed. Refresh the board before trying again.'});
        }
    }
}

module.exports = {EventBoardController};

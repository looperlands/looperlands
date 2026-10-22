const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Reload tickets are server-authored, short-lived and consumed by one socket.
// The mounted chat directory also carries tickets across an announced reboot.
class ClientReloadController {
    constructor(server, flush, options = {}) {
        this.server = server;
        this.flush = flush;
        this.now = options.now || Date.now;
        this.file = options.file || process.env.CLIENT_RELOAD_SPOOL_PATH ||
            path.join(path.dirname(process.env.CHAT_HISTORY_FILE || path.resolve(__dirname, '../../data/chat/history.json')), 'client-reloads.json');
        this.requests = new Map();
        this.records = new Map();
        this.recent = new Map();
        if (fs.existsSync(this.file)) {
            const records = JSON.parse(fs.readFileSync(this.file, 'utf8'));
            if (!Array.isArray(records)) throw new Error('Invalid client reload spool');
            for (const record of records) {
                if (!/^[a-f0-9]{40}$/.test(record.id || '') || !Number.isFinite(record.session?.resumeState?.expiresAt)) throw new Error('Invalid client reload ticket');
                if (record.session.resumeState.expiresAt <= this.now()) continue;
                this.records.set(record.id, record.session);
                this.server.cache.set(record.id, record.session, 180);
            }
        }
    }

    persist() {
        fs.mkdirSync(path.dirname(this.file), {recursive: true, mode: 0o700});
        const temporary = this.file + '.tmp-' + crypto.randomBytes(6).toString('hex');
        const data = [...this.records].filter(([, session]) => session.resumeState.expiresAt > this.now()).map(([id, session]) => ({id, session}));
        let descriptor;
        try {
            descriptor = fs.openSync(temporary, 'wx', 0o600);
            fs.writeFileSync(descriptor, JSON.stringify(data)); fs.fsyncSync(descriptor);
            fs.closeSync(descriptor); descriptor = undefined;
            fs.renameSync(temporary, this.file);
            descriptor = fs.openSync(path.dirname(this.file), 'r'); fs.fsyncSync(descriptor);
            fs.closeSync(descriptor); descriptor = undefined;
        } finally {
            if (descriptor !== undefined) fs.closeSync(descriptor);
            if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
        }
    }

    player(sessionId) {
        if (typeof sessionId !== 'string' || !sessionId) return null;
        const session = this.server.cache.get(sessionId);
        const player = session && this.server.worldsMap?.[session.mapId]?.getPlayerById(session.entityId);
        return player?.hasEnteredGame && player.sessionId === sessionId && !player.isBot?.() ? player : null;
    }

    busy(player) {
        const attacks = this.server.worldsMap[player.mapId]?.combat?.fieldAttacks?.attacks;
        return player.isDead || !!player.target || Object.keys(player.attackers || {}).length > 0 ||
            !!attacks && [...attacks.values()].some(attack => attack.encounter.player === player ||
                attack.lane.some(tile => tile.x === player.x && tile.y === player.y));
    }

    async savePlayer(player) {
        await player.syncExperience?.();
        // Weapons and equipped tools both use the player's nftWeapon slot.
        const item = player.getNFTWeapon?.();
        await item?.syncExperience?.();
        if (item?.accumulatedExperience > 0) throw new Error('Equipment experience is not saved yet');
        if (player.accumulatedExperience > 0) throw new Error('Player experience is not saved yet');
    }

    unfreeze(player) {
        if (!player.clientReloadPending) return;
        const pending = player.clientReloadPending;
        player.invincible = pending.invincible && (!Number.isFinite(pending.invincibilityExpiresAt) || pending.invincibilityExpiresAt > this.now());
        clearTimeout(player.clientReloadPending.timer);
        clearTimeout(player.clientReloadPending.freezeTimer);
        player.clientReloadPending = null;
    }

    async ticket(player, revision, reboot = false) {
        if (player.clientReloadPending) throw new Error('Client reload is already pending');
        if (this.requests.get(player.sessionId) || player.pendingMessages) throw new Error('Player requests are still finishing');
        for (const [wallet, until] of this.recent) if (until <= this.now()) this.recent.delete(wallet);
        if (!reboot && this.recent.has(player.walletId)) throw new Error('Client reload is cooling down');
        this.server.gameModes?.beforeClientReload(player);
        const state = {invincible: player.invincible, invincibilityExpiresAt: player.invincibilityExpiresAt, revision};
        player.clientReloadPending = state;
        player.invincible = true;
        state.freezeTimer = setTimeout(() => this.unfreeze(player), 10000);
        state.freezeTimer.unref?.();
        try {
            await this.savePlayer(player);
            await this.flush();
            if (this.player(player.sessionId) !== player || player.clientReloadPending !== state) throw new Error('Player session changed or reload timed out');
            const current = this.server.cache.get(player.sessionId);
            const id = crypto.randomBytes(20).toString('hex');
            const session = JSON.parse(JSON.stringify({...current, entityId: undefined, botSessionId: undefined, isDirty: false,
                x: player.x, y: player.y, checkpointId: player.lastCheckpoint?.id ?? current.checkpointId,
                resumeState: {revision, reboot, expiresAt: this.now() + 180000, hp: player.hitPoints, dead: player.isDead,
                    orientation: player.orientation,
                    consumableBuff: {buff: player.consumableBuff?.buff, expireTime: player.consumableBuff?.expireTime},
                    invincibilityExpiresAt: player.invincibilityExpiresAt,
                    cooldowns: player.server.consumeCooldowns?.[player.nftId] || {}}}));
            this.records.set(id, session);
            try {this.persist();} catch (error) {this.records.delete(id); throw error;}
            this.server.cache.set(id, session, 180);
            state.ticket = id;
            this.recent.set(player.walletId, this.now() + 30000);
            clearTimeout(state.freezeTimer);
            if (!reboot) state.freezeTimer = setTimeout(() => {
                if (this.player(player.sessionId) !== player) return;
                this.records.delete(id); this.server.cache.del(id); this.unfreeze(player);
                try {this.persist();} catch (error) {console.error('[client-reload] Could not revoke a ticket');}
            }, 5000);
            state.freezeTimer?.unref?.();
            state.timer = setTimeout(() => {
                if (this.records.has(id)) {
                    this.records.delete(id); this.server.cache.del(id);
                    try { this.persist(); } catch (error) { console.error('[client-reload] Could not expire a ticket'); }
                }
                this.unfreeze(player);
            }, 180000);
            state.timer.unref?.();
            return id;
        } catch (error) { if (player.clientReloadPending === state) this.unfreeze(player); throw error; }
    }

    data(session) {
        return session?.resumeState && session.resumeState.expiresAt > this.now() && session.gameData &&
            (!session.resumeState.reboot || session.f2p) ? session.gameData : null;
    }

    claim(sessionId, playerId) {
        const session = this.server.cache.get(sessionId);
        const state = session?.resumeState;
        if (!state) return null;
        if (state.expiresAt <= this.now() || state.claim && state.claim !== playerId) throw new Error('Client reload ticket is no longer valid');
        state.claim = playerId;
        session.resumeState = state; this.server.cache.set(sessionId, session, 180);
        return state;
    }

    complete(player) {
        const session = this.server.cache.get(player.sessionId);
        if (!session?.resumeState || session.resumeState.claim !== player.id) return;
        // Commit consumption before allowing this resumed player to act.
        const record = this.records.get(player.sessionId);
        this.records.delete(player.sessionId);
        try {this.persist();} catch (error) {if (record) this.records.set(player.sessionId, record); throw error;}
        delete session.resumeState;
        this.server.cache.set(player.sessionId, session);
    }

    disconnected(player) {
        if (!player.sessionId) return;
        const session = this.server.cache.get(player.sessionId);
        if (!player.hasEnteredGame && session?.resumeState?.claim === player.id) {
            delete session.resumeState.claim;
            session.isDirty = false;
            this.server.cache.set(player.sessionId, session, 180);
        }
    }

    revokeWallet(walletId) {
        const revoked = [...this.records].filter(([, session]) => session.walletId?.toLowerCase() === walletId?.toLowerCase());
        if (!revoked.length) return;
        for (const [id] of revoked) this.records.delete(id);
        try {this.persist();}
        catch (error) {for (const [id, session] of revoked) this.records.set(id, session); throw error;}
        for (const [id] of revoked) this.server.cache.del(id);
    }

    async reboot(revision) {
        if (this.rebooting) throw new Error('A reboot is already pending');
        this.rebooting = true;
        const issued = [];
        this.rebootPending = issued;
        try {
            if ([...this.requests.values()].some(count => count > 0)) throw new Error('Player requests are still finishing');
            for (const world of Object.values(this.server.worldsMap)) for (const player of Object.values(world.players)) {
                if (player.hasEnteredGame && !player.isBot?.()) {
                    const id = await this.ticket(player, revision, true);
                    if (this.rebootPending !== issued) {
                        this.records.delete(id); this.server.cache.del(id); this.unfreeze(player);
                        throw new Error('Reboot cancelled');
                    }
                    issued.push({player, id});
                }
            }
            await this.flush();
            if (this.rebootPending !== issued) throw new Error('Reboot cancelled');
            for (const {player, id} of issued) player.connection._connection.emit('server-reboot', {revision, sessionId: id});
            return issued.length;
        } catch (error) {
            for (const {player, id} of issued) {this.records.delete(id); this.server.cache.del(id); this.unfreeze(player);}
            if (this.rebootPending === issued) {this.rebootPending = null; this.rebooting = false;}
            this.persist(); throw error;
        }
    }

    cancelReboot() {
        for (const {player, id} of this.rebootPending || []) {
            this.records.delete(id); this.server.cache.del(id); this.unfreeze(player);
            player.connection._connection.emit('server-reboot-cancelled');
        }
        this.rebootPending = null;
        this.rebooting = false;
        this.persist();
    }

    attach(app, clients) {
        app.post('/session/:sessionId/client-reload', async (req, res) => {
            if (this.rebooting) return res.status(503).json({retry: true});
            const player = this.player(req.params.sessionId);
            if (!player) return res.sendStatus(401);
            if (req.body?.revision !== clients.current.revision) return res.status(409).json({retry: true});
            if (this.busy(player)) return res.status(409).json({retry: true});
            try { return res.json({sessionId: await this.ticket(player, req.body.revision), revision: req.body.revision}); }
            catch (error) { return res.status(503).json({retry: true}); }
        });
        app.use('/session/:sessionId', (req, res, next) => {
            const id = req.params.sessionId;
            if (this.rebooting) return res.status(503).json({error: 'Server update is in progress'});
            if (this.player(id)?.clientReloadPending) return res.status(409).json({error: 'Client reload is in progress'});
            this.requests.set(id, (this.requests.get(id) || 0) + 1);
            let completed = false;
            const done = () => {if (!completed) {completed = true; const count = (this.requests.get(id) || 1) - 1; if (count) this.requests.set(id, count); else this.requests.delete(id);}};
            res.once('finish', done); res.once('close', done);
            next();
        });
    }
}

module.exports = {ClientReloadController};

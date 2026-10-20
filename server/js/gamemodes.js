// Admin-only production playtest; access is verified by GameModesAccess.
const {randomUUID} = require('crypto');
const defaults = require('./gamemodes.venues.json');
const inside = (point, area) => point.x >= area.x && point.y >= area.y && point.x < area.x + area.w && point.y < area.y + area.h;
const fail = (message, status = 409) => { const error = new Error(message); error.status = status; throw error; };

class GameModes {
    constructor(server, {config = defaults, now = Date.now, tick = true, authorization} = {}) {
        this.server = server;
        this.config = config;
        this.now = now;
        this.authorization = authorization || {allowed: () => false, verify: async () => false};
        this.matches = new Map();
        this.access = new Map();
        this.npcId = null;
        this.npcPosition = this.config.venues[0].npc;
        this.demo = {id: 'demo:moss', name: 'Moss', demo: true, avatar: 'leatherarmor'};
        if (tick) { this.interval = setInterval(() => this.tick(), 180); this.interval.unref(); }
    }

    context(sessionId) {
        const session = this.server.cache.get(sessionId);
        const world = session && this.server.worldsMap?.[session.mapId];
        const player = world?.getPlayerById(session.entityId);
        if (!player?.hasEnteredGame || player.isDead || player.isBot() || player.sessionId !== sessionId || player.walletId !== session.walletId || player.mapId !== session.mapId) fail('Your game session ended. Please reconnect.', 401);
        return {id: session.walletId, sessionId, name: player.name, player, world, session};
    }

    people() {
        return Object.values(this.server.worldsMap || {}).flatMap(world => Object.values(world.players || {}))
            .filter(player => player.hasEnteredGame && !player.isDead && !player.isBot())
            .map(player => ({id: player.walletId, name: player.name, player, sessionId: player.sessionId, avatar: 'clotharmor'}));
    }

    actor(id) {
        if (id === this.demo.id) return this.demo;
        const member = this.activeFor(id)?.members.find(entry => entry.id === id);
        return this.people().find(person => person.id === id && (!member?.sessionId || person.sessionId === member.sessionId));
    }
    venue(id) { return this.config.venues.find(venue => venue.id === id) || fail('That venue is unavailable.', 404); }
    mode(id) { return this.config.modes.find(mode => mode.id === id) || fail('Choose an available activity.', 400); }

    eligibility(id, venue) {
        if (venue.access !== 'public' && venue.access !== 'crypt-pass') return {allowed: false, reason: 'This venue has an unsupported access rule.'};
        if (venue.access === 'crypt-pass' && !this.access.get(id)) return {allowed: false, reason: 'Crypt pass required'};
        return {allowed: true, reason: 'Access confirmed'};
    }

    activeFor(id) {
        return [...this.matches.values()].find(match => match.phase !== 'closed' && (match.host === id || match.members.some(member => member.id === id && member.status !== 'invited')));
    }

    occupied(venue, excluding) {
        const space = venue.sharesSpaceWith || venue.id;
        return [...this.matches.values()].some(match => match.id !== excluding && ['countdown', 'playing'].includes(match.phase)
            && (this.venue(match.venueId).sharesSpaceWith || match.venueId) === space);
    }

    create(context, modeId, venueId, {host = context.id, invite = null} = {}) {
        if (context.player.mapId !== 'main' || !this.authorization.allowed(context.id)) fail('The playtest requires a platform admin wallet on the main map.', 403);
        if (this.activeFor(context.id)) fail('Leave your current lobby before creating another.');
        const mode = this.mode(modeId), venue = this.venue(venueId);
        if (!venue.modes.includes(mode.id)) fail('This activity is not supported at that venue.', 400);
        if (host !== this.demo.id && !this.eligibility(host, venue).allowed) fail('You need a Crypt pass to host here.', 403);
        if (this.occupied(venue)) fail('This space is in use. Try another venue or wait.');
        const match = {id: randomUUID(), host, modeId, venueId, phase: 'lobby', visibility: 'invite', createdAt: this.now(), version: 1,
            members: [{id: host, sessionId: host === context.id ? context.sessionId : null, status: 'joined', ready: host === this.demo.id, progress: 0, rounds: 0}], invites: [], result: null};
        this.matches.set(match.id, match);
        if (invite) this.invite(match, host, invite);
        return match;
    }

    invite(match, sender, target) {
        if (match.host !== sender || match.phase !== 'lobby') fail('Only the host can invite players to this lobby.', 403);
        if (!this.actor(target) || sender === target) fail('That player is not available.');
        if (this.activeFor(target) && this.activeFor(target).id !== match.id) fail('That player is already in another activity.');
        if (match.modeId === 'duel' && target === this.demo.id) fail('Duel needs a second player. Open the second-player link.');
        if (match.members.some(member => member.id === target)) fail('That player already has an invitation.');
        if (match.members.length >= this.mode(match.modeId).players[1]) fail('The lobby is full.');
        match.members.push({id: target, status: 'invited', ready: false, progress: 0, rounds: 0, expiresAt: this.now() + 60000});
        if (target === this.demo.id) match.demoJoinsAt = this.now() + 1200;
    }

    match(id) { return this.matches.get(id) || fail('This invitation is no longer available.', 404); }

    requireMember(context, match, host = false) {
        const member = match.members.find(member => member.id === context.id && member.status !== 'invited');
        if (!member || member.sessionId && member.sessionId !== context.sessionId || host && match.host !== context.id) fail('You cannot change this lobby.', 403);
        return member;
    }

    action(context, action, input) {
        if (action === 'create') return this.create(context, input.modeId, input.venueId);
        if (action === 'demo-invite') {
            this.access.set(this.demo.id, true);
            const match = this.create(context, 'laststand', input.locked ? 'crypt-court' : 'town-green', {host: this.demo.id, invite: context.id});
            match.demoHost = true;
            return match;
        }
        if (action === 'access') {
            this.access.set(context.id, input.allowed === true);
            for (const match of this.matches.values()) if (match.phase === 'lobby') {
                const member = match.members.find(member => member.id === context.id);
                if (member) member.ready = false;
            }
            return;
        }
        if (action === 'meet-keeper') {
            if (this.playing(context.player)) fail('Leave the round before visiting the keeper.');
            if (context.player.mapId !== 'main') fail('Visit the main map to meet the activity keeper.');
            return this.teleport(context.player, context.world, this.config.venues[0].waiting);
        }
        const match = this.match(input.matchId);
        const member = match.members.find(member => member.id === context.id);
        if (action === 'join') {
            if (match.phase !== 'lobby' || match.visibility !== 'open') fail('This lobby is not open to join.', 403);
            if (this.activeFor(context.id)) fail('Leave your current lobby first.');
            if (member) fail('You already have a place or invitation in this group.');
            if (match.members.length >= this.mode(match.modeId).players[1]) fail('The lobby is full.');
            if (!this.eligibility(context.id, this.venue(match.venueId)).allowed) fail('You do not have access to this venue.', 403);
            match.members.push({id: context.id, sessionId: context.sessionId, status: 'joined', ready: false, progress: 0, rounds: 0});
            return;
        }
        if (action === 'accept') {
            if (!member || member.status !== 'invited' || member.expiresAt <= this.now() || match.phase !== 'lobby') fail('This invitation expired. Ask for another.');
            if (this.activeFor(context.id)) fail('Leave your current lobby before accepting another.');
            if (!this.eligibility(context.id, this.venue(match.venueId)).allowed) fail('You need a Crypt pass to enter this venue.', 403);
            member.status = 'joined'; member.sessionId = context.sessionId;
            return;
        }
        if (action === 'decline') {
            if (!member || member.status !== 'invited') fail('This invitation is no longer available.');
            match.members = match.members.filter(entry => entry !== member);
            if (match.demoHost) match.phase = 'closed';
            return;
        }
        this.requireMember(context, match);
        if (action === 'leave') {
            if (match.phase === 'playing' || match.phase === 'countdown') this.finish(match, context.name + ' left the activity.', 'cancelled');
            match.members = match.members.filter(entry => entry.id !== context.id);
            if (match.host === context.id || !match.members.some(entry => entry.id !== this.demo.id && entry.status !== 'invited')) match.phase = 'closed';
            return;
        }
        if (action === 'rematch') {
            if (match.phase !== 'results') fail('Finish this round first.');
            this.requireMember(context, match, true);
            match.phase = 'lobby'; match.result = null; match.version++;
            for (const entry of match.members) { entry.ready = entry.id === this.demo.id; entry.progress = 0; entry.rounds = 0; entry.finishedAt = null; }
            return;
        }
        if (match.phase !== 'lobby') fail('The match is already starting.');
        if (action === 'invite') return this.invite(match, context.id, input.targetId);
        if (action === 'uninvite') {
            this.requireMember(context, match, true);
            match.members = match.members.filter(entry => entry.id !== input.targetId || entry.status !== 'invited');
            return;
        }
        if (action === 'change-venue') {
            this.requireMember(context, match, true);
            const venue = this.venue(input.venueId);
            if (!venue.modes.includes(match.modeId)) fail('This venue does not support that activity.', 400);
            if (!this.eligibility(context.id, venue).allowed) fail('You do not have access to this venue.', 403);
            match.venueId = venue.id; match.version++;
            for (const entry of match.members) entry.ready = entry.id === this.demo.id;
            return;
        }
        if (action === 'visibility') { this.requireMember(context, match, true); match.visibility = input.open ? 'open' : 'invite'; return; }
        if (action === 'ready') {
            if (!this.eligibility(context.id, this.venue(match.venueId)).allowed) fail('Your venue access changed. Choose another venue or restore access.', 403);
            member.ready = !member.ready;
            if (match.demoHost && member.ready) this.start(match);
            return;
        }
        if (action === 'start') { this.requireMember(context, match, true); return this.start(match); }
        fail('Unknown playtest action.', 400);
    }

    start(match) {
        const mode = this.mode(match.modeId), venue = this.venue(match.venueId);
        const members = match.members.filter(member => member.status !== 'invited');
        if (members.length < mode.players[0]) fail('Waiting for another player.');
        if (match.members.some(member => member.status === 'invited')) fail('Wait for invited players to respond, or ask them to decline.');
        if (members.some(member => !member.ready)) fail('Everyone needs to be ready.');
        if (this.occupied(venue, match.id)) fail('Another match just started in this space. Please wait.');
        for (const member of members) {
            const actor = this.actor(member.id);
            if (!actor || !actor.demo && (!this.authorization.allowed(member.id) || actor.player.mapId !== venue.map)) fail('A player disconnected, lost admin access or left this map.');
            if (!this.eligibility(member.id, venue).allowed) { member.ready = false; fail('A player no longer has access to this venue.', 403); }
        }
        for (const [index, member] of members.entries()) if (member.id !== this.demo.id) {
            const point = this.freePoint(this.server.worldsMap.main, venue.spawns[index % venue.spawns.length]);
            if (!inside(point, venue.area)) fail('The venue spawn is blocked. Choose another venue.');
        }
        match.phase = 'countdown'; match.startsAt = this.now() + 3000; match.endsAt = match.startsAt + mode.duration * 1000;
        match.startedAt = match.startsAt;
        match.wave = 0; match.mobIds = new Set();
        for (const [index, member] of members.entries()) {
            const actor = this.actor(member.id);
            if (actor.demo) continue;
            member.returnTo = {x: actor.player.x, y: actor.player.y};
            member.returnHealth = actor.player.hitPoints;
            this.recover(actor.player);
            this.teleport(actor.player, this.server.worldsMap[actor.player.mapId], venue.spawns[index % venue.spawns.length]);
        }
    }

    recover(player) {
        player.updateHitPoints();
        player.server?.pushToPlayer(player, player.health());
    }

    teleport(player, world, destination) {
        const Messages = require('./message');
        const free = this.freePoint(world, destination);
        player.clearTarget(); player.setPosition(free.x, free.y);
        world.combat?.teleport(player);
        player.send(new Messages.Teleport(player).serialize());
        world.handleEntityGroupMembership(player);
        player.broadcast(new Messages.Teleport(player));
        world.pushRelevantEntityListTo(player);
        return free;
    }

    freePoint(world, point) {
        for (let radius = 0; radius <= 7; radius++) for (let y = point.y - radius; y <= point.y + radius; y++) for (let x = point.x - radius; x <= point.x + radius; x++) {
            if (world.isValidPosition(x, y) && !Object.values(world.npcs || {}).some(npc => npc.x === x && npc.y === y)) return {x, y};
        }
        fail('The venue spawn is blocked. Choose another venue.');
    }

    finish(match, text, outcome = 'complete') {
        if (match.phase === 'results' || match.phase === 'closed') return;
        const world = this.server.worldsMap?.main;
        for (const id of match.mobIds || []) { const mob = world?.entities[id]; if (mob) world.despawn(mob); }
        match.phase = 'results'; match.result = {text, outcome, elapsed: Math.max(0, this.now() - (match.startedAt || match.startsAt)), completedAt: this.now()};
        match.mobIds = new Set();
        for (const member of match.members) {
            member.ready = false;
            const actor = this.actor(member.id);
            if (actor?.player && member.returnTo) {
                actor.player.hitPoints = Math.min(actor.player.maxHitPoints, Math.max(1, member.returnHealth ?? actor.player.hitPoints));
                actor.player.server?.pushToPlayer(actor.player, actor.player.health());
                if (actor.player.mapId === 'main') this.teleport(actor.player, world, member.returnTo);
            }
        }
    }

    playing(player) {
        const match = player?.walletId && this.activeFor(player.walletId);
        return match && ['countdown', 'playing'].includes(match.phase)
            && match.members.some(member => member.id === player.walletId && member.sessionId === player.sessionId) ? match : null;
    }

    canDamage(attacker, target) {
        if (!attacker || !target) return false;
        const attackMatch = this.playing(attacker), targetMatch = this.playing(target);
        if (!attackMatch && !targetMatch && !attacker.gameModesMatchId && !target.gameModesMatchId) return true;
        const match = attackMatch || targetMatch;
        if (!match || match.phase !== 'playing') return false;
        const venue = this.venue(match.venueId);
        if (match.members.some(member => member.id !== this.demo.id && !this.authorization.allowed(member.id))) return false;
        if (!inside(attacker, venue.area) || !inside(target, venue.area)) return false;
        if (attacker.type === 'player' && target.type === 'player') return match.modeId === 'duel' && attackMatch === targetMatch;
        return !!(match.modeId === 'laststand' && (attackMatch && target.gameModesMatchId === match.id || targetMatch && attacker.gameModesMatchId === match.id));
    }

    canSee(player, entity) {
        return !entity?.gameModesMatchId || this.playing(player)?.id === entity.gameModesMatchId;
    }

    handlePlayerHurt(player, attacker, damage) {
        if (!this.canDamage(attacker, player)) return true;
        const match = this.playing(player);
        if (!match) return false;
        const Formulas = require('./formulas');
        damage = Math.max(1, Math.round(damage ?? (match.modeId === 'duel'
            ? Formulas.dmg(attacker.getLevel() + attacker.getWeaponLevel(), Math.round(player.getLevel() * .5))
            : Formulas.dmg(attacker.getWeaponLevel(), Math.round(player.getLevel() * .5)) * player.playerClassModifiers.meleeDamageTaken)));
        if (player.hitPoints - damage > 0) {
            player.hitPoints -= damage; player.server.handleHurtEntity(player, attacker, damage); return true;
        }
        player.hitPoints = 1; player.server.pushToPlayer(player, player.health());
        if (match.modeId === 'laststand') this.finish(match, 'The team fell on wave ' + match.wave + '. Try another run.', 'defeat');
        else {
            const winner = match.members.find(member => member.id === attacker.walletId); winner.rounds++;
            if (winner.rounds >= 2) this.finish(match, attacker.name + ' wins the duel!');
            else {
                match.phase = 'countdown'; match.startsAt = this.now() + 3000;
                for (const entry of match.members) { const actor = this.actor(entry.id); if (actor?.player) this.recover(actor.player); }
            }
        }
        return true;
    }

    handleHurtEntity(world, entity, attacker, damage, critical) {
        if (!entity.gameModesMatchId && !this.playing(entity) && !this.playing(attacker)) return false;
        const Messages = require('./message');
        if (entity.type === 'player') world.pushToPlayer(entity, entity.health());
        if (attacker.type === 'player') world.pushToPlayer(attacker, new Messages.Damage(entity, damage, critical));
        if (entity.gameModesMatchId && entity.hitPoints <= 0) {
            world.clearMobAggroLink(entity); world.despawn(entity);
        }
        // Practice kills never enter the normal XP, loot, quest or event path.
        return true;
    }

    spawnWave(match, world) {
        const Mob = require('./mob');
        const Types = require('../../shared/js/gametypes');
        const Utils = require('./utils');
        const venue = this.venue(match.venueId);
        match.wave++;
        for (const [index, kind] of this.config.waves[match.wave - 1].entries()) {
            const point = this.freePoint(world, venue.enemySpawns[index % venue.enemySpawns.length]);
            const mob = new Mob(Utils.getID(), Types.getKindFromString(kind), point.x, point.y);
            mob.gameModesMatchId = match.id;
            mob.handleRespawn = () => {};
            mob.onMove(world.onMobMoveCallback.bind(world));
            mob.onExitCombat(world.onMobExitCombatCallback.bind(world));
            world.addMob(mob); match.mobIds.add(mob.id);
        }
    }

    tick() {
        const world = this.server.worldsMap?.main;
        if (!world?.zoneGroupsReady) return;
        // The keeper is drawn only by authorized clients; no public NPC is added.
        for (const match of this.matches.values()) {
            if (match.phase === 'closed') { if (this.now() - (match.result?.completedAt || match.createdAt) > 120000) this.matches.delete(match.id); continue; }
            match.members = match.members.filter(member => member.status !== 'invited' || member.expiresAt > this.now());
            if (match.phase === 'lobby' && match.demoJoinsAt && this.now() >= match.demoJoinsAt) {
                const member = match.members.find(member => member.id === this.demo.id);
                if (member && this.eligibility(member.id, this.venue(match.venueId)).allowed) { member.status = 'joined'; member.ready = true; }
                match.demoJoinsAt = null;
            }
            if (!['countdown', 'playing'].includes(match.phase)) continue;
            if (match.members.some(member => !this.actor(member.id))) { this.finish(match, 'A player disconnected. The round was cancelled.', 'cancelled'); continue; }
            if (match.members.some(member => member.id !== this.demo.id && (!this.authorization.allowed(member.id)
                || this.actor(member.id).player.mapId !== 'main' || !inside(this.actor(member.id).player, this.venue(match.venueId).area)))) {
                this.finish(match, 'A player left the practice area or lost admin access.', 'cancelled'); continue;
            }
            if (match.members.some(member => !this.eligibility(member.id, this.venue(match.venueId)).allowed)) { this.finish(match, 'Venue access changed. Choose another venue or restore access.', 'cancelled'); continue; }
            if (match.phase === 'countdown') {
                if (this.now() < match.startsAt) continue;
                match.phase = 'playing';
                if (match.modeId === 'laststand') this.spawnWave(match, world);
            }
            if (this.now() >= match.endsAt) { this.finish(match, 'Time is up. Ready for another try?', 'timeout'); continue; }
            if (match.modeId === 'checkpoint') {
                const points = this.venue(match.venueId).checkpoints;
                for (const member of match.members) {
                    const actor = this.actor(member.id);
                    const next = points[member.progress];
                    if (actor?.player && next && Math.abs(actor.player.x - next.x) + Math.abs(actor.player.y - next.y) <= 1) member.progress++;
                    if (member.progress >= points.length && !member.finishedAt) {
                        member.finishedAt = this.now();
                        this.finish(match, actor.name + ' finished the trail!', 'complete'); break;
                    }
                }
            }
            if (match.modeId === 'laststand') {
                for (const id of match.mobIds) if (!world.entities[id] || world.entities[id].hitPoints <= 0) match.mobIds.delete(id);
                if (!match.mobIds.size) {
                    if (match.wave >= this.config.waves.length) this.finish(match, 'All three waves cleared. The green is yours!');
                    else if (!match.nextWaveAt) { match.nextWaveAt = this.now() + 2800; for (const member of match.members) { const player = this.actor(member.id)?.player; if (player) this.recover(player); } }
                    else if (this.now() >= match.nextWaveAt) { match.nextWaveAt = null; this.spawnWave(match, world); }
                }
            }
        }
    }

    project(match, viewer) {
        const venue = this.venue(match.venueId);
        return {...match, mobIds: [...(match.mobIds || [])], members: match.members.map(member => {
            const actor = this.actor(member.id);
            const {sessionId, returnTo, returnHealth, ...summary} = member;
            return {...summary, name: actor?.name || 'Player offline', demo: !!actor?.demo,
                access: this.eligibility(member.id, venue), online: !!actor};
        }), isHost: match.host === viewer};
    }

    state(context) {
        const match = this.activeFor(context.id);
        const keeper = this.npcPosition && {...this.npcPosition, near: context.session.mapId === 'main'
            && Math.abs(context.player.x - this.npcPosition.x) + Math.abs(context.player.y - this.npcPosition.y) <= 5};
        return {serverNow: this.now(), me: {id: context.id, name: context.name, cryptAccess: !!this.access.get(context.id)},
            npcId: this.npcId, keeper, modes: this.config.modes,
            venues: this.config.venues.map(venue => ({...venue, eligibility: this.eligibility(context.id, venue), busy: this.occupied(venue, match?.id)})),
            people: [...this.people().filter(person => person.player.mapId === 'main' && this.authorization.allowed(person.id)), this.demo].filter(person => person.id !== context.id).map(({id, name, demo, avatar}) => ({id, name, demo: !!demo, avatar, busy: !!this.activeFor(id),
                accessByVenue: Object.fromEntries(this.config.venues.map(venue => [venue.id, this.eligibility(id, venue)]))})),
            match: match ? this.project(match, context.id) : null,
            invitations: [...this.matches.values()].filter(entry => entry.phase === 'lobby' && entry.members.some(member => member.id === context.id && member.status === 'invited' && member.expiresAt > this.now()))
                .map(entry => this.project(entry, context.id)),
            openMatches: [...this.matches.values()].filter(entry => entry.phase === 'lobby' && entry.visibility === 'open' && entry.host !== context.id)
                .map(entry => this.project(entry, context.id))};
    }

    async respond(req, res, action) {
        try {
            res.set('Cache-Control', 'no-store');
            const input = req.body || {};
            const initial = this.context(req.params.sessionId);
            const allowed = await this.authorization.verify(initial.id, action !== 'state' && action !== 'access-check');
            const context = this.context(req.params.sessionId);
            if (context.player !== initial.player) fail('Your game session changed. Please reconnect.', 401);
            if (action === 'access-check') return res.json({enabled: allowed && context.player.mapId === 'main', requiredRole: 'ROLE_ADMIN'});
            if (!allowed) fail('This playtest is available to platform server admins only.', 403);
            if (context.player.mapId !== 'main') fail('Visit the main map to use this playtest.', 403);
            if (action !== 'state') {
                const match = this.matches.get(input.matchId);
                const targets = action === 'start' ? match?.members.filter(member => member.status !== 'invited').map(member => member.id) || []
                    : action === 'invite' ? [input.targetId] : [];
                for (const wallet of targets) if (wallet !== this.demo.id && !await this.authorization.verify(wallet, true)) fail('Every playtest participant must be a platform server admin.', 403);
                if (this.context(req.params.sessionId).player !== context.player) fail('Your game session changed. Please reconnect.', 401);
            }
            if (action !== 'state') this.action(context, action, input);
            res.set('Cache-Control', 'no-store').json(this.state(context));
        } catch (error) { res.status(error.status || 500).json({error: error.message}); }
    }

    close() {
        clearInterval(this.interval);
        for (const match of this.matches.values()) if (['countdown', 'playing'].includes(match.phase)) this.finish(match, 'The playtest server is restarting.', 'cancelled');
    }

    beforeClientReload(player) {
        const match = this.playing(player);
        if (match) this.finish(match, 'A player is updating their game. Ready for another round?', 'cancelled');
    }
}
module.exports = {GameModes, inside};

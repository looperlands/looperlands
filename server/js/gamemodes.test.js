const {GameModes} = require('./gamemodes');
global.Types ||= {};
jest.mock('./formulas', () => ({dmg: () => 10}));
jest.mock('./message', () => ({Damage: function (entity, damage) {this.entity = entity; this.damage = damage;}}));
jest.mock('./utils', () => {let serial = 700; return {getID: jest.fn(() => ++serial)};});
jest.mock('./mob', () => class {
    constructor(id, kind, x, y) { Object.assign(this, {id, kind, x, y, type: 'mob', hitPoints: 50}); }
    onMove() {}
    onExitCombat() {}
});

function fixture(options = {}) {
    let now = 1000;
    const cache = new Map();
    const players = [1, 2, 3].map(id => ({id, type: 'player', walletId: '0x' + String(id).padStart(40, '0'), sessionId: 'session-' + id,
        name: ['River', 'Ash', 'Fern'][id - 1], mapId: 'main', hasEnteredGame: true, isDead: false,
        isBot: () => false, x: 40, y: 211, hitPoints: 74, maxHitPoints: 100, health: () => ['health'],
        getLevel: () => 30, getWeaponLevel: () => 24,
        updateHitPoints: jest.fn(function () {this.hitPoints = 100;})}));
    const world = {players: Object.fromEntries(players.map(player => [player.id, player])), pushToPlayer: jest.fn(), handleHurtEntity: jest.fn(),
        entities: {}, npcs: {}, isValidPosition: () => true, onMobMoveCallback: jest.fn(), onMobExitCombatCallback: jest.fn(),
        clearMobAggroLink: jest.fn(), zoneGroupsReady: true, getPlayerById(id) {return this.players[id];}};
    world.addMob = jest.fn(mob => {world.entities[mob.id] = mob;});
    world.despawn = jest.fn(entity => {delete world.entities[entity.id];});
    for (const player of players) player.server = world;
    for (const player of players) cache.set(player.sessionId, {walletId: player.walletId, mapId: 'main', entityId: player.id});
    const authorization = options.authorization || {allowed: () => true, verify: jest.fn().mockResolvedValue(true)};
    const service = new GameModes({cache, worldsMap: {main: world}}, {now: () => now, tick: false, authorization});
    service.teleport = jest.fn();
    const contexts = players.map(player => service.context(player.sessionId));
    return {service, contexts, players, world, cache, authorization, advance: ms => {now += ms;}};
}

test('a session must resolve to its own entered player', () => {
    const {service, players} = fixture();
    players[0].walletId = 'another-wallet';
    expect(() => service.context('session-1')).toThrow('session ended');
});

test('an invitation grants no access to a locked venue', () => {
    const {service, contexts: [host, guest]} = fixture();
    service.access.set(host.id, true);
    const match = service.create(host, 'duel', 'crypt-court');
    service.invite(match, host.id, guest.id);
    expect(() => service.action(guest, 'accept', {matchId: match.id})).toThrow('Crypt pass');
    expect(match.members[1].status).toBe('invited');
    expect(service.activeFor(guest.id)).toBeUndefined();
});

test('an expired invitation cannot be accepted', () => {
    const {service, contexts: [host, guest], advance} = fixture();
    const match = service.create(host, 'duel', 'town-green');
    service.invite(match, host.id, guest.id); advance(60001);
    expect(() => service.action(guest, 'accept', {matchId: match.id})).toThrow('expired');
});

test('mode and venue compatibility is checked on the server', () => {
    const {service, contexts: [host]} = fixture();
    expect(() => service.create(host, 'checkpoint', 'town-green')).toThrow('not supported');
    expect(service.matches.size).toBe(0);
});

test('only a host can change another member’s venue', () => {
    const {service, contexts: [host, guest]} = fixture();
    const match = service.create(host, 'duel', 'town-green');
    service.invite(match, host.id, guest.id); service.action(guest, 'accept', {matchId: match.id});
    expect(() => service.action(guest, 'change-venue', {matchId: match.id, venueId: 'crypt-court'})).toThrow('cannot change');
});

test('changing a venue clears readiness for every real player', () => {
    const {service, contexts: [host, guest]} = fixture();
    const match = service.create(host, 'duel', 'town-green');
    service.invite(match, host.id, guest.id); service.action(guest, 'accept', {matchId: match.id});
    match.members.forEach(member => {member.ready = true;}); service.access.set(host.id, true);
    service.action(host, 'change-venue', {matchId: match.id, venueId: 'crypt-court'});
    expect(match.members.every(member => !member.ready)).toBe(true);
    expect(service.project(match, guest.id).members[1].access.allowed).toBe(false);
});

test('start rechecks each player’s current access before moving anyone', () => {
    const {service, contexts: [host, guest]} = fixture();
    service.access.set(host.id, true); service.access.set(guest.id, true);
    const match = service.create(host, 'duel', 'crypt-court');
    service.invite(match, host.id, guest.id); service.action(guest, 'accept', {matchId: match.id});
    match.members.forEach(member => {member.ready = true;}); service.access.set(guest.id, false);
    expect(() => service.action(host, 'start', {matchId: match.id})).toThrow('no longer has access');
    expect(match.phase).toBe('lobby'); expect(service.teleport).not.toHaveBeenCalled();
});

test('a duel cannot start until both participants are ready', () => {
    const {service, contexts: [host, guest]} = fixture();
    const match = service.create(host, 'duel', 'town-green');
    service.invite(match, host.id, guest.id); service.action(guest, 'accept', {matchId: match.id});
    service.action(host, 'ready', {matchId: match.id});
    expect(() => service.action(host, 'start', {matchId: match.id})).toThrow('Everyone');
    service.action(guest, 'ready', {matchId: match.id}); service.action(host, 'start', {matchId: match.id});
    expect(match.phase).toBe('countdown'); expect(service.teleport).toHaveBeenCalledTimes(2);
});

test('shared physical spaces cannot run two matches concurrently', () => {
    const {service, contexts: [host, , third]} = fixture();
    const first = service.create(host, 'laststand', 'town-green'); first.members[0].ready = true; service.start(first);
    service.access.set(third.id, true);
    expect(() => service.create(third, 'laststand', 'crypt-court')).toThrow('in use');
});

test('the practice partner can never be passed off as a duel opponent', () => {
    const {service, contexts: [host]} = fixture();
    const match = service.create(host, 'duel', 'town-green');
    expect(() => service.invite(match, host.id, service.demo.id)).toThrow('second player');
});

test('open-lobby admission still enforces venue access', () => {
    const {service, contexts: [host, guest]} = fixture();
    service.access.set(host.id, true);
    const match = service.create(host, 'laststand', 'crypt-court'); match.visibility = 'open';
    expect(() => service.action(guest, 'join', {matchId: match.id})).toThrow('access');
    service.access.set(guest.id, true); service.action(guest, 'join', {matchId: match.id});
    expect(service.activeFor(guest.id).id).toBe(match.id);
});

test('unsupported access rules never become public accidentally', () => {
    const {service, contexts: [host]} = fixture();
    expect(service.eligibility(host.id, {access: 'unsupported'}).allowed).toBe(false);
});

function response() {
    return {set: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis()};
}

async function request(service, context, action, body = {}) {
    const res = response();
    await service.respond({params: {sessionId: context.sessionId}, body}, res, action);
    return res;
}

async function securedFixture() {
    const GameModesAccess = require('./gamemodesaccess');
    const roles = new Map();
    const platform = {isServerAdminWallet: jest.fn(async wallet => (roles.get(wallet) || []).includes('ROLE_ADMIN'))};
    const authorization = new GameModesAccess(platform);
    const result = fixture({authorization});
    for (const context of result.contexts) { roles.set(context.id, ['ROLE_ADMIN']); await authorization.verify(context.id); }
    return {...result, roles, platform};
}

test('ordinary wallets get no UI admission and cannot invoke state or mutation routes', async () => {
    const {service, contexts: [user], roles} = await securedFixture(); roles.set(user.id, ['ROLE_USER', 'ROLE_CREATOR']);
    await service.authorization.verify(user.id, true);
    const access = await request(service, user, 'access-check');
    expect(access.json).toHaveBeenCalledWith({enabled: false, requiredRole: 'ROLE_ADMIN'});
    for (const action of ['state', 'create', 'demo-invite', 'access', 'meet-keeper']) {
        const res = await request(service, user, action, {modeId: 'laststand', venueId: 'town-green', roles: ['ROLE_ADMIN'], isAdmin: true});
        expect(res.status).toHaveBeenCalledWith(403);
    }
    expect(service.matches.size).toBe(0); expect(service.teleport).not.toHaveBeenCalled();
});

test('admin admission derives the wallet from the route session, ignoring body claims', async () => {
    const {service, contexts: [admin, other], roles, platform} = await securedFixture();
    roles.set(other.id, []);
    const res = await request(service, admin, 'create', {modeId: 'laststand', venueId: 'town-green', walletId: other.id, sessionId: other.sessionId});
    expect(res.status).not.toHaveBeenCalled();
    expect(platform.isServerAdminWallet).toHaveBeenLastCalledWith(admin.id);
    expect(service.activeFor(admin.id).host).toBe(admin.id);
    expect(service.activeFor(other.id)).toBeUndefined();
});

test('invites cannot enroll a non-admin wallet', async () => {
    const {service, contexts: [host, guest], roles} = await securedFixture();
    const match = service.create(host, 'duel', 'town-green'); roles.set(guest.id, ['ROLE_USER']);
    const res = await request(service, host, 'invite', {matchId: match.id, targetId: guest.id});
    expect(res.status).toHaveBeenCalledWith(403); expect(match.members).toHaveLength(1);
    expect(service.state(host).people.some(person => person.id === guest.id)).toBe(false);
});

test('start refreshes every real member and rejects a revoked invitee before any teleport', async () => {
    const {service, contexts: [host, guest], roles} = await securedFixture();
    const match = service.create(host, 'duel', 'town-green'); service.invite(match, host.id, guest.id);
    service.action(guest, 'accept', {matchId: match.id}); match.members.forEach(member => {member.ready = true;});
    roles.set(guest.id, ['ROLE_USER']);
    const res = await request(service, host, 'start', {matchId: match.id});
    expect(res.status).toHaveBeenCalledWith(403); expect(match.phase).toBe('lobby'); expect(service.teleport).not.toHaveBeenCalled();
});

test('revocation cancels an active round and restores health and the original position', async () => {
    const {service, contexts: [host], roles, players, world} = await securedFixture();
    const match = service.create(host, 'checkpoint', 'town-trail'); match.members[0].ready = true; service.start(match);
    players[0].hitPoints = 1; roles.set(host.id, []); await service.authorization.verify(host.id, true);
    service.tick();
    expect(match.phase).toBe('results'); expect(match.result.outcome).toBe('cancelled');
    expect(players[0].hitPoints).toBe(74); expect(service.teleport).toHaveBeenLastCalledWith(players[0], world, {x: 40, y: 211});
});

test('an admin session on another map does not receive playtest admission', async () => {
    const {service, contexts: [host], players, cache, world} = await securedFixture();
    players[0].mapId = 'oa'; cache.get(host.sessionId).mapId = 'oa'; service.server.worldsMap.oa = world;
    const res = await request(service, host, 'access-check'); expect(res.json).toHaveBeenCalledWith({enabled: false, requiredRole: 'ROLE_ADMIN'});
    const blocked = await request(service, host, 'create', {modeId: 'laststand', venueId: 'town-green'});
    expect(blocked.status).toHaveBeenCalledWith(403);
});

test('a session that disconnects during the platform check cannot create a lobby', async () => {
    const {service, contexts: [host], cache, authorization} = fixture();
    let complete; authorization.verify.mockImplementation(() => new Promise(resolve => {complete = resolve;}));
    const res = response(); const pending = service.respond({params: {sessionId: host.sessionId}, body: {modeId: 'laststand', venueId: 'town-green'}}, res, 'create');
    cache.delete(host.sessionId); complete(true); await pending;
    expect(res.status).toHaveBeenCalledWith(401); expect(service.matches.size).toBe(0);
});

test('match projections never expose another player’s bearer session or recovery data', () => {
    const {service, contexts: [host, guest]} = fixture(); const match = service.create(host, 'duel', 'town-green');
    service.invite(match, host.id, guest.id); service.action(guest, 'accept', {matchId: match.id});
    match.members.forEach(member => {member.ready = true;}); service.start(match);
    const serialized = JSON.stringify(service.state(host));
    expect(serialized).not.toContain('session-'); expect(serialized).not.toContain('returnHealth'); expect(serialized).not.toContain('returnTo');
});

test('a second avatar on the same wallet cannot control the first avatar’s lobby', () => {
    const {service, contexts: [host]} = fixture(); const match = service.create(host, 'duel', 'town-green');
    expect(() => service.action({...host, sessionId: 'another-session'}, 'ready', {matchId: match.id})).toThrow('cannot change');
});

function activeDuel() {
    const f = fixture(), [host, guest] = f.contexts;
    const match = f.service.create(host, 'duel', 'town-green'); f.service.invite(match, host.id, guest.id);
    f.service.action(guest, 'accept', {matchId: match.id}); match.members.forEach(member => {member.ready = true;}); f.service.start(match);
    match.phase = 'playing';
    return {...f, match};
}

test('duel damage is limited to the two ready participants inside the venue', () => {
    const {service, players: [a, b, outsider], match} = activeDuel();
    expect(service.canDamage(a, b)).toBe(true); expect(service.canDamage(a, outsider)).toBe(false); expect(service.canDamage(outsider, a)).toBe(false);
    b.x = 60; expect(service.canDamage(a, b)).toBe(false); b.x = 40;
    match.phase = 'countdown'; expect(service.canDamage(a, b)).toBe(false);
    match.phase = 'results'; expect(service.canDamage(a, outsider)).toBe(true);
});

test('duel defeat awards a round without a death or normal PvP reward', () => {
    const {service, players: [a, b], match, world} = activeDuel();
    expect(service.handlePlayerHurt(b, a, 200)).toBe(true); expect(match.members[0].rounds).toBe(1); expect(match.phase).toBe('countdown');
    match.phase = 'playing'; service.handlePlayerHurt(b, a, 200);
    expect(match.phase).toBe('results'); expect(match.result.text).toContain('River wins'); expect(a.hitPoints).toBe(74); expect(b.hitPoints).toBe(74);
    expect(world.handleHurtEntity).not.toHaveBeenCalled();
});

test('wave enemies and ordinary players cannot damage each other', () => {
    const {service, contexts: [host], players: [a, outsider]} = fixture();
    const match = service.create(host, 'laststand', 'town-green'); match.members[0].ready = true; service.start(match); match.phase = 'playing';
    const enemy = {id: 400, type: 'mob', gameModesMatchId: match.id, x: 40, y: 211};
    expect(service.canDamage(a, enemy)).toBe(true); expect(service.canDamage(enemy, a)).toBe(true);
    expect(service.canDamage(outsider, enemy)).toBe(false); expect(service.canDamage(enemy, outsider)).toBe(false);
    expect(service.handlePlayerHurt(outsider, enemy, 200)).toBe(true); expect(outsider.hitPoints).toBe(74);
    expect(service.canDamage(a, {...enemy, gameModesMatchId: undefined})).toBe(false);
});

test('practice mob death uses the despawn path and bypasses normal world rewards', () => {
    const {service, world, players: [a]} = fixture(); const mob = {id: 40, type: 'mob', gameModesMatchId: 'practice', hitPoints: 0};
    expect(service.handleHurtEntity(world, mob, a, 100, false)).toBe(true);
    expect(world.clearMobAggroLink).toHaveBeenCalledWith(mob); expect(world.despawn).toHaveBeenCalledWith(mob);
    expect(service.handleHurtEntity(world, {...mob, gameModesMatchId: null}, a, 100, false)).toBe(false);
});

test('a controller without an authorization provider fails closed', () => {
    const {service, contexts: [host]} = fixture(); const denied = new GameModes(service.server, {tick: false});
    expect(() => denied.create(host, 'laststand', 'town-green')).toThrow('admin wallet');
});

test('a checkpoint race counts only the next marker and finishes after three ordered arrivals', () => {
    const {service, contexts: [host], players: [runner], advance} = fixture();
    const match = service.create(host, 'checkpoint', 'town-trail'); match.members[0].ready = true; service.start(match);
    service.tick(); expect(match.phase).toBe('countdown'); advance(3000); service.tick(); expect(match.phase).toBe('playing');
    const points = service.venue('town-trail').checkpoints;
    Object.assign(runner, points[2]); service.tick(); expect(match.members[0].progress).toBe(0);
    for (const point of points) {Object.assign(runner, point); advance(1000); service.tick();}
    expect(match.result.outcome).toBe('complete'); expect(match.result.elapsed).toBe(3000); expect(match.result.text).toContain('River finished');
    service.action(host, 'rematch', {matchId: match.id}); expect(match.phase).toBe('lobby'); expect(match.result).toBeNull();
    expect(match.members[0].ready).toBe(false); expect(match.members[0].progress).toBe(0);
});

test('a round times out and can be left without leaving an occupied arena', () => {
    const {service, contexts: [host], advance} = fixture(); const match = service.create(host, 'checkpoint', 'town-trail');
    match.members[0].ready = true; service.start(match); advance(100000); service.tick();
    expect(match.result.outcome).toBe('timeout'); expect(service.occupied(service.venue('town-trail'))).toBe(false);
    service.action(host, 'leave', {matchId: match.id}); expect(service.activeFor(host.id)).toBeUndefined();
    advance(130000); service.tick(); expect(service.matches.has(match.id)).toBe(false);
});

test('three waves advance only after all practice enemies are gone and end with results', () => {
    const {service, contexts: [host], players: [hero], world, advance} = fixture();
    const match = service.create(host, 'laststand', 'town-green'); match.members[0].ready = true; service.start(match);
    advance(3000); service.tick(); expect(match.wave).toBe(1); expect(match.mobIds.size).toBe(1);
    for (let wave = 1; wave <= 3; wave++) {
        hero.hitPoints = 40;
        for (const id of match.mobIds) { expect(world.entities[id].gameModesMatchId).toBe(match.id); delete world.entities[id]; }
        service.tick();
        if (wave < 3) {
            expect(hero.hitPoints).toBe(100); advance(2799); service.tick(); expect(match.wave).toBe(wave);
            advance(1); service.tick(); expect(match.wave).toBe(wave + 1); expect(match.mobIds.size).toBeGreaterThan(0);
        }
    }
    expect(world.addMob).toHaveBeenCalledTimes(6); expect(match.phase).toBe('results'); expect(match.result.text).toContain('All three waves'); expect(hero.hitPoints).toBe(74);
});

test('Last Stand defeat is nonlethal and restores the player’s pre-round health', () => {
    const {service, contexts: [host], players: [hero], world, advance} = fixture();
    const match = service.create(host, 'laststand', 'town-green'); match.members[0].ready = true; service.start(match); advance(3000); service.tick();
    const enemy = world.entities[[...match.mobIds][0]];
    service.handlePlayerHurt(hero, enemy, 200);
    expect(match.result.outcome).toBe('defeat'); expect(hero.hitPoints).toBe(74); expect(world.despawn).toHaveBeenCalledWith(enemy);
});

test('leaving a round despawns practice enemies, restores health and frees the space', () => {
    const {service, contexts: [host], players: [hero], world, advance} = fixture();
    const match = service.create(host, 'laststand', 'town-green'); match.members[0].ready = true; service.start(match); advance(3000); service.tick();
    service.action(host, 'leave', {matchId: match.id});
    expect(world.despawn).toHaveBeenCalledTimes(1); expect(hero.hitPoints).toBe(74); expect(service.occupied(service.venue('town-green'))).toBe(false);
});

test('practice mobs are visible only to the members of that round', () => {
    const {service, contexts: [host], players: [hero, outsider]} = fixture(); const match = service.create(host, 'laststand', 'town-green');
    match.members[0].ready = true; service.start(match);
    const mob = {gameModesMatchId: match.id};
    expect(service.canSee(hero, mob)).toBe(true); expect(service.canSee(outsider, mob)).toBe(false);
    expect(service.canSee(outsider, {})).toBe(true); expect(service.canSee(outsider, undefined)).toBe(true);
    match.phase = 'results'; expect(service.canSee(hero, mob)).toBe(false);
});

test('the scripted partner accepts only co-op invitations and readies automatically', () => {
    const {service, contexts: [host], advance} = fixture(); const match = service.create(host, 'laststand', 'town-green');
    service.invite(match, host.id, service.demo.id); service.tick(); expect(match.members[1].status).toBe('invited');
    advance(1200); service.tick(); expect(match.members[1].ready).toBe(true); expect(match.members[1].status).toBe('joined');
});

test('a locked demo invitation remains locked until its own test pass is granted', () => {
    const {service, contexts: [host]} = fixture(); const match = service.action(host, 'demo-invite', {locked: true});
    expect(() => service.action(host, 'accept', {matchId: match.id})).toThrow('Crypt pass');
    service.action(host, 'access', {allowed: true}); service.action(host, 'accept', {matchId: match.id});
    service.action(host, 'ready', {matchId: match.id}); expect(match.phase).toBe('countdown');
    expect(service.access.get(host.id)).toBe(true); service.close(); expect(match.phase).toBe('results');
});

test('declining, cancelling and expiring invitations release their lobby places', () => {
    const {service, contexts: [host, guest], advance} = fixture(); const match = service.create(host, 'duel', 'town-green');
    service.invite(match, host.id, guest.id); service.action(guest, 'decline', {matchId: match.id}); expect(match.members).toHaveLength(1);
    service.invite(match, host.id, guest.id); service.action(host, 'uninvite', {matchId: match.id, targetId: guest.id}); expect(match.members).toHaveLength(1);
    service.invite(match, host.id, guest.id); advance(60001); service.tick(); expect(match.members).toHaveLength(1);
    service.action(host, 'visibility', {matchId: match.id, open: true}); expect(match.visibility).toBe('open');
    expect(service.state(guest).openMatches).toHaveLength(1);
});

test('a blocked spawn rejects the start before moving or healing any participant', () => {
    const {service, contexts: [host], world, players: [hero]} = fixture(); const match = service.create(host, 'laststand', 'town-green');
    match.members[0].ready = true; world.isValidPosition = () => false;
    expect(() => service.start(match)).toThrow('blocked'); expect(match.phase).toBe('lobby'); expect(hero.hitPoints).toBe(74); expect(service.teleport).not.toHaveBeenCalled();
});

test('visiting the keeper cannot teleport a player out of a running match', () => {
    const {service, contexts: [host]} = fixture(); service.action(host, 'meet-keeper', {}); expect(service.teleport).toHaveBeenCalledTimes(1);
    const match = service.create(host, 'checkpoint', 'town-trail'); match.members[0].ready = true; service.start(match);
    expect(() => service.action(host, 'meet-keeper', {})).toThrow('Leave the round');
});

test('client reloads cancel practice and restore health before the reload snapshot', () => {
    const {service, contexts: [host], players: [hero]} = fixture(); const match = service.create(host, 'checkpoint', 'town-trail');
    match.members[0].ready = true; service.start(match); hero.hitPoints = 1;
    service.beforeClientReload(hero);
    expect(match.result.outcome).toBe('cancelled'); expect(hero.hitPoints).toBe(74);
    expect(service.teleport).toHaveBeenLastCalledWith(hero, hero.server, {x: 40, y: 211});
});

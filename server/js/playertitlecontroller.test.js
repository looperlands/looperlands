jest.mock('./discord', () => ({sendMessage: jest.fn()}));
global.Types = {};
const Types = require('../../shared/js/gametypes');
const PlayerTitleController = require('./playertitlecontroller');
const {gameplayNameFromSession} = require('./socialchat');

function setup() {
    const walletId = '0x' + 'a'.repeat(40);
    const sessions = new Map([['session', {walletId, entityId: '42', mapId: 'main', title: 'Player'}]]);
    const cache = {get: id => sessions.get(id), set: (id, value) => sessions.set(id, value), keys: () => [...sessions.keys()]};
    const player = {id: '42', sessionId: 'session', walletId, mapId: 'main', hasEnteredGame: true, title: 'Player', isBot: () => false};
    const world = {getPlayerById: id => id === player.id ? player : null, pushBroadcast: jest.fn()};
    const platform = {setPlayerTitle: jest.fn(async (wallet, title) => ({title: title + '🎖️', displayName: title})),
        claimPlayerTitlePrompt: jest.fn().mockResolvedValue({showPrompt: true})};
    const social = {broadcastPresence: jest.fn()};
    const controller = new PlayerTitleController(cache, () => ({main: world}), platform, social);
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    const req = {params: {sessionId: 'session'}, body: {title: 'New Looper', walletId: 'forged-wallet'}};
    return {controller, cache, sessions, player, world, platform, social, req, res};
}

test('saves the authenticated wallet title, preserves badges and broadcasts the live name', async () => {
    const {controller, cache, player, world, platform, social, req, res} = setup();
    await controller.save(req, res);
    expect(platform.setPlayerTitle).toHaveBeenCalledWith(player.walletId, 'New Looper');
    expect(cache.get('session').title).toBe('New Looper🎖️');
    expect(player.name).toBe('New Looper🎖️');
    expect(world.pushBroadcast.mock.calls[0][0].serialize()).toEqual([Types.Messages.PLAYER_TITLE, '42', 'New Looper🎖️', 'New Looper🎖️']);
    expect(social.broadcastPresence).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({title: 'New Looper🎖️', displayName: 'New Looper', name: 'New Looper🎖️'});
    expect(gameplayNameFromSession(cache.get('session'))).toBe(player.name);
});

test('prompt eligibility comes from the platform for the authenticated wallet', async () => {
    const {controller, platform, player, req, res} = setup();
    await controller.prompt(req, res);
    expect(platform.claimPlayerTitlePrompt).toHaveBeenCalledWith(player.walletId);
    expect(res.json).toHaveBeenCalledWith({showPrompt: true});
    platform.claimPlayerTitlePrompt.mockResolvedValue({showPrompt: false});
    await controller.prompt(req, res);
    expect(res.json).toHaveBeenLastCalledWith({showPrompt: false});
});

test.each(['', 'x', 'a'.repeat(25), '<b>Admin</b>', 'first\nlast', '💩'])('rejects invalid name %p before saving', async title => {
    const {controller, platform, req, res} = setup();
    req.body.title = title;
    await controller.save(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(platform.setPlayerTitle).not.toHaveBeenCalled();
});

test('expired sessions cannot save names or claim the prompt', async () => {
    const {controller, sessions, platform, req, res} = setup();
    sessions.clear();
    await controller.prompt(req, res);
    await controller.save(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(platform.claimPlayerTitlePrompt).not.toHaveBeenCalled();
    expect(platform.setPlayerTitle).not.toHaveBeenCalled();
});

test('a session bound to a different live player cannot rename it', async () => {
    const {controller, player, platform, req, res} = setup();
    player.sessionId = 'different';
    await controller.save(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(platform.setPlayerTitle).not.toHaveBeenCalled();
});

test('platform errors preserve the existing name and allow retry', async () => {
    const {controller, platform, player, cache, world, req, res} = setup();
    platform.setPlayerTitle.mockRejectedValueOnce(new Error('Offline'));
    await controller.save(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(player.title).toBe('Player');
    expect(cache.get('session').title).toBe('Player');
    expect(world.pushBroadcast).not.toHaveBeenCalled();
    await controller.save(req, res);
    expect(player.title).toBe('New Looper🎖️');
});

test('a reconnect during saving updates the new session without renaming another player', async () => {
    const {controller, platform, sessions, player, req, res} = setup();
    let finish;
    platform.setPlayerTitle.mockReturnValue(new Promise(resolve => {finish = resolve;}));
    const saving = controller.save(req, res);
    sessions.delete('session');
    sessions.set('new-session', {walletId: player.walletId, mapId: 'main', entityId: '42', title: 'Player'});
    player.sessionId = 'new-session';
    finish({title: 'New Looper', displayName: 'New Looper'});
    await saving;
    expect(sessions.get('new-session').title).toBe('New Looper');
    expect(player.name).toBe('New Looper');
});

test('concurrent saves cannot overwrite one another out of order', async () => {
    const {controller, platform, req, res} = setup();
    let finish;
    platform.setPlayerTitle.mockReturnValue(new Promise(resolve => {finish = resolve;}));
    const first = controller.save(req, res);
    await controller.save(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(platform.setPlayerTitle).toHaveBeenCalledTimes(1);
    finish({title: 'New Looper', displayName: 'New Looper'});
    await first;
});

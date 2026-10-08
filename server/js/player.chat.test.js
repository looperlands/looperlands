const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.Types = {};
const Types = require('../../shared/js/gametypes');
const Utils = require('./utils');

function createPlayer() {
    const chat = { addMessage: jest.fn() };
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'player.js'), 'utf8'), {
        module,
        process: { env: {} },
        Character: { extend: methods => methods },
        FormatChecker: function () {},
        require: name => {
            switch (name) {
                case '../../shared/js/gametypes': return Types;
                case './utils': return Utils;
                case './message': return { Chat: function (player, message) { this.message = message; } };
                case './format': return { check: () => true };
                case './chat.js': return chat;
                case './looperlandsplatformclient.js': return { LooperLandsPlatformClient: function () {} };
                case './quests/playereventbroker.js': return { PlayerEventBroker: function () {} };
                default: return {};
            }
        },
    });
    const player = module.exports;
    const connection = {
        id: 1,
        listen: jest.fn(),
        onClose: jest.fn(),
        sendUTF8: jest.fn(),
        close: jest.fn(),
    };
    player._super = () => {};
    player.init(connection, {});
    player.hasEnteredGame = true;
    player.name = 'Farmer';
    player.broadcastToZone = jest.fn();
    player.resetTimeout = jest.fn();
    return { player, chat, connection, receive: connection.listen.mock.calls[0][0] };
}

test('server broadcasts and stores all 4000 characters including newlines', async () => {
    const { player, chat, receive } = createPlayer();
    const message = 'a'.repeat(1999) + '\n' + 'b'.repeat(2000);
    await receive([Types.Messages.CHAT, message]);
    expect(player.broadcastToZone.mock.calls[0][0].message).toBe(message);
    expect(chat.addMessage).toHaveBeenCalledWith('Farmer', message);
});

test('server caps oversized input and still sanitizes it', async () => {
    const { player, chat, receive } = createPlayer();
    const message = '<script>bad()</script>\n' + 'a'.repeat(Types.MAX_CHAT_LENGTH);
    await receive([Types.Messages.CHAT, message]);
    const expected = Utils.sanitize(message.slice(0, Types.MAX_CHAT_LENGTH));
    expect(expected).not.toContain('<script>');
    expect(player.broadcastToZone.mock.calls[0][0].message).toBe(expected);
    expect(chat.addMessage).toHaveBeenCalledWith('Farmer', expected);
});

test.each([Types.Messages.CHAT, Types.Messages.CHAT_SEND])('chat packet %s is not broadcast in the game when persistence fails', async type => {
    const {player, chat, receive} = createPlayer();
    const send = jest.fn().mockReturnValue(false);
    player.server = {server: {socialChat: {send}}};
    await receive(type === Types.Messages.CHAT ? [type, 'unsaved'] : [type, 'world', '', 'unsaved', 'request-id']);
    expect(send).toHaveBeenCalled();
    expect(player.broadcastToZone).not.toHaveBeenCalled();
    expect(chat.addMessage).not.toHaveBeenCalled();
});

test('a second connection cannot reuse an active authenticated session', async () => {
    const { player, connection, receive } = createPlayer();
    player.hasEnteredGame = false;
    const session = { mapId: 'main', entityId: 'other-connection' };
    player.server = { id:'world_main', server: {
        cache: { get: () => session },
        worldsMap: { main: { getPlayerById: () => ({hasEnteredGame:true}) } }
    } };
    await receive([Types.Messages.HELLO, 'Forged title', 1, 1, 'existing-session']);
    expect(connection.close).toHaveBeenCalledWith('This session already has an active player');
    expect(player.hasEnteredGame).toBe(false);
});

test('a session cannot authenticate in a different map', async () => {
    const { player, connection, receive } = createPlayer();
    player.hasEnteredGame = false;
    player.server = { id:'world_main', server: {
        cache: { get: () => ({mapId:'taikotown'}) }, worldsMap: {}
    } };
    await receive([Types.Messages.HELLO, 'Forged title', 1, 1, 'session-on-another-map']);
    expect(connection.close).toHaveBeenCalledWith('Session map does not match this world');
});

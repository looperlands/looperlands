const fs = require('fs');
const vm = require('vm');
const path = require('path');
global.Types = {};
const Types = require('../../shared/js/gametypes');
let mapNames;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'mapnames.js'), 'utf8'), {
    define: factory => {mapNames = factory();}
});

function chat() {
    let Chat;
    const timers = [];
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'socialchat.js'), 'utf8'), {
        define: (dependencies, factory) => {Chat = factory({}, mapNames);}, Types,
        setTimeout: callback => {timers.push(callback); return timers.length;}, clearTimeout: jest.fn()
    });
    const instance = Object.create(Chat.prototype);
    Object.assign(instance, {
        me: {id: 'alice', mapId: 'main'}, people: new Map(), histories: new Map(), drafts: new Map(), attachments: new Map(), giftRetries: new Map(), pending: new Map(), unread: new Map(),
        connected: true, tab: 'world', target: '', players: [{id: 'bob'}],
        app: {game: {client: {connection: {connected: true}, sendChatGift: jest.fn(), sendSocialChat: jest.fn()}}},
        renderMessages: jest.fn(), renderBadges: jest.fn(), renderComposerState: jest.fn(), clearError: jest.fn(), error: jest.fn()
    });
    const input = {value: ''}; instance.node = () => input;
    return {instance, input, timers};
}

test('My map is a filtered view of all public messages, regardless of the sending tab', () => {
    const {instance} = chat();
    // Different map keys can share a platform name; filtering still uses the key.
    instance.me.mapId = 'm88n';
    expect(instance.mapName('m88n')).toBe(instance.mapName('m88n2'));
    instance.storeMessage({id: '1', channel: 'world', sender: {id: 'bob'}, mapId: 'm88n'});
    instance.storeMessage({id: '2', channel: 'world', sender: {id: 'elsewhere'}, mapId: 'm88n2'});
    instance.storeMessage({id: '3', channel: 'map', sender: {id: 'bob'}, mapId: 'm88n'});
    expect(instance.histories.get('world').map(message => message.id)).toEqual(['1', '2', '3']);
    expect(instance.histories.get('map').map(message => message.id)).toEqual(['1', '3']);
});

test('gift retries preserve the request ID and an acknowledgement clears the locked gift draft', () => {
    const {instance, input, timers} = chat();
    instance.tab = 'direct'; instance.target = 'bob'; input.value = 'Enjoy';
    instance.attachments.set('direct:bob', {item: '100', quantity: 2});
    instance.send();
    const first = instance.app.game.client.sendChatGift.mock.calls[0];
    timers[0](); instance.send();
    expect(instance.app.game.client.sendChatGift.mock.calls[1]).toEqual(first);
    instance.receive(Types.Messages.CHAT_MESSAGE, {id: 'receipt', channel: 'direct', sender: {id: 'alice'}, recipient: {id: 'bob'}, message: 'Enjoy', requestId: first[4]});
    expect(instance.attachments.has('direct:bob')).toBe(false);
    expect(instance.giftRetries.size).toBe(0); expect(instance.pending.size).toBe(0);
    expect(input.value).toBe('');
});

const fs = require('fs');
const vm = require('vm');
const path = require('path');
global.Types = {};
const Types = require('../../shared/js/gametypes');
let mapNames;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'mapnames.js'), 'utf8'), {
    define: factory => {mapNames = factory();}
});

function chat(globals = {}) {
    let Chat;
    const timers = [];
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'socialchat.js'), 'utf8'), {
        define: (dependencies, factory) => {Chat = factory({}, mapNames);}, Types,
        setTimeout: callback => {timers.push(callback); return timers.length;}, clearTimeout: jest.fn(), ...globals
    });
    const instance = Object.create(Chat.prototype);
    Object.assign(instance, {
        me: {id: 'alice', mapId: 'main'}, people: new Map(), histories: new Map(), drafts: new Map(), attachments: new Map(), giftRetries: new Map(), pending: new Map(), unread: new Map(), avatarSources: new Map(),
        connected: true, tab: 'world', target: '', players: [{id: 'bob'}],
        app: {game: {client: {connection: {connected: true}, sendChatGift: jest.fn(), sendSocialChat: jest.fn()}}},
        renderMessages: jest.fn(), renderBadges: jest.fn(), renderComposerState: jest.fn(), clearError: jest.fn(), error: jest.fn()
    });
    const input = {value: ''}; instance.node = () => input;
    return {instance, input, timers};
}

test.each([
    '_a7757eb05782aa7784d6c25b4b4291da370af19de23d9175613d1efe988ed59ei0',
    'NFT_B5893a75b74F9cACCd3c23b4A974DB5F53B4E9D2_2107',
    'NFT_45d40a1f8faafb8c0592cd7a2ed69fca07f1bdd50fe951918aad73b3e07b92f0'
])('chat resolves dynamic avatar %s when no local sprite is loaded', async avatar => {
    let image;
    const get = jest.fn().mockResolvedValue({data: {tokenHash: avatar, assetType: 'armor'}});
    const {instance} = chat({Image: class {constructor() {image = this;}}, axios: {get}});
    instance.app.sessionId = 'test-session';
    const loading = instance.avatarSource(avatar);
    await image.onerror();
    expect(get).toHaveBeenCalledWith('/session/test-session/dynamicnft/' + avatar.replace(/^NFT_/, '0x') + '/nftid');
    expect((await loading).url).toBe('https://looperlands.sfo3.digitaloceanspaces.com/assets/looper/1/' + avatar + '.png');
});

test('chat retries an avatar lookup after a temporary failure instead of caching the default', async () => {
    let image;
    const avatar = '_' + 'a'.repeat(64) + 'i0';
    const get = jest.fn().mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValueOnce({data: {tokenHash: avatar}});
    const {instance} = chat({Image: class {constructor() {image = this;}}, axios: {get}});
    const first = instance.avatarSource(avatar);
    await image.onerror();
    expect((await first).url).toBe('img/1/clotharmor.png');
    const retry = instance.avatarSource(avatar);
    await image.onerror();
    expect((await retry).url).toContain(avatar + '.png');
    expect(get).toHaveBeenCalledTimes(2);
});

test('chat crops a loaded dynamic sprite from its 1x sheet at larger game render scales', async () => {
    let image;
    const avatar = '_' + 'a'.repeat(64) + 'i0';
    const {instance} = chat({Image: class {constructor() {image = this;}}});
    instance.app.game.sprites = {[avatar]: {dynamicNFT: true, scale: 3, filepath: 'https://example.com/avatar.png', width: 32, height: 32, animationData: {idle_down: {row: 8}}}};
    const loading = instance.avatarSource(avatar);
    image.onload();
    expect(await loading).toEqual({url: 'https://example.com/avatar.png', width: 32, height: 32, row: 8});
});

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

test('the gift picker accepts the server inventory of transferable items', () => {
    const {instance} = chat();
    instance.inventoryLoading = true;
    const items = [{item: String(Types.Entities.M88NROSE), name: 'Red Rose', quantity: 3}];
    instance.receive(Types.Messages.CHAT_INVENTORY, items);
    expect(instance.transferableItems).toEqual(items);
    expect(instance.inventoryLoading).toBe(false);
});

test('an excluded attachment keeps the draft and tells the sender to choose another item', () => {
    const {instance, input} = chat();
    instance.tab = 'direct'; instance.target = 'bob'; input.value = 'Enjoy';
    instance.attachments.set('direct:bob', {item: String(Types.Entities.M88NSKELETONKEY), quantity: 1});
    instance.send();
    const requestId = instance.app.game.client.sendChatGift.mock.calls[0][4];
    instance.receive(Types.Messages.CHAT_ERROR, {requestId, code: 'item_not_transferable'});
    expect(instance.pending.size).toBe(0);
    expect(instance.giftRetries.size).toBe(0);
    expect(instance.attachments.has('direct:bob')).toBe(true);
    expect(input.value).toBe('Enjoy');
    expect(instance.error).toHaveBeenCalledWith('This item cannot be gifted. Remove it and choose another item.');
});

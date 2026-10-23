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
        overlayMessages: [], me: {id: 'alice', mapId: 'main'}, people: new Map(), histories: new Map(), drafts: new Map(), attachments: new Map(), giftRetries: new Map(), pending: new Map(), unread: new Map(), publicUnread: new Map(), avatarSources: new Map(),
        connected: true, tab: 'world', target: '', players: [{id: 'bob'}],
        app: {game: {client: {connection: {connected: true}, sendChatGift: jest.fn(), sendSocialChat: jest.fn()}}},
        renderMessages: jest.fn(), renderBadges: jest.fn(), renderComposerState: jest.fn(), clearError: jest.fn(), error: jest.fn()
    });
    const input = {value: ''}; instance.node = () => input;
    return {instance, input, timers};
}

function unreadChat({open = false, hidden = false} = {}) {
    const makeNode = () => {
        const classes = new Set();
        const attributes = new Map();
        return {
            hidden: false, textContent: '',
            classList: {
                contains: name => classes.has(name),
                toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
            },
            setAttribute: (name, value) => attributes.set(name, String(value)),
            getAttribute: name => attributes.get(name),
            removeAttribute: name => attributes.delete(name)
        };
    };
    const button = makeNode();
    const directBadge = makeNode();
    const document = {hidden, getElementById: id => id === 'chatbutton' ? button : directBadge};
    const {instance, input} = chat({document});
    instance.panel = {classList: {contains: () => open}};
    instance.node = id => id === 'chatinput' ? input : document.getElementById(id);
    instance.renderHud = jest.fn();
    instance.renderBadges = Object.getPrototypeOf(instance).renderBadges;
    instance.app.game.audioManager = {playSound: jest.fn()};
    return {instance, button, directBadge, document, setOpen(value) {open = value;}};
}

function incomingMessage(id, channel = 'world', overrides = {}) {
    return {
        id, channel, sender: {id: 'bob', label: 'Bob'}, message: 'Hello', mapId: 'main', epoch: 1,
        ...(channel === 'direct' ? {recipient: {id: 'alice', label: 'Alice'}} : {}), ...overrides
    };
}

test('closed chat badges public and private messages while the Direct tab keeps its own count', () => {
    const {instance, button, directBadge} = unreadChat();
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('public'));
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('private', 'direct'));
    expect(instance.publicUnread.size).toBe(1);
    expect(instance.unread.get('bob')).toBe(1);
    expect(button.classList.contains('sc-unread')).toBe(true);
    expect(button.getAttribute('data-unread-count')).toBe('2');
    expect(button.getAttribute('title')).toBe('Chat · 2 unread messages');
    expect(button.getAttribute('aria-label')).toBe('Chat · 2 unread messages');
    expect(directBadge.hidden).toBe(false);
    expect(String(directBadge.textContent)).toBe('1');
});

test.each([
    ['World', 'world', '', 'world', 'main', 0],
    ['My map on the same map', 'map', '', 'world', 'main', 0],
    ['My map on another map', 'map', '', 'world', 'elsewhere', 1],
    ['a direct conversation', 'direct', 'bob', 'world', 'main', 1],
    ['World with an incoming DM', 'world', '', 'direct', 'main', 1],
    ['the direct inbox', 'direct', '', 'direct', 'main', 1],
    ['the matching direct conversation', 'direct', 'bob', 'direct', 'main', 0],
    ['another direct conversation', 'direct', 'charlie', 'direct', 'main', 1]
])('visible %s only reads messages shown in that view', (name, tab, target, channel, mapId, count) => {
    const {instance, button} = unreadChat({open: true});
    instance.tab = tab; instance.target = target;
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('new', channel, {mapId}));
    expect(instance.publicUnread.size + [...instance.unread.values()].reduce((sum, value) => sum + value, 0)).toBe(count);
    expect(button.classList.contains('sc-unread')).toBe(count > 0);
});

test.each(['world', 'direct'])('a hidden browser document does not read incoming %s messages', channel => {
    const {instance, button} = unreadChat({open: true, hidden: true});
    instance.tab = channel; instance.target = channel === 'direct' ? 'bob' : '';
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('hidden', channel));
    expect(button.getAttribute('data-unread-count')).toBe('1');
    expect(button.getAttribute('title')).toBe('Chat · 1 unread message');
});

test('self messages and replayed deliveries never add unread messages or repeat the DM sound', () => {
    const {instance, button} = unreadChat();
    const publicMessage = incomingMessage('public');
    const directMessage = incomingMessage('private', 'direct');
    for (const message of [publicMessage, publicMessage, directMessage, directMessage,
        incomingMessage('own-public', 'world', {sender: {id: 'ALICE'}}),
        incomingMessage('own-private', 'direct', {sender: {id: 'ALICE'}, recipient: {id: 'bob'}})]) {
        instance.receive(Types.Messages.CHAT_MESSAGE, message);
    }
    expect(instance.histories.get('world')).toHaveLength(2);
    expect(instance.histories.get('direct:bob')).toHaveLength(2);
    expect(instance.publicUnread.size).toBe(1);
    expect(instance.unread.get('bob')).toBe(1);
    expect(button.getAttribute('data-unread-count')).toBe('2');
    expect(instance.app.game.audioManager.playSound).toHaveBeenCalledTimes(1);
});

test('history synchronization preserves live unread counts without treating restored history as new', () => {
    const {instance, button} = unreadChat();
    const publicMessage = incomingMessage('live-public');
    const directMessage = incomingMessage('live-private', 'direct');
    instance.receive(Types.Messages.CHAT_MESSAGE, publicMessage);
    instance.receive(Types.Messages.CHAT_MESSAGE, directMessage);
    instance.render = jest.fn();
    const state = {
        me: instance.me, players: [instance.me, {id: 'bob'}],
        world: [incomingMessage('old-public'), publicMessage],
        map: [incomingMessage('old-public'), publicMessage],
        direct: [incomingMessage('old-private', 'direct'), directMessage]
    };
    instance.receive(Types.Messages.CHAT_STATE, state);
    instance.receive(Types.Messages.CHAT_STATE, state);
    instance.receive(Types.Messages.CHAT_MESSAGE, state.world[0]);
    instance.receive(Types.Messages.CHAT_MESSAGE, state.direct[0]);
    expect(instance.publicUnread.size).toBe(1);
    expect(instance.unread.get('bob')).toBe(1);
    expect(button.getAttribute('data-unread-count')).toBe('2');
    expect(instance.app.game.audioManager.playSound).toHaveBeenCalledTimes(1);
});

test('history for a different authenticated player clears the previous player unread state', () => {
    const {instance, button} = unreadChat();
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('public'));
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('private', 'direct'));
    instance.render = () => instance.renderBadges();
    const me = {id: 'charlie', mapId: 'main'};
    instance.receive(Types.Messages.CHAT_STATE, {me, players: [me], world: [], map: [], direct: []});
    expect(instance.publicUnread.size).toBe(0);
    expect(instance.unread.size).toBe(0);
    expect(button.classList.contains('sc-unread')).toBe(false);
});

test('a map sync reads only the new map public messages in the visible My map view', () => {
    const {instance, setOpen} = unreadChat();
    const oldMapMessage = incomingMessage('old-map');
    const newMapMessage = incomingMessage('new-map', 'world', {mapId: 'elsewhere'});
    instance.receive(Types.Messages.CHAT_MESSAGE, oldMapMessage);
    instance.receive(Types.Messages.CHAT_MESSAGE, newMapMessage);
    setOpen(true); instance.tab = 'map'; instance.render = () => instance.renderBadges();
    const me = {id: 'alice', mapId: 'elsewhere'};
    instance.receive(Types.Messages.CHAT_STATE, {
        me, players: [me], world: [oldMapMessage, newMapMessage], map: [newMapMessage], direct: []
    });
    expect([...instance.publicUnread.keys()]).toEqual(['old-map']);
});

test('reading My map and World clears the matching public messages while preserving unread DMs', () => {
    const {instance, button, setOpen} = unreadChat();
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('here'));
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('elsewhere', 'world', {mapId: 'elsewhere'}));
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('private', 'direct'));
    setOpen(true); instance.tab = 'map';
    instance.renderBadges();
    expect([...instance.publicUnread.keys()]).toEqual(['elsewhere']);
    expect(instance.unread.get('bob')).toBe(1);
    expect(button.getAttribute('data-unread-count')).toBe('2');
    instance.tab = 'world'; instance.renderBadges();
    expect(instance.publicUnread.size).toBe(0);
    expect(instance.unread.get('bob')).toBe(1);
    expect(button.getAttribute('data-unread-count')).toBe('1');
});

test('opening one direct conversation leaves other conversations and public unread intact', () => {
    const {instance, button, directBadge, setOpen} = unreadChat();
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('public'));
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('bob-private', 'direct'));
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('charlie-private', 'direct', {sender: {id: 'charlie'}}));
    setOpen(true); instance.tab = 'direct'; instance.target = 'bob'; instance.renderBadges();
    expect(instance.unread.has('bob')).toBe(false);
    expect(instance.unread.get('charlie')).toBe(1);
    expect(instance.publicUnread.size).toBe(1);
    expect(button.getAttribute('data-unread-count')).toBe('2');
    expect(String(directBadge.textContent)).toBe('1');
});

test('returning to a visible conversation clears its unread badge and resets the icon label', () => {
    const {instance, button, directBadge, document} = unreadChat({open: true, hidden: true});
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('hidden-public'));
    expect(button.classList.contains('sc-unread')).toBe(true);
    document.hidden = false; instance.renderBadges();
    expect(instance.publicUnread.size).toBe(0);
    expect(button.classList.contains('sc-unread')).toBe(false);
    expect(button.getAttribute('title')).toBe('Chat');
    expect(button.getAttribute('aria-label')).toBe('Chat');
    expect(directBadge.hidden).toBe(true);
});

test('the icon caps its displayed count while its accessible label keeps the full unread total', () => {
    const {instance, button} = unreadChat();
    for (let index = 0; index < 101; index++) {
        instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('public-' + index));
    }
    instance.receive(Types.Messages.CHAT_MESSAGE, incomingMessage('private', 'direct'));
    expect(button.getAttribute('data-unread-count')).toBe('99+');
    expect(button.getAttribute('title')).toBe('Chat · 102 unread messages');
    expect(button.getAttribute('aria-label')).toBe('Chat · 102 unread messages');
});

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

function hudChat() {
    const makeNode = () => ({
        childNodes: [], hidden: false, scrollTop: 0, scrollHeight: 100, clientHeight: 100,
        classList: {toggle: jest.fn(), contains: jest.fn().mockReturnValue(false)},
        setAttribute: jest.fn(), append(...nodes) {this.childNodes.push(...nodes);}, replaceChildren() {this.childNodes = [];}
    });
    const document = {createElement: tag => {
        const node = makeNode();
        if (tag === 'template') node.content = {textContent: 'Hello from world chat'};
        return node;
    }};
    const localStorage = {setItem: jest.fn()};
    const {instance} = chat({document, localStorage});
    const nodes = new Map(['chat-mini', 'chat-mini-messages'].map(id => [id, makeNode()]));
    instance.node = id => nodes.get(id); instance.panel = makeNode(); instance.hudMode = 'compact';
    return {instance, nodes, localStorage};
}

test('overlay shows incoming public messages without restoring chat history', () => {
    const {instance, nodes} = hudChat();
    instance.histories.set('world', [{sender: {label: 'Old history'}, message: 'Old'}]);
    instance.recordOverlayMessage({id: 'new', channel: 'world', sender: {label: 'Bob'}, message: 'Hello'});
    instance.recordOverlayMessage({id: 'private', channel: 'direct', sender: {label: 'Bob'}, message: 'Private'});
    instance.histories.set('direct:bob', [{sender: {label: 'Bob'}, message: 'Private'}]);
    instance.renderHud();
    expect(nodes.get('chat-mini').hidden).toBe(false);
    expect(nodes.get('chat-mini-messages').childNodes).toHaveLength(1);
    expect(nodes.get('chat-mini-messages').childNodes[0].childNodes[0].textContent).toBe('Bob: ');
});
test('hiding the mini log persists the preference and opening the panel suppresses the mini log', () => {
    const {instance, nodes, localStorage} = hudChat();
    instance.setHudMode('hidden');
    expect(localStorage.setItem).toHaveBeenCalledWith('chat-hud-mode', 'hidden');
    expect(nodes.get('chat-mini').hidden).toBe(true);
    instance.panel.classList.contains.mockReturnValue(true);
    instance.setHudMode('compact');
    expect(nodes.get('chat-mini').hidden).toBe(true);
});
test('overlay keeps six live messages and preserves a scrolled position', () => {
    const {instance, nodes} = hudChat();
    Array.from({length: 30}, (_, n) => ({id: String(n), channel: 'world', sender: {label: String(n)}, message: 'Hello'})).forEach(message => instance.recordOverlayMessage(message));
    const log = nodes.get('chat-mini-messages'); log.scrollHeight = 1000; log.scrollTop = 50;
    instance.renderHud();
    expect(log.childNodes).toHaveLength(6);
    expect(log.childNodes[0].childNodes[0].textContent).toBe('24: ');
    expect(log.scrollTop).toBe(50);
});

test('opening the overlay stops the map click handler and preserves the previous conversation draft', () => {
    const {instance, input} = chat();
    instance.tab = 'direct'; instance.target = 'bob'; input.value = 'Unsent message';
    instance.render = jest.fn(); instance.app.showChat = jest.fn();
    const event = {preventDefault: jest.fn(), stopPropagation: jest.fn()};
    instance.openFromOverlay(event);
    expect(instance.drafts.get('direct:bob')).toBe('Unsent message');
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(instance.tab).toBe('world');
    expect(instance.app.showChat).toHaveBeenCalled();
});

test('chat identity keeps the title below ENS and avoids repeating a title used as the name', () => {
    const {instance} = chat({document: {createElement: tag => ({tag, children: [], append(...children) {this.children.push(...children);}})}});
    const identity = instance.identity({label: 'andre.eth', title: 'Knight', walletShort: '0xaaaa…aaaa'}, true);
    expect(identity.children.map(child => [child.tag, child.textContent])).toEqual([
        ['strong', 'andre.eth'], ['small', 'Knight'], ['small', '(0xaaaa…aaaa)']
    ]);
    expect(instance.identity({label: 'Knight', title: 'Knight', walletShort: '0xaaaa…aaaa'}).children).toHaveLength(2);
});

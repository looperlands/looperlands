jest.mock('./discord', () => ({ sendMessage: jest.fn() }));
const NodeCache = require('node-cache');
global.Types = {};
const Types = require('../../shared/js/gametypes');
const { SocialChat, identityFromSession } = require('./socialchat');
const publicChat = require('./chat');
const discord = require('./discord');
const Collectables = require('./collectables');

let cache, service;
function player(id, mapId = 'main', title = 'Same title') {
    const walletId = '0x' + String(id).padStart(40, '0');
    const sessionId = 'session-' + id;
    cache.set(sessionId, { walletId, nftId:'0xabc' + id, mapId, title, entityId:String(id), resolvedName:'verified-' + id, gameData:{items:{}} });
    const result = {id:String(id),sessionId,walletId,nftId:'0xabc' + id,mapId,name:'forged HELLO name',isBot:()=>false,send:jest.fn()};
    service.register(result); return result;
}
function events(person, type) { return person.send.mock.calls.filter(([packet]) => packet[0] === type).map(([packet]) => packet[1]); }
beforeEach(() => { cache = new NodeCache(); service = new SocialChat(cache); jest.clearAllMocks(); });
afterEach(() => { cache.close(); service.history.close(); service.gifts.close(); });

test('labels and avatar use session identity, never a forged client name', () => {
    const person = player(1);
    expect(service.identity(person)).toMatchObject({ label:'Same title', walletShort:'0x0000…0001', avatar:'NFT_abc1' });
    const session = cache.get(person.sessionId); session.title = ' '; cache.set(person.sessionId, session);
    expect(service.identity(person).label).toBe('verified-1');
    expect(identityFromSession({walletId:person.walletId}).label).toBe('0x0000…0001');
});

test('same-title DMs target distinct wallets and reach only the two participants', () => {
    const alice = player(1), bob = player(2), stranger = player(3);
    service.send(alice,'direct',service.identity(bob).id,'Private hello','request-1');
    expect(events(alice,Types.Messages.CHAT_MESSAGE)).toHaveLength(1);
    expect(events(bob,Types.Messages.CHAT_MESSAGE)).toHaveLength(1);
    expect(events(stranger,Types.Messages.CHAT_MESSAGE)).toHaveLength(0);
    expect(events(alice,Types.Messages.CHAT_MESSAGE)[0].requestId).toBe('request-1');
    expect(events(bob,Types.Messages.CHAT_MESSAGE)[0].requestId).toBeUndefined();
    service.sync(stranger);
    expect(events(stranger,Types.Messages.CHAT_STATE).at(-1).direct).toEqual([]);
    expect(discord.sendMessage).not.toHaveBeenCalled();
    expect(publicChat.getMessages() || []).not.toContainEqual(expect.objectContaining({message:'Private hello'}));
});

test('World includes every public message and My map filters by the map at send time', () => {
    const alice = player(1), bob = player(2), elsewhere = player(3,'taikotown');
    service.send(alice,'map','','Map hello');
    expect(events(bob,Types.Messages.CHAT_MESSAGE)).toHaveLength(1);
    expect(events(elsewhere,Types.Messages.CHAT_MESSAGE)).toHaveLength(1);
    service.send(alice,'world','','World hello');
    expect(events(elsewhere,Types.Messages.CHAT_MESSAGE)).toHaveLength(2);
    service.sync(elsewhere);
    expect(events(elsewhere,Types.Messages.CHAT_STATE).at(-1).map).toEqual([]);
    expect(events(elsewhere,Types.Messages.CHAT_STATE).at(-1).world.map(message => message.message)).toEqual(['Map hello','World hello']);
    service.sync(alice);
    expect(events(alice,Types.Messages.CHAT_STATE).at(-1).map).toHaveLength(2);
    expect(discord.sendMessage).toHaveBeenCalledTimes(2);
});

test('an expired session or mismatched wallet cannot send or receive chat', () => {
    const alice = player(1), bob = player(2);
    cache.del(alice.sessionId);
    expect(service.send(alice,'world','','forged')).toBe(false);
    service.send(bob,'world','','real');
    expect(events(alice,Types.Messages.CHAT_MESSAGE)).toHaveLength(0);
    expect(service.roster()).toHaveLength(1);
    cache.set(alice.sessionId,{walletId:bob.walletId,entityId:alice.id,mapId:alice.mapId});
    expect(service.send(alice,'direct',service.identity(bob).id,'forged')).toBe(false);
});

test('offline recipient gives a failure without storing or broadcasting the message', () => {
    const alice = player(1), bob = player(2);
    service.unregister(bob);
    expect(service.send(alice,'direct',service.identity(bob).id,'hello','request-2')).toBe(false);
    expect(events(alice,Types.Messages.CHAT_ERROR).at(-1)).toMatchObject({code:'player_offline',requestId:'request-2'});
    expect(service.history.get('inbox:' + alice.walletId)).toBeUndefined();
});

test('private history remains available to the same wallet after changing maps', () => {
    const alice = player(1), bob = player(2);
    service.send(alice,'direct',service.identity(bob).id,'meet there'); service.unregister(bob);
    const returned = player(2,'taikotown');
    expect(events(returned,Types.Messages.CHAT_STATE).at(-1).direct[0].message).toBe('meet there');
});

test('history is bounded and retains long multiline text safely', () => {
    const alice = player(1);
    for (let i=0;i<105;i++) service.send(alice,'map','',String(i));
    service.send(alice,'map','','a'.repeat(1999)+'\n'+'b'.repeat(2000));
    service.sync(alice);
    const history = events(alice,Types.Messages.CHAT_STATE).at(-1).map;
    expect(history).toHaveLength(100); expect(history[0].message).toBe('6'); expect(history.at(-1).message).toHaveLength(4000);
    service.send(alice,'map','','<script>bad()</script>hello');
    expect(events(alice,Types.Messages.CHAT_MESSAGE).at(-1).message).toBe('hello');
});

test('an old connection closing does not remove its replacement from presence', () => {
    const original = player(1); const replacement = player(1,'taikotown');
    service.unregister(original);
    expect(service.roster()[0].mapId).toBe('taikotown'); expect(service.players.get(original.walletId)).toBe(replacement);
});

test('presence publishes the configured scene and updates only when crossing a scene boundary', () => {
    const alice = player(1), bob = player(2);
    alice.server = {map: {getSceneAt: (x, y) => y < 100 ? {name: 'Forest'} : y < 200 ? {name: 'Desert'} : undefined}};
    alice.x = 40; alice.y = 20;
    service.updateLocation(alice);
    expect(events(bob, Types.Messages.CHAT_PLAYERS).at(-1).find(person => person.id === service.identity(alice).id).sceneName).toBe('Forest');
    bob.send.mockClear(); alice.y = 50; service.updateLocation(alice);
    expect(events(bob, Types.Messages.CHAT_PLAYERS)).toHaveLength(0);
    alice.y = 100; service.updateLocation(alice);
    expect(events(bob, Types.Messages.CHAT_PLAYERS)).toHaveLength(1);
    expect(service.identity(alice).sceneName).toBe('Desert');
    alice.y = 200; service.updateLocation(alice);
    expect(service.identity(alice).sceneName).toBe('');
    service.unregister(alice); bob.send.mockClear(); alice.y = 20; service.updateLocation(alice);
    expect(events(bob, Types.Messages.CHAT_PLAYERS)).toHaveLength(0);
});

test('the chat protocol rejects payloads that try to attach a forged identity', () => {
    const format = {};
    require('vm').runInNewContext(require('fs').readFileSync(require('path').join(__dirname, 'format.js'), 'utf8'), {
        exports: format,
        require: name => name === 'underscore' ? require(name) : Types,
        Class: { extend: methods => function () { Object.assign(this, methods); this.init(); } }
    });
    const check = format.check;
    const packet = [Types.Messages.CHAT_SEND, 'direct', '0xrecipient', 'hello', 'request-id'];
    expect(check(packet)).toBe(true);
    expect(check([...packet,{wallet:'0xsomebody-else',title:'Forged'}])).toBe(false);
    expect(check([Types.Messages.CHAT_SEND,'direct',123,'hello','request-id'])).toBe(false);
    expect(check([Types.Messages.CHAT_GIFT, 'opaque-id', '', '35', 1, 'request-id'])).toBe(true);
    expect(check([Types.Messages.CHAT_GIFT, 'opaque-id', '', '35', '1', 'request-id'])).toBe(false);
});

test('all public chat packets omit full wallets, including private history and presence', () => {
    const alice = player(1), bob = player(2);
    const id = service.identity(bob).id;
    service.send(alice, 'world', '', 'hello');
    service.send(alice, 'direct', id, 'private');
    service.sync(bob);
    for (const person of [alice, bob]) {
        const packets = JSON.stringify(person.send.mock.calls);
        expect(packets).not.toContain(alice.walletId);
        expect(packets).not.toContain(bob.walletId);
    }
    expect(service.send(alice, 'direct', bob.walletId, 'address target')).toBe(false);
    service.unregister(bob);
    const returned = player(2, 'taikotown');
    expect(service.identity(returned).id).toBe(id);
});

function giveConsumables(person, amount) {
    const item = String(Types.Entities.CPOTION_S);
    expect(Collectables.isConsumable(Number(item))).toBeTruthy();
    const session = cache.get(person.sessionId); session.gameData.items[item] = amount; cache.set(person.sessionId, session);
    return item;
}

test('a gift reserves goods, commits once and only delivers a private receipt to its participants', async () => {
    const alice = player(1), bob = player(2), stranger = player(3);
    const item = giveConsumables(alice, 5); giveConsumables(bob, 1);
    let commit;
    service.inventoryGateway = {transferConsumables: jest.fn(() => new Promise(resolve => {commit = resolve;}))};
    const target = service.identity(bob).id;
    const first = service.sendGift(alice, target, '', item, 3, 'gift-request-1');
    const duplicate = service.sendGift(alice, target, '', item, 3, 'gift-request-1');
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(2);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toHaveLength(0);
    expect(service.inventoryGateway.transferConsumables).toHaveBeenCalledTimes(1);
    commit({fromQuantity: 2, toQuantity: 4});
    expect(await first).toBe(true); expect(await duplicate).toBe(true);
    expect(cache.get(bob.sessionId).gameData.items[item]).toBe(4);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toHaveLength(1);
    expect(events(stranger, Types.Messages.CHAT_MESSAGE)).toHaveLength(0);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)[0].attachment).toMatchObject({item, quantity: 3});
    expect(discord.sendMessage).not.toHaveBeenCalled();
    expect(service.history.get('world')).toBeUndefined();
    await service.sendGift(alice, target, '', item, 3, 'gift-request-1');
    expect(service.inventoryGateway.transferConsumables).toHaveBeenCalledTimes(1);
    expect(service.history.get('inbox:' + alice.walletId)).toHaveLength(1);
});

test('invalid or excessive gifts never reach the inventory backend', async () => {
    const alice = player(1), bob = player(2); const item = giveConsumables(alice, 2);
    service.inventoryGateway = {transferConsumables: jest.fn()};
    const target = service.identity(bob).id;
    for (const quantity of [0, -1, 1.5, 3, Infinity]) expect(await service.sendGift(alice, target, '', item, quantity, 'gift-request-2')).toBe(false);
    expect(await service.sendGift(alice, target, '', String(Types.Entities.GOLD), 1, 'gift-request-3')).toBe(false);
    expect(service.inventoryGateway.transferConsumables).not.toHaveBeenCalled();
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(2);
});

test('a definite transfer rejection releases the reservation and keeps the DM unsent', async () => {
    const alice = player(1), bob = player(2); const item = giveConsumables(alice, 5);
    service.inventoryGateway = {transferConsumables: jest.fn().mockRejectedValue({code: 'insufficient_items'})};
    expect(await service.sendGift(alice, service.identity(bob).id, 'Enjoy', item, 3, 'gift-request-4')).toBe(false);
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(5);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toHaveLength(0);
});

test('an uncertain transfer retains its reservation and retries the exact same backend request', async () => {
    const alice = player(1), bob = player(2); const item = giveConsumables(alice, 5);
    service.inventoryGateway = {transferConsumables: jest.fn().mockRejectedValueOnce({transferUncertain: true}).mockResolvedValueOnce({fromQuantity: 2, toQuantity: 3})};
    const target = service.identity(bob).id;
    expect(await service.sendGift(alice, target, 'Enjoy', item, 3, 'gift-request-5')).toBe(false);
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(2);
    expect(events(alice, Types.Messages.CHAT_ERROR).at(-1).code).toBe('gift_pending');
    expect(await service.sendGift(alice, target, 'Changed', item, 3, 'gift-request-5')).toBe(false);
    expect(await service.sendGift(alice, target, 'Enjoy', item, 3, 'gift-request-5')).toBe(true);
    const calls = service.inventoryGateway.transferConsumables.mock.calls;
    expect(calls[0][0]).toEqual(calls[1][0]);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toHaveLength(1);
});

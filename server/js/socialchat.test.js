jest.mock('./discord', () => ({ sendMessage: jest.fn() }));
const NodeCache = require('node-cache');
global.Types = {};
const Types = require('../../shared/js/gametypes');
const { SocialChat, identityFromSession } = require('./socialchat');
const publicChat = require('./chat');
const discord = require('./discord');
const Collectables = require('./collectables');
const Properties = require('./properties');
const {ChatHistory} = require('./chathistory');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

test('restarting chat restores public history and private threads only to their wallet, with stable player IDs', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'looperlands-social-'));
    const filename = path.join(directory, 'history.json');
    try {
        service.history = new ChatHistory(filename);
        const alice = player(1), bob = player(2);
        const bobId = service.identity(bob).id;
        service.send(alice, 'direct', bobId, 'Private hello');
        service.send(alice, 'map', '', 'Public hello');
        service.gifts.close();
        service = new SocialChat(cache, undefined, new ChatHistory(filename));
        const returnedAlice = player(1, 'taikotown'), returnedBob = player(2), stranger = player(3);
        const state = events(returnedAlice, Types.Messages.CHAT_STATE).at(-1);
        expect(state.world[0].message).toBe('Public hello');
        expect(state.map).toEqual([]);
        expect(state.direct[0].recipient.id).toBe(bobId);
        expect(state.direct[0].sender.id).toBe(state.me.id);
        expect(service.identity(returnedBob).id).toBe(bobId);
        expect(events(stranger, Types.Messages.CHAT_STATE).at(-1).direct).toEqual([]);
        expect(JSON.stringify(returnedAlice.send.mock.calls)).not.toContain(returnedBob.walletId);
        expect(discord.sendMessage).toHaveBeenCalledTimes(1);
        expect(service.send(returnedAlice, 'direct', bobId, 'Still the same thread')).toBe(true);
    } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

test('a history write failure never delivers or acknowledges a chat message', () => {
    const alice = player(1), bob = player(2);
    jest.spyOn(service.history, 'append').mockImplementation(() => {throw Object.assign(new Error('Disk full'), {code: 'ENOSPC'});});
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        expect(service.send(alice, 'direct', service.identity(bob).id, 'unsaved', 'failed-request')).toBe(false);
        expect(events(alice, Types.Messages.CHAT_MESSAGE)).toEqual([]);
        expect(events(bob, Types.Messages.CHAT_MESSAGE)).toEqual([]);
        expect(events(alice, Types.Messages.CHAT_ERROR).at(-1).code).toBe('history_unavailable');
    } finally { errorLog.mockRestore(); }
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

test('gift inventory resolves named goods, consumables and fish to existing sprites', () => {
    const fs = require('fs');
    const path = require('path');
    const alice = player(1);
    const session = cache.get(alice.sessionId);
    session.gameData.items = {
        [Types.Entities.FLASK]: 1679,
        [Types.Entities.LOOPRING]: 590,
        [Types.Entities.POTION]: 73,
        [Types.Entities.CPOTION_S]: 2,
        cobgoldfish: 1
    };
    cache.set(alice.sessionId, session);
    const inventory = service.inventory(alice);
    expect(inventory.map(item => item.image)).toEqual([
        'item-flask', 'item-loopring', 'item-potion', 'item-cpotion_s', 'cobgoldfish'
    ]);
    for (const item of inventory) {
        expect(fs.existsSync(path.join(__dirname, '../../client/img/1', item.image + '.png'))).toBe(true);
    }
});

test('a gift reserves goods, commits once and only delivers a private receipt to its participants', async () => {
    const alice = player(1), bob = player(2), stranger = player(3);
    const item = giveConsumables(alice, 5); giveConsumables(bob, 1);
    let commit;
    service.inventoryGateway = {transferItems: jest.fn(() => new Promise(resolve => {commit = resolve;}))};
    const target = service.identity(bob).id;
    const first = service.sendGift(alice, target, '', item, 3, 'gift-request-1');
    const duplicate = service.sendGift(alice, target, '', item, 3, 'gift-request-1');
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(2);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toHaveLength(0);
    expect(service.inventoryGateway.transferItems).toHaveBeenCalledTimes(1);
    commit({fromQuantity: 2, toQuantity: 4});
    expect(await first).toBe(true); expect(await duplicate).toBe(true);
    expect(cache.get(bob.sessionId).gameData.items[item]).toBe(4);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toHaveLength(1);
    expect(events(stranger, Types.Messages.CHAT_MESSAGE)).toHaveLength(0);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)[0].attachment).toMatchObject({item, quantity: 3, image: 'item-cpotion_s'});
    expect(discord.sendMessage).not.toHaveBeenCalled();
    expect(service.history.get('world')).toBeUndefined();
    await service.sendGift(alice, target, '', item, 3, 'gift-request-1');
    expect(service.inventoryGateway.transferItems).toHaveBeenCalledTimes(1);
    expect(service.history.get('inbox:' + alice.walletId)).toHaveLength(1);
});

test('invalid or excessive gifts never reach the inventory backend', async () => {
    const alice = player(1), bob = player(2); const item = giveConsumables(alice, 2);
    service.inventoryGateway = {transferItems: jest.fn()};
    const target = service.identity(bob).id;
    for (const quantity of [0, -1, 1.5, 3, Infinity]) expect(await service.sendGift(alice, target, '', item, quantity, 'gift-request-2')).toBe(false);
    expect(await service.sendGift(alice, target, '', String(Types.Entities.M88NSKELETONKEY), 1, 'gift-request-3')).toBe(false);
    expect(service.inventoryGateway.transferItems).not.toHaveBeenCalled();
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(2);
});

test.each([Types.Entities.GOLD, Types.Entities.WOOD, Types.Entities.M88NROSE, Types.Entities.BOARHIDE, Types.Entities.SHORT_ARROW, 'cobguppy'])('a non-consumable gift %s uses the atomic transfer and updates both inventories', async kind => {
    const alice = player(1), bob = player(2);
    const item = String(kind);
    const session = cache.get(alice.sessionId); session.gameData.items[item] = 5; cache.set(alice.sessionId, session);
    expect(Collectables.isConsumable(kind)).toBeFalsy();
    expect(service.inventory(alice)).toContainEqual(expect.objectContaining({item, quantity: 5}));
    service.inventoryGateway = {transferItems: jest.fn().mockResolvedValue({fromQuantity: 3, toQuantity: 2})};
    expect(await service.sendGift(alice, service.identity(bob).id, 'Enjoy', item, 2, 'gift-material-1')).toBe(true);
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(3);
    expect(cache.get(bob.sessionId).gameData.items[item]).toBe(2);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)[0].attachment).toMatchObject({item, quantity: 2});
    if (Types.isResource(kind)) {
        expect(alice.send).toHaveBeenCalledWith([Types.Messages.RESOURCE, kind, 3]);
        expect(bob.send).toHaveBeenCalledWith([Types.Messages.RESOURCE, kind, 2]);
    }
});

test.each([Types.Entities.M88NSKELETONKEY, Types.Entities.M88NVIPBAG, Types.Entities.EVERPEAKMAP1, Types.Entities.ORB, Types.Entities.SWORD1, Types.Entities.RAT, 'unknown-item'])('an owned excluded item %s is hidden and cannot be sent through a forged packet', async kind => {
    const alice = player(1), bob = player(2);
    const item = String(kind);
    const session = cache.get(alice.sessionId); session.gameData.items[item] = 5; cache.set(alice.sessionId, session);
    service.inventoryGateway = {transferItems: jest.fn()};
    expect(service.inventory(alice)).toEqual([]);
    expect(await service.sendGift(alice, service.identity(bob).id, '', item, 1, 'gift-blocked-1')).toBe(false);
    expect(events(alice, Types.Messages.CHAT_ERROR).at(-1).code).toBe('item_not_transferable');
    expect(service.inventoryGateway.transferItems).not.toHaveBeenCalled();
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(5);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toHaveLength(0);
});

test('an accepted uncertain gift still confirms after the item is excluded, while new gifts are blocked', async () => {
    const alice = player(1), bob = player(2); const item = giveConsumables(alice, 5);
    service.inventoryGateway = {transferItems: jest.fn().mockRejectedValueOnce({transferUncertain: true}).mockResolvedValueOnce({fromQuantity: 2, toQuantity: 3})};
    const target = service.identity(bob).id;
    expect(await service.sendGift(alice, target, '', item, 3, 'gift-policy-1')).toBe(false);
    const previous = Properties.cpotion_s.transferable;
    Properties.cpotion_s.transferable = false;
    try {
        expect(await service.sendGift(alice, target, '', item, 1, 'gift-policy-2')).toBe(false);
        expect(await service.sendGift(alice, target, '', item, 3, 'gift-policy-1')).toBe(true);
        expect(service.inventoryGateway.transferItems).toHaveBeenCalledTimes(2);
        expect(service.inventoryGateway.transferItems.mock.calls[0][0]).toEqual(service.inventoryGateway.transferItems.mock.calls[1][0]);
    } finally {
        if (previous === undefined) delete Properties.cpotion_s.transferable;
        else Properties.cpotion_s.transferable = previous;
    }
});

test('a delayed gift balance does not overwrite the HUD after changing avatars', () => {
    const alice = player(1);
    const previousNft = alice.nftId;
    const session = cache.get(alice.sessionId);
    alice.nftId = session.nftId = 'another-avatar';
    session.gameData.items[String(Types.Entities.GOLD)] = 100;
    cache.set(alice.sessionId, session);
    alice.send.mockClear();
    service.setQuantity(alice.walletId, previousNft, String(Types.Entities.GOLD), 3);
    expect(events(alice, Types.Messages.RESOURCE)).toEqual([]);
    expect(cache.get(alice.sessionId).gameData.items[String(Types.Entities.GOLD)]).toBe(100);
});

test('a definite transfer rejection releases the reservation and keeps the DM unsent', async () => {
    const alice = player(1), bob = player(2); const item = giveConsumables(alice, 5);
    service.inventoryGateway = {transferItems: jest.fn().mockRejectedValue({code: 'insufficient_items'})};
    expect(await service.sendGift(alice, service.identity(bob).id, 'Enjoy', item, 3, 'gift-request-4')).toBe(false);
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(5);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toHaveLength(0);
});

test('an uncertain transfer retains its reservation and retries the exact same backend request', async () => {
    const alice = player(1), bob = player(2); const item = giveConsumables(alice, 5);
    service.inventoryGateway = {transferItems: jest.fn().mockRejectedValueOnce({transferUncertain: true}).mockResolvedValueOnce({fromQuantity: 2, toQuantity: 3})};
    const target = service.identity(bob).id;
    expect(await service.sendGift(alice, target, 'Enjoy', item, 3, 'gift-request-5')).toBe(false);
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(2);
    expect(events(alice, Types.Messages.CHAT_ERROR).at(-1).code).toBe('gift_pending');
    expect(await service.sendGift(alice, target, 'Changed', item, 3, 'gift-request-5')).toBe(false);
    expect(await service.sendGift(alice, target, 'Enjoy', item, 3, 'gift-request-5')).toBe(true);
    const calls = service.inventoryGateway.transferItems.mock.calls;
    expect(calls[0][0]).toEqual(calls[1][0]);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toHaveLength(1);
});

test('a confirmed gift with a failed history write is retried without refunding or transferring twice', async () => {
    const alice = player(1), bob = player(2), item = giveConsumables(alice, 5);
    service.inventoryGateway = {transferItems: jest.fn().mockResolvedValue({fromQuantity: 2, toQuantity: 3})};
    const target = service.identity(bob).id;
    jest.spyOn(service.history, 'append').mockImplementationOnce(() => {throw new Error('Disk full');});
    expect(await service.sendGift(alice, target, 'Enjoy', item, 3, 'gift-storage-1')).toBe(false);
    expect(cache.get(alice.sessionId).gameData.items[item]).toBe(2);
    expect(events(bob, Types.Messages.CHAT_MESSAGE)).toEqual([]);
    expect(events(alice, Types.Messages.CHAT_ERROR).at(-1).code).toBe('gift_pending');
    expect(await service.sendGift(alice, target, 'Enjoy', item, 3, 'gift-storage-1')).toBe(true);
    expect(service.inventoryGateway.transferItems).toHaveBeenCalledTimes(1);
    const history = service.history;
    service.gifts.close(); service = new SocialChat(cache, undefined, history);
    const returnedAlice = player(1), returnedBob = player(2);
    service.inventoryGateway = {transferItems: jest.fn()};
    expect(await service.sendGift(returnedAlice, service.identity(returnedBob).id, 'Enjoy', item, 3, 'gift-storage-1')).toBe(true);
    expect(service.inventoryGateway.transferItems).not.toHaveBeenCalled();
    expect(await service.sendGift(returnedAlice, service.identity(returnedBob).id, 'Changed', item, 3, 'gift-storage-1')).toBe(false);
});

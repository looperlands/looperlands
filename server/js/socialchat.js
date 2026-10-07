const crypto = require('crypto');
const NodeCache = require('node-cache');
const Types = require('../../shared/js/gametypes');
const Utils = require('./utils');
const publicChat = require('./chat');
const Collectables = require('./collectables');

const MAX_MESSAGES = 100;
const HISTORY_TTL = 24 * 60 * 60;
const walletKey = wallet => String(wallet || '').toLowerCase();
const itemKind = item => /^\d+$/.test(item) ? Number(item) : item;

function shortWallet(wallet) {
    return wallet.length > 12 ? wallet.slice(0, 6) + '…' + wallet.slice(-4) : wallet;
}

// Only the server-created session supplies identity. HELLO names never enter chat.
function identityFromSession(session) {
    const wallet = String(session.walletId || '');
    const title = typeof session.title === 'string' ? session.title.trim() : '';
    return {
        walletShort: shortWallet(wallet),
        label: String(title || session.resolvedName || shortWallet(wallet)).replace(/0x[a-f0-9]{40}\b/gi, shortWallet),
        avatar: String(session.nftId || '').replace(/^0x/, 'NFT_'),
        mapId: session.mapId
    };
}

class SocialChat {
    constructor(sessionCache, inventoryGateway) {
        this.sessions = sessionCache;
        this.players = new Map();
        this.locations = new Map();
        this.publicIds = new Map();
        this.walletsById = new Map();
        this.inventoryGateway = inventoryGateway;
        this.gifts = new NodeCache({stdTTL: HISTORY_TTL, checkperiod: 300, useClones: false});
        this.history = new NodeCache({ stdTTL: HISTORY_TTL, checkperiod: 300 });
    }

    identity(player) {
        const session = this.sessions.get(player.sessionId);
        if (!session || session.entityId !== player.id || session.mapId !== player.mapId ||
            walletKey(session.walletId) !== walletKey(player.walletId)) {
            return null;
        }
        return { ...identityFromSession(session), sceneName: this.sceneName(player), id: this.publicId(player.walletId) };
    }

    sceneName(player) {
        const scene = player.server?.map?.getSceneAt?.(player.x, player.y);
        return String(scene?.name || '').trim().slice(0, 120).replace(/0x[a-f0-9]{40}\b/gi, shortWallet);
    }

    publicId(wallet) {
        const key = walletKey(wallet);
        if (!this.publicIds.has(key)) {
            const id = crypto.randomBytes(16).toString('hex');
            this.publicIds.set(key, id);
            this.walletsById.set(id, key);
        }
        return this.publicIds.get(key);
    }

    register(player) {
        if (player.isBot() || !this.identity(player)) return;
        const key = walletKey(player.walletId);
        this.players.set(key, player);
        this.locations.set(key, this.identity(player).sceneName);
        this.sync(player);
        this.broadcastPresence();
    }

    unregister(player) {
        const key = walletKey(player.walletId);
        if (this.players.get(key) !== player) return;
        this.players.delete(key);
        this.locations.delete(key);
        this.broadcastPresence();
    }

    updateLocation(player) {
        const key = walletKey(player.walletId);
        if (this.players.get(key) !== player) return;
        if (this.locations.get(key) === this.sceneName(player)) return;
        const identity = this.identity(player);
        if (!identity) return;
        this.locations.set(key, identity.sceneName);
        this.broadcastPresence();
    }

    roster() {
        return [...this.players.values()].map(player => this.identity(player)).filter(Boolean);
    }

    broadcastPresence() {
        const roster = this.roster();
        for (const player of this.players.values()) {
            if (this.identity(player)) player.send([Types.Messages.CHAT_PLAYERS, roster]);
        }
    }

    sync(player) {
        const me = this.identity(player);
        if (!me || this.players.get(walletKey(player.walletId)) !== player) return;
        const world = this.history.get('world') || [];
        player.send([Types.Messages.CHAT_STATE, {
            me, players: this.roster(), world,
            map: world.filter(message => message.mapId === me.mapId),
            direct: this.history.get('inbox:' + walletKey(player.walletId)) || []
        }]);
        this.sendInventory(player);
    }

    inventory(player) {
        if (!this.identity(player)) return [];
        const items = this.sessions.get(player.sessionId)?.gameData?.items || {};
        return Object.entries(items).filter(([item, quantity]) => Number.isSafeInteger(quantity) && quantity > 0 && Collectables.isConsumable(itemKind(item))).map(([item, quantity]) => ({
            ...this.itemDetails(item), quantity, description: Collectables.getInventoryDescription(itemKind(item)) || ''
        }));
    }

    sendInventory(player) {
        if (this.identity(player)) player.send([Types.Messages.CHAT_INVENTORY, this.inventory(player)]);
    }

    setQuantity(wallet, nftId, item, quantity) {
        for (const sessionId of this.sessions.keys()) {
            const session = this.sessions.get(sessionId);
            if (session?.nftId === nftId && walletKey(session.walletId) === walletKey(wallet) && session.gameData) {
                session.gameData.items = {...session.gameData.items, [item]: Math.max(0, quantity)};
                this.sessions.set(sessionId, session);
            }
        }
        const player = this.players.get(walletKey(wallet));
        if (player) this.sendInventory(player);
    }

    async sendGift(player, target, text, item, quantity, requestId) {
        const sender = this.identity(player);
        if (!sender || this.players.get(walletKey(player.walletId)) !== player) return false;
        if (!/^[a-zA-Z0-9_-]{8,80}$/.test(requestId) || !/^[a-zA-Z0-9_-]{1,64}$/.test(item) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000 || !Collectables.isConsumable(itemKind(item))) {
            return this.fail(player, 'invalid_gift', 'direct', target, requestId);
        }
        const transferId = crypto.createHash('sha256').update(walletKey(player.walletId) + '\0' + requestId).digest('hex');
        const messageText = Utils.sanitize(text.slice(0, Types.MAX_CHAT_LENGTH));
        let gift = this.gifts.get(transferId);
        if (gift && (gift.target !== target || gift.text !== messageText || gift.item !== item || gift.quantity !== quantity || gift.fromNftId !== player.nftId)) {
            return this.fail(player, 'request_conflict', 'direct', target, requestId);
        }
        if (gift?.message) {
            player.send([Types.Messages.CHAT_MESSAGE, {...gift.message, requestId}]);
            this.sendInventory(player);
            return true;
        }
        if (!gift) {
            const recipientPlayer = this.players.get(this.walletsById.get(target));
            const recipient = recipientPlayer && this.identity(recipientPlayer);
            if (!recipient || recipient.id === sender.id || recipientPlayer.nftId === player.nftId) return this.fail(player, 'player_offline', 'direct', target, requestId);
            const available = this.inventory(player).find(entry => entry.item === item);
            if (!available || available.quantity < quantity) return this.fail(player, 'insufficient_items', 'direct', target, requestId);
            gift = {target, text: messageText, item, quantity, sender, recipient, senderWallet: player.walletId, recipientWallet: recipientPlayer.walletId, fromNftId: player.nftId, toNftId: recipientPlayer.nftId};
            this.gifts.set(transferId, gift);
            // Reserve immediately so the same units cannot be consumed or sent twice.
            this.setQuantity(player.walletId, player.nftId, item, available.quantity - quantity);
        }
        if (!gift.inFlight) {
            gift.inFlight = (async () => {
                try {
                    const receipt = await this.inventoryGateway.transferConsumables({requestId: transferId, fromNftId: gift.fromNftId, toNftId: gift.toNftId, item, quantity});
                    this.setQuantity(gift.senderWallet, gift.fromNftId, item, receipt.fromQuantity);
                    this.setQuantity(gift.recipientWallet, gift.toNftId, item, receipt.toQuantity);
                    gift.message = {
                        id: transferId, channel: 'direct', sender: gift.sender, recipient: gift.recipient,
                        message: gift.text, epoch: Date.now(), mapId: gift.sender.mapId,
                        attachment: {...this.itemDetails(item), quantity, transferId}
                    };
                    this.append('inbox:' + walletKey(gift.senderWallet), gift.message);
                    this.append('inbox:' + walletKey(gift.recipientWallet), gift.message);
                    const receiver = this.players.get(walletKey(gift.recipientWallet));
                    if (receiver && this.identity(receiver)) receiver.send([Types.Messages.CHAT_MESSAGE, gift.message]);
                    return true;
                } catch (error) {
                    gift.error = error.transferUncertain ? 'gift_pending' : error.code || 'gift_unavailable';
                    if (!error.transferUncertain) {
                        const session = this.sessions.get(player.sessionId);
                        const current = session?.gameData?.items?.[item] || 0;
                        this.setQuantity(gift.senderWallet, gift.fromNftId, item, current + quantity);
                        this.gifts.del(transferId);
                    }
                    return false;
                } finally { gift.inFlight = null; }
            })();
        }
        const sent = await gift.inFlight;
        if (sent && this.identity(player)) player.send([Types.Messages.CHAT_MESSAGE, {...gift.message, requestId}]);
        else if (!sent) this.fail(player, gift.error, 'direct', target, requestId);
        return sent;
    }

    itemDetails(item) {
        const kind = itemKind(item);
        const label = typeof kind === 'number' ? Collectables.getInventoryDescription(kind) || Types.getKindAsString(kind) : item;
        const image = String(Collectables.getCollectableImageName(kind));
        return {item, name: String(label).replace(/[_-]/g, ' '), image: image.startsWith('item-') ? image : 'item-' + image};
    }

    append(key, message) {
        this.history.set(key, [...(this.history.get(key) || []), message].slice(-MAX_MESSAGES));
    }

    fail(player, code, channel, target, requestId) {
        player.send([Types.Messages.CHAT_ERROR, { code, channel, target, requestId }]);
        return false;
    }

    send(player, channel, target, text, requestId = '') {
        const sender = this.identity(player);
        if (!sender || this.players.get(walletKey(player.walletId)) !== player) return false;
        if (!['world', 'map', 'direct'].includes(channel)) return this.fail(player, 'invalid_channel', channel, target, requestId);
        const messageText = Utils.sanitize(text.slice(0, Types.MAX_CHAT_LENGTH));
        if (!messageText.trim()) return this.fail(player, 'empty_message', channel, target, requestId);

        let recipient;
        let recipientPlayer;
        if (channel === 'direct') {
            recipientPlayer = this.players.get(this.walletsById.get(target));
            recipient = recipientPlayer && this.identity(recipientPlayer);
            if (!recipient || recipient.id === sender.id) {
                return this.fail(player, 'player_offline', channel, target, requestId);
            }
        }
        const message = {
            id: crypto.randomBytes(12).toString('hex'), channel: channel === 'direct' ? 'direct' : 'world', sender,
            recipient, message: messageText, epoch: Date.now(), mapId: sender.mapId
        };
        const deliver = receiver => receiver.send([Types.Messages.CHAT_MESSAGE, {
            ...message, requestId: receiver === player ? requestId : undefined
        }]);
        if (channel === 'direct') {
            this.append('inbox:' + walletKey(player.walletId), message);
            this.append('inbox:' + walletKey(recipientPlayer.walletId), message);
            deliver(player);
            deliver(recipientPlayer);
        } else {
            this.append('world', message);
            for (const receiver of this.players.values()) {
                if (this.identity(receiver)) deliver(receiver);
            }
            publicChat.addMessage(sender.label, messageText, sender);
        }
        return true;
    }
}

module.exports = { SocialChat, identityFromSession, shortWallet };

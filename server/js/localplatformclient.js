const fs = require('fs');
const path = require('path');
const Types = require('../../shared/js/gametypes');

const clone = value => JSON.parse(JSON.stringify(value));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const modifiers = Object.fromEntries(['meleeDamageDealt', 'meleeDamageTaken', 'moveSpeed', 'rangedDamageDealt',
    'hpRegen', 'maxHp', 'hate', 'attackRate', 'stealth', 'xp', 'fishing'].map(key => [key, 1]));
const failure = code => Object.assign(new Error(code), {code});
const put = (table, key, value) => Object.defineProperty(table, key, {value, writable: true, enumerable: true, configurable: true});

// An offline platform for map playtests. Its state is separate from platform data.
class LocalPlatformClient {
    constructor(options = {}) {
        this.localPlaytest = true;
        this.platformDefined = false;
        this.file = path.join(options.dataDir || process.env.LOOPERLANDS_LOCAL_DATA_DIR || path.join(process.cwd(), 'data/local-playtest'), 'state.json');
        this.state = {version: 1, assets: {}, wallets: {}, farms: {}, receipts: {}, activities: {}, partnerTasks: {}};
        if (fs.existsSync(this.file)) {
            const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
            if (saved.version !== 1 || ['assets', 'wallets', 'farms', 'receipts', 'activities', 'partnerTasks'].some(key =>
                !saved[key] || typeof saved[key] !== 'object' || Array.isArray(saved[key]))) {
                throw new Error('Invalid local playtest data; preserve state.json before repairing it');
            }
            this.state = saved;
        }
    }

    change(update) {
        const next = clone(this.state);
        const result = update(next);
        fs.mkdirSync(path.dirname(this.file), {recursive: true});
        const temporary = this.file + '.tmp';
        const handle = fs.openSync(temporary, 'w', 0o600);
        try {fs.writeFileSync(handle, JSON.stringify(next)); fs.fsyncSync(handle);}
        finally {fs.closeSync(handle);}
        fs.renameSync(temporary, this.file);
        this.state = next;
        return result === undefined ? undefined : clone(result);
    }

    asset(state, nftId) {
        if (typeof nftId !== 'string' || !nftId) throw failure('invalid_asset');
        if (!own(state.assets, nftId)) put(state.assets, nftId, {xp: 0, trait: null, weapon: 'sword1',
            kills: {}, items: {}, quests: [], choices: [], facts: [], pvp: {kills: 0, deaths: 0}});
        return state.assets[nftId];
    }

    wallet(state, wallet) {
        const key = wallet.toLowerCase();
        if (!own(state.wallets, key)) put(state.wallets, key, {title: null, prompted: false});
        return state.wallets[key];
    }

    readAsset(nftId) {
        if (!own(this.state.assets, nftId)) this.change(state => {this.asset(state, nftId);});
        return clone(this.state.assets[nftId]);
    }

    prepareSession(body) {
        return this.change(state => {
            const asset = this.asset(state, body.nftId);
            asset.wallet = body.walletId.toLowerCase();
            if (body.xp !== undefined) {
                if (!Number.isSafeInteger(body.xp) || body.xp < 0) throw failure('invalid_experience');
                asset.xp = body.xp;
            }
            if (body.mapId !== undefined) asset.map = body.mapId;
            if (body.checkpointId !== undefined) asset.checkpoint = body.checkpointId;
            if (body.trait !== undefined) asset.trait = body.trait;
            if (body.weapon !== undefined) asset.weapon = body.weapon;
        });
    }

    async createOrUpdateGameServer() {}
    async takeGameServerOffline() {}
    async checkOwnership() {return true;}
    async checkOwnershipOfCollection() {return true;}

    async getNFT(nftId) {
        const name = nftId.replace(/^0x/, 'NFT_');
        const kind = Types.getKindFromString(name);
        if (kind === undefined) throw failure('local_asset_sprite_unavailable');
        const type = Types.getTypeFromString(name);
        const asset = this.readAsset(nftId);
        return {name: 'Local ' + name, assetType: type === 'armor' ? 'looper' : type === 'bot' ? 'companion' : type,
            xp: asset.xp, trait: asset.trait, class: type === 'ranged_weapon' ? 'bow' : null,
            token: {tokenHash: nftId, tokenId: nftId}, options: clone(Types.getKindOptions(kind))};
    }
    async getNFTDataForGame(nftId) {
        const nft = await this.getNFT(nftId);
        return {tokenHash: nft.token.tokenHash, assetType: nft.assetType, nftId, options: nft.options};
    }
    async getAssetInfo(nftId) {return this.getNFT(nftId);}
    async increaseExperience(nftId, xp) {
        if (!Number.isSafeInteger(xp) || xp < 0) throw failure('invalid_experience');
        return this.change(state => {
            const asset = this.asset(state, nftId);
            if (!Number.isSafeInteger(asset.xp + xp)) throw failure('invalid_experience');
            asset.xp += xp;
            return {xp: asset.xp};
        });
    }
    async equip(wallet, nftId, equipped) {
        return this.change(state => {
            this.asset(state, nftId).weapon = equipped;
            if (equipped.startsWith('0x')) this.asset(state, equipped).wallet = wallet.toLowerCase();
            return {success: true};
        });
    }
    async getEquipped(nftId) {return {weapon: this.readAsset(nftId).weapon};}
    async increasePvPStats(nftId, kills, deaths) {
        return this.change(state => {
            const stats = this.asset(state, nftId).pvp;
            stats.kills += kills; stats.deaths += deaths;
            return stats;
        });
    }
    async rollTrait(nftId) {
        return this.change(state => {this.asset(state, nftId).trait = 'speed'; return {trait: 'speed'};});
    }
    async updateAssetPosition(nftId, map, checkpoint) {
        return this.change(state => {
            const asset = this.asset(state, nftId);
            asset.map = map; asset.checkpoint = parseInt(checkpoint ?? 1);
            return {map: asset.map, checkpoint: asset.checkpoint};
        });
    }

    applyItems(asset, items) {
        for (const {item, amount} of items) {
            if (!/^\d+$/.test(String(item)) || !Number.isSafeInteger(amount)) throw failure('invalid_inventory_transaction');
            const quantity = (asset.items[item] || 0) + amount;
            if (!Number.isSafeInteger(quantity) || quantity < 0) throw failure('insufficient_items');
            asset.items[item] = quantity;
        }
    }
    async storeInventoryTransaction(transactions) {
        return this.change(state => {
            for (const row of transactions) this.applyItems(this.asset(state, row.nftId), [row]);
            return {success: true};
        });
    }
    async getInventoryItem(nftId, itemId) {return {amount: this.readAsset(nftId).items[itemId] || 0};}
    async getGameData(nftId) {
        const asset = this.readAsset(nftId);
        return {kills: asset.kills, items: Object.entries(asset.items).map(([item, quantity]) => ({item, quantity})),
            quests: asset.quests, choices: asset.choices};
    }
    async getInventory(wallet) {
        const inventory = {weapons: [], tools: [], companions: []};
        for (const [nftId, asset] of Object.entries(this.state.assets)) {
            if (asset.wallet !== wallet.toLowerCase() || !nftId.startsWith('0x')) continue;
            const kind = Types.getKindFromString(nftId.replace(/^0x/, 'NFT_'));
            if (kind === undefined) continue;
            const row = {nftId, xp: asset.xp};
            if (Types.isWeapon(kind)) inventory.weapons.push(row);
            else if (Types.isSpecialItem(kind)) inventory.tools.push(row);
            // Local companions need a running companion client, not just ownership.
        }
        return inventory;
    }
    async setQuestsStatus(nftId, questKey, status) {
        return this.change(state => {
            const asset = this.asset(state, nftId);
            asset.quests = asset.quests.filter(quest => quest.questKey !== questKey);
            asset.quests.push({questKey, status});
            return {success: true};
        });
    }
    async registerChoice(nftId, choice) {
        return this.change(state => {
            const asset = this.asset(state, nftId);
            if (!asset.choices.includes(choice)) asset.choices.push(choice);
            return {success: true};
        });
    }
    async storeKills(kills) {
        return this.change(state => {
            for (const row of kills) {
                const counts = this.asset(state, row.nftId).kills;
                put(counts, row.mob, (own(counts, row.mob) ? counts[row.mob] : 0) + row.amount);
            }
            return {success: true};
        });
    }
    async getFieldGuide(nftId) {return this.readAsset(nftId).facts;}
    async recordFieldGuide(nftId, facts) {
        return this.change(state => {
            const asset = this.asset(state, nftId);
            asset.facts = [...new Set([...asset.facts, ...facts])];
            return {accepted: facts};
        });
    }
    async storeActivity(activities) {
        return this.change(state => {
            for (const row of activities) put(state.activities, row.id, row);
            return {accepted: activities.map(row => row.id)};
        });
    }
    async setPlayerTitle(wallet, title) {
        return this.change(state => {this.wallet(state, wallet).title = title; return {title, displayName: title};});
    }
    async claimPlayerTitlePrompt(wallet) {
        return this.change(state => {
            const data = this.wallet(state, wallet);
            const showPrompt = !data.prompted && !data.title;
            data.prompted = true;
            return {showPrompt};
        });
    }
    async getAllLooperClasses() {
        return Object.fromEntries(['fighter', 'ranger', 'tank', 'rogue'].map(key => [key, {description: 'Local ' + key, ...modifiers}]));
    }
    async getLooperModifierData() {return {...modifiers};}
    async setLooperClass(nftId, playerClass) {
        return this.change(state => {this.asset(state, nftId).trait = playerClass; return {success: true};});
    }

    async transferInventory(transfer) {
        if (!transfer.requestId || !Number.isSafeInteger(transfer.quantity) || transfer.quantity <= 0 || transfer.fromNftId === transfer.toNftId) {
            throw failure('invalid_transfer');
        }
        return this.change(state => {
            const key = 'gift:' + transfer.requestId;
            const signature = JSON.stringify(transfer);
            if (own(state.receipts, key)) {
                if (state.receipts[key].signature !== signature) throw failure('transfer_conflict');
                return state.receipts[key].receipt;
            }
            const from = this.asset(state, transfer.fromNftId), to = this.asset(state, transfer.toNftId);
            this.applyItems(from, [{item: transfer.item, amount: -transfer.quantity}]);
            this.applyItems(to, [{item: transfer.item, amount: transfer.quantity}]);
            const receipt = {transferId: transfer.requestId, item: transfer.item, quantity: transfer.quantity,
                fromQuantity: from.items[transfer.item], toQuantity: to.items[transfer.item]};
            put(state.receipts, key, {signature, receipt});
            return receipt;
        });
    }
    farmKey(mapId, x, y) {return JSON.stringify([mapId, x, y]);}
    async getFarmState(mapId, x, y) {return clone(this.state.farms[this.farmKey(mapId, x, y)] || {revision: 0, plot: null});}
    async commitFarmTransaction(transaction) {
        return this.change(state => {
            const receiptKey = 'farm:' + transaction.requestId;
            const signature = JSON.stringify(transaction);
            if (!transaction.requestId) throw failure('invalid_farm_transaction');
            if (own(state.receipts, receiptKey)) {
                if (state.receipts[receiptKey].signature !== signature) throw failure('farm_transaction_conflict');
                return state.receipts[receiptKey].receipt;
            }
            const key = this.farmKey(transaction.mapId, transaction.x, transaction.y);
            const current = state.farms[key] || {revision: 0, plot: null};
            if (transaction.expectedRevision !== current.revision) throw failure('plot_changed');
            if (!Number.isSafeInteger(transaction.xp) || transaction.xp < 0 || !Array.isArray(transaction.items) ||
                !own(transaction, 'plot') || (transaction.action === 'harvest') !== (transaction.plot === null)) throw failure('invalid_farm_transaction');
            if (transaction.plot && (transaction.plot.mapId !== transaction.mapId || transaction.plot.x !== transaction.x || transaction.plot.y !== transaction.y)) {
                throw failure('invalid_farm_transaction');
            }
            const asset = this.asset(state, transaction.nftId);
            for (const row of transaction.requiredItems || []) {
                if ((asset.items[row.item] || 0) < row.quantity) throw failure('insufficient_items');
            }
            this.applyItems(asset, transaction.items);
            asset.xp += transaction.xp;
            if (!Number.isSafeInteger(asset.xp)) throw failure('invalid_experience');
            const revision = current.revision + 1;
            const plot = transaction.plot ? {...transaction.plot, revision} : null;
            state.farms[key] = {revision, plot};
            const receipt = {requestId: transaction.requestId, revision, plot, xp: asset.xp,
                quantities: Object.fromEntries(transaction.items.map(row => [row.item, asset.items[row.item]]))};
            put(state.receipts, receiptKey, {signature, receipt});
            return receipt;
        });
    }
    async getFarmPlots(mapId) {return clone(Object.values(this.state.farms).map(row => row.plot).filter(plot => plot?.mapId === mapId));}
    async getFarmPlot(mapId, x, y) {return (await this.getFarmState(mapId, x, y)).plot;}
    async saveFarmPlot(plot) {
        return this.change(state => {
            const key = this.farmKey(plot.mapId, plot.x, plot.y);
            const revision = (state.farms[key]?.revision || 0) + 1;
            state.farms[key] = {revision, plot: {...plot, revision}};
            return state.farms[key].plot;
        });
    }
    async deleteFarmPlot(mapId, x, y) {
        return this.change(state => {
            const key = this.farmKey(mapId, x, y);
            state.farms[key] = {revision: (state.farms[key]?.revision || 0) + 1, plot: null};
            return {success: true};
        });
    }
    async getEventBoard() {return {events: []};}
    async getEventEquipment() {return {grants: []};}
    async registerEvent() {throw failure('local_events_unavailable');}
    async getFreeRental() {return {success: false, error: 'local_rentals_unavailable'};}
    async getShopInventory() {return [];}
    async getCompanions() {return [];}
    async loadMapFlow() {return [];}
    async loadMusic() {return [];}
    async getSpinIndex() {
        const {spinSet} = require('../apps/luckyfunkz/data/spinSet');
        return Math.floor(Math.random() * spinSet.length);
    }
    async getPartnerTask(wallet, task) {return {taskStatus: this.state.partnerTasks[JSON.stringify([wallet, task])] ? 'true' : 'false'};}
    async completePartnerTask(wallet, task) {
        return this.change(state => {state.partnerTasks[JSON.stringify([wallet, task])] = true; return {success: true};});
    }
    handleError(error) {throw error;}
}

let instance;
function getLocalPlatformClient() {
    if (!instance) instance = new LocalPlatformClient();
    return instance;
}

module.exports = {LocalPlatformClient, getLocalPlatformClient};

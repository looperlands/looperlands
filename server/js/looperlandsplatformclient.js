const axios = require('axios');
class LooperLandsPlatformClient {
    constructor(apiKey, baseUrl) {
        this.platformDefined = apiKey && baseUrl;
        if (!this.platformDefined) {
            console.warn("Platform API KEY and baseUrl not defined");
            return;
        }
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey
            }
        });

        let self = this;
        const takeOffLine = async (code) => {
            await self.takeGameServerOffline();
            process.exit(0);
        }
        process.on('exit', takeOffLine);
        process.on('SIGTERM', takeOffLine);
        process.on('SIGINT', takeOffLine);

        this.nftDataCache = {};
    }

    async createOrUpdateGameServer(hostname, port, name) {
        if (!this.platformDefined || process.env.NODE_ENV !== "production") {
            console.log("Not registering this gameserver");
            return;
        }

        try {
            const url = `/api/gameserver/${encodeURIComponent(hostname)}`;
            const gameServerData = { name, port };
            const response = await this.client.put(url, gameServerData);
            this.hostname = hostname;
            console.log("Registered gameserver hostname with platform:", hostname);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async takeGameServerOffline() {
        if (!this.platformDefined || process.env.NODE_ENV !== "production") return;

        try {
            const url = `/api/gameserver/${encodeURIComponent(this.hostname)}/offline`;
            const response = await this.client.post(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getSpinIndex() {
        try {
            const url = "/api/maps/cornsino/spin";
            const response = await this.client.get(url);
            return response.data.spin;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getNFT(nftId) {
        try {
            const url = `/api/asset/nft/${nftId}`
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getNFTDataForGame(nftId) {
        try {
            const cached = this.nftDataCache[nftId];
            if (cached !== undefined) {
                return cached;
            }
            const nftData = await this.getNFT(nftId);
            const extractedData = {
                tokenHash: nftData.token.tokenHash,
                assetType: nftData.assetType,
                nftId: nftId
            };
            this.nftDataCache[nftId] = extractedData;
            return extractedData;
        } catch (error) {
            this.handleError(error);
        }
    }

    async checkOwnership(nft, wallet) {
        try {
            const url = `/api/asset/nft/${nft}/owns?wallet=${wallet}`;
            const response = await this.client.get(url);

            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async checkOwnershipOfCollection(collection, wallet) {
        try {
            const url = `/api/collection/${collection}/owns?wallet=${wallet}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async increaseExperience(nftId, xp) {
        try {
            const url = `/api/game/asset/xp`;
            const data = { nftId, xp };
            const response = await this.client.post(url, data);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async equip(wallet, nftId, equipped) {
        try {
            const url = `/api/game/asset/equip`;
            const data = { wallet, nftId, equipped };
            const response = await this.client.post(url, data);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    handleError(error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            throw new Error(`HTTP error! status: ${error.response.status}`);
        } else if (error.request) {
            // The request was made but no response was received
            throw new Error('No response received');
        } else {
            // Something happened in setting up the request that triggered an Error
            throw error;
        }
    }
}

exports.LooperLandsPlatformClient = LooperLandsPlatformClient;

/*
    loadWeapon,                     // Done -> GET game/asset/equipped/[nft-id]
    loadExperience,                 // Done -> GET game/asset/xp/[nft-id]
    loadMapFlow,                        // Skipped, can be done later
    walletHasNFT,                   // Done -> GET asset/nft/[nft-id]/owns?wallet=[wallet-address]
    updatePVPStats,                 // Done -> POST game/asset/pvp
    saveNFTWeaponTrait,             // Done -> POST game/asset/rollTrait
    saveNFTSpecialItemTrait,        // Done -> POST game/asset/rollTrait
    saveNFTWeaponExperience,        // Done -> POST game/asset/xp
    saveNFTSpecialItemExperience,   // Done -> POST game/asset/xp
    loadNFTWeapon,                  // Done -> GET game/asset/info/[nft-id]
    getSpecialItems,                // Done -> GET game/asset/info/[nft-id]  (won't return all special items anymore)
    saveAvatarMapAndCheckpoint,     // Done -> POST game/asset/position
    saveLootEvent,                  // Done -> POST game/inventory/transactions (batched)
    getItemCount,                   // Done -> GET game/asset/inventory/[nft-id]/[item-id]
    avatarHasItem,                  // Moved -> Uses getItemCount()
    saveMobKillEvent,               // Done -> POST game/asset/kill (batched)
    loadAvatarGameData,             // Done -> GET game/asset/data/[nft-id]
    setQuestStatus,                 // Done -> POST game/asset/quest
    saveConsumable,                 // Moved -> Use saveLootEvent
    getBots,                        // Done -> GET game/wallet/[wallet-address]/companions
    newBot,                            // No need for change
    getShopInventory,                  // Skipped, can be done later
    getResourceBalance,             // Moved -> Uses getItemCount
    updateResourceBalance,          // Moved -> Uses saveLootEvent
    transferResourceFromTo,         // no need to change
    completePartnerTask,               // Skipped, can be done later
    getPartnerTask,                    // Skipped, can be done later
    getInventory                    // Done -> GET game/wallet/inventory/[wallet-address]]/[nft-id]
*/
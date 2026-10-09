const axios = require('axios');

class LooperLandsPlatformClient {
    static playerClasses;
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
        this.nftDataRequests = new Map();
    }

    async createOrUpdateGameServer(hostname, port, name) {
        if (!this.platformDefined || process.env.NODE_ENV !== "production") {
            console.log("Not registering this gameserver");
            return;
        }

        try {
            const url = `/api/gameserver/${encodeURIComponent(hostname)}`;
            const gameServerData = {name, port};
            const response = await this.client.put(url, gameServerData);
            this.hostname = hostname;
            console.log("Registered gameserver hostname with platform:", hostname);
            return response.data;
        } catch (error) {
            console.log(error);
            this.createOrUpdateGameServer(hostname, port, name);
            //this.handleError(error);
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
            if (!this.nftDataRequests.has(nftId)) {
                const request = Promise.resolve().then(() => this.getNFT(nftId)).then((nftData) => {
                    const extractedData = {
                        tokenHash: nftData.token.tokenHash,
                        assetType: nftData.assetType,
                        nftId: nftId,
                        options: nftData.options,
                    };
                    this.nftDataCache[nftId] = extractedData;
                    return extractedData;
                }).finally(() => {
                    this.nftDataRequests.delete(nftId);
                });
                this.nftDataRequests.set(nftId, request);
            }
            return await this.nftDataRequests.get(nftId);
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
            const data = {nftId, xp};
            const response = await this.client.post(url, data);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async equip(wallet, nftId, equipped) {
        try {
            if (!equipped.startsWith("0x")) {
                return;
            }
            const url = `/api/game/asset/equip`;
            const data = {wallet, nftId, equipped};
            const response = await this.client.post(url, data);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getEquipped(nftId) {
        try {
            const url = `/api/game/asset/equipped/${nftId}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async increasePvPStats(nftId, kills, deaths) {
        try {
            const url = `/api/game/asset/pvp`;
            const data = {nftId, kills, deaths};
            const response = await this.client.post(url, data);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async rollTrait(nftId) {
        try {
            const url = `/api/game/asset/trait`;
            const data = {nftId};
            const response = await this.client.post(url, data);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getAssetInfo(nftId) {
        try {
            const url = `/api/game/asset/info/${nftId}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async updateAssetPosition(nftId, map, checkpoint) {
        try {
            const url = `/api/game/asset/position`;
            const data = {nftId, map, checkpoint: parseInt(checkpoint ?? 1)};
            const response = await this.client.post(url, data);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async storeInventoryTransaction(transactions) {
        try {
            const url = `/api/game/inventory/transactions`;
            const response = await this.client.post(url, transactions);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getEventBoard(wallet, nft, map = null) {
        const params = {nft};
        if (map !== null) params.map = map;
        const response = await this.client.get('/api/game/events/board/' + encodeURIComponent(wallet), {params, timeout: 10000});
        return response.data;
    }

    async registerEvent(wallet, eventId, runId, action) {
        const response = await this.client.post('/api/game/events/board/' + encodeURIComponent(wallet) + '/' + eventId + '/' + runId + '/' + action, {}, {timeout: 10000});
        return response.data;
    }

    async getEventEquipment(wallet) {
        const response = await this.client.get('/api/game/events/equipment/' + encodeURIComponent(wallet), {timeout: 5000});
        return response.data;
    }

    async getInventoryItem(nftId, itemId) {
        try {
            const url = `/api/game/asset/inventory/${nftId}/${itemId}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async transferInventory(transfer) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const response = await this.client.post('/api/game/inventory/transfer', transfer, {timeout: 15000});
                if (response.data?.transferId !== transfer.requestId || response.data?.quantity !== transfer.quantity || response.data?.item !== transfer.item) {
                    throw new Error('Invalid transfer receipt');
                }
                return response.data;
            } catch (error) {
                const status = error.response?.status;
                const uncertain = !status || status >= 500;
                if (uncertain && attempt === 0) continue;
                const failure = new Error(uncertain ? 'gift_pending' : error.response?.data?.code || 'gift_unavailable');
                failure.code = failure.message;
                failure.transferUncertain = uncertain;
                throw failure;
            }
        }
    }

    async getFarmState(mapId, x, y) {
        const response = await this.client.get('/api/game/farming/state/' + encodeURIComponent(mapId) + '/' + x + '/' + y, {timeout: 15000});
        const state = response.data;
        if (!Number.isSafeInteger(state?.revision) || state.revision < 0 || !Object.prototype.hasOwnProperty.call(state, 'plot')) {
            throw new Error('Invalid farm state response');
        }
        return state;
    }

    async commitFarmTransaction(transaction) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const response = await this.client.post('/api/game/farming/transaction', transaction, {timeout: 15000});
                const receipt = response.data;
                if (receipt?.requestId !== transaction.requestId || receipt.revision !== transaction.expectedRevision + 1 ||
                    !Number.isSafeInteger(receipt.xp) || receipt.xp < 0 || !receipt.quantities ||
                    !Object.prototype.hasOwnProperty.call(receipt, 'plot') ||
                    (receipt.plot !== null && (receipt.plot.mapId !== transaction.mapId || receipt.plot.x !== transaction.x || receipt.plot.y !== transaction.y))) {
                    throw new Error('Invalid farm transaction receipt');
                }
                if (Array.isArray(transaction.items) && transaction.items.some(({item}) => !Object.prototype.hasOwnProperty.call(receipt.quantities, item))) {
                    throw new Error('Incomplete farm inventory receipt');
                }
                if (transaction.action && ((transaction.action === 'harvest') !== (receipt.plot === null))) {
                    throw new Error('Invalid farm plot transition receipt');
                }
                if (Object.entries(receipt.quantities).some(([item, quantity]) => !/^\d+$/.test(item) || !Number.isSafeInteger(quantity) || quantity < 0)) {
                    throw new Error('Invalid farm inventory receipt');
                }
                return receipt;
            } catch (cause) {
                const status = cause.response?.status;
                if (status >= 400 && status < 500) {
                    const error = new Error(cause.response?.data?.code || 'farm_transaction_rejected');
                    error.code = error.message;
                    throw error;
                }
                if (attempt === 1) {
                    const error = new Error('farm_transaction_pending');
                    error.code = error.message;
                    error.cause = cause;
                    throw error;
                }
            }
        }
    }

    async getFarmPlots(mapId) {
        try {
            const url = `/api/game/farming/plots?map=${encodeURIComponent(mapId)}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getFarmPlot(mapId, x, y) {
        try {
            const url = `/api/game/farming/plot/${encodeURIComponent(mapId)}/${x}/${y}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async saveFarmPlot(plot) {
        try {
            const url = `/api/game/farming/plot`;
            const response = await this.client.put(url, plot);
            console.info("[tileStage.platform] saveFarmPlot response", JSON.stringify({
                status: response.status,
                mapId: plot?.mapId,
                x: plot?.x,
                y: plot?.y,
                dataType: Array.isArray(response.data) ? "array" : typeof response.data,
                dataKeys: response.data && typeof response.data === "object" ? Object.keys(response.data) : undefined,
            }));
            return response.data;
        } catch (error) {
            console.error("[tileStage.platform] saveFarmPlot error", JSON.stringify({
                mapId: plot?.mapId,
                x: plot?.x,
                y: plot?.y,
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            }));
            this.handleError(error);
        }
    }

    async deleteFarmPlot(mapId, x, y) {
        try {
            const url = `/api/game/farming/plot/${encodeURIComponent(mapId)}/${x}/${y}`;
            const response = await this.client.delete(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async storeActivity(activities) {
        const response = await this.client.post('/api/game/activity', activities, {timeout: 15000});
        return response.data;
    }

    async storeKills(kills) {
        try {
            const url = `/api/game/asset/kill`;
            const response = await this.client.post(url, kills);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getGameData(nftId) {
        try {
            const url = `/api/game/asset/data/${nftId}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getInventory(walletAddress, nftId) {
        try {
            const url = `/api/game/wallet/inventory/${walletAddress}/${nftId}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async setQuestsStatus(nftId, questKey, status) {
        try {
            const url = `/api/game/asset/quest`;
            const data = {nftId, questKey, status};
            const response = await this.client.post(url, data);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async registerChoice(nftId, choice) {
        try {
            //console.log('registering choice', nftId, choice);
            const url = `/api/game/asset/choice`;
            const data = {nftId, choice};
            const response = await this.client.post(url, data);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getCompanions(wallet) {
        try {
            const url = `/api/game/wallet/${wallet}/companions`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getAllLooperClasses() {
        try {
            if (LooperLandsPlatformClient.playerClasses === undefined) {
                const url = `/api/game/modifiers/traits`;
                const response = await this.client.get(url);
                const playerClassModifiersData = {};
                Object.keys(response.data).forEach(key => {
                  const { description, modifiers } = response.data[key];
                  playerClassModifiersData[key] = { description, ...modifiers };
                });
                LooperLandsPlatformClient.playerClasses = playerClassModifiersData;
            }
            return LooperLandsPlatformClient.playerClasses;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getLooperModifierData(nftId) {
        try {
            let server = process.env.GAMESERVER_NAME;
            const url = `/api/game/asset/modifiers/${server}/${nftId}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async setLooperClass(nftId, playerClass) {
        try {
            const url = `/api/game/asset/trait`;
            const postData = {
                "nftId" : nftId,
                "trait" : playerClass
            }
            const response = await this.client.post(url, postData);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getFreeRental(nftId, walletAddress) {
        try {
            const url = `/api/game/rental/free/${nftId}/${walletAddress}`
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getShopInventory(shopName) {
        try {
            const url = `/api/game/shop/inventory/${shopName}`;
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async loadMapFlow(mapId) {
        try {
            const url = `/api/maps/${mapId}/flow`;
            const response = await this.client.get(url);

            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    async loadMusic(mapId) {
        try {
            const url = `/api/maps/${mapId}/music`;
            const response = await this.client.get(url);

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
            console.error(error);
            throw new Error('No response received');
        } else {
            // Something happened in setting up the request that triggered an Error
            throw error;
        }
    }
}

exports.LooperLandsPlatformClient = LooperLandsPlatformClient;

const axios = require('axios');
const { LooperLandsPlatformClient } = require('./looperlandsplatformclient.js');
jest.mock('axios');


// Mock process events to avoid actual exit
jest.spyOn(process, 'on').mockImplementation(() => { });

describe('LooperLandsPlatformClient', () => {
  let client;
  const apiKey = 'fake-api-key';
  const baseUrl = 'http://fake-url.com';

  beforeEach(() => {
    axios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} }), // Mock implementation if needed
      put: jest.fn().mockResolvedValue({ data: {} }), // Ensure `put` is mocked
      post: jest.fn().mockResolvedValue({ data: {} }), // Ensure `post` is mocked
    });

    client = new LooperLandsPlatformClient(apiKey, baseUrl);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize axios client with headers', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });
    });

    it('platform not defined', () => {
      client = new LooperLandsPlatformClient(undefined, undefined);
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });
    });
  });



  describe('createOrUpdateGameServer', () => {
    it('should send a PUT request to update game server details', async () => {
      const hostname = 'localhost';
      const port = 8080;
      const name = 'Test Server';

      process.env.NODE_ENV = 'production';
      await client.createOrUpdateGameServer(hostname, port, name);

      expect(client.client.put).toHaveBeenCalled();
    });

    it('should not attempt to register in non-production environments', async () => {
      process.env.NODE_ENV = 'development';
      const response = await client.createOrUpdateGameServer('localhost', 8080, 'Test Server');

      expect(response).toBeUndefined();
    });
  });

  describe('takeGameServerOffline', () => {
    it('should send a POST request to take the server offline', async () => {
      const mockedData = { success: true };
      axios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({ data: mockedData })
      });
      process.env.NODE_ENV = 'production';

      await client.takeGameServerOffline();

      expect(client.client.post).toHaveBeenCalled();
    });
  });

  describe('getSpinIndex', () => {
    it('should fetch spin index from the API', async () => {
      const spin = 7;

      jest.spyOn(client.client, 'get').mockResolvedValue({ data: { spin } });

      const result = await client.getSpinIndex();

      expect(result).toBe(spin);
    });
  });

  describe('getNFTDataForGame', () => {
    it('should return cached data if available', async () => {
      const nftId = 'nft123';
      const cachedData = { tokenHash: 'abc123', assetType: 'Art', nftId };
      client.nftDataCache[nftId] = cachedData;

      const result = await client.getNFTDataForGame(nftId);

      expect(result).toEqual(cachedData);
    });

    it('should fetch and cache NFT data if not in cache', async () => {
      const nftId = 'nft456';
      const nftData = {
        tokenHash: 'def456',
        assetType: 'armor',
        nftId: nftId
      };
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: nftData })
      });

      jest.spyOn(client, 'getNFT').mockImplementation(() => ({
        token: {
          tokenHash: nftData.tokenHash
        },
        assetType: nftData.assetType
      }));

      const result = await client.getNFTDataForGame(nftId);

      expect(client.nftDataCache[nftId]).toEqual({
        tokenHash: 'def456',
        assetType: 'armor',
        nftId: nftId
      });
      expect(result).toEqual({
        tokenHash: 'def456',
        assetType: 'armor',
        nftId: nftId
      });
    });

    it('should handle an exception', async () => {
      const nft = 'nft123';
      process.env.NODE_ENV = 'production';
      axios.create.mockReturnValue({
        get: jest.fn().mockImplementation(() => {
          throw new Error("error");
        })
      });
      client = new LooperLandsPlatformClient(apiKey, baseUrl);
      await expect(client.getNFTDataForGame(nft)).rejects.toThrow("error");
    });        
  });

  describe('handleError', () => {
    it('should throw an error with a custom message', () => {
      const error = { response: { status: 404 } };

      expect(() => client.handleError(error)).toThrow('HTTP error! status: 404');
    });
  });

  describe('checkOwnership', () => {
    it('should fetch ownership', async () => {
      const nft = 'nft123';
      const wallet = 'walletABC';

      process.env.NODE_ENV = 'production';
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: true })
      });
      client = new LooperLandsPlatformClient(apiKey, baseUrl);
      const result = await client.checkOwnership(nft, wallet);

      expect(client.client.get).toHaveBeenCalledWith(`/api/asset/nft/${nft}/owns?wallet=${wallet}`);
      expect(result).toEqual(true);
    });

    it('should handle an exception', async () => {
      const nft = 'nft123';
      const wallet = 'walletABC';
      process.env.NODE_ENV = 'production';
      axios.create.mockReturnValue({
        get: jest.fn().mockImplementation(() => {
          throw new Error("error");
        })
      });
      client = new LooperLandsPlatformClient(apiKey, baseUrl);
      await expect(client.checkOwnership(nft, wallet)).rejects.toThrow("error");
    });    
  });

  describe('checkCollectionOwnership', () => {
    it('should check for ownership', async () => {
      const collection = 'a collection';
      const wallet = 'walletABC';

      process.env.NODE_ENV = 'production';
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: true })
      });
      client = new LooperLandsPlatformClient(apiKey, baseUrl);
      const result = await client.checkOwnershipOfCollection(collection, wallet);

      expect(client.client.get).toHaveBeenCalledWith(`/api/collection/${collection}/owns?wallet=${wallet}`);
      expect(result).toEqual(true);
    });


    it('should handle an exception', async () => {
      const collection = 'a collection';
      const wallet = 'walletABC';
      process.env.NODE_ENV = 'production';
      axios.create.mockReturnValue({
        get: jest.fn().mockImplementation(() => {
          throw new Error("error");
        })
      });
      client = new LooperLandsPlatformClient(apiKey, baseUrl);
      await expect(client.checkOwnershipOfCollection(collection, wallet)).rejects.toThrow("error");
    });
  });
  describe('increaseExperience', () => {
    it('should send a POST request to increase experience and return response data', async () => {
      const nftId = 'nft123';
      const xp = 100;
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.increaseExperience(nftId, xp);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/xp', { nftId, xp });
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const nftId = 'nft123';
      const xp = 100;
      const error = new Error('Network Error');

      client.client.post.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.increaseExperience(nftId, xp);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/xp', { nftId, xp });
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('equip', () => {
    it('should send a POST request to equip the item and return response data', async () => {
      const wallet = 'walletABC';
      const nftId = 'nft123';
      const equipped = '0x123';
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.equip(wallet, nftId, equipped);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/equip', { wallet, nftId, equipped });
      expect(result).toEqual(responseData);
    });

    it('should return undefined if equipped string does not start with "0x"', async () => {
      const wallet = 'walletABC';
      const nftId = 'nft123';
      const equipped = '123';

      const result = await client.equip(wallet, nftId, equipped);

      expect(result).toBeUndefined();
      expect(client.client.post).not.toHaveBeenCalled();
    });

    it('should handle an error thrown by the POST request', async () => {
      const wallet = 'walletABC';
      const nftId = 'nft123';
      const equipped = '0x123';
      const error = new Error('Network Error');

      client.client.post.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.equip(wallet, nftId, equipped);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/equip', { wallet, nftId, equipped });
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });
  describe('getEquipped', () => {
    it('should send a GET request to retrieve equipped items and return response data', async () => {
      const nftId = 'nft123';
      const responseData = { equipped: '0x123' };

      client.client.get.mockResolvedValue({ data: responseData });

      const result = await client.getEquipped(nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/equipped/${nftId}`);
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the GET request', async () => {
      const nftId = 'nft123';
      const error = new Error('Network Error');

      client.client.get.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.getEquipped(nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/equipped/${nftId}`);
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });
  describe('increasePvPStats', () => {
    it('should send a POST request to increase PvP stats and return response data', async () => {
      const nftId = 'nft123';
      const kills = 10;
      const deaths = 5;
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.increasePvPStats(nftId, kills, deaths);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/pvp', { nftId, kills, deaths });
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const nftId = 'nft123';
      const kills = 10;
      const deaths = 5;
      const error = new Error('Network Error');

      client.client.post.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.increasePvPStats(nftId, kills, deaths);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/pvp', { nftId, kills, deaths });
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });
  describe('rollTrait', () => {
    it('should send a POST request to roll a trait and return response data', async () => {
      const nftId = 'nft123';
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.rollTrait(nftId);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/trait', { nftId });
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const nftId = 'nft123';
      const error = new Error('Network Error');

      client.client.post.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.rollTrait(nftId);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/trait', { nftId });
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });
  
  describe('getAssetInfo', () => {
    it('should send a GET request to retrieve asset info and return response data', async () => {
      const nftId = 'nft123';
      const responseData = { name: 'Asset Name', description: 'Asset Description' };

      client.client.get.mockResolvedValue({ data: responseData });

      const result = await client.getAssetInfo(nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/info/${nftId}`);
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the GET request', async () => {
      const nftId = 'nft123';
      const error = new Error('Network Error');

      client.client.get.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.getAssetInfo(nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/info/${nftId}`);
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('updateAssetPosition', () => {
    it('should send a POST request to update asset position and return response data', async () => {
      const nftId = 'nft123';
      const map = 'MapName';
      const checkpoint = 5;
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.updateAssetPosition(nftId, map, checkpoint);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/position', { nftId, map, checkpoint: 5 });
      expect(result).toEqual(responseData);
    });

    it('should send a POST request with default checkpoint if not provided', async () => {
      const nftId = 'nft123';
      const map = 'MapName';
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.updateAssetPosition(nftId, map);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/position', { nftId, map, checkpoint: 1 });
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const nftId = 'nft123';
      const map = 'MapName';
      const checkpoint = 5;
      const error = new Error('Network Error');

      client.client.post.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.updateAssetPosition(nftId, map, checkpoint);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/position', { nftId, map, checkpoint: 5 });
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('storeInventoryTransaction', () => {
    it('should send a POST request to store inventory transactions and return response data', async () => {
      const transactions = [{ item: 'sword', quantity: 1 }, { item: 'shield', quantity: 1 }];
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.storeInventoryTransaction(transactions);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/inventory/transactions', transactions);
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const transactions = [{ item: 'sword', quantity: 1 }, { item: 'shield', quantity: 1 }];
      const error = new Error('Network Error');

      client.client.post.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.storeInventoryTransaction(transactions);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/inventory/transactions', transactions);
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('getInventoryItem', () => {
    it('should send a GET request to retrieve an inventory item and return response data', async () => {
      const nftId = 'nft123';
      const itemId = 'item456';
      const responseData = { itemId, name: 'Sword of Truth', quantity: 1 };

      client.client.get.mockResolvedValue({ data: responseData });

      const result = await client.getInventoryItem(nftId, itemId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/inventory/${nftId}/${itemId}`);
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the GET request', async () => {
      const nftId = 'nft123';
      const itemId = 'item456';
      const error = new Error('Network Error');

      client.client.get.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.getInventoryItem(nftId, itemId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/inventory/${nftId}/${itemId}`);
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });
  describe('storeKills', () => {
    it('should send a POST request to store kills and return response data', async () => {
      const kills = [{ nftId: 'nft123', killCount: 10 }, { nftId: 'nft456', killCount: 20 }];
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.storeKills(kills);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/kill', kills);
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const kills = [{ nftId: 'nft123', killCount: 10 }, { nftId: 'nft456', killCount: 20 }];
      const error = new Error('Network Error');

      client.client.post.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.storeKills(kills);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/kill', kills);
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('getGameData', () => {
    it('should send a GET request to retrieve game data and return response data', async () => {
      const nftId = 'nft123';
      const responseData = { gameData: 'some game data' };

      client.client.get.mockResolvedValue({ data: responseData });

      const result = await client.getGameData(nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/data/${nftId}`);
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the GET request', async () => {
      const nftId = 'nft123';
      const error = new Error('Network Error');

      client.client.get.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.getGameData(nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/data/${nftId}`);
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });


  describe('getInventory', () => {
    it('should send a GET request to retrieve inventory and return response data', async () => {
      const walletAddress = 'wallet123';
      const nftId = 'nft456';
      const responseData = { inventory: [{ itemId: 'item789', quantity: 2 }] };

      client.client.get.mockResolvedValue({ data: responseData });

      const result = await client.getInventory(walletAddress, nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/wallet/inventory/${walletAddress}/${nftId}`);
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the GET request', async () => {
      const walletAddress = 'wallet123';
      const nftId = 'nft456';
      const error = new Error('Network Error');

      client.client.get.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.getInventory(walletAddress, nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/wallet/inventory/${walletAddress}/${nftId}`);
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });
  describe('setQuestsStatus', () => {
    it('should send a POST request to set quest status and return response data', async () => {
      const nftId = 'nft123';
      const questKey = 'quest456';
      const status = 'completed';
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.setQuestsStatus(nftId, questKey, status);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/quest', { nftId, questKey, status });
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const nftId = 'nft123';
      const questKey = 'quest456';
      const status = 'completed';
      const error = new Error('Network Error');

      client.client.post.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.setQuestsStatus(nftId, questKey, status);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/quest', { nftId, questKey, status });
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });
  describe('getCompanions', () => {
    it('should send a GET request to retrieve companions and return response data', async () => {
      const wallet = 'wallet123';
      const responseData = { companions: [{ id: 'companion1', name: 'Buddy' }, { id: 'companion2', name: 'Pal' }] };

      client.client.get.mockResolvedValue({ data: responseData });

      const result = await client.getCompanions(wallet);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/wallet/${wallet}/companions`);
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the GET request', async () => {
      const wallet = 'wallet123';
      const error = new Error('Network Error');

      client.client.get.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.getCompanions(wallet);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/wallet/${wallet}/companions`);
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllLooperClasses', () => {
    it('should fetch and cache player classes if not already cached', async () => {
      const playerClassesData = {
        class1: { description: 'Class 1 description', modifiers: {meleeDamageDealt: 1, meleeDamageTaken: 1 }},
        class2: { description: 'Class 2 description', modifiers: {moveSpeed: 1.2, rangedDamageDealt: 1.5 }}
      };

      client.client.get.mockResolvedValue({ data: playerClassesData });

      const result = await client.getAllLooperClasses();

      expect(client.client.get).toHaveBeenCalledWith('/api/game/modifiers/traits');
      expect(result['class1'].description).toEqual(playerClassesData['class1'].description);
      expect(result['class1'].meleeDamageDealt).toEqual(playerClassesData['class1'].modifiers.meleeDamageDealt);
    });

    it('should return cached player classes if already cached', async () => {
      LooperLandsPlatformClient.playerClasses = {
        class1: { description: 'Class 1 description', meleeDamageDealt: 1, meleeDamageTaken: 1 }
      };

      const result = await client.getAllLooperClasses();

      expect(client.client.get).not.toHaveBeenCalled();
      expect(result).toEqual(LooperLandsPlatformClient.playerClasses);
    });
  });

  describe('getLooperModifierData', () => {
    it('should fetch modifier data for an NFT', async () => {
      const nftId = 'nft123';
      const modifierData = { meleeDamageDealt: 2, moveSpeed: 1.2 };

      client.client.get.mockResolvedValue({ data: modifierData });

      const result = await client.getLooperModifierData(nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/modifiers/${nftId}`);
      expect(result).toEqual(modifierData);
    });

    it('should handle an error thrown by the GET request', async () => {
      const nftId = 'nft123';
      const error = new Error('Network Error');

      client.client.get.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.getLooperModifierData(nftId);

      expect(client.client.get).toHaveBeenCalledWith(`/api/game/asset/modifiers/${nftId}`);
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('setLooperClass', () => {
    it('should send a POST request to set the looper class and return response data', async () => {
      const nftId = 'nft123';
      const playerClass = 'warrior';
      const responseData = { success: true };

      client.client.post.mockResolvedValue({ data: responseData });

      const result = await client.setLooperClass(nftId, playerClass);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/trait', { nftId, trait: playerClass });
      expect(result).toEqual(responseData);
    });

    it('should handle an error thrown by the POST request', async () => {
      const nftId = 'nft123';
      const playerClass = 'warrior';
      const error = new Error('Network Error');

      client.client.post.mockRejectedValue(error);

      jest.spyOn(client, 'handleError').mockImplementation(() => {});

      await client.setLooperClass(nftId, playerClass);

      expect(client.client.post).toHaveBeenCalledWith('/api/game/asset/trait', { nftId, trait: playerClass });
      expect(client.handleError).toHaveBeenCalledWith(error);
    });
  });  

  
});
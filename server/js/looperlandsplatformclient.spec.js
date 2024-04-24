const axios = require('axios');
const { LooperLandsPlatformClient } = require('./looperlandsplatformclient.js');
jest.mock('axios');


// Mock process events to avoid actual exit
jest.spyOn(process, 'on').mockImplementation(() => {});

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
        token : {
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
  });

  describe('handleError', () => {
    it('should throw an error with a custom message', () => {
      const error = { response: { status: 404 } };

      expect(() => client.handleError(error)).toThrow('HTTP error! status: 404');
    });
  });
});

const { DynamicNFTController } = require('./dynamicnftcontroller.js');

// Mocks for dependencies
const mockCache = {
  get: jest.fn()
};
const mockPlatformClient = {
  getNFTDataForGame: jest.fn()
};
const mockTypes = {
  addDynamicNFT: jest.fn(),
  getKindAsString: jest.fn()
};

// Mocks for request and response
const mockReq = (sessionId, nftId, entityId) => ({
  params: { sessionId, nftId, entityId }
});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('DynamicNFTController', () => {
  describe('getNFTData', () => {
    it('should return 404 if session not found', async () => {
      const controller = new DynamicNFTController(mockCache, mockPlatformClient, mockTypes);
      const req = mockReq('invalidSessionId', 'nft123');
      const res = mockRes();

      mockCache.get.mockReturnValueOnce(undefined);

      await controller.getNFTData(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        error: "No session with id invalidSessionId found",
        user: null
      });
    });

    it('should return 200 and NFT data if session and NFT data found', async () => {
      const controller = new DynamicNFTController(mockCache, mockPlatformClient, mockTypes);
      const req = mockReq('validSessionId', 'nft123');
      const res = mockRes();
      const nftData = { id: 'nft123', data: 'Some data' };

      mockCache.get.mockReturnValueOnce({ sessionId: 'validSessionId', otherData: 'data' });
      mockPlatformClient.getNFTDataForGame.mockResolvedValueOnce(nftData);

      await controller.getNFTData(req, res);

      expect(mockTypes.addDynamicNFT).toHaveBeenCalledWith(nftData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(nftData);
    });
  });

  describe('getNFTDataByEntity', () => {
    it('should return 404 if session not found', async () => {
      const controller = new DynamicNFTController(mockCache, mockPlatformClient, mockTypes);
      const req = mockReq('invalidSessionId', null, 'entity456');
      const res = mockRes();

      mockCache.get.mockReturnValueOnce(undefined);

      await controller.getNFTDataByEntity(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        error: "No session with id invalidSessionId found",
        user: null
      });
    });

    it('should return 200 and NFT data if session and entity kind found', async () => {
      const controller = new DynamicNFTController(mockCache, mockPlatformClient, mockTypes);
      const req = mockReq('validSessionId', null, 'entity456');
      const res = mockRes();
      const nftData = { id: '0x123', data: 'NFT data' };

      mockCache.get.mockReturnValueOnce({ sessionId: 'validSessionId' });
      mockTypes.getKindAsString.mockReturnValueOnce('NFT_123');
      mockPlatformClient.getNFTDataForGame.mockResolvedValueOnce(nftData);

      await controller.getNFTDataByEntity(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(nftData);
    });
  });
});

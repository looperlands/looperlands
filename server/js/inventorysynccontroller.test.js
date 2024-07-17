const { InventorySyncController } = require('./inventorysynccontroller');

describe('InventorySyncController', () => {
    let dao, cache, controller;

    beforeEach(() => {
        dao = {
            processLootEventQueue: jest.fn().mockResolvedValue(),
            loadAvatarGameData: jest.fn().mockResolvedValue({ game: 'data' })
        };

        cache = {
            keys: jest.fn().mockReturnValue(['sessionId1']),
            get: jest.fn().mockReturnValue({ nftId: '123', gameData: null }),
            set: jest.fn()
        };

        controller = new InventorySyncController(dao, cache);
    });

    it('should return 401 if the API key is invalid', async () => {
        const req = {
            body: { nftId: '123' },
            headers: { 'x-api-key': 'invalid-api-key' }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await controller.syncPlayer(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            status: false,
            error: 'invalid api key',
            user: null
        });
    });

    it('should return 404 if the player is not found in the cache', async () => {
        cache.get = jest.fn().mockReturnValueOnce(null);

        const req = {
            body: { nftId: 'not-existing-nft' },
            headers: { 'x-api-key': process.env.LOOPWORMS_API_KEY }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await controller.syncPlayer(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            msg: `player with not-existing-nft not found`
        });
    });

    it('should process loot event queue and update cache if player is found', async () => {
        const req = {
            body: { nftId: '123' },
            headers: { 'x-api-key': process.env.LOOPWORMS_API_KEY }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await controller.syncPlayer(req, res);

        expect(dao.processLootEventQueue).toHaveBeenCalled();
        expect(dao.loadAvatarGameData).toHaveBeenCalledWith('123');
        expect(cache.set).toHaveBeenCalledWith('sessionId1', { nftId: '123', gameData: { game: 'data' } });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
    });
});

const PlayerClassController = require('./playerclasscontroller.js').PlayerClassController

describe('PlayerClassController', () => {
    let platformClientMock, cacheMock, worldsMapMock, reqMock, resMock;
    let controller;

    beforeEach(() => {
        platformClientMock = {
            getAllLooperClasses: jest.fn(),
            setLooperClass: jest.fn()
        };
        cacheMock = {
            get: jest.fn(),
            set: jest.fn()
        };
        worldsMapMock = {};
        reqMock = {
            params: {},
            body: {}
        };
        resMock = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        controller = new PlayerClassController(platformClientMock, cacheMock, worldsMapMock);
    });

    describe('getPlayerClasses', () => {
        it('should return all looper classes', async () => {
            const classes = ['class1', 'class2'];
            platformClientMock.getAllLooperClasses.mockResolvedValue(classes);

            await controller.getPlayerClasses(reqMock, resMock);

            expect(platformClientMock.getAllLooperClasses).toHaveBeenCalled();
            expect(resMock.json).toHaveBeenCalledWith(classes);
        });
    });

    describe('getPlayerModifiers', () => {
        it('should return 404 if session not found', async () => {
            reqMock.params.sessionId = 'invalidSessionId';
            cacheMock.get.mockReturnValue(undefined);

            await controller.getPlayerModifiers(reqMock, resMock);

            expect(cacheMock.get).toHaveBeenCalledWith('invalidSessionId');
            expect(resMock.status).toHaveBeenCalledWith(404);
            expect(resMock.json).toHaveBeenCalledWith({
                status: false,
                error: 'session not found',
                user: null
            });
        });

        it('should return 404 if player not found', async () => {
            reqMock.params.sessionId = 'validSessionId';
            const sessionData = { mapId: 'map1', entityId: 'player1' };
            cacheMock.get.mockReturnValue(sessionData);
            worldsMapMock['map1'] = {
                getPlayerById: jest.fn().mockReturnValue(null)
            };

            await controller.getPlayerModifiers(reqMock, resMock);

            expect(cacheMock.get).toHaveBeenCalledWith('validSessionId');
            expect(resMock.status).toHaveBeenCalledWith(404);
            expect(resMock.json).toHaveBeenCalledWith({
                status: false,
                error: 'player not found',
                user: null
            });
        });

        it('should return player modifiers if player found', async () => {
            reqMock.params.sessionId = 'validSessionId';
            const sessionData = { mapId: 'map1', entityId: 'player1' };
            const playerModifiers = ['modifier1', 'modifier2'];
            cacheMock.get.mockReturnValue(sessionData);
            const playerMock = {
                playerClassModifiers: {
                    getAllModifiers: jest.fn().mockResolvedValue(playerModifiers)
                }
            };
            worldsMapMock['map1'] = {
                getPlayerById: jest.fn().mockReturnValue(playerMock)
            };

            await controller.getPlayerModifiers(reqMock, resMock);

            expect(cacheMock.get).toHaveBeenCalledWith('validSessionId');
            expect(worldsMapMock['map1'].getPlayerById).toHaveBeenCalledWith('player1');
            expect(playerMock.playerClassModifiers.getAllModifiers).toHaveBeenCalled();
            expect(resMock.json).toHaveBeenCalledWith(playerModifiers);
        });
    });

    describe('setLooperClass', () => {
        it('should return 404 if session not found', async () => {
            reqMock.params.sessionId = 'invalidSessionId';
            cacheMock.get.mockReturnValue(undefined);

            await controller.setLooperClass(reqMock, resMock);

            expect(cacheMock.get).toHaveBeenCalledWith('invalidSessionId');
            expect(resMock.status).toHaveBeenCalledWith(404);
            expect(resMock.json).toHaveBeenCalledWith({
                status: false,
                error: 'session not found',
                user: null
            });
        });

        it('should set looper class and return success if player found', async () => {
            reqMock.params.sessionId = 'validSessionId';
            reqMock.body.playerClass = 'newClass';
            const sessionData = { mapId: 'map1', entityId: 'player1', nftId: 'nft1' };
            cacheMock.get.mockReturnValue(sessionData);
            const playerMock = {
                playerClassModifiers: {
                    playerClass: 'oldClass'
                }
            };
            worldsMapMock['map1'] = {
                getPlayerById: jest.fn().mockReturnValue(playerMock)
            };
            platformClientMock.setLooperClass.mockResolvedValue();

            await controller.setLooperClass(reqMock, resMock);

            expect(cacheMock.get).toHaveBeenCalledWith('validSessionId');
            expect(platformClientMock.setLooperClass).toHaveBeenCalledWith('nft1', 'newClass');
            expect(worldsMapMock['map1'].getPlayerById).toHaveBeenCalledWith('player1');
            expect(playerMock.playerClassModifiers.playerClass).toBe('newClass');
            expect(resMock.status).toHaveBeenCalledWith(200);
            expect(resMock.json).toHaveBeenCalledWith({
                success: true
            });
        });
    });
});
